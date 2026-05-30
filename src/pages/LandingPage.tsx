import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Eye, Users, Target, Zap, Brain, Shield,
  ChevronDown, Play, Sparkles, MonitorPlay,
  BarChart3, Clock, ArrowRight, Menu, X,
  ArrowUpRight, Scan, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import Logo from "@/assets/Final_Logo.png";
import SufiyanImg from "@/assets/team/Sufiyan.jpg";
import AliyanImg from "@/assets/team/Aliyan.jpg";
import MahnoorImg from "@/assets/team/mahnoor.jpg";
import ActionImg from "@/assets/action.png";

/* ═══ Intersection observer reveal ═══ */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVis(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, vis };
}

/* ═══ Reveal wrapper ═══ */
function Reveal({ children, delay = 0, className = "", threshold = 0.12 }: {
  children: React.ReactNode; delay?: number; className?: string; threshold?: number;
}) {
  const { ref, vis } = useReveal(threshold);
  return (
    <div ref={ref} className={`lp-reveal ${vis ? "lp-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ═══ Animated counter ═══ */
function Counter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = `${prefix}${end}${suffix}`; return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counted.current) {
        counted.current = true;
        const dur = 1200;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          el.textContent = `${prefix}${(ease * end).toFixed(end % 1 ? 1 : 0)}${suffix}`;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, suffix, prefix]);
  return <span ref={ref} aria-label={`${prefix}${end}${suffix}`}>0</span>;
}

/* ═══ Floating particles ═══ */
function Particles() {
  return (
    <div className="lp-particles" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`lp-particle lp-particle-${(i % 4) + 1}`}
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${12 + Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══ Marquee (infinite scrolling text) ═══ */
function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {doubled.map((t, i) => (
          <span key={i} className="lp-marquee-item">{t}<span className="lp-marquee-dot">◆</span></span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*                     LANDING PAGE                       */
/* ═══════════════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState("hero");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      const sections = ["hero", "features", "process", "technology", "team"];
      const y = window.scrollY + 200;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && y >= el.offsetTop && y < el.offsetTop + el.offsetHeight) {
          setActiveNav(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNav(false);
  }, []);

  /* ─── data ─── */
  const features = [
    { icon: Eye, title: "Real-time Detection", desc: "Instant face detection via neural networks running entirely in the browser.", color: "lp-card-blue" },
    { icon: Users, title: "Demographic Analysis", desc: "Accurate age group and gender classification for precise audience targeting.", color: "lp-card-purple" },
    { icon: Target, title: "Smart Targeting", desc: "Dynamic ad queue prioritization based on real-time audience composition.", color: "lp-card-rose" },
    { icon: Zap, title: "Lightning Fast", desc: "Optimized TensorFlow.js models deliver results in under 50 milliseconds.", color: "lp-card-amber" },
    { icon: Shield, title: "Privacy First", desc: "All processing happens locally on-device. Zero data leaves the screen.", color: "lp-card-green" },
    { icon: Brain, title: "AI Powered", desc: "State-of-the-art machine learning models for unmatched classification accuracy.", color: "lp-card-cyan" },
  ];

  const steps = [
    { icon: Scan, label: "Detect", desc: "Camera captures real-time viewer feed and runs multi-pass face detection." },
    { icon: Brain, label: "Classify", desc: "AI identifies demographics — gender and age group — with confidence scores." },
    { icon: Layers, label: "Score", desc: "Every ad is scored against the current audience for optimal relevance." },
    { icon: MonitorPlay, label: "Display", desc: "The highest-scoring ad plays — dynamically adapting to who's watching." },
  ];

  const team = [
    { name: "Abu Sufiyan", role: "Project Lead", desc: "Backend logic, AI and model integration specialist driving the core intelligence of SmartAds.", img: SufiyanImg, accent: "lp-team-blue" },
    { name: "M. Aliyan H. Qureshi", role: "Creative Lead", desc: "UI/UX design, marketing strategy, and project planning ensuring exceptional user experiences.", img: AliyanImg, accent: "lp-team-purple" },
    { name: "Mahnoor Siddiqui", role: "Research Lead", desc: "Reporting, technical diagrams, and research powering data-driven decisions.", img: MahnoorImg, accent: "lp-team-rose" },
  ];

  const navItems = [
    { id: "features", label: "Features" },
    { id: "process", label: "Process" },
    { id: "technology", label: "Tech" },
    { id: "team", label: "Team" },
  ];

  return (
    <>
      <Helmet>
        <title>SmartAds — AI-Powered Dynamic Advertising</title>
        <meta name="description" content="Real-time demographic-based ad targeting using AI. Dynamic ad queue prioritization based on audience gender and age detection." />
      </Helmet>

      {/* Skip link */}
      <a href="#features" className="lp-skip">Skip to content</a>

      <div className="lp-page">

        {/* ──────────────── NAVBAR ──────────────── */}
        <header className={`lp-nav ${scrolled ? "lp-nav-solid" : ""}`} role="banner">
          <div className="lp-nav-inner">
            <a href="#hero" onClick={e => { e.preventDefault(); goTo("hero"); }} className="lp-brand" aria-label="SmartAds home">
              <img src={Logo} alt="" className="lp-brand-logo" aria-hidden="true" />
              <span className="lp-brand-text">Smart<span>Ads</span></span>
            </a>

            <nav className="lp-nav-links" aria-label="Main">
              {navItems.map(n => (
                <button key={n.id} onClick={() => goTo(n.id)} className={`lp-nav-btn ${activeNav === n.id ? "active" : ""}`} aria-current={activeNav === n.id ? "page" : undefined}>
                  {n.label}
                </button>
              ))}
            </nav>

            <div className="lp-nav-actions">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => navigate("/manager/analytics")} className="lp-nav-cta-outline hidden sm:inline-flex">
                <BarChart3 className="w-4 h-4 mr-1.5" aria-hidden="true" />Analytics
              </Button>
              <Button size="sm" onClick={() => navigate("/dashboard")} className="lp-nav-cta">
                <Play className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />Try Now
              </Button>
              <button className="lp-hamburger" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? "Close menu" : "Open menu"} aria-expanded={mobileNav}>
                {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileNav && (
            <nav className="lp-mobile-nav" aria-label="Mobile">
              {navItems.map(n => (
                <button key={n.id} onClick={() => goTo(n.id)} className="lp-mobile-link">{n.label}</button>
              ))}
              <Button variant="outline" size="sm" onClick={() => navigate("/manager/analytics")} className="w-full justify-start mt-2">
                <BarChart3 className="w-4 h-4 mr-2" />Analytics Dashboard
              </Button>
            </nav>
          )}
        </header>

        {/* ──────────────── HERO ──────────────── */}
        <section id="hero" className="lp-hero-modern" aria-labelledby="lp-hero-h">
          <Particles />
          <div className="lp-hero-grain" aria-hidden="true" />
          <div className="lp-blob lp-blob-1" aria-hidden="true" />
          <div className="lp-blob lp-blob-2" aria-hidden="true" />
          <div className="lp-blob lp-blob-3" aria-hidden="true" />

          <div className="lp-hero-inner-modern">
            {/* Left Column: Text */}
            <div className="lp-hero-text-modern">
              <div className="lp-pill-modern">
                <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                <span>Next-Gen Audience Intelligence</span>
              </div>

              <h1 id="lp-hero-h" className="lp-hero-h1-modern">
                <span className="lp-hero-line-modern lp-text-gradient-modern">Precision Targeting.</span>
                <span className="lp-hero-line-modern">Zero Guesswork.</span>
              </h1>

              <p className="lp-hero-p-modern">
                SmartAds transforms digital screens into AI-powered marketing platforms. Real-time face detection, demographic analysis, and dynamic ad targeting — all processed locally.
              </p>

              <div className="lp-hero-btns-modern">
                <Button size="lg" onClick={() => navigate("/dashboard")} className="lp-btn-glow-modern group">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => goTo("features")} className="lp-btn-glass-modern group">
                  <Play className="w-4 h-4 mr-2 text-primary transition-transform group-hover:scale-110" aria-hidden="true" />
                  See How it Works
                </Button>
              </div>
              
              <div className="lp-hero-stats-modern" role="list">
                {[
                  { val: 78.2, suf: "%", label: "Accuracy" },
                  { val: 50, suf: "ms", prefix: "<", label: "Latency" },
                  { val: 100, suf: "%", label: "Privacy" },
                ].map((s, i) => (
                  <div key={i} className="lp-stat-modern" role="listitem">
                    <div className="lp-stat-val-modern"><Counter end={s.val} suffix={s.suf} prefix={s.prefix || ""} /></div>
                    <div className="lp-stat-label-modern">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Video Embed */}
            <Reveal delay={200} className="lp-hero-video-wrapper">
              <div className="lp-video-glow" />
              <div className="lp-video-container">
                <div className="lp-video-topbar">
                  <span className="lp-dot-red" /> <span className="lp-dot-yellow" /> <span className="lp-dot-green" />
                  <span className="lp-video-url">smartads.app/demo</span>
                </div>
                <div className="lp-video-iframe-wrapper">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/RxB0MwV7KMg?autoplay=1&loop=1&playlist=RxB0MwV7KMg&showinfo=0&rel=0" 
                    title="SmartAds Tutorial" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="lp-video-iframe"
                  />
                </div>
              </div>
            </Reveal>
          </div>

          <button onClick={() => goTo("features")} className="lp-scroll-cue-modern" aria-label="Scroll to features">
            <ChevronDown className="w-5 h-5" />
          </button>
        </section>

        {/* Marquee */}
        <Marquee items={["Real-time Detection", "Demographic Analysis", "Smart Targeting", "Privacy First", "AI Powered", "Lightning Fast"]} />

        {/* ──────────────── FEATURES — Staggered Dynamic Grid ──────────────── */}
        <section id="features" className="lp-section" aria-labelledby="lp-feat-h">
          <div className="lp-container">
            <Reveal className="lp-features-header">
              <span className="lp-label">Capabilities</span>
              <h2 id="lp-feat-h" className="lp-heading-modern">Unmatched <span className="lp-text-gradient-modern">Intelligence</span></h2>
              <p className="lp-subhead-modern">Six core features that power the most advanced local advertising engine ever built.</p>
            </Reveal>

            <div className="lp-features-grid-modern" role="list" aria-label="Features">
              {features.map((f, i) => (
                <Reveal key={i} delay={i * 100} className={`lp-feature-card-modern ${f.color}`} threshold={0.1}>
                  <div role="listitem" className="lp-feature-card-inner">
                    <div className="lp-feature-icon-wrapper">
                      <f.icon className="lp-feature-icon-modern" />
                    </div>
                    <h3 className="lp-feature-title-modern">{f.title}</h3>
                    <p className="lp-feature-desc-modern">{f.desc}</p>
                    <div className="lp-feature-hover-glow" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── PROCESS — vertical timeline ──────────────── */}
        <section id="process" className="lp-section lp-section-dark" aria-labelledby="lp-proc-h">
          <div className="lp-container">
            <Reveal>
              <span className="lp-label lp-label-light">How It Works</span>
              <h2 id="lp-proc-h" className="lp-heading lp-heading-light">From camera to <span className="lp-highlight">perfect ad</span> in milliseconds</h2>
            </Reveal>

            <div className="lp-timeline" role="list" aria-label="Process steps">
              {steps.map((s, i) => (
                <Reveal key={i} delay={i * 150} className="lp-timeline-item" threshold={0.15}>
                  <div role="listitem" className="lp-timeline-content">
                    <div className="lp-timeline-badge" aria-hidden="true">
                      <span className="lp-timeline-num">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="lp-timeline-circle"><s.icon className="w-7 h-7" /></div>
                    <div className="lp-timeline-body">
                      <h3 className="lp-timeline-title">{s.label}</h3>
                      <p className="lp-timeline-desc">{s.desc}</p>
                    </div>
                  </div>
                  {i < steps.length - 1 && <div className="lp-timeline-line" aria-hidden="true" />}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── TECHNOLOGY ──────────────── */}
        <section id="technology" className="lp-section" aria-labelledby="lp-tech-h">
          <div className="lp-container">
            <Reveal>
              <span className="lp-label">Technology</span>
              <h2 id="lp-tech-h" className="lp-heading">AI that <span className="lp-highlight">sees what matters</span></h2>
              <p className="lp-subhead">Watch our neural network detect and classify viewers in real-time with remarkable precision.</p>
            </Reveal>

            <Reveal className="lp-tech-showcase">
              <div className="lp-tech-browser">
                <div className="lp-tech-bar" aria-hidden="true">
                  <span className="lp-dot" style={{ background: "#ff5f57" }} />
                  <span className="lp-dot" style={{ background: "#febc2e" }} />
                  <span className="lp-dot" style={{ background: "#28c840" }} />
                  <span className="lp-tech-url">smartads://live-detection</span>
                </div>
                <img src={ActionImg} alt="Live AI detection demo showing real-time demographic analysis with bounding boxes around detected faces" className="lp-tech-img" />
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="lp-tech-stack" role="list" aria-label="Tech stack">
                {["TensorFlow.js", "face-api.js", "React 18", "WebGL", "TypeScript"].map(t => (
                  <span key={t} className="lp-tech-pill" role="listitem">{t}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ──────────────── TEAM ──────────────── */}
        <section id="team" className="lp-section lp-section-muted" aria-labelledby="lp-team-h">
          <div className="lp-container">
            <Reveal>
              <span className="lp-label">Team</span>
              <h2 id="lp-team-h" className="lp-heading">The minds <span className="lp-highlight">behind the magic</span></h2>
              <p className="lp-subhead">A passionate team driving the future of intelligent advertising technology.</p>
            </Reveal>

            <div className="lp-team-grid-modern" role="list" aria-label="Team members">
              {team.map((m, i) => (
                <Reveal key={i} delay={i * 140} className={`lp-team-card-modern ${m.accent}`} threshold={0.15}>
                  <article role="listitem" className="lp-team-article">
                    {/* Geometric abstract background layer */}
                    <div className="lp-team-geo-bg" aria-hidden="true">
                      <div className="lp-geo-shape lp-geo-shape-1" />
                      <div className="lp-geo-shape lp-geo-shape-2" />
                      <div className="lp-geo-shape lp-geo-shape-3" />
                    </div>

                    {/* Image Layer */}
                    <div className="lp-team-img-modern-wrap">
                      <img src={m.img} alt={`Portrait of ${m.name}`} className="lp-team-img-modern" loading="lazy" />
                    </div>

                    {/* Info Layer (Glassmorphism) */}
                    <div className="lp-team-info-modern">
                      <h3 className="lp-team-name-modern">{m.name}</h3>
                      <span className="lp-team-role-modern">{m.role}</span>
                      <p className="lp-team-desc-modern">{m.desc}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── CTA ──────────────── */}
        <section className="lp-cta" aria-labelledby="lp-cta-h">
          <div className="lp-blob lp-blob-1" aria-hidden="true" />
          <div className="lp-blob lp-blob-2" aria-hidden="true" />
          <Particles />
          <Reveal className="lp-container lp-cta-inner">
            <h2 id="lp-cta-h" className="lp-cta-h">Ready to transform<br />your advertising?</h2>
            <p className="lp-cta-p">Experience the power of AI-driven audience targeting. Launch SmartAds and see the difference in real-time.</p>
            <div className="lp-cta-btns">
              <Button size="lg" onClick={() => navigate("/dashboard")} className="lp-btn-glow group">
                <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />Launch SmartAds
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/manager/analytics")} className="lp-btn-glass">
                <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" />View Analytics
              </Button>
            </div>
          </Reveal>
        </section>

        {/* ──────────────── FOOTER ──────────────── */}
        <footer className="lp-footer" role="contentinfo">
          <div className="lp-container">
            <div className="lp-footer-row">
              <div className="lp-brand"><img src={Logo} alt="" className="lp-brand-logo" aria-hidden="true" /><span className="lp-brand-text">Smart<span>Ads</span></span></div>
              <span className="lp-footer-copy">© 2026 SmartAds. AI-Powered Dynamic Advertising System.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
