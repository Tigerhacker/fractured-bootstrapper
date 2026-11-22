# Re-cook churn (probably not functional)

Target: `spacegame/Content/Paks/BP.pak`
Status: shipped. Kept only so the build reproduces the content of the
`data/BP.pak` that is shipped today.

## What it is
63 assets whose size is unchanged but whose bytes differ from vanilla. They
were byte-diffed and stored as `edits` (offset / original / patched), with no
whole files:

- **50 HUD/Tutorial widget `.uexp` files**, 1–85 runs each. Every run but one
  is exactly 16 bytes of unrelated random-looking data on both sides: FGuids
  regenerated when the widgets were re-saved and re-cooked
  (e.g. `HUD/W_ArmorStatus01.uexp`, 30 GUIDs). The exception is a 15-byte run
  in `HUD/W_OptionsPreviewHUDTags.uexp`, a GUID whose first byte happens to
  match.
- **`BP_LoadingScreenManager.uexp`, `FX_Abilities/BP_VFX_AegisSelfBubble_01.uexp`,
  `Systems/Subsystems/TestProjectedShield_Centurion.uexp`**: one GUID each.
- **Chameleon textures** (`T_AntiquePaper2`, `T_BlueprintPaper`, `T_Noise`,
  `T_ScreenFX1/5/6` `.uexp`; `T_MossyWood`, `T_ShadowRocks1-3` `.ubulk`):
  1–93 changed bytes inside block-compressed pixel data. That looks like
  texture recompression on re-cook, not an edit.

## Recommendation
Try a build without this patch (set `"status": "disabled"`, rebuild, test
in-game). If nothing changes visibly, keep it disabled or delete it. That
removes 63 assets from the diff surface and lowers the chance of conflicting
with real edits to those widgets.
