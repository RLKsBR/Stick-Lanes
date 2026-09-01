/* Stick Lanes — motor Frontline v3
   22.500 de largura, 3 lanes x 3 sub-lanes, 4 torres por lane,
   ondas automáticas de minions por facção e partidas longas. */
'use strict';

var FACTIONS=Object.fromEntries(Object.entries(SL_FACTIONS).map(([k,v])=>[k,v.units]));
var $=s=>document.querySelector(s);
var setup=$('#setup'),gameUI=$('#gameUI'),f1=$('#f1'),f2=$('#f2'),pool=$('#pool'),count=$('#count'),
    start=$('#start'),canvas=$('#game'),ctx=canvas.getContext('2d');
var chosen=[],loadout=[];

const VIEW_W=1800,VIEW_H=1000,WORLD_W=22500,BASE_Y=500,PX=26,MOVE_SCALE=18;
const BASE_X={1:180,'-1':22320},LANE_Y=[245,500,755],MAIN_SPLIT_END=2100,MAIN_MERGE_START=20400;
const SUB_GAP=54,SUB_SPLIT_DIST=1500,SUB_FULL_DIST=2600;
const towerXs={1:[2300,4800,7300,9800],'-1':[20200,17700,15200,12700]};
const towerTypes=[
 {label:'Fortaleza',hp:1200,atk:42,range:12,rate:1.30},
 {label:'Traseira',hp:1000,atk:36,range:11,rate:1.40},
 {label:'Central',hp:800,atk:30,range:10,rate:1.50},
 {label:'Avançada',hp:600,atk:24,range:9,rate:1.60}
];
const BASE_HP=6000,WAVE_INTERVAL=22;
let units=[],structures=[],effects=[],gold=500,enemyGold=500,playerBase=BASE_HP,enemyBase=BASE_HP,
    selectedLane=1,last=performance.now(),running=false,income=0,cameraX=0,matchTime=0,waveClock=0,waveIndex=0;
let enemyFactions=[],sideFactions={1:[], '-1':[]};
const stance=['advance','advance','advance'],spawnCd={},enemySpawnCd={};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const facMeta=fac=>SL_FACTIONS[fac];

function laneYAt(lane,x){
  if(x<MAIN_SPLIT_END){let t=clamp((x-BASE_X[1])/(MAIN_SPLIT_END-BASE_X[1]),0,1);return lerp(BASE_Y,LANE_Y[lane],smooth(t))}
  if(x>MAIN_MERGE_START){let t=clamp((x-MAIN_MERGE_START)/(BASE_X[-1]-MAIN_MERGE_START),0,1);return lerp(LANE_Y[lane],BASE_Y,smooth(t))}
  return LANE_Y[lane];
}
function laneOpenFactor(x){
  if(x<MAIN_SPLIT_END)return smooth(clamp((x-BASE_X[1])/(MAIN_SPLIT_END-BASE_X[1]),0,1));
  if(x>MAIN_MERGE_START)return 1-smooth(clamp((x-MAIN_MERGE_START)/(BASE_X[-1]-MAIN_MERGE_START),0,1));
  return 1;
}
function subFactorForSide(side,x){
  let d=side===1?x-BASE_X[1]:BASE_X[-1]-x;
  return smooth(clamp((d-SUB_SPLIT_DIST)/(SUB_FULL_DIST-SUB_SPLIT_DIST),0,1))*laneOpenFactor(x);
}
function pathY(lane,sub,x,originSide=1){return laneYAt(lane,x)+(sub||0)*SUB_GAP*subFactorForSide(originSide,x)}
function yOf(u){return pathY(u.lane,u.sub||0,u.x,u.origSide||u.side)}
function dist(a,b){return Math.hypot(a.x-b.x,yOf(a)-yOf(b))}
function timeText(s){let m=Math.floor(s/60),ss=Math.floor(s%60);return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}

SL_FACTION_ORDER.forEach(n=>{f1.add(new Option(n,n));f2.add(new Option(n,n))});
f1.value='Medievais';f2.value='Alienígenas';

function roleTag(r){
 return {fighter:'Corpo a corpo',tank:'Tanque',ranged:'À distância',assassin:'Assassino',bruiser:'Brutamontes',
 support:'Suporte',controller:'Controle',siege:'Cerco',skirmisher:'Escaramuçador',specialist:'Especialista',elite:'Elite',unique:'Única'}[r]||r;
}
function renderPool(){
 if(f1.value===f2.value)f2.value=SL_FACTION_ORDER.find(x=>x!==f1.value);
 chosen=[];pool.innerHTML='';
 const pass1=facMeta(f1.value).passive,pass2=facMeta(f2.value).passive;
 const info=document.querySelector('#factionIdentity');
 if(info)info.innerHTML=`<b>${f1.value}</b>: ${pass1.name} — ${pass1.desc}<br><b>${f2.value}</b>: ${pass2.name} — ${pass2.desc}<br><span class="muted">Counter de minions: ${f1.value} +20% vs ${facMeta(f1.value).counter}; ${f2.value} +20% vs ${facMeta(f2.value).counter}.</span>`;
 [...FACTIONS[f1.value].map(u=>[f1.value,u]),...FACTIONS[f2.value].map(u=>[f2.value,u])].forEach(([fac,u])=>{
   let b=document.createElement('button');b.className='unitBtn';
   b.innerHTML=`<b>${u.name}</b><small>${fac} • ${u.cost} ouro • ${u.gen}s</small><span class="tag">${roleTag(u.role)}</span><span class="tag">${u.ability.name}</span>`;
   b.onclick=()=>{
     const k=fac+'|'+u.name,i=chosen.indexOf(k);
     if(i>=0){chosen.splice(i,1);b.classList.remove('selected')}
     else if(chosen.length<8){chosen.push(k);b.classList.add('selected')}
     count.textContent=chosen.length+'/8';start.classList.toggle('disabled',chosen.length!==8)
   };
   pool.appendChild(b);
 });
 count.textContent='0/8';start.classList.add('disabled')
}
f1.onchange=f2.onchange=renderPool;renderPool();

function byKey(k){let[fac,n]=k.split('|');return{fac,u:FACTIONS[fac].find(x=>x.name===n)}}
start.onclick=()=>{
 if(chosen.length!==8)return;
 loadout=chosen.map(byKey);setup.hidden=true;gameUI.hidden=false;buildUI();reset();
};
$('#restart').onclick=()=>location.reload();

function buildUI(){
 let lc=$('#laneControls');lc.innerHTML='';
 ['Lane superior','Lane central','Lane inferior'].forEach((name,i)=>{
   let d=document.createElement('div');d.className='laneControl';
   d.innerHTML=`<strong>${name}</strong><small class="muted">3 sub-lanes: tanque • lutador • distância</small><div class="laneBtns">${[
     ['base','Base'],['behind','Atrás da torre'],['tower','Na torre'],['ahead','À frente'],['advance','Avançar']
   ].map(([v,l])=>`<button class="secondary ${v==='advance'?'active':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
   d.querySelectorAll('button').forEach(b=>b.onclick=()=>{stance[i]=b.dataset.v;d.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))});
   lc.appendChild(d)
 });
 let sb=$('#spawnbar');sb.innerHTML='';
 loadout.forEach(({fac,u},i)=>{
   let b=document.createElement('button');b.className='spawn';
   b.innerHTML=`<b>${u.name}</b><small>${fac} • ${u.cost} • ${u.gen}s</small>`;
   b.onclick=()=>spawnPlayer(i);sb.appendChild(b)
 });
}

function setCamera(v){cameraX=clamp(v,0,WORLD_W-VIEW_W)}
$('#camLeft').onclick=()=>setCamera(cameraX-1200);
$('#camRight').onclick=()=>setCamera(cameraX+1200);
$('#camHome').onclick=()=>setCamera(0);
$('#camMid').onclick=()=>setCamera((WORLD_W-VIEW_W)/2);
$('#camEnemy').onclick=()=>setCamera(WORLD_W-VIEW_W);
let drag=null;
canvas.addEventListener('pointerdown',e=>{let r=canvas.getBoundingClientRect();drag={id:e.pointerId,startX:e.clientX,lastX:e.clientX,moved:false,scale:VIEW_W/r.width};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;let dx=e.clientX-drag.lastX;if(Math.abs(e.clientX-drag.startX)>7)drag.moved=true;setCamera(cameraX-dx*drag.scale);drag.lastX=e.clientX});
canvas.addEventListener('pointerup',e=>{
 if(!drag||drag.id!==e.pointerId)return;
 let r=canvas.getBoundingClientRect(),lx=(e.clientX-r.left)*VIEW_W/r.width,ly=(e.clientY-r.top)*VIEW_H/r.height,wx=cameraX+lx;
 if(!drag.moved){
   if(ly<78){setCamera(clamp((lx-20)/(VIEW_W-40),0,1)*WORLD_W-VIEW_W/2)}
   else{let ds=LANE_Y.map((_,i)=>Math.abs(laneYAt(i,wx)-ly));selectedLane=ds.indexOf(Math.min(...ds))}
 }
 drag=null;
});

function reset(){
 units=[];effects=[];gold=enemyGold=500;playerBase=enemyBase=BASE_HP;income=0;matchTime=0;waveClock=0;waveIndex=0;setCamera(0);
 makeStructures();
 enemyFactions=SL_FACTION_ORDER.sort(()=>Math.random()-.5).slice(0,2);
 sideFactions={1:[f1.value,f2.value],'-1':enemyFactions};
 running=true;last=performance.now();requestAnimationFrame(loop)
}
function makeStructures(){
 structures=[];
 for(const side of [1,-1])for(let lane=0;lane<3;lane++)towerXs[side].forEach((x,i)=>{
   let t=towerTypes[i];structures.push({side,lane,x,kind:'tower',...t,maxHp:t.hp,lastAttack:0,dead:false})
 })
}
function aliveTowers(side,lane){return structures.filter(s=>!s.dead&&s.side===side&&s.lane===lane)}
function baseHp(side){return side===1?playerBase:enemyBase}
function damageBase(side,d){if(side===1)playerBase=Math.max(0,playerBase-d);else enemyBase=Math.max(0,enemyBase-d)}
function roleSub(role){return role==='tank'?-1:(role==='ranged'||role==='support'||role==='controller'||role==='siege'?1:0)}

function applySpawnPassive(obj){
 if(obj.fac==='Titãs'){obj.maxHp*=1.2;obj.hp*=1.2;obj.speed*=.9}
 if(obj.fac==='Nômades do Deserto')obj.speed*=1.1;
 if(obj.fac==='Mutantes'){
   let r=Math.floor(Math.random()*3);
   if(r===0){obj.maxHp*=1.1;obj.hp*=1.1}else if(r===1)obj.atk*=1.1;else obj.speed*=1.1
 }
}
function spawnUnit(side,lane,fac,u,opts={}){
 let obj={side,lane,sub:opts.sub??roleSub(u.role),fac,name:u.name,role:u.role,cost:opts.minion?0:(u.cost||0),
   x:side===1?BASE_X[1]+95:BASE_X[-1]-95,hp:u.hp,maxHp:u.hp,def:u.def,atk:u.atk,speed:u.speed,range:u.range,rate:u.rate,
   special:{...(u.special||{})},ability:u.ability,minion:!!opts.minion,minionType:opts.minionType||null,lastAttack:0,lastSkill:-999,lastDamaged:-999,
   stunUntil:0,slowUntil:0,dead:false,rewarded:false,chargeReady:true,revived:false,born:performance.now()/1000,anim:Math.random()*10,
   powerFlash:-999,origSide:side,attackCount:0,radiation:0,acidStacks:0};
 applySpawnPassive(obj);units.push(obj);return obj;
}
function spawnPlayer(i){
 let{fac,u}=loadout[i],now=performance.now()/1000,k='p'+i;
 if(gold<u.cost||now<(spawnCd[k]||0))return;
 if(u.special.unique&&units.some(x=>!x.dead&&x.side===1&&x.name===u.name))return;
 gold-=u.cost;spawnCd[k]=now+u.gen;spawnUnit(1,selectedLane,fac,u)
}
function unitValue(u){let dps=u.atk/Math.max(.45,u.rate),ehp=u.hp*(1+u.def/130);return Math.sqrt(dps*ehp)*(1+u.range*.018)/(Math.pow(u.cost,0.55)*(1+u.gen/220))}
function enemyAI(t){
 if(Math.random()>.018)return;
 let pool=enemyFactions.flatMap(f=>FACTIONS[f].map(u=>({fac:f,u}))).filter(({u})=>enemyGold>=u.cost&&t>=(enemySpawnCd[u.name]||0));
 if(!pool.length)return;
 pool.sort((a,b)=>unitValue(b.u)-unitValue(a.u)+(Math.random()-.5)*.08);
 let pick=pool[Math.floor(Math.random()*Math.min(5,pool.length))];
 if(pick.u.special.unique&&units.some(x=>!x.dead&&x.side===-1&&x.name===pick.u.name))return;
 enemyGold-=pick.u.cost;enemySpawnCd[pick.u.name]=t+pick.u.gen;
 let scores=[0,1,2].map(l=>units.filter(x=>!x.dead&&x.side===1&&x.lane===l).length-units.filter(x=>!x.dead&&x.side===-1&&x.lane===l).length);
 spawnUnit(-1,scores.indexOf(Math.max(...scores)),pick.fac,pick.u)
}
function spawnWave(side){
 const fac=sideFactions[side][waveIndex%2];
 for(let lane=0;lane<3;lane++){
   [['tank',-1],['fighter',0],['ranged',1]].forEach(([type,sub])=>{
     const p=SL_MINION_PROFILES[type],name=facMeta(fac).minions[type];
     let u={name,role:type,hp:p.hp,def:p.def,atk:p.atk,speed:p.speed,range:p.range,rate:p.rate,cost:0,gen:0,
       special:type==='tank'?{block:.06,tank:true}:type==='ranged'?{ranged:true}:{},ability:{name:'Minion',desc:'Unidade automática'}};
     spawnUnit(side,lane,fac,u,{minion:true,minionType:type,sub})
   })
 }
}
function loop(now){
 if(!running)return;
 let dt=Math.min(.04,(now-last)/1000),t=now/1000;last=now;matchTime+=dt;income+=dt;waveClock+=dt;
 if(income>=2){let n=Math.floor(income/2);gold+=30*n;enemyGold+=30*n;income-=2*n}
 while(waveClock>=WAVE_INTERVAL){waveClock-=WAVE_INTERVAL;spawnWave(1);spawnWave(-1);waveIndex++}
 enemyAI(t);update(dt,t);updateTowers(t);draw(t);hud(t);
 if(playerBase<=0||enemyBase<=0){running=false;setTimeout(()=>alert(playerBase>0?`Vitória! ${timeText(matchTime)}`:`Derrota! ${timeText(matchTime)}`),50);return}
 requestAnimationFrame(loop)
}
function reward(v,side){if(v.rewarded||v.minion)return;v.rewarded=true;let r=Math.floor(v.cost*.1);if(side===1)gold+=r;else enemyGold+=r}
function sameFront(a,b){return a.lane===b.lane}
function nearestEnemy(u,range){return units.filter(v=>!v.dead&&v.side!==u.side&&sameFront(u,v)&&dist(u,v)<=range*PX).sort((a,b)=>dist(u,a)-dist(u,b))[0]}
function nextStructure(u){
 let a=aliveTowers(-u.side,u.lane).filter(s=>u.side===1?s.x>=u.x-10:s.x<=u.x+10);
 return a.length?a.sort((x,y)=>Math.abs(x.x-u.x)-Math.abs(y.x-u.x))[0]:{kind:'base',side:-u.side,lane:u.lane,x:BASE_X[-u.side]}
}
function defX(u){
 let o=stance[u.lane];if(o==='base')return BASE_X[u.side]+u.side*220;
 let a=aliveTowers(u.side,u.lane);if(!a.length)return BASE_X[u.side]+u.side*220;
 let r=a.sort((x,y)=>Math.abs(x.x-u.x)-Math.abs(y.x-u.x))[0];
 if(o==='behind')return r.x-u.side*190;if(o==='ahead')return r.x+u.side*190;return r.x-u.side*45
}
function alliesNear(u,r=300){return units.filter(v=>!v.dead&&v.side===u.side&&v!==u&&v.lane===u.lane&&dist(u,v)<r).length}
function attackRate(u){
 let m=1;if(u.fac==='Orcs'&&u.hp/u.maxHp<.4)m*=.82;
 if(u.fac==='Músicos'&&u.attackCount%4===3)m*=.7;
 return Math.max(.35,u.rate*m)
}
function move(u,x,dt){
 let d=x-u.x;if(Math.abs(d)<7)return;
 let slow=(performance.now()/1000<u.slowUntil)?.72:1;
 u.x+=Math.sign(d)*u.speed*MOVE_SCALE*slow*dt;u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70)
}
function passiveTick(u,dt,t){
 if(u.radiation>0){u.hp-=u.maxHp*u.radiation*dt;u.radiation=Math.max(0,u.radiation-.003*dt)}
 if(u.fac==='Celestiais'&&Math.floor(t/8)!==Math.floor((t-dt)/8))u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.02);
 if(u.fac==='Zumbis')u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.0025*dt);
 if(u.fac==='Alienígenas'&&t-u.lastDamaged>4)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.01*dt)
}
function update(dt,t){
 for(const u of [...units]){
   if(u.dead)continue;passiveTick(u,dt,t);if(u.hp<=0){killUnit(u,null,t);continue}
   if(t<u.stunUntil)continue;
   support(u,t);
   let foe=nearestEnemy(u,u.range),s=nextStructure(u),sy=s.kind==='base'?BASE_Y:laneYAt(s.lane,s.x),
       sr=Math.hypot(s.x-u.x,sy-yOf(u))<=u.range*PX;
   if(u.role==='siege'&&sr){
     if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}
   }else if(foe){
     if(t-u.lastAttack>=attackRate(u)){attack(u,foe,t);u.lastAttack=t;u.attackCount++}
   }else if(u.minion||u.side===-1||stance[u.lane]==='advance'){
     if(sr){if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}}else move(u,s.x,dt)
   }else move(u,defX(u),dt)
 }
 units=units.filter(u=>!u.dead&&u.hp>0)
}
function structurePacing(){return matchTime<480?.68:matchTime<720?.84:1}
function attackStructure(a,s,t){
 let d=a.atk*(a.special.siege||1)*structurePacing();
 if(a.role==='siege')d*=1.25;
 if(s.kind==='base')damageBase(s.side,d);else{s.hp-=d;if(s.hp<=0){s.hp=0;s.dead=true}}
 let y=s.kind==='base'?BASE_Y:laneYAt(s.lane,s.x);effects.push({type:'impact',x:s.x,y,t,color:attackColor(a)});
 if(a.range>4)effects.push({type:'beam',x1:a.x,y1:yOf(a)-18,x2:s.x,y2:y-30,t,color:attackColor(a)})
}
function incomingMultiplier(b){
 let m=1;if(b.fac==='Robôs')m*=.88;
 if(b.fac==='Artrópodes')m*=.90;
 return m
}
function factionDamageBonus(a,b){
 let m=1;
 if(a.minion&&b.minion&&facMeta(a.fac).counter===b.fac)m*=1.20;
 if(a.fac==='Samurais'&&a.hp/a.maxHp<.35)m*=1.20;
 if(a.fac==='Lobos')m*=1+Math.min(.24,alliesNear(a,260)*.08);
 if(a.fac==='Cultistas')m*=1+Math.min(.15,Math.floor(alliesNear(a,280)/3)*.05);
 if(a.fac==='Míticos'&&(a.role==='elite'||a.role==='unique'))m*=1.10;
 if(a.fac==='Músicos'&&a.attackCount%4===3)m*=1.25;
 if(a.role==='elite'&&b.minion)m*=1.10;
 return m
}
function dodgeChance(b){return Math.min(.4,(b.special.dodge||0)+(b.fac==='Ninjas'?.12:0)+(b.fac==='Espectrais'?.15:0))}
function killUnit(b,killer,t){
 if(b.dead)return;b.dead=true;if(killer)reward(b,killer.side);
 if(b.minion&&b.fac==='Zumbis'&&!b.revived&&Math.random()<.12){
   let p=SL_MINION_PROFILES[b.minionType],u={name:b.name,role:b.minionType,hp:p.hp*.4,def:p.def,atk:p.atk,speed:p.speed,range:p.range,rate:p.rate,cost:0,gen:0,special:{},ability:{name:'Retorno',desc:''}};
   let z=spawnUnit(b.side,b.lane,b.fac,u,{minion:true,minionType:b.minionType,sub:b.sub});z.x=b.x;z.revived=true
 }
 if(killer&&killer.fac==='Necromantes'&&Math.random()<.15){
   let p=SL_MINION_PROFILES.fighter,u={name:'Esqueleto Erguido',role:'fighter',hp:p.hp*.65,def:p.def*.7,atk:p.atk*.75,speed:p.speed,range:p.range,rate:p.rate,cost:0,gen:0,special:{},ability:{name:'Erguido',desc:''}};
   let z=spawnUnit(killer.side,killer.lane,'Necromantes',u,{minion:true,minionType:'fighter',sub:killer.sub});z.x=killer.x
 }
}
function attack(a,b,t){
 if(Math.random()<dodgeChance(b))return;
 let def=b.def*(1-Math.min(.2,b.acidStacks*.04));
 if(a.special.armorPierce)def*=1-a.special.armorPierce;
 if(a.fac==='Físicos')def*=.90;
 let d=a.atk*factionDamageBonus(a,b),red=Math.min(.75,def/(def+125));d*=1-red;d*=incomingMultiplier(b);
 if(a.special.charge&&a.chargeReady){d*=1+a.special.charge;a.chargeReady=false}
 if(a.special.block)d*=1;
 b.hp-=d;b.lastDamaged=t;
 if(a.fac==='Demônios'||a.special.lifesteal)a.hp=Math.min(a.maxHp,a.hp+d*(a.special.lifesteal||.10));
 if(a.fac==='Alquimistas'||a.special.acid)b.acidStacks=Math.min(5,b.acidStacks+1);
 if(a.fac==='Bestas Marinhas'||a.special.slow)b.slowUntil=Math.max(b.slowUntil,t+2.5);
 if(a.special.radiation)b.radiation=Math.min(.12,b.radiation+a.special.radiation);
 if(b.fac==='Cristalinos'&&a.hp>0){a.hp-=d*.08;if(a.hp<=0)killUnit(a,b,t)}
 if(a.special.splash||a.fac==='Elementais')units.filter(v=>v!==b&&!v.dead&&v.side===b.side&&v.lane===b.lane&&dist(b,v)<90).forEach(v=>{v.hp-=d*.18;v.lastDamaged=t;if(v.hp<=0)killUnit(v,a,t)});
 effects.push({type:'impact',x:b.x,y:yOf(b),t,color:attackColor(a)});
 if(a.range>4||a.role==='ranged'||a.role==='controller'||a.role==='support')effects.push({type:'beam',x1:a.x,y1:yOf(a)-18,x2:b.x,y2:yOf(b)-14,t,color:attackColor(a)});
 if(b.hp<=0)killUnit(b,a,t)
}
function updateTowers(t){
 for(const s of structures){
   if(s.dead||t-s.lastAttack<s.rate)continue;
   let sy=laneYAt(s.lane,s.x),v=units.filter(u=>!u.dead&&u.side!==s.side&&u.lane===s.lane&&Math.hypot(u.x-s.x,yOf(u)-sy)<=s.range*PX)
     .sort((a,b)=>Math.hypot(a.x-s.x,yOf(a)-sy)-Math.hypot(b.x-s.x,yOf(b)-sy))[0];
   if(!v)continue;let d=s.atk*(1-Math.min(.65,v.def/(v.def+140)))*incomingMultiplier(v);v.hp-=d;v.lastDamaged=t;
   if(v.hp<=0)killUnit(v,{side:s.side,fac:'Torre'},t);
   s.lastAttack=t;effects.push({type:'shot',x1:s.x,y1:sy-48,x2:v.x,y2:yOf(v)-10,t,side:s.side})
 }
}
function support(u,t){
 let s=u.special;
 if(s.heal&&t-u.lastSkill>=s.heal.cool){
   let a=units.filter(v=>!v.dead&&v.side===u.side&&v!==u&&v.lane===u.lane&&dist(u,v)<=s.heal.range*PX&&v.hp<v.maxHp).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0];
   if(a){a.hp=Math.min(a.maxHp,a.hp+a.maxHp*s.heal.pct);u.lastSkill=t;u.powerFlash=t}
 }
 if(s.stun&&t-u.lastSkill>=s.stun.cool){
   let v=nearestEnemy(u,u.range);if(v){let dur=s.stun.duration*(v.fac==='Mentalistas'?.65:1);v.stunUntil=t+dur;u.lastSkill=t;u.powerFlash=t}
 }
}
function hud(t){
 $('#gold').textContent=Math.floor(gold);$('#playerBase').textContent=Math.ceil(playerBase);$('#enemyBase').textContent=Math.ceil(enemyBase);
 $('#playerTowers').textContent=structures.filter(s=>!s.dead&&s.side===1).length;$('#enemyTowers').textContent=structures.filter(s=>!s.dead&&s.side===-1).length;
 let tm=$('#matchTimer');if(tm)tm.textContent=timeText(matchTime);
 let wave=$('#waveTimer');if(wave)wave.textContent=Math.ceil(WAVE_INTERVAL-waveClock)+'s';
 document.querySelectorAll('.spawn').forEach((b,i)=>{let u=loadout[i].u,left=Math.max(0,(spawnCd['p'+i]||0)-t);b.disabled=gold<u.cost||left>0;b.querySelector('small').textContent=left?left.toFixed(0)+'s':`${loadout[i].fac} • ${u.cost} • ${u.gen}s`})
}
