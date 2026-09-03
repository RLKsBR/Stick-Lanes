(()=>{
const pill=document.querySelector('.statusPill');
if(pill)pill.textContent='22.500 • mapa 2D e meio • movimento 6×';
const cam=document.querySelector('.cameraBar .muted');
if(cam)cam.textContent='Arraste em qualquer direção e use pinça para aproximar/afastar. Rota inferior em L. Entre torres principais há duas torretas auxiliares, mas ficam janelas deliberadas de avanço.';

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
  const entry={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,f1:f1.value,f2:f2.value,keys:[...chosen],
    strategy:setupWeights(),legendId:selectedLegendId,legendFocus:Number(document.querySelector('#legendFocus')?.value)||1,savedAt:Date.now()};
  const same=list.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());
  if(same>=0)list[same]=entry;else list.push(entry);
  write(list.slice(-50));refresh();select.value=String(Math.max(0,(same>=0?same:list.length-1)));nameInput.value='';say('Composição salva neste aparelho.');
};

loadBtn.onclick=()=>{
  const list=read(),c=list[Number(select.value)];if(!c)return;
  f1.value=c.f1;f2.value=c.f2;renderPool();
  const keys=allVisibleKeys(),buttons=[...document.querySelectorAll('.unitBtn')];
  c.keys.forEach(k=>{const i=keys.indexOf(k);if(i>=0&&buttons[i])buttons[i].click()});
  if(c.strategy)syncStrategySetup(c.strategy);
  if(c.legendId&&SL_LEGENDS.some(x=>x.id===c.legendId)){selectedLegendId=c.legendId;document.querySelectorAll('.legendCard').forEach(card=>card.classList.toggle('selected',card.dataset.legendId===selectedLegendId))}
  if(Number.isInteger(c.legendFocus)){const focus=document.querySelector('#legendFocus');if(focus)focus.value=String(c.legendFocus)}
  nameInput.value=c.name;say('Composição carregada.');
};

deleteBtn.onclick=()=>{
  const list=read(),i=Number(select.value);if(!list[i])return;const n=list[i].name;list.splice(i,1);write(list);refresh();say('Excluída: '+n);
};

refresh();
window.StickLanesComps={read,write,refresh,key:KEY};
})();
