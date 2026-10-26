/** Exact integer-coordinate sticker model. Turns are clockwise as seen from outside. */
export const FACES = {
  U: { n:[0,1,0], r:[1,0,0], d:[0,0,1], color:'#f5f1e7' },
  R: { n:[1,0,0], r:[0,0,-1], d:[0,-1,0], color:'#ed655b' },
  F: { n:[0,0,1], r:[1,0,0], d:[0,-1,0], color:'#56bfa0' },
  D: { n:[0,-1,0], r:[1,0,0], d:[0,0,-1], color:'#efd56c' },
  L: { n:[-1,0,0], r:[0,0,1], d:[0,-1,0], color:'#eea45f' },
  B: { n:[0,0,-1], r:[-1,0,0], d:[0,-1,0], color:'#689ed0' }
};
export const TURN = { R:[0,1,-1],L:[0,-1,1],U:[1,1,-1],D:[1,-1,1],F:[2,1,-1],B:[2,-1,1],M:[0,0,1],E:[1,0,1],S:[2,0,-1],x:[0,null,-1],y:[1,null,-1],z:[2,null,-1] };
export const same=(a,b)=>a.every((v,i)=>v===b[i]);
export const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export function solved(){
  return Object.entries(FACES).flatMap(([face,{n,r,d}])=>Array.from({length:9},(_,i)=>{
    const p=n.map((v,k)=>v+(i%3-1)*r[k]+(Math.floor(i/3)-1)*d[k]);
    return {id:face+(i+1),face,p,n:[...n],home:[...p],homeN:[...n]};
  }));
}
export function parse(text){
  const s=text.replace(/[’′]/g,"'").trim();
  if(!s)return [];
  const tokens=s.match(/[URFDLBMESxyz](?:2'?|')?/g)||[];
  if(s.replace(/[URFDLBMESxyz](?:2'?|')?/g,'').replace(/\s/g,''))throw new Error('使える記号：U R F D L B M E S x y z、\u0027、2。手順は空白で区切ってください。');
  if(tokens.length>80)throw new Error('A・Bはそれぞれ80手以内で入力してください。');
  return tokens.map(t=>t.replace("2'",'2'));
}
export function inverse(alg){return [...(typeof alg==='string'?parse(alg):alg)].reverse().map(m=>m.endsWith('2')?m:m.endsWith("'")?m.slice(0,-1):m+"'");}
export function rotate(v,axis,quarters){
  let out=[...v];
  for(let i=0;i<(quarters%4+4)%4;i++){
    const [x,y,z]=out;
    out=axis===0?[x,-z,y]:axis===1?[z,y,-x]:[-y,x,z];
  }
  return out;
}
export function move(state,token){
  const [axis,layer,dir]=TURN[token[0]];
  const q=dir*(token.includes('2')?2:token.endsWith("'")?-1:1);
  return state.map(s=>layer===null||s.p[axis]===layer?{...s,p:rotate(s.p,axis,q),n:rotate(s.n,axis,q)}:s);
}
export function apply(state,alg){return (typeof alg==='string'?parse(alg):alg).reduce(move,state);}
export function commutator(a,b){const A=typeof a==='string'?parse(a):a,B=typeof b==='string'?parse(b):b;return [...A,...B,...inverse(A),...inverse(B)];}
export function name(p){return `${p[1]===1?'U':p[1]===-1?'D':''}${p[2]===1?'F':p[2]===-1?'B':''}${p[0]===1?'R':p[0]===-1?'L':''}`;}
export function pieces(state){
  const groups=new Map();
  for(const s of state){const key=name(s.home);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
  return [...groups].map(([id,stickers])=>({id,stickers,home:stickers[0].home,p:stickers[0].p,at:name(stickers[0].p),type:stickers.length===3?'corner':stickers.length===2?'edge':'center',changed:stickers.some(s=>!same(s.p,s.home)||!same(s.n,s.homeN))}));
}
export function cycles(state,type){
  const list=pieces(state).filter(p=>!type||p.type===type),map=new Map(list.map(p=>[p.id,p.at])),seen=new Set(),result=[];
  for(const p of list){if(seen.has(p.id)||p.id===p.at)continue;const cycle=[];let at=p.id;while(!seen.has(at)&&map.has(at)){cycle.push(at);seen.add(at);at=map.get(at);}if(cycle.length>1)result.push(cycle);}
  return result;
}
export function signature(state){return state.map(s=>`${s.id}:${s.p.join(',')}/${s.n.join(',')}`).join('|');}
export function facelets(state,face){const {n,r,d}=FACES[face];return state.filter(s=>same(s.n,n)).sort((a,b)=>(dot(a.p,d)-dot(b.p,d))*3+dot(a.p,r)-dot(b.p,r));}
