#!/usr/bin/env python3
"""Events sheet -> api/_events.json (the source of truth for events across the dashboard, the Friday email and reports).

Arushi, 17 Nov 2026: "Always use the events sheet as the source of truth for events; it should be the same all across."
Sheet: EVENTS LEADS LISTS 26 (Drive id 1OoIRFayF6pS4yO4RmU8oPhQo7RKA9S6HLhaOUWLMjKc), one tab per event.

Usage (run by the end-of-day scheduled task, or by hand):
  1. Download the sheet as .xlsx (Drive download_file_content, export xlsx) into a scratch folder.
  2. Fetch HubSpot matches into the same folder (read-only):
       hs_event_contacts.json  contacts with Lead Source = Event   [{id, first, last, email, company, coId, created}]
       hs_email_contacts.json  contacts found by the sheet's emails (same shape)
       hs_companies.json       companies by the sheet's company names / email domains, plus every coId above
                               [{id, name, domain, created, icpFit}]
  3. python3 -I scripts/events_sync.py <scratch folder>   -> writes api/_events.json, prints a summary and
     <scratch>/icp_updates.json (companies whose empty ICP Fit can be filled from the sheet).

The JSON keeps no personal data: no names, emails, titles or phone numbers. People are HubSpot contact IDs;
companies are names (business data) and HubSpot company IDs. The API reads names and owners from HubSpot at request time.
"""
import json, re, sys, os, datetime, unicodedata

SHEET_ID = '1OoIRFayF6pS4yO4RmU8oPhQo7RKA9S6HLhaOUWLMjKc'
SKIP_TABS = {'TEMPLATE', 'MASTERSHEET'}
MONTHS = {m: i + 1 for i, m in enumerate(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'])}
FREE = re.compile(r'@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|aol|btinternet|me|proton(mail)?)\.', re.I)


def norm(t):
    t = unicodedata.normalize('NFKD', str(t or '')).encode('ascii', 'ignore').decode().lower()
    t = t.replace('&', ' and ')
    t = re.sub(r"[’'`.]", '', t)
    t = re.sub(r'[^a-z0-9]+', ' ', t)
    t = re.sub(r'\b(the|ltd|limited|plc|group|uk|llp|inc|co|and|holdings|international)\b', ' ', t)
    return ' '.join(t.split())


def tab_date(tab, year=2026):
    """First date in a tab name like '6 - 8 Oct | RLX' or '27 Sept - 1 Oct | Grow London'."""
    m = re.match(r'\s*(\d{1,2})\s*(?:([A-Za-z]+))?', tab)
    if not m:
        return ''
    day = int(m.group(1))
    mon = m.group(2) or (re.search(r'\d+\s*-\s*\d+\s*([A-Za-z]+)', tab) or re.search(r'([A-Za-z]{3,})', tab)).group(1)
    mm = MONTHS.get(mon[:3].lower())
    return '%04d-%02d-%02d' % (year, mm, day) if mm else ''


def truthy(v):
    if isinstance(v, bool):
        return v
    s = str(v or '').strip().lower()
    return True if s in ('true', 'yes', 'y', '1', '✓', 'x') else False if s in ('false', 'no', 'n', '0') else None


def read_sheet(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    events, rows = [], []
    for ws in wb.worksheets:
        if ws.title.strip().upper() in SKIP_TABS:
            continue
        data = list(ws.iter_rows(values_only=True))
        hi = next((i for i, r in enumerate(data[:6]) if r and any(str(c or '').strip().startswith('Company Fits') for c in r)), None)
        if hi is None:
            continue
        h = [str(c or '').strip() for c in data[hi]]

        def col(*names):
            for n in names:
                for i, x in enumerate(h):
                    if x.lower().startswith(n.lower()):
                        return i
            return None
        C = dict(date=col('Event Date'), event=col('Event/Conference', 'Event/', 'Event '), co=col('Company'), ind=col('Industry'), icp=col('Company Fits'),
                 name=col('Contact Name'), want=col('Want to meet'), met=col('Met'), email=col('Email'), reason=col('ICP Reason'))
        body = []
        for r in data[hi + 1:]:
            g = lambda k, r=r: (r[C[k]] if C[k] is not None and C[k] < len(r) else None)
            if not (g('co') or g('name') or g('email')):
                continue
            body.append(g)
        if not body:
            continue
        d0 = min((g('date') for g in body if isinstance(g('date'), (datetime.date, datetime.datetime))), default=None)
        date = d0.strftime('%Y-%m-%d') if d0 else tab_date(ws.title)
        name = next((str(g('event')).strip() for g in body if isinstance(g('event'), str) and g('event').strip() and not g('event').lower().startswith('i am')), '') or ws.title.split('|', 1)[-1].strip()
        ei = len(events)
        events.append({'tab': ws.title, 'name': name, 'date': date})
        for g in body:
            d = g('date')
            rows.append({'e': ei, 'date': d.strftime('%Y-%m-%d') if isinstance(d, (datetime.date, datetime.datetime)) else date,
                         'co': str(g('co') or '').strip(), 'ind': str(g('ind') or '').strip(), 'icp': truthy(g('icp')),
                         'why': re.sub(r'\s+', ' ', str(g('reason') or '')).strip()[:300], 'met': truthy(g('met')), 'want': truthy(g('want')),
                         '_name': str(g('name') or '').strip(), '_email': str(g('email') or '').strip().lower()})
    return events, rows


def main(folder):
    events, rows = read_sheet(os.path.join(folder, 'events.xlsx'))
    load = lambda f: json.load(open(os.path.join(folder, f))) if os.path.exists(os.path.join(folder, f)) else []
    contacts = {str(c['id']): c for c in load('hs_event_contacts.json') + load('hs_email_contacts.json')}
    companies = {str(c['id']): c for c in load('hs_companies.json')}
    by_email = {str(c.get('email') or '').lower(): c for c in contacts.values() if c.get('email')}
    by_name = {}
    for c in contacts.values():
        k = norm((c.get('first') or '') + ' ' + (c.get('last') or ''))
        if k:
            by_name.setdefault(k, []).append(c)
    co_by_name, co_by_dom = {}, {}
    for c in companies.values():
        if c.get('name'):
            co_by_name.setdefault(norm(c['name']), []).append(c)
        if c.get('domain'):
            co_by_dom.setdefault(re.sub(r'^(https?://)?(www\.)?', '', str(c['domain']).lower()).split('/')[0], []).append(c)
    oldest = lambda L: sorted(L, key=lambda c: c.get('created') or '9')[0]

    out, matched_ct, matched_co = [], 0, 0
    for r in rows:
        ct = next((by_email[x.strip()] for x in r['_email'].split(';') if x.strip() in by_email), None) if r['_email'] else None
        if not ct and r['_name']:
            cands = by_name.get(norm(r['_name']), [])
            if len(cands) > 1 and r['co']:
                cands = [c for c in cands if norm(c.get('company')) == norm(r['co'])] or cands[:1]
            ct = cands[0] if len(cands) == 1 else None
        co = None
        if ct and ct.get('coId') and str(ct['coId']) in companies:
            co = companies[str(ct['coId'])]
        if not co and r['co'] and norm(r['co']) in co_by_name:
            co = oldest(co_by_name[norm(r['co'])])
        if not co and r['_email'] and '@' in r['_email'] and not FREE.search(r['_email']):
            dom = r['_email'].split(';')[0].strip().split('@', 1)[1]
            if dom in co_by_dom:
                co = oldest(co_by_dom[dom])
        matched_ct += bool(ct)
        matched_co += bool(co)
        out.append({k: v for k, v in {'e': r['e'], 'd': r['date'], 'co': r['co'], 'ind': r['ind'], 'icp': r['icp'], 'why': r['why'], 'met': r['met'], 'want': r['want'],
                                     'ct': str(ct['id']) if ct else None, 'coId': str(co['id']) if co else (str(ct['coId']) if ct and ct.get('coId') else None)}.items() if v not in (None, '')})
    # Arushi, 17 Nov: a company marked ICP at any event counts as ICP everywhere, tagged with the event(s) that marked it
    key = lambda r: r.get('coId') or ('n:' + norm(r.get('co')))
    icp_at = {}
    for r in out:
        if r.get('icp') is True and (r.get('coId') or r.get('co')):
            icp_at.setdefault(key(r), set()).add(events[r['e']]['name'])
    for r in out:
        k = key(r) if (r.get('coId') or r.get('co')) else None
        if k in icp_at:
            r['icpAt'] = sorted(icp_at[k])
            if r.get('icp') is not True:
                r['icp'] = True
                r['why'] = ('Marked ICP at ' + ', '.join(r['icpAt']) + '. ' + r.get('why', '')).strip()[:300]
    snap = {'source': 'EVENTS LEADS LISTS 26', 'sheetId': SHEET_ID, 'syncedAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'events': events, 'rows': out}
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'api', '_events.json')
    json.dump(snap, open(dest, 'w'), separators=(',', ':'))

    # companies whose ICP Fit is empty in HubSpot: the sheet's verdict (skip companies the sheet disagrees with itself on)
    verdicts = {}
    for r in out:
        if r.get('coId') and r.get('icp') is not None:
            verdicts.setdefault(r['coId'], {'v': set(), 'why': '', 'ev': set()})
            verdicts[r['coId']]['v'].add(r['icp'])
            verdicts[r['coId']]['ev'].add(events[r['e']]['name'])
            if r.get('why') and not verdicts[r['coId']]['why']:
                verdicts[r['coId']]['why'] = r['why']
    upd, conflicts = [], []
    for cid, v in verdicts.items():
        c = companies.get(cid, {})
        if c.get('icpFit') or c.get('icpStatus'):
            continue
        yes = sorted(icp_at.get(cid, set()))
        no = sorted(v['ev'] - set(yes))
        if yes:
            st = 'ICP: marked ICP at ' + ', '.join(yes) + (' (not ICP at ' + ', '.join(no) + ')' if no else '') + ' (events sheet)'
        else:
            st = 'NOT ICP: ' + (v['why'] or 'marked not ICP')[:200] + ' (events sheet: ' + ', '.join(no)[:80] + ')'
        upd.append({'id': cid, 'name': c.get('name'), 'fit': 'YES' if yes else 'NO', 'events': yes or no, 'properties': {'sdr_icp_fit': 'YES' if yes else 'NO', 'sdr_icp_status': st[:500]}})
    json.dump({'updates': upd, 'conflicts': conflicts}, open(os.path.join(folder, 'icp_updates.json'), 'w'), indent=1)
    print(json.dumps({'events': len(events), 'rows': len(out), 'contactsMatched': matched_ct, 'companiesMatched': matched_co,
                      'icpFillable': len(upd), 'icpConflicts': len(conflicts)}))


if __name__ == '__main__':
    main(sys.argv[1])
