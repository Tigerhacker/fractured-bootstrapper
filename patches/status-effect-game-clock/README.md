# Server-announced status effect game clock

Author: Makichika

## Confirmed findings

The published standard executable adds .stclock and .stdata sections. The appended payload starts at file offset 0x3B59600. .stclock uses RVA 0x3E06000; .stdata uses RVA 0x3E0C000. Existing section file offsets remain unchanged. The recipe separates the independently documented draft, missile and Discord URL edits. The appended data includes the replacement runtime-function table required by the published implementation.

## What the patch does

Uses game time after the server announces Makichika_Status_GameClock_v1 through ClientMessage. World/NetDriver identities scope the capability; ordinary servers retain real-time behavior. Finite countdowns clamp at zero, infinite sentinels remain, and late capability conversion preserves effect duration. This does not install authoritative server purge/immunity rules.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

Preserving the published machine code and PE layout avoids introducing a new clock implementation while migrating its packaging. A guarded append extension is required because the original upstream format only permits same-length edits.

## Not established / limitations

This recipe requires the proposed append support in the builder. It remains testing until fresh gameplay verifies server capability arrival, reconnect, slow motion, infinite statuses and ordinary-server fallback. Historical emulated native tests do not establish these V2 runtime cases. No whole executable is committed.

## Source and review classification

Client compatibility fix for capable servers. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
