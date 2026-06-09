import React, {useRef, useEffect} from 'react';

export default function ParticleCanvas({pathStrings = [], activeFlags = []}){
  const ref = useRef(null);
  useEffect(()=>{
    const canvas = ref.current; if(!canvas) return;
    const ctx = canvas.getContext('2d'); let raf;
    const DPR = window.devicePixelRatio || 1;
    let width = 0, height = 0;
    function resize(){ width = canvas.clientWidth; height = canvas.clientHeight; canvas.width = Math.max(1, Math.floor(width * DPR)); canvas.height = Math.max(1, Math.floor(height * DPR)); ctx.setTransform(DPR,0,0,DPR,0,0); }
    resize(); window.addEventListener('resize', resize);

    // create hidden SVG paths to use getPointAtLength
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg'); svg.setAttribute('width','0'); svg.setAttribute('height','0'); svg.style.position='absolute'; svg.style.left='-9999px'; svg.style.top='-9999px'; svg.setAttribute('aria-hidden','true'); document.body.appendChild(svg);
    const paths = pathStrings.map(d=>{ const p = document.createElementNS(svgNS,'path'); p.setAttribute('d', d); svg.appendChild(p); return {el:p, len: (p.getTotalLength? p.getTotalLength() : 0)}; });

    const palette = ['#06b6d4','#00bfff','#7c3aed','#ec4899'];
    const particles = [];
    const NUM = Math.min(120, Math.max(24, Math.floor((pathStrings.length||1)*12)));
    for(let i=0;i<NUM;i++){
      const pi = Math.max(0, Math.floor(Math.random() * Math.max(1, paths.length)));
      particles.push({ pathIndex: pi, t: Math.random(), speed: 0.002 + Math.random()*0.006, size: 1 + Math.random()*2, color: palette[i % palette.length], pulse:0 });
    }

    function draw(){
      // fade canvas slightly to create trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2,4,8,0.12)';
      ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR);

      ctx.globalCompositeOperation = 'lighter';
      for(const p of particles){
        const path = paths[p.pathIndex];
        if(!path || !path.len) continue;
        // speed up if this path is active
        const active = !!(activeFlags && activeFlags[p.pathIndex]);
        p.t += p.speed * (active ? 3.5 : 1);
        if(p.t >= 1){
          p.t = 0;
          p.pulse = 8; // frames of pulse
        }
        const pos = path.el.getPointAtLength(p.t * path.len);
        // draw trailing segments for motion blur
        for(let k=0;k<3;k++){
          const tt = Math.max(0, p.t - k*0.02);
          const pt = path.el.getPointAtLength(tt * path.len);
          const alpha = (1 - k*0.3) * (active ? 0.95 : 0.6) * (1 - k*0.2);
          const size = p.size * (1 - k*0.25) + (p.pulse? (p.pulse*0.2) : 0);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, Math.max(8, size*6));
          grad.addColorStop(0, hexToRgba(p.color, 0.95 * alpha));
          grad.addColorStop(0.5, hexToRgba('#ffffff', 0.25 * alpha));
          grad.addColorStop(1, hexToRgba(p.color, 0.02 * alpha));
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, size*2, 0, Math.PI*2); ctx.fill();
        }
        if(p.pulse>0) p.pulse = Math.max(0, p.pulse - 1);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    function hexToRgba(hex, a){
      const h = hex.replace('#',''); const bigint = parseInt(h,16); const r = (bigint>>16)&255; const g=(bigint>>8)&255; const b=bigint&255; return `rgba(${r},${g},${b},${a})`;
    }

    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize', resize); try{ document.body.removeChild(svg); }catch(e){} };
  },[pathStrings, JSON.stringify(activeFlags)]);

  return <canvas ref={ref} className="particle-canvas" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} />;
}
