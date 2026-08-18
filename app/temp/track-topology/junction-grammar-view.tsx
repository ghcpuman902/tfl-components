"use client";

/**
 * Reference table for the junction grammar (lib/tfl/geometry/junction-grammar.ts).
 *
 * One row per taxonomy type: name, static topology diagram, permitted
 * movements, the actual data structure, a real London example, and a
 * force-field rendering of the same Junction object. This is deliberately
 * a side-by-side reference, not a finished renderer — see the module doc
 * comment on junction-grammar.ts for why geometry and connectivity stay
 * separate fields.
 */
import { useMemo } from "react";
import {
  JUNCTION_TYPES,
  connectedLegPairs,
  legById,
  type Junction,
} from "@/lib/tfl/geometry/junction-grammar";
import { JUNCTION_EXAMPLES } from "@/lib/tfl/geometry/junction-examples";
import {
  junctionRenderGraph,
  junctionStressGraph,
  type JunctionRenderGraph,
} from "@/lib/tfl/geometry/junction-render";
import { createStressState, settleStressLayout } from "@/lib/tfl/geometry/stress-layout";

const DIAGRAM_SIZE = 200;
const PAD = 34;

type PositionedNode = { id: string; label: string; x: number; y: number; isHub: boolean };

const fitNodes = (
  nodes: readonly { id: string; label: string; x: number; y: number; isHub: boolean }[],
): PositionedNode[] => {
  if (nodes.length === 0) return [];
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = (DIAGRAM_SIZE - PAD * 2) / Math.max(spanX, spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return nodes.map((node) => ({
    ...node,
    x: DIAGRAM_SIZE / 2 + (node.x - cx) * scale,
    y: DIAGRAM_SIZE / 2 + (node.y - cy) * scale,
  }));
};

const MiniDiagram = ({
  nodes,
  edges,
  color,
  caption,
}: {
  nodes: readonly PositionedNode[];
  edges: readonly { from: string; to: string; gradeSeparated?: boolean }[];
  color: string;
  caption: string;
}) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${DIAGRAM_SIZE} ${DIAGRAM_SIZE}`}
        className="h-[11rem] w-full rounded-md border border-border bg-muted/20"
        role="img"
        aria-label={caption}
      >
        {edges.map((edge, index) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={edge.gradeSeparated ? 2 : 2.6}
              strokeDasharray={edge.gradeSeparated ? "5 3" : undefined}
              strokeLinecap="round"
            />
          );
        })}
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <circle
              r={node.isHub ? 5 : 3.4}
              fill={node.isHub ? color : "var(--background)"}
              stroke={node.isHub ? "var(--background)" : "var(--foreground)"}
              strokeWidth={node.isHub ? 1.5 : 1.2}
            />
            {!node.isHub && (
              <text
                x={node.x > DIAGRAM_SIZE / 2 + 4 ? 6 : node.x < DIAGRAM_SIZE / 2 - 4 ? -6 : 0}
                y={node.y > DIAGRAM_SIZE / 2 + 4 ? 12 : -8}
                textAnchor={
                  node.x > DIAGRAM_SIZE / 2 + 4
                    ? "start"
                    : node.x < DIAGRAM_SIZE / 2 - 4
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground text-[8px]"
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="text-[11px] text-muted-foreground">{caption}</figcaption>
    </figure>
  );
};

const permittedMovementsText = (junction: Junction): string => {
  const pairs = connectedLegPairs(junction);
  if (pairs.length === 0) return "none — no shared track";
  return pairs
    .map(([a, b]) => {
      const labelA = legById(junction, a)?.label ?? a;
      const labelB = legById(junction, b)?.label ?? b;
      return `${labelA} ↔ ${labelB}`;
    })
    .join("; ");
};

const dataStructureSnippet = (junction: Junction): string =>
  JSON.stringify(
    {
      type: junction.type,
      legs: junction.legs.map((leg) => ({
        id: leg.id,
        label: leg.label,
        ...(leg.terminal ? { terminal: true } : {}),
      })),
      movements: connectedLegPairs(junction).map(([a, b]) => `${a} ↔ ${b}`),
      ...(junction.rejoinsLegId ? { rejoinsLegId: junction.rejoinsLegId } : {}),
    },
    null,
    2,
  );

const useForceFieldPositions = (junction: Junction): JunctionRenderGraph => {
  return useMemo(() => {
    const render = junctionRenderGraph(junction);
    const state = createStressState(junctionStressGraph(junction));
    settleStressLayout(state, { steps: 120 });
    return {
      ...render,
      nodes: render.nodes.map((node, index) => ({
        ...node,
        x: state.x[index]!,
        y: state.y[index]!,
      })),
    };
  }, [junction]);
};

const JunctionRow = ({ junction, color }: { junction: Junction; color: string }) => {
  const info = JUNCTION_TYPES[junction.type];
  const staticRender = useMemo(() => junctionRenderGraph(junction), [junction]);
  const forceRender = useForceFieldPositions(junction);

  return (
    <tr className="align-top">
      <td className="min-w-[11rem] py-4 pr-4">
        <p className="text-sm font-medium">{info.name}</p>
        <p className="text-xs text-muted-foreground">{info.shape}</p>
        {info.establishedTerm && (
          <p className="mt-1 text-xs text-muted-foreground italic">{info.establishedTerm}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{info.meaning}</p>
      </td>
      <td className="min-w-[13rem] py-4 pr-4">
        <MiniDiagram
          nodes={fitNodes(staticRender.nodes)}
          edges={staticRender.edges}
          color={color}
          caption={`${junction.legs.length} legs — physical topology`}
        />
      </td>
      <td className="min-w-[15rem] py-4 pr-4 text-xs text-muted-foreground">
        {permittedMovementsText(junction)}
      </td>
      <td className="min-w-[16rem] py-4 pr-4">
        <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[10px] leading-tight">
          {dataStructureSnippet(junction)}
        </pre>
      </td>
      <td className="min-w-[12rem] py-4 pr-4 text-xs text-muted-foreground">
        <ul className="list-disc space-y-1 pl-4">
          {(junction.londonExamples ?? []).map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
        {junction.notes && <p className="mt-2 italic">{junction.notes}</p>}
      </td>
      <td className="min-w-[13rem] py-4 pr-4">
        <MiniDiagram
          nodes={fitNodes(forceRender.nodes)}
          edges={forceRender.edges}
          color={color}
          caption="Stress-majorization settle (this junction, isolated)"
        />
      </td>
      <td className="min-w-[12rem] py-4 text-xs text-muted-foreground">
        Not implemented yet — the branched-line/diagram renderer should read
        the same <code>legs</code>/<code>movements</code> once it exists, not
        re-infer connectivity from geometry.
      </td>
    </tr>
  );
};

const COLUMN_HEADERS = [
  "Type",
  "Physical topology",
  "Permitted movements",
  "Data structure",
  "Real London example(s)",
  "Force-field rendering",
  "Branched-line rendering",
];

export const JunctionGrammarView = () => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1400px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase">
            {COLUMN_HEADERS.map((header) => (
              <th key={header} className="py-2 pr-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {JUNCTION_EXAMPLES.map((junction) => (
            <JunctionRow key={junction.id} junction={junction} color="#6950A1" />
          ))}
        </tbody>
      </table>
    </div>
  );
};
