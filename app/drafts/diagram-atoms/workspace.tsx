"use client"

import { useState } from "react"
import Link from "next/link"
import { STEM_RECIPES } from "@/lib/tfl/diagram-atoms"
import { cn } from "@/lib/utils"
import {
  ArcForkAtom,
  AtomCard,
  BendSafetyAtom,
  ConnectedPair,
  ConnectedTriangleU,
  ConnectedYInterchange,
  InterchangeAtom,
  SegmentAtom,
  StationAtom,
  StemYAtom,
  TriangleInterchangeAtom,
  UBendAtom,
  type Travel,
} from "./atoms"

const DIRECTIONS: { id: Travel; label: string; mark: string }[] = [
  { id: "right", label: "Right", mark: "→" },
  { id: "left", label: "Left", mark: "←" },
  { id: "up", label: "Up", mark: "↑" },
  { id: "down", label: "Down", mark: "↓" },
]

const SOUTH_KEN: { id: string; name: string }[] = [
  { id: "piccadilly", name: "Piccadilly" },
  { id: "circle", name: "Circle" },
  { id: "district", name: "District" },
]

const Toggle = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="flex gap-1" role="group" aria-label={label}>
      {(
        [
          { on: true, name: "On" },
          { on: false, name: "Off" },
        ] as const
      ).map((item) => (
        <button
          type="button"
          key={item.name}
          aria-pressed={value === item.on}
          className={cn(
            "h-9 rounded-md border border-border bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === item.on &&
              "border-foreground bg-foreground text-background"
          )}
          onClick={() => onChange(item.on)}
        >
          {item.name}
        </button>
      ))}
    </div>
  </div>
)

export function DiagramAtomsWorkspace() {
  const [travel, setTravel] = useState<Travel>("right")
  const [labeled, setLabeled] = useState(true)
  const [overlay, setOverlay] = useState(false)

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Direction</p>
          <div className="flex gap-1" role="group" aria-label="Travel direction">
            {DIRECTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-label={item.label}
                aria-pressed={travel === item.id}
                className={cn(
                  "h-9 min-w-9 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  travel === item.id &&
                    "border-foreground bg-foreground text-background"
                )}
                onClick={() => setTravel(item.id)}
              >
                {item.mark}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Labels" value={labeled} onChange={setLabeled} />
        <Toggle label="Margins" value={overlay} onChange={setOverlay} />
      </div>

      <section className="space-y-3" aria-labelledby="stations-heading">
        <h2 id="stations-heading" className="text-lg font-medium">
          Stations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AtomCard title="Terminus tick">
            <StationAtom
              anchor="tick"
              end="terminus"
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="Aldwych High Street"
              nameLines={["Aldwych", "High Street"]}
            />
          </AtomCard>
          <AtomCard title="Terminus circle">
            <StationAtom
              anchor="ring"
              end="terminus"
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
          <AtomCard title="Through tick">
            <StationAtom
              anchor="tick"
              end="through"
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="Bermondsey"
            />
          </AtomCard>
          <AtomCard title="Through circle">
            <StationAtom
              anchor="ring"
              end="through"
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="interchanges-heading">
        <h2 id="interchanges-heading" className="text-lg font-medium">
          Interchanges
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AtomCard title="Double · both through">
            <InterchangeAtom
              count={2}
              ends={["through", "through"]}
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
          <AtomCard title="Double · through + terminus">
            <InterchangeAtom
              count={2}
              ends={["through", "terminus"]}
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="Camden Road"
            />
          </AtomCard>
          <AtomCard title="Double · both terminus">
            <InterchangeAtom
              count={2}
              ends={["terminus", "terminus"]}
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="Camden Road"
            />
          </AtomCard>
          <AtomCard title="Triple">
            <InterchangeAtom
              count={3}
              ends={["through", "through", "through"]}
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
          <AtomCard title="Triangle">
            <TriangleInterchangeAtom
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="forks-heading">
        <h2 id="forks-heading" className="text-lg font-medium">
          Forks
        </h2>
        <p className="text-sm text-muted-foreground">
          Incoming is always along the travel axis. Outgoing Y arms are 0° or
          ±45°, with cubic handles on those headings. A U-bend is a single
          180° circular arc joining two parallels that must through-run —
          not two returns meeting at a nose. With Margins on, the pink band
          follows every bend and the diverged tips get a dimensioned gap in{" "}
          <code>x</code> units.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEM_RECIPES.map((recipe) => (
            <AtomCard key={recipe.id} title={recipe.title}>
              <StemYAtom travel={travel} recipe={recipe} overlay={overlay} />
            </AtomCard>
          ))}
          <AtomCard title="U-bend · parallel through">
            <UBendAtom travel={travel} overlay={overlay} />
          </AtomCard>
        </div>
        <p className="text-sm text-muted-foreground">
          A mark only ever joins a stem at a safe distance from its own bend
          — never right where the return cubic lands.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AtomCard title="Too close to its own bend">
            <BendSafetyAtom travel={travel} safe={false} overlay={overlay} />
          </AtomCard>
          <AtomCard title="Joined at a safe distance">
            <BendSafetyAtom travel={travel} safe overlay={overlay} />
          </AtomCard>
        </div>
        <p className="text-sm text-muted-foreground">
          The same clearance and bend-safety numbers, generalised so any
          arbitrary-scale grid renderer can call them: vertex scenarios
          draw octilinear bends as two arcs (
          <code>octilinearLanePath</code>) at their own pitch, never
          this card&apos;s fixed cubic construction.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AtomCard title="Arc bend · too close">
            <ArcForkAtom safe={false} overlay={overlay} />
          </AtomCard>
          <AtomCard title="Arc bend · safe distance">
            <ArcForkAtom safe overlay={overlay} />
          </AtomCard>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="segments-heading">
        <h2 id="segments-heading" className="text-lg font-medium">
          Segment
        </h2>
        <AtomCard title="Min length">
          <SegmentAtom travel={travel} overlay={overlay} />
        </AtomCard>
      </section>

      <section className="space-y-3" aria-labelledby="connected-heading">
        <h2 id="connected-heading" className="text-lg font-medium">
          Connected
        </h2>
        <div className="grid gap-3">
          <AtomCard title="Bermondsey to South Kensington">
            <ConnectedPair
              labeled={labeled}
              overlay={overlay}
              travel={travel}
              left={{ anchor: "tick", end: "through", name: "Bermondsey" }}
              right={{
                anchor: "ring",
                end: "through",
                name: "South Kensington",
                connections: SOUTH_KEN,
              }}
            />
          </AtomCard>
          <AtomCard title="Stem Y and double interchange">
            <ConnectedYInterchange
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
          <AtomCard title="Y, triangle, and U-bend">
            <ConnectedTriangleU
              travel={travel}
              labeled={labeled}
              overlay={overlay}
              name="South Kensington"
              connections={SOUTH_KEN}
            />
          </AtomCard>
        </div>
      </section>

      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        <Link
          href="/drafts/vertex-scenarios"
          className="text-foreground underline underline-offset-4"
        >
          Vertex scenarios
        </Link>
      </p>
    </div>
  )
}
