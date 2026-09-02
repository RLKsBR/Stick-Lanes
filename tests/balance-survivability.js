const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const storage=new Map();
const context={
  window:{},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  console
};
vm.createContext(context);
for(const file of ['factions-v3.js','balance-patch-v3-3.js','balance-patch-v3-4.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});

const result=context.window.SL_BALANCE_SURVIVABILITY.tankRule();
if(!result.pass)throw new Error(`tanque comprável mais fraco não supera minion: ${JSON.stringify(result)}`);
if(result.weakestEffectiveHp<result.minionEffectiveHp*1.15)
  throw new Error(`margem de resistência abaixo de 15%: ${JSON.stringify(result)}`);

const tuning=context.window.SL_BALANCE_SURVIVABILITY.roleTuning;
for(const role of ['tank','fighter','ranged']){
  if(!(tuning[role].hp>1&&tuning[role].def>1&&tuning[role].atk<1))
    throw new Error(`ajuste inválido para ${role}`);
}
console.log(`Balance survivability: OK (tropa tank ${result.weakestEffectiveHp} EHP; minion tank ${result.minionEffectiveHp} EHP)`);
