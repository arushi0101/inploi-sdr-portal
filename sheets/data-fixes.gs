/**
 * SDR data fixes: keeps this Google Sheet in step with the SDR portal's open data fixes,
 * and applies approved fixes to HubSpot.
 *
 * One-time setup:
 *  1. Project Settings (gear icon) > Script properties > add APPLY_SECRET with the same value as APPLY_SECRET on Vercel.
 *  2. Choose `setup` and press Run (allow access when asked).
 * After that:
 *  - every Friday 4-5pm (UK) the sheet updates: new fixes are added as Open, fixes that are no longer
 *    flagged become Resolved, nothing is deleted, and the Summary tab is rebuilt;
 *  - every Saturday and Monday 7-8am (UK) it goes through "Approve / Reject": approved changes are made
 *    in HubSpot (only if that field is still empty there), rejected ones are left as they are;
 *  - every decision and change is added to the "Change log" tab, which is never cleared.
 * Picking Approve or Reject records who decided; the Result column says it is waiting for the next run.
 *  - every Monday 9-10am (UK) it thanks the team in #sdr-hub for the records fixed in the last 7 days;
 *  - every Thursday 10-11am (UK) it sends #sdr-hub the sheet, each person's open fixes and how to do them.
 * The "Data fixes" menu has Update now and Apply approvals now.
 */
var SHEET_ID = '1d2B025T2HnKKZ832Wenvs5_s-SYVnTpn7I_thseckQQ'; // the "SDR data fixes" sheet, so this also works from a standalone script
var SOURCE = 'https://inploi-sdr-portal.vercel.app/api/data?part=fixes';
var APPLY_URL = 'https://inploi-sdr-portal.vercel.app/api/apply';
var THANKS_URL = 'https://inploi-sdr-portal.vercel.app/api/slack-thanks';
var TAB = 'Data fixes', SUMMARY = 'Summary', LOG = 'Change log', TZ = 'Europe/London';
var SUG = 'Suggested update (what and why)', DEC = 'Approve / Reject', BY = 'Decided by', RES = 'Result';
var HEAD = ['Status', 'Who fixes it', 'Fix needed', SUG, DEC, BY, RES, 'Record', 'Company', 'Worked on', 'First flagged', 'Days open',
  'Resolved on', 'Where to fix', 'How to fix', 'Why it matters', 'Last checked', 'Change', 'Key'];
var LOG_HEAD = ['When', 'Decided by', 'Decision', 'Who fixes it', 'Fix needed', 'Record', 'Company', 'Field', 'Old value', 'New value', 'Result'];
var C = {}; HEAD.forEach(function (h, i) { C[h] = i; });

function ss_() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID); }

function setup() {
  if (!PropertiesService.getScriptProperties().getProperty('APPLY_SECRET')) {
    throw new Error('Add APPLY_SECRET first: Project Settings (gear icon) > Script properties > Add script property.');
  }
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['update', 'onDecision', 'applyPending', 'mondayThanks', 'thursdayReminder'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('update').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(16).inTimezone(TZ).create();
  ScriptApp.newTrigger('applyPending').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(7).inTimezone(TZ).create();
  ScriptApp.newTrigger('applyPending').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).inTimezone(TZ).create();
  ScriptApp.newTrigger('mondayThanks').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone(TZ).create();
  ScriptApp.newTrigger('thursdayReminder').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(10).inTimezone(TZ).create();
  update();
}

function onOpen() {
  if (!SpreadsheetApp.getActiveSpreadsheet()) return;
  SpreadsheetApp.getUi().createMenu('Data fixes')
    .addItem('Update now', 'update')
    .addItem('Apply approvals now', 'applyPending')
    .addItem('Send the Monday thank-you now', 'mondayThanks')
    .addItem('Send the Thursday reminder now', 'thursdayReminder')
    .addToUi();
}

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function iso_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v == null ? '' : v); }
function link_(f) { return '=HYPERLINK("' + f.link + '","' + String(f.record).replace(/"/g, '""') + '")'; }

function fetchFixes_() {
  var last;
  for (var i = 0; i < 3; i++) {
    var r = UrlFetchApp.fetch(SOURCE + '&t=' + Date.now(), { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) return JSON.parse(r.getContentText()).rows;
    last = r.getResponseCode() + ' ' + r.getContentText().slice(0, 200);
    Utilities.sleep(5000);
  }
  throw new Error('Could not load fixes from the SDR portal: ' + last);
}

function daysSinceAt_(iso, today) {
  if (!iso) return '';
  var a = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'), b = new Date(today + 'T12:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}

// merge the latest open fixes into the existing rows; pure, so it can be tested outside Google
function merge_(existing, fresh, today) {
  var byKey = {}, seen = {};
  fresh.forEach(function (f) { byKey[f.key] = f; });
  var rows = existing.map(function (r) {
    r = r.slice(); var k = r[C.Key], f = byKey[k];
    if (f) {
      seen[k] = 1;
      if (r[C.Status] === 'Resolved') { r[C.Status] = 'Open'; r[C['Resolved on']] = ''; }
      r[C.Record] = link_(f); r[C.Company] = f.company; r[C['Worked on']] = f.worked; r[C['Last checked']] = today;
      // keep the suggestion people decided on; refresh it while undecided
      if (!r[C[DEC]]) { r[C[SUG]] = f.suggest || ''; r[C.Change] = f.apply ? JSON.stringify(f.apply) : ''; }
      // a fix that's still flagged after its change was applied is reopened for a fresh decision
      if (r[C[DEC]] === 'Approve' && /^Applied/.test(String(r[C[RES]]))) { r[C[DEC]] = ''; r[C[BY]] = ''; r[C[RES]] = 'Was applied, but still flagged: check HubSpot'; r[C[SUG]] = f.suggest || ''; r[C.Change] = f.apply ? JSON.stringify(f.apply) : ''; }
    } else if (r[C.Status] === 'Open') {
      r[C.Status] = 'Resolved'; r[C['Resolved on']] = today; r[C['Last checked']] = today;
    }
    return r;
  });
  fresh.forEach(function (f) {
    if (seen[f.key]) return;
    var r = HEAD.map(function () { return ''; });
    r[C.Status] = 'Open'; r[C['Who fixes it']] = f.who; r[C['Fix needed']] = f.fix; r[C[SUG]] = f.suggest || '';
    r[C.Record] = link_(f); r[C.Company] = f.company; r[C['Worked on']] = f.worked; r[C['First flagged']] = today;
    r[C['Where to fix']] = f.where; r[C['How to fix']] = f.how; r[C['Why it matters']] = f.why;
    r[C['Last checked']] = today; r[C.Change] = f.apply ? JSON.stringify(f.apply) : ''; r[C.Key] = f.key;
    rows.push(r);
  });
  rows.forEach(function (r) { r[C['Days open']] = r[C.Status] === 'Open' ? daysSinceAt_(r[C['Worked on']] || r[C['First flagged']], today) : ''; });
  rows.sort(function (a, b) {
    var s = (a[C.Status] === 'Open' ? 0 : 1) - (b[C.Status] === 'Open' ? 0 : 1);
    if (s) return s;
    if (a[C.Status] === 'Resolved') return String(b[C['Resolved on']]).localeCompare(String(a[C['Resolved on']]));
    return String(a[C['Who fixes it']]).localeCompare(String(b[C['Who fixes it']])) ||
      String(a[C['Fix needed']]).localeCompare(String(b[C['Fix needed']])) ||
      String(a[C['Worked on']]).localeCompare(String(b[C['Worked on']]));
  });
  return rows;
}

// read the tab by column name, so added or moved columns keep their data
function readRows_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 1), n = sh.getLastRow() - 1;
  var oldHead = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var values = n > 0 ? sh.getRange(2, 1, n, lastCol).getValues() : [];
  var formulas = n > 0 ? sh.getRange(2, 1, n, lastCol).getFormulas() : [];
  return values.map(function (r, i) {
    return HEAD.map(function (h) {
      var j = oldHead.indexOf(h); if (j < 0) return '';
      return formulas[i][j] || (r[j] instanceof Date ? iso_(r[j]) : r[j]);
    });
  }).filter(function (r) { return r[C.Key]; });
}

function update() {
  var lock = LockService.getScriptLock(); lock.waitLock(120000);
  try {
    var ss = ss_(), today = today_();
    var sh = ss.getSheetByName(TAB) || ss.getSheets()[0];
    sh.setName(TAB);
    var rows = merge_(readRows_(sh), fetchFixes_(), today);
    write_(sh, rows);
    summary_(ss, rows, today);
    logSheet_(ss);
    ss.setSpreadsheetTimeZone(TZ);
  } finally { lock.releaseLock(); }
}

function write_(sh, rows) {
  sh.clear(); sh.clearConditionalFormatRules();
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, HEAD.length).setValues(rows);
    var bg = rows.map(function (r) { var c = r[C.Status] === 'Open' ? '#fde8e8' : '#e6f4ea'; return HEAD.map(function () { return c; }); });
    sh.getRange(2, 1, rows.length, HEAD.length).setBackgrounds(bg).setWrap(false).setVerticalAlignment('top');
    sh.getRange(2, C[SUG] + 1, rows.length, 1).setWrap(true);
    var dv = SpreadsheetApp.newDataValidation().requireValueInList(['Approve', 'Reject'], true).setAllowInvalid(false).build();
    sh.getRange(2, C[DEC] + 1, rows.length, 1).setDataValidation(dv).setFontWeight('bold').setBackground('#fff8dc');
  }
  sh.setFrozenRows(1);
  sh.hideColumns(C.Change + 1, 2);
  [90, 120, 260, 380, 120, 170, 220, 280, 200, 95, 95, 80, 95, 240, 280, 360, 95].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(rows.length + 1, 2), HEAD.length).createFilter();
}

var WAIT = 'Waiting for the next run (Saturday or Monday)';
// simple on-edit trigger: note the decision and who made it; HubSpot is updated on Saturday and Monday
function onEdit(e) {
  if (!e || !e.range || e.range.getSheet().getName() !== TAB) return;
  var sh = e.range.getSheet(), col = C[DEC] + 1;
  if (e.range.getColumn() > col || e.range.getLastColumn() < col) return;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var d = head.indexOf(DEC), res = head.indexOf(RES), by = head.indexOf(BY);
  if (d < 0 || res < 0) return;
  var who = (e.user && e.user.getEmail && e.user.getEmail()) || '';
  for (var r = Math.max(e.range.getRow(), 2); r <= e.range.getLastRow(); r++) {
    var dec = sh.getRange(r, d + 1).getValue(), cur = String(sh.getRange(r, res + 1).getValue());
    if (/^Applied/.test(cur)) continue;
    sh.getRange(r, res + 1).setValue(dec ? WAIT : '');
    if (by >= 0) sh.getRange(r, by + 1).setValue(dec ? (who || 'someone') + ', ' + now_() : '');
  }
}

function applyPending() {
  var lock = LockService.getScriptLock(); lock.waitLock(60000);
  try { applyPending_(ss_().getSheetByName(TAB)); } finally { lock.releaseLock(); }
}
function applyPending_(sh) {
  if (!sh || sh.getLastRow() < 2) return;
  var who = Session.getActiveUser().getEmail() || 'scheduled run';
  if (sh.getLastColumn() < 1) return;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var d = head.indexOf(DEC), res = head.indexOf(RES);
  if (d < 0 || res < 0) return;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  var by = head.indexOf(BY);
  vals.forEach(function (v, i) { if (v[d] && (!v[res] || v[res] === WAIT)) decide_(sh, i + 2, (by >= 0 && String(v[by]).split(',')[0]) || who); });
}

// one row's decision: apply an approved change to HubSpot, or note a rejection; always logged
function decide_(sh, rowNum, who) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var col = function (h) { return head.indexOf(h); };
  var range = sh.getRange(rowNum, 1, 1, head.length), v = range.getValues()[0], f = range.getFormulas()[0];
  var decision = v[col(DEC)], done = v[col(RES)] === WAIT ? '' : v[col(RES)];
  if (!v[col('Key')]) return;
  var cell = sh.getRange(rowNum, col(RES) + 1), stamp = now_();
  var change = null; try { change = v[col('Change')] ? JSON.parse(v[col('Change')]) : null; } catch (x) { change = null; }
  var base = { who: who, row: v, formula: f, col: col, change: change };
  if (!decision) {
    if (done && !/^Applied/.test(String(done))) cell.setValue('');
    return;
  }
  if (done && /^Applied/.test(String(done))) {
    if (decision === 'Reject') logRow_(base, decision, 'Changed to Reject after the change was applied. HubSpot was not reverted.');
    return;
  }
  if (decision === 'Reject') {
    cell.setValue('Rejected ' + stamp + ' by ' + who + ': no change'); logRow_(base, decision, 'Rejected: no change made');
    return;
  }
  if (!change) {
    cell.setValue('Can’t be applied automatically: please fix it in HubSpot');
    logRow_(base, decision, 'Not applied: this fix needs a manual change in HubSpot');
    return;
  }
  var secret = PropertiesService.getScriptProperties().getProperty('APPLY_SECRET');
  if (!secret) { cell.setValue('Not applied: APPLY_SECRET is missing in Script properties'); logRow_(base, decision, 'Not applied: APPLY_SECRET missing'); return; }
  var out;
  try {
    var r = UrlFetchApp.fetch(APPLY_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + secret },
      payload: JSON.stringify({ object: change.object, id: change.id, property: change.property, value: change.value, approvedBy: who, key: v[col('Key')] }) });
    out = JSON.parse(r.getContentText() || '{}');
  } catch (x) { out = { ok: false, error: String(x.message || x) }; }
  base.old = out.old || '';
  if (out.ok) {
    cell.setValue((out.unchanged ? 'Already set: ' : 'Applied ' + stamp + ' by ' + who + ': ') + change.field + ' = ' + change.label);
    logRow_(base, decision, out.unchanged ? 'No change needed: HubSpot already had this value' : 'Applied in HubSpot');
  } else {
    cell.setValue('Not applied: ' + (out.error || 'unknown error'));
    logRow_(base, decision, 'Not applied: ' + (out.error || 'unknown error'));
  }
}

// fixed in the last 7 days: rows resolved, or changes applied from an approval (each row counted once)
function weekFixes_(rows, today) {
  var weekAgo = Utilities.formatDate(new Date(new Date(today + 'T12:00:00Z').getTime() - 7 * 86400000), TZ, 'yyyy-MM-dd');
  var by = {}, fixed = 0, open = 0;
  rows.forEach(function (r) {
    if (r[C.Status] === 'Open') open++;
    var res = String(r[C[RES]] || ''), applied = /^Applied (\d{4}-\d{2}-\d{2})/.exec(res);
    var resolved = r[C.Status] === 'Resolved' && String(r[C['Resolved on']]) > weekAgo;
    if (resolved || (applied && applied[1] > weekAgo)) { fixed++; var w = r[C['Who fixes it']] || 'Someone'; by[w] = (by[w] || 0) + 1; }
  });
  var byPerson = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (w) { return [w, by[w]]; });
  return { fixed: fixed, open: open, byPerson: byPerson };
}

// Monday thank-you in #sdr-hub (sent by the SDR portal using its Slack connection)
function mondayThanks() {
  var ss = ss_(), sh = ss.getSheetByName(TAB);
  var w = weekFixes_(readRows_(sh), today_());
  var secret = PropertiesService.getScriptProperties().getProperty('APPLY_SECRET');
  var r = UrlFetchApp.fetch(THANKS_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify({ kind: 'thanks', fixed: w.fixed, open: w.open, byPerson: w.byPerson, sheetUrl: ss.getUrl() }) });
  logSheet_(ss).appendRow([now_(), 'scheduled run', 'Thank-you', '', '', '', '', '', '', '',
    'Monday thank-you sent to Slack: ' + w.fixed + ' fixed last week' + (r.getResponseCode() === 200 ? '' : ' (failed: ' + r.getContentText().slice(0, 150) + ')')]);
}

// Thursday reminder in #sdr-hub: the sheet, open fixes per person, and how to do them
function thursdayReminder() {
  var ss = ss_(), rows = readRows_(ss.getSheetByName(TAB)), by = {}, open = 0;
  rows.forEach(function (r) {
    if (r[C.Status] !== 'Open' || r[C[DEC]]) return;
    open++; var w = r[C['Who fixes it']] || 'Unassigned'; by[w] = (by[w] || 0) + 1;
  });
  var byPerson = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (w) { return [w, by[w]]; });
  var secret = PropertiesService.getScriptProperties().getProperty('APPLY_SECRET');
  var r = UrlFetchApp.fetch(THANKS_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify({ kind: 'reminder', open: open, byPerson: byPerson, sheetUrl: ss.getUrl() }) });
  logSheet_(ss).appendRow([now_(), 'scheduled run', 'Reminder', '', '', '', '', '', '', '',
    'Thursday reminder sent to Slack: ' + open + ' open, not yet decided' + (r.getResponseCode() === 200 ? '' : ' (failed: ' + r.getContentText().slice(0, 150) + ')')]);
}

function logSheet_(ss) {
  var sh = ss.getSheetByName(LOG);
  if (!sh) {
    sh = ss.insertSheet(LOG);
    sh.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    [130, 200, 80, 110, 240, 260, 180, 170, 160, 200, 320].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function logRow_(b, decision, result) {
  var c = b.col, v = b.row, ch = b.change || {};
  var rec = b.formula[c('Record')] || v[c('Record')];
  logSheet_(ss_()).appendRow([now_(), b.who, decision, v[c('Who fixes it')], v[c('Fix needed')], rec, v[c('Company')],
    ch.field || '', b.old || (decision === 'Approve' && ch.field ? '(empty)' : ''), decision === 'Approve' ? (ch.label || '') : '', result]);
}

function summary_(ss, rows, today) {
  var sh = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY);
  var weekAgo = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), TZ, 'yyyy-MM-dd');
  var people = {}, fixes = {};
  rows.forEach(function (r) {
    var w = r[C['Who fixes it']], f = r[C['Fix needed']];
    var p = people[w] = people[w] || { open: 0, resolvedWeek: 0, oldest: 0 };
    if (r[C.Status] === 'Open') { p.open++; p.oldest = Math.max(p.oldest, Number(r[C['Days open']]) || 0); fixes[f] = (fixes[f] || 0) + 1; }
    else if (String(r[C['Resolved on']]) > weekAgo) p.resolvedWeek++;
  });
  var out = [['Updated', today, '', ''], ['', '', '', ''], ['Who fixes it', 'Open', 'Resolved in the last 7 days', 'Oldest open (days)']];
  Object.keys(people).sort(function (a, b) { return people[b].open - people[a].open; }).forEach(function (w) {
    out.push([w, people[w].open, people[w].resolvedWeek, people[w].oldest]);
  });
  out.push(['', '', '', ''], ['Fix needed', 'Open', '', '']);
  Object.keys(fixes).sort(function (a, b) { return fixes[b] - fixes[a]; }).forEach(function (f) { out.push([f, fixes[f], '', '']); });
  sh.clear();
  sh.getRange(1, 1, out.length, 4).setValues(out);
  sh.getRange(3, 1, 1, 4).setFontWeight('bold');
  sh.getRange(out.length - Object.keys(fixes).length, 1, 1, 2).setFontWeight('bold');
  sh.setColumnWidth(1, 300); sh.setColumnWidths(2, 3, 170);
}

if (typeof module !== 'undefined') module.exports = { merge_: merge_, weekFixes_: weekFixes_, HEAD: HEAD, C: C };
