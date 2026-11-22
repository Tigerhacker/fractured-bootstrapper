# Discord profile avatars

Author: Makichika

## Confirmed findings

The executable change is confined to the 226-byte URL slot at file offset 38973904. It matches the public standard executable byte-for-byte. The public package also includes a two-asset scoreboard override, frontend changes and a local Bootstrapper avatar service.

## What the patch does

Displays connected-account and other-player Discord avatars through a local loopback service, existing Lifeline account validation and public active-player name matching. Includes the native URL slot, two standard-scoreboard assets, three frontend scripts, three service modules and default image. No personal LAN bridge, saved server address or account settings are included. Ambiguous names, unavailable upstream services, late joins and platform behavior remain runtime limitations.

The machine-readable recipe preserves the published payload while keeping this fix separately reviewable.

## Interpretation

This is a name-based profile resolver, not a guarantee that similarly named players are unambiguous.

## Not established / limitations

The multi-file migration includes the native URL edit, both scoreboard assets, common.js, player.js, scoreboard.js, the three local avatar-service modules and the default image. The Bootstrapper starts the service on readiness and closes it on shutdown. Availability of the remote player list, duplicate names, late joins, and other computers need runtime validation. Status remains testing; reconstruction is not gameplay proof.

## Source and review classification

New presentation feature: optional maintainer acceptance. Source: [pinned public package](https://github.com/Makichika/Fractured-space-fixe-/tree/7e43fb70ca660c35ae903fcc1f703b9c0a624cb0), including its installation document. Historical test statements in that document are not fresh V2 runtime proof.
