/* Stick Lanes — primeiras Lendas
   Uma Lenda gratuita entra com a primeira onda de cada exército. */
'use strict';
(function(){
const LEGENDS=[
  {
    id:'nefal',name:'Néfal',title:'O Horizonte Interior',role:'controller',
    hp:1100,def:210,atk:58,speed:4.35,range:13,rate:1.38,cost:0,gen:0,
    fantasy:'Lenda suprema dos Mentalistas; uma entidade alta, sem rosto e feita de metal psíquico vivo, que comprime espaço e vontade.',
    playstyle:'Controle mental • rajada dupla • anomalias',
    palette:['#100c24','#7551ba','#6fffe0','#f1d8ff','#e48dff'],
    ability:{name:'Convergência do Horizonte',desc:'Dispara duas lanças psíquicas, com chance de uma terceira, sem permitir execução instantânea de tropas inteiras no início da partida.'},
    progression:{maxLevel:12,hpPerLevel:.04,atkPerLevel:.0325,defPerLevel:.02,baseSkillDamage:75,skillPerLevel:9,skillCooldown:5.8,thirdBoltBase:.18,thirdBoltPerLevel:.025,maxLevelAuraDamage:.12},
    special:{legend:true,legendKind:'nefal',legendColor:'#b475ff',procChance:.40,lifestealProc:.05,stunProc:.07,maxLevelAuraDamage:.12}
  },
  {
    id:'karkinos',name:'Karkinos',title:'O Quebra-Marés',role:'tank',
    hp:1800,def:280,atk:48,speed:3.45,range:2.1,rate:1.42,cost:0,gen:0,
    fantasy:'Caranguejo abissal colossal; carapaça viva, força de contenção e uma pinça capaz de prender o inimigo.',
    playstyle:'Carapaça • contenção • escala defensiva',
    palette:['#173f4b','#2f8e91','#81dfc5','#e5fff4'],
    ability:{name:'Pinça de Maré',desc:'Prende uma unidade inimiga e a mantém sob controle por curto período; a carapaça sustenta a linha enquanto ele avança.'},
    progression:{maxLevel:12,hpPerLevel:.05,atkPerLevel:.025,defPerLevel:.025,shellPct:.30,defensePer1000Hp:.07,maxLevelReflect:.10},
    special:{legend:true,legendKind:'karkinos',legendColor:'#81dfc5',shellPct:.30,defensePer1000Hp:.07,pinch:true,maxLevelReflect:.10}
  },
  {
    id:'vesper',name:'Vesper',title:'A Serpente do Eclipse',role:'skirmisher',
    hp:900,def:150,atk:55,speed:5.35,range:11,rate:1.45,cost:0,gen:0,
    fantasy:'Serpente astral segmentada que caça por rasantes curtos, veneno e reposicionamento constante.',
    playstyle:'Veneno • rasante a cada 4 ataques • perseguição',
    palette:['#17182f','#4451a8','#ffb64d','#fff0bd'],
    ability:{name:'Órbita Rasante',desc:'A cada quatro ataques, avança uma curta distância para atacar com 15% de dano adicional. A cada 20s carrega um veneno que aplica lentidão.'},
    progression:{maxLevel:12,hpPerLevel:.035,atkPerLevel:.035,defPerLevel:.015,poisonCooldown:20,dashEvery:4,dashDamageBonus:.15,maxLevelMoveBonus:.20},
    special:{legend:true,legendKind:'vesper',legendColor:'#ffb64d',poisonCooldown:20,dashEvery:4,dashDamageBonus:.15,maxLevelMoveBonus:.20}
  }
];

function get(id){return LEGENDS.find(legend=>legend.id===id)||LEGENDS[0]}
window.SL_LEGENDS=LEGENDS;
window.SL_LEGENDS_API={get};
})();
