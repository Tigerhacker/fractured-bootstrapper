# Stop icons and incoming alerts for destroyed or trail-cleanup missiles

Author: Makichika

## Confirmed findings

These edits reproduce the corresponding byte ranges of the executable published in [Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-). Its installation document records the original offsets and historical test scope. Every original range matches the tracked source-build base and the official V2 executable. Every replacement range matches both the published standard client and the personal client audited on 2026-11-22.

Code cave: 0x91080–0x91093 (RVA 0x91A80). The recipe records exact file offsets and RVAs. The upstream firing-range guard uses a separate cave at file offset 0x55D0.

## What the patch does

Exclude destroyed and trail-cleanup missile state bits from the HUD predicate and both warning queries while retaining the existing warning configuration.

## Interpretation

The guard addresses stale presentation state without changing the authoritative server behavior. This interpretation is limited to the documented native predicates.

## Not established / limitations

This is a client display/audio query change, not a projectile damage or lifetime change. Repeated audible salvos and slow-motion behavior require fresh game validation on V2. The testing status is intentional. Build/hash checks are not runtime proof.
