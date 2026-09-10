const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={console,SL_MOBA_SQUARE_V2:{},SL_TACTICAL_TARGETING:{handleUnit(){},clickedTarget(){}},draw(){},drawUnit(){}};
context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../vision-walls-v1.js'),'utf8'),context);
const vision=context.SL_VISION;
// Independent reference: intersections against four explicit world-space edges.
function reference(a,b,w,pad){
 const c=Math.cos(w.a),s=Math.sin(w.a),hx=w.len/2+pad,hy=w.thickness/2+pad;
 const inside=p=>Math.abs((p.x-w.x)*c+(p.y-w.y)*s)<=hx&&Math.abs(-(p.x-w.x)*s+(p.y-w.y)*c)<=hy;
 if(inside(a)||inside(b))return true;
 const corners=[[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]].map(([x,y])=>({x:w.x+x*c-y*s,y:w.y+x*s+y*c}));
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 return corners.some((p,i)=>{const q=corners[(i+1)%4];return cross(a,b,p)*cross(a,b,q)<0&&cross(p,q,a)*cross(p,q,b)<0});
}
let seed=2197;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let i=0;i<10000;i++){
 const w={id:'test',x:random()*400,y:random()*400,len:50+random()*1000,thickness:10+random()*100,a:random()*Math.PI*2},pad=i%4*20;
 const point=()=>({x:random()*2000-800,y:random()*2000-800}),a=point(),b=point();
 vision.walls.splice(0,vision.walls.length,w);
 assert.equal(!!vision.blockingWall(a,b,pad),reference(a,b,w,pad),'ray '+i);
}
vision.walls.splice(0,vision.walls.length,{id:'test',x:0,y:0,len:100,thickness:20,a:0});
for(const [a,b,hit] of [[{x:-100,y:10},{x:100,y:10},true],[{x:-100,y:11},{x:100,y:11},false],[{x:0,y:0},{x:0,y:0},true],[{x:51,y:0},{x:51,y:0},false]])assert.equal(!!vision.blockingWall(a,b),hit);
console.log('Wall geometry: 10,000 reference rays and boundary cases OK');
