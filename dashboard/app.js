/* Torus BD Dashboard.
   Two modes, same screens:
   - DEMO: no database configured (window.TORUS_CONFIG is null). Fictional sample data in memory.
   - LIVE: Supabase URL + anon key set in Vercel env vars. Team login by email link, every change
     saved to the database, live updates pushed to every open screen. No polling.
   Patient leads are stored only as MONTHLY COUNTS. IntakeQ exports are summarised in the browser;
   no patient-level data is ever sent anywhere. */
(async () => {
  const DAY = 864e5;
  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
  const d = (offset) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset);
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, dd] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, dd || 1); };
  const days = (s) => Math.round((parse(s) - TODAY) / DAY);
  const fmt = (s, o = { month: 'short', day: 'numeric' }) => parse(s).toLocaleDateString('en-US', o);
  const fmtMonth = (s, long = false) => parse(s).toLocaleDateString('en-US', long ? { month: 'long', year: 'numeric' } : { month: 'short', year: 'numeric' });
  const monthOf = (s) => String(s).slice(0, 7) + '-01';
  const monthShift = (n) => iso(new Date(TODAY.getFullYear(), TODAY.getMonth() + n, 1));
  const THIS_MONTH = monthShift(0), LAST_MONTH = monthShift(-1);
  const rel = (s) => { const n = days(s); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : n < 0 ? `${-n} days late` : n < 7 ? parse(s).toLocaleDateString('en-US', { weekday: 'long' }) : fmt(s); };
  const money = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');
  const pct = (n) => (isFinite(n) ? Math.round(n * 100) + '%' : '–');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ---------------- Vocabulary (from the playbook) ---------------- */
  const STAGES = ['Cold', 'Warm', 'Sent materials', 'Meeting scheduled', 'Referral made', 'Active referrer'];
  const ALL_STATUS = [...STAGES, 'Not a fit'];
  const ACTIVITIES = [
    { id: 'A1', name: 'Practice partnerships', long: '1 · Practice partnerships', color: 'var(--chart-1)' },
    { id: 'A2', name: 'Spravato insurance track', long: '2 · Spravato insurance track', color: 'var(--chart-3)' },
    { id: 'A3', name: 'Provider education', long: '3 · Provider education series', color: 'var(--chart-2)' },
    { id: 'A4', name: 'Community events', long: '4 · Wellness community events', color: 'var(--chart-5)' },
    { id: 'A5', name: "Shari's network", long: "5 · Shari's physician network", color: 'var(--chart-4)' },
    { id: 'D', name: 'Digital / direct', long: 'Digital / direct', color: 'var(--chart-6)' },
  ];
  const act = (id) => ACTIVITIES.find((a) => a.id === id) || ACTIVITIES[5];
  const SOURCES = ['Provider referral', 'Community event', 'Provider education event', 'Social media', 'Google / organic search', 'Email (Flodesk)', 'Word of mouth', 'Direct walk-in', 'Shari Retreats', 'Shari Yoga', 'Avonny', 'Psychology Today', 'Other', 'Not recorded'];
  const CHANNELS = ['Discovery form (website)', 'Phone call', 'Email', 'Provider referral form', 'At an event', 'Walk-in', 'Not recorded'];
  const EVENT_TYPES = ['Lunch-and-learn', 'Webinar', 'Open house', 'Q&A', 'Tea', 'Integration circle', 'Community talk'];
  const TYPES = ['Clinical referrer', 'Hospital colleague', 'Community venue'];
  const OWNERS = ['Torus team', 'Shari', 'Annette', 'Stephanie', 'Avonny'];
  const METHODS = ['Email', 'Text', 'Phone', 'In-person', 'Letter', 'Zoom'];
  const OUTCOMES = ['No response', 'Replied', 'Conversation held', 'Meeting scheduled', 'Materials sent', 'Referral agreed', 'Declined'];
  const PACKAGES = { 'None yet': 0, 'Single infusion': 450, '4-session series': 1800, '6-session series': 2600, 'Spravato (insurance)': 0 };

  /* ---------------- Data layer ---------------- */
  const CFG = window.TORUS_CONFIG || null;
  const LIVE = !!(CFG && CFG.supabaseUrl && CFG.supabaseAnonKey);
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const EMPTY = () => ({ settings: { openDate: iso(TODAY), staffCost: 50 }, partners: [], touches: [], events: [], counts: [], team: [] });
  let DATA = LIVE ? EMPTY() : window.TORUS_SAMPLE(PACKAGES);
  let db = null, session = null, me = null;
  let EVENT_SCHEDULE_SUPPORTED=!LIVE;
  const PREF_KEY='torus-dashboard-ui-v1';
  const PREF_DEFAULTS={weekStart:'sunday',defaultView:'month',density:'comfortable',motion:'ambient'};
  function readPrefs(){
    try{
      const raw=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
      return {
        weekStart:['sunday','monday'].includes(raw.weekStart)?raw.weekStart:'sunday',
        defaultView:['month','week','agenda'].includes(raw.defaultView)?raw.defaultView:'month',
        density:['comfortable','compact'].includes(raw.density)?raw.density:'comfortable',
        motion:['ambient','reduced'].includes(raw.motion)?raw.motion:'ambient'
      };
    }catch(_){return {...PREF_DEFAULTS};}
  }
  let PREFS=readPrefs();
  function applyPrefs(){
    document.documentElement.dataset.density=PREFS.density;
    document.documentElement.dataset.motion=PREFS.motion;
  }
  applyPrefs();
  function savePrefs(){
    try{localStorage.setItem(PREF_KEY,JSON.stringify(PREFS));}catch(_){}
    applyPrefs();
    window.TorusVisuals?.refreshPreferences?.();
  }


  // Database rows (snake_case) <-> app records (camelCase). One place to change if a column changes.
  const TABLES = {
    partners: { coll: 'partners', key: 'id',
      from: (r) => ({ id: r.id, contact: r.contact, org: r.org, type: r.type, activity: r.activity, spec: r.specialty, city: r.city, phone: r.phone, status: r.status, owner: r.owner, next: r.next_follow_up || '', nextStep: r.next_step, metAt: r.met_at || '' }),
      to: (p) => ({ id: p.id, contact: p.contact, org: p.org, type: p.type, activity: p.activity, specialty: p.spec || '', city: p.city || '', phone: p.phone || '', status: p.status, owner: p.owner || '', next_follow_up: p.next || null, next_step: p.nextStep || '', met_at: p.metAt || null }) },
    touches: { coll: 'touches', key: 'id',
      from: (r) => ({ id: r.id, partner: r.partner_id, date: r.date, method: r.method, by: r.done_by, outcome: r.outcome, note: r.note, hours: +r.hours, cost: +r.cost }),
      to: (t) => ({ partner_id: t.partner, date: t.date, method: t.method, done_by: t.by, outcome: t.outcome, note: t.note, hours: +t.hours || 0, cost: +t.cost || 0 }) },
    events: { coll: 'events', key: 'id',
      from: (r) => ({ id: r.id, name: r.name, type: r.type, activity: r.activity, date: r.date, venue: r.venue_id || '', format: r.format, attendees: +r.attendees, signups: +r.signups, cost: +r.cost, hours: +r.hours, startTime:r.start_time||'', endTime:r.end_time||'', details:r.details||'' }),
      to: (e) => ({ id: e.id, name: e.name, type: e.type, activity: e.activity, date: e.date, venue_id: e.venue || null, format: e.format, attendees: +e.attendees || 0, signups: +e.signups || 0, cost: +e.cost || 0, hours: +e.hours || 0, ...(EVENT_SCHEDULE_SUPPORTED?{start_time:e.startTime||null,end_time:e.endTime||null,details:e.details||''}:{}) }) },
    lead_counts: { coll: 'counts', key: 'id',
      from: (r) => ({ id: r.id, month: r.month, via: r.via, source: r.source, credit: r.credit_id || '', leads: +r.leads, consults: +r.consults, converted: +r.converted, revenue: +r.revenue }),
      to: (c) => ({ month: c.month, via: c.via, source: c.source, credit_id: c.credit || '', leads: +c.leads || 0, consults: +c.consults || 0, converted: +c.converted || 0, revenue: +c.revenue || 0 }) },
    team_members: { coll: 'team', key: 'email', from: (r) => ({ email: r.email, name: r.name, role: r.role }), to: (m) => ({ email: m.email.toLowerCase(), name: m.name || '', role: m.role || 'member' }) },
  };

  async function connect() {
    const { createClient } = await import(SUPABASE_JS);
    db = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    const { data } = await db.auth.getSession();
    session = data.session;
    if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + '#today');
    db.auth.onAuthStateChange((evt, s) => { const was = !!session; session = s; if (!!s !== was) boot(); });
  }
  async function loadAll() {
    const q = (t, order) => db.from(t).select('*').order(order, { ascending: true });
    const res = await Promise.all([q('partners', 'id'), q('touches', 'date'), q('events', 'date'), q('lead_counts', 'month'), db.from('settings').select('*').eq('id', 1), q('team_members', 'email')]);
    const err = res.find((r) => r.error); if (err) throw err.error;
    const [p, t, e, c, s, m] = res.map((r) => r.data || []);
    DATA = { partners: p.map(TABLES.partners.from), touches: t.map(TABLES.touches.from), events: e.map(TABLES.events.from), counts: c.map(TABLES.lead_counts.from),
      settings: s[0] ? { openDate: s[0].open_date, staffCost: +s[0].staff_cost } : EMPTY().settings, team: m.map(TABLES.team_members.from) };
    me = DATA.team.find((x) => x.email === (session.user.email || '').toLowerCase()) || null;
    try{
      const probe=await db.from('events').select('start_time,end_time,details').limit(1);
      EVENT_SCHEDULE_SUPPORTED=!probe.error;
    }catch(_){EVENT_SCHEDULE_SUPPORTED=false;}

  }
  function subscribe() {
    db.channel('torus-live').on('postgres_changes', { event: '*', schema: 'public' }, (msg) => {
      const T = TABLES[msg.table];
      if (msg.table === 'settings') { if (msg.new) DATA.settings = { openDate: msg.new.open_date, staffCost: +msg.new.staff_cost }; return refresh(); }
      if (!T) return;
      const list = DATA[T.coll], keyOf = (r) => r[T.key];
      if (msg.eventType === 'DELETE') { const k = keyOf(msg.old || {}); DATA[T.coll] = list.filter((x) => x[T.key] !== k); }
      else { const rec = T.from(msg.new), i = list.findIndex((x) => x[T.key] === rec[T.key]); if (i >= 0) list[i] = rec; else list.push(rec); }
      refresh();
    }).subscribe();
  }
  // Save helpers: write to the database in LIVE mode, to memory in DEMO mode. Return the saved record.
  async function upsert(table, rec) {
    const T = TABLES[table];
    if (LIVE) {
      const row = T.to(rec); if (table === 'touches' && rec.id) row.id = rec.id;
      const { data, error } = await db.from(table).upsert(row).select().single();
      if (error) throw error; rec = T.from(data);
    } else if (table === 'touches' && !rec.id) rec.id = 'T' + Date.now();
    const list = DATA[T.coll], i = list.findIndex((x) => x[T.key] === rec[T.key]);
    if (i >= 0) list[i] = rec; else list.push(rec);
    return rec;
  }
  async function remove(table, key) {
    const T = TABLES[table];
    if (LIVE) { const { error } = await db.from(table).delete().eq(T.key, key); if (error) throw error; }
    DATA[T.coll] = DATA[T.coll].filter((x) => x[T.key] !== key);
  }
  async function saveSettings(s) {
    if (LIVE) { const { error } = await db.from('settings').upsert({ id: 1, open_date: s.openDate, staff_cost: s.staffCost }); if (error) throw error; }
    DATA.settings = s;
  }
  async function replaceCounts(rows) {
    if (LIVE) {
      const { error } = await db.rpc('replace_lead_counts', { p_rows: rows.map(TABLES.lead_counts.to) }); if (error) throw error;
      const { data, error: e2 } = await db.from('lead_counts').select('*').order('month'); if (e2) throw e2;
      DATA.counts = data.map(TABLES.lead_counts.from);
    } else {
      const pairs = new Set(rows.map((r) => r.month + '|' + r.via));
      DATA.counts = DATA.counts.filter((c) => !pairs.has(c.month + '|' + c.via)).concat(rows.map((r, i) => ({ ...r, id: 'I' + Date.now() + i })));
    }
  }
  const nextId = (prefix, list) => prefix + String(Math.max(0, ...list.map((x) => parseInt(String(x.id).slice(2), 10) || 0)) + 1).padStart(3, '0');

  /* ---------------- Derived values (all lead figures are monthly counts) ---------------- */
  const partner = (id) => DATA.partners.find((p) => p.id === id);
  const eventById = (id) => DATA.events.find((e) => e.id === id);
  const creditActivity = (id) => (String(id).startsWith('P-') ? partner(id)?.activity : String(id).startsWith('E-') ? eventById(id)?.activity : 'D') || 'D';
  const touchesOf = (id) => DATA.touches.filter((t) => t.partner === id).sort((a, b) => b.date.localeCompare(a.date));
  const sum = (rows) => rows.reduce((s, c) => ({ leads: s.leads + c.leads, consults: s.consults + c.consults, converted: s.converted + c.converted, revenue: s.revenue + c.revenue }), { leads: 0, consults: 0, converted: 0, revenue: 0 });
  const countsFor = (pred) => DATA.counts.filter(pred);
  const creditTotals = (id) => sum(countsFor((c) => c.credit === id));
  const byMonth = (rows) => { const m = new Map(); rows.forEach((c) => { const s = m.get(c.month) || []; s.push(c); m.set(c.month, s); }); return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, r]) => ({ month, ...sum(r) })); };
  const lastReferral = (id) => countsFor((c) => c.credit === id && c.leads > 0).map((c) => c.month).sort().at(-1) || '';
  const metAtEvent = (eid) => DATA.partners.filter((p) => p.metAt === eid);
  const overdue = (p) => p.next && days(p.next) < 0 && p.status !== 'Not a fit';
  const monthInRange = (month, range) => range === 'all' || month >= monthOf(iso(d(-range)));
  const inRange = (s, range) => range === 'all' || days(s) >= -range;
  const creditLink = (id) => (String(id).startsWith('P-') ? `<a href="#partner-${esc(id)}">${esc(partner(id)?.org || id)}</a>` : String(id).startsWith('E-') ? `<a href="#event-${esc(id)}">${esc(eventById(id)?.name || id)}</a>` : actChip('D'));
  function activityRoi(range) {
    const cost = DATA.settings.staffCost;
    return ACTIVITIES.map((a) => {
      const t = sum(countsFor((c) => creditActivity(c.credit) === a.id && monthInRange(c.month, range)));
      const tt = DATA.touches.filter((x) => partner(x.partner)?.activity === a.id && inRange(x.date, range));
      const ev = DATA.events.filter((e) => e.activity === a.id && days(e.date) <= 0 && inRange(e.date, range));
      const spend = tt.reduce((s, x) => s + x.cost + x.hours * cost, 0) + ev.reduce((s, e) => s + e.cost + e.hours * cost, 0);
      return { ...a, ...t, conv: t.converted, spend, touches: tt.length, events: ev.length, partners: DATA.partners.filter((p) => p.activity === a.id).length, active: DATA.partners.filter((p) => p.activity === a.id && p.status === 'Active referrer').length };
    });
  }
  function sourceStats(range) {
    return SOURCES.map((s) => ({ name: s, ...sum(countsFor((c) => c.source === s && monthInRange(c.month, range))) })).map((x) => ({ ...x, conv: x.converted }));
  }
  function scorecard() {
    const open = DATA.settings.openDate, openMonth = monthOf(open), since = (s) => Math.round((parse(s) - parse(open)) / DAY);
    const w = (max, a) => sum(countsFor((c) => creditActivity(c.credit) === a && c.month >= openMonth && since(c.month) <= max)).leads;
    const lead = partner('P-001');
    const a4 = DATA.events.filter((e) => e.activity === 'A4' && days(e.date) <= 0);
    const att = a4.reduce((s, e) => s + e.attendees, 0), sig = a4.reduce((s, e) => s + e.signups, 0);
    const msgs = DATA.touches.filter((t) => partner(t.partner)?.activity === 'A5' && t.by === 'Shari' && since(t.date) <= 30);
    const conv = DATA.touches.filter((t) => partner(t.partner)?.activity === 'A5' && ['Conversation held', 'Meeting scheduled', 'Referral agreed'].includes(t.outcome));
    const all = sum(DATA.counts);
    return [
      { a: 'A1', label: 'Lead partner at "Active referrer" within 60 days', target: 1, actual: lead?.status === 'Active referrer' ? 1 : 0, show: lead?.status || '–', unit: 'flag' },
      { a: 'A1', label: 'First referral from lead partner within 90 days', target: 1, actual: sum(countsFor((c) => c.credit === 'P-001' && since(c.month) <= 90)).leads },
      { a: 'A2', label: 'Spravato-specific referrals, first quarter', target: 3, actual: w(90, 'A2') },
      { a: 'A3', label: 'Referrals traced to education series, first 6 months', target: 2, actual: w(182, 'A3') },
      { a: 'A4', label: 'Community events held, months 1–3', target: 3, actual: a4.filter((e) => since(e.date) >= 0 && since(e.date) <= 91).length },
      { a: 'A4', label: 'Average attendees per community event', target: 10, actual: a4.length ? Math.round(att / a4.length) : 0 },
      { a: 'A4', label: 'Event waitlist signup rate', target: 0.2, actual: att ? sig / att : 0, unit: 'pct' },
      { a: 'A5', label: "Shari's personal messages, first 30 days", target: 10, actual: msgs.length },
      { a: 'A5', label: 'Conversations started with colleagues', target: 5, actual: conv.length },
      { a: 'A5', label: 'Physician-network referrals within 60 days', target: 2, actual: w(60, 'A5') },
      { a: 'D', label: 'Lead → consult rate', target: 0.4, actual: all.leads ? all.consults / all.leads : 0, unit: 'pct' },
    ];
  }

  /* ---------------- UI helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opts = (list, sel) => list.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
  const view = $('[data-view]');
  const ui = { state: 'ready', q: '', status: '', activity: '', via: '', pact: '', sort: 'next', dir: 1, range: 90, prange: 'all', month: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), calSelected:iso(TODAY), todaySelected:'', pipelinePage:0, calMode:PREFS.defaultView,calRecord:'',calFilter:'all',eventOpen:'',pipelineOwner:'',pipelineActivity:'',pipelineDue:'all',pipelineSort:'due',pipelineSelected:new Set(), pending: false, importRows: null };
  let lastFocus = null;

  const ICON = {
    today: '<path d="M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 8v4l3 2"/>',
    patients: '<path d="M12 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0"/>',
    partners: '<path d="M8 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM2.5 19a5.5 5.5 0 0 1 11 0M16 11a2.5 2.5 0 1 0 0-5M15 14.5a5 5 0 0 1 6.5 4.5"/>',
    pipeline: '<path d="M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z"/>',
    events: '<path d="M5 6h14v13H5zM5 10h14M9 4v4M15 4v4"/>',
    sources: '<path d="M4 19V9M10 19V5M16 19v-7M3 19h18"/>',
    calendar: '<path d="M5 6h14v13H5zM5 10h14M9 14h2M13 14h2M9 17h2"/>',
    settings: '<path d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.4-1.4.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L5 8.3 3 8 2 11l2 1v0l-2 1 1 3 2-.3 1.4 1.4-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.4-1.4 2 .3 1-3z"/>',
  };
  const PAGES = [
    { id: 'today', name: 'Today', icon: 'today' },
    { id: 'partners', name: 'Partners', long: 'Referral partners', icon: 'partners' },
    { id: 'patients', name: 'Patients', long: 'Patient leads', icon: 'patients' },
    { id: 'calendar', name: 'Calendar', icon: 'calendar' },
    { id: 'pipeline', name: 'Pipeline', icon: 'pipeline' },
    { id: 'events', name: 'Events', long: 'Events & education', icon: 'events' },
    { id: 'sources', name: 'ROI', long: 'Sources & ROI', icon: 'sources' },
    { id: 'setup', name: 'Settings', icon: 'settings' },
  ];
  $('[data-nav]').innerHTML = PAGES.map((p) => `<a href="#${p.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[p.icon]}</svg><span>${esc(p.name)}${p.long ? `<span class="sr lbl-long"> (${esc(p.long)})</span>` : ''}</span></a>`).join('');

  function toast(msg) { const t = $('[data-toast]'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200); }
  const fail = (err, what) => { console.warn(what, err); toast(`Couldn't ${what}. Check your connection and try again.`); };
  function withState(items, empty, render) {
    if (ui.state === 'loading') return '<div aria-busy="true" aria-label="Loading">' + '<div class="skel"></div>'.repeat(4) + '</div>';
    if (ui.state === 'error') return `<div class="state" role="alert"><p>We couldn't load this. Check your connection, then try again.</p><button class="btn" data-act="retry">Try again</button></div>`;
    if (ui.state === 'empty' || !items.length) return `<div class="state"><p>${esc(empty.msg)}</p>${empty.btn ? `<button class="btn primary" data-act="${empty.act}">${esc(empty.btn)}</button>` : ''}</div>`;
    return render(items);
  }
  const statusChip = (s) => `<span class="chip ${{ 'Active referrer': 'success', 'Referral made': 'accent', 'Meeting scheduled': 'info', 'Sent materials': 'warning', 'Not a fit': '' }[s] || ''}">${esc(s)}</span>`;
  const actChip = (id) => `<span class="chip"><i class="dot" style="background:${act(id).color}"></i>${esc(act(id).name)}</span>`;
  const dueChip = (p) => !p.next ? '<span class="muted">–</span>' : `<span class="chip ${overdue(p) ? 'danger' : days(p.next) === 0 ? 'warning' : ''}">${esc(rel(p.next))}</span>`;
  const monthRows = (rows, empty) => withState(rows, { msg: empty }, (items) => `<table class="cards"><thead><tr><th>Month</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th></tr></thead><tbody>${items.map((r) => `<tr><td>${esc(fmtMonth(r.month, true))}</td><td class="right num" data-label="Leads">${r.leads}</td><td class="right num" data-label="Consults">${r.consults}</td><td class="right num" data-label="Converted">${r.converted}</td></tr>`).join('')}</tbody></table>`);

  /* ---------------- Pages ---------------- */
  const lastTouchDate=(id)=>touchesOf(id)[0]?.date||'';
  function eventInlineDetails(e){
    const result=creditTotals(e.id),contacts=metAtEvent(e.id),association=partner(e.venue);
    const cost=(e.cost||0)+(e.hours||0)*DATA.settings.staffCost;
    const fields=[
      ['When',fmt(e.date,{weekday:'long',month:'long',day:'numeric',year:'numeric'})+(e.startTime?' · '+e.startTime+(e.endTime?'–'+e.endTime:''):'')],
      ['Format',(e.type||'Event')+' · '+(e.format||'In-person')],
      ['Host / partner',association?association.contact+' · '+association.org:'Not linked'],
      ['BD activity',act(e.activity).name],
      ['Attendance',(e.attendees||0)+' attended · '+(e.signups||0)+' signups'],
      ['Finance',money(result.revenue)+' revenue · '+money(cost)+' cost'],
      ['Contacts / leads',contacts.length+' professional contacts · '+result.leads+' patient leads']
    ];
    return `<div class="event-accordion-content">
      <div class="event-accordion-details"><dl>${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
        ${e.details?`<p class="event-accordion-notes"><b>Agenda & logistics</b><span>${esc(e.details)}</span></p>`:''}
      </div>
      <div class="event-accordion-linked"><h3>Related people</h3>
        ${association?`<a href="#partner-${esc(association.id)}">${esc(association.contact)} · ${esc(association.org)} ↗</a>`:'<p>No linked host/partner</p>'}
        ${contacts.length?`<div class="event-contact-list">${contacts.map(p=>`<a href="#partner-${esc(p.id)}">${esc(p.contact)} ↗</a>`).join('')}</div>`:'<p>No professional contacts first met here.</p>'}
        <div class="event-accordion-buttons">
          <button type="button" class="btn primary" data-act="edit-event" data-id="${esc(e.id)}">Edit event</button>
          <button type="button" class="btn" data-act="duplicate-event" data-id="${esc(e.id)}">Duplicate</button>
          <a class="btn" href="#event-${esc(e.id)}">Full report ↗</a>
        </div>
      </div>
    </div>`;
  }
  function pipelineFiltered(){
    const rows=DATA.partners.filter(p=>p.status!=='Not a fit'&&
      (!ui.pipelineOwner||p.owner===ui.pipelineOwner)&&(!ui.pipelineActivity||p.activity===ui.pipelineActivity)&&
      (ui.pipelineDue==='all'||(ui.pipelineDue==='none'?!p.next:p.next&&
      (ui.pipelineDue==='overdue'?days(p.next)<0:days(p.next)>=0&&days(p.next)<=7))));
    const date=p=>p.next||'9999-12-31';
    return rows.sort((a,b)=>ui.pipelineSort==='name'?a.contact.localeCompare(b.contact):
      ui.pipelineSort==='recent'?lastTouchDate(b.id).localeCompare(lastTouchDate(a.id)):
      date(a).localeCompare(date(b))||a.contact.localeCompare(b.contact));
  }
  const pages = {
    today() {
      const tm = sum(countsFor((c) => c.month === THIS_MONTH)), lm = sum(countsFor((c) => c.month === LAST_MONTH));
      const all = sum(DATA.counts), cr = all.leads ? all.consults / all.leads : 0;
      const df = sum(countsFor((c) => c.month === THIS_MONTH && c.via === CHANNELS[0]));
      const active = DATA.partners.filter((p) => p.status === 'Active referrer').length;
      const late = DATA.partners.filter(overdue);
      const attention = DATA.partners.filter((p) => p.next && days(p.next) <= 2 && p.status !== 'Not a fit').sort((a, b) => a.next.localeCompare(b.next));
      const src = sourceStats(90).filter((s) => s.leads).sort((a, b) => b.leads - a.leads), max = Math.max(1, ...src.map((s) => s.leads));
      const sc = scorecard(), met = sc.filter(isMet).length;
      const upcoming = DATA.events.filter((e) => days(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
      const delta = tm.leads - lm.leads, soon = attention.length - late.length;
      const who = 'Torus team';
      return `<section class="card welcome today-hero"><div><h1>${greeting()}${who ? ', ' + esc(who) : ''}</h1><p>${late.length ? `${plural(late.length, 'follow-up')} overdue and ${soon} due in the next two days.` : soon ? `No follow-ups are overdue. ${soon} due in the next two days.` : 'No follow-ups are overdue.'} ${met} of ${sc.length} playbook targets are met so far.</p>
          <div class="today-hero-actions"><a class="btn" href="#partners">Open follow-ups</a><button type="button" class="today-quick-add" data-act="add-partner">+ Partner</button><span class="page-theme-slot" data-theme-slot></span></div></div>${torusSvg()}</section>
        
        <div class="today-workspace"><section class="card today-focus"><div class="card-head"><h2>Needs attention</h2><a href="#partners">All partners</a></div>
            <div class="rows">${withState(attention, { msg: DATA.partners.length ? 'Nothing is due in the next two days.' : 'No referral partners yet. Add the first one.', btn: 'Add a partner', act: 'add-partner' }, (items) => items.slice(0, 4).map((p) => `<a class="row" href="#partner-${esc(p.id)}"><span><span class="row-title">${esc(p.nextStep || 'Follow up')}</span><small>${esc(p.contact)} · ${esc(p.org)}${p.owner ? ' · ' + esc(p.owner) : ''}</small></span>${dueChip(p)}</a>`).join(''))}</div></section>
          ${miniCalendar(upcoming)}</div>
        <section class="kpis today-kpis" aria-label="Key numbers">
          ${kpi('New patient leads, this month', tm.leads, `${delta >= 0 ? '+' : ''}${delta} vs. ${fmtMonth(LAST_MONTH)}`, delta >= 0 ? 'good' : 'bad')}
          ${kpi('Lead → consult rate', all.leads ? pct(cr) : '–', !all.leads ? 'No leads recorded yet' : cr >= 0.4 ? 'At or above the 40% target' : 'Below the 40% target', all.leads ? (cr >= 0.4 ? 'good' : 'bad') : '')}
          ${kpi('Active referrers', active, `of ${DATA.partners.filter((p) => p.status !== 'Not a fit').length} partners in play`)}
          ${kpi('Follow-ups overdue', late.length, late.length ? 'Clear these first' : 'All caught up', late.length ? 'bad' : 'good')}
          ${kpi('Discovery form, this month', df.leads, `${df.consults} became consults`)}
        </section>
        
        <div class="bento today-insights"><section class="card span-6 today-insight"><div class="card-head"><h2>Where new patients came from</h2><span class="muted">Last 3 months · leads</span></div>
            ${withState(src, { msg: 'No patient leads recorded in the last 3 months. Import the IntakeQ export on the Patients page.', btn: 'Import IntakeQ export', act: 'import' }, (items) => `<div class="bars" role="list">${items.map((s) => `<div class="bar-row" role="listitem"><span>${esc(s.name)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${(s.leads / max) * 100}%;background:var(--chart-1)"></div></div><span class="num">${s.leads} <span class="muted">· ${s.conv} converted</span></span></div>`).join('')}</div>`)}</section>
          <section class="card span-6 today-insight"><div class="card-head"><h2>Playbook scorecard</h2><a href="#sources">Sources & ROI</a></div>${withState(sc, { msg: 'Set the opening date in Settings to start the scorecard.' }, (items) => items.slice(0, 6).map(scoreRow).join('') + `<p class="muted" style="margin-top:var(--space-3)">Counting from opening on ${esc(fmt(DATA.settings.openDate, { month: 'long', day: 'numeric', year: 'numeric' }))}. <a href="#sources">See all ${items.length}</a></p>`)}</section>
          </div>`;
    },

    partners() {
      const q = ui.q.toLowerCase();
      const key = { contact: (p) => p.contact, org: (p) => p.org, status: (p) => STAGES.indexOf(p.status), next: (p) => p.next || '9999', referred: (p) => creditTotals(p.id).leads, last: (p) => lastReferral(p.id) };
      const rows = DATA.partners.filter((p) => [p.contact, p.org, p.spec, p.city].join(' ').toLowerCase().includes(q) && (!ui.status || p.status === ui.status) && (!ui.activity || p.activity === ui.activity))
        .sort((a, b) => (key[ui.sort](a) > key[ui.sort](b) ? 1 : -1) * ui.dir);
      const th = (k, label, cls = '') => `<th class="${cls}" aria-sort="${ui.sort === k ? (ui.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button data-sort="${k}">${label}</button></th>`;
      const filtered = ui.q || ui.status || ui.activity;
      return `<div class="toolbar"><input class="field search" type="search" placeholder="Search name, practice, specialty, city" aria-label="Search partners" value="${esc(ui.q)}" data-q>
          <select class="field" aria-label="Filter by status" data-filter="status"><option value="">All statuses</option>${opts(ALL_STATUS, ui.status)}</select>
          <select class="field" aria-label="Filter by BD activity" data-filter="activity"><option value="">All activities</option>${opts(ACTIVITIES.slice(0, 5).map((a) => [a.id, a.long]), ui.activity)}</select></div>
        <div class="card table-wrap">${withState(rows, { msg: filtered ? 'No partners match these filters. Clear them to see everyone.' : 'No referral partners yet. Add the first one from the playbook.', btn: filtered ? 'Clear filters' : 'Add a partner', act: filtered ? 'clear' : 'add-partner' },
          (items) => `<table class="cards"><thead><tr>${th('contact', 'Partner')}${th('org', 'Practice / organization')}<th>Activity</th>${th('status', 'Status')}${th('next', 'Next follow-up')}${th('referred', 'Referred', 'right')}${th('last', 'Last referral')}</tr></thead><tbody>
          ${items.map((p) => { const lr = lastReferral(p.id); return `<tr data-href="#partner-${esc(p.id)}" tabindex="0"><td><a class="person" href="#partner-${esc(p.id)}" tabindex="-1" style="text-decoration:none;color:inherit"><b>${esc(p.contact)}</b><small>${esc(p.spec)}</small></a></td><td data-label="Practice">${esc(p.org)}<br><small class="muted">${esc(p.city)}</small></td><td>${actChip(p.activity)}</td><td>${statusChip(p.status)}</td><td data-label="Next">${dueChip(p)}</td><td class="right num" data-label="Referred">${creditTotals(p.id).leads}</td><td data-label="Last referral">${lr ? esc(fmtMonth(lr)) : '<span class="muted">–</span>'}</td></tr>`; }).join('')}</tbody></table>`)}</div>
        <p class="muted">${rows.length} of ${DATA.partners.length} partners</p>`;
    },

    partner(id) {
      const p = partner(id);
      if (!p) return `<div class="card state"><p>That partner isn't in the list. It may have been removed.</p><a class="btn" href="#partners">Back to partners</a></div>`;
      const t = touchesOf(id), tot = creditTotals(id), lr = lastReferral(id);
      return `<div class="bento">
        <section class="card span-8"><div class="detail-head"><div><div class="top-actions">${statusChip(p.status)}${actChip(p.activity)}<span class="chip">${esc(p.type)}</span></div>
          <dl class="facts"><div><dt>Practice</dt><dd>${esc(p.org)}</dd></div><div><dt>Specialty</dt><dd>${esc(p.spec || '–')}</dd></div><div><dt>City</dt><dd>${esc(p.city || '–')}</dd></div><div><dt>Phone</dt><dd class="num">${esc(p.phone || '–')}</dd></div><div><dt>Owner</dt><dd>${esc(p.owner || '–')}</dd></div><div><dt>Patients referred</dt><dd class="num">${tot.leads} · ${tot.converted} converted</dd></div><div><dt>Last referral</dt><dd>${lr ? esc(fmtMonth(lr, true)) : 'None yet'}</dd></div>${p.metAt ? `<div><dt>First met at</dt><dd><a href="#event-${esc(p.metAt)}">${esc(eventById(p.metAt)?.name || p.metAt)}</a></dd></div>` : ''}</dl></div></div>
          <label class="field-label" style="margin-top:var(--space-5);max-width:320px">Move to stage<select class="field" data-move="${esc(p.id)}">${opts(ALL_STATUS, p.status)}</select></label></section>
        <section class="card next span-4"><h2>Next step</h2><p style="margin:var(--space-2) 0 var(--space-3)">${esc(p.nextStep || 'No next step set')}</p>${dueChip(p)}
          <div class="top-actions" style="margin-top:var(--space-4)"><button class="btn primary" data-act="log" data-id="${esc(p.id)}">Log a touch</button></div></section>
        <section class="card span-7"><div class="card-head"><h2>Touch history</h2><span class="muted">${plural(t.length, 'touch').replace('touchs', 'touches')}</span></div>
          ${withState(t, { msg: 'No touches logged yet. Log the first outreach.', btn: 'Log a touch', act: 'log' }, (items) => `<ol class="timeline">${items.map((x) => `<li><time datetime="${esc(x.date)}">${esc(fmt(x.date))}</time><div><b>${esc(x.outcome)}</b> <span class="muted">· ${esc(x.method)} by ${esc(x.by)}</span><br>${esc(x.note)}</div></li>`).join('')}</ol>`)}</section>
        <section class="card span-5 table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>Patients referred</h2><span class="muted">Monthly counts</span></div>
          ${monthRows(byMonth(countsFor((c) => c.credit === id)), 'No referrals credited to this partner yet.')}</section>
      </div>`;
    },

    patients() {
      const r = ui.prange, rows = countsFor((c) => monthInRange(c.month, r));
      const df = sum(countsFor((c) => c.via === CHANNELS[0])), dfm = sum(countsFor((c) => c.via === CHANNELS[0] && c.month === THIS_MONTH));
      const allm = sum(countsFor((c) => c.month === THIS_MONTH)), all = sum(DATA.counts);
      const ch = CHANNELS.map((c) => ({ c, ...sum(rows.filter((x) => x.via === c)) }));
      const detail = rows.filter((c) => (!ui.via || c.via === ui.via) && (!ui.pact || creditActivity(c.credit) === ui.pact)).sort((a, b) => b.month.localeCompare(a.month) || b.leads - a.leads);
      const seg = `<div class="seg" role="group" aria-label="Time range">${[[1, 'This month'], [92, 'Last 3 months'], ['all', 'All time']].map(([v, l]) => `<button data-prange="${v}" aria-pressed="${String(ui.prange) === String(v)}">${l}</button>`).join('')}</div>`;
      const filtered = ui.via || ui.pact;
      return `<section class="kpis" aria-label="Discovery form">${kpi('Discovery form, this month', dfm.leads, `${dfm.consults} became consults`)}${kpi('Discovery form, all time', df.leads, all.leads ? `${pct(df.leads / all.leads)} of all patient leads` : 'No leads yet')}${kpi('Discovery → consult', df.leads ? pct(df.consults / df.leads) : '–', plural(df.consults, 'consult') + ' booked')}${kpi('All patient leads, this month', allm.leads, `${all.leads} all time`)}${kpi('Converted to a package', all.converted, money(all.revenue) + ' revenue')}</section>
        ${ui.demoInfo ? (ui.demoInfo.error ? `<div class="card" role="alert"><p>Couldn't read ${esc(ui.demoInfo.file)}. Showing sample counts instead.</p></div>` : `<div class="card next"><h2>Loaded from ${esc(ui.demoInfo.file)}</h2><p style="margin-top:var(--space-1)">${plural(ui.demoInfo.patients, 'patient')} → ${plural(ui.demoInfo.rows, 'row')} of monthly counts, ${esc(fmtMonth(ui.demoInfo.months[0]))} to ${esc(fmtMonth(ui.demoInfo.months.at(-1)))}.${ui.demoInfo.unmatched ? ` ${plural(ui.demoInfo.unmatched, 'referrer')} didn't match a partner or event and count as uncredited.` : ''} Same import the team will use each week.${ui.demoInfo.note ? ' ' + esc(ui.demoInfo.note) : ''}</p></div>`) : ''}
        <div class="toolbar">${seg}<span class="muted">Counts only. Patient details stay in IntakeQ.</span></div>
        <section class="card table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>How patients came in</h2><span class="muted">The source columns say what drove them</span></div>
          ${withState(ch.filter((x) => x.leads), { msg: 'No patient leads recorded for this period. Import the IntakeQ export or add counts.', btn: 'Import IntakeQ export', act: 'import' }, (items) => `<table class="cards"><thead><tr><th>Came in via</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th><th class="right">Lead → consult</th></tr></thead><tbody>${items.map((x) => `<tr><td>${x.c === CHANNELS[0] ? `<b>${esc(x.c)}</b>` : esc(x.c)}</td><td class="right num" data-label="Leads">${x.leads}</td><td class="right num" data-label="Consults">${x.consults}</td><td class="right num" data-label="Converted">${x.converted}</td><td class="right num" data-label="Lead → consult">${x.leads ? pct(x.consults / x.leads) : '–'}</td></tr>`).join('')}</tbody></table>`)}</section>
        <section class="card table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>By month</h2></div>${monthRows(byMonth(rows), 'No months recorded yet.')}</section>
        <div class="toolbar"><select class="field" aria-label="Filter by how they came in" data-filter="via"><option value="">Every channel</option>${opts(CHANNELS, ui.via)}</select>
          <select class="field" aria-label="Filter by activity" data-filter="pact"><option value="">Every activity</option>${opts(ACTIVITIES.map((x) => [x.id, x.long]), ui.pact)}</select></div>
        <div class="card table-wrap">${withState(detail, { msg: filtered ? 'No counts match these filters.' : 'No patient leads yet. Import the IntakeQ export or add counts by hand.', btn: filtered ? 'Clear filters' : 'Add counts', act: filtered ? 'clear' : 'add-counts' }, (items) => `<table class="cards"><thead><tr><th>Month</th><th>Came in via</th><th>Source</th><th>Credited to</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th><th class="right">Revenue</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
          ${items.map((c) => `<tr><td>${esc(fmtMonth(c.month))}</td><td data-label="Came in via">${esc(c.via)}</td><td data-label="Source">${esc(c.source)}</td><td data-label="Credited to">${creditLink(c.credit)}</td><td class="right num" data-label="Leads">${c.leads}</td><td class="right num" data-label="Consults">${c.consults}</td><td class="right num" data-label="Converted">${c.converted}</td><td class="right num" data-label="Revenue">${money(c.revenue)}</td><td class="right"><button class="btn small" data-act="edit-counts" data-id="${esc(c.id)}">Edit</button></td></tr>`).join('')}</tbody></table>`)}</div>`;
    },

    pipeline() {
      const visible=window.innerWidth<760?1:window.innerWidth<1190?2:3;
      const pages=Math.ceil(STAGES.length/visible);
      ui.pipelinePage=Math.max(0,Math.min(pages-1,ui.pipelinePage||0));
      const filtered=pipelineFiltered(),ids=new Set(filtered.map(p=>p.id));
      const start=ui.pipelinePage*visible,stages=STAGES.slice(start,start+visible);
      const owners=[...new Set(DATA.partners.map(p=>p.owner).filter(Boolean))].sort();
      const selected=[...ui.pipelineSelected].filter(id=>ids.has(id));
      const groups=STAGES.map((stage,i)=>`<button type="button" class="pipeline-stage-tab" data-pipeline-jump="${i}" aria-pressed="${i>=start&&i<start+visible}"><span>${esc(stage)}</span><b>${filtered.filter(p=>p.status===stage).length}</b></button>`).join('');
      const stat=(label,n)=>`<div><small>${label}</small><strong>${n}</strong></div>`;
      return `<section class="pipeline-overview" aria-label="Pipeline overview">
        ${stat('Relationships in view',filtered.length)}
        ${stat('Overdue follow-ups',filtered.filter(overdue).length)}
        ${stat('Due next 7 days',filtered.filter(p=>p.next&&days(p.next)>=0&&days(p.next)<=7).length)}
        ${stat('Active referrers',filtered.filter(p=>p.status==='Active referrer').length)}
      </section>
      <div class="pipeline-toolbar">
        <label>Owner<select data-pipe-filter="owner"><option value="">All owners</option>${opts(owners,ui.pipelineOwner)}</select></label>
        <label>Activity<select data-pipe-filter="activity"><option value="">All activities</option>${opts(ACTIVITIES.map(a=>[a.id,a.name]),ui.pipelineActivity)}</select></label>
        <label>Follow-up<select data-pipe-filter="due">${opts([['all','Every date'],['overdue','Overdue'],['week','Next 7 days'],['none','No date']],ui.pipelineDue)}</select></label>
        <label>Sort<select data-pipe-filter="sort">${opts([['due','Follow-up date'],['name','Name A–Z'],['recent','Last touch']],ui.pipelineSort)}</select></label>
        <button type="button" class="pipeline-clear" data-pipeline-clear>Reset filters</button>
      </div>
      <div class="pipeline-bulk">
        <label class="pipeline-selectall"><input type="checkbox" data-pipe-all ${filtered.length&&filtered.every(p=>ui.pipelineSelected.has(p.id))?'checked':''}> Select visible ${filtered.length}</label>
        <span>${selected.length} selected</span>
        <select aria-label="Bulk move stage" data-pipe-bulk-stage><option value="">Move selected to…</option>${opts(ALL_STATUS)}</select>
        <select aria-label="Bulk assign owner" data-pipe-bulk-owner><option value="">Assign owner…</option>${opts(owners)}</select>
      </div>
      <div class="pipeline-intro"><p>Filter relationships, log touches and schedule follow-ups. Every change uses the existing partner record.</p>
        <div class="pipeline-controls"><small>Stages ${start+1}–${start+stages.length} of ${STAGES.length}</small>
          <button type="button" data-pipeline-page="-1" aria-label="Previous pipeline stages" ${ui.pipelinePage===0?'disabled':''}>‹</button>
          <button type="button" data-pipeline-page="1" aria-label="Next pipeline stages" ${ui.pipelinePage===pages-1?'disabled':''}>›</button>
        </div></div>
      <div class="pipeline-stage-tabs" role="group" aria-label="Jump to pipeline stage">${groups}</div>
      <div class="board pipeline-board" style="--stage-visible:${visible}" data-board aria-label="Relationship pipeline stages" tabindex="0">
        ${stages.map(stage=>{
          const items=filtered.filter(p=>p.status===stage);
          return `<section class="col" data-col="${esc(stage)}" aria-label="${esc(stage)}">
            <h2><span>${esc(stage)}</span><span class="num">${items.length}</span></h2>
            ${items.map(p=>`<article class="tile pipeline-tile" draggable="true" data-drag="${esc(p.id)}">
              <div class="pipeline-tile-top"><label title="Select ${esc(p.contact)}"><input type="checkbox" data-pipe-select="${esc(p.id)}" ${ui.pipelineSelected.has(p.id)?'checked':''} aria-label="Select ${esc(p.contact)}"></label><a href="#partner-${esc(p.id)}">${esc(p.contact)}</a></div>
              <small>${esc(p.org)}</small><div class="top-actions">${actChip(p.activity)}${p.next?dueChip(p):'<span class="chip">No follow-up</span>'}</div>
              <div class="pipeline-card-meta"><span>Owner <b>${esc(p.owner||'Torus team')}</b></span><span>Last touch <b>${lastTouchDate(p.id)?esc(fmt(lastTouchDate(p.id))):'–'}</b></span></div>
              ${p.nextStep?`<p class="pipeline-step">${esc(p.nextStep)}</p>`:''}
              <div class="pipeline-card-actions"><button data-act="log" data-id="${esc(p.id)}">Log touch</button><button data-act="edit-partner" data-id="${esc(p.id)}">Edit / schedule</button></div>
              <label class="field-label">Move to<select class="field" data-move="${esc(p.id)}">${opts(ALL_STATUS,stage)}</select></label>
            </article>`).join('')||'<p class="pipeline-empty">No matching relationships.</p>'}
          </section>`;
        }).join('')}
      </div>`;
    },

    events() {
      const rows=[...DATA.events].sort((a,b)=>b.date.localeCompare(a.date));
      return `<div class="card table-wrap event-register">${withState(rows,
        {msg:'No events yet. Plan the first community event or lunch-and-learn.',btn:'Plan an event',act:'add-event'},
        items=>`<table class="cards event-register-table"><thead><tr>
          <th>Event</th><th>Date</th><th>Activity</th><th class="right">Attendees</th>
          <th class="right">Signup rate</th><th class="right">Contacts made</th><th class="right">Patient leads</th><th class="right">Revenue</th>
        </tr></thead><tbody>${items.map(e=>{
          const totals=creditTotals(e.id),past=days(e.date)<=0,opened=ui.eventOpen===e.id;
          return `<tr class="event-row${opened?' is-open':''}" data-event-row="${esc(e.id)}" data-event-toggle="${esc(e.id)}">
            <td><button class="event-row-toggle" type="button" data-event-toggle="${esc(e.id)}" aria-expanded="${opened}" aria-controls="event-detail-${esc(e.id)}">
              <span class="event-row-chevron" aria-hidden="true">⌄</span><span><strong>${esc(e.name)}</strong><small>${esc(e.type||'')} · ${esc(e.format)}${e.venue?' · '+esc(partner(e.venue)?.org):''}</small></span>
            </button></td>
            <td data-label="Date">${past?esc(fmt(e.date)):`<span class="chip info">${esc(rel(e.date))}</span>`}</td>
            <td>${actChip(e.activity)}</td>
            <td class="right num" data-label="Attendees">${past?e.attendees:'–'}</td>
            <td class="right num" data-label="Signup rate">${past&&e.attendees?pct(e.signups/e.attendees):'–'}</td>
            <td class="right num" data-label="Contacts made">${metAtEvent(e.id).length}</td>
            <td class="right num" data-label="Patient leads">${totals.leads}</td>
            <td class="right num" data-label="Revenue">${money(totals.revenue)}</td>
          </tr><tr class="event-detail-row" id="event-detail-${esc(e.id)}" ${opened?'':'hidden'}><td colspan="8">${eventInlineDetails(e)}</td></tr>`;
        }).join('')}</tbody></table>`)}</div>`;
    },

    event(id) {
      const e = eventById(id);
      if (!e) return `<div class="card state"><p>That event isn't in the list.</p><a class="btn" href="#events">Back to events</a></div>`;
      const t = creditTotals(id), past = days(e.date) <= 0, met = metAtEvent(id);
      const spend = e.cost + e.hours * DATA.settings.staffCost;
      const target = e.activity === 'A4' && past ? (e.attendees >= 10 && e.signups / (e.attendees || 1) >= 0.2 ? '<span class="chip success">Met the event targets</span>' : '<span class="chip warning">Below the event targets</span>') : '';
      return `<section class="kpis" aria-label="Event results">${kpi('Attendees', past ? e.attendees : '–', past ? 'Target 10+' : 'Not held yet')}${kpi('Waitlist signups', past ? e.signups : '–', past && e.attendees ? pct(e.signups / e.attendees) + ' of attendees' : '')}${kpi('Professional contacts', met.length, 'first met here')}${kpi('Patient leads', t.leads, `${plural(t.consults, 'consult')} · ${t.converted} converted`)}${kpi('Revenue vs. cost', money(t.revenue), `${money(spend)} spent${spend ? ' · ' + (t.revenue / spend).toFixed(1) + '× return' : ''}`)}</section>
        <div class="bento"><section class="card span-7"><div class="card-head"><h2>Details</h2>${target}</div><dl class="facts"><div><dt>Type</dt><dd>${esc(e.type || '–')}</dd></div><div><dt>Date</dt><dd>${esc(fmt(e.date, { weekday: 'long', month: 'long', day: 'numeric' }))}</dd></div><div><dt>Format</dt><dd>${esc(e.format)}</dd></div><div><dt>Venue</dt><dd>${e.venue ? `<a href="#partner-${esc(e.venue)}">${esc(partner(e.venue)?.org)}</a>` : 'Torus / online'}</dd></div><div><dt>Activity</dt><dd>${actChip(e.activity)}</dd></div></dl>
          <div class="top-actions" style="margin-top:var(--space-5)"><button class="btn" data-act="edit-event" data-id="${esc(e.id)}">Update results</button></div></section>
        <section class="card span-5"><div class="card-head"><h2>Professional contacts made</h2><span class="muted">${met.length}</span></div><div class="rows">${withState(met, { msg: past ? 'No provider contacts linked to this event. Set "First met at" on a partner to link one.' : 'Contacts appear here after the event.' }, (items) => items.map((p) => `<a class="row" href="#partner-${esc(p.id)}"><span><span class="row-title">${esc(p.contact)}</span><small>${esc(p.org)}</small></span>${statusChip(p.status)}</a>`).join(''))}</div></section>
        <section class="card span-12 table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>Patient leads from this event</h2><span class="muted">Monthly counts</span></div>${monthRows(byMonth(countsFor((c) => c.credit === id)), past ? 'No patient leads credited to this event yet.' : 'Leads appear here after the event.')}</section></div>`;
    },

    sources() {
      const r = ui.range, roi = activityRoi(r), src = sourceStats(r), maxRev = Math.max(1, ...roi.map((a) => Math.max(a.revenue, a.spend))), sc = scorecard();
      const revenueTotal=roi.reduce((sum,x)=>sum+x.revenue,0),costTotal=roi.reduce((sum,x)=>sum+x.spend,0);
      const seg = `<div class="seg" role="group" aria-label="Time range">${[[30, '30 days'], [90, '90 days'], ['all', 'All time']].map(([v, l]) => `<button data-range="${v}" aria-pressed="${String(ui.range) === String(v)}">${l}</button>`).join('')}</div>`;
      return `<div class="toolbar">${seg}<span class="muted">Leads count by month. Revenue counts packages only; Spravato is billed to insurance and shows $0.</span></div>
        <div class="bento roi-overview">
        <section class="card span-7 roi-revenue"><div class="card-head"><h2>Revenue vs. cost by BD activity</h2></div>
          <div class="roi-summary"><div><small>Revenue</small><strong>${money(revenueTotal)}</strong></div><div><small>Cash + staff time</small><strong>${money(costTotal)}</strong></div><div><small>Return</small><strong>${costTotal?(revenueTotal/costTotal).toFixed(1)+'×':'—'}</strong></div></div><div class="bars">${roi.map((a) => `<div class="bar-row wide"><span><i class="dot" style="background:${a.color}"></i> ${esc(a.name)}</span><div><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${(a.revenue / maxRev) * 100}%;background:${a.color}"></div></div><div class="bar-track" aria-hidden="true" style="height:6px;margin-top:4px"><div class="bar-fill" style="width:${(a.spend / maxRev) * 100}%;background:var(--border-strong)"></div></div></div><span class="num">${money(a.revenue)} <span class="muted">/ ${money(a.spend)}</span></span></div>`).join('')}</div><div class="legend"><span><i class="dot" style="background:var(--chart-1)"></i>Revenue (thick)</span><span><i class="dot" style="background:var(--border-strong)"></i>Cost: cash + hours × ${money(DATA.settings.staffCost)}/hr (thin)</span></div></section>
        <section class="card span-5 roi-scorecard"><div class="card-head"><h2>Playbook scorecard</h2><span class="muted">${sc.filter(isMet).length} of ${sc.length} met</span></div>
          ${sc.slice(0,5).map(scoreRow).join('')}
          ${sc.length>5?`<details class="roi-more"><summary>View ${sc.length-5} more milestones</summary><div>${sc.slice(5).map(scoreRow).join('')}</div></details>`:''}</section>
        <section class="card span-12 table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>By BD activity</h2></div><table class="cards"><thead><tr><th>Activity</th><th class="right">Partners</th><th class="right">Active</th><th class="right">Touches</th><th class="right">Events</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th><th class="right">Revenue ÷ cost</th></tr></thead><tbody>${roi.map((a) => `<tr><td><i class="dot" style="background:${a.color}"></i> ${esc(a.long)}</td><td class="right num" data-label="Partners">${a.partners}</td><td class="right num" data-label="Active">${a.active}</td><td class="right num" data-label="Touches">${a.touches}</td><td class="right num" data-label="Events">${a.events}</td><td class="right num" data-label="Leads">${a.leads}</td><td class="right num" data-label="Consults">${a.consults}</td><td class="right num" data-label="Converted">${a.conv}</td><td class="right num" data-label="Return">${a.spend ? (a.revenue / a.spend).toFixed(1).replace(/\.0$/, '') + '×' : '–'}</td></tr>`).join('')}</tbody></table></section>
        <section class="card span-12 table-wrap" style="padding:0"><div class="card-head" style="padding:var(--space-5) var(--space-5) 0"><h2>By referral source</h2><span class="muted">Matches the IntakeQ "How did you hear about us?" field</span></div><table class="cards"><thead><tr><th>Source</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th><th class="right">Conversion</th><th class="right">Revenue</th></tr></thead><tbody>${src.map((s) => `<tr><td>${esc(s.name)}</td><td class="right num" data-label="Leads">${s.leads}</td><td class="right num" data-label="Consults">${s.consults}</td><td class="right num" data-label="Converted">${s.conv}</td><td class="right num" data-label="Conversion">${s.leads ? pct(s.conv / s.leads) : '–'}</td><td class="right num" data-label="Revenue">${money(s.revenue)}</td></tr>`).join('')}</tbody></table></section>
        </div>`;
    },


    calendar() {
      const m=ui.month, selected=ui.calSelected||iso(TODAY);
      const mode=ui.calMode||'month', filter=ui.calFilter||'all';
      const items=calendarItems().filter(x=>filter==='all'||(filter==='events'?x.kind==='event':x.kind==='follow'));
      const inMonth=x=>parse(x.date).getMonth()===m.getMonth()&&parse(x.date).getFullYear()===m.getFullYear();
      const monthItems=items.filter(inMonth).sort((a,b)=>a.date.localeCompare(b.date));
      const dayItems=items.filter(x=>x.date===selected);
      const selectedRecord=dayItems.find(x=>(x.kind+':'+x.id)===ui.calRecord)||null;
      const start=new Date(m.getFullYear(),m.getMonth(),1);
      start.setDate(1-((start.getDay()+(PREFS.weekStart==='monday'?6:0))%7));
      const weekStart=parse(selected);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+(PREFS.weekStart==='monday'?6:0))%7));
      const origin=mode==='week'?weekStart:start;
      const cells=Array.from({length:mode==='week'?7:42},(_,i)=>{
        const dt=new Date(origin.getFullYear(),origin.getMonth(),origin.getDate()+i),key=iso(dt);
        return {dt,key,items:items.filter(x=>x.date===key)};
      });
      const title=m.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      const formatRow=x=>`<div class="cal-entry"><i class="cal-entry-icon ${x.kind}"></i>
        <div class="cal-entry-copy"><button type="button" class="cal-entry-link" data-cal-open="${x.kind+":"+x.id}" data-cal-date="${x.date}">${esc(x.label)}</button><small>${esc(x.sub)}</small></div>
        <button type="button" class="cal-entry-edit" data-act="${x.kind==='event'?'edit-event':'edit-partner'}" data-id="${esc(x.id)}" aria-label="Edit ${esc(x.label)}">Edit</button>
      </div>`;
      const renderCell=c=>`<div role="gridcell" data-cal-cell="${c.key}" class="cal-cell${c.dt.getMonth()!==m.getMonth()?' is-outside':''}${c.key===iso(TODAY)?' is-today':''}${c.key===selected?' is-selected':''}" aria-selected="${c.key===selected}">
        <button class="cal-date" type="button" data-cal-day="${c.key}" aria-label="Select ${esc(c.dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}))}, ${c.items.length} scheduled"><span>${c.dt.getDate()}</span><small>${c.items.length||''}</small></button>
        <div class="cal-items">${c.items.slice(0,mode==='week'?6:3).map(x=>`<button type="button" class="cal-chip ${x.kind}${x.late?' late':''}" data-cal-open="${x.kind+":"+x.id}" data-cal-date="${x.date}" title="${esc(x.label)} — ${esc(x.sub)}"><i></i><span>${esc(x.label)}</span></button>`).join('')}${c.items.length>(mode==='week'?6:3)?`<button type="button" class="cal-more" data-cal-day="${c.key}">+${c.items.length-(mode==='week'?6:3)} more</button>`:''}</div>
        <div class="cal-mobile-dots">${c.items.slice(0,4).map(x=>`<i class="${x.kind}"></i>`).join('')}</div>
      </div>`;
      const titleDate=fmt(selected,{weekday:'long',month:'long',day:'numeric'});
      const list=mode==='agenda'
        ? `<div class="cal-list">${monthItems.length?monthItems.map(x=>`<div class="cal-list-row"><time datetime="${x.date}">${esc(fmt(x.date,{weekday:'short',month:'short',day:'numeric'}))}</time>${formatRow(x)}</div>`).join(''):'<p class="cal-empty">No items scheduled this month.</p>'}</div>`
        : `<div class="cal-grid ${mode==='week'?'cal-week-view':''}" role="grid" aria-label="${esc(title)}">
          ${(PREFS.weekStart==='monday'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']).map(x=>`<div class="cal-weekday" role="columnheader">${x}</div>`).join('')}${cells.map(renderCell).join('')}</div>`;
      return `<section class="calendar-suite" aria-label="Torus calendar">
        <div class="cal-header">
          <div><span class="cal-eyebrow">Calendar · Cycles &amp; connections</span><h1>${esc(title)}</h1><p>${monthItems.length} scheduled · ${monthItems.filter(x=>x.kind==='follow').length} follow-ups · ${monthItems.filter(x=>x.kind==='event').length} events</p></div>
          <div class="cal-header-actions">
            <div class="cal-month-nav" role="group" aria-label="Return to current month"><button type="button" data-month="0">Today</button></div>
            <button type="button" class="btn primary" data-act="calendar-add-event">+ New event</button><span class="page-theme-slot" data-theme-slot></span>
          </div>
        </div>
        <div class="cal-tools">
          <div class="cal-seg" role="group" aria-label="Calendar view">${[['month','Month'],['week','Week'],['agenda','Agenda']].map(([v,l])=>`<button type="button" data-cal-mode="${v}" aria-pressed="${mode===v}">${l}</button>`).join('')}</div>
          <div class="cal-seg" role="group" aria-label="Calendar filters">${[['all','All'],['follow','Follow-ups'],['events','Events']].map(([v,l])=>`<button type="button" data-cal-filter="${v}" aria-pressed="${filter===v}">${l}</button>`).join('')}</div>
          <button type="button" class="cal-export" data-act="calendar-export">Export to Sheets · CSV ↗</button>
        </div>
        <div class="cal-layout">
          <div class="cal-month-panel">
            <div class="cal-period-bar" role="group" aria-label="Navigate calendar months">
              <button type="button" data-month="-1" aria-label="Previous calendar month">‹ <span>Previous month</span></button>
              <strong aria-live="polite">${esc(title)}</strong>
              <button type="button" data-month="1" aria-label="Next calendar month"><span>Next month</span> ›</button>
            </div>${list}</div>
          <aside class="cal-day-panel"><span class="cal-eyebrow">Day agenda</span><h3>${esc(titleDate)}</h3><p>${dayItems.length} scheduled</p>
            <div class="cal-day-list" aria-live="polite">${calendarAgendaMarkup(selected)}</div>
            <button type="button" class="cal-add-day" data-act="calendar-add-event">+ Add event on this day</button>
          </aside>
        </div>
        <p class="cal-sync">${LIVE?'Live · changes save to Torus Supabase and update across signed-in screens.':'Demo · fictional sample data; edits are temporary.'} Download CSV for Google Sheets; two-way Sheets synchronization is not connected.</p>
      </section>`;
    },

    setup() {
      const isAdmin = !LIVE || me?.role === 'admin';
      return `<div class="settings-shell">
        <div class="settings-page-intro"><div><span class="settings-eyebrow">Torus · Operations</span><h1>Workspace settings</h1><p>Configure your practice, review team access, and tune your personal workspace.</p></div><div class="settings-page-controls"><span class="settings-status">${LIVE?'Team-connected':'Demo workspace'}</span><span class="page-theme-slot" data-theme-slot></span></div></div>
        <div class="settings-columns">
          <div class="settings-column">
            <section class="card span-6 settings-card settings-practice"><h2>Practice settings</h2><p class="muted" style="margin:var(--space-1) 0 var(--space-4)">These drive the playbook's 30/60/90-day targets and the cost side of the return figures.</p>
          <form class="grid" data-form="settings" novalidate>
            <label class="field-label">Practice opening date<input class="field" type="date" name="openDate" value="${esc(DATA.settings.openDate)}" required></label>
            <label class="field-label">Staff time cost (dollars per hour)<input class="field" type="number" min="0" step="5" name="staffCost" value="${DATA.settings.staffCost}" required aria-describedby="err-staffCost"><span class="err" id="err-staffCost" role="alert"></span></label>
            <div><button class="btn primary">Save settings</button></div></form></section>
            <section class="card settings-card settings-preferences">
 <div class="settings-section-head"><span class="settings-eyebrow">Personal workspace</span><h2>Calendar & display preferences</h2></div>
 <p class="muted">Saved on this browser only. Each control changes how this dashboard behaves.</p>
 <div class="settings-control-list">
   <label class="field-label">First day of calendar week<select class="field" data-pref="weekStart">${opts([['sunday','Sunday'],['monday','Monday']],PREFS.weekStart)}</select></label>
   <label class="field-label">Default calendar layout<select class="field" data-pref="defaultView">${opts([['month','Month'],['week','Week'],['agenda','Agenda']],PREFS.defaultView)}</select></label>
   <label class="field-label">Information density<select class="field" data-pref="density">${opts([['comfortable','Comfortable'],['compact','Compact']],PREFS.density)}</select></label>
   <label class="field-label">Sacred geometry motion<select class="field" data-pref="motion">${opts([['ambient','Ambient animation'],['reduced','Still until interacted with']],PREFS.motion)}</select></label>
 </div>
 <div class="settings-card-actions"><button class="btn small" type="button" data-act="prefs-reset">Reset display preferences</button><span class="settings-autosave">Changes save automatically on this browser</span></div>
</section>
            <section class="card span-6 settings-card settings-lists"><h2>Dropdown lists</h2><p class="muted" style="margin:var(--space-1) 0 var(--space-4)">Same wording as the playbook and the IntakeQ form. Keep the referral sources identical to the form.</p>
          <div class="settings-lists-stack">
          ${settingsList('Pipeline stages',STAGES)}
          ${settingsList('Referral sources',SOURCES)}
          ${settingsList('Came in via',CHANNELS)}
          ${settingsList('Packages (illustrative)',Object.entries(PACKAGES).filter(([k])=>k!=='None yet').map(([k,v])=>k+' · '+(v?money(v):'Insurance')))}
          </div></section>
          </div>
          <div class="settings-column">
            <section class="card span-6 settings-card settings-connection"><h2>Data connection</h2>
          ${LIVE ? `<p style="margin:var(--space-2) 0"><span class="chip success">Live</span> Saved to the Torus database. Changes appear on every open screen.</p><p class="muted">Signed in as ${esc(session?.user?.email)}${me ? ` · ${esc(me.role)}` : ''}.</p>`
            : `<p style="margin:var(--space-2) 0"><span class="chip warning">Demo</span> Sample data only. Changes last until you close the page.</p><p class="muted">To go live, add the Supabase URL and anon key to Vercel. The steps are in docs/SETUP.md in the repo.</p>`}
          <p class="muted" style="margin-top:var(--space-3)">Patient leads are stored as monthly counts only. Patient details stay in IntakeQ.</p></section>
            <section class="card span-6 settings-card settings-team"><h2>Team</h2><p class="muted" style="margin:var(--space-1) 0 var(--space-4)">Only these emails can sign in and see Torus data.${isAdmin ? '' : ' Ask an admin to add someone.'}</p>
          <div class="rows">${withState(DATA.team, { msg: LIVE ? 'No team members yet.' : 'The team list appears here once the database is connected.' }, (items) => items.map((m) => `<div class="row" style="cursor:default"><span><span class="row-title">${esc(m.name || m.email)}</span><small>${esc(m.email)} · ${esc(m.role)}</small></span>${isAdmin && LIVE && m.email !== session?.user?.email ? `<button class="btn small" data-act="remove-member" data-id="${esc(m.email)}">Remove ${esc(m.name || m.email)}</button>` : ''}</div>`).join(''))}</div>
          ${LIVE && isAdmin ? `<form class="form-grid" data-form="member" novalidate style="margin-top:var(--space-4)"><label class="field-label">Email<input class="field" type="email" name="email" required aria-describedby="err-email"><span class="err" id="err-email" role="alert"></span></label><label class="field-label">Name<input class="field" name="name"></label><label class="field-label">Role<select class="field" name="role">${opts([['member', 'Member'], ['admin', 'Admin']])}</select></label><div class="full"><button class="btn primary">Add team member</button></div></form>` : ''}</section>
            <section class="card settings-card settings-integrations">
  <div class="settings-section-head"><span class="settings-eyebrow">Connected workflows</span><h2>Integrations & data safety</h2></div>
  <div class="settings-integrations-list">
    <div class="settings-integration"><span><b>Database & team</b><small>${LIVE?'Live · Supabase realtime enabled':'Demo · fictional in-browser data'}</small></span><span class="settings-status ${LIVE?'online':'demo'}">${LIVE?'Connected':'Demo'}</span></div>
    <div class="settings-integration"><span><b>IntakeQ counts</b><small>Import aggregated leads, not patient identities</small></span><button class="btn small" type="button" data-act="import">Import CSV</button></div>
    <div class="settings-integration"><span><b>Google Sheets</b><small>Calendar CSV export works; live two-way sync is not connected</small></span><button class="btn small" type="button" data-act="calendar-export">Export CSV</button></div>
    <div class="settings-integration"><span><b>Event scheduling fields</b><small>${EVENT_SCHEDULE_SUPPORTED?'Time and event notes are supported by the current schema':'Database migration needed for start/end time and notes'}</small></span><span class="settings-status ${EVENT_SCHEDULE_SUPPORTED?'online':'demo'}">${EVENT_SCHEDULE_SUPPORTED?'Ready':'Not enabled'}</span></div>
  </div>
  <p class="settings-privacy-note">Appointment notes must stay business-focused. Patient details remain in IntakeQ. Credentials and patient data must never be embedded in this public dashboard.</p>
</section>
            <section class="card span-6 settings-card settings-preview"><h2>Preview a data state</h2><p class="muted" style="margin:var(--space-1) 0 var(--space-4)">For reviewing the design. Every list and chart can show each of these.</p>
          <label class="field-label">Data state<select class="field" data-state>${opts([['ready', 'Populated'], ['loading', 'Loading'], ['empty', 'Empty'], ['error', 'Error']], ui.state)}</select></label></section>
            <section class="card settings-card settings-shortcuts">
  <div class="settings-section-head"><span class="settings-eyebrow">Workspace</span><h2>Quick access</h2></div>
  <nav class="settings-links" aria-label="Quick links"><a href="#calendar">Open calendar <span>↗</span></a><a href="#partners">Manage partners <span>↗</span></a><a href="#events">Review events <span>↗</span></a><a href="#sources">Sources &amp; ROI <span>↗</span></a></nav>
</section>
          </div>
        </div>
      </div>`;
    },
  };

  function isMet(s) { return s.actual >= s.target; }
  function scoreRow(s) {
    const show = s.unit === 'pct' ? pct(s.actual) : s.unit === 'flag' ? s.show : s.actual, tgt = s.unit === 'pct' ? pct(s.target) : s.unit === 'flag' ? 'Active referrer' : s.target;
    const w = Math.min(1, s.target ? s.actual / s.target : 0) * 100;
    return `<div class="score"><span>${esc(s.label)}<small>${esc(s.a === 'D' ? 'All sources' : act(s.a).name)} · target ${esc(tgt)}</small></span><span class="chip ${isMet(s) ? 'success' : ''}">${isMet(s) ? 'Met · ' : ''}${esc(show)}</span><div class="meter" aria-hidden="true"><i class="${isMet(s) ? 'met' : ''}" style="width:${w}%"></i></div></div>`;
  }


  function calendarRecordSummary(x) {
    if(!x)return '';
    const isEvent=x.kind==='event', record=isEvent?eventById(x.id):partner(x.id);
    if(!record)return '';
    const association=isEvent?partner(record.venue):null;
    const fields=isEvent?[
      ['When',fmt(record.date,{weekday:'long',month:'long',day:'numeric'})+(record.startTime?' · '+record.startTime+(record.endTime?'–'+record.endTime:''):'')],
      ['Format',record.format||'Not specified'],
      ['Type',record.type||'Not specified'],
      ['Related partner / venue',association?association.contact+' · '+association.org:'Not linked'],
      ['Activity',act(record.activity).name],
      ['Attendance / waitlist',(record.attendees||0)+' attendees · '+(record.signups||0)+' signups']
    ]:[
      ['Scheduled follow-up',fmt(record.next,{weekday:'long',month:'long',day:'numeric'})],
      ['Practice',record.org||'Not specified'],
      ['Relationship status',record.status||'Not specified'],
      ['BD activity',act(record.activity).name],
      ['Next step',record.nextStep||'No next step entered'],
      ['Owner',record.owner||'Torus team'],
      ...(record.phone?[['Phone',record.phone]]:[])
    ];
    const href=(isEvent?'#event-':'#partner-')+record.id;
    const action=isEvent?'edit-event':'edit-partner';
    return `<div class="cal-record-summary" aria-live="polite">
      <div class="cal-record-top"><span class="cal-record-type">${isEvent?'Event':'Partner follow-up'}</span>
        <button type="button" class="cal-record-back" data-cal-back aria-label="Back to selected day's agenda">×</button></div>
      <h3>${esc(isEvent?record.name:record.contact)}</h3>
      <p class="cal-record-intro">${esc(isEvent?(record.details||'Education and community engagement'):record.org||'Partner relationship')}</p>
      <dl class="cal-record-facts">${fields.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="cal-record-actions">
        <button type="button" class="btn primary" data-act="${action}" data-id="${esc(record.id)}">Edit details</button>
        <a class="cal-record-link" href="${esc(href)}">${isEvent?'Open full event':'Open full contact'} ↗</a>
        ${association?`<a class="cal-record-link cal-record-contact" href="#partner-${esc(association.id)}">Open linked contact ↗</a>`:''}
      </div>
      ${association?`<p class="cal-record-associated"><a href="#partner-${esc(association.id)}">Partner details: ${esc(association.contact)} ↗</a></p>`:''}
    </div>`;
  }

  function calendarAgendaMarkup(date){
    const items=calendarItems().filter(x=>x.date===date&&(ui.calFilter==='all'||(ui.calFilter==='events'?x.kind==='event':x.kind==='follow')));
    if(!items.length)return '<p class="cal-empty">A clear day. Select another date or add a new event.</p>';
    return items.map(x=>{
      const key=x.kind+':'+x.id,open=ui.calRecord===key;
      return `<div class="cal-appointment ${open?'is-expanded':''}">
        <button type="button" class="cal-appointment-trigger" data-cal-open="${esc(key)}" data-cal-date="${esc(x.date)}" aria-expanded="${open}">
          <span class="cal-appointment-dot ${x.kind}"></span>
          <span class="cal-appointment-title"><strong>${esc(x.label)}</strong><small>${esc(x.sub)}</small></span>
          <span class="cal-appointment-chevron" aria-hidden="true">⌄</span>
        </button>
        ${open?`<div class="cal-appointment-expanded">${calendarRecordSummary(x)}</div>`:''}
      </div>`;
    }).join('');
  }
  function updateCalendarAgenda(date){
    ui.calSelected=date;
    const items=calendarItems().filter(x=>x.date===date&&(ui.calFilter==='all'||(ui.calFilter==='events'?x.kind==='event':x.kind==='follow')));
    const aside=document.querySelector('.cal-day-panel');
    if(!aside)return rerender();
    const title=aside.querySelector('h3'),count=aside.querySelector(':scope > p'),content=aside.querySelector('.cal-day-list');
    if(title)title.textContent=fmt(date,{weekday:'long',month:'long',day:'numeric'});
    if(count)count.textContent=items.length+' scheduled';
    if(content)content.innerHTML=calendarAgendaMarkup(date);
    document.querySelectorAll('.cal-cell').forEach(c=>{
      const selected=c.dataset.calCell===date;c.classList.toggle('is-selected',selected);
      c.setAttribute('aria-selected',String(selected));
    });
  }
  function calendarItems() {
    return [...DATA.partners.filter(p=>p.next&&p.status!=='Not a fit').map(p=>({date:p.next,kind:'follow',id:p.id,late:overdue(p),label:p.contact,sub:p.nextStep||p.org,href:'#partner-'+p.id})),
      ...DATA.events.map(e=>({date:e.date,kind:'event',id:e.id,late:false,label:e.name,sub:(e.startTime?e.startTime+' · ':'')+(e.type||'Event')+' · '+(e.format||'In-person'),href:'#event-'+e.id}))];
  }
  function downloadCalendarCSV() {
    const rows=[['Date','Type','Title','Details','Record ID'],...calendarItems().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>[x.date,x.kind==='event'?'Event':'Follow-up',x.label,x.sub,x.id])];
    const safe=v=>{const text=String(v??'');return /^[=+\-@]/.test(text)?"'"+text:text;};
    const csv=rows.map(r=>r.map(v=>'"'+safe(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='torus-calendar-'+iso(TODAY)+'.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function settingsList(name,items){
    return `<details class="settings-choice"><summary><span>${esc(name)}</span><span class="settings-count">${items.length} items</span></summary><div class="settings-tokens">${items.map(x=>`<span>${esc(x)}</span>`).join('')}</div></details>`;
  }

  function miniDayDetails(key){
    if(!key)return '';
    const list=calendarItems().filter(x=>x.date===key);
    const label=fmt(key,{weekday:'long',month:'short',day:'numeric'});
    return `<section class="today-mini-popover" aria-label="${esc(label)} schedule">
      <div class="today-mini-pop-head"><div><small>Selected day</small><h3>${esc(label)}</h3><p>${list.length} scheduled</p></div><button type="button" data-mini-close aria-label="Close selected day">×</button></div>
      <div class="today-mini-pop-rows">${list.length?list.map(x=>`<div class="today-mini-pop-row"><i class="${x.kind}"></i><span><a href="${esc(x.href)}">${esc(x.label)}</a><small>${esc(x.sub)}</small></span><button type="button" data-act="${x.kind==='event'?'edit-event':'edit-partner'}" data-id="${esc(x.id)}">Edit</button></div>`).join(''):'<p class="today-mini-empty">Nothing scheduled. A little room to breathe.</p>'}</div>
      <button type="button" class="today-mini-new-event" data-act="calendar-add-event">+ Add an event</button></section>`;
  }

  function miniCalendar(upcoming) {
    const m=ui.month;
    const first=new Date(m.getFullYear(),m.getMonth(),1);
    const start=new Date(m.getFullYear(),m.getMonth(),1-((first.getDay()+(PREFS.weekStart==='monday'?6:0))%7));
    const records=[
      ...DATA.partners.filter(p=>p.next&&p.status!=='Not a fit').map(p=>({date:p.next,kind:'follow'})),
      ...DATA.events.map(e=>({date:e.date,kind:'event'}))
    ];
    const byDate=new Map();
    if(ui.state==='ready')for(const x of records){if(!byDate.has(x.date))byDate.set(x.date,[]);byDate.get(x.date).push(x);}
    const cells=Array.from({length:42},(_,i)=>{
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
      const key=iso(d),items=byDate.get(key)||[];
      const off=d.getMonth()!==m.getMonth(),now=key===iso(TODAY);
      const name=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
      return `<button type="button" class="today-day${off?' is-outside':''}${now?' is-today':''}${items.length?' has-items':''}" data-mini-day="${key}" aria-pressed="${ui.todaySelected===key}" aria-label="${esc(name)}, ${items.length} scheduled" title="Show ${esc(name)} here on Today">
        <span class="today-day-number">${d.getDate()}</span><span class="today-day-dots" aria-hidden="true">${items.slice(0,3).map(x=>`<i class="${x.kind}"></i>`).join('')}</span></button>`;
    }).join('');
    const upcomingList=upcoming.slice(0,1).map(e=>`<a class="today-upcoming-event" href="#event-${esc(e.id)}"><span class="today-event-mark" aria-hidden="true"></span><span><b>${esc(e.name)}</b><small>${esc(fmt(e.date,{weekday:'short',month:'short',day:'numeric'}))}</small></span><span aria-hidden="true">↗</span></a>`).join('');
    return `<section class="card today-mini-calendar" aria-label="Monthly calendar and upcoming events">
      <div class="card-head"><h2>Calendar</h2><a href="#calendar">Full calendar</a></div>
      <div class="today-mini-controls"><div><b>${esc(m.toLocaleDateString('en-US',{month:'long',year:'numeric'}))}</b><small>Follow-ups &amp; community events</small></div>
      <div class="today-mini-month-actions"><button class="today-mini-month-btn" type="button" data-month="-1" aria-label="Previous month">‹</button><button class="today-mini-month-btn is-now" type="button" data-month="0" aria-label="Back to current month">Today</button><button class="today-mini-month-btn" type="button" data-month="1" aria-label="Next month">›</button></div></div>
      <div class="today-mini-grid" role="group" aria-label="${esc(m.toLocaleDateString('en-US',{month:'long',year:'numeric'}))} days">${(PREFS.weekStart==='monday'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']).map(d=>`<span class="today-weekday">${d}</span>`).join('')}${cells}</div>
      <div class="today-mini-footer"><span class="today-mini-legend"><i class="follow"></i> Follow-up <i class="event"></i> Event</span><a href="#calendar">View schedule <span aria-hidden="true">↗</span></a></div>
      <div class="today-mini-agenda" data-today-agenda aria-live="polite">${miniDayDetails(ui.todaySelected)}</div><div class="today-upcoming"><div class="today-upcoming-label">Up next</div>${upcomingList||'<p class="muted">No upcoming events scheduled.</p>'}</div></section>`;
  }

  function kpi(label, value, sub, tone = '') { return `<div class="card kpi"><span>${esc(label)}</span><b class="num">${esc(value)}</b><small class="${tone}">${esc(sub)}</small></div>`; }
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function torusSvg() { return `<svg class="torus" viewBox="0 0 220 130" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<ellipse cx="110" cy="65" rx="${100 - i * 4}" ry="${18 + i * 4.2}" transform="rotate(${(i - 5) * 3} 110 65)"/>`).join('')}</svg>`; }

  /* ---------------- Drawers ---------------- */
  function openDrawer(html, wide = false) { lastFocus = document.activeElement; const p = $('[data-drawer-panel]'); p.classList.toggle('wide', wide); p.innerHTML = html; p.dataset.panelType = p.querySelector('form[data-form]')?.dataset.form || 'general'; $('[data-drawer]').hidden = false; ($('[data-drawer-panel] input, [data-drawer-panel] select, [data-drawer-panel] textarea') || $('[data-drawer-panel] button')).focus(); }
  function closeDrawer() { $('[data-drawer]').hidden = true; ui.importRows = null; lastFocus?.focus?.(); if (ui.pending) { ui.pending = false; rerender(); } }
  const actions = `<div class="top-actions full">BUTTON<button type="button" class="btn" data-act="close">Cancel</button></div>`;
  const creditOptions = (sel) => `<option value="">No specific provider or event</option><optgroup label="Referral partners">${opts(DATA.partners.map((p) => [p.id, `${p.contact} · ${p.org}`]), sel)}</optgroup><optgroup label="Events">${opts(DATA.events.map((e) => [e.id, `${e.name} (${fmt(e.date)})`]), sel)}</optgroup>`;
  function partnerForm(p = {}) {
    openDrawer(`<div class="partner-drawer-head"><div class="partner-drawer-kicker"><span class="partner-drawer-dot"></span> Torus · Relationships</div><h2 id="drawer-title">${p.id ? 'Edit ' + esc(p.contact) : 'Add a partner'}</h2><p>Organize the connection, ownership, and next follow-up.</p></div>
      <form class="form-grid partner-form" data-form="partner" data-id="${esc(p.id || '')}" novalidate>
        <fieldset class="partner-form-section"><legend><span>01</span> Relationship details</legend><div class="partner-field-grid"><label class="field-label full">Contact name<input class="field" name="contact" value="${esc(p.contact)}" required aria-describedby="err-contact"><span class="err" id="err-contact" role="alert"></span></label>
        <label class="field-label full">Practice / organization<input class="field" name="org" value="${esc(p.org)}" required aria-describedby="err-org"><span class="err" id="err-org" role="alert"></span></label>
        <label class="field-label">Type<select class="field" name="type">${opts(TYPES, p.type)}</select></label>
        <label class="field-label">BD activity<select class="field" name="activity">${opts(ACTIVITIES.slice(0, 5).map((a) => [a.id, a.long]), p.activity)}</select></label>
        <label class="field-label">Specialty<input class="field" name="spec" value="${esc(p.spec)}"></label>
        <label class="field-label">City<input class="field" name="city" value="${esc(p.city)}"></label>
        </div></fieldset><fieldset class="partner-form-section"><legend><span>02</span> Follow-up &amp; ownership</legend><div class="partner-field-grid"><label class="field-label">Status<select class="field" name="status">${opts(ALL_STATUS, p.status || 'Cold')}</select></label>
        <label class="field-label">Owner<select class="field" name="owner">${opts(OWNERS, p.owner || 'Torus team')}</select></label>
        <label class="field-label">Next follow-up<input class="field" type="date" name="next" value="${esc(p.id ? p.next : iso(d(3)))}"></label>
        <label class="field-label">Phone<input class="field" type="tel" name="phone" value="${esc(p.phone)}"></label>
        <label class="field-label full">Next step<input class="field" name="nextStep" value="${esc(p.nextStep)}" placeholder="e.g. Send intro letter"></label>
        <label class="field-label full">First met at (event)<select class="field" name="metAt"><option value="">Not met at an event</option>${opts(DATA.events.map((x) => [x.id, x.name]), p.metAt)}</select></label>
        </div></fieldset><div class="partner-form-submit">${actions.replace('BUTTON', `<button class="btn primary">${p.id ? 'Save changes' : 'Add partner'}</button>`)}</div></form>`);
  }
  function touchForm(id) {
    const p = partner(id);
    openDrawer(`<h2 id="drawer-title">Log a touch</h2><p class="muted">${esc(p.contact)} · ${esc(p.org)}</p>
      <form class="form-grid" data-form="touch" data-id="${esc(p.id)}" novalidate>
        <label class="field-label">Date<input class="field" type="date" name="date" value="${iso(TODAY)}" required></label>
        <label class="field-label">Method<select class="field" name="method">${opts(METHODS, 'Email')}</select></label>
        <label class="field-label">Done by<select class="field" name="by">${opts(OWNERS, p.owner)}</select></label>
        <label class="field-label">Outcome<select class="field" name="outcome">${opts(OUTCOMES, 'Replied')}</select></label>
        <label class="field-label full">What happened<textarea class="field" name="note" required aria-describedby="err-note" placeholder="One line, no patient details"></textarea><span class="err" id="err-note" role="alert"></span></label>
        <label class="field-label">Move to stage<select class="field" name="status">${opts(ALL_STATUS, p.status)}</select></label>
        <label class="field-label">Next follow-up<input class="field" type="date" name="next" value="${iso(d(7))}"></label>
        <label class="field-label full">Next step<input class="field" name="nextStep" value="${esc(p.nextStep)}"></label>
        <label class="field-label">Hours spent<input class="field" type="number" min="0" step="0.25" name="hours" value="0.5"></label>
        <label class="field-label">Cash cost ($)<input class="field" type="number" min="0" step="1" name="cost" value="0"></label>
        ${actions.replace('BUTTON', '<button class="btn primary">Save touch</button>')}</form>`);
  }
  function eventForm(e = {}) {
    const rel=DATA.partners.slice().sort((a,b)=>a.contact.localeCompare(b.contact));
    const partnerOptions=opts(rel.map(p=>[p.id,p.contact+' · '+p.org]),e.venue);
    const extra=EVENT_SCHEDULE_SUPPORTED?`
      <label class="field-label">Start time<input class="field" type="time" name="startTime" value="${esc(e.startTime||'')}"></label>
      <label class="field-label">End time<input class="field" type="time" name="endTime" value="${esc(e.endTime||'')}" aria-describedby="err-endTime"><span class="err" id="err-endTime" role="alert"></span></label>
      <label class="field-label full">Agenda / logistics notes <small>No patient details</small><textarea class="field" maxlength="1800" name="details" rows="3" placeholder="Purpose, preparation, arrival instructions or call link (no patient data)">${esc(e.details||'')}</textarea></label>
      `:`<p class="event-schema-notice">Optional start/end times and agenda notes require the calendar scheduling migration. Existing events, linked partners and outcomes continue saving to Supabase.</p>`;
    openDrawer(`<div class="event-drawer-head">
      <span class="event-drawer-kicker">Torus · Events & education</span>
      <h2 id="drawer-title">${e.id?'Edit event':'Plan an event'}</h2>
      <p>${e.id?'Update the schedule, partner link and results.':'Organize the date, related partner, and purpose. Record outcomes after the event.'}</p>
      </div>
      <form class="form-grid event-form" data-form="event" data-id="${esc(e.id||'')}" novalidate>
        <fieldset class="event-form-section"><legend><span>01</span> Event essentials</legend>
          <div class="event-field-grid">
            <label class="field-label full">Event title<input class="field" name="name" value="${esc(e.name)}" required placeholder="e.g. Community education evening" aria-describedby="err-name"><span class="err" id="err-name" role="alert"></span></label>
            <label class="field-label">Event date<input class="field" type="date" name="date" value="${esc(e.date||ui.calSelected||iso(d(21)))}" required></label>
            <label class="field-label">Event type<select class="field" name="type">${opts(EVENT_TYPES,e.type)}</select></label>
            <label class="field-label">Format<select class="field" name="format">${opts(['In-person','Virtual (Zoom)'],e.format)}</select></label>
            <label class="field-label">Business development focus<select class="field" name="activity">${opts([['A4','Community events'],['A3','Provider education'],['A1','Practice partnerships'],['A2','Spravato insurance track'],['A5',"Shari's network"]],e.activity)}</select></label>
            <label class="field-label full">Related partner or host<select class="field" name="venue"><option value="">No linked organization</option>${partnerOptions}</select><small>Uses the existing linked partner/venue record. Opens directly from the calendar summary.</small></label>
            ${extra}
          </div>
        </fieldset>
        <fieldset class="event-form-section"><legend><span>02</span> Participation & outcomes</legend>
          <p class="event-section-note">Enter the results once the event has happened; all fields may start at zero.</p>
          <div class="event-field-grid">
            <label class="field-label">Attendees<input class="field" type="number" min="0" step="1" name="attendees" value="${e.attendees||0}"></label>
            <label class="field-label">Waitlist signups<input class="field" type="number" min="0" step="1" name="signups" value="${e.signups||0}" aria-describedby="err-signups"><span class="err" id="err-signups" role="alert"></span></label>
            <label class="field-label">Cash cost ($)<input class="field" type="number" min="0" step="1" name="cost" value="${e.cost||0}"></label>
            <label class="field-label">Team hours<input class="field" type="number" min="0" step="0.5" name="hours" value="${e.hours||0}"></label>
          </div>
        </fieldset>
        <div class="event-form-submit">${actions.replace('BUTTON',`<button class="btn primary">${e.id?'Save event':'Add event'}</button>`)}</div>
      </form>`);
  }
  function countsForm(c = {}) {
    openDrawer(`<h2 id="drawer-title">${c.id ? 'Edit counts' : 'Add counts'}</h2><p class="muted">Totals for one month, channel, source and credit. No patient details.</p>
      <form class="form-grid" data-form="counts" data-id="${esc(c.id || '')}" novalidate>
        <label class="field-label">Month<input class="field" type="month" name="month" value="${esc((c.month || THIS_MONTH).slice(0, 7))}" required></label>
        <label class="field-label">Came in via<select class="field" name="via">${opts(CHANNELS, c.via)}</select></label>
        <label class="field-label">How they heard about us<select class="field" name="source">${opts(SOURCES, c.source)}</select></label>
        <label class="field-label">Credit to<select class="field" name="credit">${creditOptions(c.credit)}</select></label>
        <label class="field-label">Leads<input class="field" type="number" min="0" name="leads" value="${c.leads || 0}" aria-describedby="err-leads"><span class="err" id="err-leads" role="alert"></span></label>
        <label class="field-label">Consults booked<input class="field" type="number" min="0" name="consults" value="${c.consults || 0}"></label>
        <label class="field-label">Converted to a package<input class="field" type="number" min="0" name="converted" value="${c.converted || 0}"></label>
        <label class="field-label">Package revenue ($)<input class="field" type="number" min="0" name="revenue" value="${c.revenue || 0}"></label>
        <div class="top-actions full"><button class="btn primary">${c.id ? 'Save counts' : 'Add counts'}</button>${c.id ? `<button type="button" class="btn" data-act="delete-counts" data-id="${esc(c.id)}">Delete these counts</button>` : ''}<button type="button" class="btn" data-act="close">Cancel</button></div></form>`);
  }

  /* ---------------- IntakeQ import (summarised in the browser) ---------------- */
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  const toISO = (v) => { const s = String(v || '').trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}-01`;
    if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return `${m[2]}-${m[1].padStart(2, '0')}-01`;
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    const t = Date.parse(s); return isNaN(t) ? '' : iso(new Date(t)); };
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const matchList = (val, list, fallback) => { const v = norm(val); if (!v) return fallback; return list.find((x) => norm(x) === v) || list.find((x) => v.includes(norm(x)) || norm(x).includes(v)) || fallback; };
  const matchSource = (val) => { const v = norm(val); if (!v) return 'Other';
    const rules = [[/retreat/, 'Shari Retreats'], [/\b(shari|sheri)\b.*yoga|yoga.*\b(shari|sheri)\b/, 'Shari Yoga'], [/\bavonn?e?y\b/, 'Avonny'], [/psych(ology)? today/, 'Psychology Today'], [/refer|doctor|physician|provider|therapist/, 'Provider referral'], [/lunch|webinar|education/, 'Provider education event'], [/event|talk|tea|open house|circle|yoga|class/, 'Community event'], [/insta|facebook|social|tiktok|linkedin/, 'Social media'], [/google|search|online|web/, 'Google / organic search'], [/email|newsletter|flodesk/, 'Email (Flodesk)'], [/friend|family|word|mouth/, 'Word of mouth'], [/walk/, 'Direct walk-in']];
    return matchList(val, SOURCES, null) || (rules.find(([re]) => re.test(v)) || [null, 'Other'])[1]; };
  const matchCredit = (val) => { const v = norm(val); if (!v || v.length < 3) return '';
    const hit = DATA.partners.find((p) => [p.contact, p.org].some((x) => norm(x) && (v.includes(norm(x)) || norm(x).includes(v)))) || DATA.events.find((e) => norm(e.name) && (v.includes(norm(e.name)) || norm(e.name).includes(v)));
    return hit ? hit.id : ''; };
  function importForm() {
    openDrawer(`<h2 id="drawer-title">Import an IntakeQ export</h2>
      <p class="muted">Choose the CSV export (or paste it). The file is read on this computer only: names, contact details, PHQ-9 and insurance never leave it. Only monthly totals are saved.</p>
      <div class="grid" data-import>
        <label class="field-label">IntakeQ export (.csv)<input class="field" type="file" accept=".csv,text/csv" data-import-file style="padding-top:var(--space-2)"></label>
        <label class="field-label">…or paste the CSV<textarea class="field" data-import-text rows="4" placeholder="Paste the rows here, including the header row"></textarea></label>
        <div><button type="button" class="btn" data-act="import-read">Read the file</button></div>
        <div data-import-map></div>
      </div>`, true);
  }
  function importMapping(rows) {
    const head = rows[0].map((h) => h.trim()), g = guessMap(head), guess = (k) => String(g[k]);
    const sel = (name, label, g, optional = true) => `<label class="field-label">${label}<select class="field" name="${name}">${optional ? '<option value="-1">Not in this file</option>' : ''}${head.map((h, i) => `<option value="${i}"${String(i) === g ? ' selected' : ''}>${esc(h || 'Column ' + (i + 1))}</option>`).join('')}</select></label>`;
    $('[data-import-map]').innerHTML = `<form class="form-grid" data-form="import-map" novalidate><p class="full muted">${plural(rows.length - 1, 'row')} found. Match the columns, then preview the totals.</p>
      ${sel('date', 'First contact date or month', guess('date'), false)}
      ${sel('source', 'How they heard about us', guess('source'))}
      ${sel('credit', 'Referring provider or event (optional)', guess('credit'))}
      ${sel('consult', 'Consult date or booked yes/no (optional)', guess('consult'))}
      ${sel('pkg', 'Package or service (optional)', guess('pkg'))}
      ${sel('viaCol', 'Came in via column (optional)', guess('viaCol'))}
      <label class="field-label">Came in via, when there's no column<select class="field" name="via">${opts(CHANNELS)}</select></label>
      <div class="full top-actions"><button class="btn primary">Preview the totals</button></div></form><div data-import-preview></div>`;
    ui.importRows = rows;
  }
  // Shared by the import drawer and the sample-upload demo: column guesses, then rows -> monthly counts.
  function guessMap(head) {
    const f = (re, not) => head.findIndex((h) => re.test(h.toLowerCase()) && !(not && not.test(h.toLowerCase())));
    return { date: Math.max(0, f(/date|created|submitted|added|month/, /consult|birth|dob/)), source: f(/hear|source|how did/), credit: f(/referring|referred by|provider name|event/),
      consult: f(/consult|appointment|booked/), pkg: f(/package|service|plan/), viaCol: f(/came in via|channel|form|intake type/) };
  }
  const YES = /^(y|yes|true|1|booked|x)$/i;
  function aggregateRows(rows, map) {
    const agg = new Map(); let skipped = 0, unmatched = 0;
    rows.forEach((r) => {
      const first = toISO(r[map.date]); if (!first) { skipped++; return; }
      const via = map.viaCol >= 0 ? matchList(r[map.viaCol], CHANNELS, map.via) : map.via;
      const source = map.source >= 0 ? matchSource(r[map.source]) : 'Other';
      const credit = map.credit >= 0 ? matchCredit(r[map.credit]) : ''; if (map.credit >= 0 && String(r[map.credit] || '').trim() && !credit) unmatched++;
      const pkgRaw = map.pkg >= 0 ? String(r[map.pkg] || '').trim() : '', pkg = matchList(pkgRaw, Object.keys(PACKAGES).slice(1), '');
      const conv = !!pkgRaw && !/^(none|no|n\/a|-)$/i.test(pkgRaw);
      const month = monthOf(first), key = [month, via, source, credit].join('|');
      const c = agg.get(key) || { month, via, source, credit, leads: 0, consults: 0, converted: 0, revenue: 0 };
      const cv = map.consult >= 0 ? String(r[map.consult] || '').trim() : '';
      c.leads++; if (cv && (YES.test(cv) || toISO(cv))) c.consults++; if (conv) { c.converted++; c.revenue += PACKAGES[pkg] || 0; }
      agg.set(key, c);
    });
    return { out: [...agg.values()].sort((a, b) => b.month.localeCompare(a.month)), skipped, unmatched, patients: rows.length - skipped };
  }
  function importPreview(map) {
    const rows = ui.importRows.slice(1), { out, skipped, unmatched } = aggregateRows(rows, map);
    ui.importAgg = out;
    const months = [...new Set(out.map((c) => c.month))], vias = [...new Set(out.map((c) => c.via))];
    $('[data-import-preview]').innerHTML = !out.length ? `<div class="state"><p>No rows had a readable date. Check the "First contact date" column.</p></div>` : `<div class="card" style="margin-top:var(--space-4)"><h3>Totals to save</h3><p class="muted" style="margin:var(--space-1) 0 var(--space-3)">${plural(rows.length - skipped, 'patient')} → ${plural(out.length, 'row')} of counts. Saving replaces the existing ${vias.map((x) => '"' + esc(x) + '"').join(', ')} counts for ${months.map((m) => esc(fmtMonth(m))).join(', ')}.${skipped ? ` ${plural(skipped, 'row')} skipped (no date).` : ''}${unmatched ? ` ${plural(unmatched, 'referrer')} didn't match a partner or event and count as uncredited; add them on Partners and re-import.` : ''}</p>
      <div class="table-wrap"><table class="cards"><thead><tr><th>Month</th><th>Source</th><th>Credited to</th><th class="right">Leads</th><th class="right">Consults</th><th class="right">Converted</th></tr></thead><tbody>${out.map((c) => `<tr><td>${esc(fmtMonth(c.month))}</td><td data-label="Source">${esc(c.source)}</td><td data-label="Credited to">${c.credit ? esc(partner(c.credit)?.org || eventById(c.credit)?.name) : '<span class="muted">–</span>'}</td><td class="right num" data-label="Leads">${c.leads}</td><td class="right num" data-label="Consults">${c.consults}</td><td class="right num" data-label="Converted">${c.converted}</td></tr>`).join('')}</tbody></table></div>
      <div class="top-actions" style="margin-top:var(--space-4)"><button class="btn primary" data-act="import-save">Save ${plural(out.length, 'row')} of counts</button><button class="btn" data-act="close">Cancel</button></div></div>`;
  }

  /* ---------------- Router ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, ''); const m = h.match(/^(partner|event)-(.+)$/); const id = m ? m[1] + 's' : h, sub = m ? decodeURIComponent(m[2]) : '';
    const page = PAGES.find((p) => p.id === id) || PAGES[0];
    document.querySelectorAll('[data-nav] a').forEach((a) => (a.getAttribute('href') === '#' + page.id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    let title = page.long || page.name, subtitle = '', crumb = '', buttons = '', html;
    if (page.id === 'partners' && sub) { const p = partner(sub); title = p ? p.contact : 'Partner not found'; subtitle = p ? `${p.org}${p.city ? ' · ' + p.city : ''}` : ''; crumb = '<a class="crumb" href="#partners">‹ Referral partners</a>'; buttons = p ? `<button class="btn" data-act="edit-partner" data-id="${esc(p.id)}">Edit partner</button><button class="btn primary" data-act="log" data-id="${esc(p.id)}">Log a touch</button>` : ''; html = pages.partner(sub); }
    else if (page.id === 'events' && sub) { const e = eventById(sub); title = e ? e.name : 'Event not found'; subtitle = e ? `${fmt(e.date, { month: 'long', day: 'numeric', year: 'numeric' })} · ${e.format}` : ''; crumb = '<a class="crumb" href="#events">‹ Events & education</a>'; html = pages.event(sub); }
    else {
      subtitle = { today: 'What needs you first, and how the playbook is tracking.', partners: 'Every provider, practice, venue and colleague in the referral pipeline.', patients: 'How patients came in, and which activity, event or provider gets the credit. Monthly counts only.', pipeline: 'Move each relationship one step forward.', events: 'Community events and lunch-and-learns, with the contacts and patients each one brought in.', sources: 'Which sources and activities turn into consults, packages and return.', calendar: 'Follow-ups and events by month.', setup: 'Targets, costs, team and lists.' }[page.id];
      buttons = { patients: '<button class="btn" data-act="add-counts">Add counts</button><button class="btn primary" data-act="import">Import IntakeQ export</button>', partners: '<button class="btn primary" data-act="add-partner">Add a partner</button>', pipeline: '<button class="btn primary" data-act="add-partner">Add a partner</button>', events: '<button class="btn primary" data-act="add-event">Plan an event</button>', today: '<button class="btn" data-act="add-event">Plan an event</button><button class="btn primary" data-act="add-partner">Add a partner</button>' }[page.id] || '';
      if (page.id === 'today') title = 'Today';
      html = pages[page.id]();
    }
    $('[data-crumb]').innerHTML = crumb; $('[data-title]').textContent = title; $('[data-subtitle]').textContent = subtitle; $('[data-actions]').innerHTML = buttons;
    document.title = `${title} · Torus BD`;
    view.innerHTML = html;
  }
  function rerender(keepFocusSel) { route(); if (keepFocusSel) { const el = $(keepFocusSel); if (el) { el.focus(); if (el.setSelectionRange && el.type === 'search') el.setSelectionRange(el.value.length, el.value.length); } } }
  // Live changes from other people: redraw now, or after the open form closes so nobody loses typing.
  function refresh() { if (!$('[data-drawer]').hidden || document.activeElement?.matches?.('[data-view] input, [data-view] textarea')) ui.pending = true; else rerender(); }

  /* ---------------- Events ---------------- */
  document.addEventListener('click', async (e) => {

    const t = e.target.closest('[data-event-toggle],[data-pipeline-clear],[data-cal-open],[data-cal-back],[data-act],[data-sort],[data-range],[data-prange],[data-month],[data-cal-day],[data-cal-cell],[data-mini-day],[data-mini-close],[data-pipeline-page],[data-pipeline-jump],[data-cal-mode],[data-cal-filter],tr[data-href]');
    if (!t) { if (e.target.matches('[data-drawer]')) closeDrawer(); return; }
    if (t.matches('tr[data-href]')) { if (!e.target.closest('a,button,select')) location.hash = t.dataset.href; return; }
    if (t.dataset.sort) { ui.dir = ui.sort === t.dataset.sort ? -ui.dir : 1; ui.sort = t.dataset.sort; rerender(); return; }
    if (t.dataset.range) { ui.range = t.dataset.range === 'all' ? 'all' : +t.dataset.range; rerender(); return; }
    if (t.dataset.prange) { ui.prange = t.dataset.prange === 'all' ? 'all' : +t.dataset.prange; rerender(); return; }
    if(t.dataset.eventToggle){
      const id=t.dataset.eventToggle,open=ui.eventOpen===id;
      ui.eventOpen=open?'':id;
      document.querySelectorAll('[data-event-row]').forEach(row=>{
        const expanded=!open&&row.dataset.eventRow===id;
        row.classList.toggle('is-open',expanded);
        row.querySelector('[data-event-toggle]')?.setAttribute('aria-expanded',String(expanded));
        const details=document.getElementById('event-detail-'+row.dataset.eventRow);
        if(details)details.hidden=!expanded;
      });
      return;
    }
    if(t.dataset.calOpen){
      ui.calRecord=ui.calRecord===t.dataset.calOpen?'':t.dataset.calOpen;
      updateCalendarAgenda(t.dataset.calDate||ui.calSelected);return;
    }
    if(t.hasAttribute('data-cal-back')){ui.calRecord='';updateCalendarAgenda(ui.calSelected);return;}
    if(t.hasAttribute('data-pipeline-clear')){
      Object.assign(ui,{pipelineOwner:'',pipelineActivity:'',pipelineDue:'all',pipelineSort:'due'});
      ui.pipelineSelected.clear();rerender();return;
    }
    if(t.dataset.pipelinePage){
      const n=window.innerWidth<760?1:window.innerWidth<1190?2:3;
      ui.pipelinePage=Math.max(0,Math.min(Math.ceil(STAGES.length/n)-1,(ui.pipelinePage||0)+Number(t.dataset.pipelinePage)));
      rerender();return;
    }
    if(t.dataset.pipelineJump!==undefined){
      const n=window.innerWidth<760?1:window.innerWidth<1190?2:3;
      ui.pipelinePage=Math.floor(Number(t.dataset.pipelineJump)/n);rerender();return;
    }
    if(t.dataset.miniDay){
      e.preventDefault();
      const key=t.dataset.miniDay;
      ui.todaySelected=ui.todaySelected===key?'':key;
      ui.calSelected=key;
      const dest=document.querySelector('[data-today-agenda]');
      if(dest)dest.innerHTML=miniDayDetails(ui.todaySelected);
      document.querySelectorAll('[data-mini-day]').forEach(el=>{
        el.setAttribute('aria-pressed',String(ui.todaySelected===el.dataset.miniDay));
        el.classList.toggle('is-selected',ui.todaySelected===el.dataset.miniDay);
      });
      return;
    }
    if(t.hasAttribute('data-mini-close')){
      ui.todaySelected='';
      const dest=document.querySelector('[data-today-agenda]');if(dest)dest.textContent='';
      document.querySelectorAll('[data-mini-day]').forEach(el=>{el.classList.remove('is-selected');el.setAttribute('aria-pressed','false');});
      return;
    }
    if(t.dataset.calCell){ui.calRecord='';updateCalendarAgenda(t.dataset.calCell);return;}
    if(t.dataset.calMode){ui.calMode=t.dataset.calMode;rerender();return;}
    if(t.dataset.calFilter){ui.calFilter=t.dataset.calFilter;rerender();return;}
    if(t.dataset.calDay){ui.calRecord='';updateCalendarAgenda(t.dataset.calDay);return;}
    if(t.dataset.month){
      ui.calRecord='';
      const v=+t.dataset.month;ui.month=v===0?new Date(TODAY.getFullYear(),TODAY.getMonth(),1):new Date(ui.month.getFullYear(),ui.month.getMonth()+v,1);
      if(location.hash.includes('calendar'))ui.calSelected=v===0?iso(TODAY):iso(new Date(ui.month.getFullYear(),ui.month.getMonth(),1));
      rerender();return;
    }
    const a = t.dataset.act, id = t.dataset.id || (location.hash.match(/^#(?:partner|event)-(.+)$/) || [])[1];
    try {
      if (a === 'calendar-add-event') eventForm({date:ui.calSelected||iso(TODAY)});
      else if (a === 'calendar-export') downloadCalendarCSV();
      else if (a === 'prefs-reset'){
        PREFS={...PREF_DEFAULTS};savePrefs();ui.calMode=PREFS.defaultView;rerender();toast('Display preferences reset');
      }
      else if (a === 'add-partner') partnerForm();
      else if (a === 'edit-partner') partnerForm(partner(id));
      else if (a === 'log') touchForm(id);
      else if (a === 'add-event') eventForm();
      else if (a === 'edit-event') eventForm(eventById(id));
      else if (a === 'duplicate-event'){
        const original=eventById(id);
        if(original)eventForm({...original,id:'',name:original.name+' — copy',attendees:0,signups:0});
      }
      else if (a === 'add-counts') countsForm();
      else if (a === 'edit-counts') countsForm(DATA.counts.find((c) => String(c.id) === id));
      else if (a === 'delete-counts') { const c = DATA.counts.find((x) => String(x.id) === id); await remove('lead_counts', c.id); closeDrawer(); rerender(); toast(`Deleted ${fmtMonth(c.month)} · ${c.via} · ${c.source} counts`); }
      else if (a === 'import') importForm();
      else if (a === 'import-read') {
        const file = $('[data-import-file]').files[0], text = file ? await file.text() : $('[data-import-text]').value;
        const rows = parseCSV(text || '');
        if (rows.length < 2) { $('[data-import-map]').innerHTML = '<p class="err">Choose an IntakeQ CSV export, or paste it including the header row.</p>'; return; }
        importMapping(rows);
      }
      else if (a === 'import-save') { const n = ui.importAgg.length; t.disabled = true; await replaceCounts(ui.importAgg); ui.importAgg = null; closeDrawer(); location.hash = '#patients'; rerender(); toast(`Saved ${plural(n, 'row')} of counts`); }
      else if (a === 'remove-member') { await remove('team_members', id); rerender(); toast(`${id} removed from the team`); }
      else if (a === 'sign-out') { await db.auth.signOut(); }
      else if (a === 'close') closeDrawer();
      else if (a === 'retry') { ui.state = 'ready'; if (LIVE) await boot(); else rerender(); }
      else if (a === 'clear') { Object.assign(ui, { q: '', status: '', activity: '', via: '', pact: '' }); rerender(); }
    } catch (err) { t.disabled = false; fail(err, 'save that'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('[data-drawer]').hidden) closeDrawer();
    if (e.key === 'Enter' && e.target.matches('tr[data-href]')) location.hash = e.target.dataset.href;
    if (e.key === 'Tab' && !$('[data-drawer]').hidden) {
      const f = [...$('[data-drawer-panel]').querySelectorAll('input,select,textarea,button,a[href]')].filter((x) => !x.disabled); const first = f[0], last = f.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { ui.q = e.target.value; rerender('[data-q]'); } });
  document.addEventListener('focusout', () => { setTimeout(() => { if (ui.pending && $('[data-drawer]').hidden && !document.activeElement?.matches?.('[data-view] input, [data-view] textarea')) { ui.pending = false; rerender(); } }, 0); });
  document.addEventListener('change', async (e) => {
    const t = e.target;
    try {
      if(t.matches('[data-pipe-filter]')){
        const key={owner:'pipelineOwner',activity:'pipelineActivity',due:'pipelineDue',sort:'pipelineSort'}[t.dataset.pipeFilter];
        if(key){ui[key]=t.value;ui.pipelineSelected.clear();rerender();}return;
      }
      if(t.matches('[data-pipe-select]')){
        if(t.checked)ui.pipelineSelected.add(t.dataset.pipeSelect);else ui.pipelineSelected.delete(t.dataset.pipeSelect);
        rerender();return;
      }
      if(t.matches('[data-pipe-all]')){
        for(const p of pipelineFiltered()){if(t.checked)ui.pipelineSelected.add(p.id);else ui.pipelineSelected.delete(p.id);}
        rerender();return;
      }
      if(t.matches('[data-pipe-bulk-stage],[data-pipe-bulk-owner]')){
        if(!t.value)return;
        const matches=pipelineFiltered().filter(p=>ui.pipelineSelected.has(p.id));
        if(!matches.length){t.value='';toast('Select partners first');return;}
        const key=t.hasAttribute('data-pipe-bulk-stage')?'status':'owner',value=t.value;
        t.disabled=true;
        for(const p of matches)await upsert('partners',{...p,[key]:value});
        ui.pipelineSelected.clear();rerender();toast(matches.length+' partner records saved');return;
      }
      if (t.matches('[data-move]')) { const p = partner(t.dataset.move); await upsert('partners', { ...p, status: t.value }); rerender(); toast(`${p.contact} moved to ${t.value}`); }
      if (t.matches('[data-filter]')) { ui[t.dataset.filter] = t.value; rerender(`[data-filter="${t.dataset.filter}"]`); }
      if (t.matches('[data-pref]')){
        const key=t.dataset.pref;
        if(Object.hasOwn(PREF_DEFAULTS,key)){
          PREFS={...PREFS,[key]:t.value};savePrefs();
          if(key==='defaultView')ui.calMode=t.value;
          rerender();toast('Display preference saved on this device');
        }
      }
      if (t.matches('[data-state]')) { ui.state = t.value; const name=t.options[t.selectedIndex].text.toLowerCase();rerender();toast(`Preview is showing the ${name} state`); }
    } catch (err) { fail(err, 'move that partner'); rerender(); }
  });
  document.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f)), kind = f.dataset.form, btn = f.querySelector('button.primary');
    const need = (name, msg) => { const el = $('#err-' + name); if (!String(v[name] || '').trim()) { if (el) el.textContent = msg; f[name].focus(); return true; } if (el) el.textContent = ''; return false; };
    if (kind === 'auth') return signIn(f, v);
    if (kind === 'import-map') { const map = Object.fromEntries(['date', 'source', 'credit', 'consult', 'pkg'].map((k) => [k, +v[k]])); map.via = v.via; map.viaCol = +v.viaCol; return importPreview(map); }
    try {
      if (btn) btn.disabled = true;
      if (kind === 'partner') {
        if (need('contact', 'Enter the contact’s name.') || need('org', 'Enter the practice or organization.')) return;
        const base = f.dataset.id ? partner(f.dataset.id) : { id: nextId('P-', DATA.partners) };
        await upsert('partners', { ...base, ...v }); closeDrawer(); rerender(); toast(`${v.contact} saved`);
      } else if (kind === 'touch') {
        if (need('note', 'Add one line on what happened.')) return;
        const p = partner(f.dataset.id);
        await upsert('touches', { partner: p.id, date: v.date, method: v.method, by: v.by, outcome: v.outcome, note: v.note, hours: +v.hours || 0, cost: +v.cost || 0 });
        await upsert('partners', { ...p, status: v.status, next: v.next, nextStep: v.nextStep });
        closeDrawer(); rerender(); toast(`Touch logged for ${p.contact}`);
      } else if (kind === 'event') {
        if (need('name', 'Give the event a name.')) return;
        if (+v.signups > +v.attendees) { $('#err-signups').textContent = 'Signups can’t be more than attendees.'; f.signups.focus(); return; }
        const base = f.dataset.id ? eventById(f.dataset.id) : { id: nextId('E-', DATA.events) };
        if(EVENT_SCHEDULE_SUPPORTED&&v.endTime&&(!v.startTime||v.endTime<=v.startTime)){
          const el=f.querySelector('#err-endTime');
          if(el)el.textContent='Set a start time and an end time after it.';
          f.querySelector('[name="endTime"]').focus();return;
        }
        await upsert('events', { ...base, ...v, attendees: +v.attendees, signups: +v.signups, cost: +v.cost, hours: +v.hours }); closeDrawer(); rerender(); toast(`${v.name} saved`);
      } else if (kind === 'counts') {
        if (+v.leads < 1) { $('#err-leads').textContent = 'Enter at least one lead.'; f.leads.focus(); return; }
        const rec = { month: v.month + '-01', via: v.via, source: v.source, credit: v.credit, leads: +v.leads, consults: +v.consults, converted: +v.converted, revenue: +v.revenue };
        const clash = DATA.counts.find((c) => c.month === rec.month && c.via === rec.via && c.source === rec.source && c.credit === rec.credit && String(c.id) !== f.dataset.id);
        if (clash) { $('#err-leads').textContent = 'Counts for this month, channel, source and credit already exist. Edit that row instead.'; return; }
        if (f.dataset.id) rec.id = DATA.counts.find((c) => String(c.id) === f.dataset.id).id; else if (!LIVE) rec.id = 'M' + Date.now();
        if (LIVE && f.dataset.id) { const { error } = await db.from('lead_counts').update(TABLES.lead_counts.to(rec)).eq('id', rec.id); if (error) throw error; Object.assign(DATA.counts.find((c) => c.id === rec.id), rec); }
        else if (LIVE) { const { data, error } = await db.from('lead_counts').insert(TABLES.lead_counts.to(rec)).select().single(); if (error) throw error; DATA.counts.push(TABLES.lead_counts.from(data)); }
        else { const i = DATA.counts.findIndex((c) => c.id === rec.id); if (i >= 0) DATA.counts[i] = rec; else DATA.counts.push(rec); }
        closeDrawer(); rerender(); toast('Counts saved');
      } else if (kind === 'settings') {
        if (v.staffCost === '' || +v.staffCost < 0) { $('#err-staffCost').textContent = 'Enter a cost of zero or more.'; f.staffCost.focus(); return; }
        await saveSettings({ openDate: v.openDate, staffCost: +v.staffCost }); rerender(); toast('Settings saved');
      } else if (kind === 'member') {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email || '')) { $('#err-email').textContent = 'Enter a valid email address.'; f.email.focus(); return; }
        await upsert('team_members', { email: v.email.trim().toLowerCase(), name: v.name, role: v.role }); rerender(); toast(`${v.email} added. They can now sign in with an email link.`);
      }
    } catch (err) { fail(err, 'save that'); }
    finally { if (btn) btn.disabled = false; }
  });

  /* Pipeline drag and drop (the "Move to" select is the keyboard path) */
  document.addEventListener('dragstart', (e) => { const t = e.target.closest?.('[data-drag]'); if (!t) return; e.dataTransfer.setData('text/plain', t.dataset.drag); t.classList.add('dragging'); });
  document.addEventListener('dragend', (e) => { e.target.closest?.('[data-drag]')?.classList.remove('dragging'); document.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop')); });
  document.addEventListener('dragover', (e) => { const c = e.target.closest?.('[data-col]'); if (!c) return; e.preventDefault(); document.querySelectorAll('.col.drop').forEach((x) => x !== c && x.classList.remove('drop')); c.classList.add('drop'); });
  document.addEventListener('drop', async (e) => { const c = e.target.closest?.('[data-col]'); if (!c) return; e.preventDefault(); const p = partner(e.dataTransfer.getData('text/plain')); if (p && p.status !== c.dataset.col) { try { await upsert('partners', { ...p, status: c.dataset.col }); rerender(); toast(`${p.contact} moved to ${c.dataset.col}`); } catch (err) { fail(err, 'move that partner'); } } });

  window.addEventListener('hashchange', () => { if (document.body.classList.contains('signed-out')) return; route(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });

  /* ---------------- Sign-in (LIVE only) ---------------- */
  function signInView(msg = '') {
    document.body.classList.add('signed-out');
    $('[data-crumb]').innerHTML = ''; $('[data-title]').textContent = 'Sign in'; $('[data-subtitle]').textContent = 'Torus business development'; $('[data-actions]').innerHTML = '';
    view.innerHTML = `<section class="card signin"><h2>Sign in with your email</h2><p class="muted">We'll email you a one-time sign-in link. Only Torus team members can sign in.</p>
      <form class="grid" data-form="auth" novalidate><label class="field-label">Work email<input class="field" type="email" name="email" autocomplete="email" required aria-describedby="err-auth"><span class="err" id="err-auth" role="alert">${esc(msg)}</span></label>
      <div><button class="btn primary">Email me a sign-in link</button></div></form></section>`;
    $('[data-view] input').focus();
  }
  async function signIn(f, v) {
    const email = String(v.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('#err-auth').textContent = 'Enter your work email address.'; f.email.focus(); return; }
    const btn = f.querySelector('button'); btn.disabled = true;
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    btn.disabled = false;
    if (error) { $('#err-auth').textContent = 'We couldn’t send the link. Check the address and try again in a minute.'; return; }
    view.innerHTML = `<section class="card signin"><h2>Check your email</h2><p>We sent a sign-in link to <b>${esc(email)}</b>. Open it on this device to continue.</p><button class="btn" data-act="retry">Use a different email</button></section>`;
  }
  function footer() {
    $('[data-foot]').innerHTML = LIVE
      ? `<p class="who">${esc(session?.user?.email || '')}</p><button class="btn small" data-act="sign-out">Sign out</button>`
      : window.TORUS_DEMO?.footer ? `<p class="sample">${esc(window.TORUS_DEMO.footer)}</p>`
      : ui.demoInfo && !ui.demoInfo.error ? `<p class="sample">Sample upload · patient numbers come from ${esc(ui.demoInfo.file)} (${plural(ui.demoInfo.patients, 'row')}, de-identified). Partners and events are fictional.</p>`
      : '<p class="sample">Demo · sample data, all names and numbers are fictional</p>';
  }

  /* ---------------- Boot ---------------- */
  async function boot() {
    if (!LIVE) {
      document.body.classList.remove('signed-out');
      const demo = window.TORUS_DEMO;
      if (demo && demo.blank && !ui.demoInfo) { DATA = EMPTY(); DATA.partners = (demo.partners || []).map((p) => ({ next: '', nextStep: '', metAt: '', phone: '', ...p })); if (demo.openDate) DATA.settings.openDate = demo.openDate; }
      if (demo && demo.counts && !ui.demoInfo) {
        DATA.counts = demo.counts.map((c, i) => ({ consults: 0, converted: 0, revenue: 0, credit: '', ...c, id: 'R' + i }));
        ui.demoInfo = { file: demo.label || 'an IntakeQ export', patients: DATA.counts.reduce((s, c) => s + c.leads, 0), rows: DATA.counts.length, unmatched: 0, months: [...new Set(DATA.counts.map((c) => c.month))].sort(), note: demo.note || '' };
      }
      if (demo && demo.csv && !ui.demoInfo) {
        try {
          const text = await fetch(demo.csv, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
          const rows = parseCSV(text), map = { ...guessMap(rows[0].map((h) => h.trim())), via: CHANNELS[0] };
          const res = aggregateRows(rows.slice(1), map);
          DATA.counts = res.out.map((c, i) => ({ ...c, id: 'U' + i }));
          ui.demoInfo = { file: demo.csv, patients: res.patients, rows: res.out.length, unmatched: res.unmatched, months: [...new Set(res.out.map((c) => c.month))].sort() };
        } catch (err) { console.warn('sample upload failed', err); ui.demoInfo = { error: true, file: demo.csv }; }
      }
      footer(); route(); return;
    }
    try {
      if (!db) await connect();
      if (!session) { footer(); return signInView(); }
      document.body.classList.remove('signed-out'); footer();
      ui.state = 'loading'; route();
      await loadAll();
      if (!me) { document.body.classList.add('signed-out'); view.innerHTML = `<section class="card signin"><h2>You're signed in, but not on the Torus team list</h2><p class="muted">Ask a Torus admin to add ${esc(session.user.email)} in Settings, then reload this page.</p><button class="btn" data-act="sign-out">Sign out</button></section>`; return; }
      ui.state = 'ready'; route();
      if (!boot.subscribed) { subscribe(); boot.subscribed = true; }
    } catch (err) { console.warn(err); ui.state = 'error'; route(); }
  }
  await boot();
})();
