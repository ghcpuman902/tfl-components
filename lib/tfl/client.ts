import TflClient from "tfl-ts"

export const getTflClient = (): TflClient => {
  const appKey = process.env.TFL_APP_KEY
  if (!appKey) {
    return new TflClient()
  }
  return new TflClient({ appKey })
}
