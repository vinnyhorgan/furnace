#!/usr/bin/env python3
"""Check the source-level invariants of the kri edition."""

from __future__ import annotations

import pathlib
import struct
import sys
import zlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "res" / "kri-demos.txt"
YM2151 = 0x82
VERA = 0xAC


def furnace_systems(path: pathlib.Path) -> tuple[int, ...]:
    packed = path.read_bytes()
    try:
        data = zlib.decompress(packed)
    except zlib.error:
        data = packed
    if not data.startswith(b"-Furnace module-"):
        raise ValueError(f"{path}: not a Furnace module")
    info_offset = struct.unpack_from("<I", data, 20)[0]
    if data[info_offset : info_offset + 4] != b"INFO":
        raise ValueError(f"{path}: missing INFO block")
    system_ids = data[info_offset + 32 : info_offset + 64]
    return tuple(system_id for system_id in system_ids if system_id)


def main() -> int:
    errors: list[str] = []
    manifest_paths: set[pathlib.Path] = set()
    valid_groups = {"opm", "psg", "opm + psg"}

    for line_number, raw_line in enumerate(MANIFEST.read_text().splitlines(), 1):
        fields = raw_line.split("|")
        if len(fields) != 3:
            errors.append(f"{MANIFEST}:{line_number}: expected group|name|path")
            continue
        group, name, relative = fields
        path = pathlib.Path(relative)
        if group not in valid_groups:
            errors.append(f"{MANIFEST}:{line_number}: invalid group {group!r}")
        if not name or name != name.lower():
            errors.append(f"{MANIFEST}:{line_number}: demo name must be non-empty lowercase")
        if path in manifest_paths:
            errors.append(f"{MANIFEST}:{line_number}: duplicate {path}")
        manifest_paths.add(path)
        if not (ROOT / path).is_file():
            errors.append(f"{MANIFEST}:{line_number}: missing {path}")

    eligible: set[pathlib.Path] = set()
    allowed = {
        (YM2151,),
        (VERA,),
        (YM2151, VERA),
        (VERA, YM2151),
    }
    for path in (ROOT / "demos").rglob("*.fur"):
        if furnace_systems(path) in allowed:
            eligible.add(path.relative_to(ROOT))

    missing = eligible - manifest_paths
    extra = manifest_paths - eligible
    if missing:
        errors.append("eligible demos missing from manifest: " + ", ".join(map(str, sorted(missing))))
    if extra:
        errors.append("ineligible demos in manifest: " + ", ".join(map(str, sorted(extra))))

    if errors:
        print("\n".join(f"error: {error}" for error in errors), file=sys.stderr)
        return 1
    print(f"kri contract ok: {len(eligible)} eligible demos, manifest is complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
