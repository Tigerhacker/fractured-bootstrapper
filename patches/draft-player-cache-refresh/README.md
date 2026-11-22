# Drafting rebuilds its cached player list when the count is stale

Target: `spacegame/Binaries/Win64/Fractured Space.exe` (base `spacegame-Win64-Shipping-30.exe`, `fa6288c2…`)
Status: testing
Source: Makichika, [Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-)
commit `ce62324` (exe `d3977e73…`). Re-expressed here as edits; not written in this repo.

Submitted by Makichika as [Tigerhacker/fractured-bootstrapper#4](https://github.com/Tigerhacker/fractured-bootstrapper/pull/4). Byte-identical edits.

## Confirmed findings
- Makichika's exe at `ce62324` differs from our base in exactly two runs (36 bytes);
  file size and PE headers are unchanged.
- This patch alone, applied to the base, reproduces that exe byte for byte:
  sha256 `d3977e731ee5636859174b323b761a7f510d8c76fc64fb904e35bd1b1ce185f6`.
- Disassembly (capstone) of the edits:

  ```
  RVA 0x3B4000 (function entry)   jmp 0x76350          ; was mov [rsp+10h],rbx
  RVA 0x76350  (INT3 padding)     mov  eax,[rcx+458h]
                                  test eax,eax
                                  jle  ret0
                                  cmp  eax,[rcx+338h]
                                  jne  ret0
                                  mov  [rsp+10h],rbx   ; displaced instruction
                                  jmp  0x3B4005        ; back into the original
                          ret0:   xor  eax,eax
                                  ret
  ```
- The guard only reads memory. Nothing is written, called or allocated.

## Code cave
| File offset | RVA | Size | Used by |
|---|---|---|---|
| `0x75950` | `0x76350` | 31 B | this patch |

It is disjoint from `firing-range-null-lobby-guard` (`0x55D0`) and `destroyed-missile-alert-cleanup` (`0x91080`).

## What the patch does
When the function at RVA `0x3B4000` is entered, the guard returns 0 early if
`[this+0x458]` is <= 0 or differs from `[this+0x338]`. Otherwise the original
function runs unchanged.

## Interpretation (from the author's write-up, not verified here)
`this` is the drafting GameState: `+0x458` is the cached drafting player count
and `+0x338` is `PlayerArray.Num`. Returning false makes the drafting Tick
rebuild the list, which fixes pre-draft showing only the first player when more
players or bots join later.

## Not established / limitations
- The function's name and the meaning of the two offsets come from the author.
  Neither is confirmed from symbols here.
- The author reports a gameplay test, but not every mode or join order was
  covered. It doesn't fix pre-draft chat.
- Mostly visible on servers that run the pre-draft lobby (Makichika's servers do).
