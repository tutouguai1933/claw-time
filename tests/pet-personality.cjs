const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const modulePath = path.join(__dirname, '../assets/pet-interactions.js');
assert.ok(fs.existsSync(modulePath), 'personality interaction module exists');
const timers = [];
const pets = Array.from({length: 6}, (_, trait) => ({name: `pet${trait}`, trait}));
const rendered = [];
const context = {
  window: {matchMedia: () => ({matches: true})},
  getPet: pid => pets[pid],
  DOG_LIST: pets.map((_, pid) => ({exprs: [0,1,2].map(e => `${pid}-${e}.svg`)})),
  petDressedExpr: (pid, size, full, expr) => {rendered.push({pid, size, expr}); return `<dressed outfit="saved" pet="${pid}" expr="${expr}">`;},
  setTimeout: (fn, ms) => {timers.push({fn, ms}); return timers.length;}, clearTimeout: () => {},
  Math, console
};
vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), context);
const api = context.window.PetInteractions;
assert.ok(api && api.choose && api.solo && api.pair);
for (const mode of ['play','bicker','eat','reconcile']) {
  const spoken = pets.map(pet => api.choose(pet, 'pk:' + mode));
  assert.equal(new Set(spoken.map(r => r.text)).size, 6, 'PK ' + mode + ' uses six distinct personality voices');
  spoken.forEach(reaction => {
    assert.ok(Array.from(reaction.text).length <= 10, 'PK personality dialogue stays short');
    assert.equal(reaction.kind, mode === 'eat' ? 'share' : mode, 'PK scene matches its dialogue emotion');
  });
  const reply = api.choose({trait:1}, 'pk:' + mode, {trait:1});
  assert.notEqual(reply.text, reply.otherText, 'same personality PK partners answer each other');
}
api.configure({random: () => 0});
const originalTouch = new Set(['汪！','嘿嘿～','蹭蹭你！','想要零食！','陪我玩！','❤️','嘿嘿！','蹭！','想吃！','别戳我！','摇尾巴~','哼！','开心！']);
const originalPair = new Set(['蹭蹭','抢玩具','一起看窗外','追尾巴','分享零食','打滚','互相闻闻','扑蝴蝶']);
const bickerLines = new Set(['玩具轮流嘛','我还没玩够','别抢嘛…','轻一点呀','嘿，被发现了','这回让给你','哼，我先的！','不许抢玩具！','哼，幼稚','我才没生气','留我一口！','不许抢饭饭！']);
for (const pet of pets) {
  for (let i=0;i<7;i++) {
    assert.ok(originalTouch.has(api.choose(pet,'touch').text),'touch uses the original prototype short dialogue');
    const meeting=api.choose(pet,'pair');
    assert.ok((['bicker','sulk','grumble'].includes(meeting.kind)?bickerLines:originalPair).has(meeting.text),'meetings keep short dialogue and personality-specific disagreements');
  }
}
assert.equal(api.choose({trait:0,line:'「你回来啦！今天想干点啥？」'},'arrival').text,'你回来啦！今天想干点啥？','arrival keeps the original greeting within 12 characters');
for(let i=0;i<7;i++)assert.notEqual(api.choose({trait:0,kind:'cat'},'touch').text,'汪！','cats do not bark');
const voices = pets.map(p => api.choose(p, 'touch').text);
assert.equal(new Set(voices).size, 6, 'all six traits have distinct voices');
for (const pet of pets) {
  const seen = new Set(); let previous;
  for (let i = 0; i < 40; i++) {
    const reaction = api.choose(pet, 'touch');
    assert.ok(Array.from(reaction.text).length <= 12, 'every built-in personality line has at most 12 characters');
    assert.ok(!/[（）()]/.test(reaction.text), 'built-in lines contain no narrated asides');
    assert.notEqual(reaction.text, previous, 'no consecutive repeated lines even with constant random');
    assert.ok([0, 1, 2].includes(reaction.expression));
    seen.add(reaction.kind); previous = reaction.text;
  }
  assert.ok(seen.size >= 5, 'random pool covers varied emotions');
}
const switchingContextPet = {trait: 0};
assert.notEqual(api.choose(switchingContextPet, 'touch').text, api.choose(switchingContextPet, 'idle').text,
  'switching touch and idle context still avoids consecutive repeats');
assert.ok(api.choose({name: 'future'}, 'touch').text, 'unknown future pet has fallback');
assert.ok(originalTouch.has(api.choose({personality: 'shy'}, 'touch').text));
assert.equal(api.choose({reactions: ['自定义轻声问好']}, 'touch').text, '自定义轻声问好');
assert.equal(api.choose({reactions: {touch: [{kind: 'share', text: '<b>小饼干</b>', expression: 2}]}}, 'touch').text, '<b>小饼干</b>');
assert.equal(api.choose({reactions: [{text: '你先吃', otherText: '谢谢呀', otherExpression: 1}]}, 'pair', pets[0]).otherExpression, 1, 'custom pair can override the other expression');
assert.ok(api.choose({reactions: {touch: []}}, 'touch').text, 'empty custom reactions fall back');
for (const pet of [{}, {trait: 99}, {reactions: {default: []}}]) {
  for (let i = 0; i < 7; i++) assert.ok(Array.from(api.choose(pet, 'idle').text).length <= 12, 'fallback is concise too');
}
const customLongText = '这是用户亲手写的很长很长的一句话，请完整保留。';
assert.equal(api.choose({reactions: {default: [customLongText]}}, 'idle').text, customLongText, 'user authored reactions are never shortened');
function node() {
  const classes = new Set();
  const bubble = {textContent: '', classList: {add() {}, remove() {}}};
  const dressed = {outerHTML: 'saved outfit', style: {maskImage:'url(test-current-furniture-mask)',clipPath:''}};
  return {isConnected: true, dataset: {}, style: {left: '16%', top: '50%'},
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x)},
    querySelector: selector => selector === '.dressed' ? dressed : selector === '.cb' ? bubble : null,
    _bubble: bubble, _dressed: dressed};
}
let completed = 0;
api.configure({onSolo: () => completed++});
const host = node();
api.solo(0, host, host._bubble);
assert.equal(host.classList.contains('pet-motion-hop'), false, 'reduced motion never starts animation');
assert.equal(completed, 1, 'interaction task callback fires once');
assert.ok(host._bubble.textContent);
assert.ok(host._dressed.outerHTML.includes('saved'), 'dressing renderer preserves saved outfit');
assert.equal(host._dressed.style.maskImage,'url(test-current-furniture-mask)','expression replacement preserves the current furniture mask');
const a = {dogIdx: 3, expr: 0, home: {x: 16, y: 50}, el: node()};
const b = {dogIdx: 1, expr: 0, home: {x: 64, y: 64}, el: node()};
const container = {isConnected: true, contains: el => el === a.el || el === b.el};
const result = api.pair(a, b, container);
assert.ok(result.otherText);
assert.notEqual(a.el._bubble.textContent, b.el._bubble.textContent, 'both pets speak in their own voice');
assert.equal(a.el.style.left, '16%', 'interaction does not change positions');
assert.equal(b.dogIdx, 1, 'interaction does not change identity');
assert.ok(a.el._dressed.outerHTML.includes('saved'), 'pair preserves dressing');
const oldText = b.el._bubble.textContent;
b.el.isConnected = false;
timers.splice(0).sort((a, b) => a.ms - b.ms).forEach(timer => timer.fn());
assert.equal(b.el._bubble.textContent, oldText, 'delayed feedback ignores detached account DOM');
assert.equal(host.classList.contains('pet-motion-hop'), false, 'reduced motion avoids animation class');
assert.equal(api.pair(a, b, {contains: () => false}), null, 'reject pets outside requested scene');
b.el.isConnected = true;
api.reset();
let disagreement;
for (let i = 0; i < 7; i++) {
  const current = api.pair(a, b, container);
  if (current.kind === 'bicker') {disagreement = current; break;}
}
assert.ok(disagreement, 'pair pool includes gentle disagreements');
timers.filter(timer => timer.ms === 2300).forEach(timer => timer.fn());
assert.equal(a.el.dataset.petMood, 'reconcile', 'disagreement ends with reconciliation');
assert.match(a.el._bubble.textContent, /和好/);
assert.match(b.el._bubble.textContent, /和好/);
assert.notEqual(a.el._bubble.textContent, b.el._bubble.textContent, 'reconciliation keeps both voices');
timers.length = 0;
api.solo(0, host, host._bubble);
api.reset();
assert.equal(host.dataset.petMood, undefined, 'account reset clears mood on reused main pet wrapper');
assert.equal(host._bubble.textContent, '', 'account reset clears previous account dialogue');
timers.forEach(timer => timer.fn());
assert.equal(host._bubble.textContent, '', 'account reset invalidates pending callbacks');
for(let i=0;i<7;i++){
 const samePersonality=api.choose({trait:1},'pair',{trait:1});
 assert.notEqual(samePersonality.text,samePersonality.otherText,'two pets sharing a personality still answer instead of parroting');
}
console.log('PASS pet personality: six voices, diverse emotions, no repeats, future/custom reactions, same-trait replies, safe pair and callbacks');
