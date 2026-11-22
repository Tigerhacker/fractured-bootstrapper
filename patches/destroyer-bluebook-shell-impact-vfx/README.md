# Destroyer BlueBook shell impact VFX

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: shipped (recovered from `data/BP.pak`, git `f47788f`)

## Recovered change
| Asset | Vanilla | Patched |
|---|---|---|
| `FX_Weapons/BP_VFX_Impact_Projectile_Destroyer_ShellBlueBook.uasset` | 4574 B | 4799 B |
| `FX_Weapons/BP_VFX_Impact_Projectile_Destroyer_ShellBlueBook.uexp` | 1149 B | 1178 B |

Both are stored as whole files. New imports:
`/Game/Project_Bluebook/Particles/P_Explosion8x8LargeDebris_01_BlueBook`
(`ParticleSystem`), set through a `Template` property. The impact blueprint now
spawns that particle system. Presumably it had no template before, or a
missing one.

## Unknown
Whether the vanilla blueprint was visibly broken (no impact effect) or this is
a cosmetic choice has not been checked in-game.
