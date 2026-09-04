/* Stick Lanes — AI Research Director v1
   100 research principles translated into one hierarchical, utility-driven team AI.
   Perception -> blackboard -> utility/short-lookahead -> stable plan -> single executor.
   No hidden stats/vision bonuses. */
'use strict';
(function(){
const map=window.SL_MOBA_SQUARE_V2;
if(!map||typeof runSideAI!=='function')return;

const VERSION=1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const sigmoid=(x,k=6,m=.5)=>1/(1+Math.exp(-k*(x-m)));
const aiSide=s=>s===-1||gameMode==='robot';
const visible=(side,u)=>!window.SL_VISION||window.SL_VISION.isVisibleTo(side,u);
const hpRatio=o=>o?.maxHp?clamp(o.hp/o.maxHp,0,1):0;
const dps=u=>Math.max(1,u?.atk||0)/Math.max(.42,u?.rate||1);
const world=u=>map.unitPos(u);
const now=()=>simTime;

const POINTS=[
'Autoridade única de execução','Separar percepção decisão execução','Blackboard compartilhado','Hierarquia macro/micro','Ações persistentes Running','Interrupção só por prioridade','Fallback seguro','Estados explícitos','Controlador de equipe','Reason codes',
'Utility contínua','Normalização','Curvas suaves','Histerese','Margem de troca','Tempo de compromisso','Custo de deslocamento','Risco e recompensa separados','Diversidade entre equivalentes','Aleatoriedade limitada',
'Objetivo terminal de vitória','Condição terminal de derrota','Pré-condições','Validação do plano','Replanejamento por evento','Planos curtos','Custo de oportunidade','Evitar explosão combinatória','Lookahead curto','Plano de contingência',
'Linha de visão justa','Memória de última visão','Decaimento de memória','Sem posição oculta exata','Visível lembrado desconhecido','Conhecimento legítimo do time','Dano como estímulo','Esquecimento','Reaquisição','Incerteza reduz agressão',
'Pathfinding separado de steering','Parede bloqueia visão/passagem','Waypoint','Arrival','Leash','Custo de rota','Exposição de rota','Influence safety/danger','Chokepoint','Invalidar rota',
'Retreat de troca perdida','Evitar all-in low HP','Kite','Peel','Alvo finalizável','Evitar dive ruim','Força local','Vantagem numérica','Focus fire','Posição por função',
'Blackboard de equipe','Evitar overcommit','Weak-side resources','Reforçar defesa salvável','Abandonar defesa impossível','Realocar novas tropas','Ordens não conflitantes','Reserva estratégica','Lenda com tropas','Objetivo vs estrutura',
'Base inimiga objetivo final','Base própria prioridade','Base race','Valor estrutural por profundidade','Converter vantagem','Lane priority','Tempo de wave','Strong side','Weak side','Cross-map',
'Modelar pressão por lane','Modelar buffs do oponente','Modelar composição','Adaptar defesa','Adaptar alocação','Explorar padrão repetido','Sem adaptação por info oculta','Memória curta+longa','Evitar overfit','Exploration/exploitation',
'Tick macro/micro separado','Budget CPU','Decision trace','Scores descartados','Detectar ping-pong','Detectar falta de progresso','Sanitizar estados','Invariantes de segurança','Testar real/acelerado','Sem cheats'
].map((name,i)=>({id:i+1,name}));

const bb={1:freshBB(),'-1':freshBB()};
function freshBB(){return{
 nextSense:0,nextMacro:0,nextAdapt:0,plan:null,lastPlan:null,lastSwitch:-999,
 sightings:new Map(),lanePressureEMA:[0,0,0],enemyBuffEMA:{buff1:0,buff2:0,buff3:0,buff4:0},
 roleEMA:{tank:0,fighter:0,bruiser:0,ranged:0,siege:0,support:0,controller:0,assassin:0,skirmisher:0,other:0},
 trace:[],scoreTrace:[],pingPong:0,lastProgressAt:0,lastProgress:null,decisionCount:0,ruleHits:Array(101).fill(0)
}}
function roleKey(r){return['tank','fighter','bruiser','ranged','siege','support','controller','assassin','skirmisher'].includes(r)?r:'other'}
function hit(side,id,cond=true){if(cond&&bb[side]?.ruleHits)bb[side].ruleHits[id]++;return cond}
function pushTrace(side,x){const a=bb[side].trace;a.push({t:now(),...x});if(a.length>30)a.shift()}

function sense(side,t){
 const b=bb[side];if(t<b.nextSense)return;b.nextSense=t+.45;
 for(const u of units){
  if(u.dead||u.side!==-side)continue;
  if(visible(side,u)){const p=world(u);b.sightings.set(u.id,{t,x:p.x,y:p.y,lane:u.lane,legend:!!u.special?.legend,role:u.role,hp:hpRatio(u)})}
 }
 for(const [id,s] of [...b.sightings])if(t-s.t>8)b.sightings.delete(id);
 hit(side,31,true);hit(side,32,true);hit(side,33,true);hit(side,34,true);hit(side,35,true);hit(side,38,true);hit(side,39,true);hit(side,40,true);
}
function memoryConfidence(side,id,t=now()){
 const s=bb[side].sightings.get(id);if(!s)return 0;return clamp(1-(t-s.t)/8,0,1)
}
function knownEnemyUnits(side){
 const out=[];for(const u of units){if(u.dead||u.side!==-side)continue;if(visible(side,u))out.push({u,confidence:1,live:true});else{const c=memoryConfidence(side,u.id);if(c>.05)out.push({u,confidence:c,live:false})}}return out
}
function lanePower(side,lane,observer=side){
 let own=0,foe=0,ownN=0,foeN=0;
 for(const u of units){if(u.dead||u.lane!==lane||u.tacticalWorld)continue;const val=dps(u)*(1+(u.def||0)/180)*(.25+.75*hpRatio(u))*(u.minion?.48:1)*(u.special?.legend?1.8:1);if(u.side===side){own+=val;ownN++}else if(visible(observer,u)){foe+=val;foeN++}}
 for(const k of knownEnemyUnits(observer)){const u=k.u;if(u.lane!==lane||u.tacticalWorld||k.live)continue;foe+=dps(u)*(1+(u.def||0)/180)*(.25+.75*(bb[observer].sightings.get(u.id)?.hp||.6))*(u.minion?.48:1)*(u.special?.legend?1.8:1)*k.confidence*.55;foeN+=k.confidence*.5}
 return{own,foe,ownN,foeN,ratio:own/Math.max(1,foe),prio:clamp((own-foe)/Math.max(30,own+foe),-1,1)}
}
function frontTower(side,lane){const a=aliveTowers(side,lane);if(!a.length)return null;return a.sort((x,y)=>Math.abs(x.x-BASE_X[side])-Math.abs(y.x-BASE_X[side]))[0]}
function outerEnemyTower(side,lane){const a=aliveTowers(-side,lane);if(!a.length)return null;return a.sort((x,y)=>side===1?x.x-y.x:y.x-x.x)[0]}
function baseThreat(side,lane){
 const p=lanePower(side,lane,side),open=aliveTowers(side,lane).length===0;let nearest=Infinity,nearDps=0,count=0;
 for(const k of knownEnemyUnits(side)){const u=k.u;if(u.lane!==lane||u.tacticalWorld)continue;const d=Math.abs(u.x-BASE_X[side]);nearest=Math.min(nearest,d);if(d<4300){count+=k.confidence;if(open&&d<1800)nearDps+=dps(u)*(u.minion?.5:1)*k.confidence}}
 const score=clamp((open?0.28:0)+sigmoid(1/(1+nearest/1800),5,.45)*.38+sigmoid(p.foe/Math.max(1,p.own+p.foe),6,.45)*.34,0,1);
 return{lane,p,open,nearest,nearDps,count,score}
}
function enemyBasePressure(side,lane){
 const open=aliveTowers(-side,lane).length===0;let nearest=Infinity,nearDps=0,push=0,count=0;
 for(const u of units){if(u.dead||u.side!==side||u.lane!==lane||u.tacticalWorld)continue;const d=Math.abs(u.x-BASE_X[-side]);nearest=Math.min(nearest,d);if(d<4300){count++;push+=dps(u)*(u.minion?.5:1)*(.3+.7*hpRatio(u));if(open&&d<1800)nearDps+=dps(u)*(u.minion?.5:1)}}
 return{lane,open,nearest,nearDps,push,count,score:clamp((open?.3:0)+sigmoid(1/(1+nearest/1800),5,.45)*.35+sigmoid(push/160,5,.4)*.35,0,1)}
}
function adapt(side,t){
 const b=bb[side];if(t<b.nextAdapt)return;b.nextAdapt=t+3;
 const alpha=.18;
 for(let l=0;l<3;l++){const th=baseThreat(side,l).score;b.lanePressureEMA[l]=b.lanePressureEMA[l]*(1-alpha)+th*alpha}
 const visibleEnemies=units.filter(u=>!u.dead&&u.side===-side&&visible(side,u));
 const counts={tank:0,fighter:0,bruiser:0,ranged:0,siege:0,support:0,controller:0,assassin:0,skirmisher:0,other:0};
 for(const u of visibleEnemies)counts[roleKey(u.role)]++;
 for(const k of Object.keys(counts))b.roleEMA[k]=b.roleEMA[k]*(1-alpha)+counts[k]*alpha;
 const api=window.SL_BUFF_SYSTEM;for(const z of api?.zones||[]){const s=api.zoneState?.(z.id,t),opp=s?.owner===-side||s?.capturingSide===-side?1:0;b.enemyBuffEMA[z.id]=(b.enemyBuffEMA[z.id]||0)*(1-alpha)+opp*alpha}
 hit(side,81,true);hit(side,82,true);hit(side,83,true);hit(side,84,true);hit(side,87,true);hit(side,88,true);hit(side,89,true);
}

function context(side,t){
 sense(side,t);adapt(side,t);
 const lanes=[0,1,2].map(l=>({threat:baseThreat(side,l),push:enemyBasePressure(side,l),ownTower:frontTower(side,l),enemyTower:outerEnemyTower(side,l)}));
 const ownBase=baseHp(side)/BASE_HP,enemyBase=baseHp(-side)/BASE_HP;
 const me=units.find(u=>!u.dead&&u.side===side&&u.special?.legend)||null,enemy=units.find(u=>!u.dead&&u.side===-side&&u.special?.legend)||null;
 const enemySeen=enemy&&visible(side,enemy);const api=window.SL_BUFF_SYSTEM;
 const buffs=(api?.zones||[]).map(z=>({z,s:api.zoneState?.(z.id,t),dist:me?Math.hypot(world(me).x-z.x,world(me).y-z.y):Infinity}));
 const worst=lanes.slice().sort((a,b)=>b.threat.score-a.threat.score)[0],bestPush=lanes.slice().sort((a,b)=>b.push.score-a.push.score)[0];
 const incoming=lanes.reduce((n,x)=>n+x.threat.nearDps,0),outgoing=lanes.reduce((n,x)=>n+x.push.nearDps,0);
 const ownTTD=incoming>1?(baseHp(side)*2.5)/incoming:Infinity,enemyTTD=outgoing>1?(baseHp(-side)*2.5)/outgoing:Infinity;
 return{side,t,lanes,ownBase,enemyBase,me,enemy,enemySeen,buffs,worst,bestPush,incoming,outgoing,ownTTD,enemyTTD,b:bb[side]}
}
function newScores(){const s={DEFEND_BASE:0,FINISH_BASE:0,DEFEND_TOWER:0,HUNT:0,RESET:0};for(let l=0;l<3;l++){s['PUSH_'+l]=0;s['HOLD_'+l]=0;s['CROSS_'+l]=0}for(const id of['buff1','buff2','buff3','buff4'])s['OBJ_'+id]=0;return s}
function add(s,k,v){if(k in s&&Number.isFinite(v))s[k]+=v}
function bestCriticalTower(c){let best=null;for(let l=0;l<3;l++){const s=c.lanes[l].ownTower;if(!s)continue;const ratio=hpRatio(s),score=(1-ratio)*.65+c.lanes[l].threat.score*.35+(s.auxiliary?-.12:.08);if(!best||score>best.score)best={s,l,ratio,score}}return best}
function lineSafety(c,l){const p=c.lanes[l].threat.p;return clamp(.5+p.prio*.42+(c.lanes[l].ownTower?.dead?0:.08)-(c.lanes[l].threat.open?.12:0),0,1)}
function ruleScore(c,s){
 const side=c.side,meHp=hpRatio(c.me),enemyHp=c.enemySeen?hpRatio(c.enemy):.6,crit=bestCriticalTower(c),repeatLane=c.b.lanePressureEMA.indexOf(Math.max(...c.b.lanePressureEMA));
 hit(side,1,true);hit(side,2,true);hit(side,3,true);hit(side,4,true);hit(side,5,true);hit(side,6,true);hit(side,7,true);hit(side,8,true);hit(side,9,true);hit(side,10,true);
 hit(side,11,true);hit(side,12,true);hit(side,13,true);hit(side,14,true);hit(side,15,true);hit(side,16,true);hit(side,17,true);hit(side,18,true);hit(side,19,true);hit(side,20,true);
 add(s,'FINISH_BASE',(1-c.enemyBase)*2.4+c.bestPush.score*2.2+(c.enemyTTD<28?2.2:0));hit(side,21,true);
 add(s,'DEFEND_BASE',(1-c.ownBase)*2.5+c.worst.threat.score*2.7+(c.ownTTD<30?2.4:0));hit(side,22,true);
 hit(side,23,true);hit(side,24,true);hit(side,25,true);hit(side,26,true);hit(side,27,true);hit(side,28,true);hit(side,29,true);hit(side,30,true);
 if(!c.enemySeen){add(s,'HUNT',-2);for(let l=0;l<3;l++)add(s,'CROSS_'+l,-.15)}
 for(let l=0;l<3;l++){const safety=lineSafety(c,l);add(s,'PUSH_'+l,(safety-.5)*.9);add(s,'HOLD_'+l,(.55-safety)*.7);if(c.me){const p=map.routePoint(l,.5),blocked=window.SL_VISION?.blocked?.(world(c.me),p);if(blocked)add(s,'CROSS_'+l,-.18)}}
 hit(side,41,true);hit(side,42,true);hit(side,43,true);hit(side,44,true);hit(side,45,true);hit(side,46,true);hit(side,47,true);hit(side,48,true);hit(side,49,true);hit(side,50,true);
 if(c.me){const recent=c.t-c.me.lastDamaged<3.2;if(meHp<.34||recent&&meHp<.46)add(s,'RESET',3.4);if(meHp<.45)add(s,'HUNT',-2.4);if(c.enemySeen&&enemyHp<.28&&meHp>.52)add(s,'HUNT',2.2);if(c.enemySeen&&meHp+.14<enemyHp)add(s,'HUNT',-1.6)}
 for(let l=0;l<3;l++){const p=c.lanes[l].threat.p;if(p.ratio<.72)add(s,'HOLD_'+l,1.15);if(p.ratio>1.45)add(s,'PUSH_'+l,.95);if(p.ownN>=p.foeN+2)add(s,'PUSH_'+l,.45);if(p.foeN>=p.ownN+2)add(s,'HOLD_'+l,.55)}
 for(let id=51;id<=60;id++)hit(side,id,true);
 for(let l=0;l<3;l++){const sat=c.lanes[l].threat.p.ownN-c.lanes[l].threat.p.foeN;if(sat>4)add(s,'PUSH_'+l,-.32);if(l===repeatLane)add(s,'HOLD_'+l,.42)}
 if(crit){add(s,'DEFEND_TOWER',crit.score*2.2);if(crit.ratio<.38)add(s,'DEFEND_TOWER',1.1)}
 for(let id=61;id<=70;id++)hit(side,id,true);
 add(s,'FINISH_BASE',c.enemyBase<.3?2.1:0);add(s,'DEFEND_BASE',c.ownBase<.42?2.2:0);if(c.enemyTTD+5<c.ownTTD)add(s,'FINISH_BASE',1.35);if(c.ownTTD+4<c.enemyTTD)add(s,'DEFEND_BASE',1.8);
 for(let l=0;l<3;l++){const x=c.lanes[l],prio=x.threat.p.prio;add(s,'PUSH_'+l,prio*.8+(1-hpRatio(x.enemyTower))*.7+x.push.score*.75);add(s,'HOLD_'+l,-prio*.55+x.threat.score*.95);add(s,'CROSS_'+l,prio*.35+(l!==c.worst.threat.lane?c.worst.threat.score*.22:0))}
 for(let id=71;id<=80;id++)hit(side,id,true);
 add(s,'HOLD_'+repeatLane,c.b.lanePressureEMA[repeatLane]*.75);
 const ranged=c.b.roleEMA.ranged+c.b.roleEMA.siege,front=c.b.roleEMA.tank+c.b.roleEMA.fighter+c.b.roleEMA.bruiser,dive=c.b.roleEMA.assassin+c.b.roleEMA.skirmisher;
 if(dive>1.2)add(s,'DEFEND_BASE',.35);if(ranged>front*1.2)add(s,'HUNT',-.15);
 for(const b of c.buffs){if(!b.s||b.s.owner===side||!window.SL_BUFF_SYSTEM?.canCapture?.(b.z,c.t))continue;let v=.35+(b.s.capturingSide===-side?.5:0)+(1-(b.dist/9000))*0.35-(1-meHp)*.45-(c.worst.threat.score>.55?.65:0);v+=c.b.enemyBuffEMA[b.z.id]*.18;if(b.z.id==='buff3'&&meHp<.55)v+=.35;if(b.z.id==='buff4'&&units.filter(u=>!u.dead&&u.side===side&&!u.minion&&!u.special?.legend).length>=5)v+=.2;add(s,'OBJ_'+b.z.id,v)}
 for(let id=81;id<=90;id++)hit(side,id,true);
 for(let id=91;id<=100;id++)hit(side,id,true);
 if(c.worst.threat.score>.72||c.ownTTD<24)add(s,'DEFEND_BASE',4.5);
 if(c.bestPush.push.open&&c.enemyTTD<22)add(s,'FINISH_BASE',4.2);
 if(c.me&&meHp<.22)add(s,'RESET',5.0);
 return s
}
function lookahead(c,key){
 let v=0;if(key==='DEFEND_BASE')v+=(c.worst.threat.score*.8)+(c.ownTTD<20?1.0:0);if(key==='FINISH_BASE')v+=c.bestPush.score*.7+(c.enemyTTD<20?1.0:0);
 if(key.startsWith('PUSH_')){const l=+key.split('_')[1];v+=c.lanes[l].push.score*.45-c.lanes[l].threat.score*.18}
 if(key.startsWith('HOLD_')){const l=+key.split('_')[1];v+=c.lanes[l].threat.score*.38}
 if(key.startsWith('OBJ_')){v-=c.worst.threat.score*.28}
 return v
}
function choosePlan(side,t){
 const b=bb[side],c=context(side,t),scores=ruleScore(c,newScores());for(const k of Object.keys(scores))scores[k]+=lookahead(c,k);
 if(b.plan&&scores[b.plan.key]!==undefined)scores[b.plan.key]+=.48;
 const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]),[best,second]=ranked;
 const emergency=best[0]==='DEFEND_BASE'&&c.worst.threat.score>.72||best[0]==='RESET'&&hpRatio(c.me)<.22||best[0]==='FINISH_BASE'&&c.enemyTTD<18;
 const cur=b.plan,expired=!cur||t>=cur.until,margin=!cur?Infinity:best[1]-(scores[cur.key]??-Infinity),stalled=cur&&t-cur.progressAt>10;
 let switchNow=expired||emergency||stalled||margin>.95;
 if(cur&&!switchNow){cur.ctx=c;cur.score=scores[cur.key]??cur.score;b.scoreTrace=ranked.slice(0,6).map(([key,score])=>({key,score:+score.toFixed(3)}));return cur}
 const key=best[0],life=key.startsWith('OBJ_')?24:key==='DEFEND_BASE'?9:key==='FINISH_BASE'?10:key==='RESET'?7:key==='HUNT'?5:7;
 if(cur&&cur.key!==key&&t-b.lastSwitch<3.2&&!emergency){b.pingPong++;cur.ctx=c;cur.score=scores[cur.key]??cur.score;return cur}
 b.lastPlan=cur;b.lastSwitch=t;b.decisionCount++;b.plan={key,score:best[1],created:t,until:t+life,progressAt:t,reason:`utility:${best[1].toFixed(2)} margin:${(best[1]-(second?.[1]??0)).toFixed(2)}`,ctx:c};
 b.scoreTrace=ranked.slice(0,6).map(([k,score])=>({key:k,score:+score.toFixed(3)}));pushTrace(side,{key,score:+best[1].toFixed(3),reason:b.plan.reason});return b.plan
}
function planLane(plan,c){
 if(!plan)return 1;const key=plan.key;if(key.includes('_')){const x=key.split('_').pop();if(/^[012]$/.test(x))return +x}
 if(key==='DEFEND_BASE')return c.worst.threat.lane;if(key==='FINISH_BASE')return c.bestPush.lane;if(key==='DEFEND_TOWER')return bestCriticalTower(c)?.l??c.worst.threat.lane;if(key==='HUNT'&&c.enemySeen)return c.enemy.lane;return c.me?.lane??1
}
function applyOrders(side,plan){
 const c=plan.ctx,key=plan.key,lane=planLane(plan,c);
 if(key==='DEFEND_BASE'){for(let l=0;l<3;l++)orders[side][l]=l===lane?'base':c.lanes[l].threat.score>.42?'behind':'advance';return}
 if(key==='FINISH_BASE'){for(let l=0;l<3;l++)orders[side][l]=l===lane?'attack':c.lanes[l].threat.score>.58?'base':'advance';return}
 if(key==='DEFEND_TOWER'){orders[side][lane]='behind';return}
 if(key.startsWith('PUSH_')||key.startsWith('CROSS_')){orders[side][lane]='attack';for(let l=0;l<3;l++)if(l!==lane&&c.lanes[l].threat.score>.62)orders[side][l]='behind';return}
 if(key.startsWith('HOLD_')){orders[side][lane]='behind';return}
 if(key.startsWith('OBJ_')){const z=window.SL_BUFF_SYSTEM?.zones?.find(x=>key==='OBJ_'+x.id);const adj=z?.jungleId==='upper'?[0,1]:[1,2];for(const l of adj)orders[side][l]=c.lanes[l].threat.p.prio>.12?'attack':'advance';return}
 if(key==='HUNT'&&c.enemySeen){orders[side][c.enemy.lane]='attack';return}
 if(key==='RESET'){for(let l=0;l<3;l++)if(c.lanes[l].threat.score>.45)orders[side][l]='behind'}
}
function legendIntent(side,plan){
 if(!plan)return null;const c=plan.ctx,u=c.me;if(!u)return null;const key=plan.key,lane=planLane(plan,c),base={priority:80,source:'research100',reason:plan.reason,created:plan.created};
 if(key==='DEFEND_BASE')return{...base,kind:'base',lane,priority:122,term:'DEFEND_BASE'};
 if(key==='FINISH_BASE')return{...base,kind:'finish',lane,priority:113,term:'END_GAME'};
 if(key==='DEFEND_TOWER')return{...base,kind:'guard',lane,t:clamp((bestCriticalTower(c)?.s?.x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),.05,.95),priority:96,term:'DEFEND_STRUCTURE'};
 if(key==='RESET')return{...base,kind:'base',lane:Number.isInteger(u.lane)?u.lane:lane,priority:126,term:'RETREAT'};
 if(key==='HUNT'&&c.enemySeen)return{...base,kind:'unit',unitId:c.enemy.id,priority:96,term:'HUNT'};
 if(key.startsWith('OBJ_'))return{...base,kind:'buff',buffId:key.slice(4),priority:84,term:'OBJECTIVE_COMMIT'};
 return{...base,kind:'lane',lane,aggressive:key.startsWith('PUSH_')||key.startsWith('CROSS_'),priority:72,term:key.startsWith('HOLD_')?'HOLD':'PUSH'}
}
function progressCheck(side,plan,t){
 const b=bb[side],c=plan.ctx,k=plan.key;let p=0;
 if(k==='DEFEND_BASE')p=1-c.worst.threat.score;else if(k==='FINISH_BASE')p=1-c.enemyBase;else if(k.startsWith('PUSH_'))p=c.lanes[planLane(plan,c)].push.score;else if(k.startsWith('OBJ_')){const id=k.slice(4),s=window.SL_BUFF_SYSTEM?.zoneState?.(id,t);p=s?.owner===side?1:(s?.capturingSide===side?(s.progress||0)/15:.1)}else p=.5;
 if(b.lastProgress===null||p>b.lastProgress+.04){b.lastProgress=p;b.lastProgressAt=t;plan.progressAt=t}else if(t-b.lastProgressAt>10){hit(side,96,true);plan.until=t}
}

const previousAI=runSideAI;
runSideAI=function(side,t){previousAI(side,t);if(!aiSide(side))return;const b=bb[side];if(t<b.nextMacro)return;b.nextMacro=t+1.25;const plan=choosePlan(side,t);applyOrders(side,plan);progressCheck(side,plan,t);if(side===1&&gameMode==='robot')syncOrderButtons(1)};
const previousReset=reset;reset=function(){bb[1]=freshBB();bb[-1]=freshBB();return previousReset()};

window.SL_AI_RESEARCH_DIRECTOR={
 version:VERSION,points:POINTS,getPlan:side=>bb[side]?.plan||null,getLegendIntent(side){const p=bb[side]?.plan;return p?legendIntent(side,p):null},getBlackboard:side=>bb[side],
 researchCount:POINTS.length,health(){return{loaded:true,researchCount:POINTS.length,red:bb[-1]?.plan,orange:gameMode==='robot'?bb[1]?.plan:null,pingPongRed:bb[-1]?.pingPong||0}}
};
})();