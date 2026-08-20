import fs from "node:fs";

const parseHex = (hex) => {
  const h = hex.replace("#", "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
};

const css = fs.readFileSync("app/temp/landing-hero/landing-artwork.css", "utf8");
const tsx = fs.readFileSync("app/temp/landing-hero/landing-artwork.tsx", "utf8");

const srgbChannelToLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const toOklab = (hex) => {
  const { r, g, b } = parseHex(hex);
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.hypot(a, bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, a, b: bb, C, H };
};

const dist = (a, b) =>
  Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b) * 100;

const classFill = new Map();
const classOpacity = new Map();
for (const block of css.split(/\}/)) {
  const names = [...block.matchAll(/\.landing-cls-(\d+)/g)].map((m) => m[1]);
  const fill = block.match(/fill:\s*(#[0-9a-fA-F]+|none)/);
  const opacity = block.match(/opacity:\s*([\d.]+)/);
  if (!names.length) continue;
  for (const n of names) {
    if (fill) classFill.set(n, fill[1].toLowerCase());
    if (opacity) classOpacity.set(n, opacity[1]);
  }
}

const usage = new Map();
for (const m of tsx.matchAll(
  /id="([^"]+)"[\s\S]{0,200}?className="landing-cls-(\d+)"/g,
)) {
  const list = usage.get(m[2]) ?? [];
  list.push(m[1]);
  usage.set(m[2], list);
}

const groupHits = new Map();
const groupOrder = [
  ["l3-bg", /id="landing-l3"[\s\S]*?id="fireplace"/],
  ["fireplace", /id="fireplace"[\s\S]*?id="landing-picture-frame-1"/],
  ["frames", /id="landing-picture-frame-1"[\s\S]*?id="landing-l2"/],
  ["carpet", /id="wall-and-carpet"[\s\S]*?id="_4-table/],
  ["mirror-frame", /id="landing-mirror-frame"[\s\S]{0,400}/],
  ["ipad", /id="landing-ipad"[\s\S]*?id="Plant"/],
  ["plant", /id="Plant"[\s\S]*?id="Table"/],
  ["table", /id="Table"[\s\S]*?id="hanging-light"/],
  ["lamp", /id="hanging-light"[\s\S]*?id="landing-l1"/],
  ["l1-wall", /id="landing-l1"[\s\S]*?id="landing-l0"/],
  ["sofa", /id="landing-l0"[\s\S]*?<\/svg>/],
];
for (const [name, re] of groupOrder) {
  const chunk = tsx.match(re)?.[0] ?? "";
  const counts = new Map();
  for (const m of chunk.matchAll(/landing-cls-(\d+)/g)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  groupHits.set(name, counts);
}

const uniqueHex = [...new Set([...classFill.values()].filter((v) => v !== "none"))];
const items = uniqueHex.map((hex) => ({
  hex,
  oklab: toOklab(hex),
  classes: [...classFill.entries()].filter(([, h]) => h === hex).map(([n]) => n),
}));

const THRESHOLD = 4.5;
const clusters = [];
for (const item of items.sort((a, b) => a.oklab.L - b.oklab.L)) {
  let best = null;
  let bestD = Infinity;
  for (const c of clusters) {
    const d = dist(item.oklab, c.centroid);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (best && bestD <= THRESHOLD) {
    best.members.push(item);
    const n = best.members.length;
    best.centroid = {
      L: best.members.reduce((s, m) => s + m.oklab.L, 0) / n,
      a: best.members.reduce((s, m) => s + m.oklab.a, 0) / n,
      b: best.members.reduce((s, m) => s + m.oklab.b, 0) / n,
    };
  } else {
    clusters.push({
      centroid: { ...item.oklab },
      members: [item],
    });
  }
}

const fmtOklch = (o) =>
  `oklch(${(o.L * 100).toFixed(1)}% ${o.C.toFixed(3)} ${o.H.toFixed(1)})`;

const groupsForClass = (cls) =>
  [...groupHits.entries()]
    .filter(([, counts]) => counts.has(cls))
    .map(([g, counts]) => `${g}×${counts.get(cls)}`)
    .join(", ");

console.log(`unique hex: ${uniqueHex.length}  classes: ${classFill.size}  clusters@${THRESHOLD}: ${clusters.length}\n`);
for (const [i, c] of clusters.entries()) {
  const L = c.members.reduce((s, m) => s + m.oklab.L, 0) / c.members.length;
  const C = c.members.reduce((s, m) => s + m.oklab.C, 0) / c.members.length;
  const H = c.members[0].oklab.H;
  console.log(`--- cluster ${i + 1}  n=${c.members.length}  L=${(L * 100).toFixed(1)} C=${C.toFixed(3)} ---`);
  for (const m of c.members) {
    const o = m.oklab;
    const cls = m.classes.join(",");
    const op = m.classes.map((n) => classOpacity.get(n)).filter(Boolean)[0];
    console.log(
      `  ${m.hex}  ${fmtOklch(o)}  cls-${cls}${op ? ` opacity ${op}` : ""}  ${groupsForClass(m.classes[0])}`,
    );
  }
  console.log("");
}
