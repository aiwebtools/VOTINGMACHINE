import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

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
  await db.collection('users').insertOne({
    id: adminId,
    email: 'admin@votevault.app',
    name: 'VoteVault Admin',
    password: hashPassword('admin123'),
    role: 'admin',
    created_at: new Date(),
    verified: true,
  });

  // Sample voter
  await db.collection('users').insertOne({
    id: uuidv4(),
    email: 'voter@demo.app',
    name: 'Demo Voter',
    password: hashPassword('voter123'),
    role: 'voter',
    created_at: new Date(),
    verified: true,
  });

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in2d = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const in5min = new Date(now.getTime() + 5 * 60 * 1000);
  const past = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
  const past2 = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const futureStart = new Date(now.getTime() + 24 * 3600 * 1000);

  const elections = [
    {
      title: 'Community Board Election 2025 [DEMO]',
      slug: 'community-board-2025',
      description: 'Vote for your next Community Board representative. This DEMO election showcases live results updating in real-time.',
      status: 'open', starts_at: past, ends_at: in7d,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Alex Rivera', description: 'Advocates for public parks, transit expansion, and small business support.' },
        { name: 'Priya Chen', description: 'Focus on housing affordability, community safety, and education.' },
        { name: 'Marcus Okafor', description: 'Champion for green infrastructure and neighborhood arts programs.' },
      ],
    },
    {
      title: 'Best New Initiative [DEMO]',
      slug: 'best-new-initiative',
      description: 'Which team-proposed initiative should we fund this quarter?',
      status: 'open', starts_at: past, ends_at: in2d,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: false, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Free Coding Bootcamps', description: 'Weekend workshops for local youth.' },
        { name: 'Neighborhood Solar Program', description: 'Subsidized rooftop solar installations.' },
        { name: 'Public Art Grants', description: 'Fund 10 street murals across the district.' },
        { name: 'Community Health Van', description: 'Mobile clinic for underserved areas.' },
      ],
    },
    {
      title: 'Closing Soon: School Association Vote [DEMO]',
      slug: 'school-association',
      description: 'PTA leadership vote. Closes in 5 minutes — good for testing auto-close!',
      status: 'open', starts_at: past, ends_at: in5min,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Yes, approve new charter', description: 'Adopt the updated PTA charter as drafted.' },
        { name: 'No, keep current charter', description: 'Retain the existing PTA charter.' },
      ],
    },
    {
      title: 'Neighborhood Proposal [DEMO — UPCOMING]',
      slug: 'neighborhood-proposal',
      description: 'Should we convert Main Street into a pedestrian plaza on weekends?',
      status: 'scheduled', starts_at: futureStart, ends_at: in7d,
      live_results_enabled: false, results_visibility: 'after_closing',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'Yes — pedestrian plaza', description: 'Close to cars Saturdays & Sundays.' },
        { name: 'No — keep as is', description: 'Maintain current traffic patterns.' },
      ],
    },
    {
      title: 'Past Election: Best Local Cafe [DEMO — CLOSED]',
      slug: 'best-local-cafe',
      description: 'Voters chose their favorite neighborhood cafe. Results are final.',
      status: 'closed', starts_at: past, ends_at: past2,
      live_results_enabled: true, results_visibility: 'during_voting',
      anonymous_ballot: true, eligibility_mode: 'all_users',
      candidates: [
        { name: 'The Roasted Bean', description: 'Cozy corner spot.' },
        { name: 'Sunrise Coffee', description: 'Best pastries in town.' },
        { name: 'Nightowl Espresso', description: 'Open late for night owls.' },
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
    // Add some seed ballots to the closed election for realistic results
    if (e.status === 'closed') {
      const cands = await db.collection('candidates').find({ election_id: eid }).toArray();
      const seedCounts = [45, 62, 28];
      for (let i = 0; i < cands.length; i++) {
        for (let j = 0; j < seedCounts[i]; j++) {
          await db.collection('ballots').insertOne({
            id: uuidv4(), election_id: eid, candidate_id: cands[i].id, voter_id: null, created_at: new Date(),
          });
        }
      }
    }
    // Seed some votes for open live-results elections for immediate visuals
    if (e.status === 'open' && e.live_results_enabled) {
      const cands = await db.collection('candidates').find({ election_id: eid }).toArray();
      const counts = cands.map(() => Math.floor(Math.random() * 40) + 10);
      for (let i = 0; i < cands.length; i++) {
        for (let j = 0; j < counts[i]; j++) {
          await db.collection('ballots').insertOne({
            id: uuidv4(), election_id: eid, candidate_id: cands[i].id, voter_id: null, created_at: new Date(),
          });
        }
      }
    }
  }
  await db.collection('audit_logs').insertOne({
    id: uuidv4(), event_type: 'system_seeded', actor_id: adminId, meta: { elections: elections.length }, created_at: new Date(),
  });
}

// ---------- Utils ----------
function json(data, status = 200) { return NextResponse.json(data, { status }); }
function err(msg, status = 400) { return NextResponse.json({ error: msg }, { status }); }
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
    if (eff === 'closed') {
      await db.collection('audit_logs').insertOne({
        id: uuidv4(), event_type: 'election_closed', election_id: election.id, meta: { reason: 'auto' }, created_at: new Date(),
      });
    }
    election.status = eff;
  }
  return election;
}
async function getResults(db, electionId) {
  const cands = await db.collection('candidates').find({ election_id: electionId }).sort({ display_order: 1 }).toArray();
  const results = [];
  let total = 0;
  for (const c of cands) {
    const votes = await db.collection('ballots').countDocuments({ election_id: electionId, candidate_id: c.id });
    results.push({ id: c.id, name: c.name, description: c.description, votes });
    total += votes;
  }
  return {
    total_votes: total,
    candidates: results.map(r => ({ ...r, percentage: total ? (r.votes * 100 / total) : 0 })),
    last_updated: new Date().toISOString(),
  };
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
      const { email, password, name } = body;
      if (!email || !password || !name) return err('email, password, name required');
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (existing) return err('Email already registered', 409);
      const id = uuidv4();
      await db.collection('users').insertOne({
        id, email: email.toLowerCase(), name, password: hashPassword(password),
        role: 'voter', created_at: new Date(), verified: true,
        notification_prefs: { new_election: true, closing_soon: true, vote_confirmation: true, results_available: true },
      });
      const token = signToken({ sub: id, role: 'voter' });
      return json({ token, user: { id, email: email.toLowerCase(), name, role: 'voter' } });
    }
    if (parts[1] === 'login' && method === 'POST') {
      const { email, password } = body;
      const u = await db.collection('users').findOne({ email: (email || '').toLowerCase() });
      if (!u || !verifyPassword(password, u.password)) return err('Invalid credentials', 401);
      const token = signToken({ sub: u.id, role: u.role });
      return json({ token, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
    }
    if (parts[1] === 'me' && method === 'GET') {
      const u = await currentUser(request);
      if (!u) return err('Not authenticated', 401);
      return json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
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
      if (user) {
        hasVoted = !!(await db.collection('participations').findOne({ election_id: e.id, voter_id: user.id }));
      }
      out.push({
        id: e.id, title: e.title, slug: e.slug, description: e.description,
        status: e.status, starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled, results_visibility: e.results_visibility,
        anonymous_ballot: e.anonymous_ballot,
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
    const receipt = user ? await db.collection('vote_receipts').findOne({ election_id: e.id, voter_id: user.id }) : null;
    const totalVotes = await db.collection('ballots').countDocuments({ election_id: e.id });
    return json({
      election: {
        id: e.id, title: e.title, slug: e.slug, description: e.description,
        status: e.status, starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled, results_visibility: e.results_visibility,
        anonymous_ballot: e.anonymous_ballot,
        candidates: candidates.map(c => ({ id: c.id, name: c.name, description: c.description, image_url: c.image_url })),
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

    // DUPLICATE PREVENTION at DB level using unique index
    try {
      await db.collection('participations').insertOne({
        id: uuidv4(), election_id: e.id, voter_id: user.id, voted_at: new Date(),
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) return err('You have already voted in this election', 409);
      throw dupErr;
    }

    // Ballot: for anonymous, store NO voter_id (privacy separation)
    const ballotVoterId = e.anonymous_ballot ? null : user.id;
    await db.collection('ballots').insertOne({
      id: uuidv4(), election_id: e.id, candidate_id, voter_id: ballotVoterId, created_at: new Date(),
    });

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

  // ---- Admin: create election ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && method === 'POST' && parts.length === 2) {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const { title, description, starts_at, ends_at, live_results_enabled, results_visibility, anonymous_ballot, candidates } = body;
    if (!title || !starts_at || !ends_at || !candidates || candidates.length < 2) return err('title, timing, and at least 2 candidates required');
    let slug = slugify(title);
    const existing = await db.collection('elections').findOne({ slug });
    if (existing) slug = slug + '-' + crypto.randomBytes(2).toString('hex');
    const id = uuidv4();
    await db.collection('elections').insertOne({
      id, title, slug, description: description || '',
      status: 'scheduled', starts_at: new Date(starts_at), ends_at: new Date(ends_at),
      live_results_enabled: !!live_results_enabled,
      results_visibility: results_visibility || 'during_voting',
      anonymous_ballot: anonymous_ballot !== false,
      eligibility_mode: 'all_users',
      created_by: user.id, created_at: new Date(), updated_at: new Date(),
    });
    let order = 0;
    for (const c of candidates) {
      await db.collection('candidates').insertOne({
        id: uuidv4(), election_id: id, name: c.name, description: c.description || '',
        display_order: order++, created_at: new Date(),
      });
    }
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'election_created', election_id: id, actor_id: user.id, meta: { title }, created_at: new Date(),
    });
    // Notify all voters
    const voters = await db.collection('users').find({ role: 'voter' }).toArray();
    for (const v of voters) {
      await db.collection('notifications').insertOne({
        id: uuidv4(), user_id: v.id, type: 'new_election',
        title: '🗳️ A new election is open',
        message: `${title} — cast your vote before ${new Date(ends_at).toLocaleString()}`,
        election_id: id, read: false, created_at: new Date(),
      });
    }
    return json({ success: true, id, slug });
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
      out.push({
        id: e.id, title: e.title, slug: e.slug, status: e.status,
        starts_at: e.starts_at, ends_at: e.ends_at,
        live_results_enabled: e.live_results_enabled,
        total_votes: votes, eligible: totalUsers,
        participation: totalUsers ? (votes * 100 / totalUsers) : 0,
      });
    }
    return json({ elections: out, total_voters: totalUsers });
  }

  // ---- Admin: close election manually ----
  if (parts[0] === 'admin' && parts[1] === 'elections' && parts[2] && parts[3] === 'close' && method === 'POST') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const eid = parts[2];
    await db.collection('elections').updateOne({ id: eid }, { $set: { status: 'closed', ends_at: new Date(), updated_at: new Date() } });
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), event_type: 'election_closed', election_id: eid, actor_id: user.id, meta: { reason: 'manual' }, created_at: new Date(),
    });
    return json({ success: true });
  }

  // ---- Admin: audit logs ----
  if (parts[0] === 'admin' && parts[1] === 'audit' && method === 'GET') {
    const user = await currentUser(request);
    if (!user || user.role !== 'admin') return err('Admin only', 403);
    const logs = await db.collection('audit_logs').find({}).sort({ created_at: -1 }).limit(200).toArray();
    return json({ logs: logs.map(l => ({ id: l.id, event_type: l.event_type, election_id: l.election_id, actor_id: l.actor_id, meta: l.meta, created_at: l.created_at })) });
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
