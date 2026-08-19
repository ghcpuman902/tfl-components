import { toObservatoryPageData } from "@/lib/tfl/observatory/page-data"
import { createRedisObservatoryRepository } from "@/lib/tfl/observatory/store"
import type { ObservatoryPageData } from "@/lib/tfl/observatory/types"

export const loadObservatoryPageData =
  async (): Promise<ObservatoryPageData> => {
    const store = await createRedisObservatoryRepository().load()
    return toObservatoryPageData(store)
  }
