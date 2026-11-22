# Restore pre-draft Ready controls and mode selection presentation

Author: Makichika

## Confirmed findings

The frontend payloads match the existing public repository byte-for-byte.

## What the patch does

Preserves the published pre-draft Ready button, mode names/artwork and scrolling changes. The native cached player-list fix is reviewed separately.

## Interpretation

This transfers the existing behavior rather than redesigning the draft or server browser.

## Not established / limitations

JavaScript syntax and payload hashes are checked. Fresh rendered-client validation remains pending. Text payloads are tracked directly in data/ as prescribed by the patching documentation; there is no binary recipe for this change.
