#!/usr/bin/env node
/* ฤกษ์ประจำวัน from the command line — used by the Notion automation.
   usage: node app/daily-cli.js "ชื่อเล่น | 戊寅 丙辰 戊午 壬戌 | ให้คุณ: ทอง น้ำ | ให้โทษ: ดิน ไฟ" [YYYY-MM-DD] [longitude]
   Prints the same message the Studio "คัดลอกข้อความ" button gives, plus a JSON line with the score. */
global.Solar = require('./lunar.js').Solar;
var D = require('./daily.js'), C = require('./core.js');
var code = process.argv[2], date = process.argv[3], lon = +(process.argv[4] || 98.39);
if (!code) { console.error('ต้องใส่รหัสผัง'); process.exit(1); }
var parts = code.split('|').map(function (s) { return s.trim(); });
var nick = parts[0], g = parts[1].split(/\s+/), P = { y: g[0], m: g[1], d: g[2], h: g[3] && g[3].indexOf('？') < 0 && g[3].indexOf('?') < 0 ? g[3] : null };
var els = function (s) { return (s || '').replace(/^.*?:/, '').trim().split(/\s+/).filter(Boolean).map(function (t) { return C.EL_TH.indexOf(t); }).filter(function (i) { return i >= 0; }); };
var N = D.natal(P), fav = parts[2] ? { good: els(parts[2]), bad: els(parts[3]) } : D.proposeFav(N);
var now = new Date(Date.now() + 7 * 3600000), ymd = date ? date.split('-').map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];
var R = D.day(N, fav, ymd[0], ymd[1], ymd[2], lon, null);
console.log(D.text(R, nick, fav));
console.log(JSON.stringify({ nick: nick, date: ymd.join('-'), day: R.P.d, score: R.score, best: R.best.map(function (h) { return h.from.t + '–' + h.to.t; }) }));
