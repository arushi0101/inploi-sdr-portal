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
  const { hs, searchAll, assoc, batchReadPar, toMs, options, ownerNames, buildForms, buildReport, visitAlerts, alertScore, matchCo, normCo, SDRS, OWNER_NAMES, ICP_MIN, FORM_FLAGS, PORTAL } = X;
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
      if (id === '1709905072') return 'Jason (AE)'; if (id === '511871441') return 'Felix (AE)'; return OWNER_NAMES[id] || owners[id] || 'Another user'; };
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
      const coBucket = !e.coId ? 'No company linked' : coCreated && coCreated < Math.min(e.created, since) - 3600000 ? 'Company already in CRM' : 'Net new company';
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
    const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const d = ms => ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' }) : '–';
    const nice = s => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const HS = 'https://app-eu1.hubspot.com/contacts/25735731/record/';
    const th = 'style="text-align:left;padding:6px 8px;border-bottom:2px solid #222;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap"';
    const table = (head, rows, numCols) => rows.length ? '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin:6px 0 16px;width:100%">' +
      '<tr>' + head.map((h, i) => '<th ' + (numCols && i >= 1 && i <= numCols ? th.replace('text-align:left', 'text-align:right') : th) + '>' + esc(h) + '</th>').join('') + '</tr>' +
      rows.map(r => '<tr>' + r.map((v, i) => '<td style="padding:5px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top;' + (numCols && i >= 1 && i <= numCols ? 'text-align:right;' : '') + '">' + (v && v.html != null ? v.html : esc(v)) + '</td>').join('') + '</tr>').join('') + '</table>'
      : '<p style="color:#666;font-size:13px;margin:4px 0 16px">None this week.</p>';
    const h2 = t => '<h2 style="font-size:16px;margin:26px 0 4px;color:#111;border-top:1px solid #ddd;padding-top:14px">' + esc(t) + '</h2>';
    const h3 = t => '<h3 style="font-size:13px;margin:14px 0 2px;color:#333">' + esc(t) + '</h3>';
    const link = (txt, id, kind) => id ? { html: '<a href="' + HS + kind + '/' + id + '" style="color:#1a5fb4">' + esc(txt) + '</a>' } : txt;
    const kv = pairs => table(['Measure', 'Count'], pairs, 1);
    const S = D.S, touch = r => [d(r.lastTouch), d(r.lastContacted), r.by ? r.by + (r.byKind ? ' · ' + r.byKind : '') : 'No one yet'];
    let o = '<div style="font-family:Helvetica,Arial,sans-serif;color:#222;max-width:960px">' +
      '<h1 style="font-size:20px;margin:0 0 4px">Weekly inbound report · ' + esc(nice(D.from)) + ' to ' + esc(nice(D.to)) + '</h1>' +
      '<p style="margin:0 0 10px;color:#666;font-size:13px">UK time · From HubSpot and #inbound-visits · <a href="' + PORTAL + '/#inweekly">Open on the dashboard</a> (filters, drill-down, form dropdown)</p>';
    o += h2('Summary') + table(['Area', 'Count', 'Detail'], [
      ['Inbound leads (website forms, real)', S.inbound.leads, S.forms.assigned + ' assigned · ' + S.forms.unassigned + ' not assigned'],
      ['Companies on the website', S.visits.companies, S.visits.netNew + ' net new · ' + S.visits.qualified + ' qualified · ' + S.visits.netNewIcp + ' net new ICP'],
      ['Event leads', S.events.leads, S.events.icp + ' ICP fit · ' + S.events.netNewIcpCos + ' net new ICP companies'],
      ['SDR outreach: accounts', D.outreach ? D.outreach.total.cos : '–', D.outreach ? D.outreach.total.newCos + ' net new' : 'not available'],
      ['SDR outreach: contacts', D.outreach ? D.outreach.total.cons : '–', D.outreach ? D.outreach.total.newCons + ' net new' : 'not available']], 1);
    o += h2('Where inbound leads came from') + h3('By channel') + kv([['Website forms', S.inbound.leads], ['Website visits (companies)', S.inbound.visits], ['Events', S.inbound.events]]) +
      h3('Website forms by original traffic source') + table(['Source', 'Leads'], D.bySource.map(x => [x.name, x.n]), 1) +
      h3('Website forms by form') + table(['Form', 'Leads'], D.byForm.map(x => [x.name, x.n]), 1);
    o += h2('SDR outreach') + (D.outreach ? table(['SDR', 'Accounts', 'Net new accounts', 'Contacts', 'Net new contacts', 'Calls', 'Emails'],
      D.outreach.bySdr.map(x => [x.name, x.cos, x.newCos, x.cons, x.newCons, x.calls, x.emails]).concat([[{ html: '<b>Team</b>' }, D.outreach.total.cos, D.outreach.total.newCos, D.outreach.total.cons, D.outreach.total.newCons, D.outreach.total.calls, D.outreach.total.emails]]), 6) : '<p>Not available this run.</p>');
    o += h2('Form submissions') + kv([['All submissions', S.forms.total], ['Internal (inploi team)', S.forms.internal], ['External', S.forms.external], ['External: likely spam / disqualified on review', S.forms.spam],
      ['External: assigned to an SDR or AE', S.forms.assigned], ['External: not assigned', S.forms.unassigned], ['Assigned: not started', S.forms.notStarted], ['Assigned: in progress (being worked)', S.forms.inProgress],
      ['Assigned: qualified', S.forms.qualified], ['Disqualified', S.forms.disqualified], ['Existing customers', S.forms.customer]]);
    const fRow = r => [d(r.at), link(r.name, r.id, '0-1'), link(r.company, r.coId, '0-2'), r.form, r.source, r.owner, r.stage, r.status].concat(touch(r));
    const fHead = ['Submitted', 'Contact', 'Company', 'Form', 'Source', 'Owner', 'Stage', 'Lead status', 'Last touch', 'Last contacted', 'Last touched by'];
    o += h3('Not assigned') + table(fHead, D.forms.filter(r => !r.assigned && !r.spam).map(fRow));
    o += h3('Assigned') + table(fHead, D.forms.filter(r => r.assigned && !r.spam).map(fRow));
    if (S.forms.spam) o += h3('Spam / disqualified on review') + table(fHead, D.forms.filter(r => r.spam).map(fRow));
    o += h2('Website visits') + kv([['Companies on the website', S.visits.companies], ['Net new companies', S.visits.netNew], ['Qualified visits (ICP ' + ICP_MIN + '/10+)', S.visits.qualified], ['Disqualified visits (scored under ' + ICP_MIN + ')', S.visits.disqualified], ['Not scored yet', S.visits.unscored], ['Net new ICP companies', S.visits.netNewIcp], ['Matched to a HubSpot company', S.visits.inCrm]]) +
      table(['First visit', 'Company', 'Visits', 'ICP score', 'Verdict', 'Net new', 'Account status', 'SDR Owner', 'Company owner', 'Last touch', 'Last contacted', 'Last touched by'],
        D.visits.map(v => [d(v.at), v.coId ? link(v.name, v.coId, '0-2') : v.name + ' (not in HubSpot)', v.visits, v.score == null ? '–' : v.score + '/10', v.verdict, v.netNew ? (v.netNewIcp ? 'Yes · ICP' : 'Yes') : 'No', v.customer ? 'Customer' : v.accountStatus, v.sdr, v.owner].concat(touch(v))));
    o += h2('Events') + kv([['Event leads', S.events.leads], ['ICP fit', S.events.icp], ['ICP fit: company already in CRM', S.events.icpExisting], ['ICP fit: net new company', S.events.icpNew], ['Net new ICP companies created', S.events.netNewIcpCos],
      ['Not ICP', S.events.notIcp], ['ICP not checked yet', S.events.unchecked], ['Existing contacts (already in CRM)', S.events.existingContacts], ['New contact, company already in CRM', S.events.newContactExistingCo], ['Net new contact and company', S.events.netNew], ['No company linked', S.events.noCompany]]) +
      (D.byEvent.length > 1 ? h3('By event') + table(['Event', 'Leads'], D.byEvent.map(x => [x.name || 'Event not set', x.n]), 1) : '') +
      table(['Added', 'Contact', 'Company', 'Event', 'ICP', 'In CRM?', 'Owner', 'Lead status', 'Last touch', 'Last contacted', 'Last touched by'],
        D.events.map(e => [d(e.at), link(e.name, e.id, '0-1'), link(e.company, e.coId, '0-2'), e.event, e.icp + (e.icpTier ? ' · ' + e.icpTier : ''), e.bucket, e.owner, e.status].concat(touch(e))));
    o += '<p style="color:#666;font-size:12px;margin-top:20px">Stages for assigned form leads: Qualified = open deal, meeting booked or Visible Opportunity; Disqualified = Not Qualified, Lost, Do Not Contact, Bounced, or flagged as spam; In progress = being worked (No Two-Way / Two-Way / Engaged, or touched since the form); Not started = no touch since the form. Last touched by = the latest call, email, meeting or LinkedIn message on the record.</p></div>';
    return { subject: 'Weekly inbound report · ' + nice(D.from) + ' to ' + nice(D.to), html: o, counts: S };
  }
  return { build, email };
};
