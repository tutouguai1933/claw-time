// Only mechanical PNG preparation: original AI-colored artwork is never redrawn.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PNG } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'assets/cats-v1');
const input = path.join(dest, 'atlas.png');
const atlas = PNG.sync.read(fs.readFileSync(input));
const labels = new Int32Array(atlas.width * atlas.height);
const components = [];
const threshold = 8;
for (let start = 0; start < labels.length; start++) {
  if (labels[start] || atlas.data[start * 4 + 3] <= threshold) continue;
  const label = components.length + 1, queue = [start];
  labels[start] = label;
  let left = atlas.width, top = atlas.height, right = 0, bottom = 0;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head], x = p % atlas.width, y = Math.floor(p / atlas.width);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
    for (const n of [x ? p - 1 : -1, x < atlas.width - 1 ? p + 1 : -1, y ? p - atlas.width : -1, y < atlas.height - 1 ? p + atlas.width : -1]) {
      if (n >= 0 && !labels[n] && atlas.data[n * 4 + 3] > threshold) { labels[n] = label; queue.push(n); }
    }
  }
  components.push({ label, area: queue.length, left, top, right, bottom });
}
const sprites = components.filter(c => c.area > 1000);
if (sprites.length !== 18) throw new Error('Expected exactly 18 separate cats, got ' + sprites.length);
const names = ['辣椒', '奶球', '煤球', '芝麻', '布丁', '团子'];
const breeds = ['三花猫', '白猫', '黑猫', '奶牛猫', '暹罗猫', '橘猫'];
const rowCenters = [160, 420, 705];
const manifest = [];
const preview = new PNG({ width: 6 * 288, height: 3 * 288 });
for (const c of sprites) {
  const pet = Math.min(5, Math.floor(((c.left + c.right) / 2) / (atlas.width / 6)));
  const cy = (c.top + c.bottom) / 2;
  const expr = rowCenters.map(v => Math.abs(v - cy)).indexOf(Math.min(...rowCenters.map(v => Math.abs(v - cy))));
  if (manifest.some(v => v.pet === pet && v.expr === expr)) throw new Error('Duplicate sprite cell');
  const out = new PNG({ width: 288, height: 288 });
  const width = c.right - c.left + 1, height = c.bottom - c.top + 1;
  const ox = Math.floor((288 - width) / 2), oy = 276 - height;
  if (ox < 4 || oy < 4) throw new Error('Sprite exceeds safe common canvas');
  for (let y = Math.max(0, c.top - 1); y <= Math.min(atlas.height - 1, c.bottom + 1); y++) {
    for (let x = Math.max(0, c.left - 1); x <= Math.min(atlas.width - 1, c.right + 1); x++) {
      const ai = y * atlas.width + x;
      // Retain the connected character and low-alpha antialias halo, excluding other characters.
      if (labels[ai] !== c.label && (labels[ai] || atlas.data[ai * 4 + 3] > threshold)) continue;
      const dx = x - c.left + ox, dy = y - c.top + oy;
      if (dx < 0 || dx >= 288 || dy < 0 || dy >= 288) continue;
      const di = (dy * 288 + dx) * 4;
      atlas.data.copy(out.data, di, ai * 4, ai * 4 + 4);
    }
  }
  // Transparent pixels completely enclosed by ink are alpha defects, not the exterior.
  // Protect cream/white eye and body interiors, while outside and between-paw gaps stay transparent.
  const exterior = new Uint8Array(288 * 288), queue = [];
  for (let y = 0; y < 288; y++) for (let x = 0; x < 288; x++) if (x === 0 || y === 0 || x === 287 || y === 287) {
    const i = y * 288 + x;
    if (!exterior[i] && out.data[i * 4 + 3] <= threshold) { exterior[i] = 1; queue.push(i); }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % 288, y = Math.floor(i / 288);
    for (const n of [x ? i - 1 : -1, x < 287 ? i + 1 : -1, y ? i - 288 : -1, y < 287 ? i + 288 : -1]) if (n >= 0 && !exterior[n] && out.data[n * 4 + 3] <= threshold) { exterior[n] = 1; queue.push(n); }
  }
  let alphaRepairs = 0;
  for (let i = 0; i < exterior.length; i++) if (!exterior[i] && out.data[i * 4 + 3] <= threshold) {
    out.data.set([255, 244, 228, 255], i * 4); alphaRepairs++;
  }
  const bytes = PNG.sync.write(out), basename = `cat-${pet}-${expr}`;
  fs.writeFileSync(path.join(dest, basename + '.png'), bytes);
  fs.writeFileSync(path.join(dest, basename + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="288" height="288" viewBox="0 0 288 288"><image width="288" height="288" href="data:image/png;base64,${bytes.toString('base64')}"/></svg>\n`);
  PNG.bitblt(out, preview, 0, 0, 288, 288, pet * 288, expr * 288);
  manifest.push({ pet, expr, name: names[pet], breed: breeds[pet], png: basename + '.png', svg: basename + '.svg', width: 288, height: 288, bounds: [ox, oy, width, height], baseline: 276, atlasBounds: [c.left, c.top, width, height], alphaRepairs, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
manifest.sort((a, b) => a.pet - b.pet || a.expr - b.expr);
fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(dest, 'preview.png'), PNG.sync.write(preview));
const creamPreview = PNG.sync.read(PNG.sync.write(preview));
for (let i = 0; i < creamPreview.width * creamPreview.height; i++) {
  const a = creamPreview.data[i * 4 + 3] / 255;
  for (let channel = 0; channel < 3; channel++) creamPreview.data[i * 4 + channel] = Math.round(creamPreview.data[i * 4 + channel] * a + [255, 249, 238][channel] * (1 - a));
  creamPreview.data[i * 4 + 3] = 255;
}
fs.writeFileSync(path.join(dest, 'preview-cream.png'), PNG.sync.write(creamPreview));
console.log(`Prepared ${manifest.length} transparent cat sprites on aligned 288×288 canvases; ${manifest.reduce((n, v) => n + v.alphaRepairs, 0)} enclosed-alpha repairs.`);
