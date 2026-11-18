/* Torus Mind & Medicine — visual field engine.
   Original procedural artwork, not a copy of the client's source animation.
   Canvas2D; no dependencies, no data access, respects reduced motion.
   All motion can be retuned when an authorized reference animation is supplied. */
(() => {
  'use strict';
  const instances = new WeakMap();
  const all = new Set();
  const TWO_PI = Math.PI * 2;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
  let raf = 0, last = 0;

  function mount(host) {
    if (instances.has(host)) return instances.get(host);
    host.classList.add('torus-field');
    host.setAttribute('role', 'group');
    host.tabIndex = 0;
    host.setAttribute('aria-label', 'Interactive torus geometry. Drag to rotate or use the arrow keys.');
    const canvas = document.createElement('canvas');
    canvas.className = 'torus-field__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    const toggle = host.dataset.controls === 'false' ? null : document.createElement('button');
    if (toggle) {
      toggle.type = 'button';
      toggle.className = 'torus-field__motion-toggle';
      toggle.setAttribute('aria-label', 'Pause geometric animation');
      toggle.textContent = 'Pause motion';
      host.appendChild(toggle);
    }
    const ctx = canvas.getContext('2d', {alpha: true});
    if (!ctx) return null;
    const inst = {
      host, canvas, ctx, toggle, w: 480, h: 330, dpr: 1,
      speed: Number(host.dataset.speed || 0.26),
      mode: host.dataset.mode || 'torus',
      play: !reduceMotion.matches, visible: true,
      time: 0.7, orbitX: -0.38, orbitY: 0.32,
      drag: null, pointerX: 0, pointerY: 0, lastFrame: 0
    };
    instances.set(host, inst);
    all.add(inst);
    if (toggle) toggle.addEventListener('click', () => { inst.play = !inst.play; updateButton(inst); draw(inst); start(); });
    const resize = () => {
      const b = host.getBoundingClientRect();
      inst.w = Math.max(1, b.width);
      inst.h = Math.max(1, b.height);
      inst.dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(inst.w * inst.dpr);
      canvas.height = Math.round(inst.h * inst.dpr);
      canvas.style.width = `${inst.w}px`;
      canvas.style.height = `${inst.h}px`;
      draw(inst);
    };
    if (typeof ResizeObserver !== 'undefined') {
      inst.resizeObs = new ResizeObserver(resize); inst.resizeObs.observe(host);
    } else window.addEventListener('resize', resize);
    if (typeof IntersectionObserver !== 'undefined') {
      inst.intersectionObs = new IntersectionObserver((entries) => { inst.visible = entries[0].isIntersecting; start(); }, {rootMargin: '60px'});
      inst.intersectionObs.observe(host);
    }
    host.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button, input')) return;
      inst.drag = {x: ev.clientX, y: ev.clientY};
      host.setPointerCapture?.(ev.pointerId);
      host.classList.add('is-dragging');
    });
    host.addEventListener('keydown', (ev) => {
      if (ev.target !== host || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)) return;
      ev.preventDefault();
      if (ev.key === 'ArrowLeft') inst.orbitY -= .2;
      if (ev.key === 'ArrowRight') inst.orbitY += .2;
      if (ev.key === 'ArrowUp') inst.orbitX = clamp(inst.orbitX - .2,-1.5,1.5);
      if (ev.key === 'ArrowDown') inst.orbitX = clamp(inst.orbitX + .2,-1.5,1.5);
      draw(inst);
    });
    host.addEventListener('pointermove', (ev) => {
      if (!inst.drag) return;
      const dx = ev.clientX - inst.drag.x, dy = ev.clientY - inst.drag.y;
      inst.orbitY += dx * .007;
      inst.orbitX = clamp(inst.orbitX + dy * .007, -1.5, 1.5);
      inst.drag = {x: ev.clientX, y: ev.clientY};
      draw(inst);
    });
    const release = () => {inst.drag = null; host.classList.remove('is-dragging');};
    host.addEventListener('pointerup', release); host.addEventListener('pointercancel', release);
    resize();
    updateButton(inst);
    start();
    return inst;
  }

  function project(i, x, y, z) {
    const ry = i.orbitY + i.time * .16;
    const rx = -.20 + i.orbitX + .08 * Math.sin(i.time * .17);
    const rz = i.time * .072;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    let nx = x*cy + z*sy, nz = -x*sy + z*cy;
    let ny = y*cx - nz*sx; nz = y*sx + nz*cx;
    let tx = nx*cz - ny*sz, ty=nx*sz + ny*cz;
    const perspective = 4.6/(4.6-nz*.42);
    const scale = Math.min(i.w * .41, i.h * .33) * perspective;
    return [i.w*.51+tx*scale, i.h*.50+ty*scale, nz];
  }

  function geometry(u,v) {
    const R=1.16, r=.63;
    return [(R+r*Math.cos(v))*Math.cos(u), (R+r*Math.cos(v))*Math.sin(u), r*Math.sin(v)];
  }

  function drawThreads(i, ctx, isFront) {
    const N=32, M=24;
    ctx.lineCap='round'; ctx.lineJoin='round';
    for(let family=0;family<2;family++) {
      const count=family===0 ? N:M, steps=family===0 ? 122:98;
      for(let j=0;j<count;j++) {
        const t0=TWO_PI*j/count, colorMix=j%5===0;
        ctx.beginPath(); let open=false;
        for(let s=0;s<=steps;s++) {
          const t=TWO_PI*s/steps;
          const u=family===0 ? t : t0;
          const v=family===0 ? t0 + .16*Math.sin(i.time*.37 + t0*2) : t;
          const p=geometry(u,v), q=project(i,...p);
          // Separate the near and far hemispheres for correct luminous occlusion.
          const shouldDraw=isFront ? q[2]>=-.035 : q[2]<-.035;
          if(shouldDraw) {if(!open){ctx.moveTo(q[0],q[1]);open=true;} else ctx.lineTo(q[0],q[1]);}
          else open=false;
        }
        ctx.strokeStyle = isFront
          ? (colorMix ? rgba(255,228,175,.82) : rgba(232,220,187,family===0?.58:.31))
          : (colorMix ? rgba(233,207,153,.20) : rgba(180,208,189,.115));
        ctx.lineWidth = isFront ? (colorMix ? 1.2 : .72) : .54;
        ctx.stroke();
      }
    }
  }

  function drawParticles(i, ctx) {
    const time=i.time;
    for(let k=0;k<94;k++) {
      const u=TWO_PI*((k*0.61803398875)%1) + time*(k%3===0?.55:.23);
      const v=TWO_PI*((k*0.4142135623)%1) + time*(k%5===0?.32:.50);
      const q=project(i,...geometry(u,v));
      const a = clamp(.22 + q[2]*.19, .07,.72);
      const radius=(k%9===0?1.75:.67)*Math.min(1.3,i.w/550);
      ctx.beginPath();ctx.arc(q[0],q[1],radius,0,TWO_PI);
      ctx.fillStyle=rgba(255,230,174,a);ctx.fill();
    }
  }

  // Sculptural flower-of-life: depth-sorted petals orbit in three dimensions.
  // This is an original procedural interpretation paired with the client's
  // own torus22 artwork, not a frame-by-frame reproduction of the source video.
  function drawRosette(i,ctx) {
    const compact=i.w<420, steps=compact?62:88;
    const rings=[
      {count:6, radius:.34, size:.52, z:-.18, hue:0},
      {count:12, radius:.76, size:.48, z: .03, hue:1},
      {count:18, radius:1.16, size:.35, z:.22, hue:2}
    ];
    const petals=[];
    for(const ring of rings)for(let k=0;k<ring.count;k++){
      const a=TWO_PI*k/ring.count+(ring.hue===1?.10:-.04)+i.time*.016*(ring.hue%2?1:-1);
      const centerDepth=ring.z+.19*Math.cos(a*2+i.time*.22);
      petals.push({a,centerDepth,ring,k});
    }
    petals.sort((a,b)=>a.centerDepth-b.centerDepth);
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const item of petals){
      const {a,centerDepth,ring,k}=item;
      const near=centerDepth>0;
      ctx.beginPath();
      for(let n=0;n<=steps;n++){
        const theta=TWO_PI*n/steps;
        const rr=ring.size*(1+.06*Math.sin(3*theta+i.time*.27));
        const x=ring.radius*Math.cos(a)+rr*Math.cos(theta);
        const y=ring.radius*Math.sin(a)+rr*Math.sin(theta);
        const z=centerDepth+.18*Math.sin(theta*2+a+i.time*.24)+.10*Math.cos(theta+a*3);
        const q=project(i,x,y,z);
        if(!n)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);
      }
      const gold=k%3===0;
      const alpha=near?.76:.31;
      ctx.strokeStyle=gold?rgba(246,219,167,alpha):rgba(194,219,187,near?.63:.23);
      ctx.lineWidth=near?(gold?1.13:.79):.60;
      ctx.stroke();
    }
    // Two thin tilted orbital rings emphasize volume and depth.
    for(let ring=0;ring<2;ring++){
      ctx.beginPath();
      for(let n=0;n<=144;n++){
        const a=TWO_PI*n/144;
        const r=ring===0?.47:1.40;
        const q=project(i,r*Math.cos(a),r*Math.sin(a),.23*Math.sin(a*3+i.time*.28)+(ring?.08:-.10));
        if(!n)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);
      }
      ctx.strokeStyle=rgba(255,226,166,ring===0?.40:.23);
      ctx.lineWidth=.85;ctx.stroke();
    }
    // Central golden seed: quiet light, without a distracting solid disc.
    const c=project(i,0,0,.17);
    const glow=ctx.createRadialGradient(c[0],c[1],1,c[0],c[1],Math.min(i.h,i.w)*.09);
    glow.addColorStop(0,'rgba(255,228,169,.28)');
    glow.addColorStop(.3,'rgba(218,211,165,.08)');
    glow.addColorStop(1,'rgba(255,231,190,0)');
    ctx.fillStyle=glow;
    ctx.beginPath();ctx.arc(c[0],c[1],Math.min(i.h,i.w)*.09,0,TWO_PI);ctx.fill();
    ctx.restore();
  }

  function draw(i) {
    if(!i.host.isConnected) return;
    const {ctx,w,h,dpr}=i;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const cx=w*.51,cy=h*.5;
    const glow=ctx.createRadialGradient(cx,cy,6,cx,cy,Math.min(w,h)*.56);
    glow.addColorStop(0,'rgba(255,228,174,.16)');
    glow.addColorStop(.34,'rgba(151,176,145,.11)');
    glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalCompositeOperation='screen';
    if(i.mode==='rosette') drawRosette(i,ctx);
    else {
      drawThreads(i,ctx,false);
      drawParticles(i,ctx);
      drawThreads(i,ctx,true);
    }
    ctx.restore();
    // Quiet external orbit lines ground the sculpture in its setting.
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.3+i.time*.018);
    for(let n=0;n<2;n++){
      ctx.beginPath();ctx.ellipse(0,0,Math.min(w*.41,h*.43)+n*15,Math.min(h*.29,w*.23)+n*11,0,0,TWO_PI);
      ctx.strokeStyle='rgba(255,232,188,'+(n===0?.15:.08)+')';ctx.lineWidth=.7;ctx.stroke();
    }
    ctx.restore();
  }

  function updateButton(i) {
    if(!i.toggle) return;
    i.toggle.textContent = i.play ? 'Pause motion' : 'Play motion';
    i.toggle.setAttribute('aria-label',i.play ? 'Pause geometric animation' : 'Play geometric animation');
  }
  function tick(now) {
    raf=0;
    const dt=last ? Math.min(.05,(now-last)/1000):.016; last=now;
    for(const i of all) {
      if(!i.host.isConnected) {
        i.resizeObs?.disconnect();i.intersectionObs?.disconnect();all.delete(i);continue;
      }
      if(!i.visible || document.hidden) continue;
      if(i.play && !reduceMotion.matches) i.time += dt*i.speed*3.2;
      if(i.play && !reduceMotion.matches) draw(i);
    }
    // Only schedule another frame when there is genuinely moving geometry.
    if([...all].some(i => i.play && i.visible && i.speed > 0 && !reduceMotion.matches && !document.hidden)) raf=requestAnimationFrame(tick);
  }
  function start(){if(!raf){last=0;raf=requestAnimationFrame(tick);}}
  function mountAll(root=document) {
    // The existing dashboard creates this placeholder on each route render.
    root.querySelectorAll('.welcome svg.torus').forEach(svg=>{
      const el=document.createElement('div');el.dataset.torusVisual='';el.dataset.mode='torus';
      svg.replaceWith(el);
    });
    root.querySelectorAll('[data-torus-visual]').forEach(mount);
  }
  const api={mountAll,
    setMode(mode){for(const i of all){i.mode=mode==='rosette'?'rosette':'torus';draw(i);}},
    setSpeed(value){for(const i of all)i.speed=clamp(Number(value)||0,.0,2);start();},
    setPlaying(value){for(const i of all){i.play=Boolean(value);updateButton(i);draw(i);}start();},
    toggle(){for(const i of all){i.play=!i.play;updateButton(i);draw(i);}start();},
    render(){for(const i of all)draw(i);}
  };
  window.TorusVisuals=api;
  function init() {
    mountAll();
    const view=document.querySelector('[data-view]');
    if(view) new MutationObserver(()=>mountAll(view)).observe(view,{childList:true});
    reduceMotion.addEventListener?.('change',()=>{for(const i of all){i.play=!reduceMotion.matches;updateButton(i);draw(i);}start();});
    document.addEventListener('visibilitychange',start);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
