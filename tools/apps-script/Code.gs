/**
 * Tommie BaZi · ระบบแจ้งเตือนฤกษ์ประจำวัน (Google Apps Script)
 * วางไฟล์นี้ใน Google Sheet "ลูกดวง · Tommie BaZi" → ส่วนขยาย → Apps Script
 *
 * ทำ 3 อย่าง โดยไม่เสียค่าส่งข้อความ:
 *   B. LINE OA ตอบเมื่อลูกดวงพิมพ์/กดเมนู "ฤกษ์วันนี้" (Reply API ไม่นับโควตา)
 *   C. ส่งอีเมลฤกษ์ประจำวันทุกเช้า (Gmail ของคุณเอง)
 *   D. สร้างหน้าในฐานข้อมูล Notion "ฤกษ์รายวัน" ทุกเช้า
 * สูตรคำนวณโหลดจากแอป Studio (tommiebazi.github.io/app) ชุดเดียวกัน แก้สูตรที่แอปแล้วระบบนี้ใช้ตามทันที
 * กุญแจทั้งหมด (LINE / Notion) เก็บใน Script Properties เท่านั้น ห้ามใส่ในชีต
 */
var ENGINE_BASE = 'https://tommiebazi.github.io/app/';
var SHEET = 'ลูกดวง', LOG = 'บันทึกการส่ง';
var COL = { code: 0, nick: 1, name: 2, sex: 3, bdate: 4, btime: 5, notime: 6, pv: 7, ap: 8, tb: 9, lon: 10, sys: 11, pillars: 12, verdict: 13, good: 14, bad: 15, over: 16, lonNow: 17, channel: 18, email: 19, emailDaily: 20, lineId: 21, consent: 22, note: 23 };
var DEFAULT_LON = 98.39; // ภูเก็ต
var NOTION_VERSION = '2022-06-28';

/* ---------- engine ---------- */
var ENGINE_LOADED = false;
function loadEngine_() {
  if (ENGINE_LOADED) return;
  var v = Math.floor(Date.now() / 3600000); // refresh at most hourly
  ['lunar.js', 'core.js', 'daily.js'].forEach(function (f) {
    var src = UrlFetchApp.fetch(ENGINE_BASE + f + '?v=' + v, { muteHttpExceptions: false }).getContentText();
    (0, eval)(src);
  });
  ENGINE_LOADED = true;
}
function props_() { return PropertiesService.getScriptProperties(); }
function nowTh_() { return Date.now() + 7 * 3600000; } // Thai wall clock in UTC fields
function ymdTh_(offsetDays) { var d = new Date(nowTh_() + (offsetDays || 0) * 864e5); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }
function dmy_(v) { // "11/05/2541" or a Date the sheet converted → [d, m, yBE]
  if (Object.prototype.toString.call(v) === '[object Date]') { var t = new Date(v.getTime() + 7 * 3600000); return [t.getUTCDate(), t.getUTCMonth() + 1, t.getUTCFullYear() + 543]; }
  var b = String(v || '').trim().split(/[\/\-.]/); if (b.length < 3) return null; var y = +b[2]; if (y < 2400) y += 543; return [+b[0], +b[1], y];
}
function hm_(v) { if (Object.prototype.toString.call(v) === '[object Date]') { var t = new Date(v.getTime() + 7 * 3600000); return [t.getUTCHours(), t.getUTCMinutes()]; } var s = String(v || '').trim(); if (!s) return null; var p = s.split(/[:.]/); return [+p[0], +(p[1] || 0)]; }
function truthy_(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === 'ใช่'; }

/* ---------- rows ---------- */
function book_() { var ss = null; try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {} return ss || SpreadsheetApp.openById(props_().getProperty('SHEET_ID')); }
function rows_() {
  var sh = book_().getSheetByName(SHEET), v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) if (String(v[i][COL.code] || v[i][COL.nick]).trim()) out.push({ r: i + 1, v: v[i] });
  return out;
}
function setCell_(r, c, val) { book_().getSheetByName(SHEET).getRange(r, c + 1).setValue(val); }
function log_(code, nick, ch, status, detail) {
  try { book_().getSheetByName(LOG).appendRow([new Date(), code, nick, ch, status, String(detail || '').slice(0, 300)]); } catch (e) {}
}

/* pillars: column M if filled, else computed from the birth data */
function pillarsOf_(row) {
  var v = row.v, txt = String(v[COL.pillars] || '').trim();
  if (txt) { var g = txt.split(/\s+/); return { y: g[0], m: g[1], d: g[2], h: g[3] && !/[？?]/.test(g[3]) ? g[3] : null }; }
  var b = dmy_(v[COL.bdate]); if (!b) throw new Error('ไม่มีวันเกิดหรือผังสี่เสา');
  var y = b[2] - 543, t = hm_(v[COL.btime]), noTime = truthy_(v[COL.notime]) || !t; t = t || [12, 0];
  var lon = v[COL.lon] === '' || v[COL.lon] == null ? null : +v[COL.lon];
  var P = TBZ.pillars([y, b[1], b[0], noTime ? 12 : t[0], noTime ? 0 : t[1]], { tz: 7, lon: lon, system: /ทั่วไป|std/.test(String(v[COL.sys])) ? 'std' : 'amat', noTime: noTime });
  return { y: P.y, m: P.m, d: P.d, h: P.h };
}
function verdictKey_(txt) {
  txt = String(txt || ''); if (!txt || /คำนวณ/.test(txt)) return null;
  if (/สละ/.test(txt)) return 'follow'; if (/กระแส/.test(txt)) return 'gold'; if (/แข็ง/.test(txt)) return 'strong'; if (/สมดุล/.test(txt)) return 'bal'; if (/อ่อน/.test(txt)) return 'weak';
  return null;
}
function els_(txt) { return String(txt || '').split(/[\s,]+/).map(function (t) { return TBZ.EL_TH.indexOf(t.trim()); }).filter(function (i) { return i >= 0; }); }
function over_(txt) { // "酉:g 午:b 甲:n"
  var o = { st: {}, br: {} };
  String(txt || '').split(/[\s,]+/).forEach(function (p) { var m = p.match(/^(.)[:=](g|b|n)$/); if (!m) return; if (TBZ.STEMS.indexOf(m[1]) >= 0) o.st[m[1]] = m[2]; else if (TBZ.BR.indexOf(m[1]) >= 0) o.br[m[1]] = m[2]; });
  return o;
}
function dayFor_(row, ymd) {
  loadEngine_();
  var v = row.v, P = pillarsOf_(row), vk = verdictKey_(v[COL.verdict]);
  var N = TBZDaily.natal(P, vk ? { verdict: { k: vk } } : null);
  var good = els_(v[COL.good]), bad = els_(v[COL.bad]), fav = good.length || bad.length ? { good: good, bad: bad } : TBZDaily.proposeFav(N);
  fav.over = over_(v[COL.over]);
  var lon = v[COL.lonNow] === '' || v[COL.lonNow] == null ? DEFAULT_LON : +v[COL.lonNow];
  var R = TBZDaily.day(N, fav, ymd[0], ymd[1], ymd[2], lon, nowTh_());
  return { R: R, text: TBZDaily.text(R, String(v[COL.nick] || ''), fav), fav: fav };
}

/* ---------- C. email + D. Notion every morning ---------- */
function morning() {
  var ymd = ymdTh_(0), props = props_(), notionToken = props.getProperty('NOTION_TOKEN'), notionDb = props.getProperty('NOTION_DB');
  rows_().forEach(function (row) {
    var v = row.v, code = v[COL.code], nick = v[COL.nick], ch = String(v[COL.channel] || '');
    if (/ไม่ส่ง/.test(ch)) return;
    var wantMail = truthy_(v[COL.emailDaily]) && String(v[COL.email]).indexOf('@') > 0, wantNotion = /Notion/i.test(ch) && notionToken && notionDb;
    if (!wantMail && !wantNotion) return;
    var X; try { X = dayFor_(row, ymd); } catch (e) { log_(code, nick, '-', 'คำนวณไม่ได้', e.message); return; }
    if (wantMail) {
      try {
        MailApp.sendEmail({ to: String(v[COL.email]).trim(), subject: '🗓️ ฤกษ์ประจำวัน ' + X.R.label + ' · Tommie BaZi', body: X.text + footer_(),
          htmlBody: '<div style="font:15px/1.8 sans-serif;white-space:pre-wrap">' + esc_(X.text + footer_()) + '</div>', name: 'Tommie BaZi' });
        log_(code, nick, 'อีเมล', 'ส่งแล้ว', X.R.P.d + ' คะแนน ' + X.R.score);
      } catch (e) { log_(code, nick, 'อีเมล', 'ผิดพลาด', e.message); }
    }
    if (wantNotion) {
      try { notionPage_(notionToken, notionDb, nick, X); log_(code, nick, 'Notion', 'สร้างแล้ว', X.R.P.d); }
      catch (e) { log_(code, nick, 'Notion', 'ผิดพลาด', e.message); }
    }
  });
}
function footer_() { return '\n\n— Tommie BaZi · LINE @237owut · tommiebazi.github.io\nใช้เป็นแนวทางประกอบการตัดสินใจ'; }
function esc_(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function notionPage_(token, db, nick, X) {
  var R = X.R, ymd = R.y + '-' + ('0' + R.m).slice(-2) + '-' + ('0' + R.d).slice(-2);
  var para = function (t) { return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: t.slice(0, 1900) } }] } }; };
  var body = {
    parent: { database_id: db }, icon: { type: 'emoji', emoji: '📅' },
    properties: {
      'หัวข้อ': { title: [{ text: { content: (nick || 'ลูกดวง') + ' · ' + R.label } }] },
      'วันที่': { date: { start: ymd } },
      'เสาวัน': { rich_text: [{ text: { content: R.P.d } }] },
      'คะแนนวัน': { number: R.score },
      'ยามดี': { rich_text: [{ text: { content: R.bestAwake.map(function (h) { return h.from.t + '–' + h.to.t; }).join(', ') } }] }
    },
    children: X.text.split('\n').filter(String).map(para)
  };
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token, 'Notion-Version': NOTION_VERSION }, payload: JSON.stringify(body) });
  if (res.getResponseCode() >= 300) throw new Error(res.getContentText().slice(0, 200));
}

/* ---------- B. LINE OA: reply only when the client asks (free) ---------- */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    (data.events || []).forEach(handleLine_);
  } catch (err) { log_('', '', 'LINE', 'ผิดพลาด', err.message); }
  return ContentService.createTextOutput('OK');
}
function handleLine_(ev) {
  if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !ev.replyToken) return;
  var text = String(ev.message.text).trim(), uid = ev.source && ev.source.userId; if (!uid) return;
  var reg = text.match(/^สมัคร(?:รับฤกษ์)?\s*(TB-?\d{3,5})\s+(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/i);
  if (reg) return register_(ev.replyToken, uid, reg);
  var ask = /^(ฤกษ์|ฤกษ์วันนี้|ฤกษ์พรุ่งนี้|ฤกษ์มะรืน)$/.exec(text.replace(/\s+/g, ''));
  if (!ask) return; // อย่างอื่นปล่อยให้แชตปกติของ LINE OA ตอบ
  var row = rows_().filter(function (r) { return String(r.v[COL.lineId]) === uid; })[0];
  if (!row) return reply_(ev.replyToken, 'ยังไม่ได้ลงทะเบียนรับฤกษ์ประจำวันครับ\nพิมพ์: สมัคร รหัสลูกดวง วันเกิด\nเช่น สมัคร TB-0001 11/05/2541\n(ขอรหัสลูกดวงได้จาก Tommie)');
  var off = /พรุ่งนี้/.test(text) ? 1 : /มะรืน/.test(text) ? 2 : 0;
  try { var X = dayFor_(row, ymdTh_(off)); reply_(ev.replyToken, X.text + footer_()); log_(row.v[COL.code], row.v[COL.nick], 'LINE', 'ตอบแล้ว', X.R.P.d); }
  catch (e) { reply_(ev.replyToken, 'ขออภัย ตอนนี้คำนวณฤกษ์ไม่ได้ Tommie จะตรวจสอบให้ครับ'); log_(row.v[COL.code], row.v[COL.nick], 'LINE', 'ผิดพลาด', e.message); }
}
function register_(token, uid, m) {
  var code = m[1].toUpperCase().replace(/^TB-?/, 'TB-'), dd = +m[2], mm = +m[3], yy = +m[4]; if (yy < 2400) yy += 543;
  var row = rows_().filter(function (r) { return String(r.v[COL.code]).toUpperCase() === code; })[0];
  var b = row ? dmy_(row.v[COL.bdate]) : null;
  if (!row || !b || b[0] !== dd || b[1] !== mm || b[2] !== yy) { log_(code, '', 'LINE', 'สมัครไม่ผ่าน', 'รหัสหรือวันเกิดไม่ตรง'); return reply_(token, 'รหัสหรือวันเกิดไม่ตรงกับที่บันทึกไว้ครับ ลองตรวจอีกครั้ง หรือทักถาม Tommie ได้เลยครับ'); }
  if (row.v[COL.lineId] && String(row.v[COL.lineId]) !== uid) { log_(code, row.v[COL.nick], 'LINE', 'สมัครซ้ำ', 'มีบัญชีอื่นผูกไว้แล้ว'); return reply_(token, 'รหัสนี้ผูกกับบัญชี LINE อื่นไว้แล้วครับ ทักบอก Tommie เพื่อเปลี่ยนให้'); }
  setCell_(row.r, COL.lineId, uid); setCell_(row.r, COL.consent, new Date());
  if (!row.v[COL.channel]) setCell_(row.r, COL.channel, 'LINE');
  log_(code, row.v[COL.nick], 'LINE', 'สมัครแล้ว', '');
  reply_(token, 'ลงทะเบียนเรียบร้อยครับ คุณ' + (row.v[COL.nick] || '') + '\nพิมพ์ "ฤกษ์วันนี้" หรือกดเมนูฤกษ์วันนี้ได้ทุกวัน\nพิมพ์ "ฤกษ์พรุ่งนี้" เพื่อดูล่วงหน้า\nยกเลิกได้ตลอดโดยทักบอก Tommie');
}
function reply_(token, text) {
  var key = props_().getProperty('LINE_TOKEN'); if (!key) throw new Error('ยังไม่ได้ตั้ง LINE_TOKEN');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + key }, payload: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] }) });
}

/* ---------- menu + setup ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Tommie BaZi')
    .addItem('ดูฤกษ์วันนี้ของแถวที่เลือก', 'previewRow')
    .addItem('เติมผังสี่เสาจากวันเกิด (แถวที่ว่าง)', 'fillPillars')
    .addItem('ส่งอีเมล/Notion ของวันนี้ตอนนี้เลย', 'morning')
    .addSeparator()
    .addItem('ตั้งเวลาส่งทุกเช้า 06:30', 'setupDaily')
    .addItem('ทดสอบการเชื่อมต่อ', 'checkSetup')
    .addToUi();
}
function previewRow() {
  var sh = book_().getSheetByName(SHEET), r = sh.getActiveRange().getRow(); if (r < 2) return SpreadsheetApp.getUi().alert('เลือกแถวลูกดวงก่อน');
  var X = dayFor_({ r: r, v: sh.getRange(r, 1, 1, 24).getValues()[0] }, ymdTh_(0));
  SpreadsheetApp.getUi().alert(X.text);
}
function fillPillars() {
  loadEngine_(); var n = 0;
  rows_().forEach(function (row) {
    if (String(row.v[COL.pillars] || '').trim()) return;
    try { var P = pillarsOf_(row); setCell_(row.r, COL.pillars, [P.y, P.m, P.d, P.h || '？？'].join(' ')); n++; } catch (e) { log_(row.v[COL.code], row.v[COL.nick], '-', 'เติมผังไม่ได้', e.message); }
  });
  SpreadsheetApp.getActive().toast('เติมผังแล้ว ' + n + ' แถว');
}
function setupDaily() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'morning') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('morning').timeBased().everyDays(1).atHour(6).nearMinute(30).inTimezone('Asia/Bangkok').create();
  props_().setProperty('SHEET_ID', book_().getId());
  SpreadsheetApp.getActive().toast('ตั้งเวลาแล้ว ระบบจะส่งทุกเช้าราว 06:30 น.');
}
function checkSetup() {
  var p = props_(), out = [];
  try { loadEngine_(); out.push('✅ โหลดสูตรจากแอป Studio ได้'); } catch (e) { out.push('❌ โหลดสูตรไม่ได้: ' + e.message); }
  out.push(p.getProperty('LINE_TOKEN') ? '✅ มี LINE_TOKEN' : '⚪ ยังไม่มี LINE_TOKEN (ข้ามได้ถ้ายังไม่ใช้ LINE)');
  out.push(p.getProperty('NOTION_TOKEN') && p.getProperty('NOTION_DB') ? '✅ มี NOTION_TOKEN และ NOTION_DB' : '⚪ ยังไม่ได้ตั้ง Notion (ข้ามได้)');
  out.push(ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'morning'; }) ? '✅ ตั้งเวลาส่งทุกเช้าแล้ว' : '⚪ ยังไม่ได้ตั้งเวลาส่งทุกเช้า');
  out.push('อีเมลเหลือส่งได้วันนี้: ' + MailApp.getRemainingDailyQuota());
  SpreadsheetApp.getUi().alert(out.join('\n'));
}
