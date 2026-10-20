/* SVG pictures for screen and print: chart card, element bars, luck strip, compare radar. Needs TBZ (core.js). */
(function (root) {
  var C = root.TBZ;
  var COL = ['#46eb82', '#ff5c28', '#d68e46', '#ffd660', '#3ca5ff'];
  var KAN = '"Noto Serif TC","Noto Serif CJK TC",serif', UI = '"Prompt","Noto Sans Thai",sans-serif';
  var PZH = { y: '年', m: '月', d: '日', h: '時' }, PTH = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mix(hex, a) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r * a + 255 * (1 - a)) + ',' + Math.round(g * a + 255 * (1 - a)) + ',' + Math.round(b * a + 255 * (1 - a)) + ')'; }
  function defs(id) {
    return '<defs>' + COL.map(function (c, i) {
      return '<linearGradient id="' + id + 'g' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".28"/><stop offset=".85" stop-color="#0e1018" stop-opacity="1"/></linearGradient>' +
        '<filter id="' + id + 'f' + i + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>';
    }).join('') + '</defs>';
  }
  function tile(id, x, y, w, h, el, ch, sub, dm) {
    var c = COL[el];
    return '<rect x="' + (x + 4) + '" y="' + (y + 6) + '" width="' + (w - 8) + '" height="' + (h - 8) + '" rx="14" fill="' + c + '" opacity=".35" filter="url(#' + id + 'f' + el + ')"/>' +
      (dm ? '<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="' + (w + 10) + '" height="' + (h + 10) + '" rx="18" fill="none" stroke="#d68e46" stroke-width="1.5" opacity=".9"/>' : '') +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="14" fill="url(#' + id + 'g' + el + ')" stroke="' + c + '" stroke-width="1.6"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h * .58) + '" text-anchor="middle" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="' + (h * .5) + '" fill="' + mix(c, .55) + '">' + ch + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h - 12) + '" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-size="13" fill="' + c + '">' + esc(sub) + '</text>';
  }
  /* full chart card: right-to-left 時 日 月 年 */
  function chart(P, A, opt) {
    opt = opt || {}; var id = 'c' + Math.random().toString(36).slice(2, 7);
    var ks = P.h ? ['h', 'd', 'm', 'y'] : ['d', 'm', 'y'], n = ks.length, W = 720, pad = 28, gap = 16, cw = (W - pad * 2 - gap * (n - 1)) / n, th = 128;
    var H = 520, o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="ผังสี่เสา ' + ks.map(function (k) { return P[k]; }).join(' ') + '">' + defs(id) +
      '<rect width="' + W + '" height="' + H + '" rx="22" fill="#07080d"/><rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="22" fill="none" stroke="#272b3d"/>' +
      '<text x="' + pad + '" y="34" font-family=' + "'" + UI + "'" + ' font-size="13" fill="#9a9db0">' + esc(opt.title || 'ผังสี่เสาหลัก') + '</text>' +
      '<text x="' + (W - pad) + '" y="34" text-anchor="end" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="15" fill="#ffd660" letter-spacing="4">四柱八字</text>';
    ks.forEach(function (k, i) {
      var x = pad + i * (cw + gap), col = A.cols[k], g = col.god, s = C.STEMS.indexOf(col.stem), b = C.BR.indexOf(col.branch);
      o += '<text x="' + (x + cw / 2) + '" y="70" text-anchor="middle" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="22" fill="#ecebe6">' + PZH[k] + '</text>' +
        '<text x="' + (x + cw / 2) + '" y="90" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-size="13" fill="#9a9db0">' + PTH[k] + '</text>' +
        '<text x="' + (x + cw / 2) + '" y="118" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-weight="600" font-size="14" fill="#ffd660">' + esc(g ? C.GODS[g] : 'ตัวเรา · 日主') + '</text>' +
        tile(id, x, 132, cw, th, C.EL_S[s], col.stem, C.EL_TH[C.EL_S[s]] + (s % 2 ? 'หยิน' : 'หยาง'), k === 'd') +
        tile(id, x, 132 + th + 14, cw, th, C.EL_B[b], col.branch, C.BR_TH[b] + ' · ' + C.EL_TH[C.EL_B[b]]);
      col.hidden.forEach(function (hd, j) {
        var yy = 132 + th * 2 + 14 + 34 + j * 26;
        o += '<text x="' + (x + cw / 2 - 6) + '" y="' + yy + '" text-anchor="end" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="17" fill="' + COL[hd.el] + '">' + hd.s + '</text>' +
          '<text x="' + (x + cw / 2 + 2) + '" y="' + (yy - 1) + '" font-family=' + "'" + UI + "'" + ' font-size="12.5" fill="#c9cbd8">' + esc(C.GODS[hd.god]) + '</text>';
      });
    });
    return o + '</svg>';
  }
  /* element bars */
  function bars(S) {
    var W = 720, row = 34, H = 30 + row * 5, o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="กำลังธาตุ">' +
      '<rect width="' + W + '" height="' + H + '" rx="18" fill="#07080d"/>';
    S.scores.forEach(function (v, i) {
      var y = 22 + i * row, w = (W - 266) * v / S.total;
      o += '<text x="28" y="' + (y + 14) + '" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="18" fill="' + COL[i] + '">' + C.EL_ZH[i] + '</text>' +
        '<text x="56" y="' + (y + 14) + '" font-family=' + "'" + UI + "'" + ' font-size="14" fill="#ecebe6">' + C.EL_TH[i] + (i === S.dm ? ' · ตัวเรา' : i === S.resource ? ' · ให้กำเนิด' : '') + '</text>' +
        '<rect x="196" y="' + (y + 2) + '" width="' + (W - 266) + '" height="14" rx="7" fill="#1e2233"/>' +
        (w > 0 ? '<rect x="196" y="' + (y + 2) + '" width="' + w + '" height="14" rx="7" fill="' + COL[i] + '"/>' : '') +
        '<text x="' + (W - 28) + '" y="' + (y + 14) + '" text-anchor="end" font-family=' + "'" + UI + "'" + ' font-size="14" fill="#c9cbd8">' + v + '</text>';
    });
    return o + '</svg>';
  }
  /* luck strip (right-to-left) */
  function luck(L, dm, ageNow) {
    var list = L.list.slice(0, 9), n = list.length, W = 720, pad = 20, gap = 8, cw = (W - pad * 2 - gap * (n - 1)) / n, H = 186;
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="วัยจร 10 ปี"><rect width="' + W + '" height="' + H + '" rx="18" fill="#07080d"/>';
    list.forEach(function (x, i) {
      var X = W - pad - (i + 1) * cw - i * gap, s = C.STEMS.indexOf(x.gz[0]), b = C.BR.indexOf(x.gz[1]), now = ageNow != null && ageNow >= x.ageFrom && ageNow < x.ageFrom + 10;
      o += '<rect x="' + X + '" y="16" width="' + cw + '" height="' + (H - 32) + '" rx="12" fill="#161927" stroke="' + (now ? '#ffd660' : '#272b3d') + '" stroke-width="' + (now ? 2 : 1) + '"/>' +
        '<text x="' + (X + cw / 2) + '" y="38" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-size="11.5" fill="#9a9db0">' + Math.floor(x.ageFrom) + '–' + Math.floor(x.ageFrom + 10) + ' ปี</text>' +
        '<text x="' + (X + cw / 2) + '" y="76" text-anchor="middle" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="30" fill="' + COL[C.EL_S[s]] + '">' + x.gz[0] + '</text>' +
        '<text x="' + (X + cw / 2) + '" y="112" text-anchor="middle" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="30" fill="' + COL[C.EL_B[b]] + '">' + x.gz[1] + '</text>' +
        '<text x="' + (X + cw / 2) + '" y="136" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-weight="600" font-size="11.5" fill="#ffd660">' + esc(C.GODS[C.god(dm, s)]) + '</text>' +
        '<text x="' + (X + cw / 2) + '" y="156" text-anchor="middle" font-family=' + "'" + UI + "'" + ' font-size="11" fill="#9a9db0">พ.ศ. ' + (x.yearFrom + 543) + '</text>';
    });
    return o + '</svg>';
  }
  /* compare radar: two charts' element share */
  function radar(SA, SB, nameA, nameB) {
    var W = 420, H = 380, cx = 210, cy = 196, R = 130, pt = function (i, r) { var a = (-90 + 72 * i) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    var max = Math.max.apply(null, SA.scores.map(function (v) { return v / SA.total; }).concat(SB.scores.map(function (v) { return v / SB.total; }))) || 1;
    var poly = function (S) { return S.scores.map(function (v, i) { var p = pt(i, R * (v / S.total) / max); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:460px" role="img" aria-label="เทียบสัดส่วนธาตุ">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) { o += '<polygon points="' + [0, 1, 2, 3, 4].map(function (i) { return pt(i, R * f).join(','); }).join(' ') + '" fill="none" stroke="#272b3d"/>'; });
    for (var i = 0; i < 5; i++) { var e = pt(i, R), l = pt(i, R + 26); o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#272b3d"/><text x="' + l[0] + '" y="' + (l[1] + 7) + '" text-anchor="middle" font-family=' + "'" + KAN + "'" + ' font-weight="900" font-size="20" fill="' + COL[i] + '">' + C.EL_ZH[i] + '</text>'; }
    o += '<polygon points="' + poly(SA) + '" fill="rgba(255,214,96,.22)" stroke="#ffd660" stroke-width="2"/>' +
      '<polygon points="' + poly(SB) + '" fill="rgba(60,165,255,.18)" stroke="#3ca5ff" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<rect x="16" y="14" width="14" height="4" fill="#ffd660"/><text x="36" y="20" font-family=' + "'" + UI + "'" + ' font-size="13" fill="#ecebe6">' + esc(nameA) + '</text>' +
      '<rect x="16" y="34" width="14" height="4" fill="#3ca5ff"/><text x="36" y="40" font-family=' + "'" + UI + "'" + ' font-size="13" fill="#ecebe6">' + esc(nameB) + '</text>';
    return o + '</svg>';
  }
  root.TBZV = { chart: chart, bars: bars, luck: luck, radar: radar };
})(this);
