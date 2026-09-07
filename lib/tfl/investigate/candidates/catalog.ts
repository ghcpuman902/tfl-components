import { catalogAllJunctions } from "../catalog"
import { buildExplorerModel } from "./enumerate"
import { explorerKey } from "./ids"
import type { JunctionExplorerModel } from "./types"

export { FEATURED_EXPLORER_KEYS, explorerKey } from "./ids"

export const catalogExplorerModels = (): JunctionExplorerModel[] => {
  const models: JunctionExplorerModel[] = []
  for (const item of catalogAllJunctions()) {
    const model = buildExplorerModel(item.lineId, item.junction)
    if (model) models.push(model)
  }
  return models
}

export const explorerModelByKey = (
  models: readonly JunctionExplorerModel[]
): Map<string, JunctionExplorerModel> =>
  new Map(models.map((model) => [explorerKey(model.lineId, model.station.id), model]))
