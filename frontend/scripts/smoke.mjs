import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const require = createRequire(import.meta.url);
async function compile(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const model = await compile('src/model.ts');
const ids = new Set(model.seed.map(s => s.id));
assert.equal(ids.size, model.seed.length, 'Skill IDs must be unique');
assert.equal(model.categories.length, 20);
assert.equal(model.seed.length, 186);
assert.equal(new Set(model.categories.map(c => c.id)).size, model.categories.length);
assert.ok(model.categories.every(c => model.seed.some(s => s.category === c.id)));
assert.ok(model.seed.slice(29).every(s => s.level === null && s.interest === 0 && !s.pinned && !s.lastUsed));
assert.ok(model.matchesQuery(model.seed.find(s => s.id === 'photoshop'), 'フォトショ'));
assert.ok(model.matchesQuery(model.seed.find(s => s.id === 'sheets'), 'スプシ'));
assert.ok(model.matchesQuery(model.seed.find(s => s.id === 'react'), 'ｒｅａｃｔ'));
assert.equal(model.kindOf(model.seed.find(s => s.id === 'typescript')), 'language');
assert.equal(model.kindOf(model.seed.find(s => s.id === 'canva')), 'tool');
for (const skill of model.seed) {
  assert.ok(model.categories.some(c => c.id === skill.category));
  for (const id of skill.related) assert.ok(ids.has(id), `${skill.id} references missing skill ${id}`);
}
assert.equal(model.loadSkills().find(s => s.id === 'freertos').level, 3);
localStorage.setItem(model.storageKey, JSON.stringify([{ id: 'freertos', level: 4, interest: 0, pinned: false }]));
const restored = model.loadSkills().find(s => s.id === 'freertos');
assert.equal(restored.level, 4);
assert.equal(restored.interest, 0);
assert.equal(restored.pinned, false);
assert.equal(model.loadSkills().length, 186, 'Existing browser data must receive the new catalog');
assert.equal(model.loadSkills().find(s => s.id === 'excel').level, null);
localStorage.setItem(model.storageKey, JSON.stringify([{ id: 'freertos', level: 99, interest: -1 }]));
assert.equal(model.loadSkills().find(s => s.id === 'freertos').level, 3);
localStorage.setItem(model.storageKey, 'broken-json');
assert.equal(model.loadSkills().length, model.seed.length);
assert.ok(!model.sector(112, 226, 0, 73).includes('NaN'));
assert.ok(model.sector(112, 226, .5, 359.5).includes('0 1 1'), 'Focused category must render a large arc');
const { default: MapExplorer } = await compile('src/MapExplorer.tsx');
const mapHtml = renderToString(createElement(MapExplorer, { skills: model.seed, selected: model.seed.find(s => s.id === 'freertos'), select: () => {}, query: '', levelFilter: undefined }));
assert.ok(mapHtml.includes('Web・AI') && mapHtml.includes('マップのカテゴリ'));
assert.ok(!mapHtml.includes('NaN'));
values.clear();
const { default: App } = await compile('src/App.tsx');
const html = renderToString(createElement(App));
for (const label of ['SkillTopo', 'スキルを読み込んでいます']) assert.ok(html.includes(label), `Initial render missing ${label}`);
assert.ok(!html.includes('NaN'));

const persistence = await compile('src/persistence.ts');
const blank = persistence.blankProfile();
assert.ok(blank.skills.every(s => s.level === null && s.interest === 0 && !s.pinned && !s.notes && !s.lastUsed));
const sparse = { ...blank, userName: 'サンプル A', skills: [{ ...blank.skills[0], level: 4, notes: '実務で使用' }] };
const imported = persistence.parseProfile(JSON.stringify(sparse));
assert.equal(imported.userName, 'サンプル A');
assert.equal(imported.skills.length, 186);
assert.equal(imported.skills[0].notes, '実務で使用');
assert.ok(imported.skills.slice(1).every(s => s.level === null));
for (const invalid of [{ ...sparse, version: 2 }, { ...sparse, userName: '' }, { ...sparse, skills: [] }, { ...sparse, skills: [{ ...sparse.skills[0], level: 5 }] }, { ...sparse, skills: [{ ...sparse.skills[0], related: ['missing'] }] }]) {
  assert.throws(() => persistence.parseProfile(JSON.stringify(invalid)));
}
assert.equal((await persistence.initialProfile()).path, null);
const calls = [];
let finishFirst;
globalThis.window = { __TAURI__: { core: { invoke: async (command, args) => {
  calls.push({ command, args });
  if (command === 'initial_profile') return { profile: blank, path: null, dirty: false };
  if (command === 'save_profile') {
    await new Promise(resolve => { finishFirst = resolve; });
  }
} } } };
assert.equal((await persistence.initialProfile()).profile.skills.length, 186);
const snapshot = structuredClone(blank);
const firstSave = persistence.saveProfile(snapshot, true);
snapshot.userName = 'changed after save';
snapshot.skills[0].level = 4;
await new Promise(resolve => setImmediate(resolve));
finishFirst();
await firstSave;
assert.equal(calls[1].args.profile.userName, blank.userName, 'Save must capture a profile snapshot');
assert.equal(calls[1].args.profile.skills[0].level, null);
assert.equal(calls[1].args.saveAs, true);
window.__TAURI__.core.invoke = async () => null;
assert.equal(await persistence.openProfile(false), null, 'Cancelling a picker leaves the current document intact');
window.__TAURI__.core.invoke = async () => { throw new Error('disk full'); };
await assert.rejects(persistence.saveProfile(blank), /disk full/);
await assert.rejects(persistence.openProfile(false), /disk full/, 'Desktop errors must not silently fall back to browser data');
console.log(`PASS: ${model.seed.length} skills; startup render; profile validation; sparse import; native IPC; save snapshots; cancellation and error propagation.`);
