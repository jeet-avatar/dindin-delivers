import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landing.css';

import {
  NAV, HERO, STATS, PROBLEM, HOW_IT_WORKS,
  BUILT_FOR_YOU, DEPLOY, FINAL_CTA, FOOTER,
} from '../data/landingContent';
import { SECTION_IDS } from '../lib/landingLinks';

gsap.registerPlugin(ScrollTrigger);

// Render a CTA — primary (filled) or ghost — honouring internal vs external hrefs.
function CtaLink({ cta, className = '', style }: {
  cta: { label: string; href: string; kind: 'primary' | 'ghost'; external?: boolean };
  className?: string;
  style?: CSSProperties;
}) {
  const cls = `l-btn ${cta.kind === 'primary' ? 'l-btn-primary' : 'l-btn-ghost'} ${className}`.trim();
  if (cta.external) {
    return <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{cta.label}</a>;
  }
  // Internal routes via react-router; hash links still use <a>
  if (cta.href.startsWith('#')) {
    return <a href={cta.href} className={cls} style={style}>{cta.label}</a>;
  }
  return <Link to={cta.href} className={cls} style={style}>{cta.label}</Link>;
}

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ── BODY BACKGROUND ──────────────────────────
    const prevBg       = document.body.style.background;
    const prevOverflow = document.body.style.overflowX;
    document.body.style.background  = '#030308';
    document.body.style.overflowX   = 'hidden';

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── THREE.JS SCENE ───────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 88);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x030308, 1);

    scene.fog = new THREE.FogExp2(0x030308, 0.006);

    // ── NEURAL INTELLIGENCE SCENE ─────────────────
    const neuralGroup = new THREE.Group();
    scene.add(neuralGroup);

    const NODE_COUNT   = 300;
    const nodePositions: THREE.Vector3[] = [];
    const nPos         = new Float32Array(NODE_COUNT * 3);

    for (let i = 0; i < NODE_COUNT; i++) {
      const r     = 38 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const x     = r * Math.sin(phi) * Math.cos(theta);
      const y     = r * Math.sin(phi) * Math.sin(theta) * 0.58;
      const z     = r * Math.cos(phi);
      nPos[i*3]=x; nPos[i*3+1]=y; nPos[i*3+2]=z;
      nodePositions.push(new THREE.Vector3(x, y, z));
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    const nodeMat = new THREE.PointsMaterial({ color: 0xa5b4fc, size: 1.0, transparent: true, opacity: 0.88 });
    neuralGroup.add(new THREE.Points(nodeGeo, nodeMat));

    const linePts: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 22) {
          linePts.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z,
          );
        }
      }
    }
    const neuralLineGeo = new THREE.BufferGeometry();
    neuralLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3));
    neuralGroup.add(new THREE.LineSegments(
      neuralLineGeo,
      new THREE.LineBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.20 }),
    ));

    neuralGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(16, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.035, wireframe: true }),
    ));

    const pulseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.72 }),
    );
    neuralGroup.add(pulseMesh);

    const pulseRing = new THREE.Mesh(
      new THREE.SphereGeometry(11, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.04, wireframe: true }),
    );
    neuralGroup.add(pulseRing);

    function makeOrb(r: number, g: number, b: number, size: number) {
      const c   = document.createElement('canvas');
      c.width   = c.height = 256;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(128,128,0,128,128,128);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.4, `rgba(${r},${g},${b},0.18)`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,256,256);
      const tex    = new THREE.CanvasTexture(c);
      const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(size, size, 1);
      return sprite;
    }
    const orb1 = makeOrb( 99,102,241, 300); orb1.position.set(-38, 28, -130); scene.add(orb1);
    const orb2 = makeOrb(139, 92,246, 220); orb2.position.set( 88,-24, -155); scene.add(orb2);
    const orb3 = makeOrb( 79, 70,229, 170); orb3.position.set(-85,-60, -110); scene.add(orb3);

    gsap.from(camera.position, { z: 115, duration: 3.4, ease: 'power3.out' });

    const scrollTriggerInstance = ScrollTrigger.create({
      start: 0, end: 'max', scrub: 1.8,
      onUpdate: self => {
        camera.position.z = 88 + self.progress * 32;
        camera.position.y = -self.progress * 14;
      },
    });

    let mx = 0, my = 0;
    const onMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    let t = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      t += 0.005;

      neuralGroup.rotation.y = t * 0.09;

      const pulseScale = 1 + Math.sin(t * 2.4) * 0.14;
      pulseMesh.scale.setScalar(pulseScale);
      (pulseMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 2.4) * 0.28;
      pulseRing.scale.setScalar(1 + Math.sin(t * 2.4 + 0.6) * 0.08);

      const p1 = 1 + Math.sin(t * 0.7) * 0.10;
      const p2 = 1 + Math.sin(t * 1.1 + 1.5) * 0.12;
      const p3 = 1 + Math.sin(t * 0.5 + 3.0) * 0.08;
      orb1.scale.set(300*p1, 300*p1, 1);
      orb2.scale.set(220*p2, 220*p2, 1);
      orb3.scale.set(170*p3, 170*p3, 1);
      orb1.position.x = -38 + Math.sin(t * 0.28) * 20;
      orb1.position.y =  28 + Math.sin(t * 0.52) * 12;
      orb2.position.x =  88 + Math.cos(t * 0.38) * 16;
      orb3.position.y = -60 + Math.sin(t * 0.22 + 2) * 14;

      camera.position.x += (mx * 8  - camera.position.x) * 0.025;
      camera.rotation.y  =  mx * -0.04;
      camera.rotation.x  =  my *  0.03;

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    gsap.to('#l-heroHeadline', { opacity:1, y:0, duration:1.1, ease:'power4.out', delay:.3 });
    gsap.to('.l-hero-sub',     { opacity:1, y:0, duration:1.0, ease:'power4.out', delay:.55 });
    gsap.to('.l-hero-btns',    { opacity:1, y:0, duration:1.0, ease:'power4.out', delay:.8 });
    gsap.to('#l-chatMockup',   { opacity:1, duration:1.2, ease:'power3.out', delay:.6 });

    document.querySelectorAll<HTMLElement>('.l-chat-line').forEach(line => {
      const delay = parseInt(line.dataset.delay || '0');
      setTimeout(() => line.classList.add('visible'), delay);
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        const val = e.target.querySelector<HTMLElement>('[data-target]');
        if (val && !(val as { _counted?: boolean })._counted) {
          (val as { _counted?: boolean })._counted = true;
          const target = +(val.dataset.target || 0);
          const suffix = val.dataset.suffix || '';
          let cur = 0;
          const step = target / 44;
          const id = setInterval(() => {
            cur = Math.min(cur + step, target);
            val.textContent = Math.floor(cur) + suffix;
            if (cur >= target) clearInterval(id);
          }, 28);
        }
      });
    }, { threshold: 0.14 });
    document.querySelectorAll('.l-reveal').forEach(el => io.observe(el));

    const onScroll = () => {
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
      const bar = document.getElementById('l-progress');
      if (bar) bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll);

    const onMockupTilt = (e: MouseEvent) => {
      const mockup = document.getElementById('l-chatMockup');
      if (!mockup) return;
      const rect = mockup.getBoundingClientRect();
      const dx   = (e.clientX - (rect.left + rect.width  / 2)) / rect.width  * 14;
      const dy   = (e.clientY - (rect.top  + rect.height / 2)) / rect.height *  9;
      mockup.style.transform = `perspective(1200px) rotateY(${-14+dx}deg) rotateX(${8-dy}deg)`;
    };
    document.addEventListener('mousemove', onMockupTilt);

    const dot  = document.getElementById('l-cDot');
    const ring = document.getElementById('l-cRing');
    let rx = 0, ry = 0;
    const onCursorMove = (e: MouseEvent) => {
      if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
      gsap.to({ x: rx, y: ry }, {
        x: e.clientX, y: e.clientY, duration: .18,
        onUpdate(this: gsap.core.Tween) {
          const target = this.targets()[0] as { x: number; y: number };
          if (ring) { ring.style.left = target.x + 'px'; ring.style.top = target.y + 'px'; }
          rx = target.x; ry = target.y;
        },
      });
    };
    window.addEventListener('mousemove', onCursorMove);

    document.querySelectorAll<HTMLElement>('a,.l-btn').forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (dot)  { dot.style.width  = '12px'; dot.style.height  = '12px'; }
        if (ring) { ring.style.width = '52px'; ring.style.height = '52px'; }
      });
      el.addEventListener('mouseleave', () => {
        if (dot)  { dot.style.width  = '6px'; dot.style.height  = '6px'; }
        if (ring) { ring.style.width = '32px'; ring.style.height = '32px'; }
      });
    });

    return () => {
      cancelAnimationFrame(animId);
      scrollTriggerInstance.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.killTweensOf('*');
      io.disconnect();
      renderer.dispose();
      nodeGeo.dispose();
      neuralLineGeo.dispose();
      nodeMat.dispose();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousemove', onCursorMove);
      document.removeEventListener('mousemove', onMockupTilt);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.body.style.background  = prevBg;
      document.body.style.overflowX   = prevOverflow;
    };
  }, []);

  const codeLine = HERO.mockup.lines.find(l => l.kind === 'code');

  return (
    <div className="landing-root">
      <div id="l-cDot"></div>
      <div id="l-cRing"></div>
      <div id="l-progress"></div>
      <div className="l-vignette"></div>
      <div className="l-noise"></div>

      <canvas id="threeCanvas" ref={canvasRef}></canvas>

      {/* ── NAV ── */}
      <nav className="l-nav">
        <span className="l-logo">{NAV.logo}</span>
        <div className="l-nav-links">
          {NAV.links.map(link => (
            link.internal
              ? <Link key={link.href} to={link.href}>{link.label}</Link>
              : <a  key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <Link to={NAV.login.href} style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px', fontWeight:500 }}>{NAV.login.label}</Link>
          <Link to={NAV.cta.href}   className="l-nav-cta">{NAV.cta.label}</Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div className="l-container">
          {/* ── HERO ── */}
          <div id="l-hero">
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.28)', borderRadius:'100px', padding:'6px 16px', marginBottom:'32px' }}>
                <span style={{ width:'6px', height:'6px', background:'#6366f1', borderRadius:'50%', display:'block', boxShadow:'0 0 8px #6366f1' }}></span>
                <span style={{ color:'#a5b4fc', fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>{HERO.eyebrow}</span>
              </div>
              <h1 id="l-heroHeadline">
                {HERO.headline.line1}<br />
                {HERO.headline.line2}<br />
                <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{HERO.headline.accent}</span>
              </h1>
              <p className="l-hero-sub">{HERO.subcopy}</p>
              <div className="l-hero-btns">
                {HERO.ctas.map(cta => <CtaLink key={cta.label} cta={cta} />)}
              </div>
            </div>
            <div className="l-chat-wrap">
              <div className="l-chat-mockup" id="l-chatMockup">
                <div style={{ fontSize:'10px', letterSpacing:'.14em', textTransform:'uppercase', color:'#6366f1', marginBottom:'22px', fontFamily:'DM Sans,sans-serif', fontWeight:700 }}>
                  {HERO.mockup.header}
                </div>
                <div className="l-chat-line" data-delay={HERO.mockup.lines[0].delay}>
                  <span style={{ color:'#6366f1', fontWeight:700 }}>[YOU]</span>
                  &nbsp; {HERO.mockup.lines[0].text}
                </div>
                <div className="l-chat-line" data-delay={HERO.mockup.lines[1].delay} style={{ color:'#a1a1aa' }}>
                  {HERO.mockup.lines[1].text}
                </div>
                {codeLine && (
                  <div className="l-chat-line" data-delay={codeLine.delay}>
                    <div className="l-code-block">
                      {'/** @NApiVersion 2.1 */'}<br />
                      {'export function afterSubmit(ctx) {'}<br />
                      &nbsp;&nbsp;{'if (ctx.newRecord.getValue("approvalstatus") === "approved") {'}<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'email.send({ to: vendor.email, subject: "PO #" + id + " Approved" });'}<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;{'inventory.updateLedger(ctx.newRecord);'}<br />
                      &nbsp;&nbsp;{'}'}<br />
                      {'}'}
                    </div>
                  </div>
                )}
                <div className="l-chat-line" data-delay={HERO.mockup.lines[3].delay} style={{ color:'#4ade80', fontWeight:700 }}>
                  {HERO.mockup.lines[3].text}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main>
          {/* ── STATS ── */}
          <section className="l-section" style={{ minHeight:'auto', padding:'0 0 96px' }}>
            <div className="l-container">
              <div className="l-stats-grid">
                {STATS.map((s, i) => (
                  <div key={s.label} className="l-stat-card l-reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                    <span className="l-stat-val" {...(s.target ? { 'data-target': s.target, 'data-suffix': s.suffix } : {})}>{s.value}</span>
                    <p style={{ color:'#A1A1AA', fontSize:'11px', letterSpacing:'.1em', textTransform:'uppercase' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PROBLEM + COMPARISON ── */}
          <section className="l-section" id={SECTION_IDS.problem}>
            <div className="l-container">
              <span className="l-section-tag">{PROBLEM.eyebrow}</span>
              <h2 className="l-section-title l-reveal">
                {PROBLEM.title.prefix}<br />
                <span style={{ color:'#f87171' }}>{PROBLEM.title.accent}</span>
              </h2>
              <div className="l-two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'48px', alignItems:'center' }}>
                <div className="l-reveal" style={{ transitionDelay:'.1s' }}>
                  {PROBLEM.copy.map((p, i) => (
                    <p key={i} style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.75, marginBottom: i === PROBLEM.copy.length - 1 ? '32px' : '24px' }}>{p}</p>
                  ))}
                  <CtaLink cta={PROBLEM.cta} />
                </div>
                <div className="l-reveal" style={{ transitionDelay:'.2s' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {PROBLEM.comparison.map((row, i) => (
                      <div key={i} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center', gap:'18px',
                        background: row.bad ? 'rgba(239,68,68,0.06)' : 'rgba(99,102,241,0.12)',
                        border: `1px solid ${row.bad ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.4)'}`,
                        borderRadius:'14px', padding:'18px 22px',
                      }}>
                        <span style={{ fontWeight:600, color: row.bad ? '#F4F4F5' : '#a5b4fc', fontSize:'14px' }}>{row.label}</span>
                        <span style={{ fontWeight:700, color: row.bad ? '#f87171' : '#4ade80', fontSize:'13px', textAlign:'right' }}>{row.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="l-section" id={SECTION_IDS.howItWorks}>
            <div className="l-container">
              <span className="l-section-tag">{HOW_IT_WORKS.eyebrow}</span>
              <h2 className="l-section-title l-reveal">
                {HOW_IT_WORKS.title.prefix}<br />
                <span style={{ color:'#6366F1' }}>{HOW_IT_WORKS.title.accent}</span>
              </h2>
              <div className="l-bento-grid">
                {HOW_IT_WORKS.cards.map((card, i) => (
                  <div key={card.title} className={`l-bento-card ${card.wide ? 'wide' : ''} l-reveal`} style={{ transitionDelay:`${i * 0.08}s` }}>
                    <div className="l-bento-icon">
                      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d={card.iconPath} /></svg>
                    </div>
                    <h3 style={{ fontSize: card.wide ? '26px' : '21px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>{card.title}</h3>
                    <p style={{ color:'#A1A1AA', lineHeight:1.75 }}>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── BUILT FOR YOU (who + security merged) ── */}
          <section className="l-section" id={SECTION_IDS.builtFor}>
            <div className="l-container" style={{ textAlign:'center' }}>
              <span className="l-section-tag" style={{ display:'block' }}>{BUILT_FOR_YOU.eyebrow}</span>
              <h2 className="l-section-title l-reveal" style={{ maxWidth:'780px', margin:'0 auto 20px' }}>
                {BUILT_FOR_YOU.title.prefix}<br />
                <span style={{ color:'#6366F1' }}>{BUILT_FOR_YOU.title.accent}</span>
              </h2>
              <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.7, maxWidth:'640px', margin:'0 auto 60px', transitionDelay:'.1s' }}>
                {BUILT_FOR_YOU.subcopy}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'18px' }}>
                {BUILT_FOR_YOU.cards.map((card, i) => (
                  <div key={card.title} className="l-bento-card l-reveal" style={{ transitionDelay:`${i * 0.08}s`, textAlign:'left', gridAutoRows:'auto' }}>
                    <div style={{ fontSize:'30px', marginBottom:'14px' }}>{card.icon}</div>
                    <div style={{ display:'inline-block', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'100px', padding:'4px 12px', fontSize:'10px', fontWeight:700, color:'#a5b4fc', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'14px' }}>{card.tag}</div>
                    <h4 style={{ fontSize:'17px', marginBottom:'10px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>{card.title}</h4>
                    <p style={{ color:'#A1A1AA', fontSize:'13.5px', lineHeight:1.7 }}>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── DEPLOY ── */}
          <section className="l-section" id={SECTION_IDS.deploy}>
            <div className="l-container">
              <div style={{ textAlign:'center', marginBottom:'56px' }}>
                <span className="l-section-tag" style={{ display:'block' }}>{DEPLOY.eyebrow}</span>
                <h2 className="l-section-title l-reveal" style={{ maxWidth:'820px', margin:'0 auto 20px' }}>
                  {DEPLOY.title.prefix}<br />
                  <span style={{ color:'#6366F1' }}>{DEPLOY.title.accent}</span>
                </h2>
                <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'17px', lineHeight:1.75, maxWidth:'620px', margin:'0 auto', transitionDelay:'.1s' }}>
                  {DEPLOY.subcopy}
                </p>
              </div>

              <div className="l-reveal" style={{ transitionDelay:'.2s' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'18px', position:'relative' }}>
                  <div style={{ position:'absolute', top:'32px', left:'calc(12.5% + 10px)', right:'calc(12.5% + 10px)', height:'2px', background:'linear-gradient(90deg,rgba(99,102,241,.4),rgba(139,92,246,.4))', zIndex:0 }}></div>
                  {DEPLOY.steps.map(s => (
                    <div key={s.step} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px 20px', position:'relative', zIndex:1 }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(99,102,241,0.15)', border:'2px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'14px', fontSize:'20px' }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize:'10px', fontWeight:800, color:'#6366f1', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:'6px' }}>Step {s.step}</div>
                      <h4 style={{ fontSize:'15px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5', marginBottom:'8px', lineHeight:1.4 }}>{s.title}</h4>
                      <p style={{ color:'#A1A1AA', fontSize:'12.5px', lineHeight:1.65 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="l-reveal" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'32px', marginTop:'48px', transitionDelay:'.3s', flexWrap:'wrap' }}>
                {DEPLOY.clouds.map((c, i) => (
                  <div key={c.name} style={{ display:'flex', alignItems:'center', gap:'32px' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ width:'52px', height:'52px', borderRadius:'13px', background:`${c.color}14`, border:`1px solid ${c.color}3F`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:'24px' }}>{c.icon}</div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:c.color, letterSpacing:'.08em' }}>{c.name}</div>
                      <div style={{ fontSize:'11px', color:'#52525b', marginTop:'4px' }}>{c.detail}</div>
                    </div>
                    {i < DEPLOY.clouds.length - 1 && <div style={{ color:'#3f3f46', fontSize:'22px', fontWeight:300 }}>·</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section id={SECTION_IDS.cta} style={{ padding:'120px 0', textAlign:'center', position:'relative', zIndex:10, overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(99,102,241,.14) 0%,transparent 68%)', pointerEvents:'none' }}></div>
            <div className="l-container" style={{ position:'relative' }}>
              <h2 className="l-section-title l-reveal" style={{ fontSize:'clamp(44px,6vw,84px)', letterSpacing:'-.045em' }}>
                {FINAL_CTA.headline.prefix}<br /><span style={{ color:'#6366F1' }}>{FINAL_CTA.headline.accent}</span>
              </h2>
              <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'19px', maxWidth:'600px', margin:'0 auto 40px', lineHeight:1.7, transitionDelay:'.1s' }}>
                {FINAL_CTA.subcopy}
              </p>
              <div className="l-reveal l-cta-btns" style={{ display:'flex', gap:'16px', justifyContent:'center', transitionDelay:'.2s', flexWrap:'wrap' }}>
                {FINAL_CTA.ctas.map(cta => (
                  <CtaLink key={cta.label} cta={cta} style={{ fontSize:'17px', height:'62px', padding:'0 44px' }} />
                ))}
              </div>
              <p className="l-reveal" style={{ color:'#52525b', fontSize:'13px', marginTop:'24px', transitionDelay:'.3s' }}>
                {FINAL_CTA.footnote}
              </p>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="l-footer">
            <div className="l-container">
              <div className="l-footer-cols" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'64px' }}>
                <div>
                  <div className="l-logo" style={{ marginBottom:'18px' }}>{NAV.logo}</div>
                  <p style={{ color:'#A1A1AA', lineHeight:1.8, maxWidth:'340px', fontSize:'14.5px', marginBottom:'14px' }}>{FOOTER.tagline}</p>
                  <p style={{ color:'#52525b', fontSize:'13px' }}>{FOOTER.attribution}</p>
                </div>
                {FOOTER.columns.map(col => (
                  <div key={col.heading}>
                    <h4 style={{ marginBottom:'18px', fontSize:'13px', textTransform:'uppercase', letterSpacing:'.1em', color:'#fff' }}>{col.heading}</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
                      {col.links.map(link => (
                        link.internal
                          ? <Link key={link.label} to={link.href}  style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>{link.label}</Link>
                          : link.external
                            ? <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>{link.label}</a>
                            : <a key={link.label} href={link.href} style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>{link.label}</a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="l-footer-bar" style={{ marginTop:'64px', paddingTop:'28px', borderTop:'1px solid rgba(99,102,241,.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
                <p style={{ color:'#52525b', fontSize:'13px' }}>{FOOTER.copyright}</p>
                <p style={{ color:'#52525b', fontSize:'13px' }}>{FOOTER.disclaimer}</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
