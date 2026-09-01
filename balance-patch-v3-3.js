/* Stick Lanes — balanceamento v3.3 baseado em 23.000 simulações.
   Ajusta atributos reais (vida/ataque/defesa), preservando custo, geração,
   velocidade, alcance e intervalo de ataque. */
(function(){
'use strict';
const NEW_RULESET='frontline-v3.3-balance-23k';
const BASELINE_RULESET='frontline-v3.2-balance';
const DB_KEY='stickLanesBalanceFrontlineV3.v2';
const HISTORY_KEY='stickLanesBalanceFrontlineV3.history.v2';
const FACTION={"Alienígenas":1.027,"Alquimistas":0.9,"Artrópodes":1.071,"Bestas Marinhas":1.032,"Celestiais":1.013,"Cristalinos":0.97,"Cultistas":1.013,"Demônios":1.09,"Dinossauros":0.873,"Elementais":1.039,"Espectrais":0.97,"Físicos":0.919,"Lobos":0.957,"Medievais":1.13,"Mentalistas":1.061,"Mutantes":0.984,"Míticos":1.076,"Músicos":0.944,"Necromantes":1.032,"Ninjas":0.978,"Nômades do Deserto":1.073,"Orcs":1.02,"Robôs":0.949,"Samurais":1.004,"Titãs":0.92,"Zumbis":1.026};
const UNIT={"Míticos|Hidra Ancestral":0.953,"Artrópodes|Rainha-Colmeia":0.952,"Robôs|Drone Míssil":1.057,"Robôs|Colosso de Aço":0.948,"Robôs|Núcleo Ômega":0.95,"Titãs|Titã Corredor":0.947,"Titãs|Atlas":0.95,"Alienígenas|Aberração Gigante":0.953,"Dinossauros|Giganotossauro":0.95,"Dinossauros|Velociraptor":0.933,"Alquimistas|Nicolas Flamel":0.92,"Cultistas|Pregador":1.047,"Cultistas|Devoto":0.955,"Artrópodes|Vespa":1.05,"Artrópodes|Cupim Rainha":1.05,"Mentalistas|Saltador Mental":0.944,"Mentalistas|Anulador":0.928,"Necromantes|Acólito Sombrio":1.05,"Necromantes|Rei Sepulcral":0.95,"Espectrais|Espectro Antigo":0.948,"Necromantes|Necromante":1.05,"Músicos|Cantor":1.047,"Orcs|Arremessador":1.068,"Samurais|Ashigaru":0.948,"Mentalistas|Oráculo":1.05,"Físicos|Fóton":1.061,"Mentalistas|Puxador":1.057,"Mentalistas|Confusor":1.053,"Mentalistas|Mestre Mentalista":0.936,"Elementais|Tempestade":1.06,"Elementais|Ninfa de Água":1.05,"Mentalistas|Mente Coletiva":1.05,"Mentalistas|Dominador":0.931,"Necromantes|Carniçal":0.957,"Cristalinos|Diamante":0.935,"Míticos|Dragão":0.92,"Zumbis|Enfermeira Podre":1.068,"Necromantes|Lich":0.927,"Nômades do Deserto|Príncipe das Dunas":0.949,"Samurais|Shogun":0.955,"Celestiais|Arqueiro Estelar":1.047,"Cristalinos|Cristal Curador":1.05,"Ninjas|Monge Oculto":1.07,"Mentalistas|Projetor Astral":1.05,"Mentalistas|Pesadelo":1.069,"Demônios|Carniceiro":1.076,"Demônios|Cuspichama":1.053,"Demônios|Arqueiro de Enxofre":1.078,"Demônios|Sacerdote Abissal":1.05,"Orcs|Xamã Orc":1.05,"Espectrais|Sombra Rápida":0.95,"Alquimistas|Lançador de Frascos":1.056,"Demônios|Diabrete":0.929,"Medievais|Camponês":0.932,"Medievais|Espadachim":0.948,"Demônios|Príncipe do Abismo":0.95,"Demônios|Arquidemônio":0.947,"Medievais|Carrasco":0.921,"Medievais|Rei":0.92,"Demônios|Tentador":1.08,"Robôs|Reparador":1.05,"Orcs|Tambor de Guerra":1.055,"Físicos|Campo Estável":1.05,"Físicos|Singularidade":0.95,"Espectrais|Médium Morto":1.08,"Mutantes|Garras":0.947,"Mutantes|Quatro-Pernas":0.95,"Mutantes|Tecelão Celular":1.05,"Bestas Marinhas|Água-Viva":1.05,"Nômades do Deserto|Curandeiro Nômade":1.05,"Nômades do Deserto|Mago da Miragem":1.064,"Samurais|Monge Sohei":1.05,"Alienígenas|Translúcido":0.938,"Alienígenas|Cuspidor":1.062,"Alienígenas|Tentacular":1.052,"Alienígenas|Cérebro Gigante":1.05,"Alienígenas|Casulo":1.05,"Bestas Marinhas|Polvo":1.07,"Cristalinos|Obsidiana":1.064,"Medievais|Padre":1.05,"Físicos|Reator Nuclear":0.92,"Cristalinos|Safira":1.05,"Físicos|Gráviton":1.08,"Medievais|Comandante":1.05,"Alienígenas|Trípode":0.937,"Medievais|Balista":1.08,"Lobos|Alfa Sangrento":0.941,"Medievais|Nobre":1.072};
function safeJSON(s){try{return JSON.parse(s)}catch{return null}}
const old=safeJSON(localStorage.getItem(DB_KEY));
if(old&&old.ruleset&&old.ruleset!==NEW_RULESET){
  const archiveKey='stickLanesBalanceArchive.'+String(old.ruleset).replace(/[^a-z0-9._-]+/gi,'_');
  localStorage.setItem(archiveKey,JSON.stringify({archivedAt:Date.now(),reason:'mudança de atributos v3.3',data:old}));
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(HISTORY_KEY);
}
for(const [fac,data] of Object.entries(window.SL_FACTIONS||{})){
  const fm=FACTION[fac]||1;
  for(const u of data.units||[]){
    const um=UNIT[fac+'|'+u.name]||1,m=fm*um;
    u.hp=Math.max(1,Math.round(u.hp*m));
    u.atk=Math.max(1,Math.round(u.atk*m));
    u.def=Math.max(0,Math.round(u.def*(1+(m-1)*0.70)));
    u.balance={baseline:BASELINE_RULESET,faction:fm,unit:um,total:Number(m.toFixed(3))};
  }
}
window.SL_RULESET_VERSION=NEW_RULESET;
window.SL_BALANCE_PATCH={version:'3.3',sourceMatches:23000,baseline:BASELINE_RULESET,factionMultipliers:FACTION,unitMultipliers:UNIT};
})();
