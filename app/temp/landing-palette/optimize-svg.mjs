import fs from "node:fs"
import { optimize } from "svgo"

const SRC = "public/images/landing/landing-reference.svg"
const DEST = "public/images/landing/landing-palette.svg"

const input = fs.readFileSync(SRC, "utf8")

const { data } = optimize(input, {
  path: SRC,
  multipass: true,
  floatPrecision: 3,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          inlineStyles: false,
          minifyStyles: false,
        },
      },
    },
  ],
})

const stripped = data
  .replace(/<\?xml[^>]*>\s*/u, "")
  .replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>\s*/u, "")
  .replace(/<style>[\s\S]*?<\/style>\s*/u, "")
  .trim()

fs.writeFileSync(DEST, `${stripped}\n`)

const before = Buffer.byteLength(input)
const after = Buffer.byteLength(stripped)
console.log(
  `landing-palette.svg  ${(before / 1024).toFixed(1)}kb → ${(after / 1024).toFixed(1)}kb`,
)
