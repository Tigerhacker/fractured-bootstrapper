# Correct Venturer skin material bindings

Author: Makichika

## Confirmed findings

The recipe contains all 2 entries from the public Makichika_VenturerSkins_P.pak. SHA-256 of the source archive: b5dd72b42563c75da64883903a57f151919c119a86ad90bdc6ca26072dedb997. Each decoded entry has its own content hash. Original mount point: ../../../spacegame/Content/Blueprints/Parts/M00/.

## What the patch does

Corrects the material-slot bindings for fourteen existing Venturer skins, including Swarm and Swarm II, across four detail levels. Existing textures, mesh geometry and skin identifiers remain unchanged. Historical checks covered 366 bindings; exhaustive appearance validation at every distance is not claimed.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

Preserving the overlay boundary avoids merging unrelated stock archives and preserves the original distribution scope.

## Not established / limitations

The original installation document in Makichika/Fractured-space-fixe- remains the behavioral provenance. This is a packaging migration, not a fresh gameplay validation. Charon and Christmas require matching server event logic. Status remains testing. Recompression may change archive bytes; decoded content equality is the relevant preservation check.

## Source and review classification

Original-content bug fix. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
