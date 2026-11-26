# Art briefs v2 — layered parallax

Same shared style as `design/art-briefs.md`:
- a soft stylized 3D "toy diorama" look with chunky low-poly rounded shapes and matte materials;
- warm sun from the upper left, and the same palette (meadow green, sky blue, warm brick, fence wood, cream, gold);
- cozy and sleepy in mood;
- **original art only**: no Roblox logos, avatars or third-party characters, and **no text anywhere**.

Output rules:
- WebP, quality ~75, saved into `apps/web/public/art/v2/` with exactly the file names below.
- "transparent" means a real alpha channel with nothing outside the subject.
- Keep every file inside its size budget: re-encode at lower quality or a smaller size if needed.

## Hero parallax — 7 layers, all 2400×1200, SAME camera and horizon, stacked back to front
Every layer except 1 is transparent. Each one must line up when stacked, with the horizon at about 55% height. The left ~40% of layers 3–6 stays low and calm (grass only), so a headline can sit there.

| File | Content | Budget |
|---|---|---|
| `hero-1-sky.webp` | Opaque. A soft sky gradient, light blue (#8FD3F7) at the top to warm cream (#FFF3DA) at the horizon, with a faint sun glow at top right. No clouds. | 60 KB |
| `hero-2-mountains.webp` | Distant blue-green low-poly mountains along the horizon, faded by haze, with two soft clouds resting on the peaks. Transparent above. | 90 KB |
| `hero-3-hills.webp` | Mid-distance rolling grass terraces and soil banks, with a few round trees on the right half. Transparent above the hills. | 110 KB |
| `hero-4-plaza.webp` | The Ranch Hub on the right 55%: a brick plaza with a round fountain and four little stalls (red, blue, gold and green awnings), sitting on the grass. Transparent elsewhere. | 120 KB |
| `hero-5-pens.webp` | The foreground right 60%: wooden-fenced grass pens with a sleeping deer, a sleeping fox and a curled-up cheetah, plus a log stack and a half-chopped tree with a cartoon axe at the far right. Transparent elsewhere. | 120 KB |
| `hero-6-front.webp` | The nearest strip along the bottom 22%: a full-width grassy edge with flowers, small rocks and a short fence piece at the left. Transparent above. | 80 KB |
| `hero-7-griffin.webp` (900×600) | Transparent. A friendly griffin gliding with wings spread, seen side-on. | 50 KB |

## Floating sprites (transparent)
| File | Content | Budget |
|---|---|---|
| `cloud-a.webp` (600×260), `cloud-b.webp` (420×200) | Puffy cream-white low-poly clouds | 25 KB each |
| `zzz.webp` (200×200) | Three stacked "Z z z" shapes in soft lilac, drawn as sculpted 3D shapes (not typed text) | 12 KB |
| `leaf.webp` (120×120) | A single green leaf | 8 KB |

## Biome animal cut-outs (transparent, 700×700, the animal only, sleeping or idle and cute)
Each one pairs with the existing `apps/web/public/art/biome-<slug>.webp` background, and each is 60 KB max.

| File | Animal |
|---|---|
| `animal-grassland.webp` | a sleeping deer |
| `animal-savanna.webp` | a sleeping cheetah |
| `animal-snowland.webp` | a curled-up red panda |
| `animal-desert.webp` | a fennec fox |
| `animal-prehistoric.webp` | a baby triceratops |
| `animal-enchanted.webp` | a glowing violet-blue deer with sparkles |

## Ranch-loop step illustrations (transparent, 320×320, 30 KB max each)
| File | Content |
|---|---|
| `step-sleep.webp` | a chunky toy dart pistol with a little "Z" puff |
| `step-carry.webp` | a sleeping fox held up in two cartoon arms |
| `step-ranch.webp` | a tiny fenced pen with a coin sparkle |
| `step-chop.webp` | an axe in a log with wood chips |
| `step-rebirth.webp` | a glowing golden swirl with stars |

## Pip poses (transparent, 384×384, 45 KB max each)
The same character as `apps/web/public/art/mascot.png`: Pip the fawn ranger with a green bandana and a leaf on one antler nub.

| File | Pose |
|---|---|
| `pip-wave.webp` | waving hello with a big smile |
| `pip-think.webp` | holding a magnifying glass up to one eye, curious |
| `pip-happy.webp` | cheerful, eyes closed in a smile, little sparkle |
| `pip-headset.webp` | wearing a small headset, friendly helpful look |

## Footer strip
`footer-scene.webp`, 2400×320, transparent above: a grass hill edge, a fence, a sleeping pet silhouette and a lantern. 80 KB max.

## Review checklist
- Layers line up when stacked, the horizon is consistent, and the hero's left side is calm.
- Transparent files really are transparent.
- There is no text, and nothing from Roblox or other third parties.
- Every file is within its size budget.
