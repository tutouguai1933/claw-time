const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {randomFillSync} = require('node:crypto');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/cloud-profile-store.js'), 'utf8');
function storage(seed = []) {
  const data = new Map(seed);
  return {get length() {return data.size;}, key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k), data};
}
function page(localStorage, sessionStorage = storage(), type = 'navigate') {
  const window = {addEventListener() {}, CLAW_CONFIG: {}, crypto: {getRandomValues: randomFillSync}, sessionStorage,
    performance: {getEntriesByType: () => [{type}]}};
  vm.runInNewContext(source, {window, localStorage, sessionStorage, setTimeout: () => 1, clearTimeout() {}, AbortController});
  const store = new window.CloudProfileStore();
  store.defaults = {}; store.guest = {};
  store.adopt({user: {id: 'alice', username: 'Alice'}, snapshot: {tasks: []}, revision: 0});
  return {store, sessionStorage};
}
const value = store => JSON.parse(JSON.stringify(store.snapshot));
test('one tab acknowledgement cannot erase another tab durable pending edits', async () => {
  const local = storage();
  const a = page(local), b = page(local);
  a.store.save({tasks: ['A']}); b.store.save({tasks: ['B']});
  a.store.request = async () => ({revision: 1});
  await a.store.flush();
  const reloaded = page(local, b.sessionStorage, 'reload');
  assert.deepEqual(value(reloaded.store), {tasks: ['B']});
  assert.equal(reloaded.store.dirty, true);
  reloaded.store.request = async () => {const error = new Error('conflict'); error.code = 'PROFILE_CONFLICT'; throw error;};
  await assert.rejects(reloaded.store.flush());
  assert.ok([...local.data.values()].some(raw => JSON.parse(raw).dirty && JSON.parse(raw).snapshot.tasks[0] === 'B'));
});
test('new tabs with cloned sessionStorage get independent outboxes; reload retains identity', () => {
  const local = storage(), a = page(local);
  a.store.save({tasks: ['A']});
  const clone = page(local, storage(a.sessionStorage.data));
  clone.store.save({tasks: ['cloned tab']});
  assert.deepEqual(value(page(local, a.sessionStorage, 'reload').store), {tasks: ['A']});
  assert.deepEqual(value(page(local, clone.sessionStorage, 'reload').store), {tasks: ['cloned tab']});
});
test('closed-tab and legacy pending copies remain available for recovery and export', async () => {
  const local = storage();
  local.setItem('claw-time.cloud.pending:alice', JSON.stringify({dirty: true, revision: 0, snapshot: {tasks: ['legacy']}}));
  const current = page(local);
  assert.deepEqual(value(current.store), {tasks: ['legacy']});
  current.store.save({tasks: ['new']}); current.store.request = async () => ({revision: 1});
  await current.store.flush();
  assert.ok(local.getItem('claw-time.cloud.pending:alice'));
  assert.ok(current.store.recoverableOutboxes.some(entry => entry.snapshot.tasks[0] === 'legacy'));
});
test('multiple closed-tab pending copies are preserved and exposed without merging', () => {
  const local = storage(), a = page(local), b = page(local);
  a.store.save({tasks: ['A']}); b.store.save({tasks: ['B']});
  const recovery = page(local).store;
  assert.deepEqual(value(recovery), {tasks: []});
  assert.deepEqual(Array.from(recovery.recoverableOutboxes, entry => entry.snapshot.tasks[0]).sort(), ['A', 'B']);
});
test('recovered outbox acknowledgements never delete a newer source entry', async () => {
  const local = storage(), a = page(local);
  a.store.save({tasks: ['original']});
  const recovery = page(local).store;
  recovery.request = async () => {a.store.save({tasks: ['newer']}); return {revision: 1};};
  await recovery.flush();
  assert.deepEqual(value(page(local, a.sessionStorage, 'reload').store), {tasks: ['newer']});
});
test('malformed incoming cached copy cannot partially change the current account identity', () => {
  const local = storage(), {store} = page(local);
  local.setItem('claw-time.cloud.pending:bob', JSON.stringify({dirty: true, revision: 0}));
  assert.throws(() => store.adopt({user: {id: 'bob'}, revision: 0, snapshot: {tasks: ['Bob']}}));
  assert.equal(store.user.id, 'alice');
  assert.deepEqual(value(store), {tasks: []});
});

test('explicit cloud reload preserves other dirty copies without adopting them again', async () => {
  const local = storage(), first = page(local);
  first.store.save({tasks: ['offline copy']});
  const current = page(local).store;
  current.request = async () => ({user: {id: 'alice', username: 'Alice'}, revision: 2, snapshot: {tasks: ['cloud latest']}});
  await current.reload();
  assert.deepEqual(value(current), {tasks: ['cloud latest']});
  assert.equal(current.status, 'synced');
  assert.ok(current.recoverableOutboxes.some(entry => entry.snapshot.tasks[0] === 'offline copy'));
});

test('acknowledged recovered copies are retained but never resurrected as pending', async () => {
  const local = storage(), first = page(local);
  first.store.save({tasks: ['recovered']});
  const recovery = page(local).store;
  recovery.request = async () => ({revision: 1});
  await recovery.flush();
  assert.ok(local.getItem(first.store.outboxKey), 'never delete another page outbox');
  assert.equal(recovery.recoverableOutboxes.length, 0);
  first.store.save({tasks: ['new after acknowledgement']});
  assert.equal(recovery.recoverableOutboxes.length, 1, 'a new edit gets a new identity and stays recoverable');
});
