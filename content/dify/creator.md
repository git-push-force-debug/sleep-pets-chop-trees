[section:about] [chapter:creator] [images:]
### Creator reference › Source of truth and verification

### Reviewed build

-   Source came from the open version **260** Studio place. The inventory indicated streaming on, six placed plot pads, six biome template packs, 72 animal templates, 15 dart gun templates, 13 melee templates and 12 décor templates.
-   The study inventoried **569 Luau containers** across the inspected services and copied **101 gameplay, UI and world-generation source units** into a private working folder. Many of the remaining containers are asset metadata or placement data. The place scripts were read in place, then analyzed on local copies.
-   The catalogs use **ReplicatedStorage.WR.Config**, **WR.Species** and **WR.Calc**. The shared number tables were evaluated locally in Luau, with minimal stand-ins for Roblox data types. The shipped mathematical assertions executed. The generator also checked the exact 72/15/13 counts, one local rig and picture per species, 30 daily rewards, and seven crate probability totals.
-   A brief local Studio run reached server **GameReady / READY** and the client created its game HUD. The only image taken in that run and used here is the loading screen. Studio was already closed when the stop request reached it. This review did not reopen or restart Studio after that point. Local project images supply the gameplay and model pictures in this guide.
-   Full end-to-end play, concurrent competition and ride-along, physical mobile and controller behavior, hosted file delivery, saved progress and real Roblox purchases were not exercised on this build. Current instructions for those mechanics come from the source paths below.

### What can be older than the current build?

The networked game boots from **WRServer.Main** and its **WR** shared tables. The place still has some **Wildshot** helpers used by movement and visual presentation, legacy shared configuration, builds in ServerStorage and archived models. Use the current entry-point dependencies for balance and feature availability. Some source comments and archived screens still say “free” for tutorial purchases, show shorter rare timers, show Auto Aim, or have an E prompt for dismount. Version 260's active paths win those discrepancies.

### Support evidence to request

For loading or save incidents, record the build, exact message, rough time and whether the player made it into a server. For capture, include biome, gun, target and whether there was a clear line of sight. For paid products, record the product and Roblox purchase reference through a private support channel. The public feedback text is filtered and intended for short notes.

=====

[section:architecture] [chapter:creator] [images:]
### Creator reference › How the game is wired

| Responsibility | Studio source names | What it owns |
| --- | --- | --- |
| Start and prepare assets | `WRServer.Main`, `WorldBuild`, `GunBuild`, `HubBuild`, `WRLoading` | Boot states, saved world and weapon validation, interaction prompts and readiness. |
| Shared balance | `WR.Config`, `WR.Species`, `WR.Calc` | Active catalogs, stats, pricing and rules shared between server and display. |
| Wildlife and captures | `World`, `Wildlife`, `Session`, `Rig` | Cycle, storms, ordinary and scheduled animals, sedation, carry, ownership and income. |
| Ranch and mounts | `Ranch`, `Enclosure`, `Riding`, client `Mount` and `Animals` | Plot assignment, pet state, poses, flight, passengers, placement and décor. |
| Lumber and knockback | `Chop`, `Melee`, `Ragdoll` | Eligible swings, damage to trees, shared wood, regrowth, knocks and immunity. |
| Store and social | `Shop`, `Market`, `Purchases`, `Store`, `Social`, `Rewards` | Market purchases, crates, Robux receipts, gifts, leaderboards, invites and reward claims. |
| Player interface | `WRClient.Hud`, `Panels`, `PanelsAnimals`, `PanelsMeta`, `PanelsShops` | Hotbar, scope controls, cash/wood, selection, maps, rewards and settings. |
| Persistence and communication | `Data`, `Net`, `Tutorial`, `Admin` | Live profile leases, validated and throttled gameplay requests, welcome checkpoints and feedback. |

### Startup and visuals

The server first validates the permanent weapon templates and the saved terrain/world assets against a hosted release manifest. It preserves the saved layout and creates interaction extras where needed. The runtime systems then start and load player profiles. The loading client watches world and player readiness, gives optional asset preload progress, and can show a retry or rejoin message if required startup fails. The server follows the saved asset paths rather than generating the whole place every join.

The active world presentation uses biome and time-of-day lighting and music, transition effects, local weather, player and pet animation, and replicated hit and recovery cues. The Animal Rig Lab template is wrapped in a gameplay rig with a collision body so the source visual can animate. The HUD draws temporary notifications, sedate bars, rarity highlights, radar cues, carrying VFX and reward animations. Viewports reuse game models for pet and equipment cards. The user can tone down sound, effects, shake, flash and labels. There is a separate preference for Auto Chop.

=====

[section:persistence] [chapter:creator] [images:]
### Creator reference › Saves, receipts and compatibility

The live profile has a server lease, periodic autosave, release and shutdown handling. The source autosaves roughly every **60 seconds** and uses a **30-minute** stale-lease threshold. Active lease or load trouble can block a join rather than create a new replacement profile. Captures, sales and confirmed rewards have prompt save paths. Studio play uses temporary profiles. The current save reader repairs only affected fields where possible, keeping unknown legacy data for recovery.

A profile covers wallets and lifetime counters, tutorial, rebirth stage and requirement, weapons and individual upgrades, animals and placements, decorations, Bag and hotbar, Index discoveries, rewards, radar and food inventory, social claims, settings, perks, gifts, receipt ledger and per-crate pity. The board uses separate ordered totals for lifetime Cash, lifetime Wood and played time. The Wood column’s lifetime total can include qualifying Wood rewards and paid packs as well as chopped Wood. An open carry and current world wildlife belong to the session.

Developer products use one receipt dispatcher. The server verifies configured prices for UI visibility, tracks purchase IDs, saves a grant before acknowledging a live receipt where the normal path succeeds, and retries unavailable profiles or saves. Gift redemption has a recipient queue. Some products remember their immediate target in session state. For example, a late Wake Now receipt can choose the longest remaining placed recovery if its original target is unavailable. Verify late and cancel cases when testing monetization.

### Compatibility details

-   Old global darts and retired sharpening had migration/refund logic. Earlier gun and melee inventories use tier remaps. The active player path is per item.
-   An older Phoenix pet is mapped to Sand Dragon. Phoenix is not in the version 260 roster, and the archive still contains Phoenix assets.
-   Enchanted display names were updated while keeping the old IDs so owned pets, model lookup and crate entries stay associated.
-   The owner panel contains private test and live-event controls. Ordinary players use the published player UI. The feedback inbox, owner QA and admin actions have separate owner checks.

=====

[section:formulas] [chapter:creator] [images:]
### Creator reference › Reference math and timings

| Quantity | How the reviewed game computes it |
| --- | --- |
| Wild sleep threshold | Reference entry gun's power × rarity coefficient (2.6, 4.2, 6.6, 10.2, 16.2 or 25.5) × capture size^1.5 × applicable appearance and mutation HP factors. |
| Hits to sleep | Smallest whole number of landed hits whose total Sleep DMG meets the threshold. A Normal size-1 animal takes 3, 5, 7, 11, 17 or 26 hits at its biome's entry gun base power. |
| Wake clock | 4 sec + distance / (reference travel pace × carry speed factor) × margin. Margin starts at 1.14, then drops by 0.008 per rarity step and 0.01 per special appearance step. |
| Carry speed factor | 0.97 at normal relative weight, then about 0.073 less per doubling above normal, bounded at 0.75. Subsequent travel pace includes the current mount or walking speed. |
| Base passive Cash/s | 5 × habitat income ladder × 1.75^rarity step × capture size^1.5 × (1 + 1.5 × growth) × trait income × Earn stat multiplier. Ordinary habitat step is 2.5×. Legendary/Mystic are anchored at the last biome and step back at 2.25×. |
| Effective kg | Species kg × drawn size^3 × individual weight factor. The physics rig can have its own species-scale adjustments. |
| Recovery base seconds | Round(120 × 45^((biome index − 1 + 2 × rarity step) ÷ 15)). Divide remaining work by the active 1×, 4×, 10× or 40× rate to estimate the visible timer. |
| Growth fraction | Capped at 1. Combines natural growth ((age rounded down to 10-year step) / 2,000)^0.8, legacy food growth and 0.01 per Size point. |
| Rarity / weapon ordering | Rarity step is 0 for Common through 5 for Mystic. Entry guns for biomes 1–6 are tiers 1, 3, 5, 7, 9 and 11. Upgraded power is quantized to 1/256. |
| Index claim | The greater of the configured floor and full-rate eligible ranch income × 60 × (3 + the smaller of milestone number and 9). |

The tables use current calculations for the ordinary baseline. Visual pose, individual size, variant, clock and equipped stats can change what the player sees. Travel distance here is planar distance from pickup to the enclosure center. The actual safe line stops the carry earlier than the center when you approach it normally.

=====

[section:index-reference] [chapter:creator] [images:]
### Creator reference › Index milestones and internal names

| Species | Base claim floor | Or minutes of eligible ranch income |
| --- | --- | --- |
| 4   | $15,000 | 4   |
| 8   | $150,000 | 5   |
| 12  | $2,000,000 | 6   |
| 16  | $15,000,000 | 7   |
| 20  | $47,000,000 | 8   |
| 24  | $47,000,000 | 9   |
| 28  | $47,000,000 | 10  |
| 32  | $47,000,000 | 11  |
| 36  | $47,000,000 | 12  |
| 40  | $47,000,000 | 12  |
| 44  | $47,000,000 | 12  |
| 48  | $47,000,000 | 12  |
| 52  | $47,000,000 | 12  |
| 56  | $47,000,000 | 12  |
| 60  | $47,000,000 | 12  |
| 64  | $47,000,000 | 12  |
| 68  | $47,000,000 | 12  |
| 72  | $47,000,000 | 12  |

### Current visible Enchanted names and saved IDs

| Displayed name | Saved / template ID |
| --- | --- |
| Glimmer Deer | `Hexapede` |
| Duskwolf | `Viperwolf` |
| Spinecat | `Nexu` |
| Mossback | `Dewback` |
| Tuskhorn | `Reek` |
| Glowmane | `Direhorse` |
| Featherscale | `Varactyl` |
| Thunder Bison | `Sturmbeest` |
| Hammerhorn | `Hammerhead` |
| Shadowfang | `Thanator` |
| Violet Wyvern | `GreatLeonopteryx` |

=====

[section:price-index] [chapter:creator] [images:]
### Creator reference › Dart upgrades by level, tiers 1–8

These are the prices of each successive point on any one track. Each sequence starts at the first level in the bold range and proceeds in order. Costs are the same across the four tracks for a given gun and level.

| Equipment | Target level → price of that next point |
| --- | --- |
| 1\. Dart Pistol | **1–5** $540 · $850 · $1,000 · $2,000 · $3,000 |
| 2\. Ranger Pistol | **1–5** $920 · $980 · $990 · $1,000 · $2,000**6–8** $3,000 · $4,000 · $6,000 |
| 3\. Brush Revolver | **1–5** $3,000 · $4,000 · $5,000 · $6,000 · $8,000**6–10** $9,000 · $11,000 · $14,000 · $17,000 · $21,000 |
| 4\. Tracker Carbine | **1–5** $13,000 · $15,000 · $18,000 · $21,000 · $25,000**6–10** $29,000 · $34,000 · $40,000 · $47,000 · $56,000**11–12** $65,000 · $77,000 |
| 5\. Prairie Carbine | **1–5** $48,000 · $55,000 · $63,000 · $73,000 · $83,000**6–10** $96,000 · $110,000 · $130,000 · $140,000 · $170,000**11–14** $190,000 · $220,000 · $250,000 · $290,000 |
| 6\. Safari Rifle | **1–5** $180,000 · $200,000 · $230,000 · $260,000 · $290,000**6–10** $330,000 · $370,000 · $410,000 · $470,000 · $530,000**11–15** $590,000 · $670,000 · $750,000 · $850,000 · $960,000**16–16** $1,000,000 |
| 7\. Savanna Marksman | **1–5** $670,000 · $750,000 · $830,000 · $890,000 · $900,000**6–10** $910,000 · $920,000 · $930,000 · $940,000 · $950,000**11–15** $960,000 · $970,000 · $980,000 · $990,000 · $1,000,000**16–18** $2,000,000 · $3,000,000 · $4,000,000 |
| 8\. Storm Repeater | **1–5** $940,000 · $950,000 · $960,000 · $970,000 · $980,000**6–10** $990,000 · $1,000,000 · $2,000,000 · $3,000,000 · $4,000,000**11–15** $5,000,000 · $6,000,000 · $7,000,000 · $8,000,000 · $9,000,000**16–20** $10,000,000 · $11,000,000 · $12,000,000 · $14,000,000 · $15,000,000 |

=====

[section:gun-upgrade-prices-late] [chapter:creator] [images:]
### Creator reference › Dart upgrades by level, tiers 9–15

| Equipment | Target level → price of that next point |
| --- | --- |
| 9\. Glacier Sniper | **1–5** $9,000,000 · $10,000,000 · $11,000,000 · $12,000,000 · $13,000,000**6–10** $14,000,000 · $16,000,000 · $17,000,000 · $19,000,000 · $20,000,000**11–15** $22,000,000 · $24,000,000 · $26,000,000 · $28,000,000 · $31,000,000**16–20** $34,000,000 · $37,000,000 · $40,000,000 · $44,000,000 · $48,000,000**21–22** $52,000,000 · $56,000,000 |
| 10\. Dune Longshot | **1–5** $35,000,000 · $38,000,000 · $41,000,000 · $44,000,000 · $48,000,000**6–10** $52,000,000 · $56,000,000 · $61,000,000 · $66,000,000 · $71,000,000**11–15** $77,000,000 · $83,000,000 · $90,000,000 · $97,000,000 · $100,000,000**16–20** $110,000,000 · $120,000,000 · $130,000,000 · $140,000,000 · $150,000,000**21–24** $170,000,000 · $180,000,000 · $200,000,000 · $210,000,000 |
| 11\. Fossil Hunter | **1–5** $130,000,000 · $140,000,000 · $150,000,000 · $160,000,000 · $180,000,000**6–10** $190,000,000 · $200,000,000 · $220,000,000 · $230,000,000 · $250,000,000**11–15** $270,000,000 · $290,000,000 · $310,000,000 · $330,000,000 · $360,000,000**16–20** $390,000,000 · $410,000,000 · $440,000,000 · $480,000,000 · $510,000,000**21–25** $550,000,000 · $590,000,000 · $640,000,000 · $680,000,000 · $730,000,000**26–26** $790,000,000 |
| 12\. Celestial Launcher | **1–5** $490,000,000 · $530,000,000 · $560,000,000 · $600,000,000 · $640,000,000**6–10** $690,000,000 · $730,000,000 · $780,000,000 · $830,000,000 · $840,000,000**11–15** $850,000,000 · $860,000,000 · $870,000,000 · $880,000,000 · $890,000,000**16–20** $900,000,000 · $910,000,000 · $920,000,000 · $930,000,000 · $940,000,000**21–25** $950,000,000 · $960,000,000 · $970,000,000 · $980,000,000 · $990,000,000**26–28** $1,000,000,000 · $2,000,000,000 · $3,000,000,000 |
| 13\. Golden Sovereign | **1–5** $610,000,000 · $640,000,000 · $680,000,000 · $720,000,000 · $760,000,000**6–10** $770,000,000 · $780,000,000 · $790,000,000 · $800,000,000 · $810,000,000**11–15** $820,000,000 · $830,000,000 · $840,000,000 · $850,000,000 · $860,000,000**16–20** $870,000,000 · $880,000,000 · $890,000,000 · $900,000,000 · $910,000,000**21–25** $920,000,000 · $930,000,000 · $940,000,000 · $950,000,000 · $960,000,000**26–30** $970,000,000 · $980,000,000 · $990,000,000 · $1,000,000,000 · $2,000,000,000**31–32** $3,000,000,000 · $4,000,000,000 |
| 14\. Crystal Warden | **1–5** $690,000,000 · $700,000,000 · $710,000,000 · $720,000,000 · $730,000,000**6–10** $740,000,000 · $750,000,000 · $760,000,000 · $770,000,000 · $780,000,000**11–15** $790,000,000 · $800,000,000 · $810,000,000 · $820,000,000 · $830,000,000**16–20** $840,000,000 · $850,000,000 · $860,000,000 · $870,000,000 · $880,000,000**21–25** $890,000,000 · $900,000,000 · $910,000,000 · $920,000,000 · $930,000,000**26–30** $940,000,000 · $950,000,000 · $960,000,000 · $970,000,000 · $980,000,000**31–35** $990,000,000 · $1,000,000,000 · $2,000,000,000 · $3,000,000,000 · $4,000,000,000**36–36** $5,000,000,000 |
| 15\. Starfall Mythic | **1–5** $660,000,000 · $670,000,000 · $680,000,000 · $690,000,000 · $700,000,000**6–10** $710,000,000 · $720,000,000 · $730,000,000 · $740,000,000 · $750,000,000**11–15** $760,000,000 · $770,000,000 · $780,000,000 · $790,000,000 · $800,000,000**16–20** $810,000,000 · $820,000,000 · $830,000,000 · $840,000,000 · $850,000,000**21–25** $860,000,000 · $870,000,000 · $880,000,000 · $890,000,000 · $900,000,000**26–30** $910,000,000 · $920,000,000 · $930,000,000 · $940,000,000 · $950,000,000**31–35** $960,000,000 · $970,000,000 · $980,000,000 · $990,000,000 · $1,000,000,000**36–40** $2,000,000,000 · $3,000,000,000 · $4,000,000,000 · $5,000,000,000 · $6,000,000,000 |

=====

[section:melee-upgrade-prices-early] [chapter:creator] [images:]
### Creator reference › Melee upgrades by level, tiers 1–7

Prices below are in Wood. Each sequence lists the cost of the next point from level 1 through 30 for a single track.

| Equipment | Target level → price of that next point |
| --- | --- |
| 1\. Baseball Bat | **1–5** 6 · 7 · 7 · 8 · 9**6–10** 9 · 10 · 11 · 12 · 14**11–15** 15 · 16 · 18 · 20 · 21**16–20** 23 · 26 · 28 · 31 · 34**21–25** 37 · 40 · 44 · 48 · 53**26–30** 58 · 64 · 70 · 76 · 83 |
| 2\. Hunters Axe | **1–5** 8 · 9 · 10 · 11 · 12**6–10** 13 · 14 · 15 · 17 · 19**11–15** 20 · 22 · 24 · 27 · 29**16–20** 32 · 35 · 38 · 42 · 46**21–25** 50 · 55 · 60 · 66 · 72**26–30** 79 · 87 · 95 · 100 · 110 |
| 3\. Bonecrusher | **1–5** 18 · 20 · 22 · 24 · 26**6–10** 29 · 31 · 34 · 38 · 41**11–15** 45 · 49 · 54 · 59 · 65**16–20** 71 · 78 · 85 · 93 · 100**21–25** 110 · 120 · 130 · 150 · 160**26–30** 180 · 190 · 210 · 230 · 250 |
| 4\. Cenarius | **1–5** 31 · 34 · 37 · 40 · 44**6–10** 48 · 53 · 58 · 63 · 69**11–15** 76 · 83 · 91 · 100 · 110**16–20** 120 · 130 · 140 · 160 · 170**21–25** 190 · 210 · 230 · 250 · 270**26–30** 300 · 320 · 360 · 390 · 430 |
| 5\. Excalibur | **1–5** 160 · 180 · 190 · 210 · 230**6–10** 260 · 280 · 310 · 330 · 370**11–15** 400 · 440 · 480 · 530 · 580**16–20** 630 · 690 · 760 · 830 · 910**21–25** 990 · 1,000 · 1,000 · 1,000 · 1,000**26–30** 2,000 · 2,000 · 2,000 · 2,000 · 2,000 |
| 6\. Bloodfang | **1–5** 230 · 250 · 280 · 300 · 330**6–10** 360 · 400 · 440 · 480 · 520**11–15** 570 · 630 · 690 · 750 · 820**16–20** 900 · 990 · 1,000 · 1,000 · 1,000**21–25** 1,000 · 2,000 · 2,000 · 2,000 · 2,000**26–30** 2,000 · 3,000 · 3,000 · 3,000 · 3,000 |
| 7\. Dragons Fang | **1–5** 530 · 580 · 640 · 700 · 760**6–10** 840 · 920 · 1,000 · 1,000 · 1,000**11–15** 1,000 · 1,000 · 2,000 · 2,000 · 2,000**16–20** 2,000 · 2,000 · 3,000 · 3,000 · 3,000**21–25** 3,000 · 4,000 · 4,000 · 4,000 · 5,000**26–30** 5,000 · 6,000 · 6,000 · 7,000 · 7,000 |

=====

[section:melee-upgrade-prices-late] [chapter:creator] [images:]
### Creator reference › Melee upgrades by level, tiers 8–13

| Equipment | Target level → price of that next point |
| --- | --- |
| 8\. Titan | **1–5** 820 · 900 · 980 · 1,000 · 1,000**6–10** 1,000 · 1,000 · 2,000 · 2,000 · 2,000**11–15** 2,000 · 2,000 · 2,000 · 3,000 · 3,000**16–20** 3,000 · 4,000 · 4,000 · 4,000 · 5,000**21–25** 5,000 · 6,000 · 6,000 · 7,000 · 7,000**26–30** 8,000 · 9,000 · 10,000 · 10,000 · 11,000 |
| 9\. Celestial Halberd | **1–5** 2,000 · 3,000 · 3,000 · 3,000 · 3,000**6–10** 4,000 · 4,000 · 4,000 · 5,000 · 5,000**11–15** 6,000 · 6,000 · 7,000 · 8,000 · 8,000**16–20** 9,000 · 10,000 · 11,000 · 12,000 · 13,000**21–25** 14,000 · 16,000 · 17,000 · 19,000 · 21,000**26–30** 23,000 · 25,000 · 27,000 · 30,000 · 33,000 |
| 10\. Reaper | **1–5** 12,000 · 14,000 · 15,000 · 16,000 · 18,000**6–10** 20,000 · 21,000 · 23,000 · 26,000 · 28,000**11–15** 31,000 · 34,000 · 37,000 · 40,000 · 44,000**16–20** 48,000 · 53,000 · 58,000 · 64,000 · 70,000**21–25** 76,000 · 84,000 · 92,000 · 100,000 · 110,000**26–30** 120,000 · 130,000 · 140,000 · 160,000 · 170,000 |
| 11\. Red Crimson | **1–5** 21,000 · 23,000 · 26,000 · 28,000 · 31,000**6–10** 34,000 · 37,000 · 40,000 · 44,000 · 48,000**11–15** 53,000 · 58,000 · 63,000 · 69,000 · 76,000**16–20** 83,000 · 91,000 · 100,000 · 110,000 · 120,000**21–25** 130,000 · 140,000 · 160,000 · 170,000 · 190,000**26–30** 210,000 · 230,000 · 250,000 · 270,000 · 300,000 |
| 12\. Glacier Crusher | **1–5** 62,000 · 68,000 · 74,000 · 82,000 · 89,000**6–10** 98,000 · 110,000 · 120,000 · 130,000 · 140,000**11–15** 150,000 · 170,000 · 180,000 · 200,000 · 220,000**16–20** 240,000 · 270,000 · 290,000 · 320,000 · 350,000**21–25** 380,000 · 420,000 · 460,000 · 500,000 · 550,000**26–30** 600,000 · 660,000 · 720,000 · 790,000 · 860,000 |
| 13\. Eclipse | **1–5** 170,000 · 190,000 · 200,000 · 220,000 · 250,000**6–10** 270,000 · 290,000 · 320,000 · 350,000 · 390,000**11–15** 420,000 · 460,000 · 510,000 · 560,000 · 610,000**16–20** 670,000 · 730,000 · 800,000 · 880,000 · 960,000**21–25** 1,000,000 · 1,000,000 · 1,000,000 · 1,000,000 · 2,000,000**26–30** 2,000,000 · 2,000,000 · 2,000,000 · 2,000,000 · 2,000,000 |