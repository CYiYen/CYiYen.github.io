// 首頁＝3D 軟體的 Object Mode。作品資料由 build.py 寫進 index.html 的 window.PORTFOLIO。
// 選取作品後按 Tab（或雙擊）＝進入 Edit Mode，也就是開啟該作品的完整頁面。
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const D=window.PORTFOLIO, W=D.works;
// 座標平面展場（2026-10-21 使用者：以 XY、YZ、XZ 為平面；分頁名稱維持「作品／研究與合作／早期作品」）
// 地板＝XY 放作品、左牆＝YZ 放研究與合作、後牆＝XZ 放早期作品，組成房間的一角。選分頁時整個角落繞對角線 (1,1,1) 轉 120°，
// 選到的平面轉成地板、上面的作品跟著轉正；其他兩類的模型完全隱藏（使用者：不然看起來很亂）。沒有 zones 資料時與原版完全相同
const Z=D.zones||null,ZS=[1,0.66,0.48];
const PLANES=[['XY',Z?Z[0].split('　')[0]:''],['YZ',Z?Z[1].split('　')[0]:''],['XZ',Z?Z[2].split('　')[0]:'']];   // 類別 → 平面：0 作品＝XY、1 研究與合作＝YZ、2 早期作品＝XZ
const ROWN=Z?[0,1,2].map(p=>W.filter(w=>w.zone===p).length):[W.length];
let cz=-1;   // 目前的平面；-1＝全部
const pending=new URLSearchParams(location.hash.slice(1)).get('sel');
const PB=D.base||'';  // 英文站的頁面在 en/，頁面連結要加前綴（資產靠 <base href="../">）
const U=Object.assign({about:'關於',openCv:'開啟簡歷　About →',howtoH:'操作',howto:'拖曳：旋轉視角　滾輪：縮放<br>點選作品：顯示作品資訊<br>再次點選：開啟作品頁<br>雕塑工具：按住拖曳可推動模型表面，放開後自動復原',openWork:'開啟作品頁 →',orTab:'亦可再次點選模型或按 Tab 鍵。',sound:'聲音',stop:'■ 停止播放',play:'▶ 播放 Beacon Silence 七聲部',playNote:'播放時，游標移至光束上即可遮斷該道光，對應聲部隨之靜音，與展場中的機制相同。',basics:'基本資料',kind:'類型',medium:'媒材',shown:'展出',role:'分工',model:'模型',modelOrig:'作者的原始 Blender 模型',modelToy:'示意模型（本作無原始 3D 檔）',all:'全部',photos:'照片',none:'無',editMode:'開啟作品頁…',browse:'瀏覽　▾',stats:'共 {n} 件作品　|　{name} 2026',hint:'拖曳：旋轉視角　·　點選：作品資訊　·　再次點選：開啟作品頁',hintSculpt:'雕塑工具：點選作品以對準，再按住拖曳推動表面（放開後自動復原）',aimed:'已對準。按住拖曳即可推動表面',selectFirst:'請先點選作品，再按此處開啟作品頁',keysToggle:'開／關按鍵顯示',keysLabel:'按鍵顯示',act:{'Tab':'開啟作品頁','Esc':'取消選取','S':'雕塑工具','Q':'選取工具','.':'對準作品','←':'上一件','→':'下一件'},drag:['旋轉視角','縮放','平移'],btn:['左鍵','中鍵','右鍵'],dragWord:'拖曳',touch:'觸控',touchAct:'點選／拖曳轉動',key:'按鍵 ',sculpt:'雕塑',btnAct:['點選作品','拖曳縮放','拖曳平移'],push:'推動表面',wheel:'滾輪 ',zoomIn:'放大',zoomOut:'縮小'},D.ui||{});  // 介面文字：中文為預設，英文站由 build.py 經 PORTFOLIO.ui 覆蓋
const THEME=new URLSearchParams(location.search).get('theme')||D.theme||'';document.body.classList.add('theme-'+(THEME||'base'));
const CLAY=THEME==='clay',FADE=THEME==='fade';  // 從作品頁回來時要選取的作品
let selected=null,hovered=null,tool='select',playing=false,actx=null;const gains=[],els=[],blocked=new Set();

// ---------------- 場景
const view=document.getElementById('view'),canvas=document.getElementById('cv');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(CLAY?0xe3dcd2:FADE?0x070707:0x2b2b2b);
const camera=new THREE.PerspectiveCamera(38,1,0.05,300);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.target.set(0,0.8,0);controls.maxPolarAngle=Math.PI*0.49;controls.minDistance=2.4;  // 防穿模：鏡頭不能鑽進模型（模型半寬約 1.3–1.7）
scene.add(new THREE.HemisphereLight(0xffffff,0x3a3a3a,FADE?0.05:1.6));
const key=new THREE.DirectionalLight(0xffffff,FADE?0:1.6);key.position.set(5,9,6);scene.add(key);
if(CLAY){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-16,right:16,top:8,bottom:-8,near:1,far:40});key.shadow.radius=6;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:0.16}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground)}
// 消隱：只有游標的光照到的地方才浮現
const torch=new THREE.SpotLight(0xffffff,FADE?55:0,0,0.17,0.9,1.2);torch.position.set(0,9,10);scene.add(torch);scene.add(torch.target);
const rim=new THREE.DirectionalLight(0xffffff,FADE?0:0.5);rim.position.set(-6,4,-6);scene.add(rim);
if(!D.zones)scene.add(new THREE.GridHelper(80,80,CLAY?0xcfc6b9:FADE?0x141414:0x3f3f3f,CLAY?0xd8d0c4:FADE?0x0f0f0f:0x363636));
const axis=(a,b,c)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color:c}));scene.add(l)};
if(!FADE&&!D.zones){axis(new THREE.Vector3(-40,0.002,0),new THREE.Vector3(40,0.002,0),CLAY?0xc49a8a:0x8a4a4a);axis(new THREE.Vector3(0,0.002,-40),new THREE.Vector3(0,0.002,40),CLAY?0xa3b393:0x5b7a45)}

// 陶土：用程式畫一張「陶土球」的光影圖（matcap），模型套上就有霧面陶土的質感，不需要貼圖座標
function clayMatcap(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  let g=x.createRadialGradient(96,84,10,128,128,128);g.addColorStop(0,'#f3e6d6');g.addColorStop(0.45,'#d6bfa6');g.addColorStop(0.85,'#a88a6f');g.addColorStop(1,'#7d6450');
  x.fillStyle=g;x.fillRect(0,0,256,256);const d=x.getImageData(0,0,256,256);for(let i=0;i<d.data.length;i+=4){const n=(Math.random()-0.5)*14;d.data[i]+=n;d.data[i+1]+=n;d.data[i+2]+=n}x.putImageData(d,0,0);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const MATCAP=CLAY?clayMatcap():null;
const SOLID=()=>CLAY?new THREE.MeshMatcapMaterial({matcap:MATCAP,transparent:true,opacity:1})
  :new THREE.MeshStandardMaterial({color:FADE?0xd0d0d0:0xb9b9b9,roughness:FADE?0.55:0.75,metalness:0,transparent:true,opacity:1});
const tex=new THREE.TextureLoader();

// 每件作品的示意模型：參考原作的特徵，用圓角方塊、膠囊、球做成簡單可愛的造形（不照抄原始外形）
const DARK=()=>new THREE.MeshStandardMaterial({color:0x3c3c3c,roughness:0.6,transparent:true,opacity:1});
function toyModel(slug){
  const g=new THREE.Group();
  const add=(geo,x=0,y=0,z=0,mat)=>{const m=new THREE.Mesh(geo,mat||SOLID());m.position.set(x,y,z);g.add(m);return m};
  const box=(w,h,d,r=0.08)=>new RoundedBoxGeometry(w,h,d,8,Math.min(r,w/2-0.001,h/2-0.001,d/2-0.001));
  const ball=(r)=>new THREE.SphereGeometry(r,48,32), cap=(r,l)=>new THREE.CapsuleGeometry(r,l,8,24);
  const person=(x,y,z,s=1)=>{add(cap(0.13*s,0.32*s),x,y+0.29*s,z);add(ball(0.13*s),x,y+0.66*s,z)};
  if(slug==='beacon-silence'){            // 依平面圖重建（不含展牆）：發射端在膝蓋高度，光束往對面斜下方打到低處的太陽能接收板；七組交錯、部分在滑軌上
    const L=6.6,Wd=2.2,YE=0.5,YR=0.14;add(box(L,0.05,Wd,0.02),0,0.025,0);
    const post=(x,z,h)=>{add(new THREE.CylinderGeometry(0.018,0.018,h-0.05,10),x,0.05+(h-0.05)/2,z,DARK());add(new THREE.CylinderGeometry(0.08,0.08,0.02,20),x,0.06,z,DARK())};
    for(let k=0;k<7;k++){const x=-2.1+k*0.7,s=k%2?1:-1,z=s*(Wd/2-0.12);
      post(x,z,YE);const e=add(box(0.16,0.11,0.18,0.03),x,YE,z,DARK());e.name='Motor'+k;e.rotation.x=s*0.12;   // 雷射發射端，略朝下
      post(x,-z,YR);const r=add(box(0.26,0.2,0.025,0.01),x,YR+0.04,-z,DARK());r.name='Recv'+k;r.rotation.x=s*0.6;  // 對面低處的太陽能接收板，斜面朝向光
      if(k%2===0)add(box(0.7,0.03,0.05,0.01),x,0.06,z,DARK())}                                              // 地上的滑軌
    person(-2.95,0.05,0,2.1)}                                                                                 // 約 166 公分的人，裝置只到膝蓋
  else if(slug==='soundscape-city'){      // 格狀底板上，三個錄音點（風、燈塔、海）各帶聲波，大樓依離錄音點的遠近升起
    add(box(2.4,0.08,2.4,0.03),0,0.04,0);
    const grid=new THREE.GridHelper(2.3,12,0x6f6f6f,0x8a8a8a);grid.position.y=0.082;grid.material.transparent=true;grid.material.opacity=0.45;g.add(grid);
    const src=[[-0.62,-0.5,1.0],[0.66,-0.42,0.75],[0.05,0.68,0.9]];
    src.forEach(([x,z])=>{add(new THREE.CylinderGeometry(0.05,0.07,0.16,20),x,0.16,z,DARK());
      [0.16,0.26,0.36].forEach(r=>{const t=add(new THREE.TorusGeometry(r,0.008,8,64),x,0.09,z,DARK());t.rotation.x=Math.PI/2})});
    const hash=(i,j)=>{const v=Math.sin(i*127.1+j*311.7)*43758.5453;return v-Math.floor(v)};
    for(let i=0;i<11;i++)for(let j=0;j<11;j++){const x=-1.0+i*0.2,z=-1.0+j*0.2;let h=0,near=false;
      src.forEach(([sx,sz,a])=>{const d2=(x-sx)**2+(z-sz)**2;h+=a*Math.exp(-d2/0.22);if(d2<0.045)near=true});
      h*=0.55+0.45*hash(i,j);if(near||h<0.1)continue;
      add(new RoundedBoxGeometry(0.15,h,0.15,2,0.012),x,0.08+h/2,z)}}
  else if(slug==='solitude-internet'){    // 架子上的小盒子，正面一個圓孔；兩側各一面螢幕對看
    add(new THREE.CylinderGeometry(0.28,0.32,0.06,32),0,0.03,0);add(new THREE.CylinderGeometry(0.04,0.04,0.7,16),0,0.4,0);
    add(box(0.6,0.6,0.6,0.12),0,1.0,0);add(new THREE.CylinderGeometry(0.1,0.1,0.02,32),0,1.0,0.305,DARK()).rotation.x=Math.PI/2;
    [-1.05,1.05].forEach(x=>{const sc=add(box(0.08,1.1,0.9,0.04),x,0.75,0);add(new THREE.CylinderGeometry(0.03,0.03,0.2,12),x,0.1,0)})}
  else if(slug==='bio-sculpture'){        // 圓滾滾的身體、雙手舉高、兩隻扁扁的腳（原作舉手的姿勢）
    add(ball(0.5),0,0.62,0).scale.set(1,1.08,0.82);add(ball(0.09),0,0.78,0.42);
    [-1,1].forEach(sx=>{const arm=add(cap(0.1,0.42),sx*0.38,1.08,0.02);arm.rotation.z=-sx*0.35;add(ball(0.12),sx*0.48,1.38,0.02);
      const ft=add(ball(0.17),sx*0.28,0.08,0.3);ft.scale.set(1.25,0.45,1.4);
      add(ball(0.055),sx*0.17,0.82,0.39,DARK())})}
  else if(slug==='compound-eye'){         // 一圈柱子圍著一顆大眼睛
    add(new THREE.CylinderGeometry(1.15,1.15,0.08,64),0,0.04,0);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2+0.31;add(cap(0.07,0.55),Math.cos(a)*0.98,0.36,Math.sin(a)*0.98)}
    add(new THREE.CylinderGeometry(0.12,0.16,0.5,24),0,0.29,0);add(ball(0.5),0,1.0,0);
    add(ball(0.22),0,1.03,0.42,DARK()).scale.set(1,1,0.45);add(ball(0.07),0.07,1.1,0.52).scale.set(1,1,0.5)}  // 瞳孔要凸出球面才看得到
  else if(slug==='paper-shell-echo'){     // 床墊上躺一個小人，頭罩在圓殼裡
    add(box(1.0,0.22,2.0,0.08),0,0.11,0);
    const body=add(cap(0.16,0.7),0,0.38,0.28);body.rotation.x=Math.PI/2;add(ball(0.15),0,0.38,-0.38);
    const sh=add(new THREE.SphereGeometry(0.42,48,24,0,Math.PI*2,0,Math.PI/2),0,0.22,-0.5);sh.material.side=THREE.DoubleSide;sh.scale.set(1,0.9,1.1)}
  else if(slug==='fu-pi'){                // 兩面螢幕前一個舉手的舞者
    [-0.72,0.72].forEach(x=>{add(box(1.36,0.78,0.08,0.04),x,0.95,-0.5);add(new THREE.CylinderGeometry(0.03,0.03,0.56,12),x,0.28,-0.5)});
    person(0,0,0.35,1.1);const arm=add(cap(0.05,0.32),0.2,0.95,0.35);arm.rotation.z=-0.6}
  else if(slug==='soundscape-city'){      // 高高低低的圓角大樓
    [[-0.5,-0.4,0.9],[0,-0.4,1.5],[0.5,-0.4,0.6],[-0.5,0.2,0.5],[0,0.2,1.1],[0.5,0.2,1.3],[-0.25,0.75,0.7],[0.3,0.75,0.4]].forEach(([x,z,h])=>add(box(0.42,h,0.42,0.1),x,h/2,z))}
  else if(slug==='the-far-end'){          // 黑盒子劇場：後方一排斜放的鏡面，前面兩位舞者
    add(box(2.4,0.05,2.0,0.02),0,0.025,0);
    [-0.9,-0.3,0.3,0.9].forEach(x=>{const m=add(box(0.5,1.5,0.04,0.02),x,0.8,-0.55+Math.abs(x)*0.25,DARK());m.rotation.y=-x*0.45});
    person(-0.35,0.05,0.35,1);person(0.4,0.05,0.15,1);const arm=add(cap(0.05,0.32),0.6,0.95,0.15);arm.rotation.z=-0.7}
  else if(slug==='studies'){              // 穹頂：開一個口的半球殼，裡面一個人
    add(new THREE.CylinderGeometry(1.15,1.15,0.08,64),0,0.04,0);
    const d=add(new THREE.SphereGeometry(1.05,64,24,Math.PI*0.25,Math.PI*1.5,0,Math.PI/2),0,0.08,0);d.material.side=THREE.DoubleSide;
    add(new THREE.TorusGeometry(1.05,0.03,8,64),0,0.08,0,DARK()).rotation.x=Math.PI/2;person(0,0.08,0.2,0.9)}
  else if(slug==='production'){           // 協作專案：日光域的圓形影像＋回聲室的指向性喇叭
    add(new THREE.CylinderGeometry(0.03,0.03,0.42,12),-0.4,0.21,-0.2);const dc=add(new THREE.CylinderGeometry(0.72,0.72,0.06,64),-0.4,1.12,-0.2);dc.rotation.x=Math.PI/2;
    add(new THREE.CylinderGeometry(0.035,0.035,1.0,12),0.8,0.5,0.35);const sp=add(box(0.4,0.4,0.14,0.05),0.8,1.15,0.35,DARK());sp.rotation.y=-0.6;
    add(new THREE.CylinderGeometry(0.11,0.11,0.02,24),0.75,1.15,0.42,SOLID()).rotation.set(Math.PI/2,0,-0.6)}
  else if(slug==='sketches'){             // 小品：一台螢幕，前面幾個練習用的基本形體
    add(box(1.3,0.8,0.06,0.03),0,1.05,-0.4,DARK());add(new THREE.CylinderGeometry(0.04,0.04,0.6,12),0,0.35,-0.42);add(box(0.5,0.04,0.3,0.02),0,0.02,-0.42);
    add(box(0.36,0.36,0.36,0.04),-0.5,0.18,0.35);add(ball(0.2),0.05,0.2,0.45);add(new THREE.ConeGeometry(0.2,0.45,32),0.55,0.225,0.3)}
  else if(slug==='naked-house'){          // 模型屋：斜屋頂，正面四個房間的窗
    add(box(1.5,1.1,1.1,0.03),0,0.55,0);
    const sh=new THREE.Shape();sh.moveTo(-0.85,0);sh.lineTo(0.85,0);sh.lineTo(0,0.62);sh.lineTo(-0.85,0);
    add(new THREE.ExtrudeGeometry(sh,{depth:1.2,bevelEnabled:false}),0,1.1,-0.6);
    [[-0.38,0.8],[0.38,0.8],[-0.38,0.32],[0.38,0.32]].forEach(([x,y])=>add(box(0.46,0.3,0.03,0.01),x,y,0.56,DARK()));
    add(new THREE.CylinderGeometry(0.1,0.1,0.03,32),0,1.38,0.62,DARK()).rotation.x=Math.PI/2}
  else if(slug==='quantum-phone-booth'){  // 電話亭：四根柱子、屋頂、背板上的電話
    add(box(1.0,0.06,1.0,0.02),0,0.03,0);add(box(1.08,0.1,1.08,0.03),0,2.4,0);add(box(0.96,2.3,0.04,0.01),0,1.21,-0.46);
    [[-0.47,-0.47],[0.47,-0.47],[-0.47,0.47],[0.47,0.47]].forEach(([x,z])=>add(new THREE.CylinderGeometry(0.03,0.03,2.3,12),x,1.21,z));
    add(box(0.24,0.34,0.1,0.03),0,1.35,-0.39,DARK());add(cap(0.04,0.18),0.16,1.4,-0.33,DARK())}
  else if(slug==='who-god-you'){          // 街上二十個小人，只有一個擺出不同姿勢
    add(box(2.6,0.05,1.3,0.02),0,0.025,0);
    for(let k=0;k<20;k++){const v=Math.sin(k*91.7)*43758.5,j=v-Math.floor(v),x=-1.05+(k%5)*0.52+(j-0.5)*0.15,z=-0.45+Math.floor(k/5)*0.3;person(x,0.05,z,0.42);
      if(k===12)[-1,1].forEach(sx=>{const a=add(cap(0.025,0.14),x+sx*0.1,0.4,z);a.rotation.z=-sx*0.55})}}
  else add(ball(0.8),0,0.8,0);
  return g;
}
function normalize(obj,size,maxH=2.3){const b=new THREE.Box3().setFromObject(obj),s=new THREE.Vector3();b.getSize(s);obj.scale.multiplyScalar(Math.min(size/Math.max(s.x,s.z),maxH/s.y));
  const b2=new THREE.Box3().setFromObject(obj),c=new THREE.Vector3();b2.getCenter(c);obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b2.min.y}

const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
const loader=new GLTFLoader().setDRACOLoader(draco),items=[],GAP=3.9,span=W.length-1,PLINTH=0.14;
// 每個平面在「轉成地板時」的座標裡排版：後排 ceil(n/2) 件、前排其餘交錯；LS＝平面邊長
const LS=14,world=new THREE.Group();scene.add(world);
const QR=[0,1,2].map(k=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,1).normalize(),k*2*Math.PI/3)),QI=QR.map(q=>q.clone().invert());
const LP=[];
if(Z)[0,1,2].forEach(p=>{const ids=W.map((w,i)=>i).filter(i=>W[i].zone===p),n=ids.length;
  const cols=3,rows=Math.ceil(n/cols),sp=GAP*1.08*Math.max(ZS[p],0.72);   // 整齊的格狀：每排 3 件、等距，最後一排置中；整組放在平面正中央
  ids.forEach((i,k)=>{const r=Math.floor(k/cols),c=k%cols,inRow=Math.min(cols,n-r*cols);LP[i]=new THREE.Vector3(LS/2+(c-(inRow-1)/2)*sp,0,LS/2+(r-(rows-1)/2)*sp*1.45)})});   // 前後排拉開，前排的名字不會壓到後排
function slot(w,i){if(!Z)return new THREE.Vector3((i-span/2)*GAP,0,0);return LP[i].clone().applyQuaternion(QI[w.zone])}
W.forEach((w,i)=>{
  const holder=new THREE.Group();holder.position.copy(slot(w,i));if(Z){holder.scale.setScalar(ZS[w.zone]);holder.quaternion.copy(QI[w.zone]);world.add(holder)}else scene.add(holder);
  const wide=w.slug==='beacon-silence',pw=wide?3.6:3.0;   // 展台：每件作品一樣的低台座
  const plinth=new THREE.Mesh(new RoundedBoxGeometry(pw,PLINTH,wide?1.5:3.0,4,0.05),new THREE.MeshStandardMaterial({color:CLAY?0xd9d0c3:FADE?0x0c0c0c:0x3a3a3a,roughness:0.9}));
  if(CLAY)plinth.material=new THREE.MeshMatcapMaterial({matcap:MATCAP,color:0xe9e2d8});
  plinth.position.y=PLINTH/2;plinth.receiveShadow=true;holder.add(plinth);
  const it={w,holder,root:null,meshes:[],orig:new Map(),edges:null,label:null,beams:[],plinth,base:holder.scale.x,p0:holder.position.clone(),up:new THREE.Vector3(0,1,0).applyQuaternion(holder.quaternion),hv:0,c0:plinth.material.color.clone(),c1:plinth.material.color.clone().offsetHSL(0,0,CLAY?-0.08:0.13)};items.push(it);
  const done=root=>{if(w.model)root.traverse(o=>{if(o.isMesh&&!o.material.map)o.material=SOLID()});if(w.rot)root.rotation.y=THREE.MathUtils.degToRad(w.rot);normalize(root,wide?3.3:2.5,w.slug==='compound-eye'?1.9:2.3);root.position.y+=PLINTH;holder.add(root);holder.updateMatrixWorld(true);it.root=root;  // 先更新位置，外框與鏡頭才算得對
    
    root.traverse(o=>{if(o.isMesh){it.meshes.push(o);o.userData.item=it;it.orig.set(o,o.geometry.attributes.position.array.slice())}});
    if(w.slug==='beacon-silence'){it.meshes.forEach(m=>{if(/Wall/i.test(m.name)){m.material.side=THREE.BackSide;m.material.color.set(0x8e8e8e)}});makeBeams(it)}
    if(w.slug==='paper-shell-echo'){const top=PLINTH,v=new THREE.Vector3(),grounds=[/standin_Cylinder00[1-4]|standin_Cube002|standin_Apple_iMac/,/^Cylinder(005)?$|^Cube003$|Tire|standin_Object_(4001|5|6|7)$/];
      grounds.forEach(re=>{const ms=it.meshes.filter(m=>re.test(m.name));if(!ms.length)return;const b=new THREE.Box3();ms.forEach(m=>b.expandByObject(m));const dy=b.min.y-top;if(dy<=0.005)return;
        const set=new Set(ms);ms.filter(m=>{let q=m.parent;while(q){if(set.has(q))return false;q=q.parent}return true}).forEach(m=>{m.getWorldPosition(v);v.y-=dy;m.position.copy(m.parent.worldToLocal(v))})});
      root.updateMatrixWorld(true)}  // 桌子、電視架落地（家具為幾何示意，原檔高低不一）
    if(w.slug==='paper-shell-echo')it.meshes.forEach(m=>{if(m.name==='Plane'){m.material.side=THREE.DoubleSide;m.material.opacity=0.16;m.material.depthWrite=false;m.userData.ghost=true}});  // 房間牆面半透明，看得到裡面的紙殼
    if(CLAY)it.meshes.forEach(m=>{m.castShadow=true});
    if(FADE)it.meshes.forEach(m=>{const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,40),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.07}));m.add(e)});  // 沒被照到時只剩淡淡輪廓
    stats();if(pending===w.slug){
      if(window.PF_BACK===w.slug&&!backDone){select(it,false);frameOn(it,0.45);camera.position.copy(anim.p1);controls.target.copy(anim.t1);anim=null;controls.update();camera.updateMatrixWorld();
        revealBack(it)}
      else select(it,true)}};
  const wrap=g=>{if(w.slug!=='compound-eye')return g.scene;                       // 科技複眼：一根柱子，柱頂放作者捏的人臉
    const grp=new THREE.Group(),face=g.scene;if(w.rot)face.rotation.y=THREE.MathUtils.degToRad(w.rot);w.rot=0;
    const H=2.1,R=0.3;                                                              // 臉嵌在柱身中間偏上，前半部從柱面凸出
    const b=new THREE.Box3().setFromObject(face),sz=new THREE.Vector3();b.getSize(sz);face.scale.multiplyScalar(0.56/sz.y);
    const b2=new THREE.Box3().setFromObject(face),c=new THREE.Vector3(),d=new THREE.Vector3();b2.getCenter(c);b2.getSize(d);
    face.position.add(new THREE.Vector3(-c.x,H*0.62-c.y,(R+d.z*0.32)-b2.max.z));
    const col=new THREE.Mesh(new THREE.CylinderGeometry(R*0.92,R,H,48),SOLID());col.position.y=H/2;grp.add(col);grp.add(face);return grp};
  if(w.model)loader.load(w.model,g=>done(wrap(g)),undefined,()=>done(toyModel(w.slug)));else queueMicrotask(()=>done(toyModel(w.slug)));  // 等整份程式（介面元素）準備好再建
});
// Beacon Silence：依模型裡發射端（Motor）的位置畫出橫越走道的光束
function makeBeams(it){const ms=[];it.root.traverse(o=>{if(o.isMesh&&/Motor/i.test(o.name))ms.push(o)});
  const box=new THREE.Box3().setFromObject(it.root),size=new THREE.Vector3();box.getSize(size);const ac=size.x<size.z?'x':'z';
  const rv={};it.root.traverse(o=>{if(o.isMesh&&/^Recv/.test(o.name))rv[o.name.slice(4)]=o});
  ms.slice(0,D.channels).forEach((m,k)=>{const p=new THREE.Vector3();m.getWorldPosition(p);let q=p.clone();q[ac]=Math.abs(p[ac]-box.min[ac])<Math.abs(p[ac]-box.max[ac])?box.max[ac]:box.min[ac];
    const r=rv[m.name.replace('Motor','')];if(r){q=new THREE.Vector3();r.getWorldPosition(q)}
    const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([it.holder.worldToLocal(p.clone()),it.holder.worldToLocal(q.clone())]),new THREE.LineBasicMaterial({color:CLAY?0x6b5a4b:0xffffff,transparent:true,opacity:0.9}));
    ln.userData.beam=k;it.holder.add(ln);it.beams.push(ln)})}

// ---------------- 介面
const $=id=>document.getElementById(id),tree=$('tree'),labels=$('labels'),track=$('track'),pbody=$('pbody'),phead=$('phead');
tree.querySelectorAll('[data-i]').forEach(el=>{el.onclick=()=>select(items[+el.dataset.i],true);
  el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}});   // 鍵盤也能選作品
items.forEach(it=>{const s=document.createElement('span');s.textContent=it.w.name;if(Z)s.dataset.z=it.w.zone;labels.appendChild(s);it.label=s});
const Y0=D.y0,Y1=D.y1,pct=y=>(y-Y0)/(Y1-Y0)*100;
for(let y=Y0;y<=Y1;y++){const t=document.createElement('span');t.className='tick';t.style.left=pct(y)+'%';t.textContent=y;track.appendChild(t)}
const keys=W.map((w,i)=>{const k=document.createElement('i');k.className='key';k.tabIndex=0;k.setAttribute('role','button');k.setAttribute('aria-label',w.name+'，'+w.year);
  k.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();k.click()}});const n=W.filter((x,j)=>x.year===w.year&&j<i).length;
  k.style.left=`calc(${pct(w.year)}% + ${n*14}px)`;k.title=w.name;k.onclick=()=>select(items[i],true);track.appendChild(k);return k});

const rows=r=>r.filter(x=>x[1]).map(([k,v])=>`<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
function props(){
  if(!selected){pbody.innerHTML=`<div class="ptitle">${D.name}<small>${D.nameEn}</small></div>
    <div class="sec"><h4>${U.about}</h4><div class="in"><p class="para">${D.claim}<span class="en">${D.claimEn}</span></p><a class="btn" href="${PB}about.html">${U.openCv}</a></div></div>
    <div class="sec"><h4>${U.howtoH}</h4><div class="in hint-list mono">${U.howto}</div></div>`;return}
  const w=selected.w,i=items.indexOf(selected),pv=items[(i-1+items.length)%items.length].w,nx=items[(i+1)%items.length].w;
  pbody.innerHTML=`<div class="ptitle">${w.name}<small>${w.sub} · ${w.year}</small></div>
  <div class="sec"><div class="in"><p class="para">${w.tag}</p><a class="btn primary" href="${PB}${w.slug}.html">${U.openWork}</a><p class="mono note">${U.orTab}</p>
    <div class="pn2 mono"><button data-go="-1">← ${pv.name}</button><button data-go="1">${nx.name} →</button></div></div></div>
  ${w.slug==='beacon-silence'?`<div class="sec"><h4>${U.sound}</h4><div class="in"><button class="btn${playing?' on':''}" id="listen">${playing?U.stop:U.play}</button><p class="mono note">${U.playNote}</p></div></div>`:''}
  <div class="sec"><h4>${U.basics}</h4><div class="in">${rows([[U.kind,w.kind],[U.medium,w.medium],[U.shown,w.shown],[U.role,w.role],[U.model,w.model?(w.modelNote||U.modelOrig):U.modelToy]])}</div></div>
  <div class="sec"><h4>${U.photos}</h4><div class="in"><img src="${w.img}" alt="" loading="lazy"></div></div>`;
  pbody.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>select(items[(i+(+b.dataset.go)+items.length)%items.length],true));
  const b=$('listen');if(b)b.onclick=toggleSound;
}

// ---------------- 選取、鏡頭、進入作品
// 選取外框：面數少的模型描稜線；面數多的（例如科技複眼的洞穴場景）改用外框盒，免得整件變白
function outline(it,on){if(on&&!it.edges){const faces=it.meshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0);
    if(faces>20000){const b=new THREE.Box3Helper(new THREE.Box3().setFromObject(it.root),CLAY?0x3a332c:0xffffff);scene.add(b);it.edges=[b]}
    else it.edges=it.meshes.map(m=>{const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,35),new THREE.LineBasicMaterial({color:CLAY?0x3a332c:0xffffff}));m.add(e);return e})}
  it.edges?.forEach(e=>e.visible=on)}
function select(it,fly){
  if(selected&&selected!==it)outline(selected,false);selected=it;
  items.forEach(x=>x.label.classList.toggle('on',x===it));
  tree.querySelectorAll('[data-i]').forEach(el=>el.classList.toggle('on',items[+el.dataset.i]===it));
  keys.forEach((k,i)=>k.classList.toggle('on',items[i]===it));
  $('vsel').textContent=it?it.w.name:U.none;
  const turn=it&&Z&&it.w.zone!==cz;if(turn)setZone(it.w.zone,true,fly?()=>frameOn(it,1):null);
  if(it){outline(it,true);phead.style.left=pct(it.w.year)+'%';phead.dataset.y=it.w.year;if(fly&&!turn)frameOn(it,1);history.replaceState(null,'',location.pathname+'#sel='+it.w.slug);prefetch(it.w.slug)}
  else history.replaceState(null,'',location.pathname);
  props();stats();
}
let anim=null;
function frameOn(it,zoom,then){const b=new THREE.Box3().setFromObject(it.holder),c=new THREE.Vector3(),s=new THREE.Vector3();b.getCenter(c);b.getSize(s);
  const r=Math.max(s.x,s.y,s.z)*1.7*zoom+1.4;anim={t:0,dur:then?0.55:0.9,p0:camera.position.clone(),t0:controls.target.clone(),p1:c.clone().add(new THREE.Vector3(0.12,0.42,1).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),Z?0:it.holder.rotation.y).multiplyScalar(r)),t1:c.clone(),then}}
// 平面視角：作品都在地板上，鏡頭從正前方略偏右、仰角 24° 看；全部：從房間角落的對角方向看三個平面
function zoneBox(z){const b=new THREE.Box3();
  if(z<0){b.min.set(-0.5,0,-0.5);b.max.set(LS+0.5,LS+0.5,LS+0.5);return b}
  W.forEach((w,i)=>{if(w.zone!==z)return;const k=ZS[w.zone],p=LP[i];b.expandByPoint(new THREE.Vector3(p.x-1.6*k,0,p.z-1.6*k));b.expandByPoint(new THREE.Vector3(p.x+1.6*k,2.4*k,p.z+1.6*k))});return b}
function zoneDir(z){return z<0?new THREE.Vector3(1,1.05,1).normalize():new THREE.Vector3(0,Math.sin(THREE.MathUtils.degToRad(36)),Math.cos(THREE.MathUtils.degToRad(36)))}   // 分類視角：正面置中、仰角 36°
function homeTarget(z=cz){if(!Z)return new THREE.Vector3(0,0.8,0);const c=zoneBox(z).getCenter(new THREE.Vector3());if(z>=0)c.y=0.8;else c.multiplyScalar(0.9);return c}
const _fc=new THREE.PerspectiveCamera();
function homePos(z=cz){
  if(!Z){const half=span*GAP/2+2.6,hf=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect),el=THREE.MathUtils.degToRad(17),d=half/Math.tan(hf)*1.08;
    return homeTarget(z).add(new THREE.Vector3(0,Math.sin(el)*d,Math.cos(el)*d))}
  // 沿鏡頭方向往後退，找剛好把整區框進畫面的距離（二分搜尋）
  const t=homeTarget(z),dir=zoneDir(z),b=zoneBox(z),P=[];for(let k=0;k<8;k++)P.push(new THREE.Vector3(k&1?b.max.x:b.min.x,k&2?b.max.y:b.min.y,k&4?b.max.z:b.min.z));
  _fc.copy(camera);let lo=1,hi=300;
  for(let n=0;n<28;n++){const m=(lo+hi)/2;_fc.position.copy(t).addScaledVector(dir,m);_fc.lookAt(t);_fc.updateMatrixWorld();
    const ok=P.every(p=>{const v=p.clone().project(_fc);return v.z<1&&Math.abs(v.x)<0.86&&Math.abs(v.y)<0.8});if(ok)hi=m;else lo=m}
  return t.clone().addScaledVector(dir,hi)}
function frameAll(){anim={t:0,dur:0.9,p0:camera.position.clone(),t0:controls.target.clone(),p1:homePos(),t1:homeTarget()}}
// 切換平面：分頁亮起；整個角落轉到該平面朝上（spin），鏡頭同時拉遠再推近（arc）
let spin=null;
function setZone(z,fly,then){if(!Z)return;cz=z;document.querySelectorAll('.ztabs button').forEach((b,k)=>b.classList.toggle('on',k===z+1));view.classList.toggle('zall',z<0);view.dataset.cz=z;AXT.forEach(t=>t.visible=z<0);
  if(z>=0&&world.quaternion.angleTo(QR[z])>1e-3)spin={t:0,dur:1.5,q0:world.quaternion.clone(),q1:QR[z]};
  if(fly){anim={t:0,dur:spin?1.5:1.1,p0:camera.position.clone(),t0:controls.target.clone(),p1:homePos(z),t1:homeTarget(z),arc:spin?0.45:0,then}}resize()}
// 進入 Edit Mode：鏡頭推近，畫面切到作品頁
// 進入作品（Edit Mode）的轉場：模型切成線框 → 鏡頭推近 → 從模型位置展開圓形，露出作品照片與名稱 → 換頁（作品頁會接著把照片收進版面）
let entering=false;
function screenOf(it){const b=new THREE.Box3().setFromObject(it.holder),c=b.getCenter(new THREE.Vector3()).project(camera),r=view.getBoundingClientRect();
  return [r.left+(c.x+1)/2*r.width,r.top+(1-c.y)/2*r.height]}
// 每件作品的轉場動態不同（trans.js）：Beacon 光帶、紙殼迴聲聲波、Solitude 窺孔、音景城市方塊、科技複眼小眼、Membrane 光暈
const COV=window.PF_COVERS||{};
function runEnter(slug,x,y){
  const c=COV[slug];let gone=false;const go=()=>{if(gone)return;gone=true;location.href=PB+slug+'.html'};
  try{sessionStorage.setItem('pf-enter',JSON.stringify({slug,t:Date.now()}))}catch(e){}
  if(!window.PFX||!c||PFX.reduce){go();return}
  PFX.ready(c[0],400).then(()=>{const ov=PFX.build({slug,src:c[0],pos:c[1],title:c[2],x,y});PFX.play(ov,'cover').then(()=>setTimeout(go,40))});
  setTimeout(go,2600)}                                                         // 分頁在背景時動畫不會跑，保底換頁
function enter(it){if(!it||entering)return;entering=true;$('modeLabel').innerHTML=U.editMode;
  it.meshes.forEach(m=>{m.material.wireframe=true});                          // 像按下 Tab：先看到線框
  const [x,y]=screenOf(it);frameOn(it,0.45);runEnter(it.w.slug,x,y)}
// 從作品頁回來：封面停在畫面上，倒放同一段動態，收回這件作品的模型
let backDone=false;
function revealBack(it){if(backDone)return;backDone=true;
  const hold=$('backHold'),slug=window.PF_BACK,c=COV[slug],done=()=>{hold&&hold.remove();document.documentElement.classList.remove('back-hold')};
  if(!window.PFX||!c){done();return}
  const [x,y]=it?screenOf(it):[innerWidth/2,innerHeight/2];
  const ov=PFX.build({slug,src:c[0],pos:c[1],title:c[2],x,y,label:'Object Mode'});PFX.play(ov,'full');done();
  requestAnimationFrame(()=>{if(it)frameOn(it,1);PFX.play(ov,'reveal').then(()=>ov.remove())});setTimeout(()=>ov.remove(),2600)}
if(window.PF_BACK){const in3d=W.some(w=>w.slug===window.PF_BACK&&pending===w.slug);
  setTimeout(()=>revealBack(null),in3d?3500:60)}                               // 模型太慢或不是 3D 作品：直接在畫面中央倒放
// 首頁上所有通往作品頁的連結（右欄按鈕、Outliner）都走同一套轉場
document.addEventListener('click',e=>{const a=e.target.closest('a[href$=".html"]');if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const slug=a.getAttribute('href').replace(/^.*\//,'').replace(/\.html$/,''),it=items.find(x=>x.w.slug===slug);
  if(it){e.preventDefault();if(selected!==it)select(it,false);enter(it)}else if(COV[slug]&&!entering){e.preventDefault();entering=true;runEnter(slug,e.clientX,e.clientY)}});
// 選取時先預載作品頁與封面，換頁更快
const pre=new Set();function prefetch(slug){if(pre.has(slug)||!COV[slug])return;pre.add(slug);
  const l=document.createElement('link');l.rel='prefetch';l.href=PB+slug+'.html';document.head.appendChild(l);if(window.PFX)PFX.ready(COV[slug][0],1)}

// ---------------- 工具與輸入
const brush=$('brush');
const BASE_HINT=U.hint,SCULPT_HINT=U.hintSculpt;
function setTool(t){tool=t;$('hint').textContent=t==='sculpt'?SCULPT_HINT:BASE_HINT;if(t==='sculpt'&&selected)frameOn(selected,0.7);document.querySelectorAll('#tools button').forEach(x=>x.classList.toggle('on',x.dataset.tool===t));
  canvas.style.cursor=t==='sculpt'?'none':'default';if(t!=='sculpt')brush.style.display='none'}
$('tools').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tool==='frame'){selected?frameOn(selected,1):frameAll();return}setTool(b.dataset.tool)};
const ray=new THREE.Raycaster();ray.params.Line.threshold=0.06;const ndc=new THREE.Vector2();
const pick=e=>{const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera)};
const meshes=()=>items.filter(i=>i.holder.visible).flatMap(i=>i.meshes);   // 隱藏中的類別點不到
let down=null,sculpting=false,mouse=null,tapAgain=false,idle=0;
view.addEventListener('pointerdown',e=>{if(e.target!==canvas)return;down={x:e.clientX,y:e.clientY};
  if(tool==='sculpt'){pick(e);const h=ray.intersectObjects(meshes(),false)[0];
    if(h){const it=h.object.userData.item;controls.enabled=false;
      if(it!==selected){select(it,false);frameOn(it,0.7);down=null;sculptHint(U.aimed)}   // 先對準，再捏
      else{sculpting=true;sculpt(h)}}}},true);
window.addEventListener('pointerup',()=>{if(tool==='sculpt')controls.enabled=true},true);
window.addEventListener('pointerup',e=>{if(sculpting){sculpting=false;controls.enabled=true;lastSculpt=performance.now();return}
  if(tool==='sculpt'){down=null;return}
  if(!down||e.target!==canvas)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;down=null;if(moved)return;
  pick(e);const h=ray.intersectObjects(meshes(),false)[0];if(h){const it=h.object.userData.item;if(it===selected&&e.pointerType!=='touch'||it===selected&&tapAgain)enter(it);else{select(it,false);tapAgain=true}}else{if(selected)outline(selected,false);select(null);frameAll()}});
canvas.addEventListener('dblclick',e=>{pick(e);const h=ray.intersectObjects(meshes(),false)[0];if(h){select(h.object.userData.item,false);enter(h.object.userData.item)}});
['pointerdown','wheel','keydown'].forEach(t=>window.addEventListener(t,()=>{idle=0},{passive:true}));
canvas.addEventListener('pointermove',e=>{mouse=e;if(tool==='sculpt'){brush.style.display='block';brush.style.left=e.clientX+'px';brush.style.top=e.clientY+'px';
    if(!sculpting){pick(e);brush.classList.toggle('on',!!ray.intersectObjects(meshes(),false)[0])}}
  if(sculpting){pick(e);const h=ray.intersectObjects(meshes(),false)[0];if(h)sculpt(h)}});
canvas.addEventListener('pointerleave',()=>{brush.style.display='none';mouse=null});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));   // 點過 3D 畫面後，Tab 才代表「開啟作品頁」
window.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,textarea'))return;
  // Tab＝切換到 Edit Mode，只在 3D 畫面有焦點時才攔截；其他時候 Tab 照一般網頁移動焦點（鍵盤使用者才走得到連結與按鈕）
  if((e.key==='Tab'&&!e.shiftKey||e.key==='Enter')&&document.activeElement===canvas){e.preventDefault();if(selected)enter(selected);else{select(items[items.length-1],true)}}
  if(e.key==='s'||e.key==='S')setTool('sculpt');if(e.key==='q'||e.key==='Q')setTool('select');
  if(e.key==='.')selected?frameOn(selected,1):frameAll();if(e.key==='Escape'&&selected){outline(selected,false);select(null);frameAll()}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const i=selected?items.indexOf(selected):-1,n=(i+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;select(items[n],true)}});

// 雕刻：筆刷範圍內的頂點沿法線推出，放開 1.5 秒後慢慢回彈（作品不會被改壞）
const touched=new Set(),origN=new Map();let lastSculpt=0;
function sculpt(h){const m=h.object,g=m.geometry,pos=g.attributes.position,nor=g.attributes.normal;if(!nor)return;
  if(!origN.has(m))origN.set(m,nor.array.slice());
  const p=m.worldToLocal(h.point.clone()),ws=new THREE.Vector3();m.getWorldScale(ws);const k=1/ws.x,R=0.45*k,R2=R*R,amp=0.16*k,cap=0.6*k,o=m.userData.item.orig.get(m);
  for(let i=0;i<pos.count;i++){const dx=pos.getX(i)-p.x,dy=pos.getY(i)-p.y,dz=pos.getZ(i)-p.z,d2=dx*dx+dy*dy+dz*dz;
    if(d2<R2){const f=(1-d2/R2)**2*amp,j=i*3;let x=pos.getX(i)+nor.getX(i)*f,y=pos.getY(i)+nor.getY(i)*f,z=pos.getZ(i)+nor.getZ(i)*f;
      const ox=x-o[j],oy=y-o[j+1],oz=z-o[j+2],L=Math.hypot(ox,oy,oz);if(L>cap){x=o[j]+ox/L*cap;y=o[j+1]+oy/L*cap;z=o[j+2]+oz/L*cap}pos.setXYZ(i,x,y,z)}}
  pos.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();touched.add(m);lastSculpt=performance.now()}
function relax(){if(sculpting||performance.now()-lastSculpt<1500)return;
  touched.forEach(m=>{const g=m.geometry,pos=g.attributes.position,o=m.userData.item.orig.get(m);let still=false;
    for(let i=0;i<pos.array.length;i++){const d=o[i]-pos.array[i];if(Math.abs(d)>1e-5){pos.array[i]+=d*0.05;still=true}else pos.array[i]=o[i]}
    pos.needsUpdate=true;if(still)g.computeVertexNormals();else{g.attributes.normal.array.set(origN.get(m));g.attributes.normal.needsUpdate=true;touched.delete(m)}})}
let hintTimer=null;
function sculptHint(t){const h=$('hint');h.textContent=t;clearTimeout(hintTimer);hintTimer=setTimeout(()=>{h.textContent=tool==='sculpt'?SCULPT_HINT:BASE_HINT},4000)}

// ---------------- Beacon Silence 的聲部
function toggleSound(){const N=D.channels;
  if(!actx){const AC=window.AudioContext||window.webkitAudioContext;actx=new AC();
    for(let i=0;i<N;i++){const a=new Audio('audio/ch'+(i+1)+'.mp3');a.loop=true;const g=actx.createGain();g.gain.value=0;actx.createMediaElementSource(a).connect(g);g.connect(actx.destination);els.push(a);gains.push(g)}
    setInterval(()=>{if(!playing)return;const t=els[0].currentTime;els.forEach((a,i)=>{if(i&&Math.abs(a.currentTime-t)>0.08)a.currentTime=t})},2000)}
  playing=!playing;if(playing){actx.resume();const t=els[0].currentTime;els.forEach(a=>{a.currentTime=t;a.play().catch(()=>{})})}else setTimeout(()=>{if(!playing)els.forEach(a=>a.pause())},500);
  levels();props()}
function levels(){if(!actx)return;gains.forEach((g,i)=>g.gain.setTargetAtTime(playing&&!blocked.has(i)?0.9/Math.sqrt(gains.length):0,actx.currentTime,0.1))}

// ---------------- 方位小工具、統計、主迴圈
const gz=$('gizmo'),gc=gz.getContext('2d');
// 方位小工具（像 Blender）：正軸實心圓＋字母、負軸空心圓；平面版可點：Z→XY 作品、X→YZ 研究與合作、Y→XZ 早期作品，點目前這一軸回到全部
const GAX=[['X',new THREE.Vector3(1,0,0),'#b05a5a',1],['Y',new THREE.Vector3(0,0,Z?1:-1),'#6e9150',2],['Z',new THREE.Vector3(0,1,0),'#5a74a8',0]];
let gzHot=null,gzPts=[];
function gizmo(){gc.clearRect(0,0,168,168);const m=new THREE.Matrix4().extractRotation(camera.matrixWorldInverse);
  if(Z&&gzHot!==null||gz.matches(':hover')&&Z){gc.fillStyle='rgba(255,255,255,0.07)';gc.beginPath();gc.arc(84,84,80,0,7);gc.fill()}
  const pts=[];GAX.forEach(([n,v,c,z])=>{const w=(Z?v.clone().applyQuaternion(world.quaternion):v.clone()).applyMatrix4(m);pts.push({n,v:w,c,z,neg:false},{n:'-'+n,v:w.clone().negate(),c,z,neg:true})});
  pts.sort((a,b)=>a.v.z-b.v.z);gzPts=[];
  pts.forEach(p=>{const x=84+p.v.x*58,y=84-p.v.y*58,hot=gzHot===p.n;p.x=x;p.y=y;gzPts.push(p);
    if(!p.neg){gc.strokeStyle=p.c;gc.lineWidth=3;gc.beginPath();gc.moveTo(84,84);gc.lineTo(x,y);gc.stroke()}
    gc.beginPath();gc.arc(x,y,p.neg?11:13,0,7);
    if(p.neg){gc.fillStyle=hot?p.c:'rgba(30,30,30,0.85)';gc.fill();gc.strokeStyle=p.c;gc.lineWidth=2.5;gc.stroke()}
    else{gc.fillStyle=p.c;gc.fill();if(hot){gc.strokeStyle='#fff';gc.lineWidth=2.5;gc.stroke()}}
    if(!p.neg||hot){gc.fillStyle=p.neg?'#fff':'#111';gc.font='bold '+(p.neg?12:15)+'px "IBM Plex Mono",monospace';gc.textAlign='center';gc.textBaseline='middle';gc.fillText(p.n,x,y+1)}})}
function gzHit(e){const r=gz.getBoundingClientRect(),x=(e.clientX-r.left)*168/r.width,y=(e.clientY-r.top)*168/r.height;let best=null,bd=1e9;
  gzPts.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<16&&(d<bd||(d===bd&&!p.neg))){bd=d;best=p}});return best}
if(Z){gz.style.pointerEvents='auto';gz.classList.add('zg');
  gz.addEventListener('pointermove',e=>{const h=gzHit(e);gzHot=h?h.n:null;gz.style.cursor=h?'pointer':'default';
    gz.title=h?(h.n.replace('-','−')+'：'+(h.z===cz?U.all:['XY  ','YZ  ','XZ  '][h.z]+Z[h.z].split('　')[0])):''});
  gz.addEventListener('pointerleave',()=>{gzHot=null});
  gz.addEventListener('click',e=>{const h=gzHit(e);if(!h)return;const z=h.z===cz?-1:h.z;const b=document.querySelectorAll('.ztabs button')[z+1];b&&b.click()})}
function stats(){const v=items.reduce((n,it)=>n+it.meshes.reduce((a,m)=>a+m.geometry.attributes.position.count,0),0);$('stat').textContent=U.stats.replace('{n}',W.length).replace('{name}',D.name)}
function resize(){const r=view.getBoundingClientRect();if(!r.width||!r.height)return;  // 視窗被隱藏時不更新，避免鏡頭比例變成無效值
  renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();controls.maxDistance=homePos().distanceTo(homeTarget())*1.6}
// 三個平面：淡淡的底色、格線、兩條邊上的軸線，及平面名稱與年代（名稱只在「全部」視角顯示）
const AXT=[];
if(Z){const tag=(txt,p,g)=>{const c=document.createElement('canvas'),x=c.getContext('2d');c.width=1024;c.height=96;x.font='500 46px "IBM Plex Mono","Noto Sans TC",monospace';x.fillStyle='#9a9a9a';x.textBaseline='middle';x.fillText(txt,6,48);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,sizeAttenuation:false}));sp.scale.set(0.32,0.03,1);   // 固定螢幕大小，遠近都看得清楚
    sp.center.set(0,0.5);sp.position.copy(p);sp.visible=cz<0;AXT.push(sp);g.add(sp)};
  [0,1,2].forEach(p=>{const g=new THREE.Group();g.quaternion.copy(QI[p]);world.add(g);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(LS,LS),new THREE.MeshBasicMaterial({color:CLAY?0xe2dbd0:0x2f2f2f,side:THREE.DoubleSide}));f.rotation.x=-Math.PI/2;f.position.set(LS/2,-0.004,LS/2);g.add(f);
    const gr=new THREE.GridHelper(LS,LS/2,CLAY?0xd8d0c4:0x363636,CLAY?0xd8d0c4:0x363636);gr.position.set(LS/2,0.002,LS/2);g.add(gr);   // 格線 2 公尺一格、低對比
    const ed=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(LS,LS)),new THREE.LineBasicMaterial({color:CLAY?0xb9b0a3:0x555555}));ed.rotation.x=-Math.PI/2;ed.position.set(LS/2,0.004,LS/2);g.add(ed);   // 平面邊框
    tag(PLANES[p][0]+'  '+PLANES[p][1],new THREE.Vector3(LS+0.8,0.05,LS+0.8),g)});
  const ax=(v,c)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),v.clone().multiplyScalar(LS+1.5)]),new THREE.LineBasicMaterial({color:c}));world.add(l)};
  ax(new THREE.Vector3(1,0,0),0x8a4a4a);ax(new THREE.Vector3(0,0,1),0x5b7a45);ax(new THREE.Vector3(0,1,0),0x4a5f8a)}   // X 紅、Y 綠、Z 藍（Blender 的 Z 朝上）
if(Z){const pz=W.find(w=>w.slug===pending)||W.find(w=>w.slug===window.PF_BACK);   // 從作品頁回來：停在那件作品所在的類別
  if(pz){cz=pz.zone;world.quaternion.copy(QR[cz])}
  const bar=document.createElement('div');bar.className='ztabs';bar.setAttribute('role','tablist');
  [-1,0,1,2].forEach((n,k)=>{const z=k-1,b=document.createElement('button');b.type='button';b.setAttribute('role','tab');b.innerHTML=z<0?`${U.all}<small>${W.length}</small>`:`${PLANES[z][1]}<small>${ROWN[z]}</small>`;
    b.onclick=()=>{if(selected){outline(selected,false);select(null)}setZone(z,true)};bar.appendChild(b)});view.appendChild(bar)}
new ResizeObserver(resize).observe(view);resize();camera.position.copy(homePos());controls.target.copy(homeTarget());if(Z)setZone(cz,false);
props();
const tmp=new THREE.Vector3();let last=performance.now();
// 防穿模（2026-10-20）：視點不能平移到地板下或作品列之外；鏡頭若進入任何作品（含台座）外框，就沿視線方向推出去
const _cb=new THREE.Box3(),_dir=new THREE.Vector3();
function keepOut(){const t=controls.target,lim=span*GAP/2+2.5;
  if(Z){if(!anim){t.x=THREE.MathUtils.clamp(t.x,-2,LS+2);t.z=THREE.MathUtils.clamp(t.z,-2,LS+2)}t.y=THREE.MathUtils.clamp(t.y,0.3,LS)}   // 平面版：鏡頭目標留在房間角落範圍內
  else{t.x=THREE.MathUtils.clamp(t.x,-lim,lim);t.y=THREE.MathUtils.clamp(t.y,0.3,2.6);t.z=THREE.MathUtils.clamp(t.z,-3,3)}
  if(camera.position.y<0.35)camera.position.y=0.35;
  for(const it of items){if(!it.root)continue;_cb.setFromObject(it.holder).expandByScalar(0.25);
    if(!_cb.containsPoint(camera.position))continue;
    _dir.subVectors(camera.position,t);if(_dir.lengthSq()<1e-6)_dir.set(0,0.4,1);_dir.normalize();
    for(let k=0;k<80&&_cb.containsPoint(camera.position);k++)camera.position.addScaledVector(_dir,0.1)}}
function loop(now){const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(Z)items.forEach(it=>{if(!it.root)return;const tg=cz<0||it.w.zone===cz||it===selected?1:0,op=it.op??1;if(Math.abs(tg-op)<0.002)return;   // 分頁視角：其他兩類的模型淡出後隱藏
    it.op=op+(tg-op)*Math.min(1,dt*5);if(Math.abs(tg-it.op)<0.004)it.op=tg;
    it.holder.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.userData.op0===undefined)m.userData.op0=m.opacity;m.transparent=true;m.opacity=m.userData.op0*it.op;m.depthWrite=it.op>0.5&&m.userData.op0>0.5});it.holder.visible=it.op>0.003});
  if(spin){spin.t=Math.min(1,spin.t+dt/spin.dur);const k=spin.t<0.5?4*spin.t**3:1-(-2*spin.t+2)**3/2;world.quaternion.slerpQuaternions(spin.q0,spin.q1,k);if(spin.t>=1)spin=null}
  if(anim){anim.t=Math.min(1,anim.t+dt/anim.dur);const k=anim.arc?(anim.t<0.5?4*anim.t**3:1-(-2*anim.t+2)**3/2):1-(1-anim.t)**3;camera.position.lerpVectors(anim.p0,anim.p1,k);controls.target.lerpVectors(anim.t0,anim.t1,k);
    if(anim.arc){tmp.subVectors(camera.position,controls.target);camera.position.addScaledVector(tmp,Math.sin(Math.PI*anim.t)*anim.arc)}
    if(anim.t>=1){const f=anim.then;anim=null;f&&f()}}
  if(FADE){let p=null;if(mouse){pick(mouse);const h=ray.intersectObjects(meshes(),false)[0];p=h?h.point:ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3())}
    if(!p&&selected){p=new THREE.Box3().setFromObject(selected.holder).getCenter(new THREE.Vector3())}
    if(p){torch.target.position.lerp(p,0.25);torch.position.copy(camera.position).add(new THREE.Vector3(0,3,0))}}
  controls.update();keepOut();relax();
  const bs=items.find(i=>i.w.slug==='beacon-silence');
  if(bs&&bs.beams.length){let hb=-1;if(mouse&&tool==='select'){pick(mouse);const h=ray.intersectObjects(bs.beams,false)[0];if(h)hb=h.object.userData.beam}
    const now2=new Set();bs.beams.forEach((b,k)=>{b.material.opacity=k===hb?0.12:0.9;if(k===hb)now2.add(k%D.channels)});
    if([...now2].join()!==[...blocked].join()){blocked.clear();now2.forEach(c=>blocked.add(c));levels()}}
  if(mouse&&tool==='select'&&!sculpting){pick(mouse);const h=ray.intersectObjects(meshes(),false)[0],it=h?h.object.userData.item:null;if(it!==hovered){if(hovered)hovered.label.classList.remove('hv');hovered=it;canvas.style.cursor=it?'pointer':'default';if(it)it.label.classList.add('hv')}}
  items.forEach(it=>{const tg=it===hovered?1:0;if(it.hv===tg)return;it.hv+=(tg-it.hv)*Math.min(1,dt*9);if(Math.abs(tg-it.hv)<0.003)it.hv=tg;const e=it.hv*it.hv*(3-2*it.hv);   // 滑過：放大 8%、浮起、台座變亮；移開時平順縮回原本大小（依各類的縮放，不重設成 1）
    it.holder.scale.setScalar(it.base*(1+0.08*e));it.holder.position.copy(it.p0).addScaledVector(it.up,0.22*it.base*e);it.plinth.material.color.lerpColors(it.c0,it.c1,e)});
  const r=view.getBoundingClientRect();items.forEach(it=>{if(!it.root)return;const b=new THREE.Box3().setFromObject(it.holder);tmp.set((b.min.x+b.max.x)/2,b.max.y+0.25,(b.min.z+b.max.z)/2).project(camera);
    it.label.style.display=(tmp.z<1&&(r.width>700||it===selected||it===hovered))?'block':'none';  // 窄螢幕只標選取中的作品
    it.label.style.left=((tmp.x+1)/2*r.width)+'px';it.label.style.top=((1-tmp.y)/2*r.height)+'px'});
  renderer.render(scene,camera);gizmo();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
// 從作品頁按 Tab 回來時，頁面可能是從快取還原的，重設進場狀態
window.addEventListener('pageshow',e=>{entering=false;document.querySelectorAll('.trans').forEach(o=>{if(e.persisted&&window.PFX&&o._parts)PFX.play(o,'reveal').then(()=>o.remove());else o.remove()});items.forEach(it=>it.meshes.forEach(m=>{m.material.wireframe=false}));$('modeLabel').innerHTML='<b>Object Mode</b>　'+U.browse});

// 第一次進站：顯示三步驟說明（看過就記住，不再出現）
(function(){const g=$('guide');let seen=false;try{seen=localStorage.getItem('pf-guide')==='1'}catch(e){}
  if(/[?&]noguide/.test(location.search))seen=true;  // 截圖檢查用
  if(!seen&&g){g.hidden=false;$('guideGo').onclick=()=>{g.hidden=true;try{localStorage.setItem('pf-guide','1')}catch(e){}}}})();

// ---------------- 其他看起來像按鈕的元素都要有作用
$('logo').onclick=()=>{if(selected)outline(selected,false);select(null);setTool('select');frameAll()};          // 標誌：回到全部作品
$('modeLabel').onclick=()=>{if(selected)enter(selected);else sculptHint(U.selectFirst)};  // 模式：進入作品
tree.querySelectorAll('.coll').forEach(c=>c.onclick=()=>{const open=!c.classList.toggle('shut');let n=c.nextElementSibling;   // 分組標題：收合
  while(n&&!n.classList.contains('coll')){n.hidden=!open;n=n.nextElementSibling}c.textContent=c.textContent.replace(/^[▾▸]/,open?'▾':'▸')});

// ---------------- 按鍵顯示（像 3D 軟體的 Screencast Keys）：滑鼠左／中／右鍵、滾輪、鍵盤按鍵與它們做了什麼
(function(){
  const box=document.createElement('div');box.className='keys mono';box.innerHTML=`
    <button class="kt" title="${U.keysToggle}">${U.keysLabel}</button>
    <div class="kb"><svg class="mouse" viewBox="0 0 40 60" width="34" height="51" aria-hidden="true">
      <rect x="2" y="2" width="36" height="56" rx="18" class="mb"/>
      <path d="M20 2 V22 M2 22 H38" class="ml"/>
      <path class="ml-l" d="M20 3 V21 H3 V20 A17 17 0 0 1 20 3 Z"/><path class="ml-r" d="M20 3 V21 H37 V20 A17 17 0 0 0 20 3 Z"/>
      <rect class="ml-m" x="17" y="7" width="6" height="11" rx="3"/>
      <path class="wu" d="M20 -6 l-4 5 h8z"/><path class="wd" d="M20 30 l-4 -5 h8z"/></svg>
      <div class="kl"></div></div>`;
  view.appendChild(box);
  const list=box.querySelector('.kl'),svg=box.querySelector('.mouse');
  let on=true;try{on=localStorage.getItem('pf-keys')!=='0'}catch(e){}
  const setOn=v=>{on=v;box.classList.toggle('off',!on);try{localStorage.setItem('pf-keys',on?'1':'0')}catch(e){}};setOn(on);
  box.querySelector('.kt').onclick=e=>{e.stopPropagation();setOn(!on)};
  const NAMES={' ':'Space','Escape':'Esc','ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓','Shift':'⇧ Shift','Control':'Ctrl','Alt':'⌥ Alt','Meta':'⌘','Enter':'Enter','Backspace':'⌫','.':'.'};
  const ACT=U.act;
  function chip(k,act){if(!on)return;const c=document.createElement('div');c.className='kc';c.innerHTML=`<b>${k}</b>${act?`<span>→ ${act}</span>`:''}`;
    list.appendChild(c);while(list.children.length>4)list.firstChild.remove();setTimeout(()=>c.classList.add('fade'),1400);setTimeout(()=>c.remove(),2000);return c}
  window.addEventListener('keydown',e=>{if(e.repeat)return;let k=NAMES[e.key]||(e.key.length===1?e.key.toUpperCase():e.key);
    if(['⇧ Shift','Ctrl','⌥ Alt','⌘'].includes(k)){chip(k,'');return}
    const mods=[e.shiftKey&&'⇧',e.ctrlKey&&'Ctrl',e.altKey&&'⌥',e.metaKey&&'⌘'].filter(Boolean);
    chip(mods.length?mods.join(' + ')+' + '+k:k,ACT[k]||'')},true);
  // 滑鼠：哪顆鍵按著就亮哪裡；拖曳時顯示在做什麼
  const part=['ml-l','ml-m','ml-r'],DRAG=U.drag,BTN=U.btn;
  let pressed=-1,dragChip=null,start=null;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){chip(U.touch,U.touchAct);return}
    pressed=e.button;svg.querySelector('.'+part[e.button])?.classList.add('on');start={x:e.clientX,y:e.clientY};
    dragChip=chip(BTN[e.button]||(U.key+e.button),tool==='sculpt'&&e.button===0?U.sculpt:U.btnAct[e.button]||'')},true);
  window.addEventListener('pointermove',e=>{if(pressed<0||!start||!dragChip)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6&&!dragChip.dataset.drag){
    dragChip.dataset.drag=1;dragChip.innerHTML=`<b>${BTN[pressed]}${U.dragWord}</b><span>→ ${tool==='sculpt'&&pressed===0&&sculpting?U.push:DRAG[pressed]}</span>`}},true);
  window.addEventListener('pointerup',()=>{if(pressed>=0)svg.querySelector('.'+part[pressed])?.classList.remove('on');pressed=-1;start=null},true);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  let wt=null;canvas.addEventListener('wheel',e=>{const up=e.deltaY<0;svg.classList.remove('wu-on','wd-on');svg.classList.add(up?'wu-on':'wd-on');
    svg.querySelector('.ml-m').classList.add('on');clearTimeout(wt);wt=setTimeout(()=>{svg.classList.remove('wu-on','wd-on');svg.querySelector('.ml-m').classList.remove('on')},350);
    const last=list.lastChild;if(last&&last.dataset.wheel===(up?'u':'d')){clearTimeout(last._t);last.classList.remove('fade')}else{const c=chip(U.wheel+(up?'↑':'↓'),up?U.zoomIn:U.zoomOut);if(c)c.dataset.wheel=up?'u':'d'}},{passive:true,capture:true});
})();
