const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matchFocus = fs.readFileSync(path.join(root, 'match-focus-v1.js'), 'utf8');
const mobile = fs.readFileSync(path.join(root, 'mobile-landscape-v1.js'), 'utf8');
const mainActivity = fs.readFileSync(
  path.join(root, 'android/app/src/main/java/com/sticklanes/game/MainActivity.java'),
  'utf8'
);

function fail(message) {
  throw new Error(message);
}

// O bug real que congelava a UI: observar a subárvore e, no callback,
// reescrever textContent de descendentes pode alimentar o próprio observer.
if (/observe\s*\(\s*lanes\s*,\s*\{[^}]*subtree\s*:\s*true/i.test(matchFocus)) {
  fail('match-focus voltou a observar subtree:true em #laneControls');
}
if (!/observe\s*\(\s*lanes\s*,\s*\{\s*childList\s*:\s*true\s*\}\s*\)/i.test(matchFocus)) {
  fail('match-focus não está limitado a childList direto');
}
if (!/textContent\s*!==\s*text/.test(matchFocus)) {
  fail('match-focus perdeu a proteção contra escrita redundante de textContent');
}

// O módulo mobile pode observar apenas a mudança do atributo hidden do gameUI.
if (/MutationObserver[^\n]*document\.documentElement[\s\S]*subtree\s*:\s*true/i.test(mobile)) {
  fail('mobile-landscape ganhou observer global de subtree');
}

// O hook nativo de fullscreen não precisa observar o DOM inteiro.
if (/new\s+MutationObserver\s*\(\s*bind\s*\)/.test(mainActivity)) {
  fail('hook nativo de fullscreen voltou a usar MutationObserver(bind)');
}
if (/subtree:true/.test(mainActivity)) {
  fail('MainActivity contém observer subtree:true no hook injetado');
}

console.log('Observer regression checks: OK');
