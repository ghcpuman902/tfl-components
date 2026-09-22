import { existsSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"
import { defaultExclusionReason } from "./exclusions"
import { layoutComponentGraph } from "./layout"
import type {
  ComponentGraphEdge,
  ComponentGraphOverride,
  ComponentGraphSkeleton,
  ComponentGraphSkeletonCandidate,
  ComponentGraphSnapshot,
  ComponentState,
} from "./types"

const ROOTS = ["registry/tfl", "components/tfl"] as const

const STATEFUL_HOOKS = new Set([
  "useState",
  "useReducer",
  "useEffect",
  "useLayoutEffect",
  "useSyncExternalStore",
  "createContext",
])

const PASCAL = /^[A-Z][A-Za-z0-9]*$/

export type AnalyseOptions = {
  rootDir: string
  overrides?: Record<string, ComponentGraphOverride>
}

type FileAnalysis = {
  id: string
  exports: string[]
  evidence: string[]
  inferredState: ComponentState
  inferredTflData: boolean
  valueImports: string[]
}

const walkTsx = (dir: string, rootDir: string, out: string[]) => {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    const stat = statSync(abs)
    if (stat.isDirectory()) {
      walkTsx(abs, rootDir, out)
      continue
    }
    if (!entry.endsWith(".tsx")) continue
    out.push(relative(rootDir, abs).replace(/\\/g, "/"))
  }
}

export const discoverCandidateModuleIds = (rootDir: string): string[] => {
  const ids: string[] = []
  for (const root of ROOTS) {
    walkTsx(join(rootDir, root), rootDir, ids)
  }
  return [...new Set(ids)].sort()
}

const createProgram = (rootDir: string, moduleIds: readonly string[]) => {
  const configPath = ts.findConfigFile(
    rootDir,
    ts.sys.fileExists,
    "tsconfig.json"
  )
  if (!configPath) {
    throw new Error("tsconfig.json not found")
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    rootDir
  )
  const fileNames = [...new Set([...parsed.fileNames, ...moduleIds.map((id) => join(rootDir, id))])]
  return ts.createProgram(fileNames, parsed.options)
}

const isCandidateModule = (moduleId: string, candidateSet: Set<string>) =>
  candidateSet.has(moduleId)

const resolveModuleId = (
  program: ts.Program,
  fromFile: ts.SourceFile,
  moduleSpecifier: string,
  rootDir: string,
  candidateSet: Set<string>
): string | undefined => {
  const resolved = ts.resolveModuleName(
    moduleSpecifier,
    fromFile.fileName,
    program.getCompilerOptions(),
    ts.sys
  )
  if (!resolved.resolvedModule?.resolvedFileName) return undefined
  const id = relative(rootDir, resolved.resolvedModule.resolvedFileName).replace(
    /\\/g,
    "/"
  )
  if (!id.endsWith(".tsx")) return undefined
  if (!isCandidateModule(id, candidateSet)) return undefined
  return id
}

const typeReferencesTflTs = (
  typeNode: ts.TypeNode | undefined,
  checker: ts.TypeChecker,
  localTflTypes: Set<string>,
  depth = 0,
  seen = new Set<string>()
): boolean => {
  if (!typeNode || depth > 10) return false

  const text = typeNode.getText()
  if (/tfl-ts|TflClient|RealtimePrediction|StatusLine|CycleHireDock|PredictionWithSharedTrackIdentity/.test(text)) {
    return true
  }

  const type = checker.getTypeAtLocation(typeNode)
  const symbols = [
    type.getSymbol(),
    type.aliasSymbol,
    ...type.getProperties().slice(0, 40).map((property) => property),
  ].filter(Boolean) as ts.Symbol[]

  for (const symbol of symbols) {
    const key = `${symbol.getName()}@${symbol.flags}`
    if (seen.has(key)) continue
    seen.add(key)

    if (localTflTypes.has(symbol.getName())) return true

    for (const decl of symbol.getDeclarations() ?? []) {
      const source = decl.getSourceFile().fileName.replace(/\\/g, "/")
      if (source.includes("/node_modules/tfl-ts/") || source.includes("/node_modules/tfl-ts@")) {
        return true
      }
      if (ts.isTypeAliasDeclaration(decl) && decl.type) {
        if (typeReferencesTflTs(decl.type, checker, localTflTypes, depth + 1, seen)) {
          return true
        }
      }
      if (ts.isInterfaceDeclaration(decl) || ts.isTypeLiteralNode(decl)) {
        const members = ts.isInterfaceDeclaration(decl)
          ? decl.members
          : decl.members
        for (const member of members) {
          if (!ts.isPropertySignature(member) || !member.type) continue
          if (
            typeReferencesTflTs(
              member.type,
              checker,
              localTflTypes,
              depth + 1,
              seen
            )
          ) {
            return true
          }
        }
      }
      if (ts.isImportSpecifier(decl) || ts.isImportClause(decl)) {
        const importDecl = ts.isImportSpecifier(decl)
          ? decl.parent.parent.parent
          : decl.parent
        if (
          importDecl &&
          ts.isImportDeclaration(importDecl) &&
          ts.isStringLiteral(importDecl.moduleSpecifier)
        ) {
          if (importDecl.moduleSpecifier.text === "tfl-ts") return true
        }
        const aliased = checker.getAliasedSymbol(symbol)
        if (aliased && aliased !== symbol) {
          for (const aliasDecl of aliased.getDeclarations() ?? []) {
            const source = aliasDecl
              .getSourceFile()
              .fileName.replace(/\\/g, "/")
            if (source.includes("/node_modules/tfl-ts")) return true
            if (ts.isTypeAliasDeclaration(aliasDecl) && aliasDecl.type) {
              if (
                typeReferencesTflTs(
                  aliasDecl.type,
                  checker,
                  localTflTypes,
                  depth + 1,
                  seen
                )
              ) {
                return true
              }
            }
            if (ts.isInterfaceDeclaration(aliasDecl)) {
              for (const member of aliasDecl.members) {
                if (!ts.isPropertySignature(member) || !member.type) continue
                if (
                  typeReferencesTflTs(
                    member.type,
                    checker,
                    localTflTypes,
                    depth + 1,
                    seen
                  )
                ) {
                  return true
                }
              }
            }
          }
        }
      }
    }
  }

  const visit = (node: ts.Node): boolean => {
    if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText()
      if (localTflTypes.has(name)) return true
      if (
        /RealtimePrediction|StatusLine|CycleHireDock|TflClient|PredictionWithSharedTrackIdentity/.test(
          name
        )
      ) {
        return true
      }
      const symbol = checker.getSymbolAtLocation(node.typeName)
      if (symbol) {
        const resolved =
          symbol.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(symbol)
            : symbol
        for (const decl of resolved.getDeclarations() ?? []) {
          const source = decl.getSourceFile().fileName.replace(/\\/g, "/")
          if (source.includes("/node_modules/tfl-ts")) return true
          if (ts.isTypeAliasDeclaration(decl) && decl.type) {
            if (
              typeReferencesTflTs(
                decl.type,
                checker,
                localTflTypes,
                depth + 1,
                seen
              )
            ) {
              return true
            }
          }
          if (ts.isInterfaceDeclaration(decl)) {
            for (const member of decl.members) {
              if (!ts.isPropertySignature(member) || !member.type) continue
              if (
                typeReferencesTflTs(
                  member.type,
                  checker,
                  localTflTypes,
                  depth + 1,
                  seen
                )
              ) {
                return true
              }
            }
          }
        }
      }
    }
    return ts.forEachChild(node, visit) ?? false
  }

  return visit(typeNode)
}

const collectLocalTflTypes = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): Set<string> => {
  const names = new Set<string>()
  for (const stmt of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(stmt) && !ts.isInterfaceDeclaration(stmt)) {
      continue
    }
    const name = stmt.name.text
    if (ts.isTypeAliasDeclaration(stmt)) {
      if (typeReferencesTflTs(stmt.type, checker, names, 0)) {
        names.add(name)
      }
    } else if (ts.isInterfaceDeclaration(stmt)) {
      const hasTfl = stmt.members.some((member) => {
        if (!ts.isPropertySignature(member) || !member.type) return false
        return typeReferencesTflTs(member.type, checker, names, 0)
      })
      if (hasTfl) names.add(name)
    }
  }
  return names
}

const isPascalExportName = (name: string) => PASCAL.test(name)

const getExportNames = (sourceFile: ts.SourceFile): string[] => {
  const names = new Set<string>()
  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (isPascalExportName(stmt.name.text)) names.add(stmt.name.text)
    }
    if (ts.isVariableStatement(stmt) && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && isPascalExportName(decl.name.text)) {
          names.add(decl.name.text)
        }
      }
    }
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      names.add("default")
    }
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const element of stmt.exportClause.elements) {
        const exported = (element.name ?? element.propertyName)?.text
        if (exported && isPascalExportName(exported)) names.add(exported)
      }
    }
  }
  return [...names].sort()
}

const fileUsesStatefulHooks = (sourceFile: ts.SourceFile): boolean => {
  let found = false
  const visit = (node: ts.Node) => {
    if (found) return
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (STATEFUL_HOOKS.has(node.expression.text)) {
        found = true
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

const exportedPropsUseTflData = (
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  exportNames: readonly string[]
): { tflData: boolean; evidence: string[] } => {
  const evidence: string[] = []
  const localTflTypes = collectLocalTflTypes(sourceFile, checker)
  const propsTypeNames = new Set<string>()
  for (const name of exportNames) {
    if (name === "default") continue
    propsTypeNames.add(`${name}Props`)
  }

  let tflData = false

  for (const stmt of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(stmt) && !ts.isInterfaceDeclaration(stmt)) {
      continue
    }
    const name = stmt.name.text
    const isExportProps =
      name === "RootProps" ||
      propsTypeNames.has(name) ||
      (name.endsWith("Props") &&
        exportNames.some((exportName) => name.startsWith(exportName)))
    if (!isExportProps) continue

    if (ts.isTypeAliasDeclaration(stmt)) {
      if (typeReferencesTflTs(stmt.type, checker, localTflTypes)) {
        tflData = true
        evidence.push(`Exported props type ${name} references tfl-ts data.`)
      }
    } else {
      for (const member of stmt.members) {
        if (!ts.isPropertySignature(member) || !member.type) continue
        if (typeReferencesTflTs(member.type, checker, localTflTypes)) {
          tflData = true
          evidence.push(`Exported props type ${name} references tfl-ts data.`)
          break
        }
      }
    }
  }

  for (const stmt of sourceFile.statements) {
    if (!ts.isFunctionDeclaration(stmt) || !stmt.name) continue
    if (!exportNames.includes(stmt.name.text)) continue
    const props = stmt.parameters[0]
    if (props?.type && typeReferencesTflTs(props.type, checker, localTflTypes)) {
      tflData = true
      evidence.push(`${stmt.name.text} props parameter references tfl-ts data.`)
    }
  }

  // Arrow / const component exports: `export const Foo = (props: FooProps) => …`
  // and compound roots: `export const Foo = FooRoot as FooComponent`.
  for (const stmt of sourceFile.statements) {
    if (
      !ts.isVariableStatement(stmt) ||
      !stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      continue
    }
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !exportNames.includes(decl.name.text)) {
        continue
      }
      if (!decl.initializer) continue
      const inits: ts.Expression[] = [decl.initializer]
      if (ts.isAsExpression(decl.initializer) || ts.isSatisfiesExpression(decl.initializer)) {
        inits.push(decl.initializer.expression)
      }

      for (const init of inits) {
        if (
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          init.parameters[0]?.type &&
          typeReferencesTflTs(init.parameters[0].type, checker, localTflTypes)
        ) {
          tflData = true
          evidence.push(
            `${decl.name.text} props parameter references tfl-ts data.`
          )
        }
        if (ts.isIdentifier(init)) {
          const symbol = checker.getSymbolAtLocation(init)
          for (const localDecl of symbol?.getDeclarations() ?? []) {
            if (
              ts.isVariableDeclaration(localDecl) &&
              localDecl.initializer &&
              (ts.isArrowFunction(localDecl.initializer) ||
                ts.isFunctionExpression(localDecl.initializer)) &&
              localDecl.initializer.parameters[0]?.type &&
              typeReferencesTflTs(
                localDecl.initializer.parameters[0].type,
                checker,
                localTflTypes
              )
            ) {
              tflData = true
              evidence.push(
                `${decl.name.text} props parameter references tfl-ts data.`
              )
            }
          }
        }
      }
    }
  }

  return { tflData, evidence: [...new Set(evidence)] }
}

const collectValueImports = (
  sourceFile: ts.SourceFile,
  program: ts.Program,
  rootDir: string,
  candidateSet: Set<string>
): string[] => {
  const imports = new Set<string>()

  const handleSpecifier = (
    moduleSpecifier: string,
    isTypeOnly: boolean
  ) => {
    if (isTypeOnly) return
    const resolved = resolveModuleId(
      program,
      sourceFile,
      moduleSpecifier,
      rootDir,
      candidateSet
    )
    if (resolved) imports.add(resolved)
  }

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      if (!clause) return
      if (clause.isTypeOnly) return

      // Value side of a mixed import still counts, even when every named
      // binding is type-only — but a fully type-only named list does not.
      const named = clause.namedBindings
      const hasValueDefault = Boolean(clause.name)
      const hasValueNamespace =
        named !== undefined && ts.isNamespaceImport(named)
      const hasValueNamed =
        named !== undefined &&
        ts.isNamedImports(named) &&
        named.elements.some((element) => !element.isTypeOnly)

      if (hasValueDefault || hasValueNamespace || hasValueNamed) {
        handleSpecifier(node.moduleSpecifier.text, false)
      }
      return
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.isTypeOnly) return
      if (
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.every((element) => element.isTypeOnly)
      ) {
        return
      }
      handleSpecifier(node.moduleSpecifier.text, false)
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0]
      if (arg && ts.isStringLiteral(arg)) {
        handleSpecifier(arg.text, false)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...imports].sort()
}

const analyseFile = (
  program: ts.Program,
  moduleId: string,
  rootDir: string,
  candidateSet: Set<string>
): FileAnalysis | undefined => {
  const sourceFile = program.getSourceFile(join(rootDir, moduleId))
  if (!sourceFile) return undefined
  const checker = program.getTypeChecker()
  const exports = getExportNames(sourceFile)
  const inferredState: ComponentState = fileUsesStatefulHooks(sourceFile)
    ? "stateful"
    : "stateless"
  const { tflData: inferredTflData, evidence: tflEvidence } =
    exportedPropsUseTflData(sourceFile, checker, exports)
  const evidence = [...tflEvidence]
  if (inferredState === "stateful") {
    evidence.push("Uses React state, effect, context, or external-store hooks.")
  } else {
    evidence.push("No owning React state / lifecycle hooks detected.")
  }
  const valueImports = collectValueImports(
    sourceFile,
    program,
    rootDir,
    candidateSet
  )
  return {
    id: moduleId,
    exports,
    evidence,
    inferredState,
    inferredTflData,
    valueImports,
  }
}

const displayNameFromModuleId = (moduleId: string) => {
  const base = moduleId.split("/").pop()?.replace(/\.tsx$/, "") ?? moduleId
  return base
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const shouldInclude = (
  moduleId: string,
  analysis: FileAnalysis | undefined,
  override?: ComponentGraphOverride
): { included: boolean; reason?: string } => {
  if (override?.include === false) {
    return { included: false, reason: override.note ?? "Excluded by override." }
  }
  if (override?.include === true) {
    return { included: true }
  }
  const defaultReason = defaultExclusionReason(moduleId)
  if (defaultReason) return { included: false, reason: defaultReason }
  if (!analysis || analysis.exports.length === 0) {
    return { included: false, reason: "No exported React components detected." }
  }
  return { included: true }
}

export const buildComponentGraph = ({
  rootDir,
  overrides = {},
}: AnalyseOptions): {
  skeleton: ComponentGraphSkeleton
  snapshot: ComponentGraphSnapshot
  staleOverrideKeys: string[]
} => {
  const moduleIds = discoverCandidateModuleIds(rootDir)
  const candidateSet = new Set(moduleIds)
  const program = createProgram(rootDir, moduleIds)

  const analyses = new Map<string, FileAnalysis>()
  for (const moduleId of moduleIds) {
    const analysis = analyseFile(program, moduleId, rootDir, candidateSet)
    if (analysis) analyses.set(moduleId, analysis)
  }

  const included = new Set<string>()
  const inclusionById = new Map<
    string,
    { included: boolean; reason?: string; override?: ComponentGraphOverride }
  >()

  for (const moduleId of moduleIds) {
    const analysis = analyses.get(moduleId)
    const override = overrides[moduleId]
    const inclusion = shouldInclude(moduleId, analysis, override)
    inclusionById.set(moduleId, { ...inclusion, override })
    if (inclusion.included) included.add(moduleId)
  }

  const candidates: ComponentGraphSkeletonCandidate[] = moduleIds.map(
    (moduleId) => {
      const analysis = analyses.get(moduleId)
      const { included: isIncluded, reason, override } =
        inclusionById.get(moduleId)!
      const dependencies =
        analysis?.valueImports.filter((id) => included.has(id)) ?? []
      return {
        id: moduleId,
        displayName: override?.displayName ?? displayNameFromModuleId(moduleId),
        exports: analysis?.exports ?? [],
        included: isIncluded,
        exclusionReason: isIncluded ? undefined : reason,
        inferredState: analysis?.inferredState ?? "stateless",
        inferredTflData: analysis?.inferredTflData ?? false,
        evidence: analysis?.evidence ?? [],
        dependencies,
        dependants: [],
      }
    }
  )

  const edges: ComponentGraphEdge[] = []
  for (const candidate of candidates) {
    if (!candidate.included) continue
    for (const dep of candidate.dependencies) {
      if (!included.has(dep)) continue
      edges.push({ from: candidate.id, to: dep })
    }
  }

  const dependants = new Map<string, Set<string>>()
  for (const edge of edges) {
    const set = dependants.get(edge.to) ?? new Set<string>()
    set.add(edge.from)
    dependants.set(edge.to, set)
  }

  for (const candidate of candidates) {
    if (!candidate.included) continue
    candidate.dependants = [...(dependants.get(candidate.id) ?? [])].sort()
    candidate.dependencies = [...candidate.dependencies].sort()
  }

  const overrideKeys = Object.keys(overrides).sort()
  const knownIds = new Set(moduleIds)
  const staleOverrideKeys = overrideKeys.filter((key) => !knownIds.has(key))

  const nodeMeta = new Map<
    string,
    {
      displayName: string
      exports: string[]
      state: ComponentState
      stateSource: "inferred" | "override"
      tflData: boolean
      tflDataSource: "inferred" | "override"
      evidence: string[]
      overrideNote?: string
    }
  >()

  for (const candidate of candidates) {
    if (!candidate.included) continue
    const override = overrides[candidate.id]
    const state = override?.state ?? candidate.inferredState
    const tflData = override?.tflData ?? candidate.inferredTflData
    nodeMeta.set(candidate.id, {
      displayName: override?.displayName ?? candidate.displayName,
      exports: candidate.exports,
      state,
      stateSource: override?.state ? "override" : "inferred",
      tflData,
      tflDataSource: override?.tflData !== undefined ? "override" : "inferred",
      evidence: candidate.evidence,
      overrideNote: override?.note,
    })
  }

  const nodes = layoutComponentGraph(
    [...included].sort(),
    edges,
    nodeMeta
  )

  const generatedAt = new Date().toISOString()
  const skeleton: ComponentGraphSkeleton = {
    generatedAt,
    candidates,
    edges,
  }
  const snapshot: ComponentGraphSnapshot = {
    manifest: {
      generatedAt,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      orphanCount: nodes.filter((node) => node.orphan).length,
      overrideKeys,
      staleOverrideKeys,
    },
    nodes,
    edges,
  }

  return { skeleton, snapshot, staleOverrideKeys }
}

/** Test helper — analyse fixtures relative to a temp root. */
export const analyseModuleText = (
  moduleId: string,
  source: string,
  rootDir: string
): FileAnalysis | undefined => {
  const candidateSet = new Set([moduleId])
  const fileName = join(rootDir, moduleId)
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const program = ts.createProgram([fileName], {
    target: ts.ScriptTarget.Latest,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    paths: {
      "@/*": ["./*"],
      "@/components/tfl/*": ["./registry/tfl/*", "./components/tfl/*"],
    },
    baseUrl: rootDir,
  })
  const checker = program.getTypeChecker()
  const exports = getExportNames(sourceFile)
  const inferredState: ComponentState = fileUsesStatefulHooks(sourceFile)
    ? "stateful"
    : "stateless"
  const { tflData: inferredTflData, evidence: tflEvidence } =
    exportedPropsUseTflData(sourceFile, checker, exports)
  const evidence = [...tflEvidence]
  if (inferredState === "stateful") {
    evidence.push("Uses React state, effect, context, or external-store hooks.")
  } else {
    evidence.push("No owning React state / lifecycle hooks detected.")
  }
  const valueImports = collectValueImports(
    sourceFile,
    program,
    rootDir,
    candidateSet
  )
  return {
    id: moduleId,
    exports,
    evidence,
    inferredState,
    inferredTflData,
    valueImports,
  }
}
