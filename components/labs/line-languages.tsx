"use client"

import { useState } from "react"
import { LineStrip } from "@/components/tfl/diagram/line-strip"
import { VICTORIA_STRIP } from "@/lib/tfl/fixtures/victoria-line-strip"
import type { StraightStripStation } from "@/lib/tfl/strip-model"
import { cn } from "@/lib/utils"

type LanguageView = "english" | "japanese" | "compare"

type JapaneseLabel = {
  name: string
  lines: readonly string[]
}

const JAPANESE_LABELS: Record<string, JapaneseLabel> = {
  walthamstow: {
    name: "ウォルサムストウ・セントラル",
    lines: ["ウォルサムストウ", "セントラル"],
  },
  blackhorse: {
    name: "ブラックホース・ロード",
    lines: ["ブラックホース", "ロード"],
  },
  tottenham: {
    name: "トッテナム・ヘイル",
    lines: ["トッテナム", "ヘイル"],
  },
  "seven-sisters": {
    name: "セブン・シスターズ",
    lines: ["セブン", "シスターズ"],
  },
  finsbury: {
    name: "フィンズベリー・パーク",
    lines: ["フィンズベリー", "パーク"],
  },
  highbury: {
    name: "ハイベリー＆イズリントン",
    lines: ["ハイベリー＆", "イズリントン"],
  },
  "kings-cross": {
    name: "キングス・クロス・セント・パンクラス",
    lines: ["キングス・クロス", "セント・パンクラス"],
  },
  euston: { name: "ユーストン", lines: ["ユーストン"] },
  "warren-street": {
    name: "ウォーレン・ストリート",
    lines: ["ウォーレン", "ストリート"],
  },
  "oxford-circus": {
    name: "オックスフォード・サーカス",
    lines: ["オックスフォード", "サーカス"],
  },
  "green-park": {
    name: "グリーン・パーク",
    lines: ["グリーン", "パーク"],
  },
  victoria: { name: "ヴィクトリア", lines: ["ヴィクトリア"] },
  pimlico: { name: "ピムリコ", lines: ["ピムリコ"] },
  vauxhall: { name: "ヴォクソール", lines: ["ヴォクソール"] },
  stockwell: { name: "ストックウェル", lines: ["ストックウェル"] },
  brixton: { name: "ブリクストン", lines: ["ブリクストン"] },
}

const ENGLISH_STATIONS: StraightStripStation[] = VICTORIA_STRIP.map(
  ({ id, name, interchange }) => ({ id, name, interchange })
)

const JAPANESE_STATIONS: StraightStripStation[] = ENGLISH_STATIONS.map(
  (station) => {
    const label = JAPANESE_LABELS[station.id]
    return {
      ...station,
      name: label?.name ?? station.name,
      labelLines: label?.lines,
    }
  }
)

const optionClassName = (selected: boolean) =>
  cn(
    "min-h-10 rounded-md border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    selected
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:bg-muted"
  )

const EnglishStrip = () => (
  <div lang="en-GB">
    <LineStrip
      lineId="victoria"
      lineName="Victoria line"
      stations={ENGLISH_STATIONS}
      labelPlacement="alternate"
      scroll={false}
    />
  </div>
)

const JapaneseStrip = () => (
  <div lang="ja">
    <LineStrip
      lineId="victoria"
      lineName="ヴィクトリア線"
      stations={JAPANESE_STATIONS}
      labelPlacement="alternate"
      applyLabelRecipes={false}
      scroll={false}
    />
  </div>
)

export const LineLanguages = () => {
  const [view, setView] = useState<LanguageView>("compare")

  return (
    <div className="space-y-4">
      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="px-1 text-sm text-muted-foreground">Labels</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["english", "English"],
              ["japanese", "日本語"],
              ["compare", "Compare"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={optionClassName(view === value)}
              lang={value === "japanese" ? "ja" : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div
        className="overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background p-4 pb-2 [-webkit-overflow-scrolling:touch]"
        role="region"
        aria-label="Victoria line language comparison"
        tabIndex={0}
      >
        <div className="w-max min-w-full space-y-10">
          {view === "english" || view === "compare" ? <EnglishStrip /> : null}
          {view === "japanese" || view === "compare" ? <JapaneseStrip /> : null}
        </div>
      </div>
    </div>
  )
}
