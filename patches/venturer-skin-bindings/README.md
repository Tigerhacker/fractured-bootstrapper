# Venturer skins bind their palettes to the current mesh material slots

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: testing
Source: Makichika, `Makichika_VenturerSkins_P.pak` from
[Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-) commit `6f2973c`
(pak sha256 `b5dd72b4…`). Assets extracted; not authored in this repo.

Submitted by Makichika as [Tigerhacker/fractured-bootstrapper#11](https://github.com/Tigerhacker/fractured-bootstrapper/pull/11). Same two assets, byte-identical. The PR shipped them as a separate overlay pak (`Makichika_VenturerSkins_P.pak`); here they are `BP.pak` edits/replacements so a later release can revert them.

## Confirmed findings
| Asset | Vanilla | Patched | Stored as |
|---|---|---|---|
| `Parts/M00/BP_SHP_MID_M00_C018_Venturer.uasset` | 31834 B | 31834 B | 11 byte edits (export offsets/sizes) |
| `Parts/M00/BP_SHP_MID_M00_C018_Venturer.uexp` | 90586 B | 106954 B | whole file |

- The `.uasset` name table is unchanged. No new imports, so no new classes or
  functions are referenced. The `.uasset` edits are the serial offset and size
  fields that follow the larger `.uexp`.
- Built from this patch, `BP.pak` holds assets byte-identical to the community pak's.

## What the patch does (from the author's write-up)
Rewrites the skin-to-material bindings of one component for the 14 existing
Venturer skins (366 bindings), across all four LODs. The other 113 exports are
byte-identical. Textures, meshes and skin IDs are unchanged.

## Interpretation
The Swarm bindings put the neutral silver material on the main hull panels
and the skin colour on small parts. Swarm and Swarm II only had bindings for
LOD0. All 14 skins now show their intended colours at every distance.

## Not established / limitations
- Lower LODs merge some regions, so fine-detail equivalence at every distance
  hasn't been checked.
- The author reports an in-game check. Not yet confirmed by us.
