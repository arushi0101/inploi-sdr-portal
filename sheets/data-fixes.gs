/**
 * SDR data fixes: keeps this Google Sheet in step with the SDR portal's open data fixes.
 *
 * Paste into Extensions > Apps Script, save, choose `setup` and press Run once (allow access when asked).
 * After that it updates itself every Friday between 4 and 5pm (UK), and the sheet gets a
 * "Data fixes > Update now" menu.
 *
 * Each run:
 *  - adds fixes that are new as Open (First flagged = today)
 *  - refreshes fixes that are still open (Days open, Last checked)
 *  - marks open fixes that are no longer flagged as Resolved (Resolved on = today); nothing is deleted
 *  - rebuilds the Summary tab (open and resolved by person)
 */
var SOURCE = 'https://inploi-sdr-portal.vercel.app/api/data?part=fixes';
var SHEET_ID = '1d2B025T2HnKKZ832Wenvs5_s-SYVnTpn7I_thseckQQ'; // the "SDR data fixes" sheet, so this also works from a standalone script
var TAB = 'Data fixes', SUMMARY = 'Summary', TZ = 'Europe/London';
var HEAD = ['Status', 'Who fixes it', 'Fix needed', 'Suggested update (what and why)', 'Record', 'Company', 'Worked on', 'First flagged', 'Days open',
  'Resolved on', 'Where to fix', 'How to fix', 'Why it matters', 'Last checked', 'Key'];
var C = {}; HEAD.forEach(function (h, i) { C[h] = i; });

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'update') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('update').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(16).inTimezone(TZ).create();
  update();
}

function onOpen() {
  if (!SpreadsheetApp.getActiveSpreadsheet()) return;
  SpreadsheetApp.getUi().createMenu('Data fixes').addItem('Update now', 'update').addToUi();
}

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function daysSince_(iso) {
  if (!iso) return '';
  var a = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'), b = new Date(today_() + 'T12:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}
function iso_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || ''); }

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

// merge the latest open fixes into the existing rows; pure, so it can be tested outside Google
function merge_(existing, fresh, today) {
  var byKey = {}, seen = {};
  fresh.forEach(function (f) { byKey[f.key] = f; });
  var rows = existing.map(function (r) {
    r = r.slice(); var k = r[C.Key], f = byKey[k];
    if (f) {
      seen[k] = 1;
      r[C.Status] = 'Open'; r[C['Resolved on']] = '';
      r[C.Record] = '=HYPERLINK("' + f.link + '","' + String(f.record).replace(/"/g, '""') + '")';
      r[C.Company] = f.company; r[C['Worked on']] = f.worked; r[C['Last checked']] = today;
      r[C['Suggested update (what and why)']] = f.suggest || '';
    } else if (r[C.Status] === 'Open') {
      r[C.Status] = 'Resolved'; r[C['Resolved on']] = today; r[C['Last checked']] = today;
    }
    return r;
  });
  fresh.forEach(function (f) {
    if (seen[f.key]) return;
    var r = HEAD.map(function () { return ''; });
    r[C.Status] = 'Open'; r[C['Who fixes it']] = f.who; r[C['Fix needed']] = f.fix; r[C['Suggested update (what and why)']] = f.suggest || '';
    r[C.Record] = '=HYPERLINK("' + f.link + '","' + String(f.record).replace(/"/g, '""') + '")';
    r[C.Company] = f.company; r[C['Worked on']] = f.worked; r[C['First flagged']] = today;
    r[C['Where to fix']] = f.where; r[C['How to fix']] = f.how; r[C['Why it matters']] = f.why;
    r[C['Last checked']] = today; r[C.Key] = f.key;
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
function daysSinceAt_(iso, today) {
  if (!iso) return '';
  var a = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'), b = new Date(today + 'T12:00:00Z');
  return Math.max(0, Math.round((b - a) / 86400000));
}

function update() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID), today = today_();
  var sh = ss.getSheetByName(TAB) || ss.getSheets()[0];
  sh.setName(TAB);
  var fresh = fetchFixes_();
  var lastCol = Math.max(sh.getLastColumn(), 1), n = sh.getLastRow() - 1;
  var oldHead = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var values = n > 0 ? sh.getRange(2, 1, n, lastCol).getValues() : [];
  var formulas = n > 0 ? sh.getRange(2, 1, n, lastCol).getFormulas() : [];
  // read existing rows by column name, so added or moved columns keep their data;
  // keep record links as formulas and dates as yyyy-mm-dd
  var existing = values.map(function (r, i) {
    return HEAD.map(function (h) {
      var j = oldHead.indexOf(h); if (j < 0) return '';
      return formulas[i][j] || (r[j] instanceof Date ? iso_(r[j]) : r[j]);
    });
  }).filter(function (r) { return r[C.Key]; });
  // the first import came from CSV with no Key formulas; nothing else to migrate
  var rows = merge_(existing, fresh, today);

  sh.clear();
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#222222').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, HEAD.length).setValues(rows);
    var bg = rows.map(function (r) { var c = r[C.Status] === 'Open' ? '#fde8e8' : '#e6f4ea'; return HEAD.map(function () { return c; }); });
    sh.getRange(2, 1, rows.length, HEAD.length).setBackgrounds(bg).setWrap(false).setVerticalAlignment('top');
  }
  sh.setFrozenRows(1);
  sh.hideColumns(C.Key + 1);
  [90, 120, 260, 420, 280, 200, 95, 95, 80, 95, 240, 280, 360, 95].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(rows.length + 1, 2), HEAD.length).createFilter();

  summary_(ss, rows, today);
  ss.setSpreadsheetTimeZone(TZ);
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

if (typeof module !== 'undefined') module.exports = { merge_: merge_, HEAD: HEAD, C: C };
