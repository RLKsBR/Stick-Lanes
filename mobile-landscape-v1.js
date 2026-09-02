/* Stick Lanes — layout mobile + tela cheia horizontal, sem interferir no boot */
(function(){
'use strict';

const root=document.documentElement;
const gameUI=document.querySelector('#gameUI');
let fullscreenButton=null;

function isMatchActive(){return !!gameUI&&!gameUI.hidden}

function ensureFullscreenButton(){
  if(fullscreenButton&&fullscreenButton.isConnected)return fullscreenButton;
  const actions=document.querySelector('#gameUI .hudActions');
  if(!actions)return null;
  const button=document.createElement('button');
  button.id='fullscreenToggle';
  button.className='secondary fullscreenToggle';
  button.type='button';
  button.setAttribute('aria-label','Alternar tela cheia');
  button.addEventListener('click',toggleFullscreen);
  actions.appendChild(button);
  fullscreenButton=button;
  return button;
}

function syncLayout(){
  const active=isMatchActive();
  root.classList.toggle('sl-match-active',active);
  root.classList.toggle('sl-native-fullscreen',!!document.fullscreenElement);

  const button=ensureFullscreenButton();
  if(button){
    const fullscreen=!!document.fullscreenElement;
    button.hidden=!active;
    button.textContent=fullscreen?'×':'⛶';
    button.setAttribute('aria-label',fullscreen?'Sair da tela cheia':'Entrar em tela cheia horizontal');
    button.setAttribute('aria-pressed',fullscreen?'true':'false');
    const supported=typeof document.documentElement.requestFullscreen==='function'&&typeof document.exitFullscreen==='function';
    button.disabled=!supported;
    button.title=supported?(fullscreen?'Sair da tela cheia':'Tela cheia horizontal'):'Tela cheia não é suportada neste navegador.';
  }

  if(active)requestAnimationFrame(()=>window.scrollTo(0,0));
}

async function toggleFullscreen(){
  try{
    if(document.fullscreenElement){
      try{screen.orientation?.unlock?.()}catch(_err){}
      await document.exitFullscreen();
    }else if(typeof document.documentElement.requestFullscreen==='function'){
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
      try{await screen.orientation?.lock?.('landscape')}catch(err){console.info('Stick Lanes: rotação horizontal não disponível neste navegador.',err)}
    }
  }catch(err){
    console.warn('Stick Lanes: não foi possível alternar tela cheia.',err);
  }finally{
    syncLayout();
  }
}

/*
 * Não intercepta launchBattle nem pede fullscreen sozinho. A orientação horizontal
 * só é solicitada pelo gesto explícito no botão de tela cheia.
 */
if(gameUI&&typeof MutationObserver==='function'){
  new MutationObserver(syncLayout).observe(gameUI,{attributes:true,attributeFilter:['hidden']});
}
window.addEventListener('resize',syncLayout,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(syncLayout,80),{passive:true});
document.addEventListener('fullscreenchange',syncLayout);

syncLayout();
})();
