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
      time: 0.7, orbitX: 0, orbitY: 0.32,
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
      if (!inst.drag) {
        if(inst.mode==='rosette'&&ev.pointerType==='mouse'&&!reduceMotion.matches){
          const b=host.getBoundingClientRect();
          inst.pointerX=clamp((ev.clientX-b.left)/Math.max(1,b.width)*2-1,-1,1);
          inst.pointerY=clamp((ev.clientY-b.top)/Math.max(1,b.height)*2-1,-1,1);
          draw(inst);
        }
        return;
      }
      const dx = ev.clientX - inst.drag.x, dy = ev.clientY - inst.drag.y;
      inst.orbitY += dx * .007;
      inst.orbitX = clamp(inst.orbitX + dy * .007, -1.5, 1.5);
      inst.drag = {x: ev.clientX, y: ev.clientY};
      draw(inst);
    });
    const release = () => {inst.drag = null; host.classList.remove('is-dragging');};
    host.addEventListener('pointerleave',()=>{inst.pointerX=0;inst.pointerY=0;if(inst.mode==='rosette')draw(inst);});
    host.addEventListener('pointerup', release); host.addEventListener('pointercancel', release);
    resize();
    updateButton(inst);
    start();
    return inst;
  }

  // Living torus: viewed from ~35deg above so the centre stays open.
  function project(i, x, y, z) {
    const ry = i.orbitY + i.time * .11;
    const rx = -1.02 + i.orbitX * .7 + .05 * Math.sin(i.time * .17);
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    let nx = x*cy + z*sy, nz = -x*sy + z*cy;
    const ny = y*cx - nz*sx; nz = y*sx + nz*cx;
    const scale = Math.min(i.w * .23, i.h * .27);
    const perspective = 4.2/(4.2 - nz*.5);
    return [i.w*.5 + nx*scale*perspective, i.h*.44 + ny*scale*perspective, nz];
  }
  // Torus surface; the tube breathes slowly (about one breath every ten seconds).
  function surface(i, u, v) {
    const R = 1.02, r = .5 * (1 + .045 * Math.sin(i.time * .62));
    return [(R + r*Math.cos(v))*Math.cos(u), r*Math.sin(v), (R + r*Math.cos(v))*Math.sin(u)];
  }
  function strokeFamily(i, ctx, front, count, steps, alongU, gold, sage) {
    for (let j = 0; j < count; j++) {
      const t0 = TWO_PI * j / count, accent = j % (alongU ? 3 : 6) === 0;
      ctx.beginPath(); let open = false;
      for (let s = 0; s <= steps; s++) {
        const t = TWO_PI * s / steps;
        const q = project(i, ...(alongU ? surface(i, t, t0) : surface(i, t0, t)));
        const show = front ? q[2] >= -.02 : q[2] < -.02;
        if (show) { if (!open) { ctx.moveTo(q[0], q[1]); open = true; } else ctx.lineTo(q[0], q[1]); } else open = false;
      }
      ctx.strokeStyle = accent ? gold : sage;
      ctx.lineWidth = front ? (accent ? 1.05 : .62) : .5;
      ctx.stroke();
    }
  }
  function drawTorus(i, ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // back half, then the flowing energy, then the front half
    strokeFamily(i, ctx, false, 30, 72, false, rgba(240,214,163,.16), rgba(170,200,180,.08));
    strokeFamily(i, ctx, false, 9, 120, true, rgba(240,214,163,.14), rgba(170,200,180,.07));
    drawFlow(i, ctx);
    strokeFamily(i, ctx, true, 30, 72, false, rgba(255,229,189,.62), rgba(214,226,206,.30));
    strokeFamily(i, ctx, true, 9, 120, true, rgba(255,229,189,.5), rgba(214,226,206,.2));
  }
  // Energy rises through the centre, rolls over the top and returns around the outside.
  function drawFlow(i, ctx) {
    const n = i.w < 420 ? 70 : 110;
    for (let k = 0; k < n; k++) {
      const u = TWO_PI * ((k * .61803398875) % 1) + i.time * .05;
      const v0 = TWO_PI * ((k * .41421356) % 1) - i.time * (.55 + (k % 4) * .08);
      for (let tail = 0; tail < 4; tail++) {
        const q = project(i, ...surface(i, u, v0 + tail * .07));
        const depth = clamp(.5 + q[2] * .45, .12, 1);
        const a = (1 - tail / 4) * depth * (k % 7 === 0 ? .95 : .6);
        ctx.beginPath(); ctx.arc(q[0], q[1], (k % 7 === 0 ? 1.7 : 1.05) * (1 - tail * .18), 0, TWO_PI);
        ctx.fillStyle = rgba(255, 230, 178, a); ctx.fill();
      }
    }
  }

  // Torus Bloom: seed of life, twelve petals that open and close, two counter-turning
  // triangles (the brand's header triangles) and a twinkling outer ring.
  function drawRosette(i, ctx) {
    const turn = i.time * .05 + i.orbitY * .33 + i.pointerX * .10;
    const tilt = clamp(i.orbitX * .38 - .1 + i.pointerY * .11, -.48, .48);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const scale = Math.min(i.w * .2, i.h * .24);
    const P = (x, y, z = 0, extra = 0) => {
      const c = Math.cos(turn + extra), s = Math.sin(turn + extra);
      const rx = x*c - y*s, ry = x*s + y*c;
      const ty = ry*ct - z*st, d = ry*st + z*ct, k = 1 + d*.05;
      return [i.w*.5 + rx*scale*k, i.h*.44 + ty*scale*k, d];
    };
    const path = (pts, close) => { ctx.beginPath(); pts.forEach((q, n) => n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (close) ctx.closePath(); };
    const circle = (cx, cy, r, extra, steps = 64) => path(Array.from({ length: steps + 1 }, (_, n) => { const a = TWO_PI * n / steps; return P(cx + r*Math.cos(a), cy + r*Math.sin(a), .05*Math.sin(a*2 + i.time*.2), extra); }));
    const breath = 1 + .06 * Math.sin(i.time * .5);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // outer frame
    for (const [r, a] of [[1.62, .34], [1.7, .18]]) { circle(0, 0, r, 0, 120); ctx.strokeStyle = rgba(246,217,156,a); ctx.lineWidth = .8; ctx.stroke(); }
    // petals (vesica lenses)
    for (let k = 0; k < 12; k++) {
      const a = TWO_PI * k / 12, len = 1.38 * breath, wid = .2 + .05 * Math.sin(i.time * .5 + k);
      const pts = [];
      for (let s = 0; s <= 28; s++) { const t = s / 28, along = .45 + t*(len - .45), side = Math.sin(Math.PI*t) * wid; pts.push([along*Math.cos(a) - side*Math.sin(a), along*Math.sin(a) + side*Math.cos(a)]); }
      for (let s = 28; s >= 0; s--) { const t = s / 28, along = .45 + t*(len - .45), side = -Math.sin(Math.PI*t) * wid; pts.push([along*Math.cos(a) - side*Math.sin(a), along*Math.sin(a) + side*Math.cos(a)]); }
      path(pts.map(([x, y]) => P(x, y, .06*Math.sin(a*2 + i.time*.2))), true);
      ctx.strokeStyle = k % 3 === 0 ? rgba(249,226,175,.7) : rgba(196,220,198,.45); ctx.lineWidth = k % 3 === 0 ? .95 : .7; ctx.stroke();
    }
    // star of two triangles, turning against each other
    for (const [dir, col] of [[1, rgba(249,226,175,.62)], [-1, rgba(196,220,198,.46)]]) {
      const spin = dir * i.time * .07, r = 1.16;
      path([0, 1, 2].map((n) => { const a = spin + TWO_PI*n/3 + (dir > 0 ? -Math.PI/2 : Math.PI/2); return P(r*Math.cos(a), r*Math.sin(a), 0, -turn + turn*.35); }), true);
      ctx.strokeStyle = col; ctx.lineWidth = .9; ctx.stroke();
    }
    // seed of life
    for (let k = 0; k < 7; k++) { const a = TWO_PI * k / 6; const o = k === 6 ? 0 : .3*breath; circle(o*Math.cos(a), o*Math.sin(a), .3*breath, 0, 48); ctx.strokeStyle = rgba(255,232,190,k === 6 ? .75 : .5); ctx.lineWidth = .8; ctx.stroke(); }
    // twinkling ring of 24 beads
    for (let k = 0; k < 24; k++) {
      const a = TWO_PI * k / 24, q = P(1.62*Math.cos(a), 1.62*Math.sin(a));
      const tw = .35 + .65 * (.5 + .5 * Math.sin(i.time * 1.1 + k * 1.7));
      ctx.beginPath(); ctx.arc(q[0], q[1], k % 2 ? 1.1 : 1.8, 0, TWO_PI); ctx.fillStyle = rgba(255,230,178,.85*tw); ctx.fill();
    }
    ctx.restore();
  }

  function draw(i) {
    if(!i.host.isConnected) return;
    const {ctx,w,h,dpr}=i;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const cx=w*.5,cy=h*.44, pulse=.13+.04*Math.sin(i.time*.62);
    const glow=ctx.createRadialGradient(cx,cy,4,cx,cy,Math.min(w,h)*.55);
    glow.addColorStop(0,`rgba(255,228,174,${pulse})`);
    glow.addColorStop(.4,'rgba(151,176,145,.08)');
    glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.globalCompositeOperation='screen';
    if(i.mode==='rosette') drawRosette(i,ctx); else drawTorus(i,ctx);
    ctx.restore();
  }

  function updateButton(i) {
    if(!i.toggle) return;
    i.toggle.textContent = i.play ? 'Pause motion' : 'Play motion';
    i.toggle.setAttribute('aria-label',i.play ? 'Pause geometric animation' : 'Play geometric animation');
  }
  const motionEnabled=()=>!reduceMotion.matches&&document.documentElement.dataset.motion!=='reduced';
  function tick(now) {
    raf=0;
    const dt=last ? Math.min(.05,(now-last)/1000):.016; last=now;
    for(const i of all) {
      if(!i.host.isConnected) {
        i.resizeObs?.disconnect();i.intersectionObs?.disconnect();all.delete(i);continue;
      }
      if(!i.visible || document.hidden) continue;
      if(i.play && motionEnabled()) i.time += dt*i.speed*3.2;
      if(i.play && motionEnabled()) draw(i);
    }
    // Only schedule another frame when there is genuinely moving geometry.
    if([...all].some(i => i.play && i.visible && i.speed > 0 && motionEnabled() && !document.hidden)) raf=requestAnimationFrame(tick);
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
    render(){for(const i of all)draw(i);},
    refreshPreferences(){for(const i of all)draw(i);start();}
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
