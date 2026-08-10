#!/usr/bin/env python3
"""
Extract TfL Go NIGHT map colours and compare to day samples + brand tokens.

Usage:
  python3 app/temp/tfl-go-night-colours/extract_night_palette.py
"""

from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DAY_JSON = HERE.parent / "tfl-go-day-colours" / "day-palette-results.json"
OUT_JSON = HERE / "night-palette-results.json"
OUT_SWATCH = HERE / "night-palette-swatches.png"
SRC = HERE / "tfl-go-night.png"

OUR_TOKENS: dict[str, str] = {
    "bakerloo": "#B26300",
    "central": "#DC241F",
    "circle": "#FFC80A",
    "district": "#007D32",
    "hammersmithCity": "#F589A6",
    "jubilee": "#838D93",
    "metropolitan": "#9B0058",
    "northern": "#000000",
    "piccadilly": "#0019A8",
    "victoria": "#039BE5",
    "waterlooCity": "#76D0BD",
    "dlr": "#00AFAD",
    "elizabeth": "#60399E",
    "overground": "#FA7B05",
    "trams": "#5FB526",
    "cableCarMode": "#734FA0",
    "cableCarMap": "#DC241F",
}


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{int(r):02X}{int(g):02X}{int(b):02X}"


def srgb_to_linear(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    R, G, B = srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b)
    X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
    Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750
    Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041
    Xn, Yn, Zn = 0.95047, 1.00000, 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + 16 / 116

    fx, fy, fz = f(X / Xn), f(Y / Yn), f(Z / Zn)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta_e76(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    L1, a1, b1 = rgb_to_lab(*c1)
    L2, a2, b2 = rgb_to_lab(*c2)
    return math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)


def rgb_to_hsv(r: int, g: int, b: int) -> tuple[float, float, float]:
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(rf, gf, bf), min(rf, gf, bf)
    v = mx
    d = mx - mn
    s = 0.0 if mx == 0 else d / mx
    if d == 0:
        h = 0.0
    elif mx == rf:
        h = ((gf - bf) / d) % 6
    elif mx == gf:
        h = (bf - rf) / d + 2
    else:
        h = (rf - gf) / d + 4
    return h * 60.0, s, v


def chroma_approx(r: int, g: int, b: int) -> float:
    """Rough chroma proxy: max-min channel in 0–1."""
    return (max(r, g, b) - min(r, g, b)) / 255.0


def is_night_bg_candidate(r: int, g: int, b: int) -> bool:
    h, s, v = rgb_to_hsv(r, g, b)
    return s < 0.12 and 0.08 <= v <= 0.28 and abs(r - g) < 18 and abs(g - b) < 18


def is_line_ink(r: int, g: int, b: int) -> bool:
    """Skip charcoal bg + near-white labels (keep bright line paints)."""
    h, s, v = rgb_to_hsv(r, g, b)
    if is_night_bg_candidate(r, g, b):
        return False
    # pure white / near-white station text — exclude from coloured-line sampling
    if s < 0.08 and v > 0.92:
        return False
    return True


def load_resized(path: Path, max_side: int = 1600) -> Image.Image:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    scale = max_side / max(w, h)
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return im


def pixels_of(im: Image.Image) -> list[tuple[int, int, int]]:
    return list(im.convert("RGB").getdata())


def mean_rgb(samples: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    if not samples:
        return (0, 0, 0)
    n = len(samples)
    return (
        int(round(sum(p[0] for p in samples) / n)),
        int(round(sum(p[1] for p in samples) / n)),
        int(round(sum(p[2] for p in samples) / n)),
    )


def isolate(
    pixels: list[tuple[int, int, int]],
    predicate,
    *,
    step: int = 4,
    top: int = 12,
) -> dict:
    counts: Counter[tuple[int, int, int]] = Counter()
    samples: list[tuple[int, int, int]] = []
    for r, g, b in pixels:
        if predicate(r, g, b):
            counts[((r // step) * step, (g // step) * step, (b // step) * step)] += 1
            samples.append((r, g, b))
    buckets = []
    for (r, g, b), n in counts.most_common(top):
        h, s, v = rgb_to_hsv(r, g, b)
        buckets.append(
            {
                "hex": rgb_to_hex(r, g, b),
                "rgb": [r, g, b],
                "count": n,
                "hsv": [round(h, 1), round(s, 3), round(v, 3)],
                "chroma": round(chroma_approx(r, g, b), 3),
            }
        )
    avg = mean_rgb(samples)
    h, s, v = rgb_to_hsv(*avg) if samples else (0.0, 0.0, 0.0)
    return {
        "buckets": buckets,
        "mean_hex": rgb_to_hex(*avg) if samples else None,
        "mean_rgb": list(avg) if samples else None,
        "mean_hsv": [round(h, 1), round(s, 3), round(v, 3)] if samples else None,
        "mean_chroma": round(chroma_approx(*avg), 3) if samples else None,
        "pixel_count": len(samples),
        "mode_hex": buckets[0]["hex"] if buckets else None,
    }


# --- Family predicates tuned for luminous night paints ---

def pred_central(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return (h <= 14 or h >= 350) and s >= 0.55 and v >= 0.55 and r > 170 and g < 110 and b < 110


def pred_victoria(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 190 <= h <= 210 and s >= 0.45 and v >= 0.55


def pred_piccadilly(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 220 <= h <= 250 and s >= 0.45 and 0.35 <= v <= 0.85 and b > r + 40


def pred_district(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 115 <= h <= 145 and s >= 0.45 and v >= 0.40 and g > r and g > b


def pred_jubilee(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return s <= 0.12 and 0.45 <= v <= 0.78 and abs(r - g) < 14 and abs(g - b) < 14


def pred_metropolitan(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 320 <= h <= 345 and s >= 0.45 and 0.35 <= v <= 0.75 and r > 100


def pred_elizabeth(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 255 <= h <= 285 and s >= 0.35 and 0.35 <= v <= 0.80


def pred_hc(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 330 <= h <= 350 and s >= 0.35 and v >= 0.65 and b > g - 10


def pred_circle(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 42 <= h <= 55 and s >= 0.55 and v >= 0.75


def pred_bakerloo(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 22 <= h <= 38 and s >= 0.45 and 0.35 <= v <= 0.70 and r < 200


def pred_overground(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 22 <= h <= 40 and s >= 0.55 and v >= 0.72 and r >= 200 and b < 100


def pred_dlr(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 165 <= h <= 185 and s >= 0.35 and v >= 0.45


def pred_trams(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 85 <= h <= 110 and s >= 0.45 and v >= 0.50


def pred_waterloo(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 155 <= h <= 175 and s >= 0.25 and v >= 0.55 and g > 150


def pred_nr(r, g, b):
    """Pale pinkish National Rail — lower chroma than H&C."""
    h, s, v = rgb_to_hsv(r, g, b)
    if not (330 <= h or h <= 20):
        return False
    if not (0.15 <= s <= 0.50):
        return False
    if not (0.45 <= v <= 0.85):
        return False
    if delta_e76((r, g, b), hex_to_rgb("#F589A6")) < 14:
        return False
    if b > g + 25:
        return False
    return True


def pred_northern_fill(r, g, b):
    """Night Northern often reads as near-black core or white stroke."""
    h, s, v = rgb_to_hsv(r, g, b)
    return s < 0.08 and v < 0.18


def pred_northern_outline(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return s < 0.08 and v >= 0.85


def pred_thames(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    # slightly lighter / bluer than map charcoal
    return 200 <= h <= 230 and 0.04 <= s <= 0.25 and 0.22 <= v <= 0.42


def pred_access_yellow(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return 45 <= h <= 58 and s >= 0.55 and v >= 0.75


def pred_station_white(r, g, b):
    h, s, v = rgb_to_hsv(r, g, b)
    return s < 0.06 and v >= 0.90


FAMILIES = {
    "central": pred_central,
    "victoria": pred_victoria,
    "piccadilly": pred_piccadilly,
    "district": pred_district,
    "jubilee": pred_jubilee,
    "metropolitan": pred_metropolitan,
    "elizabeth": pred_elizabeth,
    "hammersmithCity": pred_hc,
    "circle": pred_circle,
    "bakerloo": pred_bakerloo,
    "overground": pred_overground,
    "dlr": pred_dlr,
    "trams": pred_trams,
    "waterlooCity": pred_waterloo,
    "national_rail": pred_nr,
    "northern_fill": pred_northern_fill,
    "northern_outline_or_label": pred_northern_outline,
    "thames": pred_thames,
    "accessibility_yellow": pred_access_yellow,
    "station_label_white": pred_station_white,
}


def sample_bg(pixels: list[tuple[int, int, int]]) -> dict:
    return isolate(pixels, is_night_bg_candidate, step=2, top=10)


def hsv_of_hex(hx: str | None) -> list[float] | None:
    if not hx:
        return None
    h, s, v = rgb_to_hsv(*hex_to_rgb(hx))
    return [round(h, 1), round(s, 3), round(v, 3)]


def chroma_of_hex(hx: str | None) -> float | None:
    if not hx:
        return None
    return round(chroma_approx(*hex_to_rgb(hx)), 3)


def compare_day_night(day_hex: str | None, night_hex: str | None) -> dict | None:
    if not day_hex or not night_hex:
        return None
    dh, ds, dv = rgb_to_hsv(*hex_to_rgb(day_hex))
    nh, ns, nv = rgb_to_hsv(*hex_to_rgb(night_hex))
    return {
        "day_hex": day_hex,
        "night_hex": night_hex,
        "day_hsv": [round(dh, 1), round(ds, 3), round(dv, 3)],
        "night_hsv": [round(nh, 1), round(ns, 3), round(nv, 3)],
        "delta_s": round(ns - ds, 3),
        "delta_v": round(nv - dv, 3),
        "delta_chroma": round(chroma_of_hex(night_hex) - chroma_of_hex(day_hex), 3),
        "delta_e": round(delta_e76(hex_to_rgb(day_hex), hex_to_rgb(night_hex)), 2),
        "brighter": nv > dv + 0.03,
        "more_saturated": ns > ds + 0.03,
    }


def render_swatches(bg: dict, families: dict, day_cmp: list[dict], path: Path) -> None:
    rows = [("background", bg.get("mean_hex") or "#000000", None)]
    for name in [
        "central",
        "victoria",
        "piccadilly",
        "district",
        "jubilee",
        "metropolitan",
        "elizabeth",
        "hammersmithCity",
        "circle",
        "bakerloo",
        "overground",
        "dlr",
        "trams",
        "national_rail",
        "northern_fill",
        "thames",
    ]:
        f = families.get(name) or {}
        rows.append((name, f.get("mean_hex") or "#000000", f.get("mode_hex")))

    row_h = 32
    im = Image.new("RGB", (820, 40 + row_h * (len(rows) + len(day_cmp) + 2)), (30, 32, 36))
    draw = ImageDraw.Draw(im)
    y = 10
    draw.text((12, y), "TfL Go NIGHT palette (mean / mode)", fill=(230, 230, 230))
    y += 26
    for name, mean_hx, mode_hx in rows:
        draw.rectangle([12, y, 80, y + 24], fill=hex_to_rgb(mean_hx), outline=(80, 80, 80))
        if mode_hx:
            draw.rectangle([88, y, 156, y + 24], fill=hex_to_rgb(mode_hx), outline=(80, 80, 80))
        draw.text((168, y + 4), f"{name}: mean {mean_hx}  mode {mode_hx or '—'}", fill=(220, 220, 220))
        y += row_h
    y += 8
    draw.text((12, y), "Day → Night (where day sample exists)", fill=(230, 230, 230))
    y += 24
    for row in day_cmp[:12]:
        draw.rectangle([12, y, 80, y + 24], fill=hex_to_rgb(row["day_hex"]), outline=(80, 80, 80))
        draw.rectangle([88, y, 156, y + 24], fill=hex_to_rgb(row["night_hex"]), outline=(80, 80, 80))
        flags = []
        if row.get("brighter"):
            flags.append("+V")
        if row.get("more_saturated"):
            flags.append("+S")
        draw.text(
            (168, y + 4),
            f"{row['token']}: {row['day_hex']} → {row['night_hex']}  ΔS {row['delta_s']:+.2f} ΔV {row['delta_v']:+.2f} {' '.join(flags)}",
            fill=(220, 220, 220),
        )
        y += row_h
    im.save(path)


def main() -> None:
    im = load_resized(SRC, max_side=1800)
    pixels = pixels_of(im)

    bg = sample_bg(pixels)
    # Exclude pure black from bg mean if present — we want the charcoal paper
    bg_no_black = isolate(
        pixels,
        lambda r, g, b: is_night_bg_candidate(r, g, b) and max(r, g, b) > 20,
        step=2,
        top=10,
    )

    families = {name: isolate(pixels, pred) for name, pred in FAMILIES.items()}

    # Brand-token ΔE match using night family means where available
    token_rows = []
    for name, hx in OUR_TOKENS.items():
        fam_key = name
        if name == "northern":
            # Night Northern: report fill + outline separately; match fill to brand black
            sample = families["northern_fill"]
        elif name == "cableCarMap":
            sample = families["central"]  # running paint == central red family
        elif name == "cableCarMode":
            sample = families["elizabeth"]  # purple family bleed — flagged in notes
        else:
            sample = families.get(fam_key) or {"mean_hex": None, "pixel_count": 0}
        go = sample.get("mean_hex")
        de = round(delta_e76(hex_to_rgb(hx), hex_to_rgb(go)), 2) if go else None
        token_rows.append(
            {
                "token": name,
                "our_hex": hx,
                "go_mean_hex": go,
                "go_mode_hex": sample.get("mode_hex"),
                "go_hsv": sample.get("mean_hsv"),
                "go_chroma": sample.get("mean_chroma"),
                "delta_e": de,
                "sample_count": sample.get("pixel_count", 0),
            }
        )

    # Day comparison
    day = {}
    if DAY_JSON.exists():
        day = json.loads(DAY_JSON.read_text())
    day_matches = day.get("token_matches") or {}
    day_specials = day.get("proposed_new_tokens") or {}
    day_overrides = day.get("hue_family_overrides") or {}

    day_hex_for = {}
    for name, m in day_matches.items():
        day_hex_for[name] = m.get("go_mean_hex")
    for name, ov in day_overrides.items():
        if ov.get("mean_hex"):
            day_hex_for[name] = ov["mean_hex"]
    day_hex_for["national_rail"] = day_specials.get("nationalRailDayMap")
    day_hex_for["thames"] = day_specials.get("thamesDayFill")
    day_hex_for["accessibility_yellow"] = day_specials.get("accessibilityYellow")
    day_hex_for["overground"] = (
        day_specials.get("overgroundGoDayBrightCore")
        or day_specials.get("overgroundGoDayObserved")
        or day_hex_for.get("overground")
    )

    day_night = []
    for name, night_fam in families.items():
        # map family name to day key
        day_key = name
        if name == "national_rail":
            day_key = "national_rail"
        night_hx = night_fam.get("mode_hex") or night_fam.get("mean_hex")
        day_hx = day_hex_for.get(day_key) or day_hex_for.get(name)
        cmp = compare_day_night(day_hx, night_hx)
        if cmp:
            cmp["token"] = name
            day_night.append(cmp)

    day_night.sort(key=lambda r: -(r["delta_s"] + r["delta_v"]))

    brighter_count = sum(1 for r in day_night if r["brighter"])
    sat_count = sum(1 for r in day_night if r["more_saturated"])

    summary = {
        "mode": "night",
        "source_images": [SRC.name],
        "notes": [
            "Background is charcoal gray, not pitch black (#000).",
            "Line paints feel brighter / more saturated against dark paper — measured via day→night ΔS/ΔV.",
            "Northern needs a light treatment on dark maps (outline and/or light fill) — brand black alone disappears.",
            "National Rail stays pinkish but may shift value on dark paper.",
            "Cable car not prominently running as Central-red rails in this frame.",
        ],
        "background": {
            "all_dark_candidates": bg,
            "charcoal_excluding_near_black": bg_no_black,
            "pitch_black": "#000000",
            "recommended_token": bg_no_black.get("mode_hex") or bg_no_black.get("mean_hex"),
            "note": "Use charcoal paper, never #000 map chrome for night Go-like surfaces.",
        },
        "families": {k: {kk: vv for kk, vv in v.items() if kk != "buckets"} | {"top_buckets": v.get("buckets", [])[:5]} for k, v in families.items()},
        "token_rows": token_rows,
        "day_vs_night": day_night,
        "day_vs_night_summary": {
            "compared": len(day_night),
            "brighter_than_day": brighter_count,
            "more_saturated_than_day": sat_count,
            "avg_delta_s": round(sum(r["delta_s"] for r in day_night) / max(len(day_night), 1), 3),
            "avg_delta_v": round(sum(r["delta_v"] for r in day_night) / max(len(day_night), 1), 3),
        },
        "proposed_night_tokens": {
            "mapBackground": bg_no_black.get("mode_hex") or bg_no_black.get("mean_hex"),
            "mapBackgroundMean": bg_no_black.get("mean_hex"),
            "thames": families["thames"].get("mean_hex"),
            "nationalRail": families["national_rail"].get("mean_hex")
            or families["national_rail"].get("mode_hex"),
            "northernFill": families["northern_fill"].get("mean_hex"),
            "northernOutline": families["northern_outline_or_label"].get("mode_hex"),
            "stationLabel": families["station_label_white"].get("mode_hex"),
            "accessibilityYellow": families["accessibility_yellow"].get("mean_hex"),
            "central": families["central"].get("mode_hex"),
            "victoria": families["victoria"].get("mode_hex"),
            "overground": families["overground"].get("mode_hex"),
            "elizabeth": families["elizabeth"].get("mode_hex"),
            "dlr": families["dlr"].get("mode_hex"),
            "hammersmithCity": families["hammersmithCity"].get("mode_hex"),
            "district": families["district"].get("mode_hex"),
            "circle": families["circle"].get("mode_hex"),
            "jubilee": families["jubilee"].get("mode_hex"),
            "piccadilly": families["piccadilly"].get("mode_hex"),
            "metropolitan": families["metropolitan"].get("mode_hex"),
            "bakerloo": families["bakerloo"].get("mode_hex"),
            "trams": families["trams"].get("mode_hex"),
        },
    }

    OUT_JSON.write_text(json.dumps(summary, indent=2))
    render_swatches(bg_no_black, families, day_night, OUT_SWATCH)

    print("=== TfL Go NIGHT mode colour research ===\n")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_SWATCH}\n")

    print("Background (charcoal, exclude near-black):")
    print(f"  mean {bg_no_black.get('mean_hex')}  mode {bg_no_black.get('mode_hex')}  n={bg_no_black.get('pixel_count')}")
    print(f"  hsv  {bg_no_black.get('mean_hsv')}")
    print(f"  pure #000 is NOT the map paper\n")

    print(f"{'family':22} {'mean':8} {'mode':8} {'S':>5} {'V':>5} {'C':>5}  n")
    for name in [
        "central",
        "victoria",
        "piccadilly",
        "district",
        "jubilee",
        "metropolitan",
        "elizabeth",
        "hammersmithCity",
        "circle",
        "bakerloo",
        "overground",
        "dlr",
        "trams",
        "national_rail",
        "northern_fill",
        "thames",
    ]:
        f = families[name]
        hsv = f.get("mean_hsv") or [0, 0, 0]
        print(
            f"{name:22} {str(f.get('mean_hex')):8} {str(f.get('mode_hex')):8} "
            f"{hsv[1]:5.3f} {hsv[2]:5.3f} {float(f.get('mean_chroma') or 0):5.3f}  {f.get('pixel_count')}"
        )

    print("\nDay → Night (sorted by ΔS+ΔV):")
    print(f"{'token':22} {'day':8} {'night':8} {'ΔS':>6} {'ΔV':>6} flags")
    for r in day_night:
        flags = []
        if r["brighter"]:
            flags.append("+bright")
        if r["more_saturated"]:
            flags.append("+sat")
        print(
            f"{r['token']:22} {r['day_hex']:8} {r['night_hex']:8} "
            f"{r['delta_s']:+6.3f} {r['delta_v']:+6.3f} {' '.join(flags)}"
        )

    s = summary["day_vs_night_summary"]
    print(
        f"\nSummary: {s['brighter_than_day']}/{s['compared']} brighter, "
        f"{s['more_saturated_than_day']}/{s['compared']} more saturated; "
        f"avg ΔS {s['avg_delta_s']:+.3f}  avg ΔV {s['avg_delta_v']:+.3f}"
    )


if __name__ == "__main__":
    main()
