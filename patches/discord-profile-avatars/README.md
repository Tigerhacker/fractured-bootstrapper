# Discord profile avatars

Author: Makichika

## Confirmed findings

The executable change is confined to the 226-byte URL slot at file offset 38973904. It matches the public standard executable byte-for-byte. The public package also includes a two-asset scoreboard override, frontend changes and a local Bootstrapper avatar service.

## What the patch does

Routes native avatar requests to the local service. The complete feature must include the scoreboard, frontend and service changes in this same fix.

## Interpretation

This is a name-based profile resolver, not a guarantee that similarly named players are unambiguous.

## Not established / limitations

The multi-file migration includes the native URL edit, both scoreboard assets, common.js, player.js, scoreboard.js, the three local avatar-service modules and the default image. The Bootstrapper starts the service on readiness and closes it on shutdown. Availability of the remote player list, duplicate names, late joins, and other computers need runtime validation. Status remains testing; reconstruction is not gameplay proof.
