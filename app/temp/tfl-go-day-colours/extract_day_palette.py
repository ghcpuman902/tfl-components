#!/usr/bin/env python3
"""
Extract daytime TfL Go map colours from screenshots and match to repo brand tokens.

Strategy:
  1. For each known brand token, average all ink pixels within a ΔE gate
     (so thin saturated lines still register).
  2. Isolate National Rail pinkish (exclude H&C-like hot pink).
  3. Isolate inactive cable-car light grey (exclude Jubilee mid-grey).
  4. Sample Thames fill + paper white.

Usage:
  python3 app/temp/tfl-go-day-colours/extract_day_palette.py
"""

from __future__ import annotations

import json
import math
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT_JSON = HERE / "day-palette-results.json"
OUT_SWATCH = HERE / "day-palette-swatches.png"

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


def is_paper(r: int, g: int, b: int) -> bool:
    return min(r, g, b) > 240 and max(r, g, b) - min(r, g, b) < 14


def load_resized(path: Path, max_side: int = 1100) -> Image.Image:
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
    r = sum(p[0] for p in samples) / n
    g = sum(p[1] for p in samples) / n
    b = sum(p[2] for p in samples) / n
    return int(round(r)), int(round(g)), int(round(b))


def mode_bucket(samples: list[tuple[int, int, int]], step: int = 4) -> tuple[int, int, int]:
    counts: Counter[tuple[int, int, int]] = Counter()
    for r, g, b in samples:
        counts[((r // step) * step, (g // step) * step, (b // step) * step)] += 1
    return counts.most_common(1)[0][0] if counts else (0, 0, 0)


def build_ink_histogram(
    pixels: list[tuple[int, int, int]], step: int = 4
) -> Counter[tuple[int, int, int]]:
    counts: Counter[tuple[int, int, int]] = Counter()
    for r, g, b in pixels:
        if is_paper(r, g, b):
            continue
        counts[((r // step) * step, (g // step) * step, (b // step) * step)] += 1
    return counts


def sample_near_token(
    hist: Counter[tuple[int, int, int]],
    token: tuple[int, int, int],
    *,
    max_de: float,
) -> dict:
    hits: list[tuple[int, int, int]] = []
    weights: list[int] = []
    for rgb, n in hist.items():
        if delta_e76(rgb, token) <= max_de:
            hits.append(rgb)
            weights.append(n)
    if not hits:
        for rgb, n in hist.items():
            if delta_e76(rgb, token) <= max_de + 10:
                hits.append(rgb)
                weights.append(n)
    if not hits:
        return {
            "sample_count": 0,
            "mean_hex": None,
            "mean_rgb": None,
            "mode_hex": None,
            "mode_rgb": None,
            "delta_e_mean_vs_token": None,
            "delta_e_mode_vs_token": None,
        }
    total = sum(weights)
    r = sum(rgb[0] * w for rgb, w in zip(hits, weights)) / total
    g = sum(rgb[1] * w for rgb, w in zip(hits, weights)) / total
    b = sum(rgb[2] * w for rgb, w in zip(hits, weights)) / total
    avg = (int(round(r)), int(round(g)), int(round(b)))
    mode = max(zip(hits, weights), key=lambda x: x[1])[0]
    return {
        "sample_count": total,
        "mean_hex": rgb_to_hex(*avg),
        "mean_rgb": list(avg),
        "mode_hex": rgb_to_hex(*mode),
        "mode_rgb": list(mode),
        "delta_e_mean_vs_token": round(delta_e76(avg, token), 2),
        "delta_e_mode_vs_token": round(delta_e76(mode, token), 2),
    }


def verdict(de: float | None) -> str:
    if de is None:
        return "missing"
    if de < 3:
        return "exact"
    if de < 8:
        return "close"
    if de < 15:
        return "near"
    if de < 25:
        return "drift"
    return "mismatch"


def isolate(
    pixels: list[tuple[int, int, int]],
    predicate,
    *,
    step: int = 4,
    top: int = 12,
) -> list[dict]:
    counts: Counter[tuple[int, int, int]] = Counter()
    samples: list[tuple[int, int, int]] = []
    for r, g, b in pixels:
        if predicate(r, g, b):
            counts[((r // step) * step, (g // step) * step, (b // step) * step)] += 1
            samples.append((r, g, b))
    out = []
    for (r, g, b), n in counts.most_common(top):
        h, s, v = rgb_to_hsv(r, g, b)
        out.append(
            {
                "hex": rgb_to_hex(r, g, b),
                "rgb": [r, g, b],
                "count": n,
                "hsv": [round(h, 1), round(s, 3), round(v, 3)],
            }
        )
    avg = mean_rgb(samples) if samples else (0, 0, 0)
    return {
        "buckets": out,
        "mean_hex": rgb_to_hex(*avg) if samples else None,
        "mean_rgb": list(avg) if samples else None,
        "pixel_count": len(samples),
    }


def national_rail_predicate(r: int, g: int, b: int) -> bool:
    """Pale pinkish / salmon NR — exclude H&C hot pink and Central red."""
    h, s, v = rgb_to_hsv(r, g, b)
    # Red–rose band
    if not (340 <= h or h <= 18):
        return False
    # Lower chroma than H&C; light–mid value
    if not (0.18 <= s <= 0.48):
        return False
    if not (0.62 <= v <= 0.93):
        return False
    # H&C is magenta-leaning (high B relative to G). Prefer salmon (G≈B or G>B a bit).
    if b > g + 18:
        return False
    # Strong Central reds
    if r > 200 and g < 90 and b < 90 and s > 0.5:
        return False
    # Exclude near H&C token
    if delta_e76((r, g, b), hex_to_rgb("#F589A6")) < 12:
        return False
    return True


def cable_car_inactive_predicate(r: int, g: int, b: int) -> bool:
    """Light cool grey dashed stroke — lighter than Jubilee."""
    h, s, v = rgb_to_hsv(r, g, b)
    if s > 0.06:
        return False
    if not (0.72 <= v <= 0.90):
        return False
    if abs(r - g) > 12 or abs(g - b) > 12 or abs(r - b) > 12:
        return False
    # Keep away from Jubilee mid grey
    if delta_e76((r, g, b), hex_to_rgb("#838D93")) < 18:
        return False
    return True


def thames_predicate(r: int, g: int, b: int) -> bool:
    h, s, v = rgb_to_hsv(r, g, b)
    return 195 <= h <= 215 and 0.08 <= s <= 0.28 and 0.88 <= v <= 0.98


def accessibility_yellow_predicate(r: int, g: int, b: int) -> bool:
    h, s, v = rgb_to_hsv(r, g, b)
    return 45 <= h <= 58 and s >= 0.55 and v >= 0.75


def crop_box(im: Image.Image, box_frac: tuple[float, float, float, float]) -> Image.Image:
    w, h = im.size
    l, t, r, b = box_frac
    return im.crop((int(w * l), int(h * t), int(w * r), int(h * b)))


def render_swatches(token_rows: list[dict], specials: dict, path: Path) -> None:
    row_h = 34
    special_keys = [
        ("national_rail", specials["national_rail"]["mean_hex"]),
        ("cable_car_inactive", specials["cable_car_inactive"]["mean_hex"]),
        ("thames", specials["thames"]["mean_hex"]),
        ("accessibility_yellow", specials["accessibility_yellow"]["mean_hex"]),
    ]
    h = 48 + row_h * (len(token_rows) + len(special_keys) + 1)
    im = Image.new("RGB", (860, h), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    y = 12
    draw.text((12, y), "TfL Go DAY — ours (L) vs Go mean sample (R)", fill=(0, 0, 0))
    y += 28
    for row in token_rows:
        our = hex_to_rgb(row["our_hex"])
        go = hex_to_rgb(row["go_mean_hex"] or "#FFFFFF")
        draw.rectangle([12, y, 88, y + 26], fill=our, outline=(0, 0, 0))
        draw.rectangle([96, y, 172, y + 26], fill=go, outline=(0, 0, 0))
        draw.text(
            (184, y + 5),
            f"{row['token']:16} {row['our_hex']} → {row['go_mean_hex']}  ΔE {row['delta_e']} ({row['verdict']}) n={row['sample_count']}",
            fill=(20, 20, 20),
        )
        y += row_h
    y += 6
    draw.text((12, y), "Specials (not in brand-colours yet / state paint)", fill=(0, 0, 0))
    y += 24
    for key, hx in special_keys:
        if not hx:
            continue
        draw.rectangle([12, y, 88, y + 26], fill=hex_to_rgb(hx), outline=(0, 0, 0))
        draw.text((96, y + 5), f"{key}: {hx}", fill=(20, 20, 20))
        y += row_h
    im.save(path)


def main() -> None:
    paths = [
        HERE / "IMG_3593.jpg",
        HERE / "IMG_3592.jpg",
        HERE / "IMG_3591.jpg",
    ]
    images = [load_resized(p) for p in paths]
    pixels: list[tuple[int, int, int]] = []
    for im in images:
        pixels.extend(pixels_of(im))

    # Per-token gates: black needs tight; saturated lines a bit looser for JPEG.
    gates = {
        "northern": 8,
        "jubilee": 12,
        "circle": 18,
        "central": 18,
        "piccadilly": 18,
        "elizabeth": 18,
        "district": 18,
        "victoria": 18,
        "dlr": 18,
        "overground": 18,
        "bakerloo": 18,
        "metropolitan": 18,
        "hammersmithCity": 16,
        "trams": 18,
        "waterlooCity": 18,
        "cableCarMode": 16,
        "cableCarMap": 18,
    }

    hist = build_ink_histogram(pixels, step=4)

    token_rows = []
    token_matches = {}
    for name, hx in OUR_TOKENS.items():
        sample = sample_near_token(
            hist, hex_to_rgb(hx), max_de=gates.get(name, 16)
        )
        de = sample["delta_e_mean_vs_token"]
        row = {
            "token": name,
            "our_hex": hx.upper(),
            "go_mean_hex": sample["mean_hex"] if sample["sample_count"] else None,
            "go_mode_hex": sample["mode_hex"] if sample["sample_count"] else None,
            "delta_e": de,
            "verdict": verdict(de),
            "sample_count": sample["sample_count"],
            "detail": sample,
        }
        token_rows.append(row)
        token_matches[name] = row

    token_rows.sort(key=lambda r: (r["delta_e"] is None, r["delta_e"] or 999))

    # East crop: cable car corridor + Woolwich NR (fractions of IMG_3591)
    east = load_resized(HERE / "IMG_3591.jpg", max_side=1400)
    # Rough regions from layout: Thames mid; cable car mid-right; NR lower-right
    cable_region = pixels_of(crop_box(east, (0.45, 0.38, 0.78, 0.55)))
    nr_region = pixels_of(crop_box(east, (0.35, 0.55, 0.85, 0.82)))

    nr_all = isolate(pixels, national_rail_predicate)
    nr_east = isolate(nr_region, national_rail_predicate)
    cc_all = isolate(pixels, cable_car_inactive_predicate)
    cc_east = isolate(cable_region, cable_car_inactive_predicate)
    thames = isolate(pixels, thames_predicate)
    access_y = isolate(pixels, accessibility_yellow_predicate)

    specials = {
        "national_rail": {
            **nr_east,
            "source": "IMG_3591 east NR region (fallback: all images)",
            "fallback_mean_hex": nr_all["mean_hex"],
            "buckets_all": nr_all["buckets"][:5],
        },
        "cable_car_inactive": {
            **cc_east,
            "source": "IMG_3591 cable-car corridor crop",
            "fallback_mean_hex": cc_all["mean_hex"],
            "buckets_all": cc_all["buckets"][:5],
        },
        "thames": thames,
        "accessibility_yellow": access_y,
        "paper": {"mean_hex": "#FFFFFF", "note": "Map paper is near-pure white in day mode"},
    }

    # Prefer east isolates when they have enough pixels
    if (nr_east["pixel_count"] or 0) < 40:
        specials["national_rail"] = {**nr_all, "source": "all images (east crop sparse)"}
    if (cc_east["pixel_count"] or 0) < 40:
        specials["cable_car_inactive"] = {
            **cc_all,
            "source": "all images (corridor crop sparse)",
        }

    proposed = {
        "nationalRailDayMap": specials["national_rail"]["mean_hex"],
        "cableCarInactiveDayMap": specials["cable_car_inactive"]["mean_hex"],
        "thamesDayFill": specials["thames"]["mean_hex"],
        "accessibilityYellow": specials["accessibility_yellow"]["mean_hex"],
    }

    summary = {
        "mode": "day",
        "source_images": [p.name for p in paths],
        "method": (
            "Per-token: mean of pixels within Lab ΔE gate of published hex. "
            "Specials: HSV isolates + east crops for NR / inactive cable car."
        ),
        "notes": [
            "Daytime TfL Go map calibration before night mode.",
            "National Rail is pinkish/salmon — lighter and less magenta than H&C.",
            "Cable car not running: light grey dashed stroke, not mode purple or Central red rails.",
        ],
        "proposed_new_tokens": proposed,
        "token_matches": token_matches,
        "token_rows_sorted": token_rows,
        "specials": specials,
        "gaps": [
            {
                "id": "national_rail",
                "go_hex": proposed["nationalRailDayMap"],
                "in_repo": None,
                "action": "Add day-map National Rail pinkish token (not in brand-colours.ts)",
            },
            {
                "id": "cable_car_inactive",
                "go_hex": proposed["cableCarInactiveDayMap"],
                "in_repo": {
                    "mode_purple": OUR_TOKENS["cableCarMode"],
                    "map_running": OUR_TOKENS["cableCarMap"],
                },
                "action": "Add inactive/not-running map stroke (light grey)",
            },
        ],
    }

    OUT_JSON.write_text(json.dumps(summary, indent=2))
    render_swatches(token_rows, specials, OUT_SWATCH)

    print("=== TfL Go DAY mode colour research (v2) ===\n")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_SWATCH}\n")
    print(f"{'token':18} {'ours':8} {'go mean':8} {'ΔE':>6}  verdict   n")
    for row in token_rows:
        print(
            f"{row['token']:18} {row['our_hex']:8} {str(row['go_mean_hex']):8} "
            f"{(row['delta_e'] if row['delta_e'] is not None else -1):6.2f}  "
            f"{row['verdict']:8} {row['sample_count']}"
        )
    print("\nProposed new / state tokens:")
    for k, v in proposed.items():
        print(f"  {k}: {v}")
    print("\nNR buckets (east):")
    for b in specials["national_rail"].get("buckets", [])[:6]:
        print(f"  {b}")
    print("\nCable-car inactive buckets:")
    for b in specials["cable_car_inactive"].get("buckets", [])[:6]:
        print(f"  {b}")


if __name__ == "__main__":
    main()
