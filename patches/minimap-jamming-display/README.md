# Minimap objects and sectors show jamming state

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: testing
Source: Makichika, `Makichika_MapJamming_P.pak` from
[Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-) commit `ce62324`
(pak sha256 `ae20f8f7…`, mount `…/Content/Blueprints/HUD/`). Assets extracted and stored here
as whole-file replacements; not authored in this repo.

Submitted by Makichika as [Tigerhacker/fractured-bootstrapper#9](https://github.com/Tigerhacker/fractured-bootstrapper/pull/9). Same four assets, byte-identical. The PR shipped them as a separate overlay pak (`Makichika_MapJamming_P.pak`); here they replace the `BP.pak` entries so a later release can revert them.

## Confirmed findings
| Asset | Vanilla | Patched |
|---|---|---|
| `HUD/W_MinimapObject.uasset` | 65870 B | 67414 B |
| `HUD/W_MinimapObject.uexp` | 33428 B | 34525 B |
| `HUD/W_MinimapSector.uasset` | 37453 B | 39529 B |
| `HUD/W_MinimapSector.uexp` | 33146 B | 33998 B |

- Names added to `W_MinimapObject`: `GetJammingVisibility`, `IsHiddenByJamming`,
  `IsMapJammed`, `HasBeenJammed`, `Get_CountdownTime_Text_0`, `K2_GetPawn`,
  `LocalController`, `LocalShip`, plus new widget-tree entries (Overlay, ScaleBox, SizeBox).
- Names added to `W_MinimapSector`: `GetJammingSectorColor`, `IsMapJammed`,
  `HasBeenJammed`, `IsPureSpectator`, `IsValid` (`KismetSystemLibrary`), `MakeColor`,
  `K2_GetPawn`, plus new CanvasPanel / Image / Overlay / ScaleBox entries.
- No name was removed. No asset calls console commands, URLs, files or saves.
  The patched assets were scanned for `ExecuteConsoleCommand`, `LaunchURL`, `http`
  and similar, with no hits.
- Built from this patch, `BP.pak` holds assets byte-identical to the community pak's.

## What the patch does
Replaces both minimap widgets with versions that query the local player's map
jamming state and hide or recolour minimap objects and sectors to match.

## Interpretation
Makes Destroyer / Interceptor map jamming show on the jammed player's
minimap. The author's README calls it "Fix Destroyer and Interceptor jamming".

## Not established / limitations
- The Blueprint logic hasn't been decoded here. Open both versions in UAssetGUI to see it.
- The author gave no description beyond the one-liner, and the original
  `MANUAL_INSTRUCTIONS.txt` (commit `ecad1b0`) wasn't reviewed.
- Not confirmed in-game by us.
