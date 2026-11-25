# Art briefs v3 — sharp 3D-cartoon parallax set (Claude → Codex)

Owner feedback on v2: the images are blurry, the step icons look like plastic toys and do not match each other, the plaza covers a tree and floats, the animals float, and the footer strip has a background box whose colour does not match.

## Shared style (every file)
- **3D cartoon**, like a modern animated film: soft rounded forms, smooth stylised shading, gentle rim light, warm sun from the upper left. Match Pip the fawn (`apps/web/public/art/mascot.png`, attached).
- **Not** plastic, not a toy, not low-poly, not a photo. No text, logos, Roblox avatars or third-party characters.
- Palette: meadow `#3FA34D` / `#2E7D3A`, sky `#8FD3F7` → cream `#FFF3DA` at the horizon, brick `#D9917A`, wood `#8A5A3B`, gold `#FFC93C`.
- **Sharp:** generate at (or above) the listed size, never upscale. Save WebP at quality 90 with a real alpha channel. Crisp silhouettes, no haze around cut-out edges and no halos.
- Save into `apps/web/public/art/v3/` with exactly these names. Overwrite nothing outside that folder.

## Hero parallax layers (one camera, horizon at about 52% of 2400×1400; stacked back to front)
Every terrain piece **continues down to its bottom edge, fully opaque there**, so scrolling never shows where it ends.

| File | Size | Content |
|---|---|---|
| `sky.webp` | 2400×1400, opaque | Smooth sky gradient, `#8FD3F7` at the top to `#FFF3DA` at the horizon, soft sun glow at upper left. No clouds. |
| `mountains.webp` | 2400×1000, transparent above | Distant soft rounded cartoon mountains and mesas with light haze, blue-green; their base blends into a soft meadow green that fills to the bottom edge. |
| `meadow.webp` | 2400×900, transparent above | Gently rolling open meadow in the middle distance, rounded grassy swells, a few small round bushes. Opaque grass fills to the bottom. Keep the left 45% calm. |
| `left-cliff.webp` | 900×1800, transparent | A tall grassy rock ledge on the left edge of the frame: rounded rock layers with grass caps, two round trees on top. The rock continues straight down to the bottom edge. The right side of the piece is a natural irregular edge. |
| `left-front.webp` | 700×1600, transparent | A nearer left foreground pillar: rounded mossy boulder with a leafy bush and a short wooden fence piece on top, rock continuing to the bottom edge. |
| `right-cliff.webp` | 1200×1900, transparent | A tall stepped terrace on the right edge: grassy rock steps; **on the top step**, a small brick plaza with a round fountain and four little market stalls (red, blue, gold, green awnings) sitting firmly on the ground, with a big round tree **behind** the stalls (not covered). The rock continues down to the bottom edge. |
| `right-front.webp` | 900×1700, transparent | A nearer right foreground mound: a stack of logs and a half-chopped tree stump with a cartoon axe on a grassy rock, continuing to the bottom edge. |
| `ground.webp` | 2400×800, transparent above | The nearest full-width grass bank with clover, small flowers and pebbles, gently curved top edge, **opaque to the bottom edge**. At centre-right, a soft flattened grassy hollow where animals can lie. |

## Sprites (transparent)
| File | Size | Content |
|---|---|---|
| `animal-deer.webp`, `animal-fox.webp`, `animal-cheetah.webp` | 900×700 | One cute animal curled up asleep, viewed from a slight elevation, **with a soft oval contact shadow on the ground under it** so it sits on grass. |
| `zzz.webp` | 300×300 | Three stacked "Z" shapes, soft lilac 3D cartoon (shapes, not typed text). |
| `cloud-1.webp`, `cloud-2.webp`, `cloud-3.webp` | 900×420 | Soft fluffy cartoon clouds, three different shapes. |
| `leaf-1.webp`, `leaf-2.webp` | 200×200 | A single leaf, one green and one yellow-green. |

## Ranch-loop steps (transparent, 600×600, one matching set — same lens, light, outline weight and level of detail)
`step-sleep.webp` (a chunky cartoon dart pistol with a little sleepy "Z" puff), `step-carry.webp` (Pip-style cartoon arms holding a sleeping fox), `step-ranch.webp` (a small fenced grassy pen with a gold coin sparkle), `step-chop.webp` (an axe in a log with wood chips), `step-rebirth.webp` (a glowing golden swirl with stars).

## Footer
`footer-scene.webp`, 2400×420, transparent above: a grass hill silhouette with a sleeping deer and a glowing lantern. **The bottom 20% is solid flat `#145020`** (the footer colour) edge to edge, so it joins the footer with no box or seam.

## Checks before returning
Open every file, confirm the alpha really is transparent, the size matches, edges are crisp, and terrain reaches its bottom edge opaque. Reply with the list of files written and anything you could not make.

## v3.1 — one continuous foreground for the scroll-scrubbed hero transition
The same foreground layer is shown in both sections: its top edge sits along the bottom of the hero, then it rises and its lower portion becomes the background behind the next section (a heading on the left, a video on the right).

| File | Size | Content |
|---|---|---|
| `foreground-tall.webp` | 2400×2800, transparent above the top edge | **Top edge at 6–9% from the top:** a gently curved grassy bank lip with clover, small flowers and pebbles, same look as `ground.webp`. At centre-right (x 55–75%, just below the lip) a soft flattened grassy hollow where two animals can lie. **Below the lip:** one continuous lush meadow seen from slightly above, getting calmer as it goes down: soft rolling grass, a few tiny flowers, very low detail from 25% to 85% so text and a video can sit on top and stay readable. **Bottom 15%:** blends smoothly into solid cream `#FFF8EC` edge to edge; the last 3% exactly `#FFF8EC`. Opaque everywhere below the lip. |

Same 3D-cartoon style and light as the rest of v3, WebP quality 90, sharp, no upscaling.

## v3.2 — biome band, more animals, footer fix, Pip head
Same 3D-cartoon style, light and quality rules as the rest of v3 (sharp, WebP quality 90, real alpha). Save into `apps/web/public/art/v3/`.

| File | Size | Content |
|---|---|---|
| `biomes-back.webp` | 3600×1100, transparent above the scenery | One wide panorama of distant scenery that blends smoothly left → right through six biomes: green grassland hills, golden savanna mesas with acacia trees, snowy peaks, sand dunes, a prehistoric valley with a gentle volcano and giant ferns, an enchanted forest with glowing violet trees. Soft, hazy, no hard borders between biomes. Opaque from about 60% height down to the bottom. |
| `biomes-ground.webp` | 3600×700, transparent above the top edge | The nearest ground strip, blending left → right through the same six biomes: lush grass, dry golden grass, snow, sand, mossy jungle floor with ferns, soft violet-glow grass. Gently curved top edge, opaque to the bottom edge. Each sixth has a flattened spot near its centre where one animal can lie. |
| `animal-redpanda.webp`, `animal-fennec.webp`, `animal-triceratops.webp`, `animal-glimmerdeer.webp` | 900×700 each | Matching the existing `animal-deer.webp` / `animal-cheetah.webp`: one cute animal curled up asleep, slight elevation, soft oval contact shadow under it. Red panda; fennec fox; baby triceratops; a glowing violet-blue deer with a few sparkles. |
| `footer-scene.webp` (replace) | 2400×420, transparent above the hill | A grass hill crest with a sleeping deer and a glowing lantern. **The hill's grass shades smoothly darker toward the bottom** (evening light) so it reaches exactly `#145020` over the bottom 12% with **no visible line or band** — it must read as one picture. |
| `pip-head.webp` | 512×512, transparent | Pip the fawn (same character as `mascot.png`): a front-facing head-and-neck portrait, centred, ears and leaf included, filling about 88% of the frame, friendly smile. For a round avatar. |
