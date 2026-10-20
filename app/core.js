/* Tommie BaZi core — chart + analysis. Needs lunar-javascript (6tail, MIT) loaded as global Solar.
   Systems: 'amat' (อ.มาศ: 冬至 year, 中氣 months, day changes 00:00, 子 hour = 00:00–01:59)
            'std'  (立春 year, 節 months, 子 hour = 23:00–00:59, 23:00 day rule selectable).
   Times: input is Thai clock time (tz 7). Solar-term tables are UTC+8; true solar time = longitude + NOAA equation of time. */
(function (root) {
  var STEMS = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
  var EL_S = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4], EL_B = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var EL_TH = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'], EL_ZH = '木火土金水', EL_KEY = ['wood', 'fire', 'earth', 'gold', 'water'];
  var BR_TH = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน'];
  var QI = { '冬至': 0, '大寒': 1, '雨水': 2, '春分': 3, '谷雨': 4, '小满': 5, '夏至': 6, '大暑': 7, '处暑': 8, '秋分': 9, '霜降': 10, '小雪': 11 };
  var JIE = { '大雪': 0, '小寒': 1, '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7, '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11 };
  var TERM_TH = { '冬至': 'เหมายัน', '夏至': 'ครีษมายัน', '春分': 'วสันตวิษุวัต', '秋分': 'ศารทวิษุวัต', '立春': 'เริ่มวสันต์' };
  // 藏干 (main qi first)
  var HIDDEN = ['癸', '己癸辛', '甲丙戊', '乙', '戊乙癸', '丙庚戊', '丁己', '己丁乙', '庚壬戊', '辛', '戊辛丁', '壬甲'];
  // 十神 — draft Thai names (to be reviewed by Tommie)
  var GODS = {
    '比肩': 'คู่มิตร', '劫财': 'คู่แข่ง', '食神': 'บันเทิง', '伤官': 'ต่อต้าน', '偏财': 'ลาภลอย',
    '正财': 'การเงิน', '七杀': 'นักรบ', '正官': 'ขุนนาง', '偏印': 'สัมผัสที่ 6', '正印': 'ความรู้'
  };
  var GOD_TRAD = { '劫财': '劫財', '伤官': '傷官', '偏财': '偏財', '正财': '正財', '七杀': '七殺' };
  var STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
  var STAGES_TH = ['เกิด', 'อาบน้ำ', 'สวมหมวก', 'รับตำแหน่ง', 'รุ่งเรือง', 'เสื่อม', 'ป่วย', 'ตาย', 'สุสาน', 'สูญสิ้น', 'ปฏิสนธิ', 'ครรภ์'];
  var CS_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 長生 branch for each stem (戊/己 follow 丙/丁)
  var NAYIN = ['海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土', '霹靂火', '松柏木', '長流水',
    '砂中金', '山下火', '平地木', '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];

  function idx60(gz) { var s = STEMS.indexOf(gz[0]), b = BR.indexOf(gz[1]); for (var i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i; return -1; }
  function gz(i) { i = ((i % 60) + 60) % 60; return STEMS[i % 10] + BR[i % 12]; }
  function add(a, min) { var t = new Date(Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4]) + min * 60000); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes()]; }
  function S(a) { return Solar.fromYmdHms(a[0], a[1], a[2], a[3], a[4], 0); }
  function solMs(s) { return Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()); } // as UTC+8 wall clock
  function jdn(y, m, d) { var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; }

  /* ---------- time ---------- */
  function eot(msUTC) { // NOAA / Meeus equation of time, minutes
    var jd = msUTC / 864e5 + 2440587.5, T = (jd - 2451545) / 36525, r = Math.PI / 180;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * r);
    var y = Math.tan(eps * r / 2); y *= y;
    var E = y * Math.sin(2 * L0 * r) - 2 * e * Math.sin(M * r) + 4 * e * y * Math.sin(M * r) * Math.cos(2 * L0 * r) - 0.5 * y * y * Math.sin(4 * L0 * r) - 1.25 * e * e * Math.sin(2 * M * r);
    return 4 * E / r;
  }
  function solarCorr(t, lon, tz) { return (lon - tz * 15) * 4 + eot(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4]) - tz * 3600000); }
  function termTable(y) { // all terms whose UTC+8 time falls in Gregorian year y (and neighbours), sorted
    var out = [], seen = {};
    [y - 1, y, y + 1].forEach(function (yy) {
      var t = Solar.fromYmd(yy, 6, 1).getLunar().getJieQiTable();
      Object.keys(t).forEach(function (k) {
        var s = t[k], nm = k; if (/^[A-Z_]+$/.test(k)) nm = { DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒', LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', DA_XUE: '大雪' }[k];
        if (!nm) return; var ms = solMs(s), key = nm + ms; if (seen[key]) return; seen[key] = 1; out.push({ name: nm, ms: ms });
      });
    });
    return out.sort(function (a, b) { return a.ms - b.ms; });
  }
  function dongZhi(y) { var t = termTable(y); for (var i = 0; i < t.length; i++) if (t[i].name === '冬至' && new Date(t[i].ms).getUTCFullYear() === y) return t[i].ms; throw new Error('冬至 ' + y); }

  /* ---------- pillars ---------- */
  function pillars(t, o) {
    o = o || {}; var tz = o.tz == null ? 7 : o.tz, sys = o.system || 'amat';
    var bj = add(t, (8 - tz) * 60), bjMs = Date.UTC(bj[0], bj[1] - 1, bj[2], bj[3], bj[4]);
    var corr = (o.lon != null && !o.noTime) ? solarCorr(t, o.lon, tz) : 0, L = add(t, corr);
    var r = { system: sys, corr: corr, local: L, bjMs: bjMs, noTime: !!o.noTime };
    if (sys === 'std') {
      var e8 = S(bj).getLunar().getEightChar(); r.y = e8.getYear(); r.m = e8.getMonth();
      var e = S(L).getLunar().getEightChar(); e.setSect(o.lateZi === 'next' ? 1 : 2); r.d = e.getDay(); r.h = e.getTime();
      r.monthStart = S(bj).getLunar().getPrevJie(false).getName();
    } else {
      var sy = bj[0]; if (bjMs >= dongZhi(bj[0])) sy += 1;
      r.y = gz(sy - 4); r.solarYear = sy;
      var q = S(bj).getLunar().getPrevQi(false), mb = QI[q.getName()];
      var qs = q.getSolar(), qa = add([qs.getYear(), qs.getMonth(), qs.getDay(), qs.getHour(), qs.getMinute()], 1);
      r.m = S(qa).getLunar().getEightChar().getMonth();
      if (r.m[1] !== BR[mb]) throw new Error('month mismatch');
      r.monthStart = q.getName();
      var di = jdn(L[0], L[1], L[2]) + 49; r.d = gz(di);
      var hb = Math.floor(L[3] / 2) % 12; r.h = STEMS[(((di % 10) % 5) * 2 + hb) % 10] + BR[hb];
    }
    if (o.noTime) r.h = null;
    return r;
  }

  /* ---------- analysis ---------- */
  function god(dm, s) { // ten god of stem s relative to day master dm (indices)
    var a = EL_S[dm], b = EL_S[s], same = (dm % 2) === (s % 2), rel = (b - a + 5) % 5;
    return [same ? '比肩' : '劫财', same ? '食神' : '伤官', same ? '偏财' : '正财', same ? '七杀' : '正官', same ? '偏印' : '正印'][rel];
  }
  function stage(s, b) { var st = CS_START[s], k = s % 2 === 0 ? (b - st + 12) % 12 : (st - b + 12) % 12; return k; }
  function nayin(g) { return NAYIN[Math.floor(idx60(g) / 2)]; }
  var PAIR = function (list) { var m = {}; list.forEach(function (p) { m[p[0] + p[1]] = m[p[1] + p[0]] = p[2]; }); return m; };
  var LIUHE = PAIR([['子', '丑', '土'], ['寅', '亥', '木'], ['卯', '戌', '火'], ['辰', '酉', '金'], ['巳', '申', '水'], ['午', '未', '土']]);
  var CHONG = PAIR([['子', '午', 1], ['丑', '未', 1], ['寅', '申', 1], ['卯', '酉', 1], ['辰', '戌', 1], ['巳', '亥', 1]]);
  var HAI = PAIR([['子', '未', 1], ['丑', '午', 1], ['寅', '巳', 1], ['卯', '辰', 1], ['申', '亥', 1], ['酉', '戌', 1]]);
  var PO = PAIR([['子', '酉', 1], ['午', '卯', 1], ['巳', '申', 1], ['寅', '亥', 1], ['辰', '丑', 1], ['戌', '未', 1]]);
  var XING = PAIR([['寅', '巳', 1], ['巳', '申', 1], ['寅', '申', 1], ['丑', '戌', 1], ['戌', '未', 1], ['丑', '未', 1], ['子', '卯', 1], ['辰', '辰', 1], ['午', '午', 1], ['酉', '酉', 1], ['亥', '亥', 1]]);
  var GANHE = PAIR([['甲', '己', '土'], ['乙', '庚', '金'], ['丙', '辛', '水'], ['丁', '壬', '木'], ['戊', '癸', '火']]);
  var GANCHONG = PAIR([['甲', '庚', 1], ['乙', '辛', 1], ['丙', '壬', 1], ['丁', '癸', 1]]);
  var SANHE = [['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金']];
  var SANHUI = [['寅卯辰', '木'], ['巳午未', '火'], ['申酉戌', '金'], ['亥子丑', '水']];
  var EL_FROM_ZH = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
  function relPair(a, b) { // relations between two branches or two stems
    var out = [], k = a + b;
    if (STEMS.indexOf(a) >= 0) { if (GANHE[k]) out.push({ t: '合', th: 'ภาคี', x: 'ภาคีราศีบน ' + a + b + ' (五合) เป็นธาตุ' + EL_TH[EL_FROM_ZH[GANHE[k]]] }); if (GANCHONG[k]) out.push({ t: '沖', th: 'ชง', x: 'ชงราศีบน ' + a + b + ' (天干沖)' }); return out; }
    if (LIUHE[k]) out.push({ t: '合', th: 'ภาคี', x: 'ภาคีราศีล่าง ' + a + b + ' (六合) เป็นธาตุ' + EL_TH[EL_FROM_ZH[LIUHE[k]]] });
    if (CHONG[k]) out.push({ t: '沖', th: 'ชง', x: 'ชง ' + a + b + ' (六沖)' });
    if (XING[k]) out.push({ t: '刑', th: 'เฮ้ง', x: a === b ? 'เฮ้งตัวเอง ' + a + b + ' (自刑)' : 'เฮ้ง ' + a + b + ' (刑)' });
    if (HAI[k]) out.push({ t: '害', th: 'ไห่', x: 'ไห่ ' + a + b + ' (害)' });
    if (PO[k]) out.push({ t: '破', th: 'ผั่ว', x: 'ผั่ว ' + a + b + ' (破)' });
    return out;
  }
  function groupRel(branches) { // 三合 / 三會 (full or half)
    var out = [], set = branches.join('');
    SANHE.forEach(function (g) { var n = 0; for (var i = 0; i < 3; i++) if (set.indexOf(g[0][i]) >= 0) n++; if (n === 3) out.push({ t: '三合', th: 'ภาคี 3', x: 'ภาคีสามประสาน ' + g[0] + ' (三合) เป็นธาตุ' + EL_TH[EL_FROM_ZH[g[1]]] }); else if (n === 2 && set.indexOf(g[0][1]) >= 0) out.push({ t: '半合', th: 'ครึ่งภาคี', x: 'ครึ่งภาคีสามประสาน ' + g[0] + ' (半合 ขาด ' + g[0].split('').filter(function (c) { return set.indexOf(c) < 0; }).join('') + ')' }); });
    SANHUI.forEach(function (g) { var n = 0; for (var i = 0; i < 3; i++) if (set.indexOf(g[0][i]) >= 0) n++; if (n === 3) out.push({ t: '三會', th: 'ภาคีฤดู', x: 'ภาคีฤดู ' + g[0] + ' (三會) เป็นธาตุ' + EL_TH[EL_FROM_ZH[g[1]]] }); });
    return out;
  }
  /* strength — Tommie's weights: month branch (season) 2, day branch 1.5, every other character 1 (day stem included) */
  function strength(P) {
    var cells = [['y', 0, 1], ['y', 1, 1], ['m', 0, 1], ['m', 1, 2], ['d', 0, 1], ['d', 1, 1.5]];
    if (P.h) cells.push(['h', 0, 1], ['h', 1, 1]);
    var sc = [0, 0, 0, 0, 0], total = 0;
    cells.forEach(function (c) { var ch = P[c[0]][c[1]], el = c[1] === 0 ? EL_S[STEMS.indexOf(ch)] : EL_B[BR.indexOf(ch)]; sc[el] += c[2]; total += c[2]; });
    var dm = EL_S[STEMS.indexOf(P.d[0])], res = (dm + 4) % 5;
    var support = sc[dm] + sc[res];
    var verdict = support >= 8 ? { k: 'gold', th: 'ดิถีกระแสทอง' } : support >= 5 ? { k: 'strong', th: 'ดิถีแข็ง' } : support >= 4.5 ? { k: 'bal', th: 'ดิถีสมดุล' } : support >= 2 ? { k: 'weak', th: 'ดิถีอ่อน' } : { k: 'follow', th: 'ดิถีตามกระแส' };
    return { scores: sc, total: total, dm: dm, resource: res, support: support, oppose: total - support, pct: support / total * 100, verdict: verdict,
      parts: { same: sc[dm], resource: sc[res], output: sc[(dm + 1) % 5], wealth: sc[(dm + 2) % 5], power: sc[(dm + 3) % 5] } };
  }
  function analyse(P) {
    var dm = STEMS.indexOf(P.d[0]), keys = P.h ? ['h', 'd', 'm', 'y'] : ['d', 'm', 'y'], cols = {};
    keys.forEach(function (k) {
      var g = P[k], s = STEMS.indexOf(g[0]), b = BR.indexOf(g[1]);
      cols[k] = { gz: g, stem: g[0], branch: g[1], sEl: EL_S[s], bEl: EL_B[b], god: k === 'd' ? null : god(dm, s),
        hidden: HIDDEN[b].split('').map(function (h) { return { s: h, el: EL_S[STEMS.indexOf(h)], god: god(dm, STEMS.indexOf(h)) }; }),
        stage: stage(dm, b), selfStage: stage(s, b), nayin: nayin(g) };
    });
    var rel = [], names = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' };
    for (var i = 0; i < keys.length; i++) for (var j = i + 1; j < keys.length; j++) {
      var a = keys[i], b = keys[j];
      relPair(P[a][0], P[b][0]).forEach(function (x) { rel.push({ a: a, b: b, on: 'stem', t: x.t, x: x.x, label: names[a] + '–' + names[b] }); });
      relPair(P[a][1], P[b][1]).forEach(function (x) { rel.push({ a: a, b: b, on: 'branch', t: x.t, x: x.x, label: names[a] + '–' + names[b] }); });
    }
    keys.forEach(function (k) { if (P[k][1] === P[k][1] && false) return; });
    var groups = groupRel(keys.map(function (k) { return P[k][1]; }));
    return { dm: dm, cols: cols, rel: rel, groups: groups, strength: strength(P) };
  }
  /* 大運 — forward for yang-year male / yin-year female; start age = (minutes to next or previous month boundary) / 3 days per year */
  function luck(P, sex, n) {
    n = n || 10;
    var ys = STEMS.indexOf(P.y[0]), yang = ys % 2 === 0, fwd = (sex === 'ชาย') === yang;
    var lun = Solar.fromYmdHms.apply(null, [new Date(P.bjMs).getUTCFullYear(), new Date(P.bjMs).getUTCMonth() + 1, new Date(P.bjMs).getUTCDate(), new Date(P.bjMs).getUTCHours(), new Date(P.bjMs).getUTCMinutes(), 0]).getLunar();
    var bound = P.system === 'std' ? (fwd ? lun.getNextJie(false) : lun.getPrevJie(false)) : (fwd ? lun.getNextQi(false) : lun.getPrevQi(false));
    var bms = solMs(bound.getSolar()), diffMin = Math.abs(bms - P.bjMs) / 60000;
    /* proportion: 3 days (4,320 min) of real time = 1 year of life, so every minute to the boundary = 1/4320 year */
    var yearsF = diffMin / 4320;
    var birth = new Date(P.bjMs - 3600000); // Thai wall clock (UTC fields)
    var start = new Date(birth.getTime() + yearsF * 365.2422 * 864e5);
    var ym = yearsF * 12, sy = Math.floor(yearsF), smo = Math.floor(ym - sy * 12), sd = (ym - Math.floor(ym)) * 30.436875, sdd = Math.floor(sd), shh = Math.floor((sd - sdd) * 24), smm = Math.round(((sd - sdd) * 24 - shh) * 60);
    if (smm === 60) { smm = 0; shh++; }
    var addYears = function (d, yrs) { var x = new Date(d.getTime()); x.setUTCFullYear(x.getUTCFullYear() + yrs); return x; };
    var mi = idx60(P.m), list = [];
    for (var k = 1; k <= n; k++) {
      var g = gz(mi + (fwd ? k : -k)), from = addYears(start, (k - 1) * 10), to = addYears(start, k * 10);
      list.push({ gz: g, i: k, ageFrom: yearsF + (k - 1) * 10, ageTo: yearsF + k * 10, yearFrom: from.getUTCFullYear(), dateFrom: from, dateTo: to });
    }
    return { forward: fwd, boundary: bound.getName(), boundaryMs: bms, diffMin: diffMin, days: diffMin / 1440, years: yearsF, start: { y: sy, m: smo, d: sdd, h: shh, mi: smm }, startDate: start, list: list };
  }
  /* 流年 — amat year Y runs from 冬至 of Y-1; std year Y runs from 立春 of Y */
  function yearGz(Y) { return gz(Y - 4); }
  /* 流月 — the 12 months of solar year Y with their start instants (UTC+8 ms) */
  function months(Y, system) {
    var out = [], set = system === 'std' ? JIE : QI;
    var all = termTable(Y - 1).concat(termTable(Y), termTable(Y + 1)).filter(function (t) { return set[t.name] != null; });
    var seen = {}; all = all.filter(function (t) { if (seen[t.ms]) return false; seen[t.ms] = 1; return true; }).sort(function (a, b) { return a.ms - b.ms; });
    var startName = system === 'std' ? '立春' : '冬至', from;
    for (var i = 0; i < all.length; i++) { var yy = new Date(all[i].ms).getUTCFullYear(); if (all[i].name === startName && (system === 'std' ? yy === Y : yy === Y - 1)) { from = i; break; } }
    for (var k = 0; k < 12; k++) {
      var t = all[from + k], end = all[from + k + 1], a = new Date(t.ms + 60000);
      var mg = Solar.fromYmdHms(a.getUTCFullYear(), a.getUTCMonth() + 1, a.getUTCDate(), a.getUTCHours(), a.getUTCMinutes(), 0).getLunar().getEightChar().getMonth();
      if (system !== 'std') { var b = BR.indexOf(mg[1]); if (b !== QI[t.name]) throw new Error('month table'); }
      out.push({ gz: mg, term: t.name, startMs: t.ms - 3600000, endMs: end ? end.ms - 3600000 : null }); // → Thai time ms (UTC+7 wall clock)
    }
    return out;
  }
  function relTo(P, g) { // relations of a period pillar g to the natal chart
    var out = [], names = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' };
    ['y', 'm', 'd', 'h'].forEach(function (k) {
      if (!P[k]) return;
      relPair(g[0], P[k][0]).forEach(function (x) { out.push({ k: k, on: 'stem', t: x.t, x: x.x + ' กับเสา' + names[k] }); });
      relPair(g[1], P[k][1]).forEach(function (x) { out.push({ k: k, on: 'branch', t: x.t, x: x.x + ' กับเสา' + names[k] }); });
    });
    return out;
  }
  var api = { STEMS: STEMS, BR: BR, EL_S: EL_S, EL_B: EL_B, EL_TH: EL_TH, EL_ZH: EL_ZH, EL_KEY: EL_KEY, BR_TH: BR_TH, HIDDEN: HIDDEN, GODS: GODS, GOD_TRAD: GOD_TRAD,
    STAGES: STAGES, STAGES_TH: STAGES_TH, TERM_TH: TERM_TH, pillars: pillars, analyse: analyse, luck: luck, months: months, yearGz: yearGz, relTo: relTo, relPair: relPair,
    god: god, stage: stage, nayin: nayin, idx60: idx60, gz: gz, eot: eot, solarCorr: solarCorr, strength: strength };
  if (typeof module !== 'undefined') module.exports = api; else root.TBZ = api;
})(this);
