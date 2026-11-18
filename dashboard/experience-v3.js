/* Torus experience v3: on-demand logo motion, manual theme selection,
   and ergonomic board scroll controls. Never touches private CRM records. */
(() => {
 'use strict';
 const root=document.documentElement;
 const KEY='torus-appearance';
 let mode='light';
 try { mode=localStorage.getItem(KEY)==='dark'?'dark':'light'; }catch(_){}
 root.dataset.appearance=mode;
 const svg=(dark)=>dark
  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 13.2A8.4 8.4 0 0 1 10.8 3.5a8.7 8.7 0 1 0 9.7 9.7Z"/></svg>'
  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9"/></svg>';
 function renderSwitch(){
   const targets=[document.querySelector('[data-actions]'),...document.querySelectorAll('[data-theme-slot]')].filter(Boolean);
   for(const actions of targets){
     let button=actions.querySelector(':scope > [data-theme-switch]');
     if(!button){
       button=document.createElement('button');button.type='button';
       button.className='theme-switch';button.dataset.themeSwitch='';
       button.addEventListener('click',()=>{
         mode=mode==='dark'?'light':'dark';
         root.dataset.appearance=mode;
         try{localStorage.setItem(KEY,mode);}catch(_){}
         renderSwitch();
       });
       actions.appendChild(button);
     }
     const dark=mode==='dark';
     button.innerHTML=svg(!dark)+'<span>'+(dark?'Daylight':'Night grove')+'</span>';
     button.setAttribute('aria-label',dark?'Switch to daylight theme':'Switch to night grove theme');
     button.setAttribute('aria-pressed',String(dark));
     button.title=dark?'Switch to daylight theme':'Switch to night grove theme';
   }
 }
 function syncHeaderArt(){
   for(const header of [document.querySelector('.top'),document.querySelector('.cal-header'),document.querySelector('.settings-page-intro')].filter(Boolean)){
     if(header.querySelector(':scope > .brand-header-media'))continue;
     const media=document.createElement('span');
     media.className='brand-header-media';media.setAttribute('aria-hidden','true');
     const tri=document.createElement('span');tri.className='brand-header-triangle';
     media.appendChild(tri);header.appendChild(media);
   }
 }
 function setupLogo(){
   const logo=document.querySelector('.brand-identity');
   if(!logo)return;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
   function wake(){
      if(reduced.matches)return;
      logo.classList.remove('is-awake');void logo.offsetWidth;
      logo.classList.add('is-awake');
   }
   logo.addEventListener('pointerenter',wake);
   logo.addEventListener('click',wake);
   logo.addEventListener('animationend',()=>logo.classList.remove('is-awake'));
   logo.addEventListener('pointermove',e=>{
     if(reduced.matches||e.pointerType!=='mouse')return;
     const rect=logo.getBoundingClientRect();
     const x=Math.max(-1,Math.min(1,(e.clientX-rect.left)/rect.width*2-1));
     const y=Math.max(-1,Math.min(1,(e.clientY-rect.top)/rect.height*2-1));
     logo.style.transform='perspective(350px) rotateY('+(x*3).toFixed(1)+'deg) rotateX('+(-y*2.5).toFixed(1)+'deg)';
   },{passive:true});
   logo.addEventListener('pointerleave',()=>{logo.style.transform='';logo.classList.remove('is-awake');});
 }
 function init(){
   setupLogo();renderSwitch();
   const actions=document.querySelector('[data-actions]');
   if(actions){
     const observer=new MutationObserver(()=>{renderSwitch();syncHeaderArt();});
     observer.observe(actions,{childList:true});
   }
   const view=document.querySelector('[data-view]');
   if(view){
     const observer=new MutationObserver(()=>{renderSwitch();syncHeaderArt();});
     observer.observe(view,{childList:true});
   }
   syncHeaderArt();
   // Calendar keyboard: arrows move one day/week; Home/End select week edges;
   // PageUp/PageDown move across months. Selection always reaches the same data layer.
   document.addEventListener('keydown',e=>{
     if(!e.target.matches('.cal-date'))return;
     const move={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
     if(!(e.key in move)&&!['Home','End','PageUp','PageDown'].includes(e.key))return;
     e.preventDefault();
     const [yy,mm,dd]=e.target.dataset.calDay.split('-').map(Number);
     const date=new Date(yy,mm-1,dd);
     if(e.key==='Home')date.setDate(date.getDate()-date.getDay());
     else if(e.key==='End')date.setDate(date.getDate()+6-date.getDay());
     else if(e.key==='PageUp')date.setMonth(date.getMonth()-1);
     else if(e.key==='PageDown')date.setMonth(date.getMonth()+1);
     else date.setDate(date.getDate()+move[e.key]);
     const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
     e.target.dataset.calDay=key;
     e.target.click();
     requestAnimationFrame(()=>document.querySelector('.cal-date[data-cal-day="'+key+'"]')?.focus());
   });
   document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-board-scroll]');if(!btn)return;
      const board=document.querySelector('[data-board]');if(!board)return;
      const first=board.querySelector('.col');
      const distance=(first?.getBoundingClientRect().width||280)+16;
      board.scrollBy({left:Number(btn.dataset.boardScroll)*distance*1.05,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();

