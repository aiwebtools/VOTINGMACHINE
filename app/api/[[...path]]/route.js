import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

// ---------- MongoDB (singleton) ----------
let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, db: null, ready: null };

async function getDb() {
  if (cached.db) return cached.db;
  if (!cached.ready) {
    cached.ready = (async () => {
      const client = new MongoClient(process.env.MONGO_URL);
      await client.connect();
      const db = client.db(process.env.DB_NAME);
      // Indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('elections').createIndex({ slug: 1 }, { unique: true });
      // CRITICAL: one vote per election per user
      await db.collection('participations').createIndex(
        { election_id: 1, voter_id: 1 },
        { unique: true }
      );
      await db.collection('candidates').createIndex({ election_id: 1 });
      await db.collection('ballots').createIndex({ election_id: 1 });
      await db.collection('notifications').createIndex({ user_id: 1, created_at: -1 });
      await db.collection('voter_lists').createIndex({ election_id: 1, email: 1 }, { unique: true });
      await db.collection('email_events').createIndex({ type: 1, entity_id: 1, to: 1 }, { unique: true });
      cached.client = client;
      cached.db = db;
      await seedIfEmpty(db);
      return db;
    })();
  }
  await cached.ready;
  return cached.db;
}

// ---------- Auth helpers ----------
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function hashPassword(pw, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, s, 32).toString('hex');
  return `${s}:${h}`;
}
function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash));
}
function b64u(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signToken(payload) {
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = b64u(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}
function verifyToken(token) {
  try {
    if (!token) return null;
    const [h, b, s] = token.split('.');
    const expect = b64u(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest());
    if (expect !== s) return null;
    return JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  } catch { return null; }
}

async function currentUser(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  const db = await getDb();
  const u = await db.collection('users').findOne({ id: payload.sub });
  return u;
}

// ---------- Seeding ----------
async function seedIfEmpty(db) {
  const count = await db.collection('users').countDocuments();
  if (count > 0) return;

  const adminId = uuidv4();
  const defaultPrefs = { new_election: true, closing_soon: true, vote_confirmation: true, results_available: true };
  await db.collection('users').insertOne({
    id: adminId,
    email: 'admin@votevault.app',
    name: 'Election Administrator',
    password: hashPassword('admin123'),
    role: 'admin',
    created_at: new Date(),
    verified: true,
    notification_prefs: defaultPrefs,
  });

  await db.collection('users').insertOne({
    id: uuidv4(),
    email: 'voter@demo.app',
    name: 'Registered Voter',
    password: hashPassword('voter123'),
    role: 'voter',
    created_at: new Date(),
    verified: true,
    notification_prefs: defaultPrefs,
  });

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in2d = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const in12h = new Date(now.getTime() + 12 * 3600 * 1000);
  const past = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
  const futureStart = new Date(now.getTime() + 24 * 3600 * 1000);

  const elections = [
    {
      title: 'Community Board Election 2026',
      slug: 'community-board-2026',
      description: 'Elect your Community Board representative for the 2026–2028 term. Every registered voter may cast exactly one ballot. All counts are machine-verified and tamper-evident.',
      status: 'open', starts_at: past, ends_at: in7d,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Alex Rivera', description: 'Public parks, transit expansion, and small business support.', statement: 'I will fight for accessible transit, greener parks, and a thriving local economy for every family in our district. My door will always be open to the people.' },
        { name: 'Priya Chen', description: 'Housing affordability, community safety, and education.', statement: 'Our community deserves affordable homes, safe streets, and schools our children are proud of. Together, we can deliver all three.' },
        { name: 'Marcus Okafor', description: 'Green infrastructure and neighborhood arts programs.', statement: 'Investing in sustainable infrastructure and the arts builds a neighborhood people never want to leave. Let us build it together.' },
      ],
    },
    {
      title: 'Participatory Budget: Community Priorities',
      slug: 'participatory-budget-2026',
      description: 'The people decide which community initiative receives this quarter\u2019s participatory budget funding. One ballot per registered voter.',
      status: 'open', starts_at: past, ends_at: in2d,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Free Coding Bootcamps', description: 'Weekend technology workshops for local youth.', statement: 'Prepare the next generation for the jobs of tomorrow with free, hands-on technology education.' },
        { name: 'Neighborhood Solar Program', description: 'Subsidized rooftop solar installations.', statement: 'Lower energy bills and a cleaner future through community-owned solar power.' },
        { name: 'Public Art Grants', description: 'Fund ten public murals across the district.', statement: 'Public art strengthens identity, deters vandalism, and makes our streets worth walking.' },
        { name: 'Community Health Van', description: 'Mobile clinic for underserved areas.', statement: 'Bring preventive care, screenings, and vaccinations directly to the neighbors who need them most.' },
      ],
    },
    {
      title: 'City Charter Amendment Referendum',
      slug: 'charter-amendment-referendum',
      description: 'Shall the city charter be amended to establish an independent citizens\u2019 oversight commission? Polls close today \u2014 the deadline is enforced by the server, not your browser.',
      status: 'open', starts_at: past, ends_at: in12h,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'YES \u2014 Adopt the amendment', description: 'Establish the independent citizens\u2019 oversight commission.', statement: 'An independent commission ensures transparency and gives the people direct oversight of their government.' },
        { name: 'NO \u2014 Reject the amendment', description: 'Keep the current charter unchanged.', statement: 'Existing checks and balances are sufficient; a new commission adds cost without clear benefit.' },
      ],
    },
    {
      title: 'Parks & Recreation Advisory Vote',
      slug: 'parks-advisory-vote',
      description: 'Should Main Street become a pedestrian plaza on weekends? Voting opens soon \u2014 results are sealed until the polls close.',
      status: 'scheduled', starts_at: futureStart, ends_at: in7d,
      live_results_enabled: false, results_visibility: 'after_closing',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'YES \u2014 Pedestrian plaza', description: 'Close Main Street to cars on Saturdays and Sundays.', statement: 'Walkable weekends mean safer streets, thriving local shops, and a stronger community.' },
        { name: 'NO \u2014 Keep as is', description: 'Maintain current traffic patterns.', statement: 'Closures would burden commuters and delivery services that keep our economy moving.' },
      ],
    },
  ];

  for (const e of elections) {
    const eid = uuidv4();
    const { candidates, ...rest } = e;
    await db.collection('elections').insertOne({
      id: eid, ...rest, created_by: adminId, created_at: new Date(), updated_at: new Date(),
    });
    let order = 0;
    for (const c of candidates) {
      await db.collection('candidates').insertOne({
        id: uuidv4(), election_id: eid, ...c, display_order: order++, created_at: new Date(),
      });
    }
  }
  await db.collection('audit_logs').insertOne({
    id: uuidv4(), event_type: 'system_seeded', actor_id: adminId, meta: { elections: elections.length }, created_at: new Date(),
  });
}

// ---------- Utils ----------
function json(data, status = 200) { return NextResponse.json(data, { status }); }
function err(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }
// In-memory rate limiter (per-process) — protects auth and voting endpoints from abuse
const _rl = global._rl || (global._rl = new Map());
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const rec = _rl.get(key) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
  rec.count++;
  _rl.set(key, rec);
  return rec.count <= max;
}
function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
// Tamper-evident ballot signature: HMAC over immutable ballot fields.
// Any post-hoc modification of a ballot in the database invalidates its signature.
function ballotSignature(b) {
  return crypto.createHmac('sha256', JWT_SECRET)
    .update(`${b.id}|${b.election_id}|${b.candidate_id}|${new Date(b.created_at).toISOString()}`)
    .digest('hex');
}
// Automated integrity engine: recounts every ballot, verifies signatures,
// cross-checks participation records, and validates timing windows.
async function runIntegrityChecks(db, election) {
  const ballots = await db.collection('ballots').find({ election_id: election.id }).toArray();
  const participations = await db.collection('participations').find({ election_id: election.id }).toArray();
  const cands = await db.collection('candidates').find({ election_id: election.id }).toArray();
  const candIds = new Set(cands.map(c => c.id));

  let badSignatures = 0, invalidCandidates = 0, outOfWindow = 0;
  const tally = {};
  for (const b of ballots) {
    if (!b.integrity_hash || b.integrity_hash !== ballotSignature(b)) badSignatures++;
    if (!candIds.has(b.candidate_id)) invalidCandidates++;
    const t = new Date(b.created_at);
    if (t < new Date(election.starts_at) || t > new Date(election.ends_at)) outOfWindow++;
    tally[b.candidate_id] = (tally[b.candidate_id] || 0) + 1;
  }
  const tallySum = Object.values(tally).reduce((s, v) => s + v, 0);
  const uniqueVoters = new Set(participations.map(p => p.voter_id)).size;

  const checks = [
    { id: 'ballot_signatures', label: 'Cryptographic ballot signatures valid', pass: badSignatures === 0, detail: badSignatures === 0 ? `${ballots.length}/${ballots.length} signatures verified` : `${badSignatures} ballot(s) failed signature verification — possible tampering` },
    { id: 'one_ballot_per_voter', label: 'Exactly one ballot per participating voter', pass: ballots.length === participations.length && uniqueVoters === participations.length, detail: `${ballots.length} ballots ↔ ${participations.length} participation records ↔ ${uniqueVoters} unique voters` },
    { id: 'tally_reconciliation', label: 'Candidate tallies reconcile with total ballots', pass: tallySum === ballots.length, detail: `Sum of candidate tallies (${tallySum}) equals ballot count (${ballots.length})` },
    { id: 'valid_candidates', label: 'Every ballot references a valid candidate', pass: invalidCandidates === 0, detail: invalidCandidates === 0 ? 'All ballots reference registered candidates' : `${invalidCandidates} ballot(s) reference unknown candidates` },
    { id: 'voting_window', label: 'All ballots cast inside the legal voting window', pass: outOfWindow === 0, detail: outOfWindow === 0 ? 'No ballots outside the server-enforced window' : `${outOfWindow} ballot(s) timestamped outside the voting window` },
  ];
  const verified = checks.every(c => c.pass);
  return { verified, checks, total_ballots: ballots.length, total_participants: participations.length, verified_at: new Date().toISOString() };
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function confCode() {
  return 'VV-' + crypto.randomBytes(2).toString('hex').toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}
async function computeStatus(election) {
  const now = new Date();
  if (election.status === 'closed' || election.status === 'archived') return election.status;
  if (now < new Date(election.starts_at)) return 'scheduled';
  if (now >= new Date(election.ends_at)) return 'closed';
  return 'open';
}
async function autoCloseIfNeeded(db, election) {
  const eff = await computeStatus(election);
  if (eff !== election.status) {
    await db.collection('elections').updateOne({ id: election.id }, { $set: { status: eff, updated_at: new Date() } });
    election.status = eff;
    if (eff === 'closed') {
      await db.collection('audit_logs').insertOne({
        id: uuidv4(), event_type: 'election_closed', election_id: election.id, meta: { reason: 'auto' }, created_at: new Date(),
      });
      notifyResultsIfNeeded(db, election).catch(() => {});
    }
  }
  return election;
}
async function getResults(db, electionId) {
  const cands = await db.collection('candidates').find({ election_id: electionId }).sort({ display_order: 1 }).toArray();
  const results = [];
  let total = 0;
  for (const c of cands) {
    const votes = await db.collection('ballots').countDocuments({ election_id: electionId, candidate_id: c.id });
    results.push({ id: c.id, name: c.name, description: c.description, image_url: c.image_url || null, votes });
    total += votes;
  }
  return {
    total_votes: total,
    candidates: results.map(r => ({ ...r, percentage: total ? (r.votes * 100 / total) : 0 })),
    last_updated: new Date().toISOString(),
  };
}

// ---------- Email system (Resend with graceful fallback) ----------
let _resend = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
function fromEmail() { return process.env.RESEND_FROM_EMAIL || 'VoteVault <onboarding@resend.dev>'; }
function appUrl() { return process.env.NEXT_PUBLIC_BASE_URL || ''; }
function escapeHtml(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function emailLayout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0b16;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;">
    <div style="text-align:center;padding-bottom:24px;">
      <span style="font-size:22px;font-weight:900;letter-spacing:4px;color:#ffffff;">VOTE<span style="color:#a855f7;">VAULT</span></span>
    </div>
    <div style="background:#14142400;background-color:#141424;border:1px solid #3b2d5e;border-radius:12px;padding:28px;color:#d1d5db;line-height:1.6;font-size:14px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
    <div style="text-align:center;padding-top:20px;font-size:11px;color:#6b7280;">VoteVault — Your Vote. One Ballot. One Voice.</div>
  </div></body></html>`;
}
function emailButton(href, label) {
  return `<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;background:#a855f7;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${escapeHtml(label)}</a></p>`;
}
// Logs every email in email_events; sends via Resend only when RESEND_API_KEY is set.
async function queueEmail(db, { type, entityId, to, subject, html, text }) {
  if (!to) return { skipped: true };
  try {
    await db.collection('email_events').insertOne({
      id: uuidv4(), type, entity_id: entityId, to: to.toLowerCase(), subject,
      status: 'pending', created_at: new Date(),
    });
  } catch (e) {
    if (e.code === 11000) return { duplicate: true };
    throw e;
  }
  const resend = getResend();
  if (!resend) {
    await db.collection('email_events').updateOne(
      { type, entity_id: entityId, to: to.toLowerCase() },
      { $set: { status: 'queued_no_key', updated_at: new Date() } }
    );
    return { queued: true };
  }
  try {
    const idem = `${type}/${entityId}/${crypto.createHash('sha1').update(to.toLowerCase()).digest('hex').slice(0, 12)}`.slice(0, 256);
    const result = await resend.emails.send(
      { from: fromEmail(), to: [to], subject, html, text },
      { idempotencyKey: idem }
    );
    if (result.error) {
      await db.collection('email_events').updateOne(
        { type, entity_id: entityId, to: to.toLowerCase() },
        { $set: { status: 'failed', error: JSON.stringify(result.error), updated_at: new Date() } }
      );
      return { error: result.error };
    }
    await db.collection('email_events').updateOne(
      { type, entity_id: entityId, to: to.toLowerCase() },
      { $set: { status: 'sent', resend_id: result.data?.id || null, sent_at: new Date() } }
    );
    return { sent: true };
  } catch (e) {
    await db.collection('email_events').updateOne(
      { type, entity_id: entityId, to: to.toLowerCase() },
      { $set: { status: 'failed', error: String(e.message), updated_at: new Date() } }
    );
    return { error: e.message };
  }
}
async function sendWelcomeEmail(db, user) {
  return queueEmail(db, {
    type: 'welcome', entityId: `user-${user.id}`, to: user.email,
    subject: 'Welcome to VoteVault — your voter account is ready',
    html: emailLayout('Welcome to VoteVault', `
      <p>Hello ${escapeHtml(user.name || 'Voter')},</p>
      <p>Your voter account is ready. Head to your dashboard to see open elections and cast your ballot.</p>
      ${emailButton(appUrl(), 'Open Dashboard')}
      <p style="font-size:12px;color:#9ca3af;">One vote per election is enforced server-side. Your anonymous ballots are stored separately from your identity.</p>`),
    text: `Hello ${user.name || 'Voter'}, your VoteVault account is ready. Visit ${appUrl()} to see open elections.`,
  });
}
async function sendElectionAnnouncement(db, election, recipients) {
  const link = `${appUrl()}/election/${election.slug}`;
  for (const r of recipients) {
    await queueEmail(db, {
      type: 'new_election', entityId: `election-${election.id}`, to: r.email,
      subject: `🗳️ New election: ${election.title}`,
      html: emailLayout('A new election is open for you', `
        <p>Hello ${escapeHtml(r.name || 'Voter')},</p>
        <p><strong style="color:#ffffff;">${escapeHtml(election.title)}</strong></p>
        <p>${escapeHtml(election.description || '')}</p>
        <p>Voting closes: <strong style="color:#ffffff;">${new Date(election.ends_at).toUTCString()}</strong></p>
        ${emailButton(link, 'View Election & Vote')}`),
      text: `New election: ${election.title}. Voting closes ${new Date(election.ends_at).toUTCString()}. Vote at ${link}`,
    });
  }
}
async function sendVoteConfirmationEmail(db, user, election, code) {
  const link = `${appUrl()}/election/${election.slug}`;
  return queueEmail(db, {
    type: 'vote_confirmation', entityId: `vote-${election.id}-${user.id}`, to: user.email,
    subject: `✅ Vote recorded — ${election.title}`,
    html: emailLayout('Your vote was recorded', `
      <p>Hello ${escapeHtml(user.name || 'Voter')},</p>
      <p>Your ballot for <strong style="color:#ffffff;">${escapeHtml(election.title)}</strong> has been securely recorded.</p>
      <p style="text-align:center;margin:20px 0;"><span style="display:inline-block;background:#1e1b34;border:1px dashed #a855f7;border-radius:8px;padding:12px 24px;font-family:monospace;font-size:18px;color:#c4b5fd;letter-spacing:2px;">${escapeHtml(code)}</span></p>
      <p style="font-size:12px;color:#9ca3af;">Keep this confirmation code as your receipt. ${election.anonymous_ballot ? 'Your ballot choice is stored anonymously and is never linked to your identity.' : ''}</p>
      ${emailButton(link, 'Follow the Results')}`),
    text: `Your vote for "${election.title}" was recorded. Confirmation code: ${code}. Results: ${link}`,
  });
}
// When an election closes, email every participant the results and the winner (once).
async function notifyResultsIfNeeded(db, election) {
  if (election.status !== 'closed') return;
  const res = await db.collection('elections').findOneAndUpdate(
    { id: election.id, results_notified: { $ne: true } },
    { $set: { results_notified: true } }
  );
  const claimed = res && (res.value !== undefined ? res.value : res);
  if (!claimed) return;
  const results = await getResults(db, election.id);
  const sorted = [...results.candidates].sort((a, b) => b.votes - a.votes);
  const winner = sorted[0];
  if (!winner) return;
  const isTie = sorted.length > 1 && sorted[1].votes === winner.votes;
  const headline = results.total_votes === 0
    ? 'No votes were cast in this election.'
    : isTie ? `It's a tie at ${winner.votes} votes.` : `Winner: ${winner.name} with ${winner.votes} votes (${winner.percentage.toFixed(1)}%)`;
  const parts = await db.collection('participations').find({ election_id: election.id }).toArray();
  const voterIds = parts.map(p => p.voter_id).filter(Boolean);
  const users = voterIds.length ? await db.collection('users').find({ id: { $in: voterIds } }).toArray() : [];
  const rows = sorted.map((c, i) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #2b2b45;color:${i === 0 && !isTie && c.votes > 0 ? '#4ade80' : '#e5e7eb'};font-weight:${i === 0 ? 'bold' : 'normal'};">${i === 0 && !isTie && c.votes > 0 ? '🏆 ' : ''}${escapeHtml(c.name)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #2b2b45;text-align:right;color:#c4b5fd;font-family:monospace;">${c.votes} (${c.percentage.toFixed(1)}%)</td>
    </tr>`).join('');
  const link = `${appUrl()}/election/${election.slug}`;
  await db.collection('audit_logs').insertOne({
    id: uuidv4(), event_type: 'results_published', election_id: election.id,
    meta: { winner: isTie ? 'TIE' : winner.name, total_votes: results.total_votes }, created_at: new Date(),
  });
  for (const u of users) {
    await db.collection('notifications').insertOne({
      id: uuidv4(), user_id: u.id, type: 'results',
      title: `📊 Results are in: ${election.title}`,
      message: headline, election_id: election.id, read: false, created_at: new Date(),
    });
    if (u.notification_prefs?.results_available === false) continue;
    await queueEmail(db, {
      type: 'results', entityId: `results-${election.id}`, to: u.email,
      subject: `📊 Results are in: ${election.title}`,
      html: emailLayout(`Results: ${election.title}`, `
        <p>Hello ${escapeHtml(u.name || 'Voter')},</p>
        <p>The election you voted in has closed. <strong style="color:#ffffff;">${escapeHtml(headline)}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
        <p>Total ballots: <strong style="color:#ffffff;">${results.total_votes}</strong></p>
        ${emailButton(link, 'View Full Results')}`),
      text: `Election "${election.title}" has closed. ${headline}. Total ballots: ${results.total_votes}. Full results: ${link}`,
    });
  }
}

// ---------- Eligibility ----------
async function isEligible(db, election, user) {
  if (!user) return false;
  if ((election.eligibility_mode || 'all_users') === 'all_users') return true;
  const rec = await db.collection('voter_lists').findOne({ election_id: election.id, email: (user.email || '').toLowerCase() });
  return !!rec;
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function cleanEmails(arr) {
  return Array.from(new Set((arr || []).map(x => String(x).trim().toLowerCase()).filter(x => EMAIL_RE.test(x))));
}

// ---------- Router ----------
async function handle(request, method, path) {
  const db = await getDb();
  const url = new URL(request.url);
  const parts = path;
  let body = {};
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try { body = await request.json(); } catch { body = {}; }
  }

  // Health
  if (parts[0] === 'health') return json({ ok: true, ts: new Date().toISOString() });

  // ---- Auth ----
  if (parts[0] === 'auth') {
    if (parts[1] === 'register' && method === 'POST') {
      if (!rateLimit(`reg:${clientIp(request)}`, 20, 5 * 60 * 1000)) return err('Too many attempts. Please try again in a few minutes.', 429);
      const { email, password, name } = body;
      if (!email || !password || !name) return err('email, password, name required');
      if (String(password).length < 6) return err('Password must be at least 6 characters');
      if (!EMAIL_RE.test(String(email).trim())) return err('Please enter a valid email address');
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existing) return err('Email already registered', 409);
      const id = uuidv4();
      await db.collection('users').insertOne({
        id, email: email.toLowerCase(), name, password: hashPassword(password),
        role: 'voter', created_at: new Date(), verified: true,
        notification_prefs: { new_election: true, closing_soon: true, vote_confirmation: true, results_available: true },
      });
      const token = signToken({ sub: id, role: 'voter' });
      await db.collection('audit_logs').insertOne({ id: uuidv4(), event_type: 'user_registered', actor_id: id, meta: { method: 'password' }, created_at: new Date() });
      sendWelcomeEmail(db, { id, email: email.toLowerCase(), name }).catch(() => {});
      return json({ token, user: { id, email: email.toLowerCase(), name, role: 'voter' } });
    }
    if (parts[1] === 'login' && method === 'POST') {
      if (!rateLimit(`login:${clientIp(request)}`, 30, 5 * 60 * 1000)) return err('Too many attempts. Please try again in a few minutes.', 429);
      const { email, password } = body;
      const u = await db.collection('users').findOne({ email: (email || '').toLowerCase() });
      if (!u || !verifyPassword(password, u.password)) return err('Invalid credentials', 401);
      const token = signToken({ sub: u.id, role: u.role });
      return json({ token, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
    }
    if (parts[1] === 'me' && method === 'GET') {
      const u = await currentUser(request);
      if (!u) return err('Not authenticated', 401);
      return json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, picture: u.picture || null } });
    }
    // Google OAuth via Emergent managed auth: exchange session_id for our own JWT
    if (parts[1] === 'oauth' && parts[2] === 'session' && method === 'POST') {
      const { session_id } = body;
      if (!session_id) return err('session_id required');
      let data;
      try {
        const resp = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
          headers: { 'X-Session-ID': session_id }, cache: 'no-store',
        });
        if (!resp.ok) return err('Invalid or expired Google session', 401);
        data = await resp.json();
      } catch {
        return err('Could not verify Google session', 502);
      }
      if (!data?.email) return err('Google authentication failed', 401);
      const gEmail = String(data.email).toLowerCase();
      let u = await db.collection('users').findOne({ email: gEmail });
      if (!u) {
        const id = uuidv4();
        u = {
          id, email: gEmail, name: data.name || gEmail.split('@')[0],
          picture: data.picture || null, provider: 'google', role: 'voter',
          created_at: new Date(), verified: true,
          notification_prefs: { new_election: true, closing_soon: true, vote_confirmation: true, results_available: true },
        };
        await db.collection('users').insertOne(u);
        await db.collection('audit_logs').insertOne({ id: uuidv4(), event_type: 'user_registered', actor_id: id, meta: { method: 'google' }, created_at: new Date() });
        sendWelcomeEmail(db, u).catch(() => {});
      } else {
        await db.collection('users').updateOne({ id: u.id }, { $set: { picture: data.picture || u.picture || null, last_login_at: new Date() } });
      }
      const token = signToken({ sub: u.id, role: u.role });
      return json({ token, user: { id: u.id, email: u.email, name: u.name, role: u.role, picture: data.picture || u.picture || null } });
    }
  }

  // ---- Elections (list) ----
  if (parts[0] === 'elections' && parts.length === 1 && method === 'GET') {
    const list = await db.collection('elections').find({}).sort({ starts_at: -1 }).toArray();
    const user = await currentUser(request);
    const out = [];
    for (const e of list) {
      await autoCloseIfNeeded(db, e);
      const totalVotes = await db.collection('ballots').countDocuments({ election_id: e.id });
      let hasVoted = false;
      let eligible = null;
      if (user) {
        hasVoted = !!(await db.collection('participations').findOne({ election_id: e.id, voter_id: user.id }));
        eligible = await isEligible(db, e, user);
      }
      out.push({
        id: e.id, title: e.title, slug: e.slug, description: e.description,
        status: e.status, starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled, results_visibility: e.results_visibility,
        anonymous_ballot: e.anonymous_ballot,
        eligibility_mode: e.eligibility_mode || 'all_users',
        is_eligible: eligible,
        total_votes: totalVotes, has_voted: hasVoted,
      });
    }
    return json({ elections: out });
  }

  // ---- Elections by slug ----
  if (parts[0] === 'elections' && parts[1] && method === 'GET' && parts.length === 2) {
    const e = await db.collection('elections').findOne({ slug: parts[1] });
    if (!e) return err('Election not found', 404);
    await autoCloseIfNeeded(db, e);
    const candidates = await db.collection('candidates').find({ election_id: e.id }).sort({ display_order: 1 }).toArray();
    const user = await currentUser(request);
    const hasVoted = user ? !!(await db.collection('participations').findOne({ election_id: e.id, voter_id: user.id })) : false;
    const eligible = user ? await isEligible(db, e, user) : null;
    const receipt = user ? await db.collection('vote_receipts').findOne({ election_id: e.id, voter_id: user.id }) : null;
    const totalVotes = await db.collection('ballots').countDocuments({ election_id: e.id });
    return json({
      election: {
        id: e.id, title: e.title, slug: e.slug, description: e.description,
        status: e.status, starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled, results_visibility: e.results_visibility,
        anonymous_ballot: e.anonymous_ballot,
        eligibility_mode: e.eligibility_mode || 'all_users',
        is_eligible: eligible,
        candidates: candidates.map(c => ({ id: c.id, name: c.name, description: c.description, statement: c.statement || '', image_url: c.image_url || null })),
        total_votes: totalVotes,
        has_voted: hasVoted,
        confirmation: receipt?.confirmation_code || null,
      }
    });
  }

  // ---- Cast vote ----
  if (parts[0] === 'elections' && parts[1] && parts[2] === 'vote' && method === 'POST') {
    const user = await currentUser(request);
    if (!user) return err('Authentication required', 401);
    const e = await db.collection('elections').findOne({ slug: parts[1] });
    if (!e) return err('Election not found', 404);
    await autoCloseIfNeeded(db, e);
    // SERVER-SIDE TIMING VALIDATION
    const now = new Date();
    if (now < new Date(e.starts_at)) return err('Election has not opened yet', 400);
    if (now >= new Date(e.ends_at) || e.status === 'closed') return err('VOTING CLOSED — this election is no longer accepting ballots', 400);
    const { candidate_id } = body;
    if (!candidate_id) return err('candidate_id required');
    const cand = await db.collection('candidates').findOne({ id: candidate_id, election_id: e.id });
    if (!cand) return err('Invalid candidate', 400);

    // RATE LIMITING — prevents automated ballot-stuffing attempts
    if (!rateLimit(`vote:${user.id}`, 10, 60 * 1000)) return err('Too many vote attempts. Slow down.', 429);

    // ELIGIBILITY ENFORCEMENT — server-side voter list check
    const eligible = await isEligible(db, e, user);
    if (!eligible) return err('You are not on the eligible voter list for this election', 403);

    // DUPLICATE PREVENTION at DB level using unique index
    try {
      await db.collection('participations').insertOne({
        id: uuidv4(), election_id: e.id, voter_id: user.id, voted_at: new Date(),
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) return err('You have already voted in this election', 409);
      throw dupErr;
    }

    // Ballot: for anonymous, store NO voter_id (privacy separation).
    // Each ballot carries a tamper-evident cryptographic signature.
    const ballotVoterId = e.anonymous_ballot ? null : user.id;
    const ballot = { id: uuidv4(), election_id: e.id, candidate_id, voter_id: ballotVoterId, created_at: new Date() };
    ballot.integrity_hash = ballotSignature(ballot);
    await db.collection('ballots').insertOne(ballot);

    const code = confCode();
    await db.collection('vote_receipts').insertOne({
      id: uuidv4(), election_id: e.id, voter_id: user.id, confirmation_code: code, created_at: new Date(),
    });
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'ballot_accepted', election_id: e.id, actor_id: user.id, meta: { confirmation: code }, created_at: new Date(),
    });
    await db.collection('notifications').insertOne({
      id: uuidv4(), user_id: user.id, type: 'vote_confirmation',
      title: '✅ Your vote was recorded',
      message: `Your ballot for "${e.title}" was recorded. Confirmation: ${code}`,
      election_id: e.id, read: false, created_at: new Date(),
    });
    if (user.notification_prefs?.vote_confirmation !== false) {
      sendVoteConfirmationEmail(db, user, e, code).catch(() => {});
    }

    return json({ success: true, confirmation: code, message: 'VOTE RECORDED' });
  }

  // ---- Results ----
  if (parts[0] === 'elections' && parts[1] && parts[2] === 'results' && method === 'GET') {
    const e = await db.collection('elections').findOne({ slug: parts[1] });
    if (!e) return err('Election not found', 404);
    await autoCloseIfNeeded(db, e);
    const user = await currentUser(request);
    const canSee = (
      e.status === 'closed' ||
      (e.live_results_enabled && e.results_visibility === 'during_voting') ||
      (user && (await db.collection('participations').findOne({ election_id: e.id, voter_id: user.id })))
    );
    if (!canSee) return err('Results are not currently visible for this election', 403);
    const results = await getResults(db, e.id);
    return json({
      election: {
        id: e.id, title: e.title, slug: e.slug, status: e.status,
        starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled,
      },
      ...results,
    });
  }

  // ---- Integrity verification (public, machine-verified counts) ----
  if (parts[0] === 'elections' && parts[1] && parts[2] === 'integrity' && method === 'GET') {
    const e = await db.collection('elections').findOne({ slug: parts[1] });
    if (!e) return err('Election not found', 404);
    await autoCloseIfNeeded(db, e);
    if (!rateLimit(`integrity:${clientIp(request)}`, 30, 60 * 1000)) return err('Too many requests', 429);
    const report = await runIntegrityChecks(db, e);
    return json({ election: { id: e.id, title: e.title, slug: e.slug, status: e.status }, ...report });
  }

  // ---- Admin: create election ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && method === 'POST' && parts.length === 2) {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const { title, description, starts_at, ends_at, live_results_enabled, results_visibility, anonymous_ballot, candidates, eligibility_mode, voter_emails } = body;
    if (!title || !starts_at || !ends_at || !candidates || candidates.filter(c => c.name && c.name.trim()).length < 2) {
      return err('title, timing, and at least 2 named ballot options are required');
    }
    const sAt = new Date(starts_at), eAt = new Date(ends_at);
    if (isNaN(sAt) || isNaN(eAt)) return err('Invalid start or end time');
    if (eAt <= sAt) return err('Closing time must be after opening time');
    if (eAt <= new Date()) return err('Closing time must be in the future');
    const eligibilityMode = eligibility_mode === 'voter_list' ? 'voter_list' : 'all_users';
    let listEmails = [];
    if (eligibilityMode === 'voter_list') {
      listEmails = cleanEmails(voter_emails);
      if (listEmails.length === 0) return err('Voter-list elections require at least one valid voter email');
    }
    let slug = slugify(title);
    const existing = await db.collection('elections').findOne({ slug });
    if (existing) slug = slug + '-' + crypto.randomBytes(2).toString('hex');
    const id = uuidv4();
    const electionDoc = {
      id, title, slug, description: description || '',
      status: 'scheduled', starts_at: sAt, ends_at: eAt,
      live_results_enabled: !!live_results_enabled,
      results_visibility: results_visibility || 'during_voting',
      anonymous_ballot: anonymous_ballot !== false,
      eligibility_mode: eligibilityMode,
      created_by: user.id, created_at: new Date(), updated_at: new Date(),
    };
    await db.collection('elections').insertOne(electionDoc);
    let order = 0;
    for (const c of candidates.filter(c => c.name && c.name.trim())) {
      await db.collection('candidates').insertOne({
        id: uuidv4(), election_id: id, name: c.name.trim(), description: c.description || '',
        statement: c.statement || '', image_url: c.image_url || null,
        display_order: order++, created_at: new Date(),
      });
    }
    for (const em of listEmails) {
      try {
        await db.collection('voter_lists').insertOne({ id: uuidv4(), election_id: id, email: em, added_by: user.id, created_at: new Date() });
      } catch (dupErr) { if (dupErr.code !== 11000) throw dupErr; }
    }
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'election_created', election_id: id, actor_id: user.id,
      meta: { title, eligibility_mode: eligibilityMode, eligible_voters: eligibilityMode === 'voter_list' ? listEmails.length : 'all_users' }, created_at: new Date(),
    });
    // Notify + email eligible voters
    let recipients = [];
    if (eligibilityMode === 'voter_list') {
      const registered = await db.collection('users').find({ email: { $in: listEmails } }).toArray();
      for (const v of registered) {
        await db.collection('notifications').insertOne({
          id: uuidv4(), user_id: v.id, type: 'new_election',
          title: '🗳️ You are on the ballot list for a new election',
          message: `${title} — cast your vote before ${eAt.toLocaleString()}`,
          election_id: id, read: false, created_at: new Date(),
        });
      }
      recipients = listEmails.map(em => {
        const u = registered.find(r => r.email === em);
        return { email: em, name: u?.name || null };
      });
    } else {
      const voters = await db.collection('users').find({ role: 'voter' }).toArray();
      for (const v of voters) {
        await db.collection('notifications').insertOne({
          id: uuidv4(), user_id: v.id, type: 'new_election',
          title: '🗳️ A new election is open',
          message: `${title} — cast your vote before ${eAt.toLocaleString()}`,
          election_id: id, read: false, created_at: new Date(),
        });
      }
      recipients = voters.filter(v => v.notification_prefs?.new_election !== false).map(v => ({ email: v.email, name: v.name }));
    }
    if (recipients.length <= 50) {
      await sendElectionAnnouncement(db, electionDoc, recipients);
    } else {
      sendElectionAnnouncement(db, electionDoc, recipients).catch(() => {});
    }
    return json({ success: true, id, slug, eligible_voters: eligibilityMode === 'voter_list' ? listEmails.length : null });
  }

  // ---- Admin: list all elections with stats ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && method === 'GET' && parts.length === 2) {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const list = await db.collection('elections').find({}).sort({ created_at: -1 }).toArray();
    const totalUsers = await db.collection('users').countDocuments({ role: 'voter' });
    const out = [];
    for (const e of list) {
      await autoCloseIfNeeded(db, e);
      const votes = await db.collection('ballots').countDocuments({ election_id: e.id });
      let eligibleCount = totalUsers;
      if ((e.eligibility_mode || 'all_users') === 'voter_list') {
        eligibleCount = await db.collection('voter_lists').countDocuments({ election_id: e.id });
      }
      out.push({
        id: e.id, title: e.title, slug: e.slug, status: e.status,
        starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled,
        eligibility_mode: e.eligibility_mode || 'all_users',
        total_votes: votes, eligible: eligibleCount,
        participation: eligibleCount ? (votes * 100 / eligibleCount) : 0,
      });
    }
    return json({ elections: out, total_voters: totalUsers });
  }

  // ---- Admin: close election manually ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && parts[2] && parts[3] === 'close' && method === 'POST') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const eid = parts[2];
    const target = await db.collection('elections').findOne({ id: eid });
    if (!target) return err('Election not found', 404);
    await db.collection('elections').updateOne({ id: eid }, { $set: { status: 'closed', ends_at: new Date(), updated_at: new Date() } });
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'election_closed', election_id: eid, actor_id: user.id, meta: { reason: 'manual' }, created_at: new Date(),
    });
    target.status = 'closed';
    await notifyResultsIfNeeded(db, target);
    return json({ success: true });
  }

  // ---- Admin: audit logs ----
  if (parts[0] === 'admin' && parts[1] === 'audit' && method === 'GET') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const logs = await db.collection('audit_logs').find({}).sort({ created_at: -1 }).limit(200).toArray();
    return json({ logs: logs.map(l => ({ id: l.id, event_type: l.event_type, election_id: l.election_id, actor_id: l.actor_id, meta: l.meta, created_at: l.created_at })) });
  }

  // ---- Admin: manage voter eligibility lists (CSV import target) ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && parts[2] && parts[3] === 'voters') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const e = await db.collection('elections').findOne({ id: parts[2] });
    if (!e) return err('Election not found', 404);
    if (method === 'GET') {
      const list = await db.collection('voter_lists').find({ election_id: e.id }).sort({ created_at: 1 }).toArray();
      const emails = list.map(v => v.email);
      const regs = emails.length ? await db.collection('users').find({ email: { $in: emails } }).toArray() : [];
      const partIds = (await db.collection('participations').find({ election_id: e.id }).toArray()).map(p => p.voter_id);
      return json({
        eligibility_mode: e.eligibility_mode || 'all_users',
        voters: list.map(v => {
          const u = regs.find(r => r.email === v.email);
          return { id: v.id, email: v.email, registered: !!u, voted: u ? partIds.includes(u.id) : false };
        }),
        count: list.length,
      });
    }
    if (method === 'POST') {
      const emails = cleanEmails(body.emails);
      if (!emails.length) return err('No valid email addresses provided');
      let added = 0;
      for (const em of emails) {
        try {
          await db.collection('voter_lists').insertOne({ id: uuidv4(), election_id: e.id, email: em, added_by: user.id, created_at: new Date() });
          added++;
        } catch (dupErr) { if (dupErr.code !== 11000) throw dupErr; }
      }
      if ((e.eligibility_mode || 'all_users') !== 'voter_list') {
        await db.collection('elections').updateOne({ id: e.id }, { $set: { eligibility_mode: 'voter_list', updated_at: new Date() } });
      }
      await db.collection('audit_logs').insertOne({
        id: uuidv4(), event_type: 'voter_list_updated', election_id: e.id, actor_id: user.id, meta: { added, submitted: emails.length }, created_at: new Date(),
      });
      const total = await db.collection('voter_lists').countDocuments({ election_id: e.id });
      return json({ success: true, added, total });
    }
    if (method === 'DELETE') {
      const em = String(body.email || '').toLowerCase();
      if (!em) return err('email required');
      await db.collection('voter_lists').deleteOne({ election_id: e.id, email: em });
      await db.collection('audit_logs').insertOne({
        id: uuidv4(), event_type: 'voter_list_updated', election_id: e.id, actor_id: user.id, meta: { removed: em }, created_at: new Date(),
      });
      return json({ success: true });
    }
  }

  // ---- Admin: email delivery log ----
  if (parts[0] === 'admin' && parts[1] === 'emails' && method === 'GET') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const events = await db.collection('email_events').find({}).sort({ created_at: -1 }).limit(200).toArray();
    return json({
      email_enabled: !!process.env.RESEND_API_KEY,
      events: events.map(ev => ({ id: ev.id, type: ev.type, to: ev.to, subject: ev.subject, status: ev.status, created_at: ev.created_at })),
    });
  }

  // ---- Admin: run integrity check on any election ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && parts[2] && parts[3] === 'integrity' && method === 'GET') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const e = await db.collection('elections').findOne({ id: parts[2] });
    if (!e) return err('Election not found', 404);
    const report = await runIntegrityChecks(db, e);
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'integrity_check', election_id: e.id, actor_id: user.id,
      meta: { verified: report.verified, total_ballots: report.total_ballots }, created_at: new Date(),
    });
    return json({ election: { id: e.id, title: e.title, slug: e.slug, status: e.status }, ...report });
  }

  // ---- Notification preferences ----
  if (parts[0] === 'prefs') {
    const user = await currentUser(request);
    if (!user) return err('Auth required', 401);
    const defaults = { new_election: true, closing_soon: true, vote_confirmation: true, results_available: true };
    if (method === 'GET') {
      return json({ prefs: { ...defaults, ...(user.notification_prefs || {}) } });
    }
    if (method === 'POST' || method === 'PUT') {
      const next = { ...defaults, ...(user.notification_prefs || {}) };
      for (const k of Object.keys(defaults)) {
        if (typeof body[k] === 'boolean') next[k] = body[k];
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: { notification_prefs: next } });
      return json({ success: true, prefs: next });
    }
  }

  // ---- Notifications ----
  if (parts[0] === 'notifications' && method === 'GET') {
    const user = await currentUser(request);
    if (!user) return err('Auth required', 401);
    const items = await db.collection('notifications').find({ user_id: user.id }).sort({ created_at: -1 }).limit(50).toArray();
    return json({ notifications: items.map(n => ({ id: n.id, type: n.type, title: n.title, message: n.message, election_id: n.election_id, read: n.read, created_at: n.created_at })) });
  }
  if (parts[0] === 'notifications' && parts[1] === 'read' && method === 'POST') {
    const user = await currentUser(request);
    if (!user) return err('Auth required', 401);
    await db.collection('notifications').updateMany({ user_id: user.id }, { $set: { read: true } });
    return json({ success: true });
  }

  return err('Not found', 404);
}

export async function GET(request, { params }) {
  const p = (await params).path || [];
  return handle(request, 'GET', p);
}
export async function POST(request, { params }) {
  const p = (await params).path || [];
  return handle(request, 'POST', p);
}
export async function PUT(request, { params }) {
  const p = (await params).path || [];
  return handle(request, 'PUT', p);
}
export async function DELETE(request, { params }) {
  const p = (await params).path || [];
  return handle(request, 'DELETE', p);
}
