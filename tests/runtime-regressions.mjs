import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/index.html');
 assert.deepEqual(await page.evaluate(()=>SL_BOOT.check()),{ready:true,missing:[],errors:[]});
 await page.click('#menuRobots');
 await page.waitForFunction(()=>!document.querySelector('#gameUI').hidden);
 assert.deepEqual(await page.locator('#laneControls .laneControl > strong').allTextContents(),['TODAS','TOP','MID','BOT']);
 await page.locator('#aiDiagnostics summary').click();
 assert.equal(await page.locator('#aiDiagnostics').evaluate(el=>el.open),true);
 const result=await page.evaluate(()=>{
   running=false;
   const check=(ok,message)=>{if(!ok)throw new Error(message)};
   const map=SL_MOBA_SQUARE_V2,nav=SL_JUNGLE_PATHFINDING,ai=SL_AI_FUNCTIONAL_CONTROLLER,vision=SL_VISION;
   check(!window.SL_AI_RESEARCH_DIRECTOR&&!window.SL_AI_LEGACY_QUARANTINE,'retired AI still loaded');
   check(document.querySelectorAll('script[src*="legend-authority-lock"]').length===1,'duplicate authority');
   check(nav.health().walls===SL_JUNGLE_ACCESS.health().walls,'pathfinder topology mismatch');

   // HP is the same currency in damage, HUD, ratios and compatibility APIs.
   playerBase=enemyBase=BASE_HP;damageBase(1,1500);hud(simTime);
   check(BASE_HP===15000&&playerBase===13500&&SL_GAME_GOAL_AI.effectiveBaseHp(1)===13500,'base HP mismatch');
   check(document.querySelector('#playerBase').textContent==='13500','base HUD mismatch');
   playerBase=enemyBase=BASE_HP;

   // A fixed amount of simulated time must use identical dt at every speed.
   const rawStep=simulationStep,steps=[];simulationStep=dt=>steps.push(dt);
   for(const scale of [1,3,10,20]){
     steps.length=0;simulationAccumulator=0;
     for(let i=0;i<600/scale;i++)advanceSimulation(.02,scale);
     check(steps.length===300&&steps.every(dt=>dt===.04),'variable step at '+scale+'x');
   }
   simulationStep=rawStep;simulationAccumulator=0;

   // Hidden strength AND wave counts must be excluded, on both sides and inspect().
   units=[];
   const troop={name:'QA',role:'fighter',hp:500,def:20,atk:20,speed:5,range:1.2,rate:1,cost:10,gen:1,special:{},ability:{name:'QA',desc:''}};
   const a=spawnUnit(1,1,'Medievais',troop,{minion:true}),b=spawnUnit(-1,1,'Medievais',troop,{minion:true});
   const realVisible=vision.isVisibleTo;
   vision.isVisibleTo=(side,u)=>side===u.side;
   for(const side of [1,-1]){const l=ai.inspect(side).lanes[1];check(l.foe===0&&l.foeWave===0&&l.ownWave===1,'hidden enemy read: '+side)}
   vision.isVisibleTo=()=>true;
   check(ai.inspect(1).lanes[1].foeWave===1&&ai.inspect(1).lanes[1].foe>0,'visible enemy excluded');
   a.manualUnitTargetId=b.id;vision.isVisibleTo=()=>false;
   SL_TACTICAL_TARGETING.handleUnit(a,.04,simTime);check(!a.manualUnitTargetId,'lane unit tracks hidden target');
   check(SL_BATTLE_UI.inspectAt(map.unitPos(b))?.object!==b,'inspector reveals hidden enemy');
   vision.isVisibleTo=realVisible;

   // Geometry: all route segments and every actual movement segment are wall-free.
   units=[];const hero=spawnLegend(1);hero.speed=5;
   let routes=0,travelTicks=0;
   for(const from of [0,1,2])for(const to of [0,1,2])if(from!==to)for(const ratio of [.2,.5,.8]){
     const start=map.routePoint(from,ratio),goal=map.routePoint(to,ratio),path=nav.planRoute(start,goal);
     check(path.length>0,'no lane route '+from+' -> '+to+' @ '+ratio);
     let prev=start;for(const p of path){check(nav.clear(prev,p),'route crosses wall');prev=p}
     hero.lane=from;hero.x=BASE_X[1]+ratio*(BASE_X[-1]-BASE_X[1]);hero.tacticalWorld={...start};
     hero.tacticalDestination={kind:'point',lane:to,x:BASE_X[1]+ratio*(BASE_X[-1]-BASE_X[1]),world:{...goal},slNoHold:true};nav.resetPath(hero);
     for(let i=0;i<3000&&hero.tacticalWorld;i++){
       const p={...hero.tacticalWorld};SL_TACTICAL_TARGETING.handleUnit(hero,.04,simTime+i*.04);
       if(hero.tacticalWorld)check(!vision.blocked(p,hero.tacticalWorld),'movement crosses wall');travelTicks++;
     }
     check(!hero.tacticalWorld&&hero.lane===to&&!hero.manualHold,'rotation failed '+from+' -> '+to+' @ '+ratio);routes++;
   }
   // Captures retain exact clicked points, including points away from the center.
   for(const zone of SL_BUFF_SYSTEM.zones){
     const goal={x:zone.x+100,y:zone.y+100};
     check(SL_BUFF_SYSTEM.containsBuff(zone,goal),'test point outside buff');
     hero.tacticalWorld={...map.routePoint(1,.5)};hero.tacticalDestination={kind:'buff',buff:zone,world:goal};nav.resetPath(hero);
     for(let i=0;i<3000&&hero.tacticalDestination;i++)SL_TACTICAL_TARGETING.handleUnit(hero,.04,simTime+i*.04);
     check(!hero.tacticalDestination&&hero.manualBuff===zone.id&&Math.hypot(hero.tacticalWorld.x-goal.x,hero.tacticalWorld.y-goal.y)<1,'buff exact-point arrival failed');
   }
   // Automatic jungle return must also follow walls, not a later movement wrapper.
   SL_BATTLE_UI.setAutomatic();check(hero.tacticalDestination?.slNoHold,'automatic return bypasses pathfinder');
   for(let i=0;i<3000&&hero.tacticalWorld;i++){
     const p={...hero.tacticalWorld};SL_TACTICAL_TARGETING.handleUnit(hero,.04,simTime+i*.04);
     if(hero.tacticalWorld)check(!vision.blocked(p,hero.tacticalWorld),'automatic return crossed wall');
   }
   check(!hero.tacticalWorld&&!hero.manualHold,'automatic return did not finish');
   delete hero.manualBuff;
   hero.tacticalWorld={...map.routePoint(1,.4)};hero.tacticalDestination={kind:'unit',unitId:999999,world:map.routePoint(1,.8)};
   SL_TACTICAL_TARGETING.handleUnit(hero,.04,simTime);check(hero.tacticalDestination?.kind==='point','dead target leaves orphaned world state');

   // Closed obstacle: the planner must fail safely, without a greedy crossing.
   const walls=vision.walls.slice();
   vision.walls.splice(0,vision.walls.length,...[
     {id:'top',x:0,y:-500,len:1200,a:0,thickness:100},
     {id:'bottom',x:0,y:500,len:1200,a:0,thickness:100},
     {id:'left',x:-500,y:0,len:1200,a:Math.PI/2,thickness:100},
     {id:'right',x:500,y:0,len:1200,a:Math.PI/2,thickness:100}
   ]);
   check(nav.planRoute({x:2000,y:0},{x:0,y:0}).length===0,'unreachable route crosses wall');
   hero.tacticalWorld={x:2000,y:0};hero.tacticalDestination={kind:'buff',buff:SL_BUFF_SYSTEM.zones[0],world:{x:0,y:0}};nav.resetPath(hero);
   const plans=nav.health().plans;
   for(let i=0;i<10;i++)SL_TACTICAL_TARGETING.handleUnit(hero,.04,100+i*.04);
   check(hero.tacticalWorld.x===2000&&hero.tacticalWorld.y===0,'failed route moved unit');
   check(nav.health().plans-plans===1,'failed route replans every frame');
   vision.walls.splice(0,vision.walls.length,...walls);nav.rebuild();

   // Oscillation is not progress, and an intentional stun is not a navigation failure.
   reset();running=false;gold=enemyGold=0;
   const watched=spawnLegend(1);ai.forcePlan(1,watched.lane===0?2:0,'PUSH',100);
   const rawRemaining=nav.remainingDistance;nav.remainingDistance=()=>1000;
   const recoveries=ai.health().stuckRecoveries;
   for(let t=0;t<=4;t+=.5){watched.tacticalWorld.x+=t%1===0?100:-100;runSideAI(1,t)}
   check(ai.health().stuckRecoveries===recoveries+1,'oscillating unit not recovered');
   watched.stunUntil=20;
   for(let t=5;t<15;t++)runSideAI(1,t);
   check(ai.health().stuckRecoveries===recoveries+1,'stun counted as stuck');
   nav.remainingDistance=rawRemaining;

   // No phantom base emergency with no observed enemy pressure; trace is bounded/reset.
   reset();running=false;units=[];playerBase=1000;gold=enemyGold=0;
   runSideAI(1,0);check(ai.get(1).plan.mode!=='DEFEND','damaged base defends empty map forever');
   check(!ai.forcePlan(1,0,'INVALID',30)&&!ai.forcePlan(2,0)&&!ai.forcePlan(1,0,'PUSH',NaN),'invalid forced plan accepted');
   ai.forcePlan(1,2,'PUSH',30);runSideAI(1,2);
   check(ai.trace().at(-1).outcome==='forced-lock','missing decision rejection reason');
   for(let t=3;t<260;t++)runSideAI(1,t);
   check(ai.trace().length===240,'unbounded decision history');
   const exported=SL_AI_DIAGNOSTICS.report();check(exported.decisions.length===240,'diagnostic export mismatch');
   const seen=spawnUnit(-1,1,'Medievais',troop);seen.x=BASE_X[1]+100;
   check(vision.isVisibleTo(1,seen),'test enemy not visible near base');
   check(vision.lastSeenInfo(1,seen.id),'lastSeen not recorded');
   reset();running=false;check(!vision.lastSeenInfo(1,seen.id)&&ai.trace().length===0,'state leaked across reset');
   return{routes,travelTicks,pathfinding:nav.health(),baseHp:BASE_HP,fixedStep:SIM_STEP};
 });
 assert.equal(errors.length,0,errors.join('\n'));
 // Missing scripts must produce a visible boot error and block partial startup.
 const broken=await browser.newPage();
 await broken.route('**/jungle-pathfinding-v2.js*',route=>route.abort());
 await broken.goto('http://127.0.0.1:4173/index.html');
 assert.equal(await broken.locator('#menuRobots').isDisabled(),true);
 assert.match(await broken.locator('#bootStatus').innerText(),/SL_JUNGLE_PATHFINDING/);
 console.log(JSON.stringify({ok:true,...result},null,2));
}finally{await browser.close()}
