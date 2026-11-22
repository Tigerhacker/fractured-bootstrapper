# Offer the optional published server-list grouping

Author: Makichika

## Confirmed findings

The frontend payloads match the existing public repository byte-for-byte.

## What the patch does

Preserves the optional published list grouping: heart-prefixed community servers, then Tiger-prefixed servers, then other servers. This is a user preference, not a correctness fix; it is deliberately separate so the maintainer can decline this policy without losing other fixes.

## Interpretation

This transfers the existing behavior rather than redesigning the draft or server browser.

## Not established / limitations

JavaScript syntax and payload hashes are checked. Fresh rendered-client validation remains pending. Text payloads are tracked directly in data/ as prescribed by the patching documentation; there is no binary recipe for this change.
