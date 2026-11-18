/* The Torus identity layer: per-page geometry, accessible interactive torus controls,
   and an optional original-brand film loaded on demand from torusmedicine.com.
   No access to CRM data, Supabase, IntakeQ, patient records or form state. */
(() => {
 'use strict';
 const VIDEO_URL='https://s3.amazonaws.com/webflow-prod-assets/6a5ea1579e1784605df7a1ee/6a8cb37eb8d9c60ad181c89b_torus-logo-morph-cropped.mp4';
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const SCREEN=['today','partners','patients','pipeline','events','sources','calendar','setup'];
 const friendly={today:'Torus',partners:'Connections',partner:'Connections',patients:'Whole-person care',pipeline:'Flow',events:'Community',event:'Community',sources:'Insights',calendar:'Cycles',setup:'Harmony'};
 function screen() {
  const fragment=(location.hash||'#today').substring(1).split('?')[0];
  if (fragment.startsWith('partner-')) return 'partner';
  if (fragment.startsWith('event-')) return 'event';
  return SCREEN.includes(fragment)?fragment:'today';
 }
 function syncScreen() {
  const page=screen();
  document.documentElement.dataset.screen=page;
  const top=document.querySelector('.top');
  if(top) top.setAttribute('data-motif-label',friendly[page]||'Torus');
 }
 function control(text,label,pressed,action) {
  const btn=document.createElement('button');
  btn.type='button';btn.className='torus-field__mode';
  btn.textContent=text;btn.setAttribute('aria-label',label);
  if(pressed!==null) btn.setAttribute('aria-pressed',String(pressed));
  btn.addEventListener('click',action);
  return btn;
 }
 function enhance(field){
  if(field.dataset.brandEnhanced==='true')return;
  if(!field.querySelector('canvas'))return;
  field.dataset.brandEnhanced='true';
  field.dataset.geometryMode='torus';
  const toolbar=document.createElement('div');
  toolbar.className='torus-field__toolbar';toolbar.setAttribute('role','group');
  toolbar.setAttribute('aria-label','Sacred geometry modes');
  const caption=document.createElement('span');
  caption.className='geometry-caption';caption.textContent='Drag to explore · Arrow keys to orbit';
  field.appendChild(caption);
  const attribution=document.createElement('span');attribution.className='torus-field__attribution';attribution.textContent='';field.appendChild(attribution);
  let film=null;
  let mode='torus';
  let speed=0;
  const speeds=[.14,.26,.50];
  const speedLabels=['Slow','Flow','Fast'];
  const buttons={};
  function setMode(next) {
   mode=next;field.dataset.geometryMode=next;
   for(const [name,btn] of Object.entries(buttons)) {
    if(name!=='speed') btn.setAttribute('aria-pressed',String(name===mode));
   }
   const api=window.TorusVisuals;
   if (next==='original') {
    api?.setPlaying(false);
    if(!film){
      film=document.createElement('video');film.className='torus-field__brand-film';
      film.playsInline=true;film.muted=true;film.loop=true;
      film.preload='none';film.poster='assets/torus-original-emblem.png';
      film.controls=true;
      film.setAttribute('aria-label','Original Torus Mind & Medicine logo animation');
      film.addEventListener('error',()=>{attribution.textContent='Brand film unavailable — explore the interactive torus';setMode('torus');});
      field.appendChild(film);
    }
    if(!film.src)film.src=VIDEO_URL;
    attribution.textContent='Original brand animation · torusmedicine.com';
    if(!reduce.matches)film.play().catch(()=>{attribution.textContent='Press play to view original brand motion';});
   }else{
    if(film)film.pause();
    api?.setMode(next==='flower'?'rosette':'torus');
    api?.setPlaying(!reduce.matches);
    api?.setSpeed(speeds[speed]);
    attribution.textContent=next==='flower'?'Procedural flower-of-life study':'Procedural 3D torus · drag to orbit';
   }
  }
  buttons.torus=control('Torus','Explore interactive 3D torus',true,()=>setMode('torus'));
  buttons.flower=control('Mandala','Explore rotating mandala',false,()=>setMode('flower'));
  buttons.original=control('Original','Play actual Torus brand animation',false,()=>setMode('original'));
  buttons.speed=control('Flow','Change animation speed',null,()=>{
   speed=(speed+1)%speeds.length;
   buttons.speed.textContent=speedLabels[speed];
   if(mode!=='original')window.TorusVisuals?.setSpeed(speeds[speed]);
  });
  for(const el of Object.values(buttons)) toolbar.appendChild(el);
  field.appendChild(toolbar);
  setMode('torus');
 }
 function enhanceAll(){
  syncScreen();
  document.querySelectorAll('.torus-field').forEach(enhance);
 }
 function init(){
  syncScreen();
  const view=document.querySelector('[data-view]');
  if(view){
   const observer=new MutationObserver(enhanceAll);
   observer.observe(view,{childList:true,subtree:true});
  }
  window.addEventListener('hashchange',()=>requestAnimationFrame(enhanceAll));
  enhanceAll();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();

