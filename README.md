# Down, Down, Down

An endless vertical-descent platformer: hold jump to open your wings, chain gems, dodge the storm, and see how deep you can get. Every 3800 m completes a full descent and the next one starts faster.

## Play

- **`DownDownDown.html`** — the whole game in one file. Double-click it; no server needed.
- **`dist/index.html`** — the same build prepared for hosting, with the four soundtrack files beside it.

Player profiles (shards, characters, trails, bests, settings) are stored in the browser's `localStorage`.

## Develop

```bash
npm start        # python -m http.server 8080, then open http://localhost:8080/
npm run smoke    # headless gameplay + level-generation checks
node tools/build-single.mjs   # rebuild DownDownDown.html and dist/
```

Source lives in `js/` with no dependencies or bundler. `tools/build-single.mjs` inlines the modules, CSS and HTML template into the single-file build.

## Deploy

### Netlify

Either connect the GitHub repo (Netlify reads `netlify.toml`, runs `node tools/build-single.mjs` and publishes `dist/`), or run the build locally and drag the `dist` folder onto <https://app.netlify.com/drop>.

### GitHub

```bash
git init -b main
git add -A
git commit -m "Down, Down, Down"
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main
```
