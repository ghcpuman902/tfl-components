/**
 * Tiny DOM → Markdown serializer for Copy Page.
 * Covers the tag set rendered by mdx-components.tsx + docs chrome.
 */

const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "PRE",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  "HR",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "DIV",
  "NAV",
]);

const skipNode = (el: Element): boolean => {
  if (el.hasAttribute("data-copy-page-skip")) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "SCRIPT" || tag === "STYLE" || tag === "SVG") {
    return true;
  }
  if (el.hasAttribute("data-copy-page")) return true;
  if (el.hasAttribute("data-code-peek-toggle")) return true;
  return false;
};

const escapeCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();

const inlineText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  if (skipNode(el)) return "";

  const tag = el.tagName;

  if (tag === "BR") return "\n";
  if (tag === "CODE" && el.parentElement?.tagName !== "PRE") {
    return `\`${el.textContent ?? ""}\``;
  }
  if (tag === "STRONG" || tag === "B") {
    return `**${Array.from(el.childNodes).map(inlineText).join("")}**`;
  }
  if (tag === "EM" || tag === "I") {
    return `*${Array.from(el.childNodes).map(inlineText).join("")}*`;
  }
  if (tag === "A") {
    const href = el.getAttribute("href") ?? "";
    const label = Array.from(el.childNodes).map(inlineText).join("").trim();
    if (!label) return "";
    if (!href || href.startsWith("#")) return label;
    return `[${label}](${href})`;
  }

  return Array.from(el.childNodes).map(inlineText).join("");
};

const serializeList = (el: Element, ordered: boolean, depth = 0): string => {
  const items = Array.from(el.children).filter((c) => c.tagName === "LI");
  return items
    .map((li, i) => {
      const prefix = ordered ? `${i + 1}. ` : "- ";
      const indent = "  ".repeat(depth);
      const parts: string[] = [];
      let inline = "";

      for (const child of Array.from(li.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childEl = child as Element;
          if (childEl.tagName === "UL" || childEl.tagName === "OL") {
            if (inline.trim()) {
              parts.push(`${indent}${prefix}${inline.trim()}`);
              inline = "";
            }
            parts.push(
              serializeList(childEl, childEl.tagName === "OL", depth + 1),
            );
            continue;
          }
        }
        inline += inlineText(child);
      }

      if (inline.trim() || parts.length === 0) {
        parts.unshift(`${indent}${prefix}${inline.trim()}`);
      }
      return parts.join("\n");
    })
    .join("\n");
};

const serializeTable = (el: Element): string => {
  const rows = Array.from(el.querySelectorAll("tr"));
  if (rows.length === 0) return "";

  const lines: string[] = [];
  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.querySelectorAll("th, td")).map((cell) =>
      escapeCell(inlineText(cell)),
    );
    lines.push(`| ${cells.join(" | ")} |`);
    if (rowIndex === 0) {
      lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
    }
  });
  return lines.join("\n");
};

const serializeBlock = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").trim();
    return text;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  if (skipNode(el)) return "";

  const tag = el.tagName;

  if (tag === "H1") return `# ${inlineText(el).trim()}`;
  if (tag === "H2") return `## ${inlineText(el).trim()}`;
  if (tag === "H3") return `### ${inlineText(el).trim()}`;
  if (tag === "H4") return `#### ${inlineText(el).trim()}`;
  if (tag === "H5") return `##### ${inlineText(el).trim()}`;
  if (tag === "H6") return `###### ${inlineText(el).trim()}`;
  if (tag === "P") return inlineText(el).trim();
  if (tag === "HR") return "---";
  if (tag === "BLOCKQUOTE") {
    const body = Array.from(el.childNodes)
      .map(serializeBlock)
      .filter(Boolean)
      .join("\n\n");
    return body
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (tag === "PRE") {
    const code = el.querySelector("code");
    const lang =
      code?.getAttribute("class")?.match(/language-([a-zA-Z0-9_+-]+)/)?.[1] ??
      el.getAttribute("data-language") ??
      "";
    const text = (code?.textContent ?? el.textContent ?? "").replace(/\n$/, "");
    return `\`\`\`${lang}\n${text}\n\`\`\``;
  }
  if (tag === "UL") return serializeList(el, false);
  if (tag === "OL") return serializeList(el, true);
  if (tag === "TABLE") return serializeTable(el);
  if (tag === "LI") {
    // Handled by parent list; flatten if orphaned.
    return `- ${inlineText(el).trim()}`;
  }

  // Containers: recurse children as blocks.
  if (
    tag === "DIV" ||
    tag === "SECTION" ||
    tag === "ARTICLE" ||
    tag === "HEADER" ||
    tag === "NAV" ||
    tag === "MAIN" ||
    tag === "ASIDE" ||
    !BLOCK_TAGS.has(tag)
  ) {
    return Array.from(el.childNodes)
      .map(serializeBlock)
      .filter((s) => s.trim().length > 0)
      .join("\n\n");
  }

  return inlineText(el).trim();
};

/** Serialize an article (or any root element) to Markdown for clipboard. */
export const domToMarkdown = (root: Element): string => {
  const parts = Array.from(root.childNodes)
    .map(serializeBlock)
    .filter((s) => s.trim().length > 0);
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
};
