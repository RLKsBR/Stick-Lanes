/* Stick Lanes — motor Frontline v3
   22.500 de largura, 3 lanes x 3 sub-lanes, 4 torres por lane,
   ondas automáticas de minions por facção e partidas longas. */
'use strict';

var FACTIONS=Object.fromEntries(Object.entries(SL_FACTIONS).map(([k,v])=>[k,v.units]));
var $=s=>document.querySelector(s);
var mainMenu=$('#mainMenu'),setup=$('#setup'),gameUI=$('#gameUI'),f1=$('#f1'),f2=$('#f2'),pool=$('#pool'),count=$('#count'),
    start=$('#start'),canvas=$('#game'),ctx=canvas.getContext('2d');
var chosen=[],loadout=[],gameMode='pve';

const VIEW_W=1800,VIEW_H=1000,WORLD_W=22500,BASE_Y=500,PX=26,MOVE_SCALE=18;
const BASE_X={1:180,'-1':22320},LANE_Y=[245,500,755],MAIN_SPLIT_END=2100,MAIN_MERGE_START=20400;
const SUB_GAP=54,SUB_SPLIT_DIST=1500,SUB_FULL_DIST=2600;
const towerXs={1:[2300,4800,7300,9800],'-1':[20200,17700,15200,12700]};
const COMBAT=SL_COMBAT_RULES;
const towerTypes=[
 COMBAT.tower.fortress,
 COMBAT.tower.rear,
 COMBAT.tower.central,
 COMBAT.tower.advanced
];
const AUX_TURRET={label:'Torreta',hp:900,atk:10,range:4,rate:1.15,visualTier:0,auxiliary:true};
const BASE_HP=6000,WAVE_INTERVAL=22;
const MINION_WAVE_FORMATION=[['tank',-1],['fighter',0],['fighter',0],['ranged',1],['ranged',1],['ranged',1]];
let units=[],structures=[],effects=[],gold=500,enemyGold=500,playerBase=BASE_HP,enemyBase=BASE_HP,
    selectedLane=1,last=performance.now(),running=false,income=0,cameraX=0,matchTime=0,simTime=0,timeScale=1,waveClock=0,waveIndex=0;
let enemyFactions=[],enemyLoadout=[],sideFactions={1:[], '-1':[]};
const CELL_SIZE=520;
let unitSeq=0,structureSeq=0,showTowerRanges=false,unitIndex={1:[[],[],[]],'-1':[[],[],[]]},
    unitCells={1:[new Map(),new Map(),new Map()],'-1':[new Map(),new Map(),new Map()]},
    waveFrontIndex={1:[null,null,null],'-1':[null,null,null]};
const orders={1:['advance','advance','advance'],'-1':['advance','advance','advance']},spawnCd={};
const aiSpawnCd={1:{},'-1':{}},aiUse={1:{},'-1':{}},aiNextThink={1:0,'-1':0};

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
function randomFactionPair(exclude=[]){
 let available=SL_FACTION_ORDER.filter(f=>!exclude.includes(f));if(available.length<2)available=[...SL_FACTION_ORDER];
 return available.sort(()=>Math.random()-.5).slice(0,2)
}
function launchBattle(mode,pair,deck){
 gameMode=mode;f1.value=pair[0];f2.value=pair[1];loadout=deck;
 mainMenu.hidden=true;setup.hidden=true;gameUI.hidden=false;buildUI();reset()
}
$('#menuPlay').onclick=()=>{mainMenu.hidden=true;setup.hidden=false;gameMode='pve';renderPool()};
$('#menuRobots').onclick=()=>{
 let pair=randomFactionPair(),deck=buildAIDeck(pair);launchBattle('robot',pair,deck)
};
$('#backMenu').onclick=()=>location.reload();
start.onclick=()=>{
 if(chosen.length!==8)return;
 launchBattle('pve',[f1.value,f2.value],chosen.map(byKey))
};
$('#restart').onclick=()=>location.reload();

function buildUI(){
 let lc=$('#laneControls');lc.innerHTML='';
 ['Lane superior','Lane central','Lane inferior'].forEach((name,i)=>{
   let d=document.createElement('div');d.className='laneControl';
   d.innerHTML=`<strong>${name}</strong><small class="muted">Ordem atual da lane</small><div class="laneBtns">${[
     ['base','Base'],['behind','Atrás da torre'],['ahead','À frente da torre'],['advance','Avançar'],['attack','Atacar']
   ].map(([v,l])=>`<button class="secondary ${v==='advance'?'active':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
   d.querySelectorAll('button').forEach(b=>b.onclick=()=>{orders[1][i]=b.dataset.v;d.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))});
   lc.appendChild(d)
 });
 let sb=$('#spawnbar');sb.innerHTML='';
 loadout.forEach(({fac,u},i)=>{
   let b=document.createElement('button');b.className='spawn';
   b.innerHTML=`<b>${u.name}</b><small>${fac} • ${u.cost} • ${u.gen}s</small>`;
   b.onclick=()=>spawnPlayer(i);sb.appendChild(b)
 });
 let assisted=gameMode==='robot',status=$('#modeStatus'),speedControls=$('#simSpeedControls');
 if(status)status.textContent=assisted?'Simulação assistida':'Jogador × IA';
 if(speedControls){
   speedControls.hidden=!assisted;
   speedControls.querySelectorAll('button').forEach(b=>b.onclick=()=>{
     timeScale=Number(b.dataset.speed)||1;
     speedControls.querySelectorAll('button').forEach(x=>{let active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))})
   })
 }
 lc.classList.toggle('aiControlled',assisted)
}

function setCamera(v){cameraX=clamp(v,0,WORLD_W-VIEW_W)}
$('#camLeft').onclick=()=>setCamera(cameraX-1200);
$('#camRight').onclick=()=>setCamera(cameraX+1200);
$('#camHome').onclick=()=>setCamera(0);
$('#camMid').onclick=()=>setCamera((WORLD_W-VIEW_W)/2);
$('#camEnemy').onclick=()=>setCamera(WORLD_W-VIEW_W);
const rangeButton=$('#towerRanges');
if(rangeButton)rangeButton.onclick=()=>{showTowerRanges=!showTowerRanges;rangeButton.classList.toggle('active',showTowerRanges);rangeButton.textContent=showTowerRanges?'Alcance: ligado':'Alcance das torres'};
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
 units=[];effects=[];gold=enemyGold=500;playerBase=enemyBase=BASE_HP;income=0;matchTime=0;simTime=0;timeScale=1;waveClock=0;waveIndex=0;unitSeq=0;setCamera(0);
 Object.keys(spawnCd).forEach(k=>delete spawnCd[k]);
 for(const side of [1,-1]){orders[side]=['advance','advance','advance'];aiSpawnCd[side]={};aiUse[side]={};aiNextThink[side]=0}
 makeStructures();
 enemyFactions=randomFactionPair([f1.value,f2.value]);
 enemyLoadout=buildAIDeck(enemyFactions);
 sideFactions={1:[f1.value,f2.value],'-1':enemyFactions};
 running=true;last=performance.now();requestAnimationFrame(loop)
}
function makeStructures(){
 structures=[];structureSeq=0;
 for(const side of [1,-1])for(let lane=0;lane<3;lane++){
   const xs=towerXs[side];
   xs.forEach((x,i)=>{
     let t=towerTypes[i];structures.push({id:++structureSeq,side,lane,x,kind:'tower',...t,maxHp:t.hp,lastAttack:0,dead:false,fortified:true,breachUntil:-999})
   });
   for(let i=0;i<xs.length-1;i++)for(let step=1;step<=2;step++){
     let x=xs[i]+(xs[i+1]-xs[i])*step/3,t=AUX_TURRET;
     structures.push({id:++structureSeq,side,lane,x,kind:'tower',...t,maxHp:t.hp,lastAttack:0,dead:false,fortified:true,breachUntil:-999})
   }
 }
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
 let born=simTime;
 let obj={id:++unitSeq,side,lane,sub:opts.sub??roleSub(u.role),fac,name:u.name,role:u.role,cost:opts.minion?0:(u.cost||0),
   x:side===1?BASE_X[1]+95:BASE_X[-1]-95,hp:u.hp,maxHp:u.hp,def:u.def,atk:u.atk,speed:u.speed,range:u.range,rate:u.rate,
   special:{...(u.special||{})},ability:u.ability,minion:!!opts.minion,minionType:opts.minionType||null,lastAttack:0,lastSkill:-999,lastDamaged:-999,
   stunUntil:0,slowUntil:0,dead:false,rewarded:false,chargeReady:true,revived:false,born,anim:Math.random()*10,
   powerFlash:-999,origSide:side,attackCount:0,radiation:0,acidStacks:0,lastMoved:born,runTime:0,combatSince:null,
   lastTargetId:null,lastTargetSwitch:-999,objectiveId:null,mentalGuardReadyAt:born,musicUntil:-999};
 applySpawnPassive(obj);units.push(obj);return obj;
}
function canSpawnUnit(side,u){
 if(u.special.legend&&units.some(x=>!x.dead&&x.side===side&&x.special.legend))return false;
 let cap=u.special.maxCopies||(u.special.unique?1:Infinity);
 return units.filter(x=>!x.dead&&x.side===side&&x.name===u.name).length<cap
}
function spawnPlayer(i){
 if(gameMode==='robot')return;
 let{fac,u}=loadout[i],now=simTime,k='p'+i;
 if(gold<u.cost||now<(spawnCd[k]||0)||!canSpawnUnit(1,u))return;
 gold-=u.cost;spawnCd[k]=now+u.gen;spawnUnit(1,selectedLane,fac,u)
}
function unitValue(u){let dps=u.atk/Math.max(.45,u.rate),ehp=u.hp*(1+u.def/130);return Math.sqrt(dps*ehp)*(1+u.range*.018)/(Math.pow(u.cost,0.55)*(1+u.gen/220))}
function sideGold(side){return side===1?gold:enemyGold}
function spendSideGold(side,n){if(side===1)gold-=n;else enemyGold-=n}
function buildAIDeck(factions){
 let pool=factions.flatMap(f=>FACTIONS[f].map(u=>({fac:f,u}))),picked=[];
 for(const role of ['tank','ranged','support','controller','siege']){
   let best=pool.filter(x=>x.u.role===role&&!picked.includes(x)).sort((a,b)=>unitValue(b.u)-unitValue(a.u))[0];
   if(best)picked.push(best)
 }
 for(const x of [...pool].sort((a,b)=>unitValue(b.u)-unitValue(a.u)))if(picked.length<8&&!picked.includes(x))picked.push(x);
 return picked.slice(0,8)
}
function sideRoster(side){
 return side===1?loadout:enemyLoadout
}
function armyPower(side,lane){
 return laneSide(side,lane).reduce((sum,u)=>sum+u.hp/u.maxHp*(u.atk/Math.max(.5,u.rate))*(u.minion?.55:1),0)
}
function updateAIOrders(side){
 for(let lane=0;lane<3;lane++){
   let own=armyPower(side,lane),foe=armyPower(-side,lane);
   let wave=units.some(u=>!u.dead&&u.minion&&u.side===side&&u.lane===lane);
   orders[side][lane]=wave&&own>=foe*.72?'advance':own>foe*1.45?'attack':foe>own*1.3?'behind':'advance'
 }
 if(side===1&&gameMode==='robot')document.querySelectorAll('.laneControl').forEach((box,lane)=>box.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.v===orders[1][lane])))
}
function runSideAI(side,t){
 if(t<aiNextThink[side])return;aiNextThink[side]=t+.7;
 updateAIOrders(side);
 let ready=aiSpawnCd[side],usage=aiUse[side],roster=sideRoster(side);
 let unusedAll=roster.filter(({fac,u})=>(usage[fac+'|'+u.name]||0)===0),source=unusedAll.length?unusedAll:roster;
 let available=source.filter(({fac,u})=>sideGold(side)>=u.cost&&t>=(ready[fac+'|'+u.name]||0)&&canSpawnUnit(side,u));
 if(!available.length)return;
 let scored=available.map(x=>{
   let key=x.fac+'|'+x.u.name,novelty=(usage[key]||0)===0?1.28:1/Math.pow(1+usage[key]*.12,.35);
   let needTank=units.filter(v=>!v.dead&&v.side===side&&v.role==='tank').length<3;
   let roleFit=needTank&&x.u.role==='tank'?1.22:1;
   return{x,score:unitValue(x.u)*novelty*roleFit*(.92+Math.random()*.16)}
 }).sort((a,b)=>b.score-a.score);
 let pick=scored[Math.floor(Math.random()*Math.min(3,scored.length))].x,key=pick.fac+'|'+pick.u.name;
 let laneScores=[0,1,2].map(l=>armyPower(-side,l)-armyPower(side,l)+Math.random()*8),lane=laneScores.indexOf(Math.max(...laneScores));
 spendSideGold(side,pick.u.cost);ready[key]=t+pick.u.gen;usage[key]=(usage[key]||0)+1;spawnUnit(side,lane,pick.fac,pick.u)
}
function spawnWave(side){
 const fac=sideFactions[side][waveIndex%2];
 for(let lane=0;lane<3;lane++){
   MINION_WAVE_FORMATION.forEach(([type,sub])=>{
     const p=SL_MINION_PROFILES[type],name=facMeta(fac).minions[type];
     let u={name,role:type,hp:p.hp,def:p.def,atk:p.atk,speed:p.speed,range:p.range,rate:p.rate,cost:0,gen:0,
       special:type==='tank'?{block:.06,tank:true}:type==='ranged'?{ranged:true}:{},ability:{name:'Minion',desc:'Unidade automática'}};
     spawnUnit(side,lane,fac,u,{minion:true,minionType:type,sub})
   })
 }
}
function simulationStep(dt){
 simTime+=dt;matchTime+=dt;income+=dt;waveClock+=dt;
 if(income>=2){let n=Math.floor(income/2);gold+=30*n;enemyGold+=30*n;income-=2*n}
 while(waveClock>=WAVE_INTERVAL){waveClock-=WAVE_INTERVAL;spawnWave(1);spawnWave(-1);waveIndex++}
 rebuildUnitIndex();if(gameMode==='robot')runSideAI(1,simTime);runSideAI(-1,simTime);update(dt,simTime);updateTowers(simTime)
}
function loop(now){
 if(!running)return;
 let realDt=Math.min(.04,(now-last)/1000),remaining=realDt*timeScale,steps=0,maxStep=timeScale>=10?.08:.04;last=now;
 while(remaining>.00001&&steps<60&&playerBase>0&&enemyBase>0){
   let dt=Math.min(maxStep,remaining);simulationStep(dt);remaining-=dt;steps++
 }
 draw(simTime);hud(simTime);
 if(playerBase<=0||enemyBase<=0){running=false;setTimeout(()=>alert(playerBase>0?`Vitória! ${timeText(matchTime)}`:`Derrota! ${timeText(matchTime)}`),50);return}
 requestAnimationFrame(loop)
}
function reward(v,killer){
 if(v.rewarded||!killer)return;
 if(v.minion){
   if(killer.minion||killer.fac==='Torre')return;
   let r=COMBAT.minionRewards[v.minionType]||0;
   v.rewarded=true;if(killer.side===1)gold+=r;else enemyGold+=r;return
 }
 v.rewarded=true;let r=Math.floor(v.cost*.1);if(killer.side===1)gold+=r;else enemyGold+=r
}
function sameFront(a,b){return a.lane===b.lane}
function rebuildUnitIndex(){
 unitIndex={1:[[],[],[]],'-1':[[],[],[]]};
 unitCells={1:[new Map(),new Map(),new Map()],'-1':[new Map(),new Map(),new Map()]};
 waveFrontIndex={1:[null,null,null],'-1':[null,null,null]};
 for(const u of units)if(!u.dead){
   unitIndex[u.side][u.lane].push(u);
   let cell=Math.floor(u.x/CELL_SIZE),map=unitCells[u.side][u.lane];if(!map.has(cell))map.set(cell,[]);map.get(cell).push(u);
   if(u.minion){let old=waveFrontIndex[u.side][u.lane];if(!old||(u.side===1?u.x>old.x:u.x<old.x))waveFrontIndex[u.side][u.lane]=u}
 }
}
function laneSide(side,lane){return unitIndex[side][lane]}
function nearbyUnits(side,lane,x,r){
 let map=unitCells[side][lane],out=[],a=Math.floor((x-r)/CELL_SIZE),b=Math.floor((x+r)/CELL_SIZE);
 for(let cell=a;cell<=b;cell++){let list=map.get(cell);if(list)out.push(...list)}
 return out
}
function closestUnit(from,u,maxDist,pred=()=>true){
 let best=null,bestD=maxDist;
 for(const v of from){if(v.dead||!pred(v))continue;let d=dist(u,v);if(d<=bestD){best=v;bestD=d}}
 return best
}
function nearestEnemy(u,range){let r=range*PX;return closestUnit(nearbyUnits(-u.side,u.lane,u.x,r),u,r)}
function frontEnemyStructure(side,lane){
 let a=aliveTowers(-side,lane);
 if(!a.length)return{kind:'base',side:-side,lane,x:BASE_X[-side]};
 return a.sort((x,y)=>side===1?x.x-y.x:y.x-x.x)[0]
}
function nextStructure(u){
 if(u.minion){
   let locked=structures.find(s=>!s.dead&&s.id===u.objectiveId);
   if(locked)return locked;
   let front=frontEnemyStructure(u.side,u.lane);
   u.objectiveId=front.kind==='tower'?front.id:null;
   return front
 }
 let a=aliveTowers(-u.side,u.lane).filter(s=>u.side===1?s.x>=u.x-10:s.x<=u.x+10);
 return a.length?a.sort((x,y)=>Math.abs(x.x-u.x)-Math.abs(y.x-u.x))[0]:{kind:'base',side:-u.side,lane:u.lane,x:BASE_X[-u.side]}
}
function defX(u){
 let o=orders[u.side][u.lane];if(o==='base')return BASE_X[u.side]+u.side*220;
 let a=aliveTowers(u.side,u.lane);if(!a.length)return BASE_X[u.side]+u.side*220;
 let r=a.sort((x,y)=>Math.abs(x.x-u.x)-Math.abs(y.x-u.x))[0];
 if(o==='behind')return r.x-u.side*190;if(o==='ahead')return r.x+u.side*190;return r.x-u.side*45
}
function enemyCandidates(u,range,pred=()=>true){
 let r=range*PX;return nearbyUnits(-u.side,u.lane,u.x,r).filter(v=>!v.dead&&pred(v)&&dist(u,v)<=r).sort((a,b)=>dist(u,a)-dist(u,b))
}
function chaseAllowed(u,v,s){
 if(!v||s.kind==='base')return !!v;
 let margin=6*PX;
 return u.side===1?v.x<=s.x+margin:v.x>=s.x-margin
}
function orderedEnemy(u,range,order,s){
 if(order==='advance'){
   let minion=enemyCandidates(u,range,v=>v.minion)[0];if(minion)return minion;
   return enemyCandidates(u,range)[0]
 }
 if(order==='attack'){
   let troop=enemyCandidates(u,range,v=>!v.minion&&chaseAllowed(u,v,s))[0];if(troop)return troop;
   return enemyCandidates(u,range,v=>chaseAllowed(u,v,s))[0]
 }
 return enemyCandidates(u,range)[0]
}
function escortX(u){
 let front=waveFrontIndex[u.side][u.lane];
 if(!front){
   let own=aliveTowers(u.side,u.lane);if(!own.length)return BASE_X[u.side]+u.side*220;
   let tower=own.sort((a,b)=>u.side===1?b.x-a.x:a.x-b.x)[0];return tower.x+u.side*190
 }
 let gap=(u.role==='ranged'||u.role==='support'||u.role==='controller'||u.role==='siege')?190:75;
 return front.x-u.side*gap
}
function structureSupported(u,s){
 let sy=s.kind==='base'?BASE_Y:laneYAt(s.lane,s.x),radius=COMBAT.siege.breachRadius*PX;
 return nearbyUnits(u.side,u.lane,s.x,radius).some(v=>!v.dead&&v.minion&&Math.hypot(v.x-s.x,yOf(v)-sy)<=radius)
}
function alliesNear(u,r=300){return nearbyUnits(u.side,u.lane,u.x,r).filter(v=>!v.dead&&v!==u&&dist(u,v)<r).length}
function attackRate(u){
 let m=1;if(u.fac==='Orcs'&&u.hp/u.maxHp<.4)m*=.82;
 if(u.fac==='Músicos'&&u.attackCount%4===3)m*=.7;
 if(simTime<u.musicUntil)m*=.9;
 return Math.max(.35,u.rate*m)
}
function move(u,x,dt){
 let d=x-u.x;if(Math.abs(d)<7){u.runTime=0;return}
 let now=simTime,slow=now<u.slowUntil ? .92 : 1;
 u.x+=Math.sign(d)*u.speed*MOVE_SCALE*slow*dt;u.x=clamp(u.x,BASE_X[1]+70,BASE_X[-1]-70);
 u.lastMoved=now;u.runTime+=dt;
 if(u.fac==='Dinossauros'&&u.runTime>=1.5)u.chargeReady=true
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
   let order=u.minion?'advance':orders[u.side][u.lane],s=nextStructure(u),sy=s.kind==='base'?BASE_Y:laneYAt(s.lane,s.x),
       sr=Math.hypot(s.x-u.x,sy-yOf(u))<=u.range*PX,foe=orderedEnemy(u,u.range,order,s),
       chase=order==='attack'?orderedEnemy(u,15,order,s):null;
   if(u.role==='siege'&&sr){
     if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}
   }else if(foe){
     if(t-u.lastAttack>=attackRate(u)){attack(u,foe,t);u.lastAttack=t;u.attackCount++}
   }else if(chase){
     move(u,chase.x,dt)
   }else if(u.minion||order==='attack'){
     if(sr){if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}}else move(u,s.x,dt)
   }else if(order==='advance'){
     let destination=escortX(u);
     if(sr&&structureSupported(u,s)){if(t-u.lastAttack>=attackRate(u)){attackStructure(u,s,t);u.lastAttack=t;u.attackCount++}}
     else move(u,destination,dt)
   }else move(u,defX(u),dt)
 }
 units=units.filter(u=>!u.dead&&u.hp>0)
}
function structurePacing(){return matchTime<480?.68:matchTime<720?.84:1}
function siegeMinionNear(s){
 if(s.kind!=='tower')return false;
 let radius=COMBAT.siege.breachRadius*PX,sy=laneYAt(s.lane,s.x);
 return nearbyUnits(-s.side,s.lane,s.x,radius).some(u=>!u.dead&&u.minion&&Math.hypot(u.x-s.x,yOf(u)-sy)<=radius)
}
function towerDamageTaken(s,t){
 if(siegeMinionNear(s))s.breachUntil=t+COMBAT.siege.breachGrace;
 s.fortified=t>s.breachUntil;
 return s.fortified?COMBAT.siege.fortifiedDamageTaken:1
}
function attackStructure(a,s,t){
 let d=a.atk*(a.special.siege||1)*structurePacing();
 if(a.role==='siege')d*=1.25;
 if(a.minion)d*=COMBAT.siege.minionStructureDamage;
 if(s.kind==='base')damageBase(s.side,d);
 else{d*=towerDamageTaken(s,t);s.hp-=d;if(s.hp<=0){s.hp=0;s.dead=true}}
 let y=s.kind==='base'?BASE_Y:laneYAt(s.lane,s.x);effects.push({type:'impact',x:s.x,y,t,color:attackColor(a)});
 if(a.range>4)effects.push({type:'beam',x1:a.x,y1:yOf(a)-18,x2:s.x,y2:y-30,t,color:attackColor(a)})
}
function nearFriendlyTower(u,r=8*PX){
 return structures.some(s=>!s.dead&&s.kind==='tower'&&s.side===u.side&&s.lane===u.lane&&Math.abs(s.x-u.x)<=r)
}
function effectiveDefense(u){
 return u.def*(u.fac==='Medievais'&&nearFriendlyTower(u)?1.08:1)
}
function incomingMultiplier(b){
 let m=1;
 if(b.fac==='Robôs')m*=.88;
 if(b.special.block)m*=1-Math.min(.25,b.special.block+(alliesNear(b,260)>0?.06:0));
 return m
}
function controlDuration(v,duration,t){
 let d=duration;
 if(v.role==='elite'||v.role==='unique')d*=.75;
 if(v.fac==='Mentalistas'&&t>=v.mentalGuardReadyAt){
   d*=COMBAT.mentalistGuard.durationMultiplier;
   v.mentalGuardReadyAt=t+COMBAT.mentalistGuard.cooldown;
   v.powerFlash=t
 }
 return d
}
function factionDamageBonus(a,b){
 let m=1;
 if(a.minion&&b.minion&&facMeta(a.fac).counter===b.fac)m*=1.20;
 if(a.fac==='Samurais'&&a.hp/a.maxHp<.35)m*=1.20;
 if(a.fac==='Lobos')m*=1+Math.min(.24,alliesNear(a,260)*.08);
 if(a.fac==='Cultistas')m*=1+Math.min(.15,Math.floor(alliesNear(a,280)/3)*.05);
 if(a.fac==='Músicos'&&a.attackCount%4===3)m*=1.25;
 if(a.role==='elite'&&b.minion)m*=1.10;
 if(a.role==='fighter'&&alliesNear(b,210)===0)m*=1.10;
 return m
}
function dodgeChance(b){return Math.min(.4,b.special.dodge||0)}
function killUnit(b,killer,t){
 if(b.dead)return;b.dead=true;if(killer)reward(b,killer);
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
 let def=effectiveDefense(b)*(1-Math.min(.2,b.acidStacks*.04));
 if(a.special.armorPierce)def*=1-a.special.armorPierce;
 if(a.fac==='Físicos')def*=.90;
 let roleBonus=1;
 if(a.role==='ranged'&&t-a.lastMoved>=3){roleBonus*=1.20;a.lastMoved=t}
 if(a.role==='assassin'&&a.lastTargetId!==b.id&&t-a.lastTargetSwitch>=5){roleBonus*=1.25;a.lastTargetSwitch=t}
 if(a.role==='bruiser'){if(a.combatSince===null||t-a.lastDamaged>4)a.combatSince=t;roleBonus*=1+Math.min(.12,(t-a.combatSince)*.02)}
 a.lastTargetId=b.id;
 let d=a.atk*factionDamageBonus(a,b)*roleBonus,red=Math.min(.75,def/(def+125));d*=1-red;d*=incomingMultiplier(b);
 if(a.special.charge&&a.chargeReady){d*=1+a.special.charge;a.chargeReady=false;a.runTime=0}
 b.hp-=d;b.lastDamaged=t;if(b.combatSince===null)b.combatSince=t;
 if(a.fac==='Demônios'||a.special.lifesteal)a.hp=Math.min(a.maxHp,a.hp+d*(a.special.lifesteal||.10));
 if(a.fac==='Alquimistas'||a.special.acid)b.acidStacks=Math.min(5,b.acidStacks+1);
 if(a.fac==='Bestas Marinhas'||a.special.slow)b.slowUntil=Math.max(b.slowUntil,t+2.5);
 if(a.special.radiation)b.radiation=Math.min(.12,b.radiation+a.special.radiation);
 if(b.fac==='Cristalinos'&&a.hp>0){a.hp-=d*.08;if(a.hp<=0)killUnit(a,b,t)}
 if(a.special.splash||a.fac==='Elementais')nearbyUnits(b.side,b.lane,b.x,90).filter(v=>v!==b&&!v.dead&&dist(b,v)<90).forEach(v=>{v.hp-=d*.10;v.lastDamaged=t;if(v.hp<=0)killUnit(v,a,t)});
 if(a.fac==='Músicos'&&a.attackCount%4===3)units.filter(v=>!v.dead&&v.side===a.side&&v.lane===a.lane&&dist(a,v)<260).forEach(v=>v.musicUntil=Math.max(v.musicUntil,t+3));
 effects.push({type:'impact',x:b.x,y:yOf(b),t,color:attackColor(a)});
 if(a.range>4||a.role==='ranged'||a.role==='controller'||a.role==='support')effects.push({type:'beam',x1:a.x,y1:yOf(a)-18,x2:b.x,y2:yOf(b)-14,t,color:attackColor(a)});
 if(b.hp<=0)killUnit(b,a,t)
}
function updateTowers(t){
 for(const s of structures){
   if(s.dead)continue;
   towerDamageTaken(s,t);
   if(t-s.lastAttack<s.rate)continue;
   let sy=laneYAt(s.lane,s.x),v=null,best=s.range*PX;
   for(const u of nearbyUnits(-s.side,s.lane,s.x,best)){if(u.dead)continue;let d=Math.hypot(u.x-s.x,yOf(u)-sy);if(d<=best){best=d;v=u}}
   if(!v)continue;let def=effectiveDefense(v),d=s.atk*(1-Math.min(.65,def/(def+140)))*incomingMultiplier(v);v.hp-=d;v.lastDamaged=t;
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
   let v=nearestEnemy(u,u.range);if(v){v.stunUntil=t+controlDuration(v,s.stun.duration,t);u.lastSkill=t;u.powerFlash=t}
 }
}
function hud(t){
 $('#gold').textContent=Math.floor(gold);$('#playerBase').textContent=Math.ceil(playerBase);$('#enemyBase').textContent=Math.ceil(enemyBase);
 $('#playerTowers').textContent=structures.filter(s=>!s.dead&&s.side===1).length;$('#enemyTowers').textContent=structures.filter(s=>!s.dead&&s.side===-1).length;
 let tm=$('#matchTimer');if(tm)tm.textContent=timeText(matchTime);
 let wave=$('#waveTimer');if(wave)wave.textContent=Math.ceil(WAVE_INTERVAL-waveClock)+'s';
 document.querySelectorAll('.spawn').forEach((b,i)=>{let u=loadout[i].u,left=Math.max(0,(spawnCd['p'+i]||0)-t);b.disabled=gameMode==='robot'||gold<u.cost||left>0||!canSpawnUnit(1,u);b.querySelector('small').textContent=left?left.toFixed(0)+'s':`${loadout[i].fac} • ${u.cost} • ${u.gen}s`})
}
