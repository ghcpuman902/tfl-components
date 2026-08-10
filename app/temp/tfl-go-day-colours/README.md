# TfL Go day-mode colour research

Screenshots (day): `IMG_3591.jpg` (east), `IMG_3592.jpg` (central), `IMG_3593.jpg` (west).

```bash
python3 app/temp/tfl-go-day-colours/extract_day_palette.py
```

Outputs:

- `day-palette-results.json` — token matches + specials
- `day-palette-swatches.png` — side-by-side swatches

## Headline findings

| Observation | Hex | Notes |
|---|---|---|
| National Rail | `#D8A0AE` | Pinkish/salmon; not in `brand-colours.ts` |
| Cable car inactive | `#D1D0D3` | Not running → light grey dash |
| Thames | `#C2DEF0` | Pale blue fill |
| Step-free marker | `#EFCE53` | Yellow disc |

Core Tube lines mostly **near** published Issue-4 tokens (ΔE ~8–16 after JPEG). Keep brand tokens as source of truth for authoring; treat Go samples as product/map calibration.

Night mode: next pass with dark screenshots.
