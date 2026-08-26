'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Vote, Share2, Lock, ShieldCheck, CheckCircle2, AlertTriangle, Users, Clock } from 'lucide-react';

const pad = n => String(n).padStart(2, '0');

export default function PublicElectionPage() {
  const { slug } = useParams();
  const [e, setE] = useState(null);
  const [results, setResults] = useState(null);
  const [resultsHidden, setResultsHidden] = useState(false);
  const [integrity, setIntegrity] = useState(null);
  const [showChecks, setShowChecks] = useState(false);
  const [err, setErr] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setHasToken(!!localStorage.getItem('vv_token'));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('vv_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/elections/${slug}`, { headers, cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Election not found');
      setE(d.election);
      setErr(null);
      const rr = await fetch(`/api/elections/${slug}/results`, { headers, cache: 'no-store' });
      if (rr.ok) { setResults(await rr.json()); setResultsHidden(false); }
      else { setResults(null); setResultsHidden(true); }
    } catch (er) { setErr(er.message); }
  }, [slug]);

  const loadIntegrity = useCallback(async () => {
    try {
      const r = await fetch(`/api/elections/${slug}/integrity`, { cache: 'no-store' });
      if (r.ok) setIntegrity(await r.json());
    } catch {}
  }, [slug]);

  useEffect(() => {
    load(); loadIntegrity();
    const t = setInterval(load, 3000);
    const t2 = setInterval(loadIntegrity, 15000);
    return () => { clearInterval(t); clearInterval(t2); };
  }, [load, loadIntegrity]);

  const share = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  if (err) return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-neon max-w-md rounded-2xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <div className="mb-4 text-lg font-bold text-white">{err}</div>
        <a href="/" className="btn-blue inline-block rounded-lg px-6 py-3 text-sm font-black tracking-widest text-white">GO TO VOTEVAULT</a>
      </div>
    </div>
  );
  if (!e) return <div className="grid-bg flex min-h-screen items-center justify-center text-gray-400">Loading election…</div>;

  const diff = Math.max(0, new Date(e.status === 'scheduled' ? e.starts_at : e.ends_at).getTime() - now);
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  const isOpen = e.status === 'open';
  const isClosed = e.status === 'closed';
  const voteHref = `/?vote=${encodeURIComponent(slug)}`;
  const sorted = results ? [...results.candidates].sort((a, b) => b.votes - a.votes) : [];
  const topVotes = sorted[0]?.votes || 0;
  const isTie = sorted.length > 1 && sorted[1].votes === topVotes;

  return (
    <div className="grid-bg min-h-screen">
      <div className="stripe-bar" />
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-blue-700 shadow-lg shadow-blue-500/40"><Vote className="h-5 w-5 text-white" /></div>
          <span className="text-lg font-black tracking-widest text-white">VOTE<span className="text-amber-400">VAULT</span></span>
        </a>
        <button onClick={share} className="flex items-center gap-2 rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/10">
          <Share2 className="h-4 w-4" /> {copied ? 'LINK COPIED!' : 'SHARE'}
        </button>
      </nav>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {isOpen && <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-green-300"><span className="live-dot h-1.5 w-1.5 rounded-full bg-green-400" /> POLLS OPEN</span>}
          {e.status === 'scheduled' && <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-blue-300">OPENS SOON</span>}
          {isClosed && <span className="rounded-full bg-gray-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-gray-300">POLLS CLOSED — FINAL</span>}
          {e.anonymous_ballot && <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-blue-300">🔒 ANONYMOUS BALLOT</span>}
          {e.eligibility_mode === 'voter_list' && <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black tracking-widest text-amber-300">REGISTERED VOTER LIST ONLY</span>}
        </div>

        <h1 className="glow-title mb-3 text-3xl font-black text-white sm:text-5xl">{e.title}</h1>
        <p className="mb-6 max-w-3xl text-gray-300">{e.description}</p>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="card-neon rounded-xl p-5">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><Clock className="h-3.5 w-3.5" /> {isClosed ? 'Status' : e.status === 'scheduled' ? 'Polls open in' : 'Polls close in'}</div>
            <div className={`font-mono text-2xl font-black ${isClosed ? 'text-red-300' : 'text-white'}`}>{isClosed ? 'CLOSED' : `${pad(d)}d ${pad(h)}:${pad(m)}:${pad(s)}`}</div>
          </div>
          <div className="card-neon rounded-xl p-5">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><Users className="h-3.5 w-3.5" /> Ballots cast</div>
            <div className="font-mono text-2xl font-black text-white">{e.total_votes}</div>
          </div>
          <div className="card-neon rounded-xl p-5">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><ShieldCheck className="h-3.5 w-3.5" /> Count integrity</div>
            {integrity ? (
              <button onClick={() => setShowChecks(v => !v)} className={`text-left font-black ${integrity.verified ? 'text-green-300' : 'text-red-300'}`}>
                {integrity.verified ? '✓ MACHINE-VERIFIED' : '⚠ ALERT — CHECK FAILED'}
                <div className="text-[10px] font-normal text-gray-400">{integrity.checks.filter(c => c.pass).length}/{integrity.checks.length} checks passed · tap for report</div>
              </button>
            ) : <div className="text-sm text-gray-400">Verifying…</div>}
          </div>
        </div>

        {showChecks && integrity && (
          <div className="card-gold mb-8 rounded-xl p-5">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-amber-300">Automated Integrity Report — verified {new Date(integrity.verified_at).toLocaleTimeString()}</div>
            <div className="space-y-2">
              {integrity.checks.map(c => (
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

        {!isClosed && (
          <div className="card-neon mb-8 rounded-2xl p-6 text-center sm:p-8">
            {e.has_voted ? (
              <div className="flex items-center justify-center gap-2 text-lg font-black text-green-300"><CheckCircle2 className="h-6 w-6" /> YOUR VOTE HAS BEEN RECORDED</div>
            ) : (
              <>
                <div className="mb-2 text-xs font-black uppercase tracking-widest text-amber-300">How to vote</div>
                <p className="mx-auto mb-5 max-w-xl text-sm text-gray-300">Sign in (or create a free voter account), select exactly ONE option, review, and confirm. One ballot per voter is enforced at the database level — duplicates are impossible.</p>
                <a href={voteHref} className="btn-neon inline-block rounded-xl px-10 py-4 text-base font-black tracking-widest text-white">
                  {isOpen ? (hasToken ? 'CAST YOUR VOTE →' : 'LOG IN TO VOTE →') : 'REGISTER TO VOTE →'}
                </a>
              </>
            )}
          </div>
        )}

        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-300">{isClosed ? 'Ballot options' : 'On the ballot'}</h2>
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {e.candidates.map(c => (
            <div key={c.id} className="card-neon flex gap-4 rounded-xl p-5">
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="h-16 w-16 shrink-0 rounded-full border-2 border-blue-500/40 object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-blue-500/30 bg-blue-500/10 text-xl font-black text-blue-300">{c.name.charAt(0)}</div>
              )}
              <div>
                <div className="text-lg font-bold text-white">{c.name}</div>
                <div className="text-sm text-gray-400">{c.description}</div>
                {c.statement && <div className="mt-2 border-l-2 border-amber-500/50 pl-3 text-xs italic text-amber-100/80">“{c.statement}”</div>}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-blue-300">{isClosed ? 'Final certified results' : 'Live results'}</h2>
        {results ? (
          <div className="space-y-4">
            {sorted.map((c, i) => (
              <div key={c.id} className="card-neon rounded-xl p-5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {isClosed && i === 0 && !isTie && c.votes > 0 && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-amber-300">🏆 WINNER</span>}
                    {c.name}
                  </div>
                  <div className="font-mono text-xl font-black text-amber-300">{c.percentage.toFixed(1)}%</div>
                </div>
                <div className="mb-2 text-xs text-gray-400">{c.votes} votes</div>
                <div className="result-bar h-3 overflow-hidden rounded-full bg-black/60">
                  <div style={{ width: `${c.percentage}%` }} className={`h-full rounded-full bg-gradient-to-r ${['from-red-600 to-red-400', 'from-blue-600 to-blue-400', 'from-amber-500 to-amber-300', 'from-emerald-600 to-emerald-400'][i % 4]} transition-all duration-700`} />
                </div>
              </div>
            ))}
            <div className="text-center text-xs text-gray-500">Total ballots: {results.total_votes} · Updated {new Date(results.last_updated).toLocaleTimeString()} · Counts machine-verified</div>
          </div>
        ) : resultsHidden ? (
          <div className="card-neon rounded-xl p-8 text-center">
            <Lock className="mx-auto mb-2 h-8 w-8 text-amber-400" />
            <div className="font-bold text-white">Results are sealed</div>
            <div className="text-sm text-gray-400">Results for this election become public when the polls close.</div>
          </div>
        ) : <div className="text-sm text-gray-500">Loading results…</div>}

        <div className="mt-12 rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 text-center text-[11px] leading-relaxed text-gray-400">
          Every ballot on VoteVault is cryptographically signed, counted by an automated integrity engine, and protected by database-level one-vote enforcement and server-side timing. This platform is not certified for use in governmental elections.
        </div>
      </div>
    </div>
  );
}
