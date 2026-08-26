'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Vote, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function CandidateProfilePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', statement: '', bio: '', credentials: '', resume_url: '', website: '', image_url: '' });

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/candidate/${token}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Invalid link');
      setData(d);
      const c = d.candidate || {};
      setForm({
        name: c.name || d.invite?.name || '',
        description: c.description || '', statement: c.statement || '',
        bio: c.bio || '', credentials: c.credentials || '',
        resume_url: c.resume_url || '', website: c.website || '', image_url: c.image_url || '',
      });
    } catch (e) { setErr(e.message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 480 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        upd('image_url', canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Your name is required'); return; }
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`/api/candidate/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not save');
      setSaved(true);
    } catch (er) { setErr(er.message); } finally { setSaving(false); }
  };

  if (err && !data) return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-neon max-w-md rounded-2xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <div className="mb-4 text-lg font-bold text-white">{err}</div>
        <a href="/" className="btn-blue inline-block rounded-lg px-6 py-3 text-sm font-black tracking-widest text-white">GO TO VOTEVAULT</a>
      </div>
    </div>
  );
  if (!data) return <div className="grid-bg flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  if (saved) return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-neon max-w-md rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-400" />
        <h1 className="mb-2 text-2xl font-black text-green-300">PROFILE PUBLISHED</h1>
        <p className="mb-6 text-sm text-gray-300">Your candidate profile for <strong className="text-white">{data.election.title}</strong> is now live on the ballot. You can revisit this link anytime to update it.</p>
        <a href={`/election/${data.election.slug}`} className="btn-neon inline-block rounded-lg px-6 py-3 text-sm font-black tracking-widest text-white">VIEW THE ELECTION →</a>
      </div>
    </div>
  );

  return (
    <div className="grid-bg min-h-screen">
      <div className="stripe-bar" />
      <nav className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-blue-700"><Vote className="h-5 w-5 text-white" /></div>
        <span className="text-lg font-black tracking-widest text-white">VOTE<span className="text-amber-400">VAULT</span></span>
      </nav>
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-amber-300">Candidate Profile Setup</div>
        <h1 className="mb-1 text-2xl font-black text-white sm:text-3xl">{data.election.title}</h1>
        <p className="mb-6 text-sm text-gray-400">{data.election.region} · You were invited to build your public profile. Voters will see this on the ballot.</p>

        {err && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

        <form onSubmit={submit} className="card-neon space-y-4 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {form.image_url ? (
              <div className="relative">
                <img src={form.image_url} alt="" className="h-20 w-20 rounded-full border-2 border-blue-500/40 object-cover" />
                <button type="button" onClick={() => upd('image_url', '')} className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-blue-500/40 text-blue-300 hover:border-amber-400">
                <Upload className="h-5 w-5" /><span className="text-[8px] font-bold">PHOTO</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files?.[0])} />
              </label>
            )}
            <div className="flex-1">
              <Field label="Full Name" value={form.name} onChange={v => upd('name', v)} required />
            </div>
          </div>
          <Field label="Headline / One-liner" value={form.description} onChange={v => upd('description', v)} placeholder="e.g. Community advocate for parks & transit" />
          <Area label="Candidate Statement (shown on the ballot)" value={form.statement} onChange={v => upd('statement', v)} rows={3} />
          <Area label="Biography" value={form.bio} onChange={v => upd('bio', v)} rows={5} />
          <Area label="Credentials & Experience" value={form.credentials} onChange={v => upd('credentials', v)} rows={3} placeholder="Degrees, roles, endorsements…" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Résumé / Credentials URL" value={form.resume_url} onChange={v => upd('resume_url', v)} placeholder="https://…" />
            <Field label="Website / More info URL" value={form.website} onChange={v => upd('website', v)} placeholder="https://…" />
          </div>
          <button disabled={saving} className="btn-neon w-full rounded-lg py-3 font-black tracking-widest text-white disabled:opacity-50">{saving ? 'PUBLISHING…' : 'PUBLISH MY PROFILE'}</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-blue-300">{label}</label>
      <input value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none" />
    </div>
  );
}
function Area({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-blue-300">{label}</label>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-blue-500/30 bg-black/50 px-4 py-2.5 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none" />
    </div>
  );
}
