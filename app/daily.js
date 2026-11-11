/* Tommie BaZi — ฤกษ์ประจำวัน (daily timing for one person). Needs TBZ (core.js) + Solar (lunar.js).
   Works in the browser (global TBZDaily) and in Node (module.exports) so the same rules can feed Notion.
   Everything here is a first draft for Tommie to review: favourable-element rules (扶抑), the scoring weights,
   and the advice wording. The natal input is only the four pillars + optional manual ธาตุให้คุณ/ให้โทษ. */
(function (root) {
  var C = root.TBZ || (typeof require !== 'undefined' ? require('./core.js') : null);
  var STEMS = C.STEMS, BR = C.BR, EL_S = C.EL_S, EL_TH = C.EL_TH;
  var GROUP = ['คู่ธาตุ', 'ถ่ายเท', 'โชคลาภ', 'อำนาจ', 'ส่งเสริม']; // relative to day master: same, output, wealth, power, resource
  var WEEKDAY = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  var MON_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mainEl(b) { return EL_S[STEMS.indexOf(C.HIDDEN[BR.indexOf(b)][0])]; }
  function mainYang(b) { return STEMS.indexOf(C.HIDDEN[BR.indexOf(b)][0]) % 2 === 0; }

  /* ---------- 24 solar terms ---------- */
  var TERMS = [ // [traditional, simplified, English, Thai] — numbered from 立春 = 1
    ['立春', '立春', 'Beginning of Spring', 'เริ่มฤดูใบไม้ผลิ'], ['雨水', '雨水', 'Rain Water', 'น้ำฝน'], ['驚蟄', '惊蛰', 'Awakening of Insects', 'แมลงตื่น'],
    ['春分', '春分', 'Spring Equinox', 'วสันตวิษุวัต'], ['清明', '清明', 'Clear and Bright', 'เช็งเม้ง'], ['穀雨', '谷雨', 'Grain Rain', 'ฝนพืชพันธุ์'],
    ['立夏', '立夏', 'Beginning of Summer', 'เริ่มฤดูร้อน'], ['小滿', '小满', 'Grain Buds', 'เมล็ดเริ่มเต่ง'], ['芒種', '芒种', 'Grain in Ear', 'ข้าวออกรวง'],
    ['夏至', '夏至', 'Summer Solstice', 'ครีษมายัน'], ['小暑', '小暑', 'Minor Heat', 'ร้อนน้อย'], ['大暑', '大暑', 'Major Heat', 'ร้อนมาก'],
    ['立秋', '立秋', 'Beginning of Autumn', 'เริ่มฤดูใบไม้ร่วง'], ['處暑', '处暑', 'End of Heat', 'สิ้นร้อน'], ['白露', '白露', 'White Dew', 'น้ำค้างขาว'],
    ['秋分', '秋分', 'Autumn Equinox', 'ศารทวิษุวัต'], ['寒露', '寒露', 'Cold Dew', 'น้ำค้างเย็น'], ['霜降', '霜降', "Frost's Descent", 'น้ำค้างแข็ง'],
    ['立冬', '立冬', 'Beginning of Winter', 'เริ่มฤดูหนาว'], ['小雪', '小雪', 'Minor Snow', 'หิมะน้อย'], ['大雪', '大雪', 'Major Snow', 'หิมะมาก'],
    ['冬至', '冬至', 'Winter Solstice', 'เหมายัน'], ['小寒', '小寒', 'Minor Cold', 'หนาวน้อย'], ['大寒', '大寒', 'Major Cold', 'หนาวมาก']];
  var TERM_BY = {}; TERMS.forEach(function (t, i) { TERM_BY[t[1]] = { n: i + 1, zh: t[0], en: t[2], th: t[3], qi: i % 2 === 1 }; });
  /* all terms around Gregorian year y as Thai wall-clock ms (UTC fields) */
  function terms(y) {
    var seen = {}, out = [];
    C.termTable(y).forEach(function (t) { var ms = t.ms - 3600000, info = TERM_BY[t.name]; if (!info || seen[ms]) return; seen[ms] = 1; out.push({ ms: ms, name: t.name, zh: info.zh, n: info.n, en: info.en, th: info.th, qi: info.qi }); });
    return out.sort(function (a, b) { return a.ms - b.ms; });
  }
  function termAt(ms) { // the term period containing Thai time ms
    var y = new Date(ms).getUTCFullYear(), t = terms(y);
    for (var i = t.length - 1; i >= 0; i--) if (t[i].ms <= ms) return { cur: t[i], next: t[i + 1] || null };
    return null;
  }

  /* ---------- moon phases (Meeus ch. 49, main terms; good to well under an hour) ---------- */
  function phaseJDE(k, q) { // q: 0 new, .25 first quarter, .5 full, .75 last quarter
    var kk = k + q, T = kk / 1236.85, r = Math.PI / 180;
    var jde = 2451550.09766 + 29.530588861 * kk + 0.00015437 * T * T;
    var E = 1 - 0.002516 * T, M = (2.5534 + 29.1053567 * kk) * r, Mp = (201.5643 + 385.81693528 * kk + 0.0107582 * T * T) * r, F = (160.7108 + 390.67050284 * kk - 0.0016118 * T * T) * r;
    var s = Math.sin;
    if (q === 0) jde += -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M);
    else if (q === 0.5) jde += -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * F) + 0.00734 * E * s(Mp - M) - 0.00515 * E * s(Mp + M) + 0.00209 * E * E * s(2 * M);
    else {
      jde += -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F) + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M);
      var W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M) + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F);
      jde += q === 0.25 ? W : -W;
    }
    return jde;
  }
  function moonPhases(y, m) { // {day: {q, ms}} for the Thai-time month
    var out = {}, k0 = Math.floor((y + (m - 1) / 12 - 2000) * 12.3685) - 1;
    for (var k = k0; k < k0 + 3; k++) [0, 0.25, 0.5, 0.75].forEach(function (q) {
      var ms = (phaseJDE(k, q) - 2440587.5) * 864e5 + 7 * 3600000, d = new Date(ms);
      if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) out[d.getUTCDate()] = { q: q, ms: ms };
    });
    return out;
  }
  var MOON_TH = { 0: 'จันทร์ดับ', 0.25: 'ข้างขึ้นครึ่งดวง', 0.5: 'จันทร์เต็มดวง', 0.75: 'ข้างแรมครึ่งดวง' };

  /* ---------- natal: favourable elements (扶抑, draft) ---------- */
  function natal(P, opts) { var A = C.analyse(P); if (opts && opts.verdict) C.applyVerdict(A.strength, opts.verdict); return { P: P, A: A, S: A.strength, dm: STEMS.indexOf(P.d[0]), dmEl: EL_S[STEMS.indexOf(P.d[0])] }; }
  function famEl(dmEl, f) { return (dmEl + f) % 5; } // f: 0 same, 1 output, 2 wealth, 3 power, 4 resource
  function proposeFav(N) {
    if (!N.P.h && !N.S.manual) return { good: [], bad: [], why: 'ไม่ทราบเวลาเกิด จึงยังไม่เสนอธาตุให้คุณ-ให้โทษ (ให้ผู้ดูยืนยันดิถี หรือกำหนดธาตุเอง)' };
    var S = N.S, d = N.dmEl, p = S.parts, E = function (f) { return famEl(d, f); }, k = S.verdict.k, why;
    var good, bad;
    if (k === 'weak') {
      var top = [['output', p.output], ['wealth', p.wealth], ['power', p.power]].sort(function (a, b) { return b[1] - a[1]; })[0][0];
      good = top === 'wealth' ? [E(0), E(4)] : [E(4), E(0)]; bad = top === 'power' ? [E(3), E(2), E(1)] : top === 'wealth' ? [E(2), E(1), E(3)] : [E(1), E(2), E(3)];
      why = 'ดิถีอ่อน เพราะ' + { output: 'ถ่ายเท', wealth: 'โชคลาภ', power: 'อำนาจ' }[top] + 'หนักที่สุด จึงเติม' + (top === 'wealth' ? 'คู่ธาตุก่อนส่งเสริม' : 'ส่งเสริมก่อนคู่ธาตุ');
    } else if (k === 'strong') {
      var resHeavy = p.resource > p.same;
      var feedRes = !resHeavy && p.resource > p.power; // อำนาจจะไปเลี้ยงส่งเสริมที่มีมากอยู่แล้ว จึงใช้ถ่ายเทระบายแทน
      good = resHeavy ? [E(2), E(1), E(3)] : feedRes ? [E(1), E(2), E(3)] : [E(3), E(1), E(2)]; bad = resHeavy ? [E(4), E(0)] : [E(0), E(4)];
      why = 'ดิถีแข็ง เพราะ' + (resHeavy ? 'ส่งเสริมหนัก จึงใช้โชคลาภคุมส่งเสริมเป็นหลัก' : feedRes ? 'คู่ธาตุหนักและส่งเสริมมีมาก ถ้าใช้อำนาจจะไปเลี้ยงส่งเสริม จึงใช้ถ่ายเทระบายเป็นหลัก ตามด้วยโชคลาภ' : 'คู่ธาตุหนัก จึงใช้อำนาจคุมคู่ธาตุเป็นหลัก');
    } else if (k === 'bal') {
      var mb = N.P.m[1], winter = '亥子丑'.indexOf(mb) >= 0, summer = '巳午未'.indexOf(mb) >= 0;
      var low = S.scores.map(function (v, i) { return [i, v]; }).sort(function (a, b) { return a[1] - b[1]; });
      var hi = low[low.length - 1][0];
      good = winter ? [1] : summer ? [4] : [low[0][0]]; if (good[0] !== low[0][0]) good.push(low[0][0]);
      bad = [winter ? 4 : summer ? 1 : hi].filter(function (e) { return good.indexOf(e) < 0; });
      why = 'ดิถีสมดุล ใช้ฤดูเกิดปรับ (調候)' + (winter ? ' เกิดเดือนหนาว ต้องการไฟ' : summer ? ' เกิดเดือนร้อน ต้องการน้ำ' : ' และเติมธาตุที่อ่อนที่สุดในผัง');
    } else if (k === 'follow') {
      var dom = [[1, p.output], [2, p.wealth], [3, p.power]].sort(function (a, b) { return b[1] - a[1]; })[0][0];
      good = [E(dom), E((dom + 4) % 5)].filter(function (e, i, a) { return a.indexOf(e) === i && e !== d && e !== E(4); }); bad = [E(4), E(0)];
      why = S.verdict.th + ' ให้ไหลตามกลุ่มที่แรงที่สุดและธาตุที่เลี้ยงกลุ่มนั้น อย่าปลุกดิถีขึ้นมาสู้';
    } else { // gold
      good = [E(0), E(4), E(1)]; bad = [E(3), E(2)];
      why = S.verdict.th + ' ไหลตามกระแสของตัวเอง ระบายด้วยถ่ายเทได้ หลีกอำนาจที่ไปชนกระแส';
    }
    return { good: good, bad: bad, why: why };
  }

  /* ---------- กิ่งฟ้า / ก้านดิน: each stem and branch gets its own status ----------
     stems follow their element; a branch follows its main qi, but a branch that ชง a natal branch carrying a
     ธาตุให้คุณ becomes ให้โทษ (e.g. metal is useful, 申 is fine, 酉 is not because 酉 ชง 卯 the useful wood).
     over = { st: {甲: 'g'|'b'|'n'}, br: {酉: 'b'} } — Tommie's own calls win. */
  var ST = { g1: 'ให้คุณหลัก', g: 'ให้คุณ', b: 'ให้โทษ', n: 'กลาง' };
  function itemFav(N, fav, over) {
    over = over || {}; var st = {}, br = {};
    var elSt = function (e) { var i = fav.good.indexOf(e); return i === 0 ? 'g1' : i > 0 ? 'g' : fav.bad.indexOf(e) >= 0 ? 'b' : 'n'; };
    STEMS.split('').forEach(function (s) { var a = elSt(EL_S[STEMS.indexOf(s)]), m = over.st && over.st[s]; st[s] = { s: m || a, auto: a, manual: !!m, why: 'ธาตุ' + EL_TH[EL_S[STEMS.indexOf(s)]] + ST[a] }; });
    var natB = ['y', 'm', 'd', 'h'].filter(function (k) { return N.P[k]; }).map(function (k) { return { k: k, b: N.P[k][1] }; });
    BR.split('').forEach(function (b) {
      var a = elSt(mainEl(b)), why = 'ธาตุแฝงหลัก' + EL_TH[mainEl(b)] + ST[a];
      natB.forEach(function (x) {
        if (BR[(BR.indexOf(b) + 6) % 12] === x.b && fav.good.indexOf(mainEl(x.b)) >= 0 && a !== 'b') { a = 'b'; why = 'ชง ' + x.b + ' ในผังเกิด (เสา' + { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' }[x.k] + ' ธาตุ' + EL_TH[mainEl(x.b)] + 'ให้คุณ)'; }
      });
      var m = over.br && over.br[b]; br[b] = { s: m || a, auto: a, manual: !!m, why: why };
    });
    return { st: st, br: br };
  }

  /* ---------- คู่ดาวเทพ (ten-god pairs) — readings written with Tommie ---------- */
  var COMBOS = [
    ['食神制殺', ['食神'], ['七杀'], 'ใช้ไหวพริบคุมแรงกดดันได้นิ่ง ยิ่งวิกฤตยิ่งเห็นฝีมือ', 'บันเทิงมากจนนักรบหมดแรง จะขาดวินัยและแรงผลัก'],
    ['殺印相生', ['七杀'], ['正印', '偏印'], 'แรงกดดันกลายเป็นบทเรียน ยิ่งโดนท้าทายยิ่งเก่ง มีผู้ใหญ่หนุน', 'ถ้าดิถีแข็งอยู่แล้ว จะดื้อและเชื่อตัวเองเกินไป'],
    ['官印相生', ['正官'], ['正印'], 'ก้าวหน้าตามขั้นในองค์กร ชื่อเสียงดี คนไว้ใจ', 'ยึดกฎจนไม่กล้าเสี่ยง พลาดโอกาสนอกกรอบ'],
    ['傷官見官', ['伤官'], ['正官'], 'ถ้ามีความรู้คั่นกลาง จะเป็นนักปฏิรูปที่กล้าพูดความจริง', 'ปากไวขัดผู้ใหญ่ มีเรื่องกับหัวหน้าหรือกฎระเบียบ ผู้หญิงระวังเรื่องคู่ครอง'],
    ['傷官配印', ['伤官'], ['正印'], 'ความเก่งมีหลักวิชาคุม เหมาะเป็นครู ที่ปรึกษา ผู้เชี่ยวชาญ', 'คิดเยอะจนลงมือช้า'],
    ['食神生財', ['食神'], ['正财', '偏财'], 'หาเงินจากฝีมือและสิ่งที่รัก งานบริการ อาหาร คอนเทนต์', 'ถ้าดิถีอ่อน ทำมาก เหนื่อยมาก ได้ไม่คุ้มแรง'],
    ['傷官生財', ['伤官'], ['偏财'], 'หัวการค้า ขายเก่ง เปลี่ยนไอเดียเป็นเงินไว', 'ได้เร็วเสียเร็ว ชอบเสี่ยงเกินตัว'],
    ['財官雙美', ['正财'], ['正官'], 'เงินหนุนตำแหน่ง ฐานะมั่นคง ผู้ชายได้คู่ครองช่วยงาน', 'ดิถีอ่อนจะแบกไม่ไหว เครียดจากความรับผิดชอบ'],
    ['財滋殺', ['偏财'], ['七杀'], 'ถ้าดิถีแข็ง เป็นนักธุรกิจกล้าได้กล้าเสีย', 'เงินพาแรงกดดันมา หนี้ ความขัดแย้ง การลงทุนเสี่ยงสูง'],
    ['梟神奪食', ['偏印'], ['食神'], 'ถ้ามีโชคลาภคุม จะเป็นคนมีญาณ วิเคราะห์ลึก', 'คิดมากจนความสุขหาย เริ่มแล้วล้มเลิก ผู้หญิงห่วงเรื่องลูก'],
    ['比劫奪財', ['劫财'], ['正财'], 'ถ้าดิถีอ่อน เพื่อนและหุ้นส่วนช่วยแบกงานใหญ่', 'เงินรั่ว หุ้นส่วนแย่งผลประโยชน์ ระวังค้ำประกัน ผู้ชายระวังมือที่สาม'],
    ['財壞印', ['正财', '偏财'], ['正印'], 'ถ้าดิถีแข็งเพราะส่งเสริมมาก เงินทำให้ลงมือจริง ไม่คิดอย่างเดียว', 'ทิ้งการเรียนหรือหลักการเพื่อเงิน ห่วงเรื่องมารดา'],
    ['官殺混雜', ['正官'], ['七杀'], 'ถ้ามีภาคีดึงออกไปตัวหนึ่ง จะกลายเป็นคนมีอำนาจชัดเจน', 'เป้าหมายไม่ชัด หลายนายหลายทาง ผู้หญิงระวังความรักซ้อน'],
    ['劫財駕殺', ['劫财'], ['七杀'], 'นักสู้ ผู้นำยามวิกฤต งานเครื่องแบบ งานที่ต้องกล้าตัดสินใจ', 'แข็งชนแข็ง ขัดแย้งรุนแรง ระวังอุบัติเหตุ'],
    ['比肩食神', ['比肩'], ['食神'], 'ทำงานกับเพื่อนแล้วสนุก สร้างชุมชนเก่ง', 'ทำเพราะสนุกแต่ไม่เก็บเงิน']
  ];
  function combos(N, fav) {
    var dm = N.dm, nm = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' }, have = {};
    var put = function (g, where, el) { (have[g] = have[g] || { where: [], el: el }).where.push(where); };
    ['y', 'm', 'h'].forEach(function (k) { if (N.P[k]) { var s = STEMS.indexOf(N.P[k][0]); put(C.god(dm, s), 'ราศีบน' + nm[k], EL_S[s]); } });
    ['y', 'm', 'd', 'h'].forEach(function (k) { if (N.P[k]) { var h = C.HIDDEN[BR.indexOf(N.P[k][1])][0], s = STEMS.indexOf(h); put(C.god(dm, s), 'ราศีล่าง' + nm[k], EL_S[s]); } });
    var out = [];
    COMBOS.forEach(function (c) {
      var a = c[1].filter(function (g) { return have[g]; }), b = c[2].filter(function (g) { return have[g]; });
      if (!a.length || !b.length) return;
      var gs = a.concat(b), els = gs.map(function (g) { return have[g].el; });
      var good = els.every(function (e) { return fav.good.indexOf(e) >= 0; }), bad = els.some(function (e) { return fav.bad.indexOf(e) >= 0; });
      out.push({ zh: c[0], th: gs.map(function (g) { return C.GODS[g]; }).join(' + '), good: c[3], bad: c[4], tone: good ? 'good' : bad ? 'caution' : 'mixed',
        where: gs.map(function (g) { return C.GODS[g] + ' (' + have[g].where.join(', ') + ')'; }) });
    });
    return out;
  }

  /* ---------- 三煞 (ทิศอสูร) and 沖 (ทิศแตก) ---------- */
  var SANSHA = { 申: '巳午未', 子: '巳午未', 辰: '巳午未', 亥: '申酉戌', 卯: '申酉戌', 未: '申酉戌', 寅: '亥子丑', 午: '亥子丑', 戌: '亥子丑', 巳: '寅卯辰', 酉: '寅卯辰', 丑: '寅卯辰' };
  /* อ.มาศ compass: each branch spans 30° starting at 子 = 0°–30° (shifted half a sector, like the 中氣 months) */
  function sector(b) { var i = BR.indexOf(b); return [i * 30, i * 30 + 30]; }
  function dirName(deg) { deg = ((deg % 360) + 360) % 360; return ['เหนือ', 'ตะวันออกเฉียงเหนือ', 'ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ'][Math.round(deg / 45) % 8]; }
  function directions(b) {
    var sha = SANSHA[b], clash = BR[(BR.indexOf(b) + 6) % 12], a = sector(sha[0])[0];
    return { asura: { br: sha, from: a, to: (a + 90) % 360, name: dirName(a + 45) }, broken: { br: clash, from: sector(clash)[0], to: sector(clash)[1], name: dirName(sector(clash)[0] + 15) } };
  }

  /* ---------- scoring (draft weights, 0–10) ---------- */
  function scorePillar(g, N, fav, extra) {
    var s = 5, why = [], IT = fav.items || (fav.items = itemFav(N, fav, fav.over));
    var V = { g1: 2, g: 1.5, b: -1.5, n: 0 }, si = IT.st[g[0]], bi = IT.br[g[1]];
    var a = V[si.s], b = Math.round(V[bi.s] * 2 / 3 * 100) / 100;
    if (a) { s += a; why.push((a > 0 ? '+' : '') + a + ' กิ่งฟ้า ' + g[0] + ' ' + ST[si.s] + (si.manual ? ' (ผู้ดูกำหนด)' : '')); }
    if (b) { s += b; why.push((b > 0 ? '+' : '') + b + ' ก้านดิน ' + g[1] + ' ' + ST[bi.s] + (bi.manual ? ' (ผู้ดูกำหนด)' : ' · ' + bi.why)); }
    var W = { 合: 0.75, 沖: -1.25, 刑: -0.5, 害: -0.4, 破: -0.3 }, names = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' };
    ['d', 'y', 'm', 'h'].forEach(function (k) {
      if (!N.P[k]) return; var w = k === 'd' ? 1.5 : 1;
      C.relPair(g[1], N.P[k][1]).forEach(function (x) { var v = (W[x.t] || 0) * w; if (!v) return; s += v; why.push((v > 0 ? '+' : '') + (Math.round(v * 100) / 100) + ' ' + x.th + ' ' + g[1] + N.P[k][1] + ' กับเสา' + names[k] + 'ของผังเกิด'); });
    });
    C.relPair(g[0], N.P.d[0]).forEach(function (x) { var v = x.t === '合' ? 0.5 : -0.75; s += v; why.push((v > 0 ? '+' : '') + v + ' ' + x.th + ' ' + g[0] + N.P.d[0] + ' กับตัวเรา'); });
    if (extra) extra.forEach(function (x) { s += x[0]; why.push((x[0] > 0 ? '+' : '') + x[0] + ' ' + x[1]); });
    s = Math.max(0, Math.min(10, Math.round(s * 2) / 2));
    return { score: s, why: why };
  }

  /* ---------- advice (draft wording for Tommie to edit) ---------- */
  var ADV = {
    'คู่ธาตุ': { theme: 'วันของเพื่อน ทีม และการแข่งขัน', good: ['ทำงานร่วมกับเพื่อนหรือทีม', 'ออกกำลังกาย ฝึกวินัยตัวเอง', 'นัดคุยกับคนที่มีเป้าหมายเดียวกัน'], bad: ['ให้ยืมเงินหรือค้ำประกัน', 'ลงทุนตามเพื่อนโดยไม่ศึกษา', 'แข่งขันเอาชนะจนเสียน้ำใจ'] },
    'ส่งเสริม': { theme: 'วันของความรู้ ผู้ใหญ่ และการพักฟื้น', good: ['เรียน อ่าน วางแผน', 'ขอคำแนะนำจากผู้ใหญ่หรือครู', 'ยื่นเอกสาร ทำเรื่องสัญญา ใบอนุญาต', 'พักผ่อน ดูแลสุขภาพ'], bad: ['คิดวนจนไม่ลงมือ', 'พึ่งคนอื่นมากเกินไป', 'ผัดวันประกันพรุ่ง'] },
    'ถ่ายเท': { theme: 'วันของไอเดีย การพูด และการแสดงฝีมือ', good: ['ทำคอนเทนต์ นำเสนอ ขายของ', 'สร้างสรรค์งานใหม่ ออกแบบ', 'สอน แบ่งปันความรู้'], bad: ['พูดตรงจนกระทบผู้ใหญ่หรือหัวหน้า', 'โพสต์ระบายอารมณ์', 'ใช้แรงเกินตัวจนหมดพลัง'] },
    'โชคลาภ': { theme: 'วันของเงิน การค้า และผลลัพธ์', good: ['เจรจาธุรกิจ ปิดการขาย', 'ทวงถาม เก็บเงิน ทำบัญชี', 'วางแผนการเงิน ลงมือทำงานที่ได้ผลจริง'], bad: ['ใช้จ่ายตามอารมณ์', 'ลงทุนเสี่ยงเกินตัว', 'โลภจนรับงานเกินกำลัง'] },
    'อำนาจ': { theme: 'วันของงาน หน้าที่ และผู้มีอำนาจ', good: ['ทำงานตามระบบ ส่งงานตรงเวลา', 'ติดต่อราชการหรือองค์กร', 'สัมภาษณ์งาน รับตำแหน่ง รับผิดชอบงานใหญ่'], bad: ['ขัดแย้งกับหัวหน้าหรือเจ้าหน้าที่', 'ฝ่ากฎระเบียบ', 'รับแรงกดดันไว้คนเดียว'] }
  };
  var BOOST = [ // element → colours, things, direction (อ.มาศ compass)
    { color: 'เขียว', items: 'ต้นไม้ ไม้ หนังสือ', dir: 'ตะวันออก' },
    { color: 'แดง ชมพู ม่วง', items: 'แสงสว่าง เทียน ของสีแดง', dir: 'ใต้' },
    { color: 'เหลือง น้ำตาล ครีม', items: 'หิน เซรามิก ดินเผา', dir: 'กึ่งกลาง และมุมรอยต่อ' },
    { color: 'ขาว เงิน ทอง', items: 'โลหะ เหรียญ เครื่องประดับเงินทอง', dir: 'ตะวันตก' },
    { color: 'ดำ น้ำเงิน กรมท่า', items: 'น้ำ ตู้ปลา ดื่มน้ำให้พอ', dir: 'เหนือ' }
  ];

  /* ---------- the day ---------- */
  function hoursOf(y, m, d, lon, dayGz) {
    var corr = C.solarCorr([y, m, d, 12, 0], lon, 7), ds = STEMS.indexOf(dayGz[0]), out = [];
    for (var i = 0; i < 12; i++) {
      var a = i * 120 - corr, b = a + 120, f = function (x) { x = Math.round(x); var dd = x < 0 ? -1 : x >= 1440 ? 1 : 0; x = ((x % 1440) + 1440) % 1440; return { t: pad(Math.floor(x / 60)) + ':' + pad(x % 60), dd: dd }; };
      out.push({ i: i, gz: STEMS[((ds % 5) * 2 + i) % 10] + BR[i], from: f(a), to: f(b), fromMin: a, toMin: b });
    }
    return { corr: corr, list: out };
  }
  function day(N, fav, y, m, d, lon, nowMs) {
    var P = C.pillars([y, m, d, 12, 0], { tz: 7, lon: lon }), H = hoursOf(y, m, d, lon, P.d), dmI = N.dm;
    var godOf = function (s) { return C.GODS[C.god(dmI, STEMS.indexOf(s))]; };
    var groupOf = function (s) { return GROUP[(EL_S[STEMS.indexOf(s)] - N.dmEl + 5) % 5]; };
    var dScore = scorePillar(P.d, N, fav);
    var hours = H.list.map(function (h) {
      var ex = []; C.relPair(h.gz[1], P.d[1]).forEach(function (x) { if (x.t === '沖') ex.push([-1, 'ยามชงวัน ' + h.gz[1] + P.d[1]]); });
      var sc = scorePillar(h.gz, N, fav, ex); h.score = sc.score; h.why = sc.why; h.god = godOf(h.gz[0]); return h;
    });
    var nowI = -1;
    if (nowMs != null) { var nd = new Date(nowMs); if (nd.getUTCFullYear() === y && nd.getUTCMonth() + 1 === m && nd.getUTCDate() === d) { var mins = nd.getUTCHours() * 60 + nd.getUTCMinutes(); hours.forEach(function (h) { if (mins >= h.fromMin && mins < h.toMin) nowI = h.i; }); } }
    var best = hours.slice().sort(function (a, b) { return b.score - a.score || a.i - b.i; }).slice(0, 3).sort(function (a, b) { return a.i - b.i; });
    var grp = groupOf(P.d[0]), gEl = EL_S[STEMS.indexOf(P.d[0])], IT0 = fav.items || (fav.items = itemFav(N, fav, fav.over)), isGood = /^g/.test(IT0.st[P.d[0]].s), isBad = IT0.st[P.d[0]].s === 'b';
    var adv = ADV[grp], doList = [], dontList = [];
    if (isBad) { doList.push('เสริมธาตุให้คุณให้มากกว่าปกติ (ดูหัวข้อควรเสริม)'); doList.push(adv.good[0] + ' แบบพอดี'); dontList = adv.bad.slice(); }
    else { doList = adv.good.slice(); dontList = adv.bad.slice(0, 2); }
    var natClash = [];
    ['d', 'y'].forEach(function (k) { C.relPair(P.d[1], N.P[k][1]).forEach(function (x) { if (x.t === '沖' || x.t === '刑') natClash.push({ k: k, x: x }); }); });
    natClash.forEach(function (c) { dontList.push((c.k === 'd' ? 'วันนี้' + c.x.th + 'กับเสาวันเกิด (ตัวเรา/คู่ครอง): ' : 'วันนี้' + c.x.th + 'กับเสาปีเกิด (ครอบครัว/ผู้ใหญ่): ') + 'เลี่ยงการตัดสินใจใหญ่ เดินทางให้เผื่อเวลา ใจเย็นกับคนใกล้ตัว'); });
    C.relPair(P.d[1], N.P.d[1]).forEach(function (x) { if (x.t === '合') doList.push('วันนี้ภาคีกับเสาวันเกิด เหมาะนัดคุย ขอความร่วมมือ ทำเรื่องคู่ครอง'); });
    var dirD = directions(P.d[1]);
    dontList.push('เลี่ยงหันหน้าทำงานสำคัญหรือเดินทางไปทาง' + dirD.asura.name + ' (ทิศอสูร ' + dirD.asura.from + '°–' + dirD.asura.to + '°) และ' + dirD.broken.name + ' (ทิศแตก ' + dirD.broken.from + '°–' + dirD.broken.to + '°)');
    var boost = fav.good.slice(0, 2).map(function (e) { return { el: e, th: EL_TH[e], color: BOOST[e].color, items: BOOST[e].items, dir: BOOST[e].dir }; });
    var reduce = fav.bad.slice(0, 1).map(function (e) { return { el: e, th: EL_TH[e], color: BOOST[e].color }; });
    var date = new Date(Date.UTC(y, m - 1, d)), msNoon = Date.UTC(y, m - 1, d, 12);
    return {
      y: y, m: m, d: d, weekday: WEEKDAY[date.getUTCDay()], label: WEEKDAY[date.getUTCDay()] + 'ที่ ' + d + ' ' + MON_S[m - 1] + ' ' + (y + 543),
      P: P, gods: { y: godOf(P.y[0]), m: godOf(P.m[0]), d: godOf(P.d[0]) }, bgods: { y: godOf(C.HIDDEN[BR.indexOf(P.y[1])][0]), m: godOf(C.HIDDEN[BR.indexOf(P.m[1])][0]), d: godOf(C.HIDDEN[BR.indexOf(P.d[1])][0]) },
      group: grp, theme: adv.theme, dayGood: isGood, dayBad: isBad, score: dScore.score, why: dScore.why,
      hours: hours, nowI: nowI, best: best, corr: H.corr,
      doList: doList, dontList: dontList, boost: boost, reduce: reduce, dirs: { d: dirD, m: directions(P.m[1]), y: directions(P.y[1]) }, term: termAt(msNoon)
    };
  }
  function monthGrid(N, fav, y, m, lon) {
    var n = new Date(Date.UTC(y, m, 0)).getUTCDate(), first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), moon = moonPhases(y, m), T = terms(y), days = [];
    for (var d = 1; d <= n; d++) {
      var g = C.pillars([y, m, d, 12, 0], { tz: 7, lon: lon }).d, sc = scorePillar(g, N, fav).score, mk = null;
      T.forEach(function (t) { var td = new Date(t.ms); if (td.getUTCFullYear() === y && td.getUTCMonth() + 1 === m && td.getUTCDate() === d) mk = t; });
      days.push({ d: d, gz: g, score: sc, moon: moon[d] || null, term: mk });
    }
    return { y: y, m: m, first: first, days: days };
  }
  function text(R, who, fav) {
    var L = [];
    L.push('📅 ' + R.label + (who ? ' · ' + who : ''));
    L.push('ประจำวัน: ' + R.P.d + ' (' + R.gods.d + ' · กลุ่ม' + R.group + ') — ' + R.theme);
    L.push('ปี ' + R.P.y + ' · เดือน ' + R.P.m + ' · คะแนนวัน ' + R.score + '/10');
    if (R.boost.length) L.push('✨ เสริม: ' + R.boost.map(function (b) { return 'ธาตุ' + b.th + ' (สี' + b.color + ' · ' + b.items + ' · ทิศ' + b.dir + ')'; }).join(' / '));
    if (R.reduce.length) L.push('🔻 ลด: สี' + R.reduce[0].color + ' (ธาตุ' + R.reduce[0].th + ')');
    L.push('✅ ควรทำ: ' + R.doList.join(' · '));
    L.push('⛔ ไม่ควรทำ: ' + R.dontList.join(' · '));
    L.push('⏰ ยามดี: ' + R.best.map(function (h) { return h.from.t + '–' + h.to.t + ' (' + h.gz + ' ' + h.score + ')'; }).join(', '));
    if (R.term) L.push('🌏 ปักษ์: ' + R.term.cur.zh + ' ' + R.term.cur.th + ' (' + R.term.cur.n + ')');
    return L.join('\n');
  }
  var api = { natal: natal, proposeFav: proposeFav, itemFav: itemFav, combos: combos, COMBOS: COMBOS, ST: ST, day: day, monthGrid: monthGrid, text: text, directions: directions, moonPhases: moonPhases, MOON_TH: MOON_TH, terms: terms, termAt: termAt, scorePillar: scorePillar, GROUP: GROUP, mainEl: mainEl, mainYang: mainYang, BOOST: BOOST };
  if (typeof module !== 'undefined') module.exports = api; else root.TBZDaily = api;
})(this);
