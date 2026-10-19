const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {PNG} = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const dest = path.resolve(__dirname, '../assets/cats-v3');
assert.ok(fs.existsSync(path.join(dest, 'manifest.json')), 'new original-source cat manifest exists');
const manifest = JSON.parse(fs.readFileSync(path.join(dest, 'manifest.json')));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(path.join(dest, 'sources/original-user.png'));
const atlas = PNG.sync.read(source);
const original = 'D:/LiveSoftWare/WeChat/xwechat_files/wxid_2wb1oj9zyyfj12_ff8b/temp/RWTemp/2026-10/2524d25d0486307908f2efcf828a2342/48347aaaad78dfba6d02daca3416ef8f.png';
if (fs.existsSync(original)) assert.equal(hash(source), hash(fs.readFileSync(original)), 'supplied source is byte-for-byte intact');
assert.equal(manifest.length, 18);
assert.equal(new Set(manifest.map(v => `${v.pet}-${v.expr}`)).size, 18);
for (let pet = 0; pet < 6; pet++) {
  const variants = manifest.filter(v => v.pet === pet).sort((a,b) => a.expr-b.expr);
  const base = PNG.sync.read(fs.readFileSync(path.join(dest, variants[0].png)));
  assert.deepEqual(fs.readFileSync(path.join(dest, variants[0].base)), fs.readFileSync(path.join(dest, variants[0].png)), 'the common base is exactly expression zero');
  for (const v of variants) {
    const bytes = fs.readFileSync(path.join(dest, v.png));
    const p = PNG.sync.read(bytes);
    assert.equal(hash(bytes), v.sha256);
    assert.equal(v.sourceSha256, hash(source));
    assert.equal(p.width, 288); assert.equal(p.height, 288);
    assert.equal(v.baseline, 276);
    assert.deepEqual(v.bounds, variants[0].bounds, 'all expressions share exact subject registration');
    const svg = fs.readFileSync(path.join(dest, v.svg), 'utf8');
    assert.match(svg, /viewBox="0 0 288 288"/);
    assert.ok(svg.includes(v.baseSha256), 'SVG documents shared first-row base');
    let opaque = 0, transparent = 0, differences = 0, left=288,top=288,right=0,bottom=0;
    for (let y=0;y<288;y++) for(let x=0;x<288;x++) {
      const i=(y*288+x)*4, a=p.data[i+3];
      assert.equal(a, base.data[i+3], `${v.png}: silhouette alpha is invariant`);
      if(a>240) opaque++;
      if(a){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      if(a===0) transparent++;
      if(y===0||x===0||x===287||y===287) assert.equal(a,0,'exterior canvas border is transparent');
      if(v.expr===0&&a){
        const sx=x+v.atlasOffset[0],sy=y+v.atlasOffset[1],si=(sy*atlas.width+sx)*4;
        assert.ok(p.data.subarray(i,i+4).equals(atlas.data.subarray(si,si+4)), 'stable base retains every original first-row subject pixel');
      }
      const changed = !p.data.subarray(i,i+4).equals(base.data.subarray(i,i+4));
      if(changed) {
        differences++;
        assert.ok(x>=v.faceBounds[0]&&x<v.faceBounds[2]&&y>=v.faceBounds[1]&&y<v.faceBounds[3], `${v.png}: only internal face changes`);
        assert.ok(y<v.bodyTop, `${v.png}: body is pixel-identical across expressions`);
        for(let dy=-6;dy<=6;dy++) for(let dx=-6;dx<=6;dx++) {
          const n=((y+dy)*288+x+dx)*4;
          assert.ok(base.data[n+3]>240, `${v.png}: six-pixel protected exterior outline`);
        }
      }
    }
    assert.ok(opaque>25000, 'body and internal whites retain opacity');
    assert.deepEqual([left,top,right-left+1,bottom-top+1],v.bounds,'manifest bounds match actual raster');
    assert.equal(bottom+1,276,'actual raster baseline is 276');
    assert.ok(transparent>25000, 'exterior remains genuinely transparent');
    if(v.expr) assert.ok(differences>500, 'expression visibly changes');
  }
}
console.log('PASS: 18 original-source PNG/SVG cats; unchanged exterior, outline protection and body pixels; shared 288 canvas/baseline 276.');
