#!/usr/bin/env python3
"""Leadfeeder web visits -> api/_visits.json (the source for website visits on the dashboard and the weekly report).

Arushi, 17 Nov 2026: "you have Leadfeeder connected now, you can track inbound website visits".
Leadfeeder account: Inploi (314105). The #inbound-visits Slack alerts only cover the "All ICP companies" feed;
Leadfeeder sees every identified company.

Usage (hourly / end-of-day scheduled task, or by hand):
  1. Save Leadfeeder search_web_visits pages (include=company, page_size 100) as <folder>/visits_*.json.
     Full refresh: the last 90 days. Hourly top-up: the last 2 days is enough; the script merges into the existing snapshot.
  2. python3 -I scripts/leadfeeder_sync.py <folder>

Keeps company-level data only: no visitor names or emails, no Leadfeeder client ids. Visits older than 120 days are dropped.
"""
import json, os, sys, glob, re, datetime

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'api', '_visits.json')
# networks, ISPs and our own traffic are not prospects
NOT_PROSPECT = re.compile(r'cablecom|truphone|^inploi$|wework|vodafone|virgin media|\bbt\b|sky broadband|eduroam|jisc|ipmaster|mmu .*data|wired$|wireless', re.I)


def main(folder):
    try:
        snap = json.load(open(DEST))
    except Exception:
        snap = {'companies': {}, 'visits': []}
    cos, seen = snap.get('companies', {}), {v['id'] for v in snap.get('visits', [])}
    visits = snap.get('visits', [])
    added = 0
    for f in sorted(glob.glob(os.path.join(folder, 'visits_*.json'))):
        d = json.load(open(f))
        for v in d.get('data', []):
            a, rel = v.get('attributes', {}), v.get('relationships', {})
            c = rel.get('company') or {}
            cid = str(c.get('id') or '')
            if not cid:
                continue
            ca = c.get('attributes') or {}
            if ca:
                addr = ca.get('address') or {}
                ind = (ca.get('industries') or {}).get('industry') or []
                cos[cid] = {k: x for k, x in {
                    'n': ca.get('name'), 'url': ca.get('url'), 'cc': addr.get('country_code'), 'city': addr.get('city'),
                    'emp': ca.get('employee_range'), 'ind': ind[0]['name'] if ind else None,
                    'intent': (ca.get('intent') or {}).get('score'), 'tier': (ca.get('intent') or {}).get('score_tier'),
                    'lf': ca.get('app_url'), 'skip': bool(NOT_PROSPECT.search(ca.get('name') or '')) or None}.items() if x not in (None, '', [])}
            vid = v.get('id')
            if not vid or vid in seen:
                continue
            seen.add(vid)
            pages = []
            for e in a.get('engagements') or []:
                p = (e.get('page') or {}).get('path')
                if e.get('event_type') == 'page-view' and p and p not in pages:
                    pages.append(p)
            loc = (rel.get('location') or {}).get('attributes') or {}
            visits.append({k: x for k, x in {
                'id': vid, 'c': cid, 't': a.get('started_at'), 'src': a.get('source'), 'med': a.get('medium'), 'cmp': a.get('campaign'),
                'land': a.get('landing_page_path'), 'pv': a.get('page_depth'), 'len': a.get('visit_length'), 'dev': a.get('device_type'),
                'pages': pages[:12], 'vcity': loc.get('city'), 'vcc': loc.get('country_code')}.items() if x not in (None, '', [])})
            added += 1
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=120)).strftime('%Y-%m-%d')
    visits = sorted([v for v in visits if (v.get('t') or '') >= cutoff], key=lambda v: v['t'])
    used = {v['c'] for v in visits}
    snap = {'source': 'Leadfeeder (account 314105)', 'syncedAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'from': visits[0]['t'][:10] if visits else None, 'companies': {k: v for k, v in cos.items() if k in used}, 'visits': visits}
    json.dump(snap, open(DEST, 'w'), separators=(',', ':'))
    print(json.dumps({'visitsAdded': added, 'visits': len(visits), 'companies': len(snap['companies']), 'from': snap['from'], 'bytes': os.path.getsize(DEST)}))


if __name__ == '__main__':
    main(sys.argv[1])
