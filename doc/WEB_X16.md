# Commander X16 web build

This edition keeps Furnace's tracker UI and song format, but exposes only the
Commander X16 sound configuration: YM2151 (OPM) plus VERA.

## Build

Install Emscripten and run:

```sh
./scripts/build-web-x16.sh
```

The output is `build/web-x16/furnace.html` with its JavaScript and Wasm files.
Serve the directory over HTTP; opening the HTML through `file://` will not load
the Wasm module correctly.

```sh
python3 -m http.server 8000 --directory build/web-x16
```

Then open <http://localhost:8000/furnace.html>.

The browser build uses SDL2 and OpenGL ES through Emscripten. Settings and
tracker state are mirrored to IndexedDB. Open imports a local file into the
browser filesystem, while saving a song downloads the resulting file.
