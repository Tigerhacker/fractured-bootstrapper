# Restore Charon event maps and supporting assets

Author: Makichika

## Confirmed findings

The recipe contains all 22 entries from the public Makichika_CharonEvent_P.pak. SHA-256 of the source archive: 8718acfd43663cd9613a5c2993e2596b23f081b57490db1beefe9826d491fde2. Each decoded entry has its own content hash. Original mount point: ../../../spacegame/Content/.

## What the patch does

Restores the Charon/Halloween map and hidden sector with eleven packages. Preserves jump-arrival collision and legacy serialization fixes, voice request sequencing and the resource banner showing the amount awarded by the compatible server. The new voice/reward hooks are called out for policy review; there is no new voice media or server executable in this PR.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

Preserving the overlay boundary avoids merging unrelated stock archives and preserves the original distribution scope.

## Not established / limitations

The original installation document in Makichika/Fractured-space-fixe- remains the behavioral provenance. This is a packaging migration, not a fresh gameplay validation. Charon and Christmas require matching server event logic. Status remains testing. Recompression may change archive bytes; decoded content equality is the relevant preservation check.

## Source and review classification

Original-content restoration with event hooks. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
