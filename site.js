var EN=document.documentElement.lang==='en';  // 英文站（en/）的少數介面文字
// 光束互動（概念來自 Beacon Silence：人擋住哪道光，哪個聲部就安靜）
(function(){
  var hero=document.getElementById('hero');
  if(hero){
    var N=+hero.dataset.n||8, narrow=window.matchMedia('(max-width:820px)').matches, lines=[], blocked=[];
    var out=document.getElementById('n'), btn=document.getElementById('listen');
    for(var k=0;k<N;k++){var d=document.createElement('div');d.className='ln';
      d.style.top=narrow?(125+k*16)+'px':(13+k*(47/(N-1)))+'%';
      d.innerHTML='<i>CH'+(k+1)+'</i>';hero.appendChild(d);lines.push(d);blocked.push(false)}

    // 聲音：每個聲部一個 <audio>，經 Web Audio 的音量節點控制（iOS 也能調音量）
    var ctx=null, gains=[], els=[], on=false;
    function setup(){
      var AC=window.AudioContext||window.webkitAudioContext; ctx=new AC();
      for(var i=0;i<N;i++){var a=new Audio('audio/ch'+(i+1)+'.mp3');a.loop=true;a.preload='auto';
        var g=ctx.createGain();g.gain.value=0;ctx.createMediaElementSource(a).connect(g);g.connect(ctx.destination);els.push(a);gains.push(g)}
      // 各聲部保持同步：每 2 秒把偏移超過 80ms 的聲部對齊第一軌
      setInterval(function(){if(!on)return;var t=els[0].currentTime;els.forEach(function(a,i){if(i&&Math.abs(a.currentTime-t)>0.08)a.currentTime=t})},2000);
    }
    function level(i){ if(!gains[i])return; var tgt=(on&&!blocked[i])?0.9/Math.sqrt(N):0;
      gains[i].gain.setTargetAtTime(tgt,ctx.currentTime,0.12) }
    btn.addEventListener('click',function(){
      if(!ctx)setup();
      on=!on; btn.setAttribute('aria-pressed',on); btn.textContent=on?(EN?'■ Stop':'■ 停止播放'):(EN?'▶ Play Beacon Silence':(EN?'▶ Play Beacon Silence':'▶ 播放 Beacon Silence'));
      hero.classList.toggle('playing',on);
      if(on){ctx.resume();var t=els[0].currentTime;els.forEach(function(a){a.currentTime=t;a.play().catch(function(){})})}
      else setTimeout(function(){if(!on)els.forEach(function(a){a.pause()})},600);
      for(var i=0;i<N;i++)level(i);
    });

    // 擋光：游標上下 20px（手機 7px）內的那道光被擋斷、變暗，對應聲部淡出
    function block(px,py){var r=hero.getBoundingClientRect(),n=0;
      lines.forEach(function(l,i){var ly=l.getBoundingClientRect().top-r.top,hit=py!==null&&Math.abs(ly-py)<(narrow?7:20);
        l.style.setProperty('--x',hit?px+'px':'-999px');l.classList.toggle('off',hit);
        if(hit!==blocked[i]){blocked[i]=hit;level(i)} if(!hit)n++});
      out.textContent=n+' / '+N}
    function at(e){if(e.target===btn)return;var r=hero.getBoundingClientRect();block(e.clientX-r.left,e.clientY-r.top)}
    hero.addEventListener('pointermove',at);
    hero.addEventListener('pointerdown',at);
    hero.addEventListener('pointerleave',function(){block(0,null)});
  }

  // 作品清單：游標所在處把那道光擋開（照片在框內展開，由 CSS 處理）
  document.querySelectorAll('.beam').forEach(function(b){
    b.addEventListener('pointermove',function(e){b.style.setProperty('--x',(e.clientX-b.getBoundingClientRect().left)+'px')});
    b.addEventListener('pointerleave',function(){b.style.setProperty('--x','-999px')});
  });

  // Edit Mode：按 Esc（或焦點不在連結上時按 Tab）回到首頁的 3D 視窗，並選取這件作品
  var mb=document.querySelector('.modebar'),main=document.querySelector('main.work'),de=document.documentElement;
  // 離開作品頁：用這件作品自己的轉場動態蓋上畫面，回到 3D 首頁（首頁再倒放、收回模型）
  var leaving=false;
  function leave(href){
    if(!main||!main.dataset.cover||!window.PFX||PFX.reduce){location.href=href;return}
    if(leaving)return;leaving=true;
    try{sessionStorage.setItem('pf-back',JSON.stringify({slug:main.dataset.slug,t:Date.now()}))}catch(e){}
    var gone=false,go=function(){if(!gone){gone=true;location.href=href}};
    var ov=PFX.build({slug:main.dataset.slug,src:main.dataset.cover,pos:main.dataset.pos,title:main.dataset.title,label:'Object Mode'});
    PFX.play(ov,'cover').then(function(){setTimeout(go,40)});setTimeout(go,2600)}
  if(mb){
    window.addEventListener('keydown',function(e){
      var ae=document.activeElement,onBody=!ae||ae===document.body;
      if(e.key==='Escape'){e.preventDefault();leave(mb.dataset.back)}});   // 只用 Esc 回首頁；Tab 留給鍵盤使用者移動焦點
    var bk=mb.querySelector('.back');if(bk)bk.addEventListener('click',function(e){e.preventDefault();leave(mb.dataset.back)});
  }
  window.addEventListener('pageshow',function(){leaving=false;document.querySelectorAll('.trans').forEach(function(x){x.remove()})});
  // 從 3D 首頁進來：第一格是滿版封面（與首頁轉場最後一格相同），封面縮進版面中主圖的位置，其餘內容依序浮上來
  var cv=document.querySelector('.cover-in');
  if(main&&cv&&de.classList.contains('intro')){
    try{sessionStorage.removeItem('pf-enter')}catch(e){}
    var tgt=main.querySelector('.poster,.bleed,.sp-media,.masonry,.media'),top=tgt;
    while(top&&top.parentElement!==main)top=top.parentElement;
    if(top)top.classList.add('cv-keep');                                     // 主圖所在的區塊不做浮上動畫，封面才能剛好疊上去
    var m=tgt&&(tgt.matches('img,video')?tgt:tgt.querySelector('img,video'));
    // 主圖是照片：等解碼；是影片：等尺寸確定（否則落點會算錯）
    var until=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
    var wait=!m?Promise.resolve():m.tagName==='IMG'?Promise.race([m.decode?m.decode().catch(function(){}):Promise.resolve(),until(500)])
      :Promise.race([new Promise(function(r){if(m.readyState>=1)r();else m.addEventListener('loadedmetadata',r,{once:true})}),until(700)]);
    // 影片要等第一格畫面真的出來，封面才淡出，不會閃黑
    var shown=function(){return !m||m.tagName==='IMG'?Promise.resolve():Promise.race([new Promise(function(r){if(m.readyState>=2)r();else m.addEventListener('loadeddata',r,{once:true})}),until(900)])};
    var finish=function(){cv.remove();de.classList.remove('intro','intro-run')};
    var started=false,start=function(fn){return function(){if(started)return;started=true;fn()}};
    setTimeout(function(){if(!started){started=true;finish()}},3000);          // 分頁在背景（畫面不更新）時保底：直接移除封面，不會卡住
    wait.then(function(){requestAnimationFrame(start(function(){
      if(!window.PFX||PFX.reduce||!cv.animate){finish();return}
      var W=de.clientWidth,H=de.clientHeight,r=m?m.getBoundingClientRect():{top:H*.3,left:24,width:W-48,height:H*.5};
      var D=820,E='cubic-bezier(.65,0,.25,1)',im=cv.querySelector('img');
      im.animate([{left:'0px',top:'0px',width:W+'px',height:H+'px',filter:'brightness(.55)'},{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',filter:'brightness(1)'}],{duration:D,easing:E,fill:'forwards'});
      cv.animate([{backgroundColor:'rgba(11,11,11,1)'},{backgroundColor:'rgba(11,11,11,0)'}],{duration:D*.8,easing:'linear',fill:'forwards'});
      cv.querySelector('.tt').animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-14px)'}],{duration:280,easing:'ease-out',fill:'forwards'});
      de.classList.remove('intro');de.classList.add('intro-run');
      setTimeout(function(){shown().then(function(){cv.animate([{opacity:1},{opacity:0}],{duration:320,fill:'forwards'}).finished.then(finish)})},D);
      setTimeout(finish,3200)}))});
  }

  // 分隔線：游標靠近時在該處斷開
  var rules=[].slice.call(document.querySelectorAll('.rule'));
  rules.forEach(function(r){r.classList.add('cut')});
  window.addEventListener('pointermove',function(e){
    rules.forEach(function(r){var y=r.getBoundingClientRect().top;r.style.setProperty('--x',Math.abs(y-e.clientY)<26?(e.clientX-r.getBoundingClientRect().left)+'px':'-999px')})},{passive:true});
})();
