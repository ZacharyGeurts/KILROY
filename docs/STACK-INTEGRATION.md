# KILROY stack integration (2026-06-29)

KILROY is layer zero syscall truth. Everything above rides on Field Die classification.

## Stack layers (AmmoOS doctrine)

| Order | Layer | KILROY role |
|-------|-------|-------------|
| 0 | Hardware | Witness — no breaks, no SPI flash |
| 1 | NEXUS C2 | Tristate underlay-f9, threat panel hooks |
| 2 | ZNetwork | Loopback pipe — operator is `127.0.0.1` |
| 3 | Queen | Secured browser shell |
| 4 | AmmoOS | Field desktop inside Queen |

Doctrine: AmmoOS `data/field-stack-layer-doctrine.json`

## Pairing versions

- **Grok16 5.0.1** — `ammoos` profile, `grok16-verify-ammoos.sh`, smoke chamber
- **AmmoOS 1.9.9h** — Grok Expert Review, View, Queen rebrand
- **Kill-Grok-Orphans 1.1.0** — companion watchdog

## KILROY surfaces in the stack

| Surface | URL / path |
|---------|------------|
| Underlay Tristate | `http://127.0.0.1:9477/underlay-f9?sector=kilroy` |
| Queen API | `http://127.0.0.1:9481/api/kilroy` |
| Field proc | `/proc/kilroy_field/{status,security,stack,power,thermo,flow,cache,direct,ai}` |
| Chardev | `/dev/kilroy_field` |
| Virtual field boot | `scripts/tristate-virtual-kilroy-field.sh` |

## Build chain

```
Field .fld update → gen-field-stack.sh → kilroy-become-substrate.sh → build-kilroy.sh
Compiler: Grok16 g16 @ belt_2_0 / field_physics
Recompile rule: field-recompile.sh after every field stack change
```

## Combinatronic discipline

AmmoOS pipeline (rebalance → condense → combine → connect → spider) consumes Grok16 `g16-combinatronic-rebalance.py`. KILROY Field Die enforces determinism at the syscall boundary — upstream combinatorics, downstream passthrough.

## What we know now

1. **Dual surfaces work** — `:9477/field` browser + Queen RTX native shell
2. **Grok16 + AmmoOS speak same field language** — verify gate PASS
3. **Tristate is non-destructive** — guest OS stays substrate until KILROY boot
4. **Repo hygiene next** — mirror Grok16 tighter structure post-Taco