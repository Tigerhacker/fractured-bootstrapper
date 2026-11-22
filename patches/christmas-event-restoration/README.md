# Restore Christmas event maps and supporting assets

Author: Makichika

## Confirmed findings

The recipe contains all 22 entries from the public Makichika_XmasEvent_P.pak. SHA-256 of the source archive: c20482888a928d878548da0ef51073abcdb7ef6bf9e3c51cfdb793bf5a419a48. Each decoded entry has its own content hash. Original mount point: ../../../spacegame/Content/.

## What the patch does

Restores the Christmas Conquest map, Omega scenery/staging and event controller. Preserves the HUD overlap fix and queues existing Ru-T0lf combat taunts once per boss appearance. Combat hooks are additions using existing voice media and need explicit acceptance. A compatible Christmas server is required.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

Preserving the overlay boundary avoids merging unrelated stock archives and preserves the original distribution scope.

## Not established / limitations

The original installation document in Makichika/Fractured-space-fixe- remains the behavioral provenance. This is a packaging migration, not a fresh gameplay validation. Charon and Christmas require matching server event logic. Status remains testing. Recompression may change archive bytes; decoded content equality is the relevant preservation check.

## Source and review classification

Original-content restoration with event hooks. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
