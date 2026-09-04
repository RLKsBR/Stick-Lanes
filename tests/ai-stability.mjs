import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:915,height:412}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e.stack||e.message||e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'load',timeout:15000});
await page.click('#menuRobots');
await page.waitForFunction(()=>!document.querySelector('#gameUI')?.hidden&&window.SL_AI_LEGEND_AUTHORITY?.version>=2&&window.SL_AI_PLAN_STABILITY?.version>=2&&window.SL_AI_LEGACY_QUARANTINE?.version>=2,null,{timeout:7000});

// A Lenda entra com a primeira onda. Acelera apenas o boot para não depender de
// timing de máquina/CI e espera explicitamente uma Lenda Laranja real da partida.
await page.click('#simSpeedControls button[data-speed="20"]');
await page.waitForFunction(()=>typeof units!=='undefined'&&units.some(u=>!u.dead&&u.side===1&&u.special?.legend),null,{timeout:9000});
await page.click('#simSpeedControls button[data-speed="1"]');
await page.waitForTimeout(120);

const regression=await page.evaluate(()=>{
  const compactStability=()=>{
    const h=SL_AI_PLAN_STABILITY.health(),pick=s=>s?{committed:s.committed?.key||null,committedAt:s.committedAt,lastProgressAt:s.lastProgressAt,lastMetric:s.lastMetric,rejectedSwitches:s.rejectedSwitches,acceptedSwitches:s.acceptedSwitches,reversalBlocks:s.reversalBlocks,emergencySwitches:s.emergencySwitches,lastProposal:s.lastProposal}:null;
    return{loaded:h.loaded,commitment:h.commitment,red:pick(h.red),orange:pick(h.orange)}
  };
  const map=SL_MOBA_SQUARE_V2,u=units.find(x=>!x.dead&&x.side===1&&x.special?.legend);
  if(!u)throw new Error('orange legend missing after explicit wait');
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
    stability:compactStability(),
    simTime
  }
});

if(regression.authorityVersion<2||regression.stabilityVersion<2||regression.quarantineVersion<2)throw new Error('AI stability v2 stack not loaded '+JSON.stringify(regression));
if(!regression.strict)throw new Error('strict destination ownership disabled');
if(regression.after<=regression.before)throw new Error('unauthorized same-lane destination was not rejected '+JSON.stringify(regression));
if(!regression.destination?.slAuthority||regression.destination.lane!==0||Math.abs((regression.destination.t??0)-.58)>.06)throw new Error('authority did not restore committed top push '+JSON.stringify(regression));
if(!regression.quarantine?.exclusiveLegendWriter||!regression.quarantine?.exclusiveTeamOrderWriter||regression.quarantine.passes<1)throw new Error('legacy strategic quarantine inactive '+JSON.stringify(regression.quarantine));

// Regressão longa: percorre até ~8 minutos adicionais de simulação a 20x (ou até
// a partida terminar), verificando que nenhum destino físico legado sobrevive ao
// executor final. Também coleta os contadores de reversão/commitment.
await page.click('#simSpeedControls button[data-speed="20"]');
const targetSimTime=regression.simTime+480;
let violations=0,samples=0,last=null;
for(let i=0;i<145;i++){
  await page.waitForTimeout(180);
  const s=await page.evaluate(()=>{
    const compactStability=()=>{
      const h=SL_AI_PLAN_STABILITY.health(),pick=s=>s?{committed:s.committed?.key||null,committedAt:s.committedAt,lastProgressAt:s.lastProgressAt,lastMetric:s.lastMetric,rejectedSwitches:s.rejectedSwitches,acceptedSwitches:s.acceptedSwitches,reversalBlocks:s.reversalBlocks,emergencySwitches:s.emergencySwitches,lastProposal:s.lastProposal}:null;
      return{loaded:h.loaded,commitment:h.commitment,red:pick(h.red),orange:pick(h.orange)}
    };
    const list=units.filter(u=>!u.dead&&u.special?.legend&&(u.side===-1||gameMode==='robot'&&u.side===1));
    return{simTime,alive:running,base1:playerBase,base2:enemyBase,bad:list.filter(u=>u.tacticalDestination&&!u.tacticalDestination.slAuthority).map(u=>({side:u.side,kind:u.tacticalDestination.kind,lane:u.tacticalDestination.lane,t:u.tacticalDestination.t})),authority:SL_AI_LEGEND_AUTHORITY.health(),stability:compactStability(),quarantine:SL_AI_LEGACY_QUARANTINE.health()}
  });
  last=s;samples++;violations+=s.bad.length;
  if(!s.alive||s.simTime>=targetSimTime)break;
}
if(violations)throw new Error(`found ${violations} surviving unauthorized Legend destinations across ${samples} samples`);
if(!last?.quarantine?.exclusiveTeamOrderWriter)throw new Error('team order quarantine lost ownership during long run');
if(errors.length)throw new Error(errors.join(' | '));

console.log(JSON.stringify({ok:true,regression,targetSimTime,samples,violations,final:last},null,2));
await browser.close();