/* Weekly inbound report: Inbound › Weekly report on the dashboard, and the Friday email to Arushi.
   One model for both: api/data?part=inweek[&day=YYYY-MM-DD] (JSON) and &fmt=email ({subject, html}).
   The week is Monday to Sunday (UK), cut at today.
   - Inbound leads: external website form submissions (not spam, not internal, not tests), by form and by original traffic source.
   - SDR outreach: accounts and contacts the SDRs called or emailed, and how many were net new (same rules as the weekly report).
   - Forms: internal vs external; external assigned vs not; assigned split into Not started / In progress / Qualified / Disqualified.
   - Website visits: companies from the Dealfront alerts; qualified = ICP score 6/10+, disqualified = scored under 6; net new and net new ICP.
   - Events: contacts with Lead Source = Event created this week (net new), plus existing contacts tagged with an event this week.
     ICP fit = the company's ICP Fit (Clay). Company already in the CRM vs net new company, net new ICP companies.
   Every row carries last touch (last activity), last contacted, and who made that last touch (calls, emails, meetings, LinkedIn). */
module.exports = function (X) {
  const { hs, searchAll, assoc, batchReadPar, toMs, options, ownerNames, buildForms, buildReport, visitAlerts, alertScore, matchCo, normCo, SDRS, OWNER_NAMES, ICP_MIN, FORM_FLAGS, PORTAL, FORM_OWNER_LABEL } = X;
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ukStart = d => { const t = Date.parse(d + 'T00:00:00Z'); const off = Date.parse(new Date(t).toLocaleString('en-US', { timeZone: 'Europe/London' })) - Date.parse(new Date(t).toLocaleString('en-US', { timeZone: 'UTC' })); return t - off; };
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const SRC = { ORGANIC_SEARCH: 'Organic search', PAID_SEARCH: 'Paid search', EMAIL_MARKETING: 'Email marketing', SOCIAL_MEDIA: 'Organic social', REFERRALS: 'Referrals', OTHER_CAMPAIGNS: 'Other campaigns', DIRECT_TRAFFIC: 'Direct traffic', OFFLINE: 'Offline sources', PAID_SOCIAL: 'Paid social', AI_REFERRALS: 'AI referrals' };
  const DQ = /^(not qualified|lost|do not contact|non-sales contact|bounced|left organi[sz]ation)$/i;
  const QL = /^(discovery meeting booked|nbm booked|visible opportunity)$/i;
  const WIP = /^(no two-way contact|two-way contact|engaged)$/i;

  // who made the latest call, outgoing email, meeting or LinkedIn message on each record (newest 15 of each kind)
  async function lastTouchBy(type, ids) {
    const out = {}; ids = [...new Set(ids.filter(Boolean).map(String))]; if (!ids.length) return out;
    const kinds = ['calls', 'emails', 'meetings', 'communications'], label = { calls: 'Call', emails: 'Email', meetings: 'Meeting', communications: 'LinkedIn' };
    const A = await Promise.all(kinds.map(k => assoc(type, k, ids).catch(() => ({}))));
    const want = kinds.map((k, i) => { const s = new Set(); ids.forEach(id => (A[i][id] || []).slice().sort((a, b) => Number(b) - Number(a)).slice(0, 15).forEach(x => s.add(x))); return [...s]; });
    const P = await Promise.all(kinds.map((k, i) => want[i].length ? batchReadPar(k, want[i], ['hs_timestamp', 'hubspot_owner_id', 'hs_email_direction', 'hs_communication_channel_type']).catch(() => ({})) : {}));
    const now = Date.now();
    ids.forEach(id => { let best = null;
      kinds.forEach((k, i) => (A[i][id] || []).forEach(x => { const p = P[i][x]; if (!p) return;
        if (k === 'emails' && p.hs_email_direction !== 'EMAIL') return;
        const t = toMs(p.hs_timestamp); if (t == null || t > now) return;
        if (!best || t > best.at) best = { at: t, ownerId: p.hubspot_owner_id || '', kind: label[k] }; }));
      out[id] = best; });
    return out;
  }

  async function build(q) {
    const today = ymd.format(new Date());
    let anchor = q && /^\d{4}-\d{2}-\d{2}$/.test(q.day || '') && q.day <= today ? q.day : today;
    const wd = (new Date(anchor + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const from = addDays(anchor, -wd), sun = addDays(from, 6), to = sun < today ? sun : today;
    const since = ukStart(from), until = ukStart(to) + 86400000;
    const owners = await ownerNames();
    const person = id => { id = String(id || ''); if (!id) return ''; const s = SDRS.find(x => x.id === id); if (s) return s.short + ' (SDR)';
      if (id === '1709905072') return 'Jason (AE)'; if (id === '511871441') return 'Felix (AE)'; return (FORM_OWNER_LABEL || {})[id] || OWNER_NAMES[id] || owners[id] || 'Another user'; };
    const touchOf = (lt, last, contacted) => ({ lastTouch: toMs(last) || 0, lastContacted: toMs(contacted) || 0, by: lt ? person(lt.ownerId) : '', byKind: lt ? lt.kind : '', byAt: lt ? lt.at : 0 });

    const [F, R, alerts, events, evOpts] = await Promise.all([
      buildForms({ from, to }),
      buildReport({ span: 'week', day: from }).catch(e => ({ error: String(e.message || e) })),
      visitAlerts().catch(() => []),
      eventLeads(since, until),
      options('contacts', 'event')
    ]);

    /* ---- forms ---- */
    const ext = F.external, intl = F.internal;
    const cp = ext.length ? await batchReadPar('contacts', ext.map(r => r.id), ['hs_analytics_source', 'hs_analytics_source_data_1', 'notes_last_contacted', 'notes_last_updated']) : {};
    const ltC = await lastTouchBy('contacts', ext.map(r => r.id));
    const forms = ext.map(r => {
      const p = cp[r.id] || {}, co = r.co || {};
      let stage;
      if (r.spam) stage = 'Disqualified';
      else if (!r.assigned) stage = 'Not assigned';
      else if (r.bucket === 'customer') stage = 'Existing customer';
      else if (r.bucket === 'pipeline' || QL.test(r.status) || /meeting booked|opportunit/i.test(co.accountStatus || '')) stage = 'Qualified';
      else if (DQ.test(r.status) || /disqualif|not interested/i.test(co.accountStatus || '')) stage = 'Disqualified';
      else if (WIP.test(r.status) || (ltC[r.id] && ltC[r.id].at > r.at)) stage = 'In progress';
      else stage = 'Not started';
      const t = touchOf(ltC[r.id], Math.max(toMs(p.notes_last_updated) || 0, co.touch || 0), p.notes_last_contacted);
      return Object.assign({ id: r.id, at: r.at, name: r.name, title: r.title, company: co.name || r.company, coId: r.coId, form: r.formLabel + (r.site ? ': ' + r.site : ''), formType: r.formLabel,
        source: SRC[p.hs_analytics_source] || p.hs_analytics_source || 'Unknown', sourceDetail: p.hs_analytics_source_data_1 || '',
        assigned: r.assigned, owner: r.owner, sdr: co.sdr || '', status: r.status || 'No lead status', accountStatus: co.accountStatus || '', stage, spam: r.spam, note: r.note || '' }, t);
    });
    const real = forms.filter(r => !r.spam);

    /* ---- outreach ---- */
    let outreach = null;
    if (R && R.ACT) {
      const per = SDRS.map(s => ({ name: s.short, cos: new Set(), cons: new Set(), newCos: 0, newCons: 0, calls: 0, emails: 0 }));
      const NC = new Set(R.NEWCO.map(String)), NN = new Set(R.NEWCON.map(String)), firstCo = {}, firstCon = {};
      R.ACT.slice().sort((a, b) => a[0] - b[0]).forEach(a => { if (a[2] === 'r') return; const x = per[a[1]]; if (!x) return;
        if (a[2] === 'c') x.calls++; else x.emails++;
        a[4].forEach(id => { x.cos.add(String(id)); if (firstCo[id] == null) firstCo[id] = a[1]; });
        a[5].forEach(id => { x.cons.add(String(id)); if (firstCon[id] == null) firstCon[id] = a[1]; }); });
      Object.keys(firstCo).forEach(id => { if (NC.has(String(id))) per[firstCo[id]].newCos++; });
      Object.keys(firstCon).forEach(id => { if (NN.has(String(id))) per[firstCon[id]].newCons++; });
      const allCo = new Set(Object.keys(firstCo)), allCon = new Set(Object.keys(firstCon));
      outreach = { bySdr: per.map(x => ({ name: x.name, cos: x.cos.size, newCos: x.newCos, cons: x.cons.size, newCons: x.newCons, calls: x.calls, emails: x.emails })),
        total: { cos: allCo.size, newCos: NC.size, cons: allCon.size, newCons: NN.size, calls: per.reduce((t, x) => t + x.calls, 0), emails: per.reduce((t, x) => t + x.emails, 0) } };
    }

    /* ---- website visits ---- */
    const firstSeen = {}; alerts.forEach(a => { const k = normCo(a.name) || a.name.toLowerCase(); if (firstSeen[k] == null) firstSeen[k] = a.at; });
    const inWeek = alerts.filter(a => a.at >= since && a.at < until), byCo = {};
    inWeek.forEach(a => { const k = normCo(a.name) || a.name.toLowerCase(); const x = byCo[k] || (byCo[k] = { k, name: a.name, first: a.at, last: a.at, alerts: [], visits: 0 }); x.alerts.push(a); x.visits++; x.last = Math.max(x.last, a.at); });
    const V = Object.values(byCo);
    for (let i = 0; i < V.length; i += 4) await Promise.all(V.slice(i, i + 4).map(async v => {
      let score = null; for (const a of v.alerts) { const s = await alertScore(a); if (s != null) score = s; }
      if (score == null) { // a repeat company without a scored alert this week: its latest known score
        const prev = alerts.filter(a => (normCo(a.name) || a.name.toLowerCase()) === v.k && a.at < since && a.replies).slice(-3);
        for (const a of prev) { const s = await alertScore(a); if (s != null) score = s; } }
      v.score = score; v.link = 'https://inploi.slack.com/archives/C0BLTRVSEKA/p' + v.alerts[0].ts.replace('.', '');
      try { const c = await matchCo(v.name); v.coId = c ? String(c.id) : ''; } catch (e) { v.coId = ''; } }));
    const vIds = V.map(v => v.coId).filter(Boolean);
    const [vco, ltV] = await Promise.all([vIds.length ? batchReadPar('companies', vIds, ['name', 'hubspot_owner_id', 'sdr_owner', 'account_status', 'lifecyclestage', 'notes_last_updated', 'notes_last_contacted', 'sdr_icp_fit', 'createdate']) : {}, lastTouchBy('companies', vIds)]);
    const visits = V.map(v => { const c = vco[v.coId] || {};
      const netNew = firstSeen[v.k] >= since, icp = v.score != null && v.score >= ICP_MIN;
      return Object.assign({ name: v.name, at: v.first, visits: v.visits, score: v.score, verdict: v.score == null ? 'Not scored' : icp ? 'Qualified' : 'Disqualified', netNew, netNewIcp: netNew && icp,
        coId: v.coId, inCrm: !!v.coId, hubspotName: c.name || '', owner: person(c.hubspot_owner_id), sdr: c.sdr_owner || '', accountStatus: c.account_status || '', customer: c.lifecyclestage === 'customer', link: v.link },
        touchOf(ltV[v.coId], c.notes_last_updated, c.notes_last_contacted)); }).sort((a, b) => b.at - a.at);

    /* ---- events ---- */
    const coIds = [...new Set(events.map(e => e.coId).filter(Boolean))];
    const [eco, ltE] = await Promise.all([coIds.length ? batchReadPar('companies', coIds, ['name', 'createdate', 'sdr_icp_fit', 'sdr_icp_tier', 'sdr_icp_status', 'hubspot_owner_id', 'sdr_owner', 'account_status', 'lifecyclestage', 'notes_last_updated', 'notes_last_contacted']) : {}, lastTouchBy('contacts', events.map(e => e.id))]);
    const ev = events.map(e => { const c = eco[e.coId] || {};
      const coCreated = toMs(c.createdate) || 0, icpRaw = String(c.sdr_icp_fit || '').toUpperCase();
      const coBucket = !e.coId ? 'No company linked' : coCreated && coCreated < (e.existing ? since : e.created - 3600000) ? 'Company already in CRM' : 'Net new company';
      const bucket = e.existing ? 'Existing contact' : coBucket === 'Company already in CRM' ? 'New contact, company already in CRM' : coBucket === 'Net new company' ? 'Net new contact and company' : 'New contact, no company';
      return Object.assign({ id: e.id, name: e.name, title: e.title, company: c.name || e.company, coId: e.coId, event: evOpts[e.event] || e.event || '', at: e.at, existing: e.existing,
        bucket, coBucket, icp: icpRaw === 'YES' ? 'ICP fit' : icpRaw === 'NO' ? 'Not ICP' : 'Not checked', icpTier: c.sdr_icp_tier || '', icpReview: /^REVIEW/i.test(c.sdr_icp_status || ''),
        customer: c.lifecyclestage === 'customer', accountStatus: c.account_status || '', status: e.status, owner: person(e.ownerId) || 'No owner', sdr: c.sdr_owner || '' },
        touchOf(ltE[e.id], Math.max(toMs(e.lastUpdated) || 0, toMs(c.notes_last_updated) || 0), e.lastContacted || c.notes_last_contacted)); }).sort((a, b) => b.at - a.at);

    const count = (L, f) => L.filter(f).length;
    const S = {
      inbound: { leads: real.length, visits: visits.length, events: ev.length },
      forms: { total: forms.length + intl.length, internal: intl.length, external: forms.length, spam: count(forms, r => r.spam), assigned: count(real, r => r.assigned), unassigned: count(real, r => !r.assigned),
        notStarted: count(real, r => r.stage === 'Not started'), inProgress: count(real, r => r.stage === 'In progress'), qualified: count(real, r => r.stage === 'Qualified'), disqualified: count(forms, r => r.stage === 'Disqualified'), customer: count(real, r => r.stage === 'Existing customer') },
      visits: { companies: visits.length, netNew: count(visits, v => v.netNew), qualified: count(visits, v => v.verdict === 'Qualified'), disqualified: count(visits, v => v.verdict === 'Disqualified'), unscored: count(visits, v => v.verdict === 'Not scored'), netNewIcp: count(visits, v => v.netNewIcp), inCrm: count(visits, v => v.inCrm) },
      events: { leads: ev.length, icp: count(ev, e => e.icp === 'ICP fit'), icpExisting: count(ev, e => e.icp === 'ICP fit' && e.coBucket === 'Company already in CRM'), icpNew: count(ev, e => e.icp === 'ICP fit' && e.coBucket === 'Net new company'),
        notIcp: count(ev, e => e.icp === 'Not ICP'), unchecked: count(ev, e => e.icp === 'Not checked'), existingContacts: count(ev, e => e.existing), newContactExistingCo: count(ev, e => e.bucket === 'New contact, company already in CRM'),
        netNew: count(ev, e => e.bucket === 'Net new contact and company'), noCompany: count(ev, e => e.coBucket === 'No company linked'),
        netNewIcpCos: new Set(ev.filter(e => e.icp === 'ICP fit' && e.coBucket === 'Net new company').map(e => e.coId)).size }
    };
    const tally = (L, k) => { const m = {}; L.forEach(r => { m[r[k]] = (m[r[k]] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })); };
    return { generatedAt: new Date().toISOString(), from, to, sunday: sun, today, S, bySource: tally(real, 'source'), byForm: tally(real, 'form'), byFormType: tally(real, 'formType'), byEvent: tally(ev, 'event'),
      outreach, outreachError: R && R.error || null, forms, internal: intl.map(r => ({ id: r.id, name: r.name, at: r.at, form: r.formLabel + (r.site ? ': ' + r.site : '') })), visits, events: ev };
  }

  // contacts with Lead Source = Event created this week, and older contacts whose Event or Lead Source was set this week
  async function eventLeads(since, until) {
    const props = ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'createdate', 'event', 'hubspot_owner_id', 'hs_lead_status', 'associatedcompanyid', 'notes_last_updated', 'notes_last_contacted'];
    const [fresh, touched, ls] = await Promise.all([
      searchAll('contacts', [{ filters: [{ propertyName: 'lead_source', operator: 'EQ', value: 'Event' }, { propertyName: 'createdate', operator: 'GTE', value: String(since) }, { propertyName: 'createdate', operator: 'LT', value: String(until) }] }], props, 'createdate'),
      searchAll('contacts', [{ filters: [{ propertyName: 'lead_source', operator: 'EQ', value: 'Event' }, { propertyName: 'createdate', operator: 'LT', value: String(since) }, { propertyName: 'lastmodifieddate', operator: 'GTE', value: String(since) }] }], ['createdate'], 'createdate').catch(() => []),
      options('contacts', 'hs_lead_status')
    ]);
    const row = (c, existing, at) => { const p = c.properties || {}; return { id: String(c.id), name: [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email || 'Unnamed contact', title: p.jobtitle || '', company: p.company || '',
      coId: p.associatedcompanyid || '', event: p.event || '', created: toMs(p.createdate) || 0, at: at || toMs(p.createdate) || 0, existing, ownerId: p.hubspot_owner_id || '', status: ls[p.hs_lead_status] || p.hs_lead_status || 'No lead status',
      lastUpdated: p.notes_last_updated, lastContacted: p.notes_last_contacted }; };
    const out = fresh.map(c => row(c, false));
    // existing contacts: only those whose Event / Lead Source actually changed this week
    const cand = touched.slice(0, 300).map(c => String(c.id));
    for (let i = 0; i < cand.length; i += 50) {
      const r = await hs('/crm/v3/objects/contacts/batch/read', { inputs: cand.slice(i, i + 50).map(id => ({ id })), properties: props, propertiesWithHistory: ['event', 'lead_source'] }).catch(() => ({ results: [] }));
      (r.results || []).forEach(c => { const h = c.propertiesWithHistory || {};
        const t = [].concat(h.event || [], h.lead_source || []).map(x => Date.parse(x.timestamp)).filter(x => x >= since && x < until);
        if (t.length) out.push(row(c, true, Math.min(...t))); });
    }
    return out;
  }

  /* ---- the email ---- */
  function email(D) {
    // Gmail drops <style> blocks: every style is inline. Layout is table-based for email clients.
    const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const d = ms => ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' }) : '';
    const nice = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const HS = 'https://app-eu1.hubspot.com/contacts/25735731/record/';
    const F = 'font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;';
    const INK = '#1b1a19', MUTED = '#77716b', LINE = '#ece9e4', ACC = '#ff4d00';
    const PILL = { Qualified: ['#0e7a46', '#e3f4ea'], 'ICP fit': ['#0e7a46', '#e3f4ea'], Disqualified: ['#b4321b', '#fbe9e4'], 'Not ICP': ['#b4321b', '#fbe9e4'], 'In progress': ['#1f5fbf', '#e7effb'], 'Not started': ['#8a5a00', '#fbf0d9'], 'Not assigned': ['#8a5a00', '#fbf0d9'], 'Not scored': ['#8a5a00', '#fbf0d9'], 'Not checked': ['#8a5a00', '#fbf0d9'], 'Net new': ['#5b4bc4', '#efecfb'], 'Existing customer': ['#555', '#efede9'] };
    const pill = t => { const c = PILL[t] || ['#555', '#efede9']; return '<span style="' + F + 'display:inline-block;white-space:nowrap;font-size:11px;font-weight:600;line-height:16px;padding:2px 9px;border-radius:99px;color:' + c[0] + ';background:' + c[1] + '">' + esc(t) + '</span>'; };
    const a = (txt, id, kind) => id ? '<a href="' + HS + kind + '/' + id + '" style="color:' + INK + ';font-weight:600;text-decoration:none">' + esc(txt) + '</a>' : '<span style="font-weight:600">' + esc(txt) + '</span>';
    const sub = t => t ? '<div style="font-size:12px;color:' + MUTED + ';margin-top:2px">' + t + '</div>' : '';
    const TD = 'padding:10px 12px;border-bottom:1px solid ' + LINE + ';vertical-align:top;font-size:13px;color:' + INK + ';' + F;
    const TH = 'padding:8px 12px;background:#faf9f7;border-bottom:1px solid ' + LINE + ';text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:' + MUTED + ';font-weight:700;white-space:nowrap;' + F;
    const grid = (head, rows, right) => rows.length ? '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ' + LINE + ';border-radius:10px">' +
      '<tr>' + head.map((h, i) => '<th style="' + TH + ((right || []).includes(i) ? 'text-align:right;' : '') + '">' + esc(h) + '</th>').join('') + '</tr>' +
      rows.map(r => '<tr>' + r.map((v, i) => '<td style="' + TD + ((right || []).includes(i) ? 'text-align:right;white-space:nowrap;' : '') + '">' + v + '</td>').join('') + '</tr>').join('') + '</table>'
      : '<div style="' + F + 'font-size:13px;color:' + MUTED + ';padding:14px 0">None this week.</div>';
    // a metric list with bars: [[label, n, colour, indent]]
    const bars = (items, max) => '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + items.map(([l, n, col, ind]) => {
      const w = Math.max(2, Math.round((n || 0) / Math.max(1, max) * 100));
      return '<tr><td style="' + F + 'font-size:13px;color:' + (ind ? MUTED : INK) + ';padding:7px 0 3px ' + (ind ? '14px' : '0') + '">' + esc(l) + '</td><td style="' + F + 'font-size:13px;font-weight:700;text-align:right;padding:7px 0 3px;color:' + INK + '">' + n + '</td></tr>' +
        '<tr><td colspan="2" style="padding:0 0 4px ' + (ind ? '14px' : '0') + '"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:' + LINE + ';height:5px;border-radius:3px;font-size:0;line-height:0"><table width="' + w + '%" cellpadding="0" cellspacing="0"><tr><td style="background:' + (col || ACC) + ';height:5px;border-radius:3px;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr></table></td></tr>';
    }).join('') + '</table>';
    const card = (title, desc, body) => '<tr><td style="padding:0 0 16px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ' + LINE + ';border-radius:12px"><tr><td style="padding:20px 22px">' +
      '<div style="' + F + 'font-size:16px;font-weight:700;color:' + INK + '">' + esc(title) + '</div>' + (desc ? '<div style="' + F + 'font-size:12px;color:' + MUTED + ';margin:3px 0 0">' + esc(desc) + '</div>' : '') +
      '<div style="height:14px;line-height:14px;font-size:0">&nbsp;</div>' + body + '</td></tr></table></td></tr>';
    const two = (l, r) => '<table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48%" valign="top">' + l + '</td><td width="4%"></td><td width="48%" valign="top">' + r + '</td></tr></table>';
    const h4 = t => '<div style="' + F + 'font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:' + MUTED + ';font-weight:700;margin:4px 0 4px">' + esc(t) + '</div>';
    const gap = '<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>';
    const touch = r => (r.lastTouch ? '<span style="white-space:nowrap">' + d(r.lastTouch) + '</span>' : '<span style="color:' + MUTED + '">No touch yet</span>') +
      sub((r.by ? esc(r.by) + (r.byKind ? ' · ' + esc(r.byKind) : '') : 'No one yet') + (r.lastContacted ? '<br>Contacted ' + d(r.lastContacted) : ''));
    const S = D.S, O = D.outreach, G = { q: '#1f9d5c', d: '#d2553a', w: '#3a7be0', n: '#d9a227' };

    let o = '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee"><tr><td align="center" style="padding:24px 12px">' +
      '<table width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%">';
    // header band
    o += '<tr><td style="padding:0 0 16px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#171513;border-radius:14px"><tr><td style="padding:24px 26px">' +
      '<div style="' + F + 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:' + ACC + ';font-weight:700">inploi · SDR inbound</div>' +
      '<div style="' + F + 'font-size:24px;font-weight:700;color:#fff;margin-top:6px">Weekly inbound report</div>' +
      '<div style="' + F + 'font-size:14px;color:#c9c3bc;margin-top:4px">' + esc(nice(D.from)) + ' – ' + esc(nice(D.to)) + ' · UK time</div>' +
      '</td><td align="right" valign="middle" style="padding:24px 26px"><a href="' + PORTAL + '/#inweekly" style="' + F + 'display:inline-block;background:' + ACC + ';color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 16px;border-radius:8px">Open dashboard</a></td></tr></table></td></tr>';
    // KPI cards
    const kpi = (label, v, s) => '<td width="20%" valign="top" style="padding:0 4px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid ' + LINE + ';border-radius:12px"><tr><td style="padding:14px 14px 13px">' +
      '<div style="' + F + 'font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:' + MUTED + ';font-weight:700">' + esc(label) + '</div>' +
      '<div style="' + F + 'font-size:28px;font-weight:700;color:' + INK + ';line-height:34px;margin-top:6px">' + esc(v) + '</div>' +
      '<div style="' + F + 'font-size:11px;color:' + MUTED + ';margin-top:2px">' + esc(s) + '</div></td></tr></table></td>';
    o += '<tr><td style="padding:0 0 16px"><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 -4px"><tr>' +
      kpi('Inbound leads', S.inbound.leads, S.forms.assigned + ' assigned · ' + S.forms.unassigned + ' unassigned') +
      kpi('Website companies', S.visits.companies, S.visits.netNew + ' net new · ' + S.visits.netNewIcp + ' new ICP') +
      kpi('Event leads', S.events.leads, S.events.icp + ' ICP fit') +
      kpi('Accounts reached', O ? O.total.cos : '–', O ? O.total.newCos + ' net new' : '') +
      kpi('Contacts reached', O ? O.total.cons : '–', O ? O.total.newCons + ' net new' : '') + '</tr></table></td></tr>';

    // where from
    const srcMax = Math.max(1, ...D.bySource.map(x => x.n)), formMax = Math.max(1, ...D.byForm.map(x => x.n));
    o += card('Where inbound came from', 'Website forms count real external leads (no spam, internal or tests).',
      bars([['Website forms (leads)', S.inbound.leads], ['Website visits (companies)', S.inbound.visits], ['Event leads', S.inbound.events]], Math.max(S.inbound.leads, S.inbound.visits, S.inbound.events)) + gap +
      two(h4('Form leads by traffic source') + (D.bySource.length ? bars(D.bySource.map(x => [x.name, x.n]), srcMax) : sub('None')),
          h4('Form leads by form') + (D.byForm.length ? bars(D.byForm.map(x => [x.name, x.n]), formMax) : sub('None'))));

    // forms
    const fRow = r => [a(r.name, r.id, '0-1') + sub(esc(r.title)) + sub(a(r.company, r.coId, '0-2').replace('font-weight:600', 'font-weight:500;color:' + MUTED)),
      esc(r.form) + sub(esc(r.source) + ' · ' + d(r.at)), esc(r.owner), pill(r.stage) + sub(esc(r.status)), touch(r)];
    const fHead = ['Lead', 'Form', 'Owner', 'Stage', 'Last touch'];
    o += card('Form submissions', S.forms.total + ' submissions this week: ' + S.forms.external + ' external, ' + S.forms.internal + ' internal.',
      two(bars([['External leads', S.forms.external - S.forms.spam], ['Assigned', S.forms.assigned, null, 1], ['Not assigned', S.forms.unassigned, G.n, 1], ['Spam (disqualified on review)', S.forms.spam, G.d, 1]], Math.max(1, S.forms.external)),
          bars([['Not started', S.forms.notStarted, G.n], ['In progress', S.forms.inProgress, G.w], ['Qualified', S.forms.qualified, G.q], ['Disqualified', S.forms.disqualified, G.d]], Math.max(1, S.forms.assigned + S.forms.spam))) + gap +
      h4('Not assigned') + grid(fHead, D.forms.filter(r => !r.assigned && !r.spam).map(fRow)) + gap +
      h4('Assigned') + grid(fHead, D.forms.filter(r => r.assigned && !r.spam).map(fRow)) +
      (S.forms.spam ? gap + h4('Spam / disqualified on review') + grid(fHead, D.forms.filter(r => r.spam).map(fRow)) : ''));

    // visits
    o += card('Website visits', 'Companies from the Dealfront alerts. Qualified = ICP score ' + ICP_MIN + '/10+; net new = first-ever alert this week.',
      bars([['Companies on the website', S.visits.companies], ['Net new companies', S.visits.netNew, null, 1], ['Qualified visits', S.visits.qualified, G.q, 1], ['Disqualified visits', S.visits.disqualified, G.d, 1], ['Net new ICP companies', S.visits.netNewIcp, G.q, 1]], Math.max(1, S.visits.companies)) + gap +
      grid(['Company', 'ICP', 'Status', 'SDR', 'Last touch'], D.visits.map(v => [(v.coId ? a(v.name, v.coId, '0-2') : a(v.name) + sub('Not in HubSpot')) + sub(d(v.at) + ' · ' + v.visits + ' visit' + (v.visits === 1 ? '' : 's') + (v.netNew ? ' · net new' : '')),
        (v.score == null ? '' : '<b>' + v.score + '/10</b><br>') + pill(v.verdict), esc(v.customer ? 'Customer' : v.accountStatus || '–'), esc(v.sdr || '–'), touch(v)])));

    // events
    const evRows = D.events.slice(0, 60);
    o += card('Events', 'Leads from the events sheet, by event date. ICP fit is the sheet’s “Company Fits ICP Matrix?”.',
      two(bars([['Event leads', S.events.leads], ['ICP fit', S.events.icp, G.q, 1], ['Not ICP', S.events.notIcp, G.d, 1], ['Not checked', S.events.unchecked, G.n, 1]], Math.max(1, S.events.leads)),
          bars([['ICP: company already in CRM', S.events.icpExisting], ['ICP: net new company', S.events.icpNew], ['Existing contacts', S.events.existingContacts], ['Net new contact and company', S.events.netNew]], Math.max(1, S.events.leads))) +
      (D.byEvent.length ? gap + h4('By event') + bars(D.byEvent.map(x => [x.name || 'Event not set', x.n]), Math.max(1, ...D.byEvent.map(x => x.n))) : '') + gap +
      grid(['Lead', 'Event', 'ICP', 'In the CRM', 'Last touch'], evRows.map(e => [a(e.name, e.id, '0-1') + sub(esc(e.title)) + sub(a(e.company, e.coId, '0-2').replace('font-weight:600', 'font-weight:500;color:' + MUTED)),
        esc(e.event || '–'), pill(e.icp) + sub(esc(e.icpTier)), esc(e.bucket), touch(e)])) +
      (D.events.length > evRows.length ? sub('Showing ' + evRows.length + ' of ' + D.events.length + '. The full list is on the dashboard.') : ''));

    // outreach
    if (O) o += card('SDR outreach', 'Accounts and contacts each SDR called or emailed. Net new = no SDR call or email earlier this year.',
      grid(['SDR', 'Accounts', 'Net new', 'Contacts', 'Net new', 'Calls', 'Emails'], O.bySdr.map(x => ['<b>' + esc(x.name) + '</b>', x.cos, '<b>' + x.newCos + '</b>', x.cons, '<b>' + x.newCons + '</b>', x.calls, x.emails])
        .concat([['<b>Team</b>', '<b>' + O.total.cos + '</b>', '<b>' + O.total.newCos + '</b>', '<b>' + O.total.cons + '</b>', '<b>' + O.total.newCons + '</b>', '<b>' + O.total.calls + '</b>', '<b>' + O.total.emails + '</b>']]), [1, 2, 3, 4, 5, 6]));

    o += '<tr><td style="' + F + 'font-size:11px;line-height:17px;color:' + MUTED + ';padding:4px 6px 0">Stages for assigned form leads: Qualified = open deal, meeting booked or Visible Opportunity · Disqualified = Not Qualified, Lost, Do Not Contact, Bounced, or spam · In progress = No Two-Way / Two-Way / Engaged, or touched since the form · Not started = no touch since the form. Last touch shows who made the latest call, email, meeting or LinkedIn message.</td></tr>';
    o += '</table></td></tr></table>';
    return { subject: 'Weekly inbound report · ' + nice(D.from) + ' – ' + nice(D.to), html: o, counts: S };
  }
  return { build, email };
};
