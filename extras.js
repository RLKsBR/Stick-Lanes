(()=>{
const mapScript=document.createElement('script');
mapScript.src='map-sci-fi-v4.js';
mapScript.onload=()=>{
  const pill=document.querySelector('.statusPill');
  if(pill)pill.textContent='22.500 • mapa sci-fi • 3×3 sub-lanes';
  const cam=document.querySelector('.cameraBar .muted');
  if(cam)cam.textContent='Rotas superior e inferior são mais longas e flanqueadoras. A central é mais curta, mas os bastiões têm muito mais vida, alcance e resistência.';
};
document.head.appendChild(mapScript);

const KEY='stickLanesCompositions.v1';
const nameInput=document.querySelector('#compName');
const saveBtn=document.querySelector('#saveComp');
const select=document.querySelector('#savedComps');
const loadBtn=document.querySelector('#loadComp');
const deleteBtn=document.querySelector('#deleteComp');
const msg=document.querySelector('#compMessage');
if(!saveBtn)return;

function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function write(v){localStorage.setItem(KEY,JSON.stringify(v))}
function say(t){msg.textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>msg.textContent='O salvamento fica somente neste navegador/aparelho.',2600)}
function refresh(){const list=read();select.innerHTML='';if(!list.length){select.add(new Option('Nenhuma composição salva',''));select.disabled=true;loadBtn.disabled=true;deleteBtn.disabled=true;return}select.disabled=false;loadBtn.disabled=false;deleteBtn.disabled=false;list.forEach((c,i)=>select.add(new Option(c.name,i)))}
function allVisibleKeys(){return [...FACTIONS[f1.value].map(u=>f1.value+'|'+u.name),...FACTIONS[f2.value].map(u=>f2.value+'|'+u.name)]}

saveBtn.onclick=()=>{
  if(chosen.length!==8){say('Escolha 8 unidades antes de salvar.');return}
  const name=(nameInput.value||'Composição '+(read().length+1)).trim().slice(0,40);
  const list=read();
  const entry={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,f1:f1.value,f2:f2.value,keys:[...chosen],savedAt:Date.now()};
  const same=list.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());
  if(same>=0)list[same]=entry;else list.push(entry);
  write(list.slice(-50));refresh();select.value=String(Math.max(0,(same>=0?same:list.length-1)));nameInput.value='';say('Composição salva neste aparelho.');
};

loadBtn.onclick=()=>{
  const list=read(),c=list[Number(select.value)];if(!c)return;
  f1.value=c.f1;f2.value=c.f2;renderPool();
  const keys=allVisibleKeys(),buttons=[...document.querySelectorAll('.unitBtn')];
  c.keys.forEach(k=>{const i=keys.indexOf(k);if(i>=0&&buttons[i])buttons[i].click()});
  nameInput.value=c.name;say('Composição carregada.');
};

deleteBtn.onclick=()=>{
  const list=read(),i=Number(select.value);if(!list[i])return;const n=list[i].name;list.splice(i,1);write(list);refresh();say('Excluída: '+n);
};

refresh();
window.StickLanesComps={read,write,refresh,key:KEY};
})();
