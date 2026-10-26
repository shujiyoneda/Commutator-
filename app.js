import {solved,parse,inverse,apply,move,commutator,pieces,cycles,signature} from './cube.js';
import {cubeSVG,graphSVG,netSVG} from './render.js';
const $=id=>document.getElementById(id);
const initial=solved();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_A="R U R'",DEFAULT_B='D';
const examples={
  corner:{a:DEFAULT_A,b:DEFAULT_B,title:'コーナー３点巡回',type:'corner',targets:{UFR:1,DFR:2,DFL:3}},
  edge:{a:'M2',b:"U R U'",title:'エッジ３点巡回',type:'edge',targets:{UB:1,FR:2,DF:3}},
  sexy:{a:'R',b:'U',title:'RとU：３点だけとは限らない',type:'edge',targets:{UB:1,FR:2,UR:3}},
  commute:{a:'R',b:'L',title:'RとL：順番を交換できる操作',type:'corner',targets:{UFR:1,DFR:2,DFL:3}}
};
let a=[],b=[],groups=[],moves=[],snapshots=[],bounds=[],step=0,key='corner',mapType='corner',targets={},flipped=false;
let yaw=32,pitch=25,playing=false,raf=0,timer=0,epoch=0,showIds=false;
const format=alg=>alg.join(' ').replaceAll("'",'′');
const changed=state=>pieces(state).filter(p=>p.changed);
const normalizeCycle=(cycle,first)=>{const index=cycle.indexOf(first);return index<0?cycle:[...cycle.slice(index),...cycle.slice(0,index)];};
function selectTargets(){
  const cfg=examples[key];
  if(cfg&&cfg.type===mapType){targets=cfg.targets;return;}
  const final=snapshots.at(-1),candidate=cycles(final,mapType)[0]||changed(final).filter(p=>p.type===mapType).map(p=>p.id);
  const selected=candidate.length?candidate:mapType==='corner'?['UFR','DFR','DFL']:['UF','UR','UB'];
  targets=Object.fromEntries(selected.slice(0,3).map((id,i)=>[id,i+1]));
}
function stop(){playing=false;epoch++;cancelAnimationFrame(raf);clearTimeout(timer);raf=0;timer=0;}
function loadAlgorithm(aa,bb,{example='custom',type='corner',reversed=false}={}){
  stop();a=typeof aa==='string'?parse(aa):aa;b=typeof bb==='string'?parse(bb):bb;
  key=example;mapType=type;flipped=reversed;step=0;
  groups=[a,b,inverse(a),inverse(b)];moves=groups.flat();snapshots=[initial];
  for(const token of moves)snapshots.push(move(snapshots.at(-1),token));
  let sum=0;bounds=groups.map(g=>sum+=g.length);
  selectTargets();
  $('input-a').value=a.join(' ');$('input-b').value=b.join(' ');$('input-error').textContent='';
  $('algorithm-label').textContent=`[${format(a)}, ${format(b)}]`;
  $('example-title').textContent=(examples[key]?.title||'自分で選んだ交換子')+(flipped?' / 逆向き':'');
  for(let i=0;i<4;i++)$(`phase-alg-${i}`).textContent=format(groups[i]);
  document.querySelectorAll('[data-example]').forEach(btn=>{const active=btn.dataset.example===key;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active);});
  updateFinal();render();
}
function updateFinal(){
  const final=snapshots.at(-1),all=changed(final);
  if(!all.length){$('final-cycle').textContent='変化なし。完成状態に戻ります。';return;}
  const parts=[];
  for(const [type,label] of [['corner','コーナー'],['edge','エッジ'],['center','センター']]){
    const c=cycles(final,type);if(c.length)parts.push(`${label}：${c.map(cy=>{const cc=normalizeCycle(cy,'UFR');return [...cc,cc[0]].join(' → ');}).join(' ／ ')}`);
  }
  $('final-cycle').textContent=parts.length?parts.join(' ｜ '):'位置の巡回なし。向きの変化が残ります。';
}
function drawCube(animated=null){$('lab-cube').innerHTML=cubeSVG(snapshots[step],{targets,yaw,pitch,animated,title:`キューブの状態、${step} / ${moves.length}手実行済み`});}
function render(){
  drawCube();$('lab-map').innerHTML=graphSVG(snapshots[step],{type:mapType,targets});
  $('lab-net').innerHTML=netSVG(snapshots[step],{targets,ids:showIds});
  $('move-slider').max=moves.length;$('move-slider').value=step;
  $('move-count').value=`${step} / ${moves.length}`;$('move-count').textContent=`${step} / ${moves.length}`;
  $('move-slider').setAttribute('aria-valuetext',`${moves.length}手中、${step}手実行済み`);
  $('prev').disabled=step===0;$('next').disabled=step===moves.length;$('finish').disabled=step===moves.length;
  $('play').innerHTML=playing?'<span aria-hidden="true">Ⅱ</span> 停止':'<span aria-hidden="true">▶</span> 再生';
  $('play').setAttribute('aria-label',playing?'自動再生を停止':'自動再生');
  const groupIndex=step===0?-1:bounds.findIndex(end=>step<=end);
  document.querySelectorAll('[data-phase]').forEach((btn,i)=>{btn.classList.toggle('active',i===groupIndex);btn.classList.toggle('past',step>=bounds[i]&&step>0);btn.setAttribute('aria-pressed',i===groupIndex);});
  for(const type of ['corner','edge']){$(`map-${type}`).classList.toggle('active',type===mapType);$(`map-${type}`).setAttribute('aria-pressed',type===mapType);}
  const counts={corner:0,edge:0,center:0};for(const p of changed(snapshots[step]))counts[p.type]++;
  $('changed-total').textContent=counts.corner+counts.edge+counts.center;
  $('changed-detail').textContent=`コーナー ${counts.corner} ／ エッジ ${counts.edge}`+(counts.center?` ／ センター ${counts.center}`:'');
  let chip='START',heading='まずは完成状態から。',description='番号の付いたピースに注目してください。「再生」または「１手進む」で、動きを追いかけられます。';
  if(step>0){
    const localStep=step-(groupIndex>0?bounds[groupIndex-1]:0),labels=['A','B','A⁻¹','B⁻¹'];chip=labels[groupIndex];
    heading=`${labels[groupIndex]}を実行：${format(groups[groupIndex])}（${localStep} / ${groups[groupIndex].length}手）`;
    description=[
      '最初の操作で、いくつかのピースを一度移動させます。模式図の外側の位置名は固定され、内側のピースが移動します。',
      '続けてBを実行します。Aの後でピースの配置が変わっているため、Bの作用する場所にも別のピースが入ってきます。',
      'Aの逆手順で戻します。ただし間にBが入ったので、Aを実行する前と同じピース配置に戻るとは限りません。',
      '最後にBの逆手順を実行します。初期状態との差として、交換子の効果が残ります。'
    ][groupIndex];
  }
  if(step===moves.length){chip='RESULT';
    if(key==='corner'){heading='３つのコーナーだけが変化。';description='位置の巡回が残りました。ほかの５コーナーと12エッジは位置・向きとも元通りです。３つの対象ピースの色と向きは、展開図でも確認できます。';}
    else if(key==='edge'){heading='３つのエッジだけが変化。';description='コーナー８個とほかの９エッジは、位置・向きとも元通り。対象エッジの向きは色の移動で確認できます。';}
    else if(key==='commute'){heading='変化はゼロ。完全に元通り。';description='RとLは異なる層を動かし、作用範囲が重なりません。順番を交換しても結果が同じなので、交換子は恒等操作になります。';}
    else if(key==='sexy'){heading='３エッジと４コーナーが変化。';description='[R,U] = R U R′ U′も正しい交換子です。エッジだけを見ると３点巡回ですが、コーナーにも変化が残ります。交換子が常に純粋な３点巡回になるわけではありません。';}
    else{heading=changed(snapshots[step]).length?'これが、選んだA・Bが残す変化です。':'完成状態に戻りました。';description='位置の移動は模式図、向きも含めた変化はキューブ図と展開図で確認してください。番号は選択した種類の代表ピースを最大３個追跡します。';}
  }
  $('phase-chip').textContent=chip;$('phase-heading').textContent=heading;$('phase-description').textContent=description;
  $('target-legend').innerHTML=Object.entries(targets).map(([id,n])=>`<span><b class="target-${n}">${n}</b> ${id}</span>`).join('');
}
function go(n){stop();step=Math.max(0,Math.min(moves.length,Number(n)));render();}
function advance(){
  if(step>=moves.length){stop();render();return;}
  const run=epoch,token=moves[step],begin=performance.now(),duration=reducedMotion?0:Number($('speed').value)*.68;
  const frame=now=>{
    if(run!==epoch)return;
    const progress=duration===0?1:Math.min(1,(now-begin)/duration),eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
    if(progress<1){drawCube({token,t:eased});raf=requestAnimationFrame(frame);}
    else{step++;if(step===moves.length)playing=false;render();if(playing)timer=setTimeout(advance,Number($('speed').value)*.32);}
  };raf=requestAnimationFrame(frame);
}
function chooseExample(example){const cfg=examples[example];loadAlgorithm(cfg.a,cfg.b,{example,type:cfg.type});}
const targetLegend=document.createElement('div');targetLegend.id='target-legend';targetLegend.className='target-legend';$('lab-cube').after(targetLegend);
$('hero-cube').innerHTML=cubeSVG(apply(initial,commutator(DEFAULT_A,DEFAULT_B)),{targets:examples.corner.targets,large:true,title:'交換子 R U R′ D R U′ R′ D′ の実行後。UFR・DFR・DFLの３コーナーのみ変化。'});
$('cube-ru').innerHTML=cubeSVG(apply(initial,'R U'),{targets:{UFR:1},title:'Rの後にUをした状態。番号１は元のUFRコーナー。'});
$('cube-ur').innerHTML=cubeSVG(apply(initial,'U R'),{targets:{UFR:1},title:'Uの後にRをした状態。番号１は元のUFRコーナー。'});
document.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>chooseExample(btn.dataset.example)));
document.querySelectorAll('[data-phase]').forEach(btn=>btn.addEventListener('click',()=>go(bounds[Number(btn.dataset.phase)-1])));
$('reset').addEventListener('click',()=>go(0));$('prev').addEventListener('click',()=>go(step-1));$('finish').addEventListener('click',()=>go(moves.length));
$('next').addEventListener('click',()=>{stop();render();advance();});
$('play').addEventListener('click',()=>{if(playing){stop();render();return;}if(step===moves.length)step=0;stop();playing=true;render();advance();});
$('move-slider').addEventListener('input',e=>go(e.target.value));
$('swap-ab').addEventListener('click',()=>loadAlgorithm(b,a,{example:key,type:mapType,reversed:!flipped}));
for(const type of ['corner','edge'])$(`map-${type}`).addEventListener('click',()=>{stop();mapType=type;selectTargets();render();});
$('sticker-ids').addEventListener('change',e=>{showIds=e.target.checked;$('lab-net').innerHTML=netSVG(snapshots[step],{targets,ids:showIds});});
$('custom-form').addEventListener('submit',e=>{e.preventDefault();try{const aa=parse($('input-a').value),bb=parse($('input-b').value);if(!aa.length||!bb.length)throw new Error('AとBに、それぞれ１手以上の回転を入力してください。');loadAlgorithm(aa,bb,{type:mapType});}catch(error){$('input-error').textContent=error.message;}});
const views={front:[32,25],back:[-148,25],bottom:[32,-28]};
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{[yaw,pitch]=views[btn.dataset.view];document.querySelectorAll('[data-view]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});drawCube();}));
let drag=null;
$('lab-cube').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw,pitch,pointerId:e.pointerId};if(e.pointerType!=='touch')$('lab-cube').setPointerCapture(e.pointerId);});
$('lab-cube').addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)&&!$('lab-cube').classList.contains('is-dragging')){drag=null;return;}if(Math.hypot(dx,dy)<6)return;$('lab-cube').classList.add('is-dragging');yaw=drag.yaw+dx*.4;pitch=Math.max(-75,Math.min(75,drag.pitch-dy*.35));drawCube();document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});});
const endDrag=()=>{drag=null;$('lab-cube').classList.remove('is-dragging');};
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
function showSetup(s){
  const S=parse(s),C=commutator(DEFAULT_A,DEFAULT_B),final=apply(initial,[...S,...C,...inverse(S)]),cy=cycles(final,'corner')[0],setupTargets=Object.fromEntries(cy.map((p,i)=>[p,i+1]));
  $('setup-cube').innerHTML=cubeSVG(final,{targets:setupTargets,title:`セットアップ ${s} の後で交換子を実行し、${format(inverse(S))}で戻した状態。`});
  $('setup-alg').textContent=`${format(S)} (${format(C)}) ${format(inverse(S))}`;
  $('setup-cycle').textContent=[...cy,cy[0]].join(' → ');
  document.querySelectorAll('[data-setup]').forEach(btn=>{const active=btn.dataset.setup===s;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active);});
}
document.querySelectorAll('[data-setup]').forEach(btn=>btn.addEventListener('click',()=>showSetup(btn.dataset.setup)));
$('revisit-corner').addEventListener('click',()=>{chooseExample('corner');go(moves.length);});
$('try-reverse').addEventListener('click',()=>{loadAlgorithm(DEFAULT_B,DEFAULT_A,{example:'corner',type:'corner',reversed:true});go(moves.length);$('lab').scrollIntoView({behavior:reducedMotion?'auto':'smooth'});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
chooseExample('corner');showSetup('U');
