// 轉場（首頁 ⇄ 作品頁）：每件作品一種動態，取自作品本身的機制。
// 進場：從模型位置展開，最後一格固定是「滿版照片＋作品名」，作品頁第一格與它完全相同（.cover-in 由 build.py 直接寫進頁面），換頁不閃。
// 離場：作品頁用同一種動態蓋滿畫面；首頁再倒放回模型的位置。
(function(){
  var VAR={'beacon-silence':'beams','paper-shell-echo':'rings','solitude-internet':'aperture','soundscape-city':'blocks','compound-eye':'cells','bio-sculpture':'glow'};
  var EASE='cubic-bezier(.3,.6,.2,1)',OUT='cubic-bezier(.2,.7,.2,1)';   // 起步就要動（點下去立刻有反應），收尾放慢
  var REDUCE=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(){var d=document.documentElement;return [d.clientWidth||innerWidth,d.clientHeight||innerHeight]}

  // 一片：只露出照片的某一塊，照片本身對齊整個畫面（所以每片拼起來就是完整的照片）
  function piece(ov,x,y,w,h,o,round){
    var p=document.createElement('i'),S=size();p.className='pc'+(round?' rd':'');
    p.style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px';
    p.innerHTML='<img src="'+o.src+'" alt="" style="left:'+(-x)+'px;top:'+(-y)+'px;width:'+S[0]+'px;height:'+S[1]+'px;object-position:'+o.pos+'">';
    ov.appendChild(p);return p}

  // 片數多的動態（方塊、小眼）改畫在單一畫布上：每格只畫一次照片、用形狀裁切，避免幾十個圖層讓瀏覽器卡頓
  function easeOut(p){return 1-Math.pow(1-p,3)}
  function canvasFX(ov,o,W,H,shapes){
    var dpr=Math.min(2,window.devicePixelRatio||1),cv=document.createElement('canvas'),ctx=cv.getContext('2d'),im=new Image();im.src=o.src;
    cv.className='cv';cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ov.appendChild(cv);ctx.scale(dpr,dpr);
    var lead=Math.min.apply(null,shapes.map(function(s){return s.d})),U=0;
    shapes.forEach(function(s){s.d-=lead;U=Math.max(U,s.d+s.du)});
    var pp=String(o.pos).split(' ').map(function(v){return parseFloat(v)/100});
    function draw(t){ctx.clearRect(0,0,W,H);if(!im.complete||!im.naturalWidth)return;
      ctx.save();ctx.beginPath();var any=false;
      shapes.forEach(function(s){var p=Math.max(0,Math.min(1,(t-s.d)/s.du));if(p>0){any=true;s.path(ctx,easeOut(p))}});
      if(!any){ctx.restore();return}
      ctx.clip();var k=Math.max(W/im.naturalWidth,H/im.naturalHeight),dw=im.naturalWidth*k,dh=im.naturalHeight*k;
      ctx.drawImage(im,(W-dw)*(isNaN(pp[0])?.5:pp[0]),(H-dh)*(isNaN(pp[1])?.5:pp[1]),dw,dh);
      ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);ctx.restore()}       // 等同 brightness(.55)
    draw(0);return [cv,null,0,U,'canvas',draw]}

  // 回傳 [元素, 關鍵影格, 延遲, 時長, 緩動]；全部以「蓋上畫面」的方向描述，倒放即為「掀開」
  var FX={
    // Beacon Silence：七道光帶交錯橫越畫面
    beams:function(ov,o,W,H){var n=7,h=H/n,a=[];
      for(var i=0;i<n;i++){var p=piece(ov,0,Math.round(i*h),W,Math.ceil(h)+1,o),left=i%2===0;
        p.style.transformOrigin=(left?'0':'100%')+' 50%';
        var d=Math.abs((i+.5)*h-o.y)/H*200;
        a.push([p,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],d+i*22,520,EASE])}
      return a},
    // 紙殼迴聲：聲波一圈圈擴散，照片跟在後面
    rings:function(ov,o,W,H){var R=Math.hypot(Math.max(o.x,W-o.x),Math.max(o.y,H-o.y)),a=[];
      var b=piece(ov,0,0,W,H,o);
      a.push([b,[{clipPath:'circle(0px at '+o.x+'px '+o.y+'px)'},{clipPath:'circle('+R+'px at '+o.x+'px '+o.y+'px)'}],90,720,EASE]);
      for(var k=0;k<3;k++){var r=document.createElement('i');r.className='ring';
        r.style.cssText='left:'+(o.x-R)+'px;top:'+(o.y-R)+'px;width:'+(2*R)+'px;height:'+(2*R)+'px';ov.appendChild(r);
        a.push([r,[{transform:'scale(0)',opacity:.9},{transform:'scale(1)',opacity:0}],k*110,820,OUT])}
      return a},
    // Solitude Internet：先是一個小孔，紅色濾光片轉過，孔才打開（畫布）
    aperture:function(ov,o,W,H){var R=Math.hypot(Math.max(o.x,W-o.x),Math.max(o.y,H-o.y)),dpr=Math.min(2,window.devicePixelRatio||1),
        cv=document.createElement('canvas'),ctx=cv.getContext('2d'),im=new Image(),pp=String(o.pos).split(' ').map(function(v){return parseFloat(v)/100}),U=900;
      im.src=o.src;cv.className='cv';cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ov.appendChild(cv);ctx.scale(dpr,dpr);
      function inout(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
      function draw(t){var u=Math.max(0,Math.min(1,t/U)),r;ctx.clearRect(0,0,W,H);
        if(u<.22)r=38*easeOut(u/.22);else if(u<.45)r=38;else r=38+(R-38)*inout((u-.45)/.55);
        if(r<.5||!im.complete||!im.naturalWidth)return;
        ctx.save();ctx.beginPath();ctx.arc(o.x,o.y,r,0,Math.PI*2);ctx.clip();
        var k=Math.max(W/im.naturalWidth,H/im.naturalHeight),dw=im.naturalWidth*k,dh=im.naturalHeight*k;
        ctx.drawImage(im,(W-dw)*(isNaN(pp[0])?.5:pp[0]),(H-dh)*(isNaN(pp[1])?.5:pp[1]),dw,dh);
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);
        var a=(-90+90*Math.min(1,u/.5)+(u>.5?30*(u-.5)/.5:0))*Math.PI/180,al=u<.5?.72:.72*(1-(u-.5)/.5);   // 濾光片：半圓紅片繞孔轉動，孔打開後淡出
        if(al>0){ctx.fillStyle='rgba(150,14,20,'+al.toFixed(3)+')';ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.arc(o.x,o.y,R,a,a+Math.PI);ctx.closePath();ctx.fill()}
        ctx.restore()}
      draw(0);return [[cv,null,0,U,'canvas',draw]]},
    // 音景城市：格子一塊塊升起，從模型位置往外
    blocks:function(ov,o,W,H){var c=Math.max(6,Math.round(W/150)),q=W/c,r=Math.ceil(H/q),M=Math.hypot(W,H),sh=[];
      for(var j=0;j<r;j++)for(var i=0;i<c;i++)(function(x,y,i,j){
        sh.push({d:Math.hypot(x+q/2-o.x,y+q/2-o.y)/M*520+((i*7+j*13)%5)*18,du:380,path:function(ctx,p){var h=(q+1)*p;ctx.rect(x,y+q+1-h,q+1,h)}})})(i*q,j*q,i,j);
      return [canvasFX(ov,o,W,H,sh)]},
    // 科技複眼：一顆顆小眼睜開，拼成整個畫面
    cells:function(ov,o,W,H){var d=Math.max(90,W/10),R=d*.62,M=Math.hypot(W,H),row=0,sh=[];
      for(var y=0;y<H+d;y+=d*.866,row++)for(var x=(row%2?d/2:0);x<W+d;x+=d)(function(x,y){
        sh.push({d:Math.hypot(x-o.x,y-o.y)/M*560,du:420,path:function(ctx,p){ctx.moveTo(x+R*p,y);ctx.arc(x,y,R*p,0,Math.PI*2)}})})(x,y);
      return [canvasFX(ov,o,W,H,sh)]},
    // Luminous Membrane：從內部亮起的柔邊光暈（畫布：照片 → 柔邊圓形遮罩，起初帶一層粉色光）
    glow:function(ov,o,W,H){var R=Math.hypot(Math.max(o.x,W-o.x),Math.max(o.y,H-o.y))+260,dpr=Math.min(2,window.devicePixelRatio||1),
        cv=document.createElement('canvas'),ctx=cv.getContext('2d'),im=new Image(),pp=String(o.pos).split(' ').map(function(v){return parseFloat(v)/100});
      im.src=o.src;cv.className='cv';cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ov.appendChild(cv);ctx.scale(dpr,dpr);
      function draw(t){var p=easeOut(Math.max(0,Math.min(1,t/860))),r=R*p;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,W,H);
        if(r<1||!im.complete||!im.naturalWidth)return;
        var k=Math.max(W/im.naturalWidth,H/im.naturalHeight),dw=im.naturalWidth*k,dh=im.naturalHeight*k;
        ctx.drawImage(im,(W-dw)*(isNaN(pp[0])?.5:pp[0]),(H-dh)*(isNaN(pp[1])?.5:pp[1]),dw,dh);
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);
        ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(255,170,190,'+(.35*(1-p)).toFixed(3)+')';ctx.fillRect(0,0,W,H);
        var g=ctx.createRadialGradient(o.x,o.y,Math.max(0,r-240),o.x,o.y,r);g.addColorStop(0,'#000');g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.globalCompositeOperation='destination-in';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
      draw(0);return [[cv,null,0,860,'canvas',draw]]},
    // 其他頁：直條像布幕一片片垂下
    slats:function(ov,o,W,H){var n=10,w=W/n,a=[];
      for(var i=0;i<n;i++){var x=Math.round(i*w),p=piece(ov,x,0,Math.ceil(w)+1,H,o);p.style.transformOrigin='50% 0';
        a.push([p,[{transform:'scaleY(0)'},{transform:'scaleY(1)'}],Math.abs(x+w/2-o.x)/W*300,520,EASE])}
      return a}
  };

  function build(o){
    var S=size(),ov=document.createElement('div'),v=VAR[o.slug]||'slats';
    o.x=o.x==null?S[0]/2:o.x;o.y=o.y==null?S[1]/2:o.y;o.pos=o.pos||'50% 50%';
    ov.className='trans fx-'+v;
    ov.innerHTML='<div class="base"><img src="'+o.src+'" alt="" style="object-position:'+o.pos+'"></div>';
    var parts=FX[v](ov,o,S[0],S[1]),lead=Math.min.apply(null,parts.map(function(p){return p[2]}));
    parts.forEach(function(p){p[2]-=lead});                                   // 第一片立刻開始動，點下去不會有空檔
    var tt=document.createElement('div');tt.className='tt';tt.innerHTML=(o.label?'<span>'+o.label+'</span>':'')+'<b>'+o.title+'</b>';ov.appendChild(tt);
    var end=0;parts.forEach(function(p){end=Math.max(end,p[2]+p[3])});
    // 最後一格：底圖補滿（小眼之間的縫隙等），標題浮上來
    parts.push([ov.firstChild,[{opacity:0},{opacity:1}],end-160,160,'linear']);
    parts.push([tt,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],Math.max(0,end-420),420,OUT]);
    ov._parts=parts;ov._end=end;document.body.appendChild(ov);return ov}

  // dir='cover'：蓋上（進場前半、離場）；'reveal'：倒放掀開（回到首頁）；'full'：直接停在蓋滿的狀態
  function play(ov,dir){
    var P=ov._parts,T=ov._end,list=[];
    if(dir==='full'||REDUCE){P.forEach(function(p){if(p[4]==='canvas'){p[5](p[3]);return}var k=p[1][p[1].length-1],s=p[0].style;for(var n in k)if(n!=='offset'){if(n.indexOf('--')===0)s.setProperty(n,k[n]);else s[n]=k[n]}});
      if(dir!=='reveal')return Promise.resolve();ov.style.opacity=0;return Promise.resolve()}
    P.forEach(function(p){
      var rev=dir==='reveal',delay=rev?Math.max(0,T-(p[2]+p[3])):p[2];
      if(p[4]==='canvas'){list.push(new Promise(function(res){var t0=performance.now();
        (function f(now){var e=now-t0-delay,u=Math.max(0,Math.min(p[3],e));p[5](rev?p[3]-u:u);if(e<p[3])requestAnimationFrame(f);else res()})(t0)}));return}
      list.push(p[0].animate(p[1],{duration:p[3],delay:delay,easing:p[4],fill:'both',direction:rev?'reverse':'normal'}).finished)});
    return Promise.all(list)}

  // 先把照片解碼好再開始，避免動畫中照片還沒出來
  function ready(src,ms){return new Promise(function(res){var im=new Image();im.src=src;var t=setTimeout(res,ms||450);
    (im.decode?im.decode():Promise.resolve()).then(function(){clearTimeout(t);res()},function(){clearTimeout(t);res()})})}

  window.PFX={build:build,play:play,ready:ready,variant:function(s){return VAR[s]||'slats'},reduce:REDUCE};
})();
