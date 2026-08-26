'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Vote, ShieldCheck, Zap, Clock, CheckCircle2, ChevronRight, LogOut, Bell,
  Users, BarChart3, Plus, Trash2, Eye, Lock, ArrowLeft, Sparkles, X, AlertCircle
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

function App() {
  const [view, setView] = useState({ name: 'landing' });
  const [user, setUser] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('vv_token');
    if (token) {
      api('/auth/me').then(d => { setUser(d.user); setView({ name: d.user.role === 'admin' ? 'admin' : 'dashboard' }); }).catch(() => localStorage.removeItem('vv_token'));
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    if (!user) return;
    try { const d = await api('/notifications'); setNotifs(d.notifications || []); } catch {}
  }, [user]);
  useEffect(() => { loadNotifs(); const t = setInterval(loadNotifs, 10000); return () => clearInterval(t); }, [loadNotifs]);

  const logout = () => { localStorage.removeItem('vv_token'); setUser(null); setView({ name: 'landing' }); };
  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="min-h-screen scanline">
      {user && <TopNav user={user} view={view} setView={setView} logout={logout} unread={unread} onBell={() => setNotifOpen(true)} />}
      {view.name === 'landing' && <Landing go={setView} />}
      {view.name === 'auth' && <AuthView mode={view.mode} setUser={u => { setUser(u); setView({ name: u.role === 'admin' ? 'admin' : 'dashboard' }); }} switchMode={m => setView({ name: 'auth', mode: m })} back={() => setView({ name: 'landing' })} />}
      {view.name === 'dashboard' && <Dashboard user={user} go={setView} />}
      {view.name === 'election' && <ElectionPage slug={view.slug} user={user} go={setView} />}
      {view.name === 'ballot' && <BallotPage slug={view.slug} user={user} go={setView} />}
      {view.name === 'results' && <ResultsPage slug={view.slug} go={setView} />}
      {view.name === 'admin' && <AdminDashboard user={user} go={setView} />}
      {view.name === 'admin-create' && <CreateElectionWizard go={setView} />}
      {view.name === 'admin-audit' && <AuditLog go={setView} />}
      {notifOpen && <NotifPanel notifs={notifs} onClose={() => { setNotifOpen(false); api('/notifications/read', { method: 'POST' }).then(loadNotifs); }} go={setView} />}
    </div>
  );
}

function TopNav({ user, view, setView, logout, unread, onBell }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-purple-500/20 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <button onClick={() => setView({ name: user.role === 'admin' ? 'admin' : 'dashboard' })} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
            <Vote className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-black tracking-widest text-white">VOTE<span className="text-purple-400">VAULT</span></span>
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setView({ name: 'dashboard' })} className={`hidden text-sm sm:block ${view.name === 'dashboard' ? 'text-purple-300' : 'text-gray-400 hover:text-white'}`}>Dashboard</button>
          {user.role === 'admin' && (
            <>
              <button onClick={() => setView({ name: 'admin' })} className={`hidden text-sm sm:block ${view.name === 'admin' ? 'text-purple-300' : 'text-gray-400 hover:text-white'}`}>Admin</button>
              <button onClick={() => setView({ name: 'admin-audit' })} className="hidden text-sm text-gray-400 hover:text-white sm:block">Audit</button>
            </>
          )}
          <button onClick={onBell} className="relative rounded-lg p-2 text-gray-300 hover:bg-purple-500/10 hover:text-white">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
          </button>
          <div className="hidden text-right sm:block">
            <div className="text-xs text-gray-400">{user.role === 'admin' ? 'ADMIN' : 'VOTER'}</div>
            <div className="text-sm font-medium text-white">{user.name}</div>
          </div>
          <button onClick={logout} className="rounded-lg border border-purple-500/30 p-2 text-gray-300 hover:border-pink-500/60 hover:text-pink-300"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </nav>
  );
}

function Landing({ go }) {
  return (
    <div className="grid-bg min-h-screen">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/60"><Vote className="h-6 w-6 text-white" /></div>
          <span className="text-xl font-black tracking-widest">VOTE<span className="text-purple-400">VAULT</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => go({ name: 'auth', mode: 'login' })} className="text-sm text-gray-300 hover:text-white">Login</button>
          <button onClick={() => go({ name: 'auth', mode: 'register' })} className="btn-neon rounded-lg px-4 py-2 text-sm font-bold text-white">Sign Up</button>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="absolute inset-x-0 top-10 -z-10 mx-auto h-64 max-w-4xl rounded-full bg-purple-500/20 blur-3xl" />
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1.5 text-xs uppercase tracking-widest text-purple-300">
          <Sparkles className="h-3 w-3" /> The People's Online Voting Machine
        </div>
        <h1 className="glow-purple mb-6 text-6xl font-black tracking-tighter sm:text-8xl">
          VOTE<span className="text-purple-400">VAULT</span>
        </h1>
        <p className="mx-auto mb-3 max-w-2xl text-2xl font-light tracking-wide text-gray-200 sm:text-3xl">
          Your Vote. <span className="text-cyan-300">One Ballot.</span> <span className="text-pink-300">One Voice.</span>
        </p>
        <p className="mx-auto mb-10 max-w-2xl text-gray-400">
          Create, participate in, and follow secure elections with controlled voting windows, one-vote-per-election enforcement, and transparent live results.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => go({ name: 'auth', mode: 'register' })} className="btn-neon rounded-xl px-8 py-4 text-base font-black tracking-wider text-white">START VOTING <ChevronRight className="ml-1 inline h-5 w-5" /></button>
          <button onClick={() => go({ name: 'auth', mode: 'login' })} className="rounded-xl border border-cyan-400/40 bg-cyan-500/5 px-8 py-4 text-base font-black tracking-wider text-cyan-300 hover:bg-cyan-500/10">CREATE AN ELECTION</button>
        </div>
        <div className="mt-8 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200/80">
          <strong>Try the demo:</strong> admin@votevault.app / admin123 &nbsp; · &nbsp; voter@demo.app / voter123
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-black tracking-wider text-white">HOW IT WORKS</h2>
        <div className="grid gap-6 sm:grid-cols-4">
          {[
            { i: '01', t: 'Sign Up', d: 'Create your verified voter account.' },
            { i: '02', t: 'Discover', d: 'See what elections are open right now.' },
            { i: '03', t: 'Cast Vote', d: 'Select one option and confirm your ballot.' },
            { i: '04', t: 'Watch Results', d: 'Follow live results as they update.' },
          ].map(s => (
            <div key={s.i} className="card-neon rounded-xl p-6">
              <div className="mb-3 font-mono text-3xl font-black text-purple-400">{s.i}</div>
              <div className="mb-1 text-lg font-bold text-white">{s.t}</div>
              <div className="text-sm text-gray-400">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-black tracking-wider text-white">SECURE INFRASTRUCTURE</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { I: ShieldCheck, t: 'One-Vote Enforcement', d: 'Database-level unique constraints prevent duplicate ballots — even across multiple tabs, refreshes, or direct API attempts.' },
            { I: Clock, t: 'Server-Side Timing', d: 'The backend decides whether voting is allowed. Old browser tabs cannot submit after the deadline passes.' },
            { I: BarChart3, t: 'Transparent Live Results', d: 'Real-time result updates with tamper-evident audit records for every accepted ballot.' },
            { I: Lock, t: 'Anonymous Ballots', d: 'For anonymous elections, ballot choice is stored separately from voter identity.' },
            { I: Zap, t: 'Instant Notifications', d: 'Voters get notified the moment an election opens or is about to close.' },
            { I: Users, t: 'Admin Controls', d: 'Wizard-driven election creation, live participation monitoring, and one-click closing.' },
          ].map((f, i) => (
            <div key={i} className="card-neon rounded-xl p-6">
              <f.I className="mb-3 h-6 w-6 text-cyan-400" />
              <div className="mb-2 text-lg font-bold text-white">{f.t}</div>
              <div className="text-sm text-gray-400">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="card-neon rounded-2xl p-8 text-center">
          <div className="mb-3 text-xs uppercase tracking-widest text-yellow-400">Important Notice</div>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-gray-300">
            VoteVault provides secure voting infrastructure, tamper-evident audit records, and one-vote-per-election enforcement. Software cannot guarantee absolute security. Organizations remain responsible for election procedures. <strong className="text-white">Governmental elections require jurisdiction-specific certification, security testing, accessibility compliance, and legal authorization.</strong> VoteVault should not be represented as an officially certified governmental election system unless certification has actually been obtained.
          </p>
        </div>
      </section>

      <footer className="border-t border-purple-500/10 py-8 text-center text-xs text-gray-500">
        VoteVault · Your Vote. One Ballot. One Voice.
      </footer>
    </div>
  );
}

function AuthView({ mode, setUser, switchMode, back }) {
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
      setUser(d.user);
      toast.success(mode === 'register' ? 'Welcome to VoteVault!' : 'Signed in');
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-neon w-full max-w-md rounded-2xl p-8">
        <button onClick={back} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50"><Vote className="h-7 w-7 text-white" /></div>
          <h1 className="text-2xl font-black tracking-widest text-white">{mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Input label="NAME" value={name} onChange={setName} required />
          )}
          <Input label="EMAIL" type="email" value={email} onChange={setEmail} required />
          <Input label="PASSWORD" type="password" value={password} onChange={setPassword} required />
          <button disabled={loading} className="btn-neon w-full rounded-lg py-3 font-black tracking-widest text-white">
            {loading ? '...' : (mode === 'login' ? 'SIGN IN' : 'SIGN UP')}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? "No account? " : 'Have an account? '}
          <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-purple-300 hover:text-purple-200">{mode === 'login' ? 'Create one' : 'Sign in'}</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-purple-300">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-purple-500/30 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
    </div>
  );
}

function Dashboard({ user, go }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const d = await api('/elections'); setElections(d.elections); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const open = elections.filter(e => e.status === 'open');
  const upcoming = elections.filter(e => e.status === 'scheduled');
  const myVotes = elections.filter(e => e.has_voted);
  const closed = elections.filter(e => e.status === 'closed');

  return (
    <div className="grid-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10">
          <h1 className="glow-purple text-4xl font-black tracking-tight text-white sm:text-5xl">Your Vote Matters.</h1>
          <p className="mt-2 text-gray-400">See what's open, cast your vote, and follow election results in real time.</p>
        </div>

        <Section title="🟢 OPEN FOR VOTING" count={open.length} loading={loading}>
          {open.length === 0 && !loading && <Empty text="No open elections right now." />}
          <div className="grid gap-4 md:grid-cols-2">
            {open.map(e => <ElectionCard key={e.id} e={e} go={go} />)}
          </div>
        </Section>

        {upcoming.length > 0 && (
          <Section title="⏰ UPCOMING" count={upcoming.length}>
            <div className="grid gap-4 md:grid-cols-2">
              {upcoming.map(e => <ElectionCard key={e.id} e={e} go={go} />)}
            </div>
          </Section>
        )}

        {myVotes.length > 0 && (
          <Section title="✅ MY VOTES" count={myVotes.length}>
            <div className="grid gap-4 md:grid-cols-2">
              {myVotes.map(e => <ElectionCard key={e.id} e={e} go={go} />)}
            </div>
          </Section>
        )}

        {closed.length > 0 && (
          <Section title="📊 RECENT RESULTS" count={closed.length}>
            <div className="grid gap-4 md:grid-cols-2">
              {closed.map(e => <ElectionCard key={e.id} e={e} go={go} />)}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children, loading }) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-sm font-black tracking-widest text-purple-300">{title}</h2>
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

  return (
    <div className="card-neon group rounded-xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-white">{e.title}</h3>
        {isOpen && <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-green-300">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" /> LIVE
        </div>}
        {isUpcoming && <div className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-cyan-300">UPCOMING</div>}
        {isClosed && <div className="rounded-full bg-gray-500/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-gray-400">CLOSED</div>}
      </div>
      <p className="mb-4 text-sm text-gray-400 line-clamp-2">{e.description}</p>

      {isOpen && (
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-300">Voting Closes In</div>
          <div className="font-mono text-2xl font-black text-white">
            {pad(cd.d)}<span className="text-purple-400">d</span> {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
          </div>
        </div>
      )}
      {isUpcoming && (
        <div className="mb-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">Opens In</div>
          <div className="font-mono text-xl font-black text-white">{pad(openCd.d)}d {pad(openCd.h)}:{pad(openCd.m)}:{pad(openCd.s)}</div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
        <span>🗳️ <strong className="text-white">{e.total_votes}</strong> votes</span>
        {e.anonymous_ballot && <span>🔒 Anonymous</span>}
      </div>

      {e.has_voted ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-bold text-green-300"><CheckCircle2 className="h-4 w-4" /> VOTE RECORDED</div>
          <button onClick={() => go({ name: 'results', slug: e.slug })} className="rounded-lg border border-purple-500/40 py-2 text-sm font-bold text-purple-200 hover:bg-purple-500/10">VIEW RESULTS</button>
        </div>
      ) : isOpen ? (
        <button onClick={() => go({ name: 'ballot', slug: e.slug })} className="btn-neon w-full rounded-lg py-3 text-sm font-black tracking-widest text-white">CAST YOUR VOTE</button>
      ) : isUpcoming ? (
        <button onClick={() => go({ name: 'election', slug: e.slug })} className="w-full rounded-lg border border-cyan-500/30 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/5">VIEW DETAILS</button>
      ) : (
        <button onClick={() => go({ name: 'results', slug: e.slug })} className="w-full rounded-lg border border-gray-500/30 py-2 text-sm font-bold text-gray-300 hover:bg-gray-500/5">VIEW FINAL RESULTS</button>
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={() => go({ name: 'dashboard' })} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
      <h1 className="mb-3 text-3xl font-black text-white">{e.title}</h1>
      <p className="mb-6 text-gray-400">{e.description}</p>
      {e.status === 'open' && (
        <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 text-center">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-300">Voting Closes In</div>
          <div className="font-mono text-3xl font-black text-white">{pad(cd.d)}d {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}</div>
        </div>
      )}
      <div className="mb-6 space-y-2">
        {e.candidates.map(c => (
          <div key={c.id} className="card-neon rounded-lg p-4">
            <div className="font-bold text-white">{c.name}</div>
            <div className="text-sm text-gray-400">{c.description}</div>
          </div>
        ))}
      </div>
      {e.has_voted ? (
        <button onClick={() => go({ name: 'results', slug })} className="btn-neon w-full rounded-lg py-3 font-black text-white">VIEW RESULTS</button>
      ) : e.status === 'open' ? (
        <button onClick={() => go({ name: 'ballot', slug })} className="btn-neon w-full rounded-lg py-3 font-black text-white">CAST YOUR VOTE</button>
      ) : e.status === 'closed' ? (
        <div className="rounded-lg bg-red-500/10 py-3 text-center font-black text-red-300">🔴 VOTING CLOSED</div>
      ) : (
        <div className="rounded-lg bg-cyan-500/10 py-3 text-center font-black text-cyan-300">VOTING OPENS SOON</div>
      )}
    </div>
  );
}

function BallotPage({ slug, user, go }) {
  const [e, setE] = useState(null);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState('choose');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => { api(`/elections/${slug}`).then(d => { setE(d.election); if (d.election.has_voted) { setPhase('confirmed'); setConfirmation(d.election.confirmation); } }).catch(err => toast.error(err.message)); }, [slug]);
  if (!e) return <div className="p-10 text-center text-gray-400">Loading ballot...</div>;

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
    <div className="mx-auto max-w-2xl px-4 py-10">
      {phase !== 'confirmed' && (
        <button onClick={() => go({ name: 'dashboard' })} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Cancel</button>
      )}
      <div className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">Ballot</div>
      <h1 className="mb-8 text-3xl font-black text-white">{e.title}</h1>

      {phase === 'choose' && (
        <>
          <p className="mb-6 text-lg text-gray-300">Choose <strong className="text-white">ONE</strong> option.</p>
          <div className="space-y-3">
            {e.candidates.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full rounded-xl border-2 p-5 text-left transition-all ${selected?.id === c.id ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/30' : 'border-purple-500/20 bg-black/40 hover:border-purple-500/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-white">{c.name}</div>
                    <div className="mt-1 text-sm text-gray-400">{c.description}</div>
                  </div>
                  <div className={`mt-1 h-6 w-6 shrink-0 rounded-full border-2 ${selected?.id === c.id ? 'border-purple-300 bg-purple-400' : 'border-gray-500'}`}>
                    {selected?.id === c.id && <CheckCircle2 className="h-full w-full text-white" />}
                  </div>
                </div>
              </button>
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
          <div className="card-neon mb-6 rounded-xl p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-300">Review Your Selection</div>
            <p className="mb-4 text-gray-300">You are about to submit your ballot for:</p>
            <div className="rounded-lg border border-purple-400 bg-purple-500/20 p-4">
              <div className="text-lg font-bold text-white">{selected.name}</div>
              <div className="text-sm text-gray-300">{selected.description}</div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Your vote is final. Once submitted, you cannot vote again in this election.</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPhase('choose')} className="flex-1 rounded-lg border border-purple-500/40 py-4 text-sm font-black tracking-widest text-purple-200 hover:bg-purple-500/10">← CHANGE SELECTION</button>
            <button onClick={submit} className="btn-neon flex-1 rounded-lg py-4 text-sm font-black tracking-widest text-white">CAST MY VOTE</button>
          </div>
        </>
      )}

      {phase === 'submitting' && (
        <div className="card-neon rounded-xl p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <div className="text-lg font-bold text-white">CASTING YOUR VOTE...</div>
        </div>
      )}

      {phase === 'confirmed' && (
        <div className="card-neon rounded-2xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-400" />
          <h2 className="mb-2 text-3xl font-black tracking-widest text-green-300">✓ VOTE RECORDED</h2>
          <p className="mb-6 text-gray-300">Your ballot has been successfully recorded.</p>
          <div className="mb-6 space-y-2 text-left">
            <Row k="Election" v={e.title} />
            <Row k="Status" v={<span className="text-green-300">Vote recorded</span>} />
            <Row k="Confirmation" v={<span className="font-mono text-purple-300">{confirmation}</span>} />
          </div>
          {e.live_results_enabled && (
            <button onClick={() => go({ name: 'results', slug })} className="btn-neon w-full rounded-lg py-3 font-black tracking-widest text-white">VIEW LIVE RESULTS →</button>
          )}
          <button onClick={() => go({ name: 'dashboard' })} className="mt-3 w-full text-sm text-gray-400 hover:text-white">Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}
function Row({ k, v }) {
  return <div className="flex justify-between border-b border-purple-500/20 py-2 text-sm"><span className="text-gray-400">{k}</span><span className="font-medium text-white">{v}</span></div>;
}

function ResultsPage({ slug, go }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(async () => {
    try { const d = await api(`/elections/${slug}/results`); setData(d); setErr(null); }
    catch (e) { setErr(e.message); }
  }, [slug]);
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);
  const cd = useCountdown(data?.election?.ends_at || Date.now());

  if (err) return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="card-neon rounded-xl p-8">
        <Lock className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
        <div className="mb-4 text-yellow-300">{err}</div>
        <button onClick={() => go({ name: 'dashboard' })} className="text-sm text-purple-300 hover:text-purple-200">← Back to Dashboard</button>
      </div>
    </div>
  );
  if (!data) return <div className="p-10 text-center text-gray-400">Loading results...</div>;
  const isOpen = data.election.status === 'open';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={() => go({ name: 'dashboard' })} className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
      <div className="mb-2 flex items-center gap-2">
        {isOpen ? (
          <div className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-green-300">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" /> LIVE RESULTS
          </div>
        ) : (
          <div className="rounded-full bg-gray-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-gray-300">FINAL RESULTS</div>
        )}
      </div>
      <h1 className="mb-6 text-3xl font-black text-white">{data.election.title}</h1>

      <div className="card-neon mb-6 grid grid-cols-2 gap-4 rounded-xl p-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Total Votes</div>
          <div className="text-4xl font-black text-white">{data.total_votes}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-purple-300">{isOpen ? 'Closes In' : 'Status'}</div>
          <div className={`font-mono text-2xl font-black ${isOpen ? 'text-white' : 'text-red-300'}`}>
            {isOpen ? `${pad(cd.d)}d ${pad(cd.h)}:${pad(cd.m)}:${pad(cd.s)}` : 'CLOSED'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {data.candidates.map((c, i) => (
          <div key={c.id} className="card-neon rounded-xl p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-bold text-white">{c.name}</div>
              <div className="font-mono text-2xl font-black text-purple-300">{c.percentage.toFixed(1)}%</div>
            </div>
            <div className="mb-3 text-xs text-gray-400">{c.votes} votes</div>
            <div className="h-3 overflow-hidden rounded-full bg-black/60">
              <div style={{ width: `${c.percentage}%` }} className={`h-full rounded-full bg-gradient-to-r ${['from-purple-500 to-pink-500', 'from-cyan-500 to-blue-500', 'from-pink-500 to-orange-500', 'from-green-500 to-emerald-500'][i % 4]} transition-all duration-500`} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-xs text-gray-500">Last updated: {new Date(data.last_updated).toLocaleTimeString()}</div>
    </div>
  );
}

function NotifPanel({ notifs, onClose, go }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-purple-500/30 bg-black p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-widest text-white">NOTIFICATIONS</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-2">
          {notifs.length === 0 && <div className="text-sm text-gray-500">No notifications yet.</div>}
          {notifs.map(n => (
            <div key={n.id} className={`rounded-lg border p-3 ${n.read ? 'border-purple-500/20 bg-black/30' : 'border-purple-500/50 bg-purple-500/10'}`}>
              <div className="text-sm font-bold text-white">{n.title}</div>
              <div className="text-xs text-gray-300">{n.message}</div>
              <div className="mt-1 text-[10px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, go }) {
  const [data, setData] = useState({ elections: [], total_voters: 0 });
  const load = useCallback(async () => { try { const d = await api('/admin/elections'); setData(d); } catch (e) { toast.error(e.message); } }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const active = data.elections.filter(e => e.status === 'open');
  const upcoming = data.elections.filter(e => e.status === 'scheduled');
  const closed = data.elections.filter(e => e.status === 'closed');
  const totalVotes = data.elections.reduce((s, e) => s + e.total_votes, 0);

  const closeElection = async (id) => {
    if (!confirm('Close this election now? This cannot be undone.')) return;
    try { await api(`/admin/elections/${id}/close`, { method: 'POST' }); toast.success('Election closed'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-white">Admin Console</h1>
        <button onClick={() => go({ name: 'admin-create' })} className="btn-neon rounded-lg px-4 py-2.5 text-sm font-black tracking-widest text-white"><Plus className="mr-1 inline h-4 w-4" /> NEW ELECTION</button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Active Elections" v={active.length} />
        <Stat label="Total Votes" v={totalVotes} />
        <Stat label="Upcoming" v={upcoming.length} />
        <Stat label="Registered Voters" v={data.total_voters} />
      </div>

      <div className="card-neon overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-purple-500/10 text-left text-xs uppercase tracking-widest text-purple-300">
            <tr>
              <th className="px-4 py-3">Election</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Votes</th>
              <th className="px-4 py-3">Participation</th>
              <th className="px-4 py-3">Closes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.elections.map(e => (
              <tr key={e.id} className="border-t border-purple-500/10">
                <td className="px-4 py-3 font-medium text-white">{e.title}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-gray-300">{e.total_votes}</td>
                <td className="px-4 py-3 text-gray-300">{e.participation.toFixed(1)}%</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(e.ends_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => go({ name: 'results', slug: e.slug })} className="rounded border border-purple-500/30 px-2 py-1 text-xs text-purple-200 hover:bg-purple-500/10"><Eye className="h-3 w-3" /></button>
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
    </div>
  );
}
function Stat({ label, v }) {
  return <div className="card-neon rounded-xl p-5"><div className="text-xs font-bold uppercase tracking-widest text-purple-300">{label}</div><div className="mt-1 text-3xl font-black text-white">{v}</div></div>;
}
function StatusBadge({ status }) {
  const map = { open: 'bg-green-500/20 text-green-300', scheduled: 'bg-cyan-500/20 text-cyan-300', closed: 'bg-gray-500/20 text-gray-300', draft: 'bg-yellow-500/20 text-yellow-300' };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${map[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
}

function CreateElectionWizard({ go }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '',
    starts_at: new Date(Date.now() + 60000).toISOString().slice(0, 16),
    ends_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
    live_results_enabled: true, results_visibility: 'during_voting', anonymous_ballot: true,
    candidates: [{ name: '', description: '' }, { name: '', description: '' }],
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updC = (i, k, v) => setForm(f => ({ ...f, candidates: f.candidates.map((c, j) => j === i ? { ...c, [k]: v } : c) }));

  const submit = async () => {
    try {
      const validC = form.candidates.filter(c => c.name.trim());
      if (validC.length < 2) return toast.error('At least 2 candidates required');
      await api('/admin/elections', { method: 'POST', body: {
        ...form, candidates: validC,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      } });
      toast.success('Election published!');
      go({ name: 'admin' });
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={() => go({ name: 'admin' })} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin</button>
      <h1 className="mb-2 text-3xl font-black text-white">Create Election</h1>
      <div className="mb-6 text-sm text-purple-300">Step {step} of 4</div>
      <div className="mb-6 flex gap-1">
        {[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-purple-500' : 'bg-purple-500/20'}`} />)}
      </div>

      <div className="card-neon rounded-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Basic Information</div>
            <Input label="Election Title" value={form.title} onChange={v => upd('title', v)} required />
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-purple-300">Description</label>
              <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={4}
                className="w-full rounded-lg border border-purple-500/30 bg-black/50 px-4 py-3 text-white focus:border-purple-400 focus:outline-none" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Timing</div>
            <Input label="Opens At" type="datetime-local" value={form.starts_at} onChange={v => upd('starts_at', v)} />
            <Input label="Closes At" type="datetime-local" value={form.ends_at} onChange={v => upd('ends_at', v)} />
            <p className="text-xs text-gray-400">Server-side enforcement: votes submitted after close time will be rejected.</p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Ballot Options</div>
            {form.candidates.map((c, i) => (
              <div key={i} className="rounded-lg border border-purple-500/20 bg-black/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-300">Option {i + 1}</div>
                  {form.candidates.length > 2 && (
                    <button onClick={() => upd('candidates', form.candidates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <input placeholder="Name" value={c.name} onChange={e => updC(i, 'name', e.target.value)} className="mb-2 w-full rounded-lg border border-purple-500/30 bg-black/50 px-3 py-2 text-white focus:border-purple-400 focus:outline-none" />
                <textarea placeholder="Description" value={c.description} onChange={e => updC(i, 'description', e.target.value)} rows={2} className="w-full rounded-lg border border-purple-500/30 bg-black/50 px-3 py-2 text-white focus:border-purple-400 focus:outline-none" />
              </div>
            ))}
            <button onClick={() => upd('candidates', [...form.candidates, { name: '', description: '' }])} className="w-full rounded-lg border-2 border-dashed border-purple-500/30 py-3 text-sm text-purple-300 hover:border-purple-400"><Plus className="mr-1 inline h-4 w-4" /> Add Option</button>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Results & Privacy</div>
            <label className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-black/30 p-3">
              <input type="checkbox" checked={form.live_results_enabled} onChange={e => upd('live_results_enabled', e.target.checked)} className="h-5 w-5 accent-purple-500" />
              <div>
                <div className="font-bold text-white">Live Results</div>
                <div className="text-xs text-gray-400">Show results updating in real time during voting</div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-black/30 p-3">
              <input type="checkbox" checked={form.anonymous_ballot} onChange={e => upd('anonymous_ballot', e.target.checked)} className="h-5 w-5 accent-purple-500" />
              <div>
                <div className="font-bold text-white">Anonymous Ballot</div>
                <div className="text-xs text-gray-400">Store ballot choice separately from voter identity</div>
              </div>
            </label>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-200">Review your election settings before publishing. Once published, voters will be notified.</div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : go({ name: 'admin' })} className="rounded-lg border border-purple-500/30 px-4 py-2 text-sm text-purple-200 hover:bg-purple-500/10">Back</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && !form.title} className="btn-neon rounded-lg px-6 py-2 text-sm font-black text-white disabled:opacity-40">Next →</button>
          ) : (
            <button onClick={submit} className="btn-neon rounded-lg px-6 py-2 text-sm font-black tracking-widest text-white">PUBLISH ELECTION</button>
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => go({ name: 'admin' })} className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin</button>
      <h1 className="mb-6 text-3xl font-black text-white">Audit Log</h1>
      <div className="card-neon overflow-x-auto rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-purple-500/10 text-left text-xs uppercase tracking-widest text-purple-300">
            <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Meta</th><th className="px-4 py-3">Timestamp</th></tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t border-purple-500/10">
                <td className="px-4 py-3 font-mono text-purple-300">{l.event_type}</td>
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

export default App;
