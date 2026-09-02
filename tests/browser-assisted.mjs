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
    squareMap:!!window.SL_MOBA_SQUARE_V2
  }));
  if(before.disabled)throw new Error(`${name}: menuRobots disabled`);
  if(before.legacyCamera)throw new Error(`${name}: mapa/câmera legado ainda carregado`);
  if(!before.squareMap)throw new Error(`${name}: mapa quadrado não carregou`);

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
    canvasRect:(()=>{const r=document.querySelector('#game')?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null})()
  }));

  if(!state1.menuHidden||state1.gameHidden)throw new Error(`${name}: partida não substituiu o menu`);
  if(state1.running!==true)throw new Error(`${name}: loop da partida não ficou running`);
  if(state1.structures!==60)throw new Error(`${name}: esperado 60 estruturas, recebeu ${state1.structures}`);
  if(state1.laneCards!==3)throw new Error(`${name}: esperado 3 controles de lane, recebeu ${state1.laneCards}`);
  if(state1.fullscreen)throw new Error(`${name}: fullscreen entrou automaticamente`);
  if(state1.error)throw new Error(`${name}: erro runtime ${JSON.stringify(state1.error)}`);
  if(!state1.health||state1.health.rafFrames<10)throw new Error(`${name}: RAF não progrediu: ${JSON.stringify(state1.health)}`);
  if(state1.health.lastFrameAgeMs>700)throw new Error(`${name}: main thread/RAF aparenta travado: ${state1.health.lastFrameAgeMs}ms`);
  if(!state1.canvasRect||state1.canvasRect.w<=0||state1.canvasRect.h<=0)throw new Error(`${name}: canvas sem área visível`);

  // 20x também precisa continuar responsivo; aqui já devem nascer ondas/unidades.
  await page.click('#simSpeedControls button[data-speed="20"]',{timeout:3000});
  await page.waitForTimeout(1600);
  const state2=await page.evaluate(()=>({
    timer:document.querySelector('#matchTimer')?.textContent,
    units:typeof units!=='undefined'?units.length:null,
    health:window.SL_RUNTIME_HEALTH?.snapshot?.()||null,
    error:window.SL_LAST_RUNTIME_ERROR||null
  }));
  if(state2.error)throw new Error(`${name}: erro em 20x ${JSON.stringify(state2.error)}`);
  if(!state2.health||state2.health.lastFrameAgeMs>700)throw new Error(`${name}: travou em 20x`);
  if((state2.units??0)<=0)throw new Error(`${name}: simulação 20x não gerou unidades`);

  if(pageErrors.length)throw new Error(`${name}: ${pageErrors.join(' | ')}`);
  console.log(JSON.stringify({name,clickMs:Date.now()-clickStart,state1,state2},null,2));
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
