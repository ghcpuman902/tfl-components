import { createClient, type RedisClientType } from "redis"

let client: RedisClientType | null = null
let connectPromise: Promise<RedisClientType | null> | null = null

/**
 * Shared Redis client for site stats. Returns null when REDIS_URL is unset
 * or the connection fails — callers should treat that as a soft no-op.
 */
export const getRedis = async (): Promise<RedisClientType | null> => {
  const url = process.env.REDIS_URL
  if (!url) return null

  if (client?.isOpen) return client

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const next = createClient({ url })
        next.on("error", (err) => {
          console.error("[redis]", err)
        })
        await next.connect()
        client = next as RedisClientType
        return client
      } catch (err) {
        console.error("[redis] connect failed", err)
        connectPromise = null
        return null
      }
    })()
  }

  return connectPromise
}
