# TfL Go night-mode colour research

Source: `tfl-go-night.png` (4004×2135).

```bash
python3 app/temp/tfl-go-night-colours/extract_night_palette.py
```

Compares against day results in `../tfl-go-day-colours/day-palette-results.json`.

## Headline

| Role | Night hex | Notes |
|---|---|---|
| **Map background** | `#2C2C32` | Cool charcoal — **not** `#000000` |
| Victoria core | `#54ACFC` | Clearly +S / +V vs day |
| Central core | `#D83C30` | Brighter + more saturated |
| H&C core | `#F490AC` | Hot pink pops harder |
| Circle core | `#FCD84C` | Punchy yellow |
| Piccadilly | `#2A437C` | Lifted mid-navy (brand `#0019A8` too dark on charcoal) |
| Northern | `#000` + `#FCFCFC` | Black fill + white outline/labels |
| National Rail | `#946070` | Still pinkish; darker than day `#D8A0AE` |
| Thames | `#343438` / `#47494D` | Dark slate, slightly above paper |

Perception: lines feel brighter/more saturated largely because charcoal paper raises contrast; absolute +S/+V is strongest on Victoria, Central, H&C, Circle.
