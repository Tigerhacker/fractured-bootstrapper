# Firing-range crash: experimental null-interface guard

Target: `spacegame/Binaries/Win64/Fractured Space.exe`
Base: source build `spacegame-Win64-Shipping-30.exe` (sha256 `fa6288c2…`, see `patches/bases.json`)
Status: **shipped** (promoted from testing).

## Confirmed findings
The minidump reports exception 0xC0000005 at runtime address 0x7FF774DA6A13, module base 0x7FF772D30000, RVA 0x2076A13. RCX is zero. The faulting instruction is `mov rax, [rcx]`.
The complete 55-byte function at RVA 0x20769F0 in the dump matches the bytes of the base executable, even though the running file was named `spacegame-Win64-Shipping-30.exe`.
The function's virtual-table group contains the diagnostic string `FOnlineAsyncTaskFirelineLeaveSteamLobby bWasSuccessful: %d, LobbyId: %I64u`.

## Original behavior
The task gets an interface context, loads its pointer from context +0x20, and calls virtual slot +0x78 with the lobby ID from task +0x28. It then marks task +0x18 complete and task +0x19 successful. Nothing checks for null before the virtual call.

## Patch behavior
The guard loads the same interface pointer and tests it. If it's non-zero, the guard loads the vtable and jumps back to the ORIGINAL virtual call instruction. If it's zero, the guard skips that call and continues at the existing completion/success assignments. So leaving the lobby with no interface becomes a no-op. This does not initialize Steam, repair online matchmaking, or explain why the interface is missing.
The original stack layout, argument spill, call location and function epilogue are unchanged. The guard uses 21 bytes of existing INT3 padding outside any runtime-function entry. No sections are added.

| File offset | Original bytes | Patched bytes |
|---|---|---|
| 0x207600F | 48 8B 48 20 48 8B 01 | E9 BC F5 F8 FD 90 90 |
| 0x55D0 | CC × 21 | 48 8B 48 20 48 85 C9 0F 84 3C 0A 07 02 48 8B 01 E9 31 0A 07 02 |

The 21 bytes at 0x55D0 (`.text` padding) are now claimed. Any other exe patch that needs a code cave must use a different range; the build fails if two patches overlap.

## Validation and limitations
Static checks confirmed the original bytes, the match between dump and function, the branch destinations, the unchanged file size, and that the padding is outside runtime-function entries. `npm run patches:build -- --testing` reproduces the hand-made test exe exactly (sha256 `4d92ed3b30596c9dbdd5bf112c62050831d044c0eb2ff9aaa525f222a2bbe08a`).
This is an EXPERIMENTAL crash guard, not a fix verified at runtime. Other Steam interface calls are unchanged. The later PoolThread 22 crash may be secondary or unrelated; this patch doesn't target it. No older working executable was available, so where the regression came from isn't established.

## Testing and promotion
Build with `--testing`, keep the original exe, and use the same launcher and executable filename your setup expects. Confirm the firing range actually **loads**, not just that the crash goes away. If it stalls or crashes elsewhere, restore the original and capture a fresh log/dump. Redact authentication command-line values (`-discord=`) from any log before sharing it.
Promote to `"status": "shipped"` once the firing range is confirmed working in-game.
