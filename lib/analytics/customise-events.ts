/**
 * Task-completion events for the Customise variants. Lightweight on purpose:
 * one name and two props. Sent to Vercel Analytics (already installed, used
 * for the hero test) only for visitors a split assigned; param / dev visits
 * and the OFF split stay local (window buffer) so they never skew results.
 */

import type {
  CustomiseSource,
  CustomiseVariant,
} from "@/lib/tfl/board-customise-variant"

export const CUSTOMISE_EVENT_NAMES = [
  "customise_station_changed",
  "customise_solo_used",
  "customise_reorder_saved",
  "customise_done",
] as const
export type CustomiseEventName = (typeof CUSTOMISE_EVENT_NAMES)[number]

export type CustomiseEvent = {
  name: CustomiseEventName
  variant: CustomiseVariant
  source: CustomiseSource
}

export type CustomiseEventSink = (event: CustomiseEvent) => void

export type CustomiseEventLogger = (name: CustomiseEventName) => void

/** Only split-assigned visits are counted; everything goes to `local`. */
export const createCustomiseEventLogger =
  ({
    variant,
    source,
    send,
    local,
  }: {
    variant: CustomiseVariant
    source: CustomiseSource
    send: CustomiseEventSink
    local: CustomiseEventSink
  }): CustomiseEventLogger =>
  (name) => {
    const event = { name, variant, source }
    local(event)
    if (source === "assigned") send(event)
  }
