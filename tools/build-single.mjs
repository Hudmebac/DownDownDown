import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const ORDER = [
  'js/core/utils.js',
  'js/game/config.js',
  'js/game/progress.js',
  'js/game/profiles.js',
  'js/core/input.js',
  'js/core/audio.js',
  'js/core/fx.js',
  'js/game/levelgen.js',
  'js/game/entities.js',
  'js/game/world.js',
  'js/game/player.js',
  'js/game/ui.js',
  'js/game/hud.js',
  'js/game/screens.js',
  'js/game/game.js',
];

const seen = new Map();
const chunks = [];

for (const rel of ORDER) {
  const file = path.join(root, rel);
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  const kept = [];
  let inImport = false;

  for (const line of lines) {
    if (inImport) {
      if (/\bfrom\s+['"][^'"]+['"];?\s*$/.test(line) || /^\s*['"][^'"]+['"];?\s*$/.test(line)) inImport = false;
      continue;
    }
    if (/^\s*import\s/.test(line)) {
      if (!/\bfrom\s+['"][^'"]+['"]/.test(line) && !/^\s*import\s+['"]/.test(line)) inImport = true;
      continue;
    }
    kept.push(line);
  }

  let src = kept.join('\n').replace(/^export\s+/gm, '');
  if (/^\s*(import|export)\b/m.test(src)) {
    throw new Error(`module syntax left behind in ${rel}`);
  }

  const decl = /^(?:export\s+)?(?:async\s+)?(?:class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = decl.exec(src))) {
    const name = m[1];
    if (seen.has(name)) {
      throw new Error(`top-level name collision: "${name}" in ${rel} and ${seen.get(name)}`);
    }
    seen.set(name, rel);
  }

  chunks.push(`/* ---- ${rel} ---- */\n${src.trim()}\n`);
}

const bootstrap = `
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.start();
window.game = game;
`;

const script = `(function () {\n'use strict';\n${chunks.join('\n')}\n${bootstrap}\n})();\n`;
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#070a14">
  <title>Down, Down, Down</title>
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <style>
${css}
  </style>
  <style>
    #fatal-error {
      position: fixed;
      inset: 0;
      margin: 0;
      padding: 28px;
      background: #1a0508;
      color: #ffd7d7;
      font: 13px/1.6 Consolas, "Courier New", monospace;
      white-space: pre-wrap;
      overflow: auto;
      z-index: 999;
    }
    #fatal-error[hidden] { display: none; }
  </style>
</head>
<body>
  <main id="stage">
    <canvas id="gameCanvas" width="960" height="600" aria-label="Down, Down, Down — an endless descent"></canvas>
  </main>
  <div id="rotate-hint" hidden>
    <section class="rotate-card">
      <p class="eyebrow">Mobile app mode</p>
      <h1>Turn your phone sideways</h1>
      <p>Down, Down, Down is a landscape game. Rotate the device and it fills the screen edge to edge.</p>
      <div class="rotate-actions">
        <button id="rotate-dismiss" type="button">Play anyway</button>
        <button id="rotate-desktop" type="button">Use desktop mode</button>
      </div>
    </section>
  </div>
  <pre id="fatal-error" hidden></pre>
  <noscript>Down, Down, Down needs JavaScript enabled.</noscript>
  <script>
    function showFatal(message) {
      var box = document.getElementById('fatal-error');
      if (!box) return;
      box.hidden = false;
      box.textContent = 'Down, Down, Down failed to start.\\n\\n' + message + '\\n\\nSend this message back and it can be fixed.';
    }
    window.addEventListener('error', function (event) {
      showFatal((event.message || 'Unknown error') + '\\n' + (event.filename || '') + (event.lineno ? ':' + event.lineno : ''));
    });
  </script>
  <script>
    try {
${script}
    } catch (err) {
      showFatal(err && err.stack ? err.stack : String(err));
      throw err;
    }
  </script>
</body>
</html>
`;

const outPath = path.join(root, 'DownDownDown.html');
fs.writeFileSync(outPath, html, 'utf8');

// Deployable site: one HTML file plus only the audio it actually uses.
const distDir = path.join(root, 'dist');
const distSound = path.join(distDir, 'public', 'sound');
fs.mkdirSync(distSound, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
fs.copyFileSync(path.join(root, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
const usedSound = ['down.mp3', 'downinst.mp3', 'downbeetinst.mp3', 'downstars.mp3'];
for (const file of usedSound) {
  const src = path.join(root, 'public', 'sound', file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(distSound, file));
}

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`built DownDownDown.html (${kb} KB, ${ORDER.length} modules, ${seen.size} top-level names)`);
console.log(`built dist/ (index.html + ${usedSound.length} tracks)`);
