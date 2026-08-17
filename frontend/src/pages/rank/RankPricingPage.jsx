import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Search, Zap, Shield, BarChart2, Globe, CheckCircle, ArrowRight } from 'lucide-react';

const tools = [
  { icon: Search, name: 'SEO Audit', desc: 'Complete on-page analysis with actionable fixes' },
  { icon: Zap, name: 'Page Speed', desc: 'Core Web Vitals & performance scores' },
  { icon: BarChart2, name: 'Keyword Density', desc: 'Analyze keyword usage across your content' },
  { icon: Shield, name: 'SSL Checker', desc: 'Verify certificate validity and expiry' },
  { icon: Globe, name: 'DNS Lookup', desc: 'Query A, MX, NS, TXT, CNAME records' },
  { icon: Search, name: '+ 9 More Tools', desc: 'WHOIS, Broken Links, Sitemap, Redirect & more' },
];

const stats = [['14+', 'SEO Tools'], ['100K+', 'Reports Run'], ['99.9%', 'Uptime'], ['4.9', 'User Rating']];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'rgba(9,9,13,.9)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: 'var(--secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={15} color="#fff" /></div>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>PHPRank</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/tools" className="btn btn-ghost btn-sm">Free Tools</Link>
          <Link to="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
          <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Start Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '110px 24px 80px' }}>
        <div className="badge badge-primary" style={{ marginBottom: 20, fontSize: 12 }}>14 free SEO tools included</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,70px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 22 }}>
          The SEO toolkit that<br /><span className="gradient-text">grows your rankings</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-muted)', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.65 }}>
          Run comprehensive SEO audits, track projects, analyze competitors, and fix issues - all in one platform.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg"><Zap size={16} /> Start for Free</Link>
          <Link to="/tools" className="btn btn-outline btn-lg">Try Free Tools <ArrowRight size={15} /></Link>
        </div>
        <p style={{ marginTop: 18, fontSize: 12, color: 'var(--text-muted)' }}>No credit card required · Free forever plan available</p>
      </section>

      {/* Stats */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: 56, flexWrap: 'wrap', padding: '0 24px 80px' }}>
        {stats.map(([num, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)' }}>{num}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Tools grid */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>All the tools you need</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 52 }}>Professional SEO analysis, free to use - no account required</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
          {tools.map(({ icon: Icon, name, desc }) => (
            <div key={name} className="card card-hover" style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 42, height: 42, background: 'rgba(99,102,241,.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={19} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: 5, fontSize: 15 }}>{name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Link to="/tools" className="btn btn-outline"><Wrench size={14} /> View All 14 Tools</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 700, marginBottom: 48 }}>Why teams choose PHPRank</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {[
              ['Project Tracking', 'Monitor multiple websites, track keyword rankings, and spot issues before they hurt traffic.'],
              ['Detailed Reports', 'Get scored, categorized reports with specific recommendations for every issue found.'],
              ['Competitor Analysis', 'Benchmark your SEO performance against competitors and find gaps to exploit.'],
              ['PDF Export', 'Download white-label PDF reports to share with clients or management.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12 }}>
                <CheckCircle size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '100px 24px' }}>
        <h2 style={{ fontSize: 38, fontWeight: 800, marginBottom: 16 }}>Start improving your SEO today</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 36, fontSize: 17 }}>Join thousands of SEOs, developers, and marketers using PHPRank.</p>
        <Link to="/register" className="btn btn-primary btn-lg"><TrendingUp size={16} /> Create Free Account</Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>PHPRank</span>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/tools">Tools</Link><Link to="/pricing">Pricing</Link><Link to="/login">Login</Link>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>© {new Date().getFullYear()} PHPRank SEO Platform</p>
      </footer>
    </div>
  );
}

function Wrench({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>; }
