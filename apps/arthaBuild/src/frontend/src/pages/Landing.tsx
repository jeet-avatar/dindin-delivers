import React, { useEffect, useRef } from 'react';
import HallucinationComparison from '../components/HallucinationComparison';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

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

    // Fog
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
    const nodeMat = new THREE.PointsMaterial({
      color: 0xa5b4fc, size: 1.0, transparent: true, opacity: 0.88,
    });
    neuralGroup.add(new THREE.Points(nodeGeo, nodeMat));

    // Connections — edges between close nodes
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

    // Central wireframe glow
    neuralGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(16, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.035, wireframe: true }),
    ));

    // Pulse core
    const pulseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.72 }),
    );
    neuralGroup.add(pulseMesh);

    // Outer pulse ring
    const pulseRing = new THREE.Mesh(
      new THREE.SphereGeometry(11, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.04, wireframe: true }),
    );
    neuralGroup.add(pulseRing);

    // ── NEBULA ORBS ──────────────────────────────────
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

    // ── CAMERA CINEMATIC INTRO ──────────────────────
    gsap.from(camera.position, { z: 115, duration: 3.4, ease: 'power3.out' });

    // ── SCROLL: slow pull-back ─────────────────────
    const scrollTriggerInstance = ScrollTrigger.create({
      start: 0, end: 'max', scrub: 1.8,
      onUpdate: self => {
        camera.position.z = 88 + self.progress * 32;
        camera.position.y = -self.progress * 14;
      },
    });

    // ── MOUSE PARALLAX ─────────────────────────────
    let mx = 0, my = 0;
    const onMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── RENDER LOOP ────────────────────────────────
    let t = 0;
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      t += 0.005;

      // Neural group slow rotation
      neuralGroup.rotation.y = t * 0.09;

      // Pulse core
      const pulseScale = 1 + Math.sin(t * 2.4) * 0.14;
      pulseMesh.scale.setScalar(pulseScale);
      (pulseMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 2.4) * 0.28;
      pulseRing.scale.setScalar(1 + Math.sin(t * 2.4 + 0.6) * 0.08);

      // Orb drift
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

      // Camera parallax
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

    // ── GSAP PAGE ANIMATIONS ──────────────────────
    gsap.to('#l-heroHeadline', { opacity:1, y:0, duration:1.1, ease:'power4.out', delay:.3 });
    gsap.to('.l-hero-sub',     { opacity:1, y:0, duration:1.0, ease:'power4.out', delay:.55 });
    gsap.to('.l-hero-btns',    { opacity:1, y:0, duration:1.0, ease:'power4.out', delay:.8 });
    gsap.to('#l-chatMockup',   { opacity:1, duration:1.2, ease:'power3.out', delay:.6 });

    // Chat lines
    document.querySelectorAll<HTMLElement>('.l-chat-line').forEach(line => {
      const delay = parseInt(line.dataset.delay || '0');
      setTimeout(() => line.classList.add('visible'), delay);
    });

    // Scroll reveals
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        const val = e.target.querySelector<HTMLElement>('[data-target]');
        if (val && !(val as any)._counted) {
          (val as any)._counted = true;
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

    // Scroll progress bar
    const onScroll = () => {
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
      const bar = document.getElementById('l-progress');
      if (bar) bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll);

    // 3D tilt on chat mockup
    const onMockupTilt = (e: MouseEvent) => {
      const mockup = document.getElementById('l-chatMockup');
      if (!mockup) return;
      const rect = mockup.getBoundingClientRect();
      const dx   = (e.clientX - (rect.left + rect.width  / 2)) / rect.width  * 14;
      const dy   = (e.clientY - (rect.top  + rect.height / 2)) / rect.height *  9;
      mockup.style.transform = `perspective(1200px) rotateY(${-14+dx}deg) rotateX(${8-dy}deg)`;
    };
    document.addEventListener('mousemove', onMockupTilt);

    // Custom cursor
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

    // ── CLEANUP ───────────────────────────────────
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

  return (
    <div className="landing-root">
      {/* Fixed overlays */}
      <div id="l-cDot"></div>
      <div id="l-cRing"></div>
      <div id="l-progress"></div>
      <div className="l-vignette"></div>
      <div className="l-noise"></div>

      {/* Three.js neural canvas */}
      <canvas id="threeCanvas" ref={canvasRef}></canvas>

      {/* Nav */}
      <nav className="l-nav">
        <span className="l-logo">ArthaBuild</span>
        <div className="l-nav-links">
          <a href="#problem">The Problem</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#security">Security</a>
          <a href="#deploy">How We Deploy</a>
          <a href="#plans">Pricing</a>
          <Link to="/solutions">Solutions</Link>
          <Link to="/blog">Blog</Link>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <Link to="/log-in" style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px', fontWeight:500 }}>Log in</Link>
          <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-nav-cta">Get a Demo</a>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div className="l-container">
          {/* ── HERO ── */}
          <div id="l-hero">
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.28)', borderRadius:'100px', padding:'6px 16px', marginBottom:'32px' }}>
                <span style={{ width:'6px', height:'6px', background:'#6366f1', borderRadius:'50%', display:'block', boxShadow:'0 0 8px #6366f1' }}></span>
                <span style={{ color:'#a5b4fc', fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>NetSuite Automation for Small Business</span>
              </div>
              <h1 id="l-heroHeadline">
                Automate<br />
                NetSuite.<br />
                <span style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Cut Costs 80%.</span>
              </h1>
              <p className="l-hero-sub">
                Stop paying <strong style={{ color:'#fff' }}>$150–$250/hr</strong> for NetSuite developers.
                ArthaBuild turns your plain-English business requirements into
                deployed SuiteScript — in seconds. No developer. No consultant.
                No waiting.
              </p>
              <div className="l-hero-btns">
                <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-primary">
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Get a Demo
                </a>
                <a href="#how-it-works" className="l-btn l-btn-ghost">Watch It Work →</a>
              </div>
            </div>
            <div className="l-chat-wrap">
              <div className="l-chat-mockup" id="l-chatMockup">
                <div style={{ fontSize:'10px', letterSpacing:'.14em', textTransform:'uppercase', color:'#6366f1', marginBottom:'22px', fontFamily:'DM Sans,sans-serif', fontWeight:700 }}>
                  ArthaBuild &nbsp;·&nbsp; NetSuite AI
                </div>
                <div className="l-chat-line" data-delay="700">
                  <span style={{ color:'#6366f1', fontWeight:700 }}>[YOU]</span>
                  &nbsp; When a PO is approved, auto-email the vendor and update the inventory ledger.
                </div>
                <div className="l-chat-line" data-delay="1800" style={{ color:'#a1a1aa' }}>
                  Generating PO approval workflow + vendor notification script…
                </div>
                <div className="l-chat-line" data-delay="3200">
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
                <div className="l-chat-line" data-delay="5200" style={{ color:'#4ade80', fontWeight:700 }}>
                  ✓ Script validated. Deployed to Sandbox in 9 seconds.
                </div>
              </div>
            </div>
          </div>
        </div>

        <main>
          {/* ── STATS ── */}
          <section className="l-section" style={{ minHeight:'auto', padding:'0 0 120px' }}>
            <div className="l-container">
              <div className="l-stats-grid">
                <div className="l-stat-card l-reveal">
                  <span className="l-stat-val" data-target="80" data-suffix="%">0%</span>
                  <p style={{ color:'#A1A1AA', fontSize:'11px', letterSpacing:'.1em', textTransform:'uppercase' }}>Cost Reduction</p>
                </div>
                <div className="l-stat-card l-reveal" style={{ transitionDelay:'.1s' }}>
                  <span className="l-stat-val">{'<'}30s</span>
                  <p style={{ color:'#A1A1AA', fontSize:'11px', letterSpacing:'.1em', textTransform:'uppercase' }}>Deploy Time</p>
                </div>
                <div className="l-stat-card l-reveal" style={{ transitionDelay:'.2s' }}>
                  <span className="l-stat-val">$0</span>
                  <p style={{ color:'#A1A1AA', fontSize:'11px', letterSpacing:'.1em', textTransform:'uppercase' }}>Developer Fees</p>
                </div>
                <div className="l-stat-card l-reveal" style={{ transitionDelay:'.3s' }}>
                  <span className="l-stat-val">24/7</span>
                  <p style={{ color:'#A1A1AA', fontSize:'11px', letterSpacing:'.1em', textTransform:'uppercase' }}>Always Available</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── THE PROBLEM ── */}
          <section className="l-section" id="problem">
            <div className="l-container">
              <span className="l-section-tag">The NetSuite Tax</span>
              <h2 className="l-section-title l-reveal">
                Great software.<br />
                <span style={{ color:'#f87171' }}>Brutal price to customise.</span>
              </h2>
              <div className="l-two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'48px', alignItems:'center' }}>
                <div className="l-reveal" style={{ transitionDelay:'.1s' }}>
                  <p style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.75, marginBottom:'32px' }}>
                    NetSuite is one of the most powerful ERP platforms on earth — but unlocking that power has always
                    required expensive specialists that small businesses simply cannot afford to keep on staff.
                  </p>
                  <p style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.75, marginBottom:'40px' }}>
                    The average automation script takes a consultant <strong style={{ color:'#fff' }}>4–8 hours</strong> to build.
                    At $200/hr, that's <strong style={{ color:'#f87171' }}>$800–$1,600 for a single workflow</strong> — before revisions.
                    ArthaBuild builds the same script in under a minute, every time.
                  </p>
                  <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-primary">Book a Demo Call →</a>
                </div>
                <div className="l-reveal" style={{ transitionDelay:'.2s' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {[
                      { label:'NetSuite Developer (hire)', cost:'$120,000–$180,000/yr', bad:true },
                      { label:'NetSuite Consultant (hourly)', cost:'$150–$250/hr', bad:true },
                      { label:'Implementation Partner', cost:'$20,000–$80,000/project', bad:true },
                      { label:'ArthaBuild', cost:'One flat monthly fee', bad:false },
                    ].map((row, i) => (
                      <div key={i} style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        background: row.bad ? 'rgba(239,68,68,0.06)' : 'rgba(99,102,241,0.12)',
                        border: `1px solid ${row.bad ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.4)'}`,
                        borderRadius:'14px', padding:'18px 24px',
                      }}>
                        <span style={{ fontWeight:600, color: row.bad ? '#F4F4F5' : '#a5b4fc', fontSize:'14px' }}>{row.label}</span>
                        <span style={{ fontWeight:700, color: row.bad ? '#f87171' : '#4ade80', fontSize:'14px' }}>{row.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── VS CHATGPT ── */}
          <section className="l-section" id="vs-chatgpt">
            <HallucinationComparison />
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="l-section" id="how-it-works">
            <div className="l-container">
              <span className="l-section-tag">How ArthaBuild Works</span>
              <h2 className="l-section-title l-reveal">
                Describe it in English.<br />
                <span style={{ color:'#6366F1' }}>Deploy it in seconds.</span>
              </h2>
              <div className="l-bento-grid">
                <div className="l-bento-card wide l-reveal">
                  <div className="l-bento-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h3 style={{ fontSize:'26px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Ask in Plain English</h3>
                  <p style={{ color:'#A1A1AA', lineHeight:1.75 }}>
                    No coding. No SuiteScript syntax. No manuals. Just describe what your business
                    needs — "send a Slack alert when inventory drops below reorder point" — and
                    ArthaBuild writes the production-ready script automatically. 203,618 NetSuite
                    knowledge chunks power every answer.
                  </p>
                </div>
                <div className="l-bento-card l-reveal" style={{ transitionDelay:'.1s' }}>
                  <div className="l-bento-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83"/></svg>
                  </div>
                  <h3 style={{ fontSize:'21px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Schema-Aware Intelligence</h3>
                  <p style={{ color:'#A1A1AA', lineHeight:1.75 }}>Understands YOUR custom records, fields, and workflows — not just the generic NetSuite.</p>
                </div>
                <div className="l-bento-card wide l-reveal" style={{ transitionDelay:'.15s' }}>
                  <div className="l-bento-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/></svg>
                  </div>
                  <h3 style={{ fontSize:'26px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>One-Click Sandbox Deployment</h3>
                  <p style={{ color:'#A1A1AA', lineHeight:1.75 }}>
                    Push audited SuiteScript directly to your NetSuite staging environment from the
                    chat window. No CLI. No manual upload. TBA credentials secured in RAM only —
                    never written to disk, never logged.
                  </p>
                </div>
                <div className="l-bento-card l-reveal" style={{ transitionDelay:'.2s' }}>
                  <div className="l-bento-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  </div>
                  <h3 style={{ fontSize:'21px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Governor-Limit Safe Code</h3>
                  <p style={{ color:'#A1A1AA', lineHeight:1.75 }}>Every script is pre-checked for NetSuite governance rules, usage limits, and best practices.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── WHO IS IT FOR ── */}
          <section className="l-section" id="who">
            <div className="l-container" style={{ textAlign:'center' }}>
              <span className="l-section-tag" style={{ display:'block' }}>Built For You</span>
              <h2 className="l-section-title l-reveal" style={{ maxWidth:'760px', margin:'0 auto 20px' }}>
                The right tool whether you're a<br />
                <span style={{ color:'#6366F1' }}>founder, operator, or consultant.</span>
              </h2>
              <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.7, maxWidth:'640px', margin:'0 auto 72px', transitionDelay:'.1s' }}>
                You don't need to write a single line of SuiteScript. You just need to know your business.
              </p>
              <div className="l-three-col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'20px' }}>
                {[
                  {
                    icon:'🏢',
                    role:'Small Business Owner',
                    quote:'"I cancelled our $8,500/month consultant contract on day 30. ArthaBuild handles everything they used to do — in seconds."',
                    tag:'Saves $100k+/yr',
                  },
                  {
                    icon:'⚡',
                    role:'Operations Manager',
                    quote:'"Our team went from waiting 3 weeks for dev sprints to shipping automations in-house the same afternoon."',
                    tag:'Moves 10x Faster',
                  },
                  {
                    icon:'💼',
                    role:'NetSuite Consultant',
                    quote:'"I use ArthaBuild to build what used to take me 2 days in under an hour. My client capacity tripled."',
                    tag:'3x Client Throughput',
                  },
                ].map((card, i) => (
                  <div key={i} className="l-bento-card l-reveal" style={{ transitionDelay:`${i * 0.12}s`, textAlign:'left', gridAutoRows:'auto' }}>
                    <div style={{ fontSize:'36px', marginBottom:'18px' }}>{card.icon}</div>
                    <div style={{ display:'inline-block', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'100px', padding:'4px 14px', fontSize:'11px', fontWeight:700, color:'#a5b4fc', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'18px' }}>{card.tag}</div>
                    <h4 style={{ fontSize:'18px', marginBottom:'14px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>{card.role}</h4>
                    <p style={{ color:'#A1A1AA', fontSize:'14px', lineHeight:1.75, fontStyle:'italic' }}>{card.quote}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── SECURITY ── */}
          <section className="l-section" id="security">
            <div className="l-container" style={{ textAlign:'center' }}>
              <span className="l-section-tag" style={{ display:'block' }}>Zero Trust Architecture</span>
              <h2 className="l-section-title l-reveal" style={{ maxWidth:'700px', margin:'0 auto 24px' }}>
                Your data never<br /><span style={{ color:'#f87171' }}>leaves your server.</span>
              </h2>
              <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.7, maxWidth:'600px', margin:'0 auto 60px', transitionDelay:'.1s' }}>
                Every deployment is private — running on your own infrastructure.
                Local AI inference. No shared cloud. No data harvesting. Air-gapped by design.
              </p>
              <div className="l-sec-grid l-reveal" style={{ transitionDelay:'.2s' }}>
                <div className="l-sec-card">
                  <div style={{ fontSize:'30px', marginBottom:'14px' }}>🔒</div>
                  <h4 style={{ marginBottom:'10px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Local AI Inference</h4>
                  <p style={{ color:'#A1A1AA', fontSize:'14px', lineHeight:1.7 }}>Ollama runs llama3.1:8b entirely on your hardware. Zero calls to OpenAI, Anthropic, or any external service.</p>
                </div>
                <div className="l-sec-card">
                  <div style={{ fontSize:'30px', marginBottom:'14px' }}>🛡️</div>
                  <h4 style={{ marginBottom:'10px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Memory-Only Credentials</h4>
                  <p style={{ color:'#A1A1AA', fontSize:'14px', lineHeight:1.7 }}>NetSuite TBA tokens live in RAM only. Session ends, they're gone. Never written to disk or logs.</p>
                </div>
                <div className="l-sec-card">
                  <div style={{ fontSize:'30px', marginBottom:'14px' }}>⚡</div>
                  <h4 style={{ marginBottom:'10px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>BYOC Deployment</h4>
                  <p style={{ color:'#A1A1AA', fontSize:'14px', lineHeight:1.7 }}>Bring Your Own Cloud — one Docker Compose file drops into your AWS account in minutes. SOC2-ready architecture.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── HOW WE DEPLOY ── */}
          <section className="l-section" id="deploy">
            <div className="l-container">
              <div style={{ textAlign:'center', marginBottom:'72px' }}>
                <span className="l-section-tag" style={{ display:'block' }}>Deployment Model</span>
                <h2 className="l-section-title l-reveal" style={{ maxWidth:'820px', margin:'0 auto 24px' }}>
                  We deploy inside<br />
                  <span style={{ color:'#6366F1' }}>your cloud. Not ours.</span>
                </h2>
                <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'18px', lineHeight:1.75, maxWidth:'600px', margin:'0 auto', transitionDelay:'.1s' }}>
                  ArthaBuild provisions a private instance directly inside your AWS, GCP, or Azure account.
                  Your data never leaves your VPC. Your team owns the infrastructure.
                  We handle the setup — you stay in control.
                </p>
              </div>

              {/* Two-column: traditional SaaS vs ArthaBuild */}
              <div className="l-reveal l-two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'72px', transitionDelay:'.15s' }}>
                {/* Traditional SaaS */}
                <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:'20px', padding:'36px' }}>
                  <div style={{ fontSize:'11px', fontWeight:800, letterSpacing:'.16em', textTransform:'uppercase', color:'#f87171', marginBottom:'24px' }}>Traditional SaaS AI Tool</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {[
                      'Your NetSuite data → their cloud servers',
                      'Shared multi-tenant infrastructure',
                      'Their engineers can see your prompts',
                      'Outage = your team is blocked',
                      'Contract lock-in, vendor dependency',
                    ].map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'12px', color:'#A1A1AA', fontSize:'15px', lineHeight:1.6 }}>
                        <span style={{ color:'#f87171', flexShrink:0, marginTop:'2px' }}>✗</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ArthaBuild */}
                <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:'20px', padding:'36px' }}>
                  <div style={{ fontSize:'11px', fontWeight:800, letterSpacing:'.16em', textTransform:'uppercase', color:'#a5b4fc', marginBottom:'24px' }}>ArthaBuild — Your Private Instance</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {[
                      'Runs entirely inside your AWS or GCP VPC',
                      'Dedicated compute — zero shared infrastructure',
                      'Local AI: Ollama + llama3.1 on your GPU',
                      'Your team controls uptime, backups, scaling',
                      'Cancel anytime — you keep the instance',
                    ].map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'12px', color:'#A1A1AA', fontSize:'15px', lineHeight:1.6 }}>
                        <span style={{ color:'#4ade80', flexShrink:0, marginTop:'2px' }}>✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deployment steps */}
              <div className="l-reveal" style={{ transitionDelay:'.2s' }}>
                <p style={{ textAlign:'center', color:'#6366f1', fontSize:'11px', fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:'40px' }}>How The Provisioning Works</p>
                <div className="l-four-col" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'20px', position:'relative' }}>
                  {/* Connecting line */}
                  <div style={{ position:'absolute', top:'32px', left:'calc(12.5% + 10px)', right:'calc(12.5% + 10px)', height:'2px', background:'linear-gradient(90deg,rgba(99,102,241,.4),rgba(139,92,246,.4))', zIndex:0 }}></div>
                  {[
                    {
                      step:'01',
                      icon:'🔑',
                      title:'You Create an IAM Role',
                      desc:'Grant ArthaBuild a least-privilege IAM role (AWS), Service Account (GCP), or App Registration (Azure). Scoped only to provision one VM.',
                    },
                    {
                      step:'02',
                      icon:'⚙️',
                      title:'We Provision the Instance',
                      desc:'We spin up a GPU-enabled VM (g5.xlarge on AWS, A100 on GCP, NC-series on Azure) inside your VPC and region. No data crosses regions.',
                    },
                    {
                      step:'03',
                      icon:'🐳',
                      title:'Docker Compose Deploys',
                      desc:'ArthaBuild + Ollama + nginx run as a single Compose stack. Your subdomain points to the instance. Live in under 20 minutes.',
                    },
                    {
                      step:'04',
                      icon:'🚀',
                      title:'Your Team Goes Live',
                      desc:'Invite your team. Connect your NetSuite TBA credentials. Every AI inference call stays 100% inside your VPC.',
                    },
                  ].map((s, i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'28px 22px', position:'relative', zIndex:1 }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(99,102,241,0.15)', border:'2px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px', fontSize:'20px' }}>
                        {s.icon}
                      </div>
                      <div style={{ fontSize:'10px', fontWeight:800, color:'#6366f1', letterSpacing:'.14em', textTransform:'uppercase', marginBottom:'8px' }}>Step {s.step}</div>
                      <h4 style={{ fontSize:'15px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5', marginBottom:'10px', lineHeight:1.4 }}>{s.title}</h4>
                      <p style={{ color:'#A1A1AA', fontSize:'13px', lineHeight:1.7 }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloud logos */}
              <div className="l-reveal" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'40px', marginTop:'64px', transitionDelay:'.3s', flexWrap:'wrap' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'rgba(255,153,0,0.1)', border:'1px solid rgba(255,153,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:'26px' }}>☁️</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#FF9900', letterSpacing:'.08em' }}>AWS</div>
                  <div style={{ fontSize:'11px', color:'#52525b', marginTop:'4px' }}>EC2 / VPC / Route 53</div>
                </div>
                <div style={{ color:'#3f3f46', fontSize:'24px', fontWeight:300 }}>·</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'rgba(66,133,244,0.1)', border:'1px solid rgba(66,133,244,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:'26px' }}>🌐</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#4285F4', letterSpacing:'.08em' }}>GCP</div>
                  <div style={{ fontSize:'11px', color:'#52525b', marginTop:'4px' }}>Compute Engine / VPC</div>
                </div>
                <div style={{ color:'#3f3f46', fontSize:'24px', fontWeight:300 }}>·</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'rgba(0,120,212,0.1)', border:'1px solid rgba(0,120,212,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:'26px' }}>⬡</div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#0078D4', letterSpacing:'.08em' }}>Azure</div>
                  <div style={{ fontSize:'11px', color:'#52525b', marginTop:'4px' }}>VM / VNET / AKS</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PLANS ── */}
          <section className="l-section" id="plans">
            <div className="l-container">
              <div style={{ textAlign:'center', marginBottom:'72px' }}>
                <span className="l-section-tag" style={{ display:'block' }}>Pricing</span>
                <h2 className="l-section-title">
                  Flat monthly. No per-seat.<br /><span style={{ color:'#6366F1' }}>No surprises.</span>
                </h2>
                <p style={{ color:'#A1A1AA', fontSize:'17px', maxWidth:'560px', margin:'0 auto 12px', lineHeight:1.7 }}>
                  You pay the ArthaBuild license fee. Your cloud provider bill is separate — you own the infrastructure.
                </p>
                <p style={{ color:'#52525b', fontSize:'13px' }}>AWS compute adds approx. $600–$900/mo (GPU instance) billed directly to your account.</p>
              </div>
              <div className="l-pricing-wrap">
                {/* Starter */}
                <div className="l-pricing-card l-reveal">
                  <h3 style={{ fontSize:'22px', marginBottom:'6px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Starter</h3>
                  <p style={{ color:'#6366f1', fontSize:'13px', fontWeight:700, marginBottom:'24px' }}>For founders and solo operators.</p>
                  <div style={{ marginBottom:'28px' }}>
                    <span style={{ fontSize:'48px', fontWeight:800, fontFamily:'Outfit, sans-serif', color:'#F4F4F5', letterSpacing:'-.03em' }}>$799</span>
                    <span style={{ color:'#52525b', fontSize:'14px' }}>&nbsp;/ month</span>
                  </div>
                  <ul style={{ listStyle:'none', color:'#A1A1AA', lineHeight:2.5, marginBottom:'36px', fontSize:'15px' }}>
                    <li>✓ 1 ArthaBuild user</li>
                    <li>✓ 1 NetSuite account</li>
                    <li>✓ Unlimited AI script generation</li>
                    <li>✓ 10 production deploys / month</li>
                    <li>✓ Unlimited sandbox deploys</li>
                    <li>✓ Private instance in your AWS / GCP</li>
                    <li>✓ Email support</li>
                  </ul>
                  <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-ghost" style={{ width:'100%', justifyContent:'center' }}>Get a Demo</a>
                </div>

                {/* Growth — featured */}
                <div className="l-pricing-card featured l-reveal" style={{ transitionDelay:'.1s' }}>
                  <div style={{ background:'#6366F1', color:'#fff', fontSize:'10px', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', padding:'5px 14px', borderRadius:'100px', display:'inline-block', marginBottom:'20px' }}>Most Popular</div>
                  <h3 style={{ fontSize:'22px', marginBottom:'6px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Growth</h3>
                  <p style={{ color:'#a5b4fc', fontSize:'13px', fontWeight:700, marginBottom:'24px' }}>For ops teams and growing businesses.</p>
                  <div style={{ marginBottom:'28px' }}>
                    <span style={{ fontSize:'48px', fontWeight:800, fontFamily:'Outfit, sans-serif', color:'#F4F4F5', letterSpacing:'-.03em' }}>$1,999</span>
                    <span style={{ color:'#8b8b99', fontSize:'14px' }}>&nbsp;/ month</span>
                  </div>
                  <ul style={{ listStyle:'none', color:'#A1A1AA', lineHeight:2.5, marginBottom:'36px', fontSize:'15px' }}>
                    <li>✓ Up to 5 users</li>
                    <li>✓ 1 NetSuite account</li>
                    <li>✓ Unlimited AI script generation</li>
                    <li>✓ Unlimited production deploys</li>
                    <li>✓ Unlimited sandbox deploys</li>
                    <li>✓ Implementation Guide generator</li>
                    <li>✓ Private GPU instance in your cloud</li>
                    <li>✓ Priority support + onboarding call</li>
                  </ul>
                  <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-primary" style={{ width:'100%', justifyContent:'center' }}>Book a Call</a>
                </div>

                {/* Enterprise */}
                <div className="l-pricing-card l-reveal" style={{ transitionDelay:'.2s' }}>
                  <h3 style={{ fontSize:'22px', marginBottom:'6px', fontFamily:'Outfit, sans-serif', color:'#F4F4F5' }}>Enterprise</h3>
                  <p style={{ color:'#A1A1AA', fontSize:'13px', fontWeight:700, marginBottom:'24px' }}>For consulting firms and mid-market.</p>
                  <div style={{ marginBottom:'28px' }}>
                    <span style={{ fontSize:'48px', fontWeight:800, fontFamily:'Outfit, sans-serif', color:'#F4F4F5', letterSpacing:'-.03em' }}>Custom</span>
                  </div>
                  <ul style={{ listStyle:'none', color:'#A1A1AA', lineHeight:2.5, marginBottom:'36px', fontSize:'15px' }}>
                    <li>✓ Unlimited users</li>
                    <li>✓ Multiple NetSuite accounts</li>
                    <li>✓ Unlimited everything</li>
                    <li>✓ White-label option</li>
                    <li>✓ Multi-region deployment</li>
                    <li>✓ Custom model fine-tuning</li>
                    <li>✓ Dedicated success engineer</li>
                    <li>✓ 4-hour SLA, custom contracts</li>
                  </ul>
                  <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-ghost" style={{ width:'100%', justifyContent:'center' }}>Contact Sales</a>
                </div>
              </div>

              {/* Pricing footnote */}
              <div style={{ textAlign:'center', marginTop:'48px' }}>
                <p style={{ color:'#52525b', fontSize:'13px', lineHeight:1.8 }}>
                  Annual plans save 20% &nbsp;·&nbsp; All plans billed monthly or annually &nbsp;·&nbsp; 14-day money-back guarantee
                </p>
                <p style={{ color:'#52525b', fontSize:'13px', marginTop:'6px' }}>
                  AWS / GCP compute costs billed directly by your cloud provider — ArthaBuild never touches your billing.
                </p>
              </div>
            </div>
          </section>

          {/* ── BOTTOM CTA ── */}
          <section style={{ padding:'140px 0', textAlign:'center', position:'relative', zIndex:10, overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(99,102,241,.14) 0%,transparent 68%)', pointerEvents:'none' }}></div>
            <div className="l-container" style={{ position:'relative' }}>
              <h2 className="l-section-title l-reveal" style={{ fontSize:'clamp(48px,7vw,96px)', letterSpacing:'-.05em' }}>
                The smartest hire<br /><span style={{ color:'#6366F1' }}>you'll never make.</span>
              </h2>
              <p className="l-reveal" style={{ color:'#A1A1AA', fontSize:'20px', maxWidth:'600px', margin:'0 auto 48px', lineHeight:1.7, transitionDelay:'.1s' }}>
                Zero developer contracts. Zero consultant invoices.
                Just your business, automated — deployed inside your own infrastructure.
              </p>
              <div className="l-reveal l-cta-btns" style={{ display:'flex', gap:'18px', justifyContent:'center', transitionDelay:'.2s', flexWrap:'wrap' }}>
                <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" className="l-btn l-btn-primary" style={{ fontSize:'17px', height:'66px', padding:'0 52px' }}>
                  Book a Demo Call
                </a>
                <a href="#how-it-works" className="l-btn l-btn-ghost" style={{ fontSize:'17px', height:'66px', padding:'0 52px' }}>
                  See How It Works
                </a>
              </div>
              <p className="l-reveal" style={{ color:'#52525b', fontSize:'13px', marginTop:'28px', transitionDelay:'.3s' }}>
                Enterprise pricing &nbsp;·&nbsp; BYOC deployment &nbsp;·&nbsp; Contact sales@techcloudpro.com
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="l-footer">
            <div className="l-container">
              <div className="l-footer-cols" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'72px' }}>
                <div>
                  <div className="l-logo" style={{ marginBottom:'20px' }}>ArthaBuild</div>
                  <p style={{ color:'#A1A1AA', lineHeight:1.8, maxWidth:'340px', fontSize:'15px', marginBottom:'16px' }}>
                    The AI that automates NetSuite for small business.
                    No developers. No consultants. Just results.
                  </p>
                  <p style={{ color:'#52525b', fontSize:'13px' }}>A product of Zietra Technologies inc.</p>
                </div>
                <div>
                  <h4 style={{ marginBottom:'20px', fontSize:'13px', textTransform:'uppercase', letterSpacing:'.1em', color:'#fff' }}>Platform</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    <a href="#how-it-works" style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>How It Works</a>
                    <a href="#security"     style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Security</a>
                    <a href="#plans"      style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Pricing</a>
                    <a href="#who"          style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Who Uses It</a>
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom:'20px', fontSize:'13px', textTransform:'uppercase', letterSpacing:'.1em', color:'#fff' }}>Resources</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    <Link to="/log-in"         style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Sign In</Link>
                    <Link to="/create-account" style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Create Account</Link>
                    <Link to="/blog"           style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Blog</Link>
                    <Link to="/solutions"      style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Solutions</Link>
                    <Link to="/privacy"        style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Privacy Policy</Link>
                    <Link to="/terms"          style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Terms of Service</Link>
                    <a href="https://calendar.app.google/hMxn4pJi3bKXBtjp6" target="_blank" rel="noopener noreferrer" style={{ color:'#A1A1AA', textDecoration:'none', fontSize:'14px' }}>Contact Sales</a>
                  </div>
                </div>
              </div>
              <div className="l-footer-bar" style={{ marginTop:'72px', paddingTop:'32px', borderTop:'1px solid rgba(99,102,241,.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ color:'#52525b', fontSize:'13px' }}>© 2026 Zietra Technologies inc. All rights reserved.</p>
                <p style={{ color:'#52525b', fontSize:'13px' }}>ArthaBuild is not affiliated with Oracle NetSuite.</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
