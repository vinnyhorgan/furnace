# kri web build

the kri edition is a browser-first tracker for kri's fixed audio hardware:

- one yamaha ym2151 at 3.58 mhz
- one 25 mhz, eight-voice vera-compatible psg
- no pcm

commander x16 vera demos are polyphony-packed into the eight available kri
voices when loaded. songs whose overlapping musical lines cannot be packed
cleanly into eight voices show a conversion warning.

kri `.fur` files use the kri system id and are intended for this fork. wave
export renders audio. zsm export produces an uncompressed register stream, not
a complete rom, so large songs may need to be shortened, optimized or streamed.

settings and recovery snapshots are stored locally in the browser. the status
pill reports saved, unsaved, syncing and failed states; hover it to see quota
usage. kri warns before closing an unsaved project, keeps the latest 20
snapshots, and exposes `recover project...` plus a one-click recovery archive
under `file`.

the interface uses dawnbringer's dawnbringer16 palette.

```sh
./scripts/build-web-kri.sh
```

the output is in `build/web-kri`. commits to `kri` deploy automatically to
[vinnyhorgan.github.io/furnace](https://vinnyhorgan.github.io/furnace/).
