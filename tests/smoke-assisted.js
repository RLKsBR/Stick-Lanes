const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rafQueue = [];
const dynamicScripts = [];
const allElements = [];

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
  requestFullscreen() { return Promise.resolve(); }
  getBoundingClientRect() { return { width: 1800, height: 1000, left: 0, top: 0 }; }
  getContext() { return makeContext2d(); }
  click() { if (typeof this.onclick === 'function') this.onclick({ target: this }); }
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
  'loadComp', 'deleteComp', 'compMessage', 'zoomBadge'
].forEach(byId);

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
  querySelector(selector) {
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
  MutationObserver: class { observe() {} },
  Image: class {
    set src(value) { this._src = value; if (typeof this.onload === 'function') this.onload(); }
    get src() { return this._src; }
  },
  Option: class extends FakeElement {
    constructor(text, value) { super('option'); this.text = text; this.value = value; }
  },
  crypto: { randomUUID: () => 'test-id' },
  screen: { orientation: { lock: () => Promise.resolve() } },
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
  matchTime
})`, context);

if (!byId('mainMenu').hidden) throw new Error('menu principal permaneceu visível');
if (byId('gameUI').hidden) throw new Error('interface da batalha permaneceu oculta');
if (state.gameMode !== 'robot' || !state.running) throw new Error('simulação assistida não iniciou');
if (state.loadoutSize !== 8 || state.enemyLoadoutSize !== 8) throw new Error('IA não montou os dois baralhos');
if (state.structures !== 60) throw new Error(`estruturas inválidas: ${state.structures}`);
if (state.matchTime < 22 || state.livingUnits === 0) throw new Error('primeira onda não entrou em combate');
if (byId('simSpeedControls').hidden) throw new Error('controles de velocidade permaneceram ocultos');

console.log(JSON.stringify(state, null, 2));
