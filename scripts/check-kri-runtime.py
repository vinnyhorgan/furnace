#!/usr/bin/env python3
"""Exercise Kri demo conversion and exports with a native headless build."""

from __future__ import annotations

import array
import math
import pathlib
import subprocess
import sys
import tempfile
import wave


ROOT = pathlib.Path(__file__).resolve().parents[1]


def run(binary: pathlib.Path, *arguments: str) -> None:
    result = subprocess.run(
        [
            str(binary),
            "-noreport",
            "-nostatus",
            "-loglevel",
            "warning",
            *arguments,
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip())


def main() -> int:
    if len(sys.argv) != 2:
        print(f"usage: {sys.argv[0]} /path/to/kri-furnace", file=sys.stderr)
        return 2
    binary = pathlib.Path(sys.argv[1]).resolve()
    entries = [
        line.split("|", 2)
        for line in (ROOT / "res" / "kri-demos.txt").read_text().splitlines()
    ]

    with tempfile.TemporaryDirectory(prefix="kri-runtime-") as temp_name:
        temp = pathlib.Path(temp_name)
        for index, (_group, name, relative) in enumerate(entries):
            output = temp / f"{index}.zsm"
            run(binary, "-romout", str(output), relative)
            data = output.read_bytes()
            if len(data) < 17 or data[:3] != b"zm\x01" or data[-1] != 0x80:
                raise RuntimeError(f"{name}: malformed zsm")
            loop_offset = int.from_bytes(data[3:6], "little")
            pcm_offset = int.from_bytes(data[6:9], "little")
            psg_mask = int.from_bytes(data[10:12], "little")
            if loop_offset and not 16 <= loop_offset < len(data):
                raise RuntimeError(f"{name}: invalid zsm loop offset {loop_offset}")
            if pcm_offset:
                raise RuntimeError(f"{name}: kri zsm unexpectedly contains pcm")
            if psg_mask & ~0x00FF:
                raise RuntimeError(f"{name}: kri zsm uses more than eight psg voices")

        identity_wav = temp / "identity.wav"
        run(
            binary,
            "-loops",
            "1",
            "-output",
            str(identity_wav),
            "demos/x16/Identity_Believer.fur",
        )
        with wave.open(str(identity_wav), "rb") as wav:
            samples = array.array("h", wav.readframes(wav.getnframes()))
        rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
        if rms < 10.0:
            raise RuntimeError(f"identity believer conversion is silent (rms {rms:.2f})")

    print(f"kri runtime ok: {len(entries)} zsm exports; identity rms {rms:.2f}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, wave.Error) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
