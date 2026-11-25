[section:world] [chapter:biomes] [images:hosted-world-edit-capture,hosted-snowland-edit-capture]
### Biomes and wildlife › Read the map

The world runs in one direction from the Ranch Hub through six habitats. The brick apron is the hub's edge. Follow the landscape through the next gate to advance. If a gate tells you to rebirth, use the [Rebirth panel](#rebirth) and check the required animal, Cash and Wood. Walking, riding and flight all obey the unlocks.

| Region | Opens | X reference | Weather | Landmark cue |
| --- | --- | --- | --- | --- |
| [Grassland](#grassland) | Start | 556–2,200 | Thunderstorm | Meadows and soil banks |
| [Savanna](#savanna) | Rebirth 1 | 2,200–3,800 | Lightning Storm | Golden grass and rock arches |
| [Snowland](#snowland) | Rebirth 2 | 3,800–5,400 | Blizzard | Snow shelves and pines |
| [Desert](#desert) | Rebirth 3 | 5,400–7,000 | Sandstorm | Sandstone mesas and cacti |
| [Prehistoric](#prehistoric) | Rebirth 4 | 7,000–8,600 | Ancient Storm | Ferns and dinosaur country |
| [Enchanted Grove](#enchanted) | Rebirth 5 | 8,600–10,200 | Magic Storm | Mushrooms and crystals |

The X values above are the server's configured biome checkpoints in studs. Grassland starts at the paved line, **X = 556**. The spacing formula for later gates uses **600 + 1,600 × (biome number − 1)**. Enchanted Grove is the last named region. The broad world boundary extends past its reference interval in places. The side mountains and world bounds constrain travel. Walkable slope is capped at **50°**, and riders ease to a stop near the edge.

### What is in the Ranch Hub?

-   **Weapon Store** sells dart guns and melee tools on separate tabs. The six premium weapon displays around the plaza correspond to the last three guns and last three melee tools.
-   **Food Market** sells pet XP food. **Gear Shop** sells Radars. **Sell Stand** buys animals. Follow the station prompt at the counter.
-   **Top Ranchers** shows ten positions per column for lifetime Cash, lifetime Wood and played time. These are separate from the Cash and Wood balances you can spend.
-   **Feedback** lets you send a short filtered note to the owner. Draft text survives closing the panel during play. The server expects 4–400 bytes of text and at most one accepted note per minute. The hub has a fountain, shopkeepers, lanterns and six surrounding plots.
-   Old archive pictures show named Mystic displays and prices. Use the current crate catalog for Mystic purchases. The hub's current weapon displays are managed separately.

[image:hosted-world-edit-capture]

[image:hosted-snowland-edit-capture]

=====

[section:wildlife] [chapter:biomes] [images:]
### Biomes and wildlife › Spawns, rarity and appearance

Each biome has **12 species** in the same layout of **3 Common, 2 Uncommon, 2 Rare, 2 Epic, 2 Legendary, 1 Mystic**. The ordinary target is **60 wildlife per biome**. A normal refill gives each eligible species its rarity weight. A second selection favors species with fewer examples currently alive in that biome. Epic fills have a cap of **3 per biome**. An unseen portion of the population rotates roughly every 20 seconds, with a larger turnover around dawn and dusk.

| Rarity | Ordinary refill weight per eligible species | How it occurs in the wild | Nominal lifetime |
| --- | ---: | --- | --- |
| Common | 30  | Normal refill | No fixed expiry, can rotate |
| Uncommon | 12  | Normal refill | No fixed expiry, can rotate |
| Rare | 5   | Normal refill | 20 minutes |
| Epic | 1.8 | Normal refill under the Epic cap | 15 minutes |
| Legendary | 0   | Scheduled every 3 server hours plus party specials | 60 minutes, with an extension when attended |
| Mystic | 0   | Scheduled every 6 server hours on a +30-minute offset, one active scheduled Mystic max | 60 minutes, with an extension when attended |

The standard Legendary schedule starts at server age **3:00**. The standard Mystic schedule first comes due at **6:30**, then **12:30**, and so on. The clock belongs to that server. A joining player does not reset it. The standard rolls choose a biome at spawn time and regular notices do not tell players the biome. The HUD rotates the countdowns with **roaming now!** while a rarity is active. After the nominal hour, a Legendary or Mystic stays while a player is within roughly **200 studs** or it has been hit in the last **60 seconds**. A due spawn can miss if it fails to find valid ground. Rewards and crates use their own loot tables.

### Appearance, mutations and individual size

| Trait | Roll | Income | Base speed | Sleep HP |
| --- | --- | --- | --- | --- |
| Normal | 96.05% | ×1  | +0% | ×1  |
| Gold | 3%  | ×3  | +5% | ×1.5 |
| Diamond | 0.8% | ×8  | +10% | ×2.2 |
| Rainbow | 0.15% | ×25 | +15% | ×3.5 |
| Volted | 12% per eligible storm check | ×2  | +5% | ×1.3 |

**Normal** has no extra multiplier and accounts for **96.05%** of ordinary appearance rolls. Gold, Diamond and Rainbow are alternative appearances. Volted is a separate storm mutation and can stack with an appearance. The speed bonuses from appearance and mutation are added together before the body and speed formulas. Cash and Sleep HP multipliers stack by multiplication. A rare **2%** size roll gives a Huge body of **1.35–1.50×**. Other size rolls are clustered near 1.0× and clamped to **0.75–1.35×**. Individual wild weight also rolls around **0.90–1.10×**. A large or variant catch can need noticeably more darts than its roster baseline.

=====

[section:weather] [chapter:biomes] [images:ranch-v7-tutorial-day,ranch-v7-night]
### Biomes and wildlife › Day, night, storms and parties

The game clock starts with the server. Check the day or night counter when planning a catch or waiting for recovery.

-   A full day/night cycle runs **10 minutes** per animal year. Day lasts 7 minutes and night lasts 3. Night shrinks wildlife detection to 75% and speeds ranch recovery to 10×.
-   At most one biome has an active storm. The first storm starts after roughly 4–9 minutes. Later gaps are 8–18 minutes and storms last 3–5 minutes. The weather tile names the active habitat.
-   **Volted** has a 12% chance on an eligible new wild spawn in a storm, with additional 12% checks about once per minute on existing eligible awake wildlife. Already-mutated animals keep their mutation. Recovery and carry times are separate mechanics.
-   An owner-started **Admin Abuse Party** is announced in that server. Its active modifiers are **2× ranch Cash**, a **50% higher population target** and extra Legendary chances. Its first extra spawn is due shortly after the party starts and then about every 15 minutes. The generic event list in the reviewed world module is empty.

**Recovery example.** Two minutes of remaining recovery work takes about 12 seconds in a stable night window. With the permanent recovery perk it takes about 3 seconds. A switch back to day rescales the remaining time. Hunts still use the separate carry clock.

[image:ranch-v7-tutorial-day]

[image:ranch-v7-night]

=====

[section:grassland] [chapter:biomes] [images:overhaul-overview]
### Biomes and wildlife › Grassland

**Open to everyone.** Meadows, broadleaf trees and grass-topped rock or soil terraces lead out from the hub. Start close to the brick edge. Use ordinary deer, foxes and boars to learn the shortest return route. The rare mounts Bison and Moose are a good step up for your first long trips. Griffin is a flying Mystic.

[image:overhaul-overview]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deer | Common | Timid | 60  | 26  | 3   | $6  | $600 | 2m  | 54.8 |
| Fox | Common | Timid | 7   | 26  | 3   | $6  | $600 | 2m  | 54.8 |
| Boar | Common | Alert | 90  | 26  | 3   | $6  | $600 | 2m  | 54.8 |
| Addax | Uncommon | Timid | 100 | 42  | 5   | $10.5 | $1,050 | 3m 19s | 58.1 |
| Horse | Uncommon | Timid | 450 | 42  | 5   | $10.5 | $1,050 | 3m 19s | 58.1 |
| Bison | Rare | Alert | 800 | 66  | 7   | $18.38 | $1,837 | 5m 31s | 61.6 |
| Moose | Rare | Alert | 550 | 66  | 7   | $18.38 | $1,837 | 5m 31s | 61.6 |
| Bear | Epic | Aggressive | 300 | 102 | 11  | $32.16 | $3,215 | 9m 10s | 65.3 |
| Tiger | Epic | Aggressive | 220 | 102 | 11  | $32.16 | $3,215 | 9m 10s | 65.3 |
| Unicorn | Legendary | Alert | 500 | 162 | 17  | $95.3 | $9,529 | 15m 14s | 130.7 |
| Kirin | Legendary | Aggressive | 520 | 162 | 17  | $95.3 | $9,529 | 15m 14s | 130.7 |
| Griffin Fly | Mystic | Aggressive | 700 | 255 | 26  | $166.77 | $16,677 | 25m 18s | 137.3 |

Dart Pistol is the biome’s entry benchmark at 10 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-grassland).

=====

[section:savanna] [chapter:biomes] [images:p2-savanna-play-client]
### Biomes and wildlife › Savanna

**Opens at Rebirth 1.** Gold grass, flat-canopy trees, terracotta ledges and rock arches make it easy to recognize. Cheetah and Giraffe are its two Rare entries. Cerberus is a ground Mystic. Reference trees are tougher than the Grassland's, so bring a tool with more Tree DMG.

[image:p2-savanna-play-client]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zebra | Common | Timid | 350 | 44.2 | 3   | $15 | $1,500 | 2m 35s | 95.4 |
| Ostrich | Common | Timid | 120 | 44.2 | 3   | $15 | $1,500 | 2m 35s | 95.4 |
| Hedgehog | Common | Alert | 15  | 44.2 | 3   | $15 | $1,500 | 2m 35s | 95.4 |
| Hyena | Uncommon | Alert | 60  | 71.4 | 5   | $26.25 | $2,625 | 4m 17s | 101 |
| Wildebeest | Uncommon | Timid | 250 | 71.4 | 5   | $26.25 | $2,625 | 4m 17s | 101 |
| Cheetah | Rare | Timid | 55  | 112.2 | 7   | $45.94 | $4,593 | 7m 7s | 106.7 |
| Giraffe | Rare | Alert | 1,000 | 112.2 | 7   | $45.94 | $4,593 | 7m 7s | 106.7 |
| Hippopotamus | Epic | Aggressive | 2,200 | 173.4 | 11  | $80.39 | $8,039 | 11m 49s | 112.6 |
| Crocodile | Epic | Aggressive | 500 | 173.4 | 11  | $80.39 | $8,039 | 11m 49s | 112.6 |
| Lion | Legendary | Aggressive | 190 | 275.4 | 17  | $214.42 | $21,442 | 19m 38s | 135.1 |
| Elephant | Legendary | Aggressive | 5,500 | 275.4 | 17  | $214.42 | $21,442 | 19m 38s | 135.1 |
| Cerberus | Mystic | Aggressive | 900 | 433.5 | 26  | $375.24 | $37,524 | 32m 37s | 141.7 |

Brush Revolver is the biome’s entry benchmark at 17 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-savanna).

=====

[section:snowland] [chapter:biomes] [images:p2-snowland-play-client]
### Biomes and wildlife › Snowland

**Opens at Rebirth 2.** Look for snow-capped rock, icy terraces and conifers. The roster has small Common animals, two aggressive Epics and two very different Legendary bodies, Woolly Mammoth and Ice Tortoise. Yeti is the ground Mystic.

[image:p2-snowland-play-client]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Red Panda | Common | Timid | 8   | 72.8 | 3   | $37.5 | $3,750 | 3m 19s | 102.8 |
| Snow Monkey | Common | Timid | 12  | 72.8 | 3   | $37.5 | $3,750 | 3m 19s | 102.8 |
| Mountain Goat | Common | Alert | 100 | 72.8 | 3   | $37.5 | $3,750 | 3m 19s | 102.8 |
| Arctic Wolf | Uncommon | Aggressive | 50  | 117.6 | 5   | $65.62 | $6,562 | 5m 31s | 108.5 |
| Yak | Uncommon | Alert | 550 | 117.6 | 5   | $65.62 | $6,562 | 5m 31s | 108.5 |
| Wolverine | Rare | Aggressive | 20  | 184.8 | 7   | $114.84 | $11,484 | 9m 10s | 114.5 |
| Snow Leopard | Rare | Alert | 55  | 184.8 | 7   | $114.84 | $11,484 | 9m 10s | 114.5 |
| Polar Bear | Epic | Aggressive | 450 | 285.6 | 11  | $200.98 | $20,097 | 15m 14s | 120.6 |
| Woolly Rhino | Epic | Aggressive | 2,500 | 285.6 | 11  | $200.98 | $20,097 | 15m 14s | 120.6 |
| Woolly Mammoth | Legendary | Aggressive | 6,000 | 453.6 | 17  | $482.45 | $48,245 | 25m 18s | 139.6 |
| Ice Tortoise | Legendary | Alert | 900 | 453.6 | 17  | $482.45 | $48,245 | 25m 18s | 139.6 |
| Yeti | Mystic | Aggressive | 400 | 714 | 26  | $844.29 | $84,429 | 42m 2s | 146.3 |

Prairie Carbine is the biome’s entry benchmark at 28 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-snowland).

=====

[section:desert] [chapter:biomes] [images:p2-desert-play-client]
### Biomes and wildlife › Desert

**Opens at Rebirth 3.** Sand, layered mesas, spires, cactus and dead trees distinguish this habitat. Desert cactus and dead trees in the logging system count as chop targets. Ammit and Chimera are Legendary. Sand Dragon is its flying Mystic.

[image:p2-desert-play-client]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mouse | Common | Timid | 3   | 122.2 | 3   | $93.75 | $9,375 | 4m 17s | 110.4 |
| Rabbit | Common | Timid | 4   | 122.2 | 3   | $93.75 | $9,375 | 4m 17s | 110.4 |
| Fennec Fox | Common | Timid | 2   | 122.2 | 3   | $93.75 | $9,375 | 4m 17s | 110.4 |
| Sand Cat | Uncommon | Alert | 3   | 197.4 | 5   | $164.06 | $16,406 | 7m 7s | 116.4 |
| Tarantula | Uncommon | Alert | 1   | 197.4 | 5   | $164.06 | $16,406 | 7m 7s | 116.4 |
| Caracal | Rare | Alert | 18  | 310.2 | 7   | $287.11 | $28,710 | 11m 49s | 122.6 |
| Bighorn Ram | Rare | Alert | 130 | 310.2 | 7   | $287.11 | $28,710 | 11m 49s | 122.6 |
| Camel | Epic | Alert | 600 | 479.4 | 11  | $502.44 | $50,244 | 19m 38s | 128.9 |
| Kangaroo | Epic | Alert | 85  | 479.4 | 11  | $502.44 | $50,244 | 19m 38s | 128.9 |
| Ammit | Legendary | Aggressive | 700 | 761.4 | 17  | $1,085.52 | $108,552 | 32m 37s | 144.1 |
| Chimera | Legendary | Aggressive | 800 | 761.4 | 17  | $1,085.52 | $108,552 | 32m 37s | 144.1 |
| Sand Dragon Fly | Mystic | Aggressive | 3,000 | 1,198.5 | 26  | $1,899.66 | $189,966 | 54m 11s | 150.9 |

Savanna Marksman is the biome’s entry benchmark at 47 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-desert).

=====

[section:prehistoric] [chapter:biomes] [images:p2-prehistoric-play-client]
### Biomes and wildlife › Prehistoric

**Opens at Rebirth 4.** Ferns, broad rock shelves and tall vegetation surround the dinosaur roster. Even Common and Uncommon species can be very heavy. Keep the weight-based carry slowdown in mind. Spinosaurus and Tyrannosaurus Rex are Legendary. Dragon is the flying Mystic.

[image:p2-prehistoric-play-client]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Velociraptor | Common | Alert | 15  | 202.8 | 3   | $234.38 | $23,437 | 5m 31s | 118.4 |
| Pachycephalosaurus | Common | Alert | 450 | 202.8 | 3   | $234.38 | $23,437 | 5m 31s | 118.4 |
| Iguanodon | Common | Timid | 3,000 | 202.8 | 3   | $234.38 | $23,437 | 5m 31s | 118.4 |
| Parasaurolophus | Uncommon | Timid | 2,500 | 327.6 | 5   | $410.16 | $41,015 | 9m 10s | 124.6 |
| Stegosaurus | Uncommon | Alert | 5,000 | 327.6 | 5   | $410.16 | $41,015 | 9m 10s | 124.6 |
| Ankylosaurus | Rare | Alert | 6,000 | 514.8 | 7   | $717.77 | $71,777 | 15m 14s | 131 |
| Triceratops | Rare | Aggressive | 9,000 | 514.8 | 7   | $717.77 | $71,777 | 15m 14s | 131 |
| Therizinosaurus | Epic | Aggressive | 5,000 | 795.6 | 11  | $1,256.1 | $125,610 | 25m 18s | 137.6 |
| Brachiosaurus | Epic | Alert | 40,000 | 795.6 | 11  | $1,256.1 | $125,610 | 25m 18s | 137.6 |
| Spinosaurus | Legendary | Aggressive | 7,000 | 1,263.6 | 17  | $2,442.42 | $244,242 | 42m 2s | 148.7 |
| Tyrannosaurus Rex | Legendary | Aggressive | 8,000 | 1,263.6 | 17  | $2,442.42 | $244,242 | 42m 2s | 148.7 |
| Dragon Fly | Mystic | Aggressive | 4,000 | 1,989 | 26  | $4,274.24 | $427,424 | 1h 9m 50s | 155.6 |

Glacier Sniper is the biome’s entry benchmark at 78 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-prehistoric).

=====

[section:enchanted] [chapter:biomes] [images:p2-enchanted-play-client]
### Biomes and wildlife › Enchanted Grove

**Opens at Rebirth 5.** Purple and blue vegetation, mushrooms and crystals distinguish the final habitat. Violet Wyvern is the flying Mystic. The names in this chapter use the current displayed names. Some project files and older screenshots refer to earlier internal model names.

[image:p2-enchanted-play-client]

| Species | Rarity | Temper | kg  | Sleep HP | Hits | Cash/s | Sale | Recovery | Ride |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Glimmer Deer | Common | Timid | 200 | 340.6 | 3   | $585.94 | $58,593 | 7m 7s | 126.7 |
| Duskwolf | Common | Alert | 60  | 340.6 | 3   | $585.94 | $58,593 | 7m 7s | 126.7 |
| Spinecat | Common | Alert | 120 | 340.6 | 3   | $585.94 | $58,593 | 7m 7s | 126.7 |
| Mossback | Uncommon | Timid | 800 | 550.2 | 5   | $1,025.39 | $102,539 | 11m 49s | 133.1 |
| Tuskhorn | Uncommon | Alert | 1,500 | 550.2 | 5   | $1,025.39 | $102,539 | 11m 49s | 133.1 |
| Glowmane | Rare | Timid | 700 | 864.6 | 7   | $1,794.43 | $179,443 | 19m 38s | 139.7 |
| Featherscale | Rare | Alert | 600 | 864.6 | 7   | $1,794.43 | $179,443 | 19m 38s | 139.7 |
| Thunder Bison | Epic | Alert | 2,000 | 1,336.2 | 11  | $3,140.26 | $314,025 | 32m 37s | 146.4 |
| Hammerhorn | Epic | Aggressive | 3,000 | 1,336.2 | 11  | $3,140.26 | $314,025 | 32m 37s | 146.4 |
| Shadowfang | Legendary | Aggressive | 900 | 2,122.2 | 17  | $5,495.45 | $549,545 | 54m 11s | 153.3 |
| Astraeus | Legendary | Alert | 600 | 2,122.2 | 17  | $5,495.45 | $549,545 | 54m 11s | 153.3 |
| Violet Wyvern Fly | Mystic | Aggressive | 1,200 | 3,340.5 | 26  | $9,617.04 | $961,704 | 1h 30m | 160.3 |

Fossil Hunter is the biome’s entry benchmark at 131 Sleep DMG. Hits use that base gun. Recovery is daytime base work. Cash/s is awake placed income before additional boosts. Sale assumes a 1.0 weight roll. Ride is nominal ground speed in studs/s before upgrades or perks.

[See all 12 original model pictures](#rig-enchanted).