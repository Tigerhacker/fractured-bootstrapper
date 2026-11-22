# Refresh the drafting player cache when the roster count changes

Author: Makichika

## Confirmed findings

These edits reproduce the corresponding byte ranges of the executable published in [Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-). Its installation document records the original offsets and historical test scope. Every original range matches the tracked source-build base and the official V2 executable. Every replacement range matches both the published standard client and the personal client audited on 2026-11-22.

Code cave: 0x75950–0x7596E (RVA 0x76350). The recipe records exact file offsets and RVAs. The upstream firing-range guard uses a separate cave at file offset 0x55D0.

## What the patch does

Reject an empty cached roster or a cached count different from PlayerArray. The existing native refresh path retains its other readiness and identity checks.

## Interpretation

The guard addresses stale presentation state without changing the authoritative server behavior. This interpretation is limited to the documented native predicates.

## Not established / limitations

Historical user gameplay confirmation exists for the original patch. This V2 recipe has not been tested in a live draft. Equal counts with different identities still depend on native checks. The testing status is intentional. Build/hash checks are not runtime proof.
