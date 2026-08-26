'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Vote, ShieldCheck, Zap, Clock, CheckCircle2, ChevronRight, LogOut, Bell,
  Users, BarChart3, Plus, Trash2, Eye, Lock, ArrowLeft, X, AlertCircle,
  AlertTriangle, Share2, Upload, Mail, ScrollText, Landmark, Scale, Cpu,
  Search, Download, Sparkles, FileText, ListChecks, TrendingUp, Award
} from 'lucide-react';

// ---------- API helper ----------
const api = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vv_token') : null;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: diff === 0, ms: diff };
}
const pad = n => String(n).padStart(2, '0');

const TYPE_LABELS = {
  candidate_race: 'Candidate Race',
  referendum: 'Referendum (Yes / No)',
  participatory_budget: 'Participatory Budget',
  board_seat: 'Board / Committee Seat',
  poll: 'Poll / Survey',
  prediction: 'Prediction — Who Will Win?',
};
const typeLabel = t => TYPE_LABELS[t] || 'Candidate Race';

const AI_TOOLS_URL = 'https://www.aiwebtools.app';
const LEGISLATION_URL = 'https://legislationwritergpt.lovable.app/?via=aiwebtools';

function AiToolsLinks({ variant = 'header' }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-bold transition-colors';
  if (variant === 'footer') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href={AI_TOOLS_URL} target="_blank" rel="noopener noreferrer" className={`${base} border border-amber-500/40 bg-amber-500/5 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15`}><Sparkles className="h-4 w-4" /> MORE AI TOOLS</a>
        <a href={LEGISLATION_URL} target="_blank" rel="noopener noreferrer" className={`${base} border border-blue-500/40 bg-blue-500/5 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/15`}><ScrollText className="h-4 w-4" /> Legislation Writer AI</a>
      </div>
    );
  }
  // header / compact
  return (
    <div className="flex items-center gap-1.5">
      <a href={AI_TOOLS_URL} target="_blank" rel="noopener noreferrer" title="More AI tools (opens in new tab)" className={`${base} border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200 hover:bg-amber-500/20 sm:text-xs`}><Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">MORE AI TOOLS</span><span className="sm:hidden">AI</span></a>
      <a href={LEGISLATION_URL} target="_blank" rel="noopener noreferrer" title="Legislation Writer AI (opens in new tab)" className={`${base} hidden border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-200 hover:bg-blue-500/20 sm:inline-flex sm:text-xs`}><ScrollText className="h-3.5 w-3.5" /> Legislation AI</a>
    </div>
  );
}

const shareLink = (slug) => {
  const url = `${window.location.origin}/election/${slug}`;
  navigator.clipboard.writeText(url).then(() => toast.success('Public election link copied — share it with your voters!')).catch(() => toast.info(url));
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

function App() {
  const [view, setView] = useState({ name: 'landing' });
  const [user, setUser] = useState(null);
  const [pendingVote, setPendingVote] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const voteSlug = params.get('vote');
    if (voteSlug) window.history.replaceState({}, '', '/');
    const token = localStorage.getItem('vv_token');
    if (token) {
      api('/auth/me').then(d => {
        setUser(d.user);
        if (voteSlug) setView({ name: 'ballot', slug: voteSlug });
        else setView({ name: d.user.role === 'admin' ? 'admin' : 'dashboard' });
      }).catch(() => {
        localStorage.removeItem('vv_token');
        if (voteSlug) { setPendingVote(voteSlug); setView({ name: 'auth', mode: 'login' }); }
      });
    } else if (voteSlug) {
      setPendingVote(voteSlug);
      setView({ name: 'auth', mode: 'login' });
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    if (!user) return;
    try { const d = await api('/notifications'); setNotifs(d.notifications || []); } catch {}
  }, [user]);
  useEffect(() => { loadNotifs(); const t = setInterval(loadNotifs, 10000); return () => clearInterval(t); }, [loadNotifs]);

  // Global click-spark flair
  useEffect(() => {
    const onClick = (e) => {
      const s = document.createElement('span');
      s.className = 'vv-spark';
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 560);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const onAuthed = (u) => {
    setUser(u);
    if (pendingVote) { setView({ name: 'ballot', slug: pendingVote }); setPendingVote(null); }
    else setView({ name: u.role === 'admin' ? 'admin' : 'dashboard' });
  };
  const logout = () => { localStorage.removeItem('vv_token'); setUser(null); setView({ name: 'landing' }); };
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="min-h-screen scanline">
      {user && <TopNav user={user} view={view} setView={setView} logout={logout} unread={unread} onBell={() => setNotifOpen(true)} />}
      {view.name === 'landing' && <Landing go={setView} />}
      {view.name === 'auth' && <AuthView mode={view.mode} onAuthed={onAuthed} pendingVote={pendingVote} switchMode={m => setView({ name: 'auth', mode: m })} back={() => setView({ name: 'landing' })} />}
      {view.name === 'dashboard' && <Dashboard user={user} go={setView} />}
      {view.name === 'election' && <ElectionPage slug={view.slug} user={user} go={setView} />}
      {view.name === 'ballot' && <BallotPage slug={view.slug} user={user} go={setView} />}
      {view.name === 'results' && <ResultsPage slug={view.slug} go={setView} cert={view.cert} />}
      {view.name === 'admin' && <AdminDashboard user={user} go={setView} />}
      {view.name === 'admin-create' && <CreateElectionWizard go={setView} origin="admin" />}
      {view.name === 'create' && <CreateElectionWizard go={setView} origin="dashboard" />}
      {view.name === 'admin-audit' && <AuditLog go={setView} />}
      {view.name === 'admin-emails' && <EmailLog go={setView} />}
      {view.name === 'settings' && <SettingsPage user={user} go={setView} />}
      {notifOpen && <NotifPanel notifs={notifs} onClose={() => { setNotifOpen(false); api('/notifications/read', { method: 'POST' }).then(loadNotifs).catch(() => {}); }} />}
    </div>
  );
}

function TopNav({ user, view, setView, logout, unread, onBell }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-blue-500/20 bg-[#060b1c]/80 backdrop-blur-xl">
      <div className="stripe-bar" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <button onClick={() => setView({ name: user.role === 'admin' ? 'admin' : 'dashboard' })} className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-blue-700 shadow-lg shadow-blue-500/40">
            <Vote className="h-5 w-5 text-white" />
          </div>
          <span className="hidden text-lg font-black tracking-widest text-white xs:block sm:block">VOTE<span className="text-amber-400">VAULT</span></span>
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setView({ name: 'dashboard' })} className={`rounded-lg px-2 py-1.5 text-xs sm:text-sm ${view.name === 'dashboard' ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>Elections</button>
          {user.role === 'admin' && (
            <>
              <button onClick={() => setView({ name: 'admin' })} className={`rounded-lg px-2 py-1.5 text-xs sm:text-sm ${view.name === 'admin' ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>Admin</button>
              <button onClick={() => setView({ name: 'admin-audit' })} className={`hidden rounded-lg px-2 py-1.5 text-xs lg:block lg:text-sm ${view.name === 'admin-audit' ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>Audit</button>
              <button onClick={() => setView({ name: 'admin-emails' })} className={`hidden rounded-lg px-2 py-1.5 text-xs lg:block lg:text-sm ${view.name === 'admin-emails' ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>Emails</button>
            </>
          )}
          <button onClick={() => setView({ name: 'settings' })} className={`hidden rounded-lg px-2 py-1.5 text-xs sm:block sm:text-sm ${view.name === 'settings' ? 'text-amber-300' : 'text-gray-400 hover:text-white'}`}>Settings</button>
          <div className="hidden md:block"><AiToolsLinks variant="header" /></div>
          <button onClick={onBell} className="relative rounded-lg p-2 text-gray-300 hover:bg-blue-500/10 hover:text-white">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
          </button>
          <button onClick={() => setView({ name: 'settings' })} className="hidden text-right md:block" title="Settings">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">{user.role === 'admin' ? 'Administrator' : 'Registered Voter'}</div>
            <div className="text-sm font-medium text-white">{user.name}</div>
          </button>
          <button onClick={logout} aria-label="Log out" className="rounded-lg border border-blue-500/30 p-2 text-gray-300 hover:border-red-500/60 hover:text-red-300"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </nav>
  );
}

function Landing({ go }) {
  return (
    <div className="grid-bg min-h-screen">
      <div className="stripe-bar" />
      <div className="marquee border-b border-amber-500/20 bg-gradient-to-r from-red-900/30 via-blue-900/20 to-amber-900/20 py-1.5">
        <div className="marquee-track text-[11px] font-black uppercase tracking-[0.3em] text-amber-300/90">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="inline-flex gap-10">
              <span>★ We The People ★</span><span className="text-blue-300">Democracy Has No Borders</span>
              <span className="text-red-300">One Person · One Ballot · One Voice</span><span>★ We The People ★</span>
              <span className="text-blue-300">For The People, By The People</span><span className="text-red-300">Free Forever</span>
            </span>
          ))}
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-blue-700 shadow-lg shadow-blue-500/50"><Vote className="h-6 w-6 text-white" /></div>
          <span className="text-xl font-black tracking-widest">VOTE<span className="text-amber-400">VAULT</span></span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <AiToolsLinks variant="header" />
          <button onClick={() => go({ name: 'auth', mode: 'login' })} className="hidden text-sm text-gray-300 hover:text-white sm:block">Login</button>
          <button onClick={() => go({ name: 'auth', mode: 'register' })} className="btn-neon rounded-lg px-4 py-2 text-sm font-bold text-white">Register to Vote</button>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
        <div className="absolute inset-x-0 top-10 -z-10 mx-auto h-64 max-w-4xl rounded-full bg-blue-600/15 blur-3xl" />
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-[10px] uppercase tracking-widest text-amber-300 sm:text-xs">
          <Landmark className="h-3 w-3" /> The People's Online Voting Machine
        </div>
        <h1 className="glow-title mb-4 text-5xl font-black tracking-tighter sm:text-8xl">
          VOTE<span className="text-amber-400">VAULT</span>
        </h1>
        <div className="mb-6 text-2xl font-black uppercase tracking-[0.2em] sm:text-4xl">
          <span className="shimmer-text">Democracy Has No Borders</span>
        </div>
        <p className="mx-auto mb-3 max-w-2xl text-xl font-light tracking-wide text-gray-100 sm:text-3xl">
          Your Vote. <span className="font-bold text-blue-300">One Ballot.</span> <span className="font-bold text-red-400">One Voice.</span>
        </p>
        <p className="mx-auto mb-4 max-w-3xl text-sm font-black uppercase tracking-widest text-amber-300 sm:text-base">
          AI-Verified Counts · Tamper-Evident Ballots · Live Results
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-sm text-gray-400 sm:text-base">
          Live voting for anything and everything that matters — community boards, budgets, referendums, unions, schools, and organizations. Every ballot is cryptographically signed, every count machine-verified, and every deadline enforced by the server. No tampering. No double voting. Ever.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => go({ name: 'auth', mode: 'register' })} className="btn-neon rounded-xl px-8 py-4 text-base font-black tracking-wider text-white">START VOTING <ChevronRight className="ml-1 inline h-5 w-5" /></button>
          <button onClick={() => go({ name: 'auth', mode: 'login' })} className="btn-blue rounded-xl px-8 py-4 text-base font-black tracking-wider text-white">CREATE AN ELECTION</button>
        </div>
        <div className="mx-auto mt-8 max-w-xl rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80">
          <strong>Try the demo:</strong> admin@votevault.app / admin123 &nbsp; · &nbsp; voter@demo.app / voter123
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-10 text-center text-3xl font-black tracking-wider text-white">HOW IT WORKS</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { i: '01', t: 'Register', d: 'Create your voter account with email or Google in seconds.' },
            { i: '02', t: 'Get Your Ballot', d: 'See every election you are eligible to vote in — open, upcoming, and closed.' },
            { i: '03', t: 'Cast One Vote', d: 'Select one option, review, and confirm. You receive a signed confirmation receipt.' },
            { i: '04', t: 'Verify the Count', d: 'Watch live, machine-verified results with a public integrity report on every election.' },
          ].map(s => (
            <div key={s.i} className="card-neon rounded-xl p-6">
              <div className="mb-3 font-mono text-3xl font-black text-amber-400">{s.i}</div>
              <div className="mb-1 text-lg font-bold text-white">{s.t}</div>
              <div className="text-sm text-gray-400">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-3 text-center text-3xl font-black tracking-wider text-white">TAMPER-PROOF BY DESIGN</h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-gray-400">Fair elections are not a promise — they are a mechanism. Every safeguard below is enforced on the server, where no browser, script, or bad actor can override it.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { I: ShieldCheck, t: 'One-Vote Enforcement', d: 'Database-level unique constraints make duplicate ballots physically impossible — across tabs, refreshes, or direct API attacks.' },
            { I: Cpu, t: 'AI-Verified Counts', d: 'An automated integrity engine recounts every ballot, verifies cryptographic signatures, and reconciles tallies against participation records — continuously.' },
            { I: Lock, t: 'Tamper-Evident Ballots', d: 'Each ballot carries an HMAC-SHA256 signature. Any modification to a stored ballot is instantly detected and flagged publicly.' },
            { I: Clock, t: 'Server-Side Timing', d: 'Polls open and close on the server clock. Late ballots are rejected no matter what a browser claims.' },
            { I: Scale, t: 'Anonymous by Architecture', d: 'Who voted and what they voted for are stored in separate records. Your choice can never be traced back to you.' },
            { I: Users, t: 'Voter Roll Eligibility', d: 'Restrict any election to a certified voter list via CSV import. Ineligible ballots are rejected server-side.' },
          ].map((f, i) => (
            <div key={i} className="card-neon rounded-xl p-6">
              <f.I className="mb-3 h-6 w-6 text-amber-400" />
              <div className="mb-2 text-lg font-bold text-white">{f.t}</div>
              <div className="text-sm text-gray-400">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-10 text-center text-3xl font-black tracking-wider text-white">FOR EVERY KIND OF ELECTION</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['Community boards & HOAs', 'Participatory budgets', 'Referendums & charters', 'Unions & associations', 'Schools, PTAs & campuses', 'Clubs & organizations', 'Awards & contests', 'Board & committee seats'].map(t => (
            <div key={t} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center text-sm font-bold text-blue-100">{t}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="mb-10 text-center text-3xl font-black tracking-wider text-white">FREQUENTLY ASKED QUESTIONS</h2>
        <div className="space-y-3">
          {[
            { q: 'Can someone vote twice?', a: 'No. A unique database constraint on (election, voter) makes a second ballot physically impossible to record — even from multiple tabs, devices, or direct API calls. Attempts are rejected and logged.' },
            { q: 'How do I know the count is accurate?', a: 'Every election has a public integrity report. The engine recounts all ballots, verifies each ballot\u2019s cryptographic signature, reconciles tallies with participation records, and confirms every ballot was cast inside the legal voting window.' },
            { q: 'Is my vote secret?', a: 'For anonymous elections, your ballot choice is stored with no link to your identity — only a separate record that you participated. Even administrators cannot see how you voted.' },
            { q: 'Can voting stay open after the deadline?', a: 'No. The server clock decides. When the closing time passes, the election closes automatically and any late ballot is rejected — regardless of what a browser shows.' },
            { q: 'How do I restrict who can vote?', a: 'Administrators can upload a CSV voter roll. Only listed emails may cast a ballot; everyone else is rejected server-side. Participation statistics are computed against the certified list.' },
            { q: 'Is this certified for government elections?', a: 'No. Governmental elections require jurisdiction-specific certification, security testing, accessibility compliance, and legal authorization. VoteVault provides the secure infrastructure tier for organizational and community democracy.' },
          ].map((f, i) => (
            <details key={i} className="card-neon group rounded-xl p-5">
              <summary className="cursor-pointer list-none text-base font-bold text-white">{f.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="card-gold rounded-2xl p-8 text-center sm:p-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Free — Forever
          </div>
          <h2 className="mb-3 text-3xl font-black tracking-wider text-white sm:text-4xl">DEMOCRACY IS FREE.</h2>
          <p className="mx-auto mb-6 max-w-2xl text-sm text-gray-300 sm:text-base">
            Every feature is free for everyone — no plans, no limits, no paywalls. Create unlimited elections, invite unlimited voters, run AI-verified recounts, download tamper-evident certificates, and view live results. If it helps people vote, it costs nothing.
          </p>
          <div className="mx-auto mb-8 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['Unlimited elections', 'Unlimited voters', 'AI-verified recounts', 'Live results & analytics', 'CSV voter rolls', 'Email notifications', 'Candidate photo ballots', 'Downloadable certificates', 'Public share pages'].map(t => (
              <div key={t} className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-left text-sm font-bold text-green-100"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" /> {t}</div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => go({ name: 'auth', mode: 'register' })} className="btn-neon rounded-xl px-8 py-4 text-base font-black tracking-wider text-white">START VOTING — FREE</button>
            <button onClick={() => go({ name: 'auth', mode: 'login' })} className="btn-blue rounded-xl px-8 py-4 text-base font-black tracking-wider text-white">CREATE AN ELECTION</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="card-neon rounded-2xl p-8 text-center">
          <div className="mb-3 text-xs uppercase tracking-widest text-amber-400">Legal Notice</div>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-gray-300">
            VoteVault provides secure voting infrastructure: tamper-evident cryptographically signed ballots, machine-verified counts, one-vote-per-election enforcement, and complete audit records. Software alone cannot guarantee absolute security — organizations remain responsible for their election procedures. <strong className="text-white">This platform is not certified for use in governmental elections.</strong> Governmental use requires jurisdiction-specific certification, security assessment, accessibility compliance, and legal authorization.
          </p>
        </div>
      </section>

      <footer className="border-t border-blue-500/10 py-8 text-center text-xs text-gray-500">
        <div className="mb-4"><AiToolsLinks variant="footer" /></div>
        <div className="mb-1 font-black tracking-widest text-gray-400">VOTE<span className="text-amber-500/70">VAULT</span></div>
        Your Vote. One Ballot. One Voice. · Contact: elections@votevault.app
      </footer>
    </div>
  );
}

function AuthView({ mode, onAuthed, pendingVote, switchMode, back }) {
  const [email, setEmail] = useState(mode === 'login' ? 'voter@demo.app' : '');
  const [password, setPassword] = useState(mode === 'login' ? 'voter123' : '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await api(`/auth/${mode}`, { method: 'POST', body: mode === 'register' ? { email, password, name } : { email, password } });
      localStorage.setItem('vv_token', d.token);
      onAuthed(d.user);
      toast.success(mode === 'register' ? 'Welcome to VoteVault! Check your inbox for your welcome email.' : 'Signed in');
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  const googleLogin = () => {
    const redirect = `${window.location.origin}/auth/callback${pendingVote ? `?vote=${encodeURIComponent(pendingVote)}` : ''}`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="card-neon w-full max-w-md rounded-2xl p-6 sm:p-8">
        <button onClick={back} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-blue-700 shadow-lg shadow-blue-500/50"><Vote className="h-7 w-7 text-white" /></div>
          <h1 className="text-2xl font-black tracking-widest text-white">{mode === 'login' ? 'VOTER SIGN IN' : 'REGISTER TO VOTE'}</h1>
          {pendingVote && <p className="mt-2 text-xs text-amber-300">Sign in to cast your ballot — you\u2019ll be taken straight to it.</p>}
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Input label="FULL NAME" value={name} onChange={setName} required />
          )}
          <Input label="EMAIL" type="email" value={email} onChange={setEmail} required />
          <Input label="PASSWORD" type="password" value={password} onChange={setPassword} required />
          <button disabled={loading} className="btn-neon w-full rounded-lg py-3 font-black tracking-widest text-white">
            {loading ? '...' : (mode === 'login' ? 'SIGN IN' : 'CREATE VOTER ACCOUNT')}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-blue-500/20" />
          <span className="text-[10px] font-bold tracking-widest text-gray-500">OR CONTINUE WITH</span>
          <div className="h-px flex-1 bg-blue-500/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={googleLogin} className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-white/5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
            <GoogleIcon /> Google
          </button>
          <button disabled title="Apple Sign In coming soon" className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-blue-500/20 bg-white/5 py-3 text-sm font-bold text-gray-400 opacity-50">
            <AppleIcon /> Apple <span className="rounded bg-blue-500/20 px-1 text-[8px] tracking-widest text-blue-300">SOON</span>
          </button>
        </div>
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? 'No account? ' : 'Have an account? '}
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-amber-300 hover:text-amber-200">{mode === 'login' ? 'Register to vote' : 'Sign in'}</button>
        </div>
        <div className="mt-5 border-t border-blue-500/15 pt-4"><AiToolsLinks variant="footer" /></div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-blue-300">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
    </div>
  );
}

function Dashboard({ user, go }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('all');
  const [type, setType] = useState('all');
  const [tab, setTab] = useState('all');
  const load = useCallback(async () => {
    try { const d = await api('/elections'); setElections(d.elections); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const regions = ['all', ...Array.from(new Set(elections.map(e => e.region).filter(Boolean))).sort()];
  const types = ['all', ...Array.from(new Set(elections.map(e => e.election_type).filter(Boolean)))];

  const counts = {
    all: elections.length,
    open: elections.filter(e => e.status === 'open').length,
    scheduled: elections.filter(e => e.status === 'scheduled').length,
    closed: elections.filter(e => e.status === 'closed').length,
    mine: elections.filter(e => e.has_voted || e.created_by === user?.id).length,
  };

  const filtered = elections.filter(e => {
    if (tab === 'open' && e.status !== 'open') return false;
    if (tab === 'scheduled' && e.status !== 'scheduled') return false;
    if (tab === 'closed' && e.status !== 'closed') return false;
    if (tab === 'mine' && !(e.has_voted || e.created_by === user?.id)) return false;
    if (region !== 'all' && e.region !== region) return false;
    if (type !== 'all' && e.election_type !== type) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      if (!(`${e.title} ${e.description} ${e.region}`.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const totalBallots = elections.reduce((s, e) => s + (e.total_votes || 0), 0);
  const tabs = [
    { k: 'all', label: 'All' }, { k: 'open', label: '🟢 Open' },
    { k: 'scheduled', label: '⏰ Upcoming' }, { k: 'closed', label: '📊 Closed' }, { k: 'mine', label: '✅ Mine' },
  ];

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="glow-title text-3xl font-black tracking-tight text-white sm:text-5xl">Your Vote Matters.</h1>
            <p className="mt-2 text-sm text-gray-400 sm:text-base">Browse every election, cast your vote, predict winners, and verify the count in real time.</p>
          </div>
          <button onClick={() => go({ name: 'create', origin: 'dashboard' })} className="btn-neon shrink-0 rounded-xl px-5 py-3.5 text-sm font-black tracking-widest text-white shadow-lg shadow-amber-500/20">
            <Plus className="mr-1 inline h-4 w-4" /> CREATE A CUSTOM ELECTION
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Elections" v={counts.all} />
          <Stat label="Polls Open" v={counts.open} />
          <Stat label="Total Ballots" v={totalBallots} />
          <Stat label="You've Voted In" v={elections.filter(e => e.has_voted).length} />
        </div>

        {/* Filter bar */}
        <div className="card-neon mb-6 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search elections by name, description, or region…"
                className="w-full rounded-lg border border-blue-500/30 bg-black/50 py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <select value={region} onChange={e => setRegion(e.target.value)} className="flex-1 rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none lg:w-44">
                {regions.map(r => <option key={r} value={r} className="bg-[#0b1020]">{r === 'all' ? 'All Regions' : r}</option>)}
              </select>
              <select value={type} onChange={e => setType(e.target.value)} className="flex-1 rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none lg:w-52">
                {types.map(t => <option key={t} value={t} className="bg-[#0b1020]">{t === 'all' ? 'All Types' : typeLabel(t)}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tabs.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-colors ${tab === t.k ? 'bg-amber-500 text-black' : 'border border-blue-500/30 text-blue-200 hover:bg-blue-500/10'}`}>
                {t.label} <span className="opacity-70">{counts[t.k] ?? ''}</span>
              </button>
            ))}
            {(q || region !== 'all' || type !== 'all' || tab !== 'all') && (
              <button onClick={() => { setQ(''); setRegion('all'); setType('all'); setTab('all'); }} className="rounded-full px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white">✕ Clear</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading elections…</div>
        ) : filtered.length === 0 ? (
          <Empty text={elections.length === 0 ? 'No elections yet — be the first to create one!' : 'No elections match your filters. Try clearing them.'} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(e => <ElectionCard key={e.id} e={e} go={go} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children, loading }) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-sm font-black tracking-widest text-blue-300">{title}</h2>
        {count !== undefined && <span className="text-xs text-gray-500">{count}</span>}
      </div>
      {loading ? <div className="text-sm text-gray-500">Loading...</div> : children}
    </div>
  );
}

function Empty({ text }) { return <div className="card-neon rounded-xl p-8 text-center text-gray-400">{text}</div>; }

function ElectionCard({ e, go }) {
  const cd = useCountdown(e.ends_at);
  const openCd = useCountdown(e.starts_at);
  const isOpen = e.status === 'open';
  const isUpcoming = e.status === 'scheduled';
  const isClosed = e.status === 'closed';
  const notEligible = e.is_eligible === false;

  return (
    <div className="card-neon group animate-fadeup rounded-xl p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-white">{e.title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {isOpen && <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-green-300">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" /> LIVE
          </div>}
          {isUpcoming && <div className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-blue-300">UPCOMING</div>}
          {isClosed && <div className="rounded-full bg-gray-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-gray-400">CLOSED</div>}
          <button onClick={() => shareLink(e.slug)} aria-label="Copy share link" className="rounded-lg border border-blue-500/30 p-1.5 text-blue-300 hover:bg-blue-500/10"><Share2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <p className="mb-3 text-sm text-gray-400 line-clamp-2">{e.description}</p>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-blue-200">📍 {e.region || 'General'}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${e.election_type === 'prediction' ? 'bg-purple-500/15 text-purple-200' : 'bg-amber-500/10 text-amber-200'}`}>
          {e.election_type === 'prediction' ? '🔮 ' : '🗳️ '}{typeLabel(e.election_type)}
        </span>
      </div>

      {isOpen && (
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">Polls Close In</div>
          <div className="font-mono text-2xl font-black text-white">
            {pad(cd.d)}<span className="text-amber-400">d</span> {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
          </div>
        </div>
      )}
      {isUpcoming && (
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">Polls Open In</div>
          <div className="font-mono text-xl font-black text-white">{pad(openCd.d)}d {pad(openCd.h)}:{pad(openCd.m)}:{pad(openCd.s)}</div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>🗳️ <strong className="text-white">{e.total_votes}</strong> ballots</span>
        {e.anonymous_ballot && <span>🔒 Anonymous</span>}
        {e.eligibility_mode === 'voter_list' && <span className="text-amber-300">📋 Voter list only</span>}
      </div>

      {e.has_voted ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-bold text-green-300"><CheckCircle2 className="h-4 w-4" /> VOTE RECORDED</div>
          <button onClick={() => go({ name: 'results', slug: e.slug })} className="rounded-lg border border-blue-500/40 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/10">VIEW RESULTS</button>
        </div>
      ) : notEligible ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-center text-xs font-bold text-red-300">
          NOT ON THE VOTER LIST — you are not eligible for this election
        </div>
      ) : isOpen ? (
        <button onClick={() => go({ name: 'ballot', slug: e.slug })} className="btn-neon w-full rounded-lg py-3 text-sm font-black tracking-widest text-white">{e.election_type === 'prediction' ? 'CAST YOUR PREDICTION' : 'CAST YOUR VOTE'}</button>
      ) : isUpcoming ? (
        <button onClick={() => go({ name: 'election', slug: e.slug })} className="w-full rounded-lg border border-blue-500/30 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/5">VIEW DETAILS</button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => go({ name: 'results', slug: e.slug })} className="flex-1 rounded-lg border border-gray-500/30 py-2 text-sm font-bold text-gray-300 hover:bg-gray-500/5">FINAL RESULTS</button>
          <button onClick={() => go({ name: 'results', slug: e.slug, cert: true })} title="Download certificate" className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/10"><Award className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

function CandidateRichCard({ c, selected, onSelect }) {
  const [showProfile, setShowProfile] = useState(false);
  const clickable = !!onSelect;
  const hasProfile = !!(c.bio || c.credentials || c.resume_url || c.website || c.profile_completed);
  return (
    <div className={`w-full rounded-xl border-2 p-4 text-left transition-all sm:p-5 ${selected ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20' : 'border-blue-500/20 bg-black/40'}`}>
      <div className={`flex items-start gap-3 sm:gap-4 ${clickable ? 'cursor-pointer' : ''}`} onClick={onSelect} role={clickable ? 'button' : undefined}>
        {c.image_url ? (
          <img src={c.image_url} alt={c.name} className="h-14 w-14 shrink-0 rounded-full border-2 border-blue-500/40 object-cover sm:h-16 sm:w-16" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-blue-500/30 bg-blue-500/10 text-xl font-black text-blue-300 sm:h-16 sm:w-16">{c.name.charAt(0)}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold text-white sm:text-lg">{c.name}</div>
            {c.profile_completed && <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-blue-300">VERIFIED PROFILE</span>}
          </div>
          <div className="mt-0.5 text-sm text-gray-400">{c.description}</div>
          {c.statement && <div className="mt-2 border-l-2 border-amber-500/50 pl-3 text-xs italic text-amber-100/80">“{c.statement}”</div>}
        </div>
        {clickable && (
          <div className={`mt-1 h-6 w-6 shrink-0 rounded-full border-2 ${selected ? 'border-amber-300 bg-amber-400' : 'border-gray-500'}`}>
            {selected && <CheckCircle2 className="h-full w-full text-black" />}
          </div>
        )}
      </div>
      {hasProfile && (
        <div className="mt-3">
          <button type="button" onClick={(ev) => { ev.stopPropagation(); setShowProfile(v => !v); }} className="flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-blue-200">
            <FileText className="h-3.5 w-3.5" /> {showProfile ? 'Hide full profile' : 'View full profile'}
          </button>
          {showProfile && (
            <div className="mt-2 space-y-2 rounded-lg border border-blue-500/15 bg-black/40 p-3 text-sm">
              {c.bio && <div><div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Biography</div><p className="text-gray-300">{c.bio}</p></div>}
              {c.credentials && <div><div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Credentials</div><p className="text-gray-300">{c.credentials}</p></div>}
              <div className="flex flex-wrap gap-3 pt-1">
                {c.resume_url && <a href={c.resume_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:underline"><Download className="h-3.5 w-3.5" /> Résumé / Credentials</a>}
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-bold text-blue-300 hover:underline">🔗 Website / More info</a>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ElectionPage({ slug, user, go }) {
  const [e, setE] = useState(null);
  useEffect(() => { api(`/elections/${slug}`).then(d => setE(d.election)).catch(err => toast.error(err.message)); }, [slug]);
  const cd = useCountdown(e?.ends_at || Date.now());
  if (!e) return <div className="p-10 text-center text-gray-400">Loading...</div>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => go({ name: 'dashboard' })} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
        <button onClick={() => shareLink(e.slug)} className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/10"><Share2 className="h-3.5 w-3.5" /> SHARE</button>
      </div>
      <h1 className="mb-3 text-2xl font-black text-white sm:text-3xl">{e.title}</h1>
      <p className="mb-6 text-gray-400">{e.description}</p>
      {e.status === 'open' && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-6 text-center">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">Polls Close In</div>
          <div className="font-mono text-3xl font-black text-white">{pad(cd.d)}d {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</div>
        </div>
      )}
      <div className="mb-6 space-y-3">
        {e.candidates.map(c => <CandidateRichCard key={c.id} c={c} />)}
      </div>
      {e.has_voted ? (
        <button onClick={() => go({ name: 'results', slug })} className="btn-blue w-full rounded-lg py-3 font-black text-white">VIEW RESULTS</button>
      ) : e.is_eligible === false ? (
        <div className="rounded-lg bg-red-500/10 py-3 text-center font-black text-red-300">NOT ON THE VOTER LIST FOR THIS ELECTION</div>
      ) : e.status === 'open' ? (
        <button onClick={() => go({ name: 'ballot', slug })} className="btn-neon w-full rounded-lg py-3 font-black text-white">CAST YOUR VOTE</button>
      ) : e.status === 'closed' ? (
        <div className="rounded-lg bg-red-500/10 py-3 text-center font-black text-red-300">🔴 POLLS CLOSED</div>
      ) : (
        <div className="rounded-lg bg-blue-500/10 py-3 text-center font-black text-blue-300">POLLS OPEN SOON</div>
      )}
    </div>
  );
}

function BallotPage({ slug, user, go }) {
  const [e, setE] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState('choose');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    api(`/elections/${slug}`).then(d => {
      setE(d.election);
      if (d.election.has_voted) { setPhase('confirmed'); setConfirmation(d.election.confirmation); }
    }).catch(err => setLoadErr(err.message));
  }, [slug]);

  if (loadErr) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card-neon rounded-xl p-8">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <div className="mb-4 text-white">{loadErr}</div>
        <button onClick={() => go({ name: 'dashboard' })} className="text-sm text-blue-300 hover:text-blue-200">← Back to Dashboard</button>
      </div>
    </div>
  );
  if (!e) return <div className="p-10 text-center text-gray-400">Loading ballot...</div>;

  if (e.is_eligible === false && phase !== 'confirmed') return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card-neon rounded-xl p-8">
        <Lock className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <div className="mb-2 text-lg font-black text-red-300">NOT ON THE VOTER LIST</div>
        <p className="mb-4 text-sm text-gray-400">This election is restricted to a certified voter list, and your email is not on it. Contact the election administrator if you believe this is an error.</p>
        <button onClick={() => go({ name: 'dashboard' })} className="text-sm text-blue-300 hover:text-blue-200">← Back to Dashboard</button>
      </div>
    </div>
  );

  const submit = async () => {
    setPhase('submitting');
    try {
      const d = await api(`/elections/${slug}/vote`, { method: 'POST', body: { candidate_id: selected.id } });
      setConfirmation(d.confirmation);
      setPhase('confirmed');
    } catch (err) {
      toast.error(err.message);
      setPhase('review');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      {phase !== 'confirmed' && (
        <button onClick={() => go({ name: 'dashboard' })} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Cancel</button>
      )}
      <div className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">Official Ballot</div>
      <h1 className="mb-8 text-2xl font-black text-white sm:text-3xl">{e.title}</h1>

      {phase === 'choose' && (
        <>
          <p className="mb-6 text-base text-gray-300 sm:text-lg">Choose <strong className="text-white">ONE</strong> option. Your ballot is final once cast.</p>
          <div className="space-y-3">
            {e.candidates.map(c => (
              <CandidateRichCard key={c.id} c={c} selected={selected?.id === c.id} onSelect={() => setSelected(c)} />
            ))}
          </div>
          <button disabled={!selected} onClick={() => setPhase('review')}
            className="btn-neon mt-8 w-full rounded-lg py-4 text-sm font-black tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">
            REVIEW YOUR VOTE →
          </button>
        </>
      )}

      {phase === 'review' && (
        <>
          <div className="card-neon mb-6 rounded-xl p-5 sm:p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-300">Review Your Selection</div>
            <p className="mb-4 text-gray-300">You are about to cast your ballot for:</p>
            <CandidateRichCard c={selected} selected />
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Your vote is final. One ballot per voter is enforced at the database level — you cannot vote again in this election.</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setPhase('choose')} className="flex-1 rounded-lg border border-blue-500/40 py-4 text-sm font-black tracking-widest text-blue-200 hover:bg-blue-500/10">← CHANGE SELECTION</button>
            <button onClick={submit} className="btn-neon flex-1 rounded-lg py-4 text-sm font-black tracking-widest text-white">CAST MY VOTE</button>
          </div>
        </>
      )}

      {phase === 'submitting' && (
        <div className="card-neon rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <div className="text-lg font-bold text-white">SEALING YOUR BALLOT...</div>
          <div className="mt-1 text-xs text-gray-400">Signing, recording, and verifying</div>
        </div>
      )}

      {phase === 'confirmed' && (
        <div className="card-neon rounded-2xl p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-400" />
          <h2 className="mb-2 text-2xl font-black tracking-widest text-green-300 sm:text-3xl">✓ VOTE RECORDED</h2>
          <p className="mb-6 text-gray-300">Your ballot has been cryptographically signed and recorded. A confirmation email receipt has been issued.</p>
          <div className="mb-6 space-y-2 text-left">
            <Row k="Election" v={e.title} />
            <Row k="Status" v={<span className="text-green-300">Recorded &amp; signature-verified</span>} />
            <Row k="Confirmation" v={<span className="font-mono text-amber-300">{confirmation}</span>} />
            {e.anonymous_ballot && <Row k="Privacy" v={<span className="text-blue-300">Anonymous — choice not linked to you</span>} />}
          </div>
          {e.live_results_enabled && (
            <button onClick={() => go({ name: 'results', slug })} className="btn-blue w-full rounded-lg py-3 font-black tracking-widest text-white">VIEW LIVE RESULTS →</button>
          )}
          <button onClick={() => go({ name: 'dashboard' })} className="mt-3 w-full text-sm text-gray-400 hover:text-white">Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}
function Row({ k, v }) {
  return <div className="flex justify-between gap-3 border-b border-blue-500/20 py-2 text-sm"><span className="shrink-0 text-gray-400">{k}</span><span className="text-right font-medium text-white">{v}</span></div>;
}

function IntegrityBadge({ slug }) {
  const [report, setReport] = useState(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    try { const d = await api(`/elections/${slug}/integrity`); setReport(d); } catch {}
  }, [slug]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  if (!report) return null;
  return (
    <div className="mb-6">
      <button onClick={() => setOpen(v => !v)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${report.verified ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/50 bg-red-500/10'}`}>
        <div className="flex items-center gap-3">
          {report.verified ? <ShieldCheck className="h-6 w-6 text-green-400" /> : <AlertTriangle className="h-6 w-6 text-red-400" />}
          <div>
            <div className={`text-sm font-black tracking-widest ${report.verified ? 'text-green-300' : 'text-red-300'}`}>
              {report.verified ? 'COUNT MACHINE-VERIFIED ✓' : 'INTEGRITY ALERT — CHECK FAILED'}
            </div>
            <div className="text-xs text-gray-400">{report.checks.filter(c => c.pass).length}/{report.checks.length} automated checks passed · {report.total_ballots} ballots audited</div>
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="card-gold mt-2 rounded-xl p-4">
          <div className="space-y-2">
            {report.checks.map(c => (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                <div>
                  <div className={`font-bold ${c.pass ? 'text-white' : 'text-red-300'}`}>{c.label}</div>
                  <div className="text-xs text-gray-400">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsPage({ slug, go, cert }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [showRecount, setShowRecount] = useState(false);
  const [showCert, setShowCert] = useState(!!cert);
  const load = useCallback(async () => {
    try { const d = await api(`/elections/${slug}/results`); setData(d); setErr(null); }
    catch (e) { setErr(e.message); }
  }, [slug]);
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);
  const cd = useCountdown(data?.election?.ends_at || Date.now());

  if (err) return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="card-neon rounded-xl p-8">
        <Lock className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <div className="mb-4 text-amber-300">{err}</div>
        <button onClick={() => go({ name: 'dashboard' })} className="text-sm text-blue-300 hover:text-blue-200">← Back to Dashboard</button>
      </div>
    </div>
  );
  if (!data) return <div className="p-10 text-center text-gray-400">Loading results...</div>;
  const isOpen = data.election.status === 'open';
  const sorted = [...data.candidates].sort((a, b) => b.votes - a.votes);
  const isTie = sorted.length > 1 && sorted[1].votes === sorted[0].votes;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => go({ name: 'dashboard' })} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
        <button onClick={() => shareLink(slug)} className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/10"><Share2 className="h-3.5 w-3.5" /> SHARE</button>
      </div>
      <div className="mb-2 flex items-center gap-2">
        {isOpen ? (
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-green-300">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" /> LIVE RESULTS
          </div>
        ) : (
          <div className="rounded-full bg-gray-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-gray-300">FINAL CERTIFIED RESULTS</div>
        )}
      </div>
      <h1 className="mb-6 text-2xl font-black text-white sm:text-3xl">{data.election.title}</h1>

      <IntegrityBadge slug={slug} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setShowRecount(true)} className="flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2.5 text-sm font-black tracking-wide text-purple-200 hover:bg-purple-500/20">
          <Sparkles className="h-4 w-4" /> AI RECOUNT
        </button>
        <button onClick={() => downloadLedger(slug)} className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-4 py-2.5 text-sm font-bold text-blue-200 hover:bg-blue-500/10">
          <ListChecks className="h-4 w-4" /> Verification Ledger (CSV)
        </button>
        {!isOpen && (
          <button onClick={() => setShowCert(true)} className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-sm font-bold text-amber-300 hover:bg-amber-500/10">
            <Award className="h-4 w-4" /> Download Certificate
          </button>
        )}
      </div>

      <MetricsBar slug={slug} />

      <div className="card-neon mb-6 grid grid-cols-2 gap-4 rounded-xl p-5 sm:p-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Total Ballots</div>
          <div className="text-3xl font-black text-white sm:text-4xl">{data.total_votes}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-300">{isOpen ? 'Polls Close In' : 'Status'}</div>
          <div className={`font-mono text-xl font-black sm:text-2xl ${isOpen ? 'text-white' : 'text-red-300'}`}>
            {isOpen ? `${pad(cd.d)}d ${pad(cd.h)}:${pad(cd.m)}:${pad(cd.s)}` : 'CLOSED'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((c, i) => (
          <div key={c.id} className="card-neon animate-fadeup rounded-xl p-4 sm:p-5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {c.image_url && <img src={c.image_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-blue-500/40 object-cover" />}
                <div className="truncate font-bold text-white">{c.name}</div>
                {!isOpen && i === 0 && !isTie && c.votes > 0 && <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-300">🏆 WINNER</span>}
              </div>
              <div className="font-mono text-xl font-black text-amber-300 sm:text-2xl">{c.percentage.toFixed(1)}%</div>
            </div>
            <div className="mb-3 text-xs text-gray-400">{c.votes} votes</div>
            <div className="result-bar h-3 overflow-hidden rounded-full bg-black/60">
              <div style={{ width: `${c.percentage}%` }} className={`h-full rounded-full bg-gradient-to-r ${['from-red-600 to-red-400', 'from-blue-600 to-blue-400', 'from-amber-500 to-amber-300', 'from-emerald-600 to-emerald-400'][i % 4]} transition-all duration-700`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-xs text-gray-500">Last updated: {new Date(data.last_updated).toLocaleTimeString()} · Counts are recounted and signature-verified continuously</div>

      {showRecount && <RecountModal slug={slug} onClose={() => setShowRecount(false)} />}
      {showCert && <CertificateModal slug={slug} onClose={() => setShowCert(false)} />}
    </div>
  );
}

// ---- Verification ledger CSV download (masked, privacy-preserving) ----
async function downloadLedger(slug) {
  try {
    const d = await api(`/elections/${slug}/ledger`);
    const rows = [];
    if (d.anonymous) {
      rows.push(['# VoteVault Verification Ledger — ANONYMOUS ELECTION']);
      rows.push([`# ${d.election.title} (${d.election.region})`]);
      rows.push([d.note]);
      rows.push([]);
      rows.push(['PARTICIPANTS (who voted — masked, no choice shown)']);
      rows.push(['Masked Voter', 'Masked Email', 'Voted At']);
      d.participants.forEach(p => rows.push([p.voter, p.email, new Date(p.voted_at).toLocaleString()]));
      rows.push([]);
      rows.push(['ANONYMIZED BALLOTS (choices — no identity)']);
      rows.push(['Choice', 'Ballot Fingerprint', 'Signature Valid', 'Cast At']);
      d.ballots.forEach(b => rows.push([b.choice, b.ballot_hash, b.signature_valid ? 'YES' : 'NO', new Date(b.created_at).toLocaleString()]));
    } else {
      rows.push(['# VoteVault Verification Ledger — PUBLIC BALLOT']);
      rows.push([`# ${d.election.title} (${d.election.region})`]);
      rows.push([d.note]);
      rows.push([]);
      rows.push(['Masked Voter', 'Masked Email', 'Choice', 'Ballot Fingerprint', 'Signature Valid', 'Cast At']);
      d.entries.forEach(e => rows.push([e.voter, e.email, e.choice, e.ballot_hash, e.signature_valid ? 'YES' : 'NO', new Date(e.created_at).toLocaleString()]));
    }
    rows.push([]);
    rows.push([`# Total ballots: ${d.total_ballots} · Valid signatures: ${d.signatures_valid}`]);
    const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `votevault-ledger-${slug}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success('Verification ledger downloaded');
  } catch (e) { toast.error(e.message); }
}

function MetricsBar({ slug }) {
  const [m, setM] = useState(null);
  useEffect(() => { api(`/elections/${slug}/metrics`).then(setM).catch(() => {}); }, [slug]);
  if (!m) return null;
  const peak = m.timeline.length ? Math.max(...m.timeline.map(t => t.ballots)) : 0;
  return (
    <div className="card-neon mb-6 rounded-xl p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300"><TrendingUp className="h-4 w-4" /> Advanced Metrics</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Turnout" v={`${m.turnout_pct}%`} sub={`${m.total_ballots}/${m.eligible_voters}`} />
        <Metric label="Leader" v={m.leader ? m.leader.name : '—'} sub={m.leader ? `${m.leader.percentage}%` : ''} />
        <Metric label={m.is_tie ? 'Margin' : 'Margin'} v={m.is_tie ? 'TIE' : `${m.margin}`} sub={m.is_tie ? '' : `${m.margin_pct}%`} />
        <Metric label="Options" v={m.options_count} sub={`${m.duration_hours}h window`} />
      </div>
      {m.timeline.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Ballots over time (hourly)</div>
          <div className="flex h-16 items-end gap-1">
            {m.timeline.map(t => (
              <div key={t.hour} title={`Hour ${t.hour}: ${t.ballots}`} className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-amber-400" style={{ height: `${peak ? (t.ballots * 100 / peak) : 0}%`, minHeight: '2px' }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function Metric({ label, v, sub }) {
  return (
    <div className="rounded-lg border border-blue-500/15 bg-black/30 p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">{label}</div>
      <div className="mt-0.5 truncate text-lg font-black text-white">{v}</div>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
    </div>
  );
}

function RecountModal({ slug, onClose }) {
  const [state, setState] = useState('running');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const d = await api(`/elections/${slug}/recount`, { method: 'POST' }); if (alive) { setRes(d); setState('done'); } }
      catch (e) { if (alive) { setErr(e.message); setState('error'); } }
    })();
    return () => { alive = false; };
  }, [slug]);
  const rc = res?.recount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card-neon max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-300"><Sparkles className="h-4 w-4" /> AI-Assisted Independent Recount</div>
        <h3 className="mb-4 text-lg font-black text-white">{res?.election?.title || 'Recounting…'}</h3>
        {state === 'running' && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <div className="text-sm font-bold text-white">Re-tallying every signed ballot…</div>
            <div className="mt-1 text-xs text-gray-400">Verifying signatures · reconciling records · asking AI to audit</div>
          </div>
        )}
        {state === 'error' && <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-300">{err}</div>}
        {state === 'done' && rc && (
          <>
            <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm font-black tracking-widest ${rc.verified ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
              {rc.verified ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {rc.verified ? 'RECOUNT VERIFIED — TALLIES RECONCILE' : 'RECOUNT FLAGGED ANOMALIES'}
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Ballots recounted" v={rc.total_ballots} />
              <Metric label="Signatures valid" v={`${rc.signature_checks.valid}/${rc.signature_checks.total}`} />
              <Metric label="Unique voters" v={rc.unique_voters} />
              <Metric label="Margin" v={rc.margin} sub={`${rc.margin_pct.toFixed(1)}%`} />
            </div>
            <div className="mb-4 space-y-2">
              {rc.recounted.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-blue-500/15 bg-black/30 px-3 py-2 text-sm">
                  <span className="truncate text-white">{i === 0 && c.votes > 0 ? '🏆 ' : ''}{c.name}</span>
                  <span className="font-mono text-amber-300">{c.votes} · {c.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300">
                <Cpu className="h-3.5 w-3.5" /> AI Auditor Assessment {res.ai_available ? `· ${res.ai_model}` : '· deterministic'}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{res.ai_assessment}</p>
            </div>
            {rc.anomalies.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
                <div className="mb-1 font-black">Anomalies:</div>
                <ul className="list-inside list-disc space-y-0.5">{rc.anomalies.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </>
        )}
        <button onClick={onClose} className="btn-blue mt-5 w-full rounded-lg py-2.5 text-sm font-black tracking-widest text-white">CLOSE</button>
      </div>
    </div>
  );
}

function CertificateModal({ slug, onClose }) {
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api(`/elections/${slug}/certificate`).then(setC).catch(e => setErr(e.message)); }, [slug]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 no-print" onClick={onClose}>
      <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        {err ? (
          <div className="card-neon rounded-2xl p-8 text-center text-amber-300">{err}<div className="mt-4"><button onClick={onClose} className="text-sm text-blue-300">Close</button></div></div>
        ) : !c ? (
          <div className="card-neon rounded-2xl p-10 text-center text-gray-400">Generating certificate…</div>
        ) : (
          <>
            <div className="mb-3 flex justify-end gap-2 no-print">
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-black hover:bg-amber-400"><Download className="h-4 w-4" /> Print / Save as PDF</button>
              <button onClick={onClose} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">Close</button>
            </div>
            <div className="cert-print rounded-2xl border-4 border-double border-amber-600/60 bg-[#0b1020] p-8 sm:p-12">
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-2 text-amber-400"><Landmark className="h-6 w-6" /><span className="text-xl font-black tracking-widest">VOTEVAULT</span></div>
                <div className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Certificate of Election Results</div>
                <div className="mx-auto mb-6 h-px w-24 bg-amber-500/50" />
                <div className="text-xs uppercase tracking-widest text-gray-400">This certifies the final, machine-verified results of</div>
                <h2 className="my-3 text-2xl font-black text-white sm:text-3xl">{c.election.title}</h2>
                <div className="mb-6 text-sm text-gray-400">{c.election.region} · {typeLabel(c.election.election_type)}</div>

                {c.winner ? (
                  <div className="mx-auto mb-6 max-w-sm rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Certified Winner</div>
                    <div className="mt-1 text-2xl font-black text-white">🏆 {c.winner.name}</div>
                    <div className="text-sm text-amber-200">{c.winner.votes} votes · {c.winner.percentage.toFixed(1)}%</div>
                  </div>
                ) : (
                  <div className="mx-auto mb-6 max-w-sm rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-lg font-black text-blue-200">{c.total_votes === 0 ? 'No ballots were cast' : 'RESULT: TIE'}</div>
                )}

                <table className="mx-auto mb-6 w-full max-w-md text-left text-sm">
                  <tbody>
                    {c.results.map((r, i) => (
                      <tr key={r.id} className="border-b border-blue-500/15">
                        <td className="py-2 font-medium text-white">{i === 0 && r.votes > 0 && c.winner ? '🏆 ' : ''}{r.name}</td>
                        <td className="py-2 text-right font-mono text-amber-300">{r.votes} ({r.percentage.toFixed(1)}%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={`mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black tracking-widest ${c.integrity.verified ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                  {c.integrity.verified ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {c.integrity.verified ? 'CRYPTOGRAPHICALLY VERIFIED' : 'INTEGRITY REVIEW REQUIRED'}
                </div>

                <div className="grid grid-cols-2 gap-3 text-left text-xs text-gray-400 sm:grid-cols-3">
                  <div><span className="block font-bold text-gray-300">Total Ballots</span>{c.total_votes}</div>
                  <div><span className="block font-bold text-gray-300">Opened</span>{new Date(c.election.starts_at).toLocaleString()}</div>
                  <div><span className="block font-bold text-gray-300">Closed</span>{new Date(c.election.ends_at).toLocaleString()}</div>
                  <div><span className="block font-bold text-gray-300">Ballot Type</span>{c.election.anonymous_ballot ? 'Anonymous' : 'Recorded'}</div>
                  <div><span className="block font-bold text-gray-300">Issued</span>{new Date(c.issued_at).toLocaleString()}</div>
                  <div className="col-span-2 sm:col-span-1"><span className="block font-bold text-gray-300">Certificate ID</span><span className="font-mono text-amber-300">{c.certificate_id}</span></div>
                </div>
                <div className="mx-auto mt-6 h-px w-24 bg-amber-500/50" />
                <p className="mt-4 text-[10px] leading-relaxed text-gray-500">This certificate reflects an automated, cryptographically signed and machine-verified count. Certificate ID is derived from the immutable ballot outcome (HMAC-SHA256) and can be reproduced to detect tampering. VoteVault is not certified for governmental elections.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPage({ user, go }) {
  const [me, setMe] = useState(null);
  const [votes, setVotes] = useState(null);
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api('/auth/me').then(d => setMe(d.user)).catch(() => {});
    api('/me/votes').then(d => setVotes(d.votes)).catch(() => {});
  }, []);
  const changePw = async (e) => {
    e.preventDefault();
    if (nw !== nw2) return toast.error('New passwords do not match');
    if (nw.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { current_password: cur, new_password: nw } });
      toast.success('Password updated successfully');
      setCur(''); setNw(''); setNw2('');
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const hasPassword = me?.has_password;
  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <button onClick={() => go({ name: 'dashboard' })} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
        <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Settings</h1>
        <p className="mb-6 text-sm text-gray-400">Manage your account, security, and review your voting history.</p>

        <div className="card-neon mb-6 rounded-xl p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300"><Users className="h-4 w-4" /> Account</div>
          <Row k="Name" v={user?.name} />
          <Row k="Email" v={me?.email || user?.email} />
          <Row k="Role" v={<span className="capitalize">{me?.role || user?.role}</span>} />
          <Row k="Sign-in method" v={me?.provider === 'google' ? 'Google' : 'Email & password'} />
        </div>

        <div className="card-neon mb-6 rounded-xl p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300"><Lock className="h-4 w-4" /> {hasPassword ? 'Reset Password' : 'Set a Password'}</div>
          {me && !hasPassword && <p className="mb-3 text-xs text-amber-300">You signed in with Google. Set a password to also enable email/password login.</p>}
          <form onSubmit={changePw} className="space-y-3">
            {hasPassword && <Input label="Current Password" type="password" value={cur} onChange={setCur} required />}
            <Input label="New Password" type="password" value={nw} onChange={setNw} required />
            <Input label="Confirm New Password" type="password" value={nw2} onChange={setNw2} required />
            <button disabled={saving} className="btn-neon rounded-lg px-6 py-2.5 text-sm font-black tracking-widest text-white disabled:opacity-50">{saving ? 'SAVING…' : 'UPDATE PASSWORD'}</button>
          </form>
        </div>

        <div className="card-neon mb-6 rounded-xl p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-300"><CheckCircle2 className="h-4 w-4" /> Your Voting History</div>
          {!votes ? <div className="text-sm text-gray-500">Loading…</div> : votes.length === 0 ? (
            <div className="text-sm text-gray-400">You haven't cast any ballots yet. Head to <button onClick={() => go({ name: 'dashboard' })} className="text-amber-300 hover:underline">Elections</button> to vote.</div>
          ) : (
            <div className="space-y-2">
              {votes.map(v => (
                <div key={v.election_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/15 bg-black/30 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{v.title}</div>
                    <div className="text-xs text-gray-500">{v.region} · {typeLabel(v.election_type)} · {new Date(v.voted_at).toLocaleString()}</div>
                    {v.anonymous_ballot ? <div className="text-[11px] text-blue-300">🔒 Anonymous — your choice is not stored with your identity</div> : v.choice && <div className="text-[11px] text-amber-300">You voted: {v.choice}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-green-500/10 px-2 py-1 font-mono text-[11px] text-green-300">{v.confirmation}</span>
                    <button onClick={() => go({ name: 'results', slug: v.slug })} className="rounded border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-200 hover:bg-blue-500/10">Results</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-neon rounded-xl p-5 text-center sm:p-6">
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-amber-300">Bonus — Free AI Tools</div>
          <AiToolsLinks variant="footer" />
        </div>
      </div>
    </div>
  );
}

function NotifPanel({ notifs, onClose }) {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => { api('/prefs').then(d => setPrefs(d.prefs)).catch(() => {}); }, []);
  const toggle = async (k) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try { await api('/prefs', { method: 'POST', body: { [k]: next[k] } }); } catch (e) { toast.error(e.message); }
  };
  const prefLabels = { new_election: 'New election announcements', vote_confirmation: 'Vote confirmation receipts', results_available: 'Results & winner emails', closing_soon: 'Closing-soon reminders' };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-blue-500/30 bg-[#080e22] p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-widest text-white">NOTIFICATIONS</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2">
          {notifs.length === 0 && <div className="text-sm text-gray-500">No notifications yet.</div>}
          {notifs.map(n => (
            <div key={n.id} className={`rounded-lg border p-3 ${n.read ? 'border-blue-500/20 bg-black/30' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <div className="text-sm font-bold text-white">{n.title}</div>
              <div className="text-xs text-gray-300">{n.message}</div>
              <div className="mt-1 text-[10px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        {prefs && (
          <div className="mt-6 border-t border-blue-500/20 pt-4">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-blue-300">Email Preferences</h3>
            <div className="space-y-2">
              {Object.keys(prefLabels).map(k => (
                <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg border border-blue-500/20 bg-black/30 p-3">
                  <span className="text-sm text-gray-200">{prefLabels[k]}</span>
                  <input type="checkbox" checked={!!prefs[k]} onChange={() => toggle(k)} className="h-5 w-5 accent-amber-500" />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ user, go }) {
  const [data, setData] = useState({ elections: [], total_voters: 0 });
  const [integrityFor, setIntegrityFor] = useState(null);
  const [report, setReport] = useState(null);
  const load = useCallback(async () => { try { const d = await api('/admin/elections'); setData(d); } catch (e) { toast.error(e.message); } }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const active = data.elections.filter(e => e.status === 'open');
  const upcoming = data.elections.filter(e => e.status === 'scheduled');
  const totalVotes = data.elections.reduce((s, e) => s + e.total_votes, 0);

  const closeElection = async (id) => {
    if (!confirm('Close this election now? Results will be finalized and voters emailed. This cannot be undone.')) return;
    try { await api(`/admin/elections/${id}/close`, { method: 'POST' }); toast.success('Election closed — results notifications sent'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const runIntegrity = async (e) => {
    setIntegrityFor(e); setReport(null);
    try { const d = await api(`/admin/elections/${e.id}/integrity`); setReport(d); }
    catch (er) { toast.error(er.message); setIntegrityFor(null); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Election Administration</h1>
        <button onClick={() => go({ name: 'admin-create' })} className="btn-neon rounded-lg px-4 py-2.5 text-sm font-black tracking-widest text-white"><Plus className="mr-1 inline h-4 w-4" /> NEW ELECTION</button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active Elections" v={active.length} />
        <Stat label="Total Ballots Cast" v={totalVotes} />
        <Stat label="Upcoming" v={upcoming.length} />
        <Stat label="Registered Voters" v={data.total_voters} />
      </div>

      <div className="card-neon overflow-x-auto rounded-xl">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-blue-500/10 text-left text-xs uppercase tracking-widest text-blue-300">
            <tr>
              <th className="px-4 py-3">Election</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Eligibility</th>
              <th className="px-4 py-3">Ballots</th>
              <th className="px-4 py-3">Turnout</th>
              <th className="px-4 py-3">Closes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.elections.map(e => (
              <tr key={e.id} className="border-t border-blue-500/10">
                <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-300">{e.eligibility_mode === 'voter_list' ? `📋 List (${e.eligible})` : 'All voters'}</td>
                <td className="px-4 py-3 text-gray-300">{e.total_votes}</td>
                <td className="px-4 py-3 text-gray-300">{e.participation.toFixed(1)}%</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.ends_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button title="View results" onClick={() => go({ name: 'results', slug: e.slug })} className="rounded border border-blue-500/30 px-2 py-1 text-xs text-blue-200 hover:bg-blue-500/10"><Eye className="h-3 w-3" /></button>
                    <button title="Copy public share link" onClick={() => shareLink(e.slug)} className="rounded border border-blue-500/30 px-2 py-1 text-xs text-blue-200 hover:bg-blue-500/10"><Share2 className="h-3 w-3" /></button>
                    <button title="Run integrity audit" onClick={() => runIntegrity(e)} className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10"><ShieldCheck className="h-3 w-3" /></button>
                    {e.status === 'open' && (
                      <button onClick={() => closeElection(e.id)} className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">CLOSE</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button onClick={() => go({ name: 'admin-audit' })} className="flex items-center gap-2 rounded-lg border border-blue-500/30 px-4 py-2 text-blue-200 hover:bg-blue-500/10"><ScrollText className="h-4 w-4" /> Audit Log</button>
        <button onClick={() => go({ name: 'admin-emails' })} className="flex items-center gap-2 rounded-lg border border-blue-500/30 px-4 py-2 text-blue-200 hover:bg-blue-500/10"><Mail className="h-4 w-4" /> Email Delivery Log</button>
      </div>

      {integrityFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setIntegrityFor(null)}>
          <div className="card-neon max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-amber-300">Automated Integrity Audit</div>
            <h3 className="mb-4 text-lg font-black text-white">{integrityFor.title}</h3>
            {!report ? (
              <div className="py-8 text-center"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /><div className="text-sm text-gray-400">Recounting ballots &amp; verifying signatures…</div></div>
            ) : (
              <>
                <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-sm font-black tracking-widest ${report.verified ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                  {report.verified ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  {report.verified ? 'ALL CHECKS PASSED — COUNT VERIFIED' : 'INTEGRITY ALERT — REVIEW REQUIRED'}
                </div>
                <div className="space-y-3">
                  {report.checks.map(c => (
                    <div key={c.id} className="flex items-start gap-2 text-sm">
                      {c.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                      <div>
                        <div className={`font-bold ${c.pass ? 'text-white' : 'text-red-300'}`}>{c.label}</div>
                        <div className="text-xs text-gray-400">{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-gray-500">{report.total_ballots} ballots audited · {report.total_participants} participation records · {new Date(report.verified_at).toLocaleString()}</div>
              </>
            )}
            <button onClick={() => setIntegrityFor(null)} className="btn-blue mt-5 w-full rounded-lg py-2.5 text-sm font-black tracking-widest text-white">CLOSE REPORT</button>
          </div>
        </div>
      )}
    </div>
  );
}
function Stat({ label, v }) {
  return <div className="card-neon rounded-xl p-4 sm:p-5"><div className="text-[10px] font-bold uppercase tracking-widest text-blue-300 sm:text-xs">{label}</div><div className="mt-1 text-2xl font-black text-white sm:text-3xl">{v}</div></div>;
}
function StatusBadge({ status }) {
  const map = { open: 'bg-green-500/20 text-green-300', scheduled: 'bg-blue-500/20 text-blue-300', closed: 'bg-gray-500/20 text-gray-300', draft: 'bg-amber-500/20 text-amber-300' };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${map[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
}

function CreateElectionWizard({ go, origin = 'admin' }) {
  const backView = origin === 'dashboard' ? { name: 'dashboard' } : { name: 'admin' };
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', region: '', election_type: 'candidate_race',
    starts_at: new Date(Date.now() + 60000).toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
    live_results_enabled: true, results_visibility: 'during_voting', anonymous_ballot: true,
    eligibility_mode: 'all_users', voter_emails: [],
    candidates: [
      { name: '', description: '', statement: '', image_url: '' },
      { name: '', description: '', statement: '', image_url: '' },
    ],
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updC = (i, k, v) => setForm(f => ({ ...f, candidates: f.candidates.map((c, j) => j === i ? { ...c, [k]: v } : c) }));
  const TOTAL = 5;

  const handlePhoto = (i, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 480 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        updC(i, 'image_url', canvas.toDataURL('image/jpeg', 0.82));
        toast.success('Photo attached');
      };
      img.onerror = () => toast.error('Could not read that image');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const parseEmails = (text) => Array.from(new Set((String(text).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []).map(x => x.toLowerCase())));
  const addEmails = (emails) => {
    if (!emails.length) return toast.error('No valid email addresses found');
    const merged = Array.from(new Set([...form.voter_emails, ...emails]));
    upd('voter_emails', merged);
    toast.success(`${emails.length} email(s) added — ${merged.length} total on the roll`);
  };
  const handleCsv = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => addEmails(parseEmails(ev.target.result));
    reader.onerror = () => toast.error('Could not read file');
    reader.readAsText(file);
  };

  const next = () => {
    if (step === 1 && !form.title.trim()) return toast.error('Election title is required');
    if (step === 2) {
      if (new Date(form.ends_at) <= new Date(form.starts_at)) return toast.error('Closing time must be after opening time');
      if (new Date(form.ends_at) <= new Date()) return toast.error('Closing time must be in the future');
    }
    if (step === 3 && form.candidates.filter(c => c.name.trim()).length < 2) return toast.error('At least 2 named ballot options are required');
    if (step === 4 && form.eligibility_mode === 'voter_list' && form.voter_emails.length === 0) return toast.error('Upload or paste at least one voter email, or switch to All Registered Voters');
    setStep(step + 1);
  };

  const submit = async () => {
    setPublishing(true);
    try {
      const validC = form.candidates.filter(c => c.name.trim());
      const d = await api('/elections', { method: 'POST', body: {
        ...form, candidates: validC,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      } });
      toast.success('Election published! Eligible voters are being notified.');
      shareLink(d.slug);
      go(backView);
    } catch (e) { toast.error(e.message); } finally { setPublishing(false); }
  };

  const stepNames = ['Basics', 'Timing', 'Ballot', 'Eligibility', 'Review'];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <button onClick={() => go(backView)} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Create a Custom Election</h1>
      <p className="mb-4 text-sm text-gray-400">Free for everyone. Set it up in five quick steps — one ballot per voter, cryptographically signed, machine-verified.</p>
      <div className="mb-4 text-sm text-blue-300">Step {step} of {TOTAL} — {stepNames[step - 1]}</div>
      <div className="mb-6 flex gap-1">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-amber-500' : 'bg-blue-500/20'}`} />)}
      </div>

      <div className="card-neon rounded-xl p-5 sm:p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Basic Information</div>
            <Input label="Election Title" value={form.title} onChange={v => upd('title', v)} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Region / Jurisdiction" value={form.region} onChange={v => upd('region', v)} />
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-blue-300">Type of Vote</label>
                <select value={form.election_type} onChange={e => upd('election_type', e.target.value)}
                  className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-4 py-3 text-white focus:border-amber-400 focus:outline-none">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-[#0b1020]">{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-blue-300">Description &amp; instructions for voters</label>
              <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={4}
                className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-4 py-3 text-white focus:border-amber-400 focus:outline-none" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Voting Window</div>
            <Input label="Polls Open At" type="datetime-local" value={form.starts_at} onChange={v => upd('starts_at', v)} />
            <Input label="Polls Close At" type="datetime-local" value={form.ends_at} onChange={v => upd('ends_at', v)} />
            <p className="rounded-lg bg-blue-500/5 p-3 text-xs text-gray-400"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-green-400" /> The server clock enforces this window. Ballots submitted after closing are rejected automatically — no browser can override it.</p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Ballot Options / Candidates</div>
            {form.candidates.map((c, i) => (
              <div key={i} className="rounded-lg border border-blue-500/20 bg-black/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-300">Option {i + 1}</div>
                  {form.candidates.length > 2 && (
                    <button onClick={() => upd('candidates', form.candidates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="mb-3 flex items-start gap-3">
                  {c.image_url ? (
                    <div className="relative">
                      <img src={c.image_url} alt="" className="h-16 w-16 rounded-full border-2 border-blue-500/40 object-cover" />
                      <button onClick={() => updC(i, 'image_url', '')} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-blue-500/40 text-blue-300 hover:border-amber-400 hover:text-amber-300">
                      <Upload className="h-4 w-4" />
                      <span className="text-[8px] font-bold">PHOTO</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(i, e.target.files?.[0])} />
                    </label>
                  )}
                  <div className="flex-1 space-y-2">
                    <input placeholder="Name *" value={c.name} onChange={e => updC(i, 'name', e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-white focus:border-amber-400 focus:outline-none" />
                    <input placeholder="Or paste photo URL (optional)" value={c.image_url && c.image_url.startsWith('data:') ? '' : c.image_url} onChange={e => updC(i, 'image_url', e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none" />
                  </div>
                </div>
                <input placeholder="Short description (one line)" value={c.description} onChange={e => updC(i, 'description', e.target.value)} className="mb-2 w-full rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-white focus:border-amber-400 focus:outline-none" />
                <textarea placeholder="Candidate statement (shown on the ballot)" value={c.statement} onChange={e => updC(i, 'statement', e.target.value)} rows={2} className="mb-2 w-full rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-white focus:border-amber-400 focus:outline-none" />
                <input type="email" placeholder="Candidate email (optional) — they'll get a private link to build their own profile" value={c.email || ''} onChange={e => updC(i, 'email', e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none" />
              </div>
            ))}
            <button onClick={() => upd('candidates', [...form.candidates, { name: '', description: '', statement: '', image_url: '', email: '' }])} className="w-full rounded-lg border-2 border-dashed border-blue-500/30 py-3 text-sm text-blue-300 hover:border-amber-400"><Plus className="mr-1 inline h-4 w-4" /> Add Option</button>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Who Can Vote?</div>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${form.eligibility_mode === 'all_users' ? 'border-amber-400 bg-amber-500/5' : 'border-blue-500/20 bg-black/30'}`}>
              <input type="radio" checked={form.eligibility_mode === 'all_users'} onChange={() => upd('eligibility_mode', 'all_users')} className="mt-1 h-4 w-4 accent-amber-500" />
              <div>
                <div className="font-bold text-white">All Registered Voters</div>
                <div className="text-xs text-gray-400">Anyone with a VoteVault account can cast one ballot.</div>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${form.eligibility_mode === 'voter_list' ? 'border-amber-400 bg-amber-500/5' : 'border-blue-500/20 bg-black/30'}`}>
              <input type="radio" checked={form.eligibility_mode === 'voter_list'} onChange={() => upd('eligibility_mode', 'voter_list')} className="mt-1 h-4 w-4 accent-amber-500" />
              <div>
                <div className="font-bold text-white">Certified Voter List (CSV import)</div>
                <div className="text-xs text-gray-400">Only the emails on your list may vote. Everyone else is rejected server-side — the standard for real organizational elections.</div>
              </div>
            </label>
            {form.eligibility_mode === 'voter_list' && (
              <div className="space-y-3 rounded-lg border border-blue-500/20 bg-black/30 p-4">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-500/40 py-4 text-sm font-bold text-blue-300 hover:border-amber-400 hover:text-amber-300">
                  <Upload className="h-4 w-4" /> Upload CSV / TXT of voter emails
                  <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={e => { handleCsv(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                <div className="flex gap-2">
                  <textarea placeholder="…or paste emails here (any format — we'll find them)" value={pasteText} onChange={e => setPasteText(e.target.value)} rows={2} className="flex-1 rounded-lg border border-blue-500/30 bg-black/50 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none" />
                  <button onClick={() => { addEmails(parseEmails(pasteText)); setPasteText(''); }} className="btn-blue rounded-lg px-4 text-xs font-black text-white">ADD</button>
                </div>
                <div className="text-xs font-bold text-amber-300">{form.voter_emails.length} voter(s) on the certified roll</div>
                {form.voter_emails.length > 0 && (
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {form.voter_emails.slice(0, 60).map(em => (
                      <span key={em} className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-200">
                        {em}
                        <button onClick={() => upd('voter_emails', form.voter_emails.filter(x => x !== em))} className="text-red-400 hover:text-red-300"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    {form.voter_emails.length > 60 && <span className="text-[10px] text-gray-400">+{form.voter_emails.length - 60} more</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Results, Privacy &amp; Review</div>
            <label className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-black/30 p-3">
              <input type="checkbox" checked={form.live_results_enabled} onChange={e => upd('live_results_enabled', e.target.checked)} className="h-5 w-5 accent-amber-500" />
              <div>
                <div className="font-bold text-white">Live Results</div>
                <div className="text-xs text-gray-400">Show machine-verified results updating in real time while polls are open</div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-black/30 p-3">
              <input type="checkbox" checked={form.anonymous_ballot} onChange={e => upd('anonymous_ballot', e.target.checked)} className="h-5 w-5 accent-amber-500" />
              <div>
                <div className="font-bold text-white">Anonymous Ballot</div>
                <div className="text-xs text-gray-400">Ballot choices stored with no link to voter identity (recommended)</div>
              </div>
            </label>
            <div className="rounded-lg border border-blue-500/20 bg-black/30 p-4 text-sm">
              <div className="mb-2 text-xs font-black uppercase tracking-widest text-amber-300">Final Review</div>
              <Row k="Title" v={form.title || '—'} />
              <Row k="Voting window" v={`${new Date(form.starts_at).toLocaleString()} → ${new Date(form.ends_at).toLocaleString()}`} />
              <Row k="Ballot options" v={`${form.candidates.filter(c => c.name.trim()).length} (${form.candidates.filter(c => c.image_url).length} with photos)`} />
              <Row k="Eligibility" v={form.eligibility_mode === 'voter_list' ? `Certified list — ${form.voter_emails.length} voters` : 'All registered voters'} />
              <Row k="Privacy" v={form.anonymous_ballot ? 'Anonymous ballot' : 'Recorded ballot'} />
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">On publish: eligible voters are notified in-app and by email, the public share page goes live, and all integrity mechanisms (one-vote enforcement, ballot signatures, server timing) are active immediately.</div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : go(backView)} className="rounded-lg border border-blue-500/30 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/10">Back</button>
          {step < TOTAL ? (
            <button onClick={next} className="btn-blue rounded-lg px-6 py-2 text-sm font-black text-white">Next →</button>
          ) : (
            <button onClick={submit} disabled={publishing} className="btn-neon rounded-lg px-6 py-2 text-sm font-black tracking-widest text-white disabled:opacity-50">{publishing ? 'PUBLISHING…' : 'PUBLISH ELECTION'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditLog({ go }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api('/admin/audit').then(d => setLogs(d.logs)).catch(e => toast.error(e.message)); }, []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <button onClick={() => go({ name: 'admin' })} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin</button>
      <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Audit Log</h1>
      <p className="mb-6 text-sm text-gray-400">Immutable record of every system event — election lifecycle, ballots accepted, voter roll changes, and integrity checks.</p>
      <div className="card-neon overflow-x-auto rounded-xl">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-blue-500/10 text-left text-xs uppercase tracking-widest text-blue-300">
            <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Detail</th><th className="px-4 py-3">Timestamp</th></tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-blue-500/10">
                <td className="px-4 py-3 font-mono text-amber-300">{l.event_type}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{JSON.stringify(l.meta || {})}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailLog({ go }) {
  const [data, setData] = useState(null);
  useEffect(() => { api('/admin/emails').then(setData).catch(e => toast.error(e.message)); }, []);
  const statusColor = { sent: 'text-green-300', queued_no_key: 'text-amber-300', pending: 'text-blue-300', failed: 'text-red-300' };
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <button onClick={() => go({ name: 'admin' })} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin</button>
      <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Email Delivery Log</h1>
      {data && !data.email_enabled && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong>Email sending is not activated yet.</strong> All emails below are queued. Add your <code className="rounded bg-black/40 px-1">RESEND_API_KEY</code> (free at resend.com) to start real delivery — welcome emails, election announcements, vote receipts, and results/winner notifications will flow automatically.
        </div>
      )}
      <div className="card-neon overflow-x-auto rounded-xl">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-blue-500/10 text-left text-xs uppercase tracking-widest text-blue-300">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Time</th></tr>
          </thead>
          <tbody>
            {(data?.events || []).map(ev => (
              <tr key={ev.id} className="border-t border-blue-500/10">
                <td className="px-4 py-3 font-mono text-xs text-blue-200">{ev.type}</td>
                <td className="px-4 py-3 text-xs text-gray-300">{ev.to}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{ev.subject}</td>
                <td className={`px-4 py-3 font-mono text-xs ${statusColor[ev.status] || 'text-gray-300'}`}>{ev.status}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(ev.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No emails yet. They appear here when voters register, elections open, votes are cast, and results are published.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
