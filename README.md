# Soul Link Team Planner

Picks the strongest legal team from your linked Soul Link Nuzlocke encounters, for 2 or 3 players.

**Live site:** https://kartikey3112.github.io/soul-link-team-builder/

The whole app is the single self-contained `index.html` at the root of this repository. It needs no build step or server, so GitHub Pages serves it as is. Each visitor's run is saved in their own browser.

## Rebuilding the data

The Pokémon data comes from `@pkmn/dex@0.11.0`.

```sh
cd tools
npm install
npm run data    # writes data.json (1,091 species, 91 Megas)
npm run build   # injects data.json into src.html and copies the result to ../index.html
```

Edit `tools/src.html` for page changes, then run `npm run build`.
