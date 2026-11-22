# Preserve the Protector shield field visual

Author: Makichika

## Confirmed findings

The recipe contains all 2 entries from the public Makichika_ProtectorShield_P.pak. SHA-256 of the source archive: 527ee940e636dab6fbeb53099ba6008cedb36fde3b0a46f89826cdda2b3eb8e1. Each decoded entry has its own content hash. Original mount point: ../../../spacegame/Content/Blueprints/Systems/Subsystems/.

## What the patch does

Moves the shared field graphic from the removable personal Shield Self visual to the existing weapon MuzzleEffect lifecycle, following the Legendary variant. Includes the creation-before-serialization dependency for BP_VFX_MuzzleFlash_CorvetteShield_C that addresses the documented AsyncLoading missing-dependency crash. Gameplay values and allied Shielded behavior are unchanged.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

Preserving the overlay boundary avoids merging unrelated stock archives and preserves the original distribution scope.

## Not established / limitations

The original installation document in Makichika/Fractured-space-fixe- remains the behavioral provenance. This is a packaging migration, not a fresh gameplay validation. Charon and Christmas require matching server event logic. Status remains testing. Recompression may change archive bytes; decoded content equality is the relevant preservation check.

## Source and review classification

Bug fix. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
