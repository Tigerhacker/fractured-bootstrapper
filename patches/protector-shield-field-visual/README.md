# Protector shield-field visual follows the active ability

Target: `spacegame/Content/Paks/BP.pak` (mount `../../../spacegame/Content/Blueprints/`)
Status: testing
Source: Makichika, `Makichika_ProtectorShield_P.pak` from
[Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-) commit `63709e1`
(pak sha256 `527ee940…`, includes the 1 Nov 2026 async-loading dependency fix).
Assets extracted and stored as whole-file replacements; not authored in this repo.

Submitted by Makichika as [Tigerhacker/fractured-bootstrapper#10](https://github.com/Tigerhacker/fractured-bootstrapper/pull/10). Same two assets, byte-identical. The PR shipped them as a separate overlay pak (`Makichika_ProtectorShield_P.pak`); here they replace the `BP.pak` entries so a later release can revert them.

## Confirmed findings
| Asset | Vanilla | Patched |
|---|---|---|
| `Systems/Subsystems/BP_SYS_ABLTY_SHIELDAOE_01.uasset` | 8203 B | 8272 B |
| `Systems/Subsystems/BP_SYS_ABLTY_SHIELDAOE_01.uexp` | 4054 B | 4109 B |

- Names added: `MuzzleEffect`, `bRemoveMuzzleEffectIfWeaponInactive`. Nothing removed.
- `BP_SYS_ABLTY_SHIELDAOE_01_LEGENDARY` is not touched.
- Built from this patch, `BP.pak` holds assets byte-identical to the community pak's.

## What the patch does (from the author's write-up, consistent with the name changes)
- Export 4 (weapon default object) gets
  `MuzzleEffect = BP_VFX_MuzzleFlash_CorvetteShield_C` and
  `bRemoveMuzzleEffectIfWeaponInactive = true`, the same lifecycle the Legendary
  variant uses. It also gets the creation-before-serialization dependency for
  that class. Without it, the earlier revision crashed at `AsyncLoading.cpp:3006`
  ("Missing Dependency").
- Export 19 (Shield Self status) gets `VisualEffect = None`. Its
  `MaterialEffectName = Shielded` stays.

## Interpretation
The shield bubble was attached to the Protector's personal Shield Self status,
so it vanished when that status was removed (for example by Purge) while allies
were still Shielded. It now follows the active ability.

## Not established / limitations
- The export-level details were not decoded here. Check them in UAssetGUI.
- The first revision crashed the client. Retesting the dependency fix in a
  real client, with cold loads, is still outstanding. **Test this with a full
  client restart before shipping.**
- The author says damage values, radius, duration, cost and cooldown are
  unchanged. That isn't independently verified.
