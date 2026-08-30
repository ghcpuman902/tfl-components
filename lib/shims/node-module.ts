/**
 * Browser stub for `node:module`.
 *
 * tfl-ts 2.13 ESM lazy-loads station sequences with `createRequire`. The
 * barrel still statically imports that helper, so Turbopack tries to put
 * `node:module` in a client chunk and panics. Server builds keep the real
 * builtin via the `browser` alias condition in next.config.ts.
 */
export const createRequire = (_url?: string | URL) => {
  const req = (id: string): never => {
    throw new Error(`createRequire(${id}) is not available in the browser`)
  }
  req.resolve = (id: string) => id
  req.cache = Object.create(null)
  req.extensions = Object.create(null)
  req.main = undefined
  return req
}
