import { chromium } from 'playwright';

const base='http://127.0.0.1:4173/index.html';
const browser=await chromium.launch({headless:true});
const failures=[];

async function runCase(name,viewport){
  const context=await browser.newContext({
    viewport,
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:1,
    userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
  });
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e.stack||e.message||e)));
  page.on('console',msg=>{if(msg.type()==='error')pageErrors.push('console: '+msg.text())});

  await page.goto(base,{waitUntil:'load',timeout:15000});
  await page.waitForSelector('#menuRobots',{state:'visible',timeout:5000});
  const before=await page.evaluate(()=>({
    ready:document.querySelector('#bootStatus')?.textContent||'',
    disabled:document.querySelector('#menuRobots')?.disabled,
    legacyCamera:!!window.SL_CAMERA_V5,
    squareMap:!!window.SL_MOBA_SQUARE_V2,
    legendCards:document.querySelectorAll('#legendPool .legendCard').length,
    legendPreviews:document.querySelectorAll('#legendPool canvas').length,
    strategyPresets:document.querySelectorAll('#strategyPresets button').length
  }));
  if(before.disabled)throw new Error(`${name}: menuRobots disabled`);
  if(before.legacyCamera)throw new Error(`${name}: mapa/câmera legado ainda carregado`);
  if(!before.squareMap)throw new Error(`${name}: mapa quadrado não carregou`);
  if(before.legendCards!==3||before.legendPreviews!==3||before.strategyPresets!==4)throw new Error(`${name}: pré-estratégia/Lendas incompletas ${JSON.stringify(before)}`);

  const clickStart=Date.now();
  await page.click('#menuRobots',{timeout:3000});
  await page.waitForFunction(()=>!document.querySelector('#gameUI')?.hidden,null,{timeout:3000});

  // Dá tempo para vários RAFs. Se houver loop de MutationObserver/main-thread freeze, estas chamadas expiram.
  await page.waitForTimeout(2200);
  const state1=await page.evaluate(()=>({
    menuHidden:document.querySelector('#mainMenu')?.hidden,
    gameHidden:document.querySelector('#gameUI')?.hidden,
    timer:document.querySelector('#matchTimer')?.textContent,
    structures:typeof structures!=='undefined'?structures.length:null,
    units:typeof units!=='undefined'?units.length:null,
    running:typeof running!=='undefined'?running:null,
    fullscreen:!!document.fullscreenElement,
    health:window.SL_RUNTIME_HEALTH?.snapshot?.()||null,
    error:window.SL_LAST_RUNTIME_ERROR||null,
    laneCards:document.querySelectorAll('#laneControls .laneControl').length,
    globalCommands:document.querySelectorAll('#laneControls .laneControlAll button').length,
    adaptive:document.querySelector('#modeStatus')?.textContent.includes('IA adaptativa'),
    quickCameraButtons:document.querySelectorAll('#quickCameraBar button').length,
    buffZones:window.SL_MOBA_SQUARE_V2?.buffZones?.length,
    tacticalTargeting:!!window.SL_TACTICAL_TARGETING,
    canvasRect:(()=>{const r=document.querySelector('#game')?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null})()
  }));

  if(!state1.menuHidden||state1.gameHidden)throw new Error(`${name}: partida não substituiu o menu`);
  if(state1.running!==true)throw new Error(`${name}: loop da partida não ficou running`);
  if(state1.structures!==60)throw new Error(`${name}: esperado 60 estruturas, recebeu ${state1.structures}`);
  if(state1.laneCards!==4||state1.globalCommands!==5)throw new Error(`${name}: barra global/lanes incompleta: ${state1.laneCards} cartões, ${state1.globalCommands} comandos globais`);
  if(!state1.adaptive)throw new Error(`${name}: IA adaptativa não foi ativada`);
  if(state1.quickCameraButtons!==4||state1.buffZones!==4||!state1.tacticalTargeting)throw new Error(`${name}: navegação/comando contextual não foi carregado`);
  if(state1.fullscreen)throw new Error(`${name}: fullscreen entrou automaticamente`);
  if(state1.error)throw new Error(`${name}: erro runtime ${JSON.stringify(state1.error)}`);
  if(!state1.health||state1.health.rafFrames<10)throw new Error(`${name}: RAF não progrediu: ${JSON.stringify(state1.health)}`);
  if(state1.health.lastFrameAgeMs>700)throw new Error(`${name}: main thread/RAF aparenta travado: ${state1.health.lastFrameAgeMs}ms`);
  if(!state1.canvasRect||state1.canvasRect.w<=0||state1.canvasRect.h<=0)throw new Error(`${name}: canvas sem área visível`);

  const targeting=await page.evaluate(()=>{
    gameMode='pve';
    const map=SL_MOBA_SQUARE_V2,api=SL_TACTICAL_TARGETING;
    const troopData={name:'Tropa QA',role:'fighter',hp:500,def:20,atk:20,speed:5,range:1.2,rate:1,cost:10,gen:1,special:{},ability:{name:'QA',desc:''}};
    const enemyData={...troopData,name:'Alvo QA'};
    const troop=spawnUnit(1,1,'Medievais',troopData);troop.x=7100;troop.sub=0;troop.subTarget=0;
    const legend=units.find(u=>!u.dead&&u.side===1&&u.special?.legend)||spawnUnit(1,0,'Lendas',SL_LEGENDS_API.get('nefal'),{legend:true});
    delete legend.tacticalWorld;delete legend.tacticalDestination;delete legend.manualBuff;delete legend.manualTargetId;delete legend.manualUnitTargetId;delete legend.manualHold;legend.lane=0;legend.x=6500;legend.sub=0;legend.subTarget=0;

    // 1) Torre inimiga na lane: tropa da lane + Lenda devem focar automaticamente.
    const tower=structures.find(s=>!s.dead&&s.side===-1&&s.lane===1&&!s.auxiliary&&api.clickedTarget(map.structurePos(s))?.kind==='structure')||structures.find(s=>!s.dead&&s.side===-1&&s.lane===1&&!s.auxiliary);
    const towerTarget={kind:'structure',structure:tower,lane:tower.lane,x:tower.x,t:(tower.x-BASE_X[1])/(BASE_X[-1]-BASE_X[1]),world:map.structurePos(tower)};
    api.commandTarget(towerTarget);
    const towerTroop=troop.manualTargetId===tower.id;
    const towerLegend=legend.manualTargetId===tower.id||legend.tacticalDestination?.kind==='structure';

    // 2) Jungle: só a Lenda muda de ordem. A tropa deve continuar com a torre.
    const buff=map.buffZones.find(z=>z.id==='buff1')||map.buffZones[0];
    api.handleMapTap({world:{x:buff.x,y:buff.y},client:{x:210,y:190},canvas:{x:210,y:190}});
    const jungleLegend=legend.tacticalDestination?.kind==='buff';
    const jungleTroopUntouched=troop.manualTargetId===tower.id&&!troop.manualBuff&&!troop.tacticalWorld;

    // 3) Clicar numa Lenda inimiga na lane: tropa + Lenda focam ela.
    const enemyLegend=units.find(u=>!u.dead&&u.side===-1&&u.special?.legend)||spawnUnit(-1,1,'Lendas',SL_LEGENDS_API.get('vesper'),{legend:true});
    delete enemyLegend.tacticalWorld;delete enemyLegend.tacticalDestination;delete enemyLegend.manualBuff;enemyLegend.lane=1;enemyLegend.x=7800;enemyLegend.sub=0;enemyLegend.subTarget=0;
    const enemyLegendWorld=map.unitPos(enemyLegend);api.handleMapTap({world:enemyLegendWorld,client:{x:220,y:200},canvas:{x:220,y:200}});
    const legendTargetTroop=troop.manualUnitTargetId===enemyLegend.id;
    const legendTargetLegend=legend.manualUnitTargetId===enemyLegend.id||legend.tacticalDestination?.unitId===enemyLegend.id;

    // 4) Clicar numa tropa inimiga: o mesmo foco conjunto.
    const enemyTroop=spawnUnit(-1,1,'Alienígenas',enemyData);enemyTroop.x=8300;enemyTroop.sub=2;enemyTroop.subTarget=2;
    const enemyTroopWorld=map.unitPos(enemyTroop);api.handleMapTap({world:enemyTroopWorld,client:{x:230,y:210},canvas:{x:230,y:210}});
    const troopTargetTroop=troop.manualUnitTargetId===enemyTroop.id;
    const troopTargetLegend=legend.manualUnitTargetId===enemyTroop.id||legend.tacticalDestination?.unitId===enemyTroop.id;

    // 5) Chão vazio da lane: ambos recebem ordem de movimento para o ponto.
    let blankTarget=null;
    for(const q of [.12,.18,.24,.31,.38,.44]){const p=map.routePoint(1,q),candidate=api.clickedTarget(p);if(candidate?.kind==='point'){blankTarget=candidate;break}}
    if(!blankTarget){const q=.16,p=map.routePoint(1,q);blankTarget={kind:'point',lane:1,x:BASE_X[1]+q*(BASE_X[-1]-BASE_X[1]),t:q,world:p}}
    api.commandTarget(blankTarget);
    const blankTroop=!!troop.manualHold&&troop.manualHold.lane===1;
    const blankLegend=!!legend.manualHold||legend.tacticalDestination?.kind==='point';

    // 6) Clicar numa Lenda dentro da jungle continua sendo só Lenda.
    enemyLegend.tacticalWorld={x:buff.x,y:buff.y,a:0};enemyLegend.tacticalDestination=null;enemyLegend.manualBuff=buff.id;
    troop.manualHold={lane:1,x:blankTarget.x,world:blankTarget.world};delete troop.manualUnitTargetId;
    api.handleMapTap({world:{x:buff.x,y:buff.y},client:{x:240,y:220},canvas:{x:240,y:220}});
    const jungleEnemyLegendOnly=(legend.tacticalDestination?.kind==='unit'&&legend.tacticalDestination?.unitId===enemyLegend.id)&&!troop.manualUnitTargetId&&!!troop.manualHold;

    const health=api.health();gameMode='robot';
    return{towerTroop,towerLegend,jungleLegend,jungleTroopUntouched,legendTargetTroop,legendTargetLegend,troopTargetTroop,troopTargetLegend,blankTroop,blankLegend,jungleEnemyLegendOnly,health}
  });
  if(!targeting.towerTroop||!targeting.towerLegend||!targeting.jungleLegend||!targeting.jungleTroopUntouched||!targeting.legendTargetTroop||!targeting.legendTargetLegend||!targeting.troopTargetTroop||!targeting.troopTargetLegend||!targeting.blankTroop||!targeting.blankLegend||!targeting.jungleEnemyLegendOnly||!targeting.health?.directCommands||!targeting.health?.jungleLegendOnly)throw new Error(`${name}: controles diretos inválidos ${JSON.stringify(targeting)}`);

  // 20x também precisa continuar responsivo; aqui já devem nascer ondas/unidades.
  await page.click('#simSpeedControls button[data-speed="20"]',{timeout:3000});
  await page.waitForTimeout(1600);
  const state2=await page.evaluate(()=>({
    timer:document.querySelector('#matchTimer')?.textContent,
    units:typeof units!=='undefined'?units.length:null,
    legends:typeof units!=='undefined'?units.filter(u=>!u.dead&&u.special?.legend).length:null,
    health:window.SL_RUNTIME_HEALTH?.snapshot?.()||null,
    error:window.SL_LAST_RUNTIME_ERROR||null
  }));
  if(state2.error)throw new Error(`${name}: erro em 20x ${JSON.stringify(state2.error)}`);
  if(!state2.health||state2.health.lastFrameAgeMs>700)throw new Error(`${name}: travou em 20x`);
  if((state2.units??0)<=0)throw new Error(`${name}: simulação 20x não gerou unidades`);
  if(state2.legends!==2)throw new Error(`${name}: deveria existir uma Lenda viva por lado, recebeu ${state2.legends}`);

  if(pageErrors.length)throw new Error(`${name}: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({name,clickMs:Date.now()-clickStart,state1,targeting,state2},null,2));
  await context.close();
}

try{
  await runCase('portrait',{width:412,height:915});
  await runCase('landscape',{width:915,height:412});
}catch(err){
  failures.push(err.stack||String(err));
}

await browser.close();
if(failures.length){
  console.error(failures.join('\n\n'));
  process.exit(1);
}
