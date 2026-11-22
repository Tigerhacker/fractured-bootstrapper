# Remove automation-test hooks

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: shipped (recovered from `data/BP.pak`, git `f47788f "Hud control loss bug fix"`)

## Recovered change
| Asset | Vanilla | Patched |
|---|---|---|
| `GameModes/BP_SpaceMenuGameMode.uasset` | 6812 B | 5780 B |
| `GameModes/BP_SpaceMenuGameMode.uexp` | 2855 B | 2432 B |
| `Automation/BPT_ShipMovementCost.uasset` | 42564 B | 36474 B |
| `Automation/BPT_ShipMovementCost.uexp` | 18507 B | 9933 B |

All four are stored as whole files.

**BP_SpaceMenuGameMode**: the menu game mode's graph had a branch that runs on
menu load. It checked `IsAutomationTestingEnabled` / `ShouldAutoRunTests`, and
then used `ExecuteConsoleCommand`, `PrintString` and `OnHideTutorialSplashScreen`.
That branch is gone. Only a dangling `BooleanAND` (`CallFunc_BooleanAND_A/B`)
remains. These names were removed from the name table:
`AutomationTestingBlueprintLibrary`, `IsAutomationTestingEnabled`,
`ShouldAutoRunTests`, `ExecuteConsoleCommand`, `PrintString`,
`GetSpaceGameInstance`, `OnHideTutorialSplashScreen`, `KismetSystemLibrary`,
`KismetMathLibrary`, `GameplayBlueprintLibrary`, `LinearColor`,
`MulticastDelegateProperty`.

**BPT_ShipMovementCost**: an automation test blueprint that drives a ship
through `SimulateInput` (plus ship-database lookups, `Delay`, string building).
The test graph has been emptied: the `SimulateInput`, `/Script/InputCore`,
`/Script/ShipDatabasePlugin` and array/map/string library references are all
removed.

## Interpretation (not verified)
A test that injects simulated input, started automatically from the menu game
mode, is a plausible cause of "losing control" of the ship. That matches the
commit title. It has not been confirmed in-game which of the two edits matters.
