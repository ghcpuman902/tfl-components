import { HOME_HERO_SLIDES } from "@/components/docs/home-hero-photos"

const MOSAIC = [
  { slide: HOME_HERO_SLIDES[0], span: "md:col-span-5 md:row-span-2" },
  { slide: HOME_HERO_SLIDES[2], span: "md:col-span-4" },
  { slide: HOME_HERO_SLIDES[4], span: "md:col-span-3" },
  { slide: HOME_HERO_SLIDES[1], span: "md:col-span-4" },
  { slide: HOME_HERO_SLIDES[5], span: "md:col-span-3" },
] as const

export const LandingProofMosaic = () => (
  <section
    aria-labelledby="landing-mosaic-heading"
    className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8"
  >
    <h2
      id="landing-mosaic-heading"
      className="tfl-title text-2xl text-foreground md:text-3xl"
    >
      Boards already at work
    </h2>
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-5">
      {MOSAIC.map(({ slide, span }) => (
        <figure key={slide.src} className={`min-w-0 ${span}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            className="h-full max-h-80 w-full object-cover md:max-h-none"
          />
          <figcaption className="mt-2 text-sm text-muted-foreground">
            {slide.caption}
            {slide.tflCredit ? " Image includes TfL premises." : ""}
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
)
