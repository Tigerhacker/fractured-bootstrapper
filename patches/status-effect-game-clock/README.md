# Server-announced status effect game clock

Author: Makichika

## Confirmed findings

The published standard executable adds .stclock and .stdata sections. The appended payload starts at file offset 0x3B59600. .stclock uses RVA 0x3E06000; .stdata uses RVA 0x3E0C000. Existing section file offsets remain unchanged. The recipe separates the independently documented draft, missile and Discord URL edits. The appended data includes the replacement runtime-function table required by the published implementation.

## What the patch does

The server announces Makichika_Status_GameClock_v1 through the existing reliable ClientMessage path. The client tracks the connection/world identity and uses game time for visual status countdowns on compatible servers. Other servers retain the original clock. Finite countdowns are clamped to zero; infinite-duration sentinels are retained. It does not implement authoritative ability immunity or purge behavior.

## Interpretation

Preserving the published machine code and PE layout avoids introducing a new clock implementation while migrating its packaging. A guarded append extension is required because the original upstream format only permits same-length edits.

## Not established / limitations

This recipe requires the proposed append support in the builder. It remains testing until fresh gameplay verifies server capability arrival, reconnect, slow motion, infinite statuses and ordinary-server fallback. Historical emulated native tests do not establish these V2 runtime cases. No whole executable is committed.
