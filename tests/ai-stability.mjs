import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:915,height:412}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e.stack||e.message||e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'load',timeout:15000});
await page.click('#menuRobots');
await page.waitForFunction(()=>!document.querySelector('#gameUI')?.hidden&&window.SL_AI_FUNCTIONAL_CONTROLLER?.version>=3,null,{timeout:7000});

const draftCheck=await page.evaluate(()=>({draft:SL_ASSISTED_DRAFT?.health?.()||null,vision:SL_AI_SIDE_VISION?.health?.()||null}));
if(!draftCheck.draft?.completed)throw new Error('assisted draft did not complete '+JSON.stringify(draftCheck));
if(draftCheck.draft.globalFactionBans?.length!==2)throw new Error('expected two global faction bans '+JSON.stringify(draftCheck.draft));
for(const color of['orange','red']){
  const t=draftCheck.draft[color];
  if(t?.factions?.length!==2)throw new Error(`${color} did not receive two factions `+JSON.stringify(t));
  if(t?.bannedReceived?.length!==4)throw new Error(`${color} did not receive four troop bans `+JSON.stringify(t));
  if(t?.deck?.length!==8)throw new Error(`${color} deck is not eight troops `+JSON.stringify(t));
  if(!Array.isArray(t?.flow)||t.flow.reduce((a,b)=>a+b,0)!==5)throw new Error(`${color} flow is not a five-slot distribution `+JSON.stringify(t));
}
if(draftCheck.draft.orange.seat===draftCheck.draft.red.seat)throw new Error('both assisted AIs received the same side seat '+JSON.stringify(draftCheck.draft));
if(!draftCheck.vision?.usesOwnSideVision)throw new Error('side-limited AI vision guard is not active '+JSON.stringify(draftCheck.vision));

await page.click('#simSpeedControls button[data-speed="20"]');
await page.waitForFunction(()=>typeof units!=='undefined'&&units.some(u=>!u.dead&&u.side===1&&u.special?.legend)&&units.some(u=>!u.dead&&u.side===-1&&u.special?.legend),null,{timeout:9000});
await page.click('#simSpeedControls button[data-speed="1"]');
await page.waitForTimeout(100);

const result=await page.evaluate(()=>{
  running=false;
  playerBase=1e9;enemyBase=1e9;
  const api=SL_AI_FUNCTIONAL_CONTROLLER;
  const beforeQ=SL_AI_LEGACY_QUARANTINE?.health?.().passes??0;
  const orange=units.find(u=>!u.dead&&u.side===1&&u.special?.legend);
  if(!orange)throw new Error('orange legend missing');
  orange.maxHp=Math.max(orange.maxHp,1e7);orange.hp=orange.maxHp;orange.def=Math.max(orange.def,1e6);
  const targetLane=orange.lane===0?2:0;
  if(!api.forcePlan(1,targetLane,'PUSH',90))throw new Error('forcePlan rejected');

  let arrived=false,holdSeenAfterArrival=false,travelSamples=0;
  for(let i=0;i<1500;i++){
    playerBase=1e9;enemyBase=1e9;simulationStep(.04);
    const u=units.find(x=>!x.dead&&x.side===1&&x.special?.legend);
    if(!u)continue;
    if(u.tacticalWorld)travelSamples++;
    if(!u.tacticalWorld&&u.lane===targetLane){arrived=true;if(u.manualHold)holdSeenAfterArrival=true;if(i>100)break}
  }
  const handoffLegend=units.find(x=>!x.dead&&x.side===1&&x.special?.legend);
  const afterArrival={arrived,manualHold:!!handoffLegend?.manualHold,tacticalWorld:!!handoffLegend?.tacticalWorld,lane:handoffLegend?.lane,order:orders[1][targetLane],travelSamples};

  // Janela longa: o controlador precisa manter planos e ordens executáveis sem
  // reativar a cadeia estratégica antiga. As bases são mantidas vivas para testar
  // comportamento, não balanceamento.
  let badOrders=0,unplanned=0,staleHolds=0,samples=0;
  for(let i=0;i<6000;i++){
    playerBase=1e9;enemyBase=1e9;simulationStep(.08);
    if(i%60===0){
      samples++;
      const h=api.health();
      if(!h.red?.plan||!h.orange?.plan)unplanned++;
      for(const side of[1,-1])for(const o of orders[side])if(!['base','behind','ahead','advance','attack'].includes(o))badOrders++;
      for(const u of units)if(!u.dead&&u.special?.legend&&(u.side===-1||gameMode==='robot'&&u.side===1)&&u.manualHold)staleHolds++;
    }
  }
  const health=api.health(),afterQ=SL_AI_LEGACY_QUARANTINE?.health?.().passes??0;
  const honestVision=SL_AI_SIDE_VISION?.health?.()||null;
  return{beforeQ,afterQ,afterArrival,holdSeenAfterArrival,badOrders,unplanned,staleHolds,samples,health,honestVision,simTime,orders:{orange:[...orders[1]],red:[...orders[-1]]},arbiter:SL_LEGEND_INTENT_ARBITER?.get?.(1)??null}
});

if(errors.length)throw new Error(errors.join(' | '));
if(!result.health.singleDecisionOwner||!result.health.singleMovementWriter||!result.health.legacyRunSideAIDisabled)throw new Error('single-owner controller not active '+JSON.stringify(result.health));
if(!result.afterArrival.arrived)throw new Error('legend did not complete forced lane rotation '+JSON.stringify(result.afterArrival));
if(result.afterArrival.manualHold||result.holdSeenAfterArrival)throw new Error('slNoHold rotation became manualHold '+JSON.stringify(result.afterArrival));
if(!['attack','advance'].includes(result.afterArrival.order))throw new Error('forced PUSH lost an executable forward order '+JSON.stringify(result.afterArrival));
if(result.afterQ!==result.beforeQ)throw new Error('legacy runSideAI chain still executed '+JSON.stringify({before:result.beforeQ,after:result.afterQ}));
if(result.arbiter!==null)throw new Error('legacy legend arbiter still emits commands '+JSON.stringify(result.arbiter));
if(result.unplanned)throw new Error(`AI had ${result.unplanned} unplanned samples out of ${result.samples}`);
if(result.badOrders)throw new Error(`AI produced ${result.badOrders} invalid lane orders`);
if(result.staleHolds)throw new Error(`AI legends accumulated ${result.staleHolds} stale manualHold samples`);
if(result.health.decisions<40)throw new Error('too few AI decisions in long stress '+JSON.stringify(result.health));
if(result.health.purchases<2)throw new Error('AI economy appears inactive '+JSON.stringify(result.health));
if(!result.honestVision?.usesOwnSideVision||result.honestVision.filteredReads<1)throw new Error('AI did not perform visibility-filtered enemy reads '+JSON.stringify(result.honestVision));

console.log(JSON.stringify({ok:true,draftCheck,...result},null,2));
await browser.close();
