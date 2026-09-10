/* Content hashes are committed in HTML; Pages and APK consume the same files. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
for(const file of ['index.html','balance.html']){
  const before=fs.readFileSync(path.join(root,file),'utf8');
  const scripts=[...before.matchAll(/<script\b[^>]*src="([^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1]);
  if(new Set(scripts).size!==scripts.length)throw new Error(file+': duplicate script');
  if(file==='index.html'){
    const chain=['moba-square-v2.js','tactical-targeting-v1.js','buff-regions-v1.js','vision-walls-v1.js','jungle-access-v1.js','jungle-pathfinding-v2.js','ai-side-vision-v1.js','legend-authority-lock-v1.js','assisted-draft-v1.js'];
    let last=-1;for(const name of chain){const at=scripts.indexOf(name);if(at<=last)throw new Error('Missing/out-of-order dependency: '+name);last=at}
    for(const name of ['legacy-legend-quarantine-v2.js','ai-research-director-v1.js','ai-plan-stability-v2.js','ai-research-arbiter-bridge-v1.js'])if(scripts.includes(name))throw new Error('Retired controller loaded: '+name);
  }
  for(const name of scripts)new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
  const after=before.replace(/(\b(?:src|href)="([^"?]+\.(?:js|css)))(?:\?[^"]*)?"/g,(_,prefix,name)=>{
    const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name),'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,12);
    return prefix+'?v='+hash+'"';
  });
  if(check&&before!==after)throw new Error(file+': stale assets; run npm run assets');
  if(!check)fs.writeFileSync(path.join(root,file),after);
}
console.log('Asset hashes, syntax and load order: OK');
