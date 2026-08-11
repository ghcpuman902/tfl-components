import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import {
  INSTALL_COUNT_EXCLUDE,
  STATS_INSTALLS_KEY,
} from "@/lib/site-stats";

type RouteContext = {
  params: Promise<{ name: string }>;
};

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

const incrementInstalls = async () => {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.incr(STATS_INSTALLS_KEY);
  } catch (err) {
    console.error("[registry] install incr failed", err);
  }
};

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params;
  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "r", `${name}.json`);
  let body: string;
  try {
    body = await readFile(filePath, "utf8");
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!INSTALL_COUNT_EXCLUDE.has(name)) {
    void incrementInstalls();
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
