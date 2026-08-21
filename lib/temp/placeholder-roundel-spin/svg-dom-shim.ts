type AttrMap = Map<string, string>

class ShimSvgNode {
  readonly tagName: string
  readonly attributes: AttrMap = new Map()
  readonly childNodes: ShimSvgNode[] = []
  style: { backgroundColor?: string } = {}

  constructor(tagName: string) {
    this.tagName = tagName
  }

  setAttribute(name: string, value: string | number) {
    this.attributes.set(name, String(value))
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  appendChild(child: ShimSvgNode) {
    this.childNodes.push(child)
    return child
  }

  removeChild(child: ShimSvgNode) {
    const index = this.childNodes.indexOf(child)
    if (index >= 0) this.childNodes.splice(index, 1)
    return child
  }

  get outerHTML(): string {
    const attrs = [...this.attributes.entries()]
      .map(([name, value]) => `${name}="${value.replaceAll('"', "&quot;")}"`)
      .join(" ")
    const background = this.style.backgroundColor
    const style = background ? ` style="background-color: ${background}"` : ""
    const inner = this.childNodes.map((child) => child.outerHTML).join("")
    return `<${this.tagName}${attrs ? ` ${attrs}` : ""}${style}>${inner}</${this.tagName}>`
  }
}

export const installSvgDomShim = () => {
  const documentShim = {
    createElementNS: (_ns: string, tagName: string) => new ShimSvgNode(tagName),
  }
  const global = globalThis as typeof globalThis & {
    document?: typeof documentShim
  }
  if (!global.document) {
    global.document = documentShim
  }
}
