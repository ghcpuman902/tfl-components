import { ArrowDownIcon } from "lucide-react"
import {
  TFL_API_KEY_PHONE_SHOT,
  TFL_API_KEY_WALKTHROUGH,
  TFL_API_KEY_WIDE_SHOT,
} from "@/lib/tfl/api-key-walkthrough"

const MAX_SHOT_HEIGHT = "50svh"

type ArrowProps = {
  x: number
  y: number
  rotate?: number
}

const WalkthroughArrow = ({
  arrows,
}: {
  arrows: ArrowProps[] | ArrowProps
}) => {
  const arrowsArray = Array.isArray(arrows) ? arrows : [arrows]
  return (
    <>
      {arrowsArray.map((arrow, idx) => (
        <div
          key={idx}
          className="pointer-events-none absolute z-10"
          style={{ left: `${arrow.x}%`, top: `${arrow.y}%` }}
          aria-hidden
        >
          <ArrowDownIcon
            className="absolute left-1/2 size-9 text-red-500"
            style={{
              top: "-2.35rem",
              transform: `translateX(-50%) rotate(${arrow.rotate ?? 0}deg)`,
            }}
            strokeWidth={2.75}
          />
        </div>
      ))}
    </>
  )
}

export const TflApiKeyWalkthrough = () => (
  <ol className="mx-auto flex max-w-xl flex-col gap-y-12 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-x-8 sm:gap-y-10">
    {TFL_API_KEY_WALKTHROUGH.map((step, index) => {
      const shot = step.wide ? TFL_API_KEY_WIDE_SHOT : TFL_API_KEY_PHONE_SHOT
      return (
        <li
          key={step.id}
          className="flex flex-col gap-10 sm:col-span-2 sm:grid sm:grid-cols-subgrid"
        >
          <figure
            className="relative mx-auto max-w-full overflow-hidden rounded-lg bg-muted sm:mx-0 sm:justify-self-end"
            style={{
              aspectRatio: `${shot.width} / ${shot.height}`,
              width: `min(100%, calc(${MAX_SHOT_HEIGHT} * ${shot.width} / ${shot.height}))`,
            }}
          >
            <img
              src={step.src}
              alt={step.alt}
              width={shot.width}
              height={shot.height}
              className="block size-full object-contain"
            />
            <WalkthroughArrow arrows={step.arrow} />
          </figure>
          <p className="order-first text-pretty text-base text-foreground sm:order-none sm:justify-self-start sm:pt-0.5 sm:text-left sm:text-lg md:text-2xl">
            <span className="tabular-nums">{index + 1}.</span> {step.caption}{" "}
            {step.href ? (
              <a
                href={step.href}
                className="underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </p>
        </li>
      )
    })}
  </ol>
)
