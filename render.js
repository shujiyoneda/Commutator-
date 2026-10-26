import {FACES,TURN,dot,same,name,pieces,facelets} from './cube.js';
const COLORS=['#83e1c3','#beaff4','#f0c06a'];
export const palette=COLORS;
export const cornerSlots=['UFR','UBR','UBL','UFL','DFL','DBL','DBR','DFR'];
export const edgeSlots=['UF','UR','UB','UL','FL','BL','BR','FR','DF','DL','DB','DR'];
const normals=Object.values(FACES).map(f=>f.n);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,s)=>a.map(v=>v*s);
function rotation(v,axis,angle){const c=Math.cos(angle),s=Math.sin(angle),[x,y,z]=v;return axis===0?[x,c*y-s*z,s*y+c*z]:axis===1?[c*x+s*z,y,-s*x+c*z]:[c*x-s*y,s*x+c*y,z];}
const pstr=p=>p.map(v=>v.toFixed(2)).join(',');
export function cubeSVG(state,{targets={},yaw=32,pitch=25,animated=null,ids=false,title='キューブの状態',large=false}={}){
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180,sy=Math.sin(y),cy=Math.cos(y),sp=Math.sin(p),cp=Math.cos(p);
  const view=[sy*cp,sp,cy*cp],s=large?76:69;
  const project=v=>[250+s*(cy*v[0]-sy*v[2]),210+s*(sp*(sy*v[0]+cy*v[2])-cp*v[1])];
  let axis,layer,angle=0;
  if(animated){const [a,l,dir]=TURN[animated.token[0]];axis=a;layer=l;angle=dir*(animated.token.includes('2')?2:animated.token.endsWith("'")?-1:1)*Math.PI/2*animated.t;}
  const transform=(v,center)=>animated&&(layer===null||center[axis]===layer)?rotation(v,axis,angle):v;
  const surfaces=[];
  for(const cubie of pieces(state)){
    for(const n of normals){
      const nn=transform(n,cubie.p);if(dot(nn,view)<.001)continue;
      const r=n[1]?[1,0,0]:cross([0,1,0],n),d=cross(n,r),center=add(cubie.p,scale(n,.497));
      const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>transform(add(center,add(scale(r,u*.497),scale(d,v*.497))),cubie.p));
      surfaces.push({depth:dot(transform(center,cubie.p),view),svg:`<polygon points="${points.map(v=>pstr(project(v))).join(' ')}" fill="#143437" stroke="#143437" stroke-width=".9" stroke-linejoin="round"/>`});
    }
  }
  for(const st of state){
    const nn=transform(st.n,st.p);if(dot(nn,view)<.001)continue;
    const r=st.n[1]?[1,0,0]:cross([0,1,0],st.n),d=cross(st.n,r),center=add(st.p,scale(st.n,.506));
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>transform(add(center,add(scale(r,u*.445),scale(d,v*.445))),st.p));
    const center3=transform(center,st.p),xy=project(center3),label=targets[name(st.home)],isCenter=st.home.filter(v=>v!==0).length===1;
    let mark='';
    if(label){const color=COLORS[(label-1)%3];mark=`<circle cx="${xy[0]}" cy="${xy[1]}" r="12.5" fill="#17383c" stroke="${color}" stroke-width="2"/><text x="${xy[0]}" y="${xy[1]+4.6}" text-anchor="middle" fill="${color}" font-size="13" font-weight="750">${label}</text>`;}
    else if(ids||isCenter)mark=`<text x="${xy[0]}" y="${xy[1]+4}" text-anchor="middle" fill="#17383c" opacity="${ids?.9:.6}" font-size="${ids?10:13}" font-weight="650">${ids?st.id:st.face}</text>`;
    surfaces.push({depth:dot(center3,view),svg:`<polygon points="${points.map(v=>pstr(project(v))).join(' ')}" fill="${FACES[st.face].color}" stroke="#17383c" stroke-width=".65" stroke-linejoin="round"/>${mark}`});
  }
  return `<svg viewBox="0 0 500 420" role="img" aria-label="${title}" class="cube-svg"><title>${title}</title><ellipse cx="250" cy="375" rx="125" ry="13" fill="#102c2f" opacity=".1"/>${surfaces.sort((a,b)=>a.depth-b.depth).map(s=>s.svg).join('')}</svg>`;
}
export function graphSVG(state,{type='corner',targets={}}={}){
  const slots=type==='edge'?edgeSlots:cornerSlots,N=slots.length,radius=132;
  const xy=i=>[220+radius*Math.sin(2*Math.PI*i/N),209-radius*Math.cos(2*Math.PI*i/N)];
  const list=pieces(state).filter(p=>p.type===type),at=new Map(list.map(p=>[p.at,p]));
  let paths='';
  for(const p of list){const label=targets[p.id];if(!label||p.at===p.id)continue;
    const from=xy(slots.indexOf(p.id)),to=xy(slots.indexOf(p.at)),len=Math.hypot(to[0]-from[0],to[1]-from[1]);
    const start=from.map((v,k)=>v+(to[k]-v)*26/len),end=to.map((v,k)=>v+(from[k]-v)*31/len);
    paths+=`<path d="M${pstr(start)} Q220,209 ${pstr(end)}" fill="none" stroke="${COLORS[(label-1)%3]}" stroke-width="2.5" marker-end="url(#arrow${label})" opacity=".9"/>`;
  }
  return `<svg viewBox="0 0 440 420" role="img" aria-label="${type==='corner'?'コーナー':'エッジ'}の位置を抽象化した模式図" class="graph-svg"><defs>${COLORS.map((c,i)=>`<marker id="arrow${i+1}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="${c}"/></marker>`).join('')}</defs><circle cx="220" cy="209" r="132" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-dasharray="3 8"/><text x="220" y="203" text-anchor="middle" fill="#91aaa8" font-size="10" letter-spacing="2">POSITION MAP</text><text x="220" y="224" text-anchor="middle" fill="#d5e5df" font-size="13">${type==='corner'?'８つのコーナー位置':'12のエッジ位置'}</text>${paths}${slots.map((slot,i)=>{
    const [x,y]=xy(i),piece=at.get(slot),label=targets[piece.id],color=label?COLORS[(label-1)%3]:'#668583',lx=220+(radius+37)*Math.sin(2*Math.PI*i/N),ly=209-(radius+37)*Math.cos(2*Math.PI*i/N);
    return `<text x="${lx}" y="${ly+4}" text-anchor="middle" fill="#a8c0bb" font-size="11" font-weight="600">${slot}</text><circle cx="${x}" cy="${y}" r="${label?21:18}" fill="${label?color:'#234448'}" stroke="${label?color:'#436369'}" stroke-width="1.5"/><text x="${x}" y="${y+4.5}" text-anchor="middle" fill="${label?'#16393c':'#a8c0bb'}" font-size="${label?16:9}" font-weight="700">${label||piece.id}</text>`;
  }).join('')}</svg>`;
}
export function netSVG(state,{targets={},ids=false}={}){
  const cell=26,layouts={U:[94,24],L:[10,118],F:[94,118],R:[178,118],B:[262,118],D:[94,212]};
  return `<svg viewBox="0 0 350 304" class="net-svg" role="img" aria-label="全54ステッカーを示す６面展開図"><title>上：U、中央：L F R B、下：D。各面を外側から見た配置。</title>${Object.entries(layouts).map(([face,[x,y]])=>`<text x="${x+39}" y="${y-7}" fill="currentColor" font-size="9" font-weight="700" text-anchor="middle">${face}</text>${facelets(state,face).map((st,i)=>{
  const xx=x+(i%3)*cell,yy=y+Math.floor(i/3)*cell,label=targets[name(st.home)];
  return `<rect x="${xx}" y="${yy}" width="24" height="24" rx="3" fill="${FACES[st.face].color}" stroke="#18383c" stroke-width=".8"/>${label||ids?`<text x="${xx+12}" y="${yy+15.5}" fill="#153436" text-anchor="middle" font-size="${ids?7:11}" font-weight="750">${ids?st.id:label}</text>`:''}`;
 }).join('')}`).join('')}</svg>`;
}
