# HUD widgets reference the AERO_MATICS_REGULAR font

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: shipped (recovered from `data/BP.pak`, git `f47788f`)

## Recovered change
| Asset | Vanilla | Patched | Stored as |
|---|---|---|---|
| `HUD/W_MainHUD_01.uasset` | 559095 B | 559267 B | whole file |
| `HUD/W_MainHUD_01.uexp` | 2050754 B | 2050645 B | whole file |
| `HUD/W_Killcam.uasset` | 39825 B | 40013 B | whole file |
| `HUD/W_Killcam.uexp` | 66531 B | 66531 B | whole file (1728 scattered runs: name indices shifted) |

The only name-table change in both `.uasset` files is an added import:
`/Game/Project_Bluebook/Blueprints/AERO_MATICS_REGULAR_Font`. Nothing was removed.
So the widgets were re-pointed at that font. The `.uexp` changes are the
property data that uses it, plus renumbered name indices.

## Unknown / not established
- Which text blocks were switched, and what the font replaced, has not been
  decoded. Open both versions in UAssetGUI to see that (docs/patching.md).
- This patch was grouped by asset when the history was recovered. It may share
  a purpose with `disable-automation-tests` (both landed in the "Hud control
  loss bug fix" commit).
