const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rafQueue = [];
const dynamicScripts = [];
const allElements = [];
let fullscreenRequests = 0;

function makeContext2d() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, key) {
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...items) { items.forEach(item => this.values.add(item)); }
  remove(...items) { items.forEach(item => this.values.delete(item)); }
  toggle(item, force) {
    const active = force === undefined ? !this.values.has(item) : !!force;
    if (active) this.values.add(item); else this.values.delete(item);
    return active;
  }
  contains(item) { return this.values.has(item); }
}

class FakeElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.classList = new FakeClassList();
    this.listeners = {};
    this._innerHTML = '';
    this.isConnected = true;
    allElements.push(this);
  }
  set className(value) {
    this._className = value;
    String(value).split(/\s+/).filter(Boolean).forEach(item => this.classList.add(item));
  }
  get className() { return this._className || ''; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    for (const match of this._innerHTML.matchAll(/<button[^>]*data-v="([^"]+)"[^>]*>/g)) {
      const button = new FakeElement('button');
      button.dataset.v = match[1];
      this.appendChild(button);
    }
    if (this._innerHTML.includes('<small')) this.appendChild(new FakeElement('small'));
  }
  get innerHTML() { return this._innerHTML; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  add(option) { this.appendChild(option); if (!this.value) this.value = option.value; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  setAttribute(name, value) { this[name] = String(value); }
  setPointerCapture() {}
  requestFullscreen() { fullscreenRequests++; return Promise.resolve(); }
  getBoundingClientRect() { return { width: 1800, height: 1000, left: 0, top: 0 }; }
  getContext() { return makeContext2d(); }
  click() {
    if (this.disabled) return;
    if (typeof this.onclick === 'function') this.onclick({ target: this });
    for (const handler of this.listeners.click || []) handler({ target: this });
  }
  querySelectorAll(selector) {
    const descendants = [];
    const visit = node => { for (const child of node.children) { descendants.push(child); visit(child); } };
    visit(this);
    if (selector === 'button') return descendants.filter(x => x.tagName === 'BUTTON');
    if (selector === 'button[data-v]') return descendants.filter(x => x.tagName === 'BUTTON' && x.dataset.v);
    if (selector === 'button[data-speed]') return descendants.filter(x => x.tagName === 'BUTTON' && x.dataset.speed);
    if (selector === '.laneControl') return descendants.filter(x => x.classList.contains('laneControl'));
    if (selector === '.unitBtn') return descendants.filter(x => x.classList.contains('unitBtn'));
    if (selector === '.spawn') return descendants.filter(x => x.classList.contains('spawn'));
    if (selector === '.hudActions') return descendants.filter(x => x.classList.contains('hudActions'));
    return [];
  }
  querySelector(selector) {
    if (selector === 'small') return this.querySelectorAllElements().find(x => x.tagName === 'SMALL') || null;
    if (selector === 'strong') return this.querySelectorAllElements().find(x => x.tagName === 'STRONG') || null;
    return this.querySelectorAll(selector)[0] || null;
  }
  querySelectorAllElements() {
    const result = [];
    const visit = node => { for (const child of node.children) { result.push(child); visit(child); } };
    visit(this);
    return result;
  }
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const id of ['menuPlay', 'menuRobots']) {
  const match = indexHtml.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`, 'i'));
  if (!match) throw new Error(`botão ${id} não existe no HTML real`);
  if (/\sdisabled(?:\s|=|>)/i.test(match[0] + '>')) throw new Error(`botão ${id} nasce disabled no HTML real`);
}

const mobileSource = fs.readFileSync(path.join(root, 'mobile-landscape-v1.js'), 'utf8');
if (!/orientation\?\.lock\?\.\('landscape'\)/.test(mobileSource)) throw new Error('botão fullscreen não solicita orientação horizontal');
if (/launchBattle\s*=/.test(mobileSource)) throw new Error('mobile ainda intercepta launchBattle');
const mobileCss = fs.readFileSync(path.join(root, 'mobile-landscape-v1.css'), 'utf8');
if (!/#fullscreenToggle[\s\S]*width:34px!important/.test(mobileCss)) throw new Error('botão fullscreen não foi compactado');
const androidSource = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/sticklanes/game/MainActivity.java'), 'utf8');
if (!/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/.test(androidSource)) throw new Error('APK não solicita orientação horizontal no fullscreen');

const elements = new Map();
const byId = id => {
  if (!elements.has(id)) elements.set(id, new FakeElement(id === 'game' ? 'canvas' : 'div', id));
  return elements.get(id);
};

[
  'mainMenu', 'setup', 'gameUI', 'f1', 'f2', 'pool', 'count', 'start', 'game',
  'menuPlay', 'menuRobots', 'backMenu', 'restart', 'laneControls', 'spawnbar',
  'factionIdentity', 'camLeft', 'camRight', 'camHome', 'camMid', 'camEnemy',
  'towerRanges', 'modeStatus', 'gold', 'playerBase', 'enemyBase', 'playerTowers',
  'enemyTowers', 'matchTimer', 'waveTimer', 'compName', 'saveComp', 'savedComps',
  'loadComp', 'deleteComp', 'compMessage', 'zoomBadge', 'bootStatus'
].forEach(byId);

const hudActions = new FakeElement('div');
hudActions.className = 'hudActions';
byId('gameUI').appendChild(hudActions);

const speedControls = byId('simSpeedControls');
for (const speed of ['1', '3', '10', '20']) {
  const button = new FakeElement('button');
  button.dataset.speed = speed;
  speedControls.appendChild(button);
}

const document = {
  head: new FakeElement('head'),
  body: new FakeElement('body'),
  documentElement: new FakeElement('html'),
  fullscreenElement: null,
  createElement: tag => new FakeElement(tag),
  addEventListener() {},
  exitFullscreen: () => Promise.resolve(),
  querySelector(selector) {
    if (selector === '#gameUI .hudActions') return hudActions;
    if (selector.startsWith('#')) return byId(selector.slice(1));
    if (selector === '.statusPill') return new FakeElement('span');
    if (selector === '.cameraBar .muted') return new FakeElement('span');
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.unitBtn') return allElements.filter(x => x.classList.contains('unitBtn'));
    if (selector === '.spawn') return allElements.filter(x => x.classList.contains('spawn'));
    if (selector === '.laneControl') return allElements.filter(x => x.classList.contains('laneControl'));
    return [];
  }
};

document.head.appendChild = script => { dynamicScripts.push(script); return script; };
document.body.appendChild = child => child;

const context = vm.createContext({
  console,
  document,
  window: null,
  location: { reload() {} },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  performance: { now: () => 0 },
  requestAnimationFrame: callback => { rafQueue.push(callback); return rafQueue.length; },
  cancelAnimationFrame() {},
  setTimeout: callback => { if (typeof callback === 'function') callback(); return 1; },
  clearTimeout() {},
  MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
  Image: class {
    set src(value) { this._src = value; if (typeof this.onload === 'function') this.onload(); }
    get src() { return this._src; }
  },
  Option: class extends FakeElement {
    constructor(text, value) { super('option'); this.text = text; this.value = value; }
  },
  crypto: { randomUUID: () => 'test-id' },
  screen: { orientation: {} },
  alert() {},
  Math,
  Date,
  Map,
  Set,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Promise
});
context.window = context;
context.innerWidth = 1800;
context.innerHeight = 1000;
context.scrollTo = () => {};
context.addEventListener = () => {};

function run(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}

const staticScripts = [
  'factions-v3.js', 'minion-speed-v1.js', 'balance-patch-v3-3.js',
  'game-v3-core.js', 'game-v3-visuals.js', 'extras.js',
  'map-sci-fi-v4.js', 'map-assets-v4.js', 'map-2_5d-v5.js',
  'map-layout-v5.js', 'movement-v6.js', 'minion-wave-v2.js',
  'turret-defense-v1.js',
  'visual-lote-01.js', 'visual-lote-02.js', 'visual-lote-03.js',
  'visual-lote-04.js', 'visual-lote-05.js', 'visual-team-structures.js',
  'visual-team-range.js', 'frontline-moba-v1.js', 'moba-square-v2.js',
  'mobile-landscape-v1.js', 'match-focus-v1.js'
];
staticScripts.forEach(run);

while (dynamicScripts.length) {
  const script = dynamicScripts.shift();
  const file = script.src.split('?')[0];
  run(file);
  if (typeof script.onload === 'function') script.onload();
}

if (byId('menuPlay').disabled || byId('menuRobots').disabled) throw new Error('menu está bloqueado antes do clique');
byId('menuRobots').click();
for (let frame = 1; frame <= 650; frame++) {
  const callback = rafQueue.shift();
  if (!callback) throw new Error(`quadro ${frame} não foi agendado`);
  callback(frame * 40);
}

const state = vm.runInContext(`({
  gameMode,
  running,
  loadoutSize: loadout.length,
  enemyLoadoutSize: enemyLoadout.length,
  factions: sideFactions[1],
  enemyFactions: sideFactions[-1],
  structures: structures.length,
  livingUnits: units.filter(unit=>!unit.dead).length,
  timeScale,
  matchTime,
  mapMeta:SL_MOBA_SQUARE_V2,
  unitSubs:[...new Set(units.filter(unit=>unit.minion).map(unit=>Math.round(unit.sub)))].sort((a,b)=>a-b),
  mainProgress:[0,1,2].map(lane=>structures.filter(s=>s.side===1&&s.lane===lane&&!s.auxiliary).map(s=>s.ownProgress)),
  uniqueStructureIds:new Set(structures.map(s=>s.id)).size,
  turretPairs:[...new Set(structures.filter(s=>s.auxiliary).map(s=>s.pairId))].map(id=>structures.filter(s=>s.pairId===id).map(s=>({x:s.x,sub:s.subOffset})))
})`, context);

const collision = vm.runInContext(`(()=>{
  const pair=structures.find(s=>s.auxiliary),direction=pair.side===1?1:-1;
  const probe={id:2,lane:pair.lane,sub:0,subTarget:0,x:pair.x-direction*180,speed:5,slowUntil:0,runTime:0,fac:'Teste'};
  move(probe,pair.x+direction*500,.1);return{target:probe.subTarget,sub:probe.sub}
})()`, context);

if (!byId('mainMenu').hidden) throw new Error('menu principal permaneceu visível');
if (byId('gameUI').hidden) throw new Error('interface da batalha permaneceu oculta');
if (state.gameMode !== 'robot' || !state.running) throw new Error('simulação assistida não iniciou');
if (state.loadoutSize !== 8 || state.enemyLoadoutSize !== 8) throw new Error('IA não montou os dois baralhos');
if (state.structures !== 60) throw new Error(`estruturas inválidas: ${state.structures}`);
if (state.uniqueStructureIds !== state.structures) throw new Error('estruturas sem IDs únicos');
if (state.mapMeta.mapWidth !== 6800 || state.mapMeta.mapHeight !== 6800 || state.mapMeta.subLaneGap !== 72) throw new Error('mapa expandido não foi aplicado');
if (Math.abs(state.mapMeta.routeLengths[0] - state.mapMeta.routeLengths[2]) > 1) throw new Error('top e bot não têm o mesmo comprimento');
if (!(state.mapMeta.routeLengths[1] < state.mapMeta.routeLengths[0])) throw new Error('mid deveria ser a rota mais curta');
if (state.mainProgress.some(row=>JSON.stringify(row)!==JSON.stringify([.1,.2,.3,.4]))) throw new Error('torres principais não usam posições percentuais comuns');
if (!state.turretPairs.every(pair=>pair.length===2&&pair[0].x===pair[1].x&&Math.abs(pair[0].sub)===.75&&Math.abs(pair[1].sub)===.75)) throw new Error('torretas não estão emparelhadas lateralmente');
if (!state.unitSubs.includes(-2) || !state.unitSubs.includes(2)) throw new Error('formação não ocupa as cinco sub-lanes');
if (Math.abs(collision.target)!==2) throw new Error('unidade não desviou do bloqueio central das torretas para as sub-lanes 1 ou 5');
if (state.matchTime < 22 || state.livingUnits === 0) throw new Error('primeira onda não entrou em combate');
if (byId('simSpeedControls').hidden) throw new Error('controles de velocidade permaneceram ocultos');
if (fullscreenRequests !== 0) throw new Error(`fullscreen foi solicitado automaticamente ${fullscreenRequests} vez(es)`);

console.log(JSON.stringify({ ...state, fullscreenRequests }, null, 2));
