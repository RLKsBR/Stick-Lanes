import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:915,height:412}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e.stack||e.message||e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'load',timeout:15000});
await page.click('#menuRobots');
await page.waitForFunction(()=>!document.querySelector('#gameUI')?.hidden&&window.SL_AI_LEGEND_AUTHORITY?.version>=2&&window.SL_AI_PLAN_STABILITY?.version>=2&&window.SL_AI_LEGACY_QUARANTINE?.version>=2,null,{timeout:7000});
await page.waitForTimeout(1800);

const regression=await page.evaluate(()=>{
  const map=SL_MOBA_SQUARE_V2,u=units.find(x=>!x.dead&&x.side===1&&x.special?.legend);
  if(!u)throw new Error('orange legend missing');
  const st=SL_AI_LEGEND_AUTHORITY.get(1),lane=0;
  st.intent={kind:'lane',lane,aggressive:true,priority:130,term:'PUSH',reason:'qa-same-lane-hijack'};
  st.adoptedAt=simTime;st.until=simTime+30;st.lastSig='qa';
  const start=map.unitPos(u),wrongT=.34,wrong=map.routePoint(lane,wrongT);
  delete u.manualBuff;delete u.manualTargetId;delete u.manualUnitTargetId;delete u.manualHold;
  u.tacticalWorld={x:start.x,y:start.y,a:start.a||0};
  u.tacticalDestination={kind:'point',lane,t:wrongT,x:BASE_X[1]+wrongT*(BASE_X[-1]-BASE_X[1]),world:{x:wrong.x,y:wrong.y}};
  const before=SL_AI_LEGEND_AUTHORITY.health().hijacksRejected;
  simulationStep(.016);
  const d=u.tacticalDestination,after=SL_AI_LEGEND_AUTHORITY.health();
  return{
    authorityVersion:SL_AI_LEGEND_AUTHORITY.version,
    stabilityVersion:SL_AI_PLAN_STABILITY.version,
    quarantineVersion:SL_AI_LEGACY_QUARANTINE.version,
    strict:after.strictDestinationOwnership,
    before,after:after.hijacksRejected,
    destination:d?{kind:d.kind,lane:d.lane,t:d.t,slAuthority:d.slAuthority,slIntent:d.slIntent}:null,
    quarantine:SL_AI_LEGACY_QUARANTINE.health(),
    stability:SL_AI_PLAN_STABILITY.health()
  }
});

if(regression.authorityVersion<2||regression.stabilityVersion<2||regression.quarantineVersion<2)throw new Error('AI stability v2 stack not loaded '+JSON.stringify(regression));
if(!regression.strict)throw new Error('strict destination ownership disabled');
if(regression.after<=regression.before)throw new Error('unauthorized same-lane destination was not rejected '+JSON.stringify(regression));
if(!regression.destination?.slAuthority||regression.destination.lane!==0||Math.abs((regression.destination.t??0)-.58)>.06)throw new Error('authority did not restore committed top push '+JSON.stringify(regression));
if(!regression.quarantine?.exclusiveLegendWriter||regression.quarantine.passes<1)throw new Error('legacy quarantine inactive '+JSON.stringify(regression.quarantine));

// Run a meaningful accelerated window and make sure no non-authority tactical destination survives.
await page.click('#simSpeedControls button[data-speed="20"]');
let violations=0,samples=0;
for(let i=0;i<36;i++){
  await page.waitForTimeout(180);
  const s=await page.evaluate(()=>{
    const list=units.filter(u=>!u.dead&&u.special?.legend&&(u.side===-1||gameMode==='robot'&&u.side===1));
    return{simTime,alive:running,base1:playerBase,base2:enemyBase,bad:list.filter(u=>u.tacticalDestination&&!u.tacticalDestination.slAuthority).map(u=>({side:u.side,kind:u.tacticalDestination.kind,lane:u.tacticalDestination.lane,t:u.tacticalDestination.t})),authority:SL_AI_LEGEND_AUTHORITY.health(),stability:SL_AI_PLAN_STABILITY.health(),quarantine:SL_AI_LEGACY_QUARANTINE.health()}
  });
  samples++;violations+=s.bad.length;
  if(!s.alive)break;
}
if(violations)throw new Error(`found ${violations} surviving unauthorized Legend destinations across ${samples} samples`);
if(errors.length)throw new Error(errors.join(' | '));

console.log(JSON.stringify({ok:true,regression,samples,violations,final:await page.evaluate(()=>({simTime,playerBase,enemyBase,authority:SL_AI_LEGEND_AUTHORITY.health(),stability:SL_AI_PLAN_STABILITY.health(),quarantine:SL_AI_LEGACY_QUARANTINE.health()}))},null,2));
await browser.close();