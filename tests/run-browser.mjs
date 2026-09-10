import {spawn} from 'node:child_process';
import {once} from 'node:events';
const server=spawn(process.execPath,['tools/serve.cjs'],{stdio:['ignore','pipe','inherit']});
const ready=once(server.stdout,'data');
const exited=once(server,'exit').then(()=>{throw new Error('Test server could not start (port 4173 must be free)')});
try{
  await Promise.race([ready,exited]);
  for(const file of ['tests/runtime-regressions.mjs','tests/browser-assisted.mjs','tests/ai-stability.mjs']){
    const child=spawn(process.execPath,[file],{stdio:'inherit'});
    const [code]=await once(child,'exit');if(code!==0)throw new Error(file+' failed: '+code);
  }
}finally{server.kill()}
