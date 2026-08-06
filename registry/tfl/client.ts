import TflClient from "tfl-ts";

export const getTflClient = (): TflClient => {
  const appId = process.env.TFL_APP_ID;
  const appKey = process.env.TFL_APP_KEY;
  if (appId && appKey) {
    return new TflClient({ appId, appKey });
  }
  return new TflClient();
};
