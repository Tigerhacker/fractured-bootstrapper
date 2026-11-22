# Incoming-missile icon and warning ignore destroyed / trail-cleanup missiles

Target: `spacegame/Binaries/Win64/Fractured Space.exe` (base `spacegame-Win64-Shipping-30.exe`, `fa6288c2…`)
Status: testing
Source: Makichika, [Makichika/Fractured-space-fixe-](https://github.com/Makichika/Fractured-space-fixe-)
commit `4bee12a` (exe `7d3930af…`). Re-expressed here as edits; not written in this repo.

Submitted by Makichika as [Tigerhacker/fractured-bootstrapper#5](https://github.com/Tigerhacker/fractured-bootstrapper/pull/5). Byte-identical edits.

## Confirmed findings
- Makichika's exe at `4bee12a`, compared with `ce62324`, adds exactly these four runs (39 bytes).
- This patch plus `draft-player-cache-refresh` reproduces that exe byte for byte:
  sha256 `7d3930af7dff6882a027c53bd706476d1e78ce3110f3e4d07322afc2bcebcb9f`.
- Disassembly:

  ```
  helper, RVA 0x91A80 (INT3 padding):
      test byte [rax+648h],6     ; missile state bits 1|2
      jne  skip
      cmp  byte [rax+361h],0     ; original comparison
      ret
  skip:
      cmp  eax,eax               ; ZF=1 -> caller's je treats the missile as silent
      ret

  RVA 0x33F1E7  HUD icon:  shr ecx,1 / test cl,1   ->  test cl,6 / nop / nop
  RVA 0x3AF38B  sound #1:  cmp [rax+361h],dil      ->  call helper / nop / nop
  RVA 0x3BBBCB  sound #2:  cmp byte [rax+361h],0   ->  call helper / nop / nop
  ```
- In the sound #1 loop, `edi` is zeroed at `0x3AF33A` (`xor edi,edi`) and never
  written again, so `cmp …,dil` is the same as `cmp …,0`. The helper is a drop-in
  replacement there.
- At the HUD site, `ecx` is not read again before it is overwritten, so leaving
  it unshifted is safe.
- The helper reads only and preserves every register except flags. The `call`
  uses the stack below `rsp`, which x64 Windows allows (no red zone).

## Code cave
| File offset | RVA | Size | Used by |
|---|---|---|---|
| `0x91080` | `0x91A80` | 20 B | this patch |

## What the patch does
The HUD icon check, which skipped a missile with state bit 1 set, now also
skips state bit 2. Both warning-sound queries skip a missile with either bit
set before doing their original `+0x361` check.

## Interpretation (from the author's write-up)
Bit 1 = destroyed, bit 2 = kept alive only to finish its particle trail.
Without the fix, a destroyed missile's red icon and incoming beep stay active
until its trail finishes.

## Not established / limitations
- The meaning of the bits comes from the author. The author tested offline with
  mocked engine helpers, but this revision isn't confirmed in-game.
- To test: take several missile salvos in a row without respawning. Each new
  salvo should beep. Destroyed missiles should lose their icon at once, and a
  surviving missile should keep its warning.
