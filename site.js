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
      on=!on; btn.setAttribute('aria-pressed',on); btn.textContent=on?'■ 停止聲音':'▶ 聆聽 Beacon Silence';
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
  var mb=document.querySelector('.modebar');
  if(mb)window.addEventListener('keydown',function(e){
    var ae=document.activeElement,onBody=!ae||ae===document.body;
    if(e.key==='Escape'||(e.key==='Tab'&&!e.shiftKey&&onBody)){e.preventDefault();location.href=mb.dataset.back}});

  // 分隔線：游標靠近時在該處斷開
  var rules=[].slice.call(document.querySelectorAll('.rule'));
  rules.forEach(function(r){r.classList.add('cut')});
  window.addEventListener('pointermove',function(e){
    rules.forEach(function(r){var y=r.getBoundingClientRect().top;r.style.setProperty('--x',Math.abs(y-e.clientY)<26?(e.clientX-r.getBoundingClientRect().left)+'px':'-999px')})},{passive:true});
})();
