/* AI drafting for report sections: Claude API (key stays on this device) → draft → humanizer pass (Thai). Needs TBZ. */
(function (root) {
  var C = root.TBZ, KEY = 'tbz.studio.ai';
  function cfg() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function setCfg(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  var SECTION = {
    overview: 'ภาพรวมและนิสัย: ธาตุประจำตัว (日主) ความแข็งอ่อนของธาตุประจำตัว ลักษณะนิสัยเด่น จุดแข็ง และเรื่องที่ควรระวังในตัวเอง',
    career: 'การงาน: สายงานที่เข้ากับผัง ควรเป็นลูกจ้างหรือเจ้าของ บทบาทที่ถนัด และจังหวะการงานในวัยจรปัจจุบันกับปีนี้',
    money: 'การเงิน: ที่มาของทรัพย์ (正財/偏財) วิธีหาเงินและรักษาเงินที่เข้ากับผัง ช่วงที่ทรัพย์เด่นหรือควรระวังจากวัยจรและดวงปี',
    love: 'ความรักและคู่ครอง: ดาวคู่ (ชายดูทรัพย์ หญิงดูขุนนาง/นักรบ) ตำแหน่งคู่ (ราศีล่างของวัน) ความสัมพันธ์รวม/ปะทะที่เกี่ยวข้อง และช่วงเวลาที่ความรักเด่น',
    health: 'สุขภาพ: ธาตุที่มากหรือขาดในผัง อวัยวะตามธาตุแบบตำราห้าธาตุ และคำแนะนำการดูแลตัวเองทั่วไป (ไม่วินิจฉัยโรค)',
    advice: 'คำแนะนำและธาตุที่ควรเสริม: ธาตุที่ช่วยให้ผังสมดุล สี ทิศ อาชีพหรือกิจกรรมที่เสริมธาตุนั้น และเรื่องที่ควรทำหรือเลี่ยงในปีนี้'
  };
  function ctx(c, R, extra) {
    var P = R.P, A = R.A, S = A.strength, ks = P.h ? ['h', 'd', 'm', 'y'] : ['d', 'm', 'y'], nm = { y: 'ปี', m: 'เดือน', d: 'วัน', h: 'ยาม' };
    var lines = [];
    lines.push('ระบบผูกดวง: ' + (P.system === 'std' ? 'ระบบทั่วไป (ปีเริ่ม 立春 เดือนเริ่ม 節)' : 'ระบบ อ.มาศ (ปีเริ่ม 冬至 เดือนเริ่ม 中氣)'));
    lines.push('เพศ: ' + (c.sex || 'ไม่ระบุ') + ' · อายุประมาณ ' + Math.floor(extra.age) + ' ปี');
    lines.push('ผังสี่เสา (ปี เดือน วัน ยาม): ' + P.y + ' ' + P.m + ' ' + P.d + ' ' + (P.h || 'ไม่ทราบเวลา'));
    ks.forEach(function (k) {
      var col = A.cols[k];
      lines.push('เสา' + nm[k] + ' ' + col.gz + ': ราศีบน ' + col.stem + ' (' + C.EL_TH[col.sEl] + ', ' + (col.god ? C.GODS[col.god] + ' ' + col.god : 'ตัวเรา') + ') · ราศีล่าง ' + col.branch + ' (' + C.BR_TH[C.BR.indexOf(col.branch)] + ', ' + C.EL_TH[col.bEl] + ') · ราศีแฝง ' +
        col.hidden.map(function (h) { return h.s + '=' + C.GODS[h.god]; }).join(', ') + ' · เชี่ยงแซของตัวเรา: ' + C.STAGES_TH[col.stage]);
    });
    lines.push('ธาตุประจำตัว: ' + P.d[0] + ' ' + C.EL_TH[S.dm] + (C.STEMS.indexOf(P.d[0]) % 2 ? 'หยิน' : 'หยาง'));
    lines.push('กำลังธาตุ (เกณฑ์ Tommie: ฤดูกาล 2, ราศีล่างวัน 1.5, อื่น 1): ' + S.scores.map(function (v, i) { return C.EL_TH[i] + ' ' + v; }).join(', ') + ' · ฝ่ายเสริม (คู่ธาตุ+ธาตุให้กำเนิด) ' + S.support + '/' + S.total + ' = ' + (S.support / S.total * 100).toFixed(0) + '%' + (P.h ? ' → ' + S.verdict.th : ' (ไม่ทราบเวลาเกิด ห้ามสรุปว่าดิถีแข็งหรืออ่อน)'));
    var rel = A.rel.map(function (r) { return r.label + ' ' + r.x; }).concat(A.groups.map(function (g) { return g.x; }));
    lines.push('ความสัมพันธ์ในผัง: ' + (rel.length ? rel.join('; ') : 'ไม่มี'));
    if (R.L) {
      var cur = R.L.list.filter(function (x) { return extra.age >= x.ageFrom && extra.age < x.ageFrom + 10; })[0];
      lines.push('วัยจร: ' + (R.L.forward ? 'เดินหน้า' : 'ถอยหลัง') + ' เริ่มอายุ ' + R.L.start.y + ' ปี ' + R.L.start.m + ' เดือน · ลำดับ ' + R.L.list.slice(0, 8).map(function (x) { return Math.floor(x.ageFrom) + '–' + Math.floor(x.ageFrom + 10) + ' ' + x.gz; }).join(', '));
      if (cur) lines.push('วัยจรปัจจุบัน: ' + cur.gz + ' (' + C.GODS[C.god(A.dm, C.STEMS.indexOf(cur.gz[0]))] + ') สัมพันธ์กับผัง: ' + (C.relTo(P, cur.gz).map(function (r) { return r.x; }).join('; ') || 'ไม่มี'));
    }
    if (extra.year) {
      var Y = extra.year;
      lines.push('ดวงปี ' + (Y.Y + 543) + ': ' + Y.yg + ' (' + C.GODS[Y.yGod] + ') สัมพันธ์กับผัง: ' + (Y.yRel.map(function (r) { return r.x; }).join('; ') || 'ไม่มี'));
      lines.push('เดือนเด่นของปี: ' + Y.months.map(function (m) { return m.m.gz + (m.dayClash ? '(ปะทะวัน)' : '') + (m.dayHe ? '(รวมวัน)' : ''); }).join(' '));
    }
    if (c.notes) lines.push('โน้ตของ Tommie เกี่ยวกับลูกค้า: ' + c.notes.slice(0, 800));
    return lines.join('\n');
  }
  var SYS_DRAFT = 'คุณช่วย Tommie ซินแสปาจื้อในภูเก็ตเขียนร่างคำอ่านดวงภาษาไทยสำหรับรายงานลูกค้า ใช้ระบบที่ระบุในข้อมูล (ส่วนใหญ่เป็นระบบ อ.มาศ) และยึดข้อมูลผังที่ให้มาเท่านั้น ห้ามแต่งข้อมูลผังเพิ่ม\n' +
    'น้ำเสียง: แบบครูอธิบายให้ลูกศิษย์ฟัง อบอุ่น เห็นใจ ตรงไปตรงมา อธิบายเหตุผลจากผังว่า "ทำไม" ทุกข้อสรุป เช่น อ้างฐานะหรือธาตุที่เป็นที่มา\n' +
    'ห้ามทำนายแบบฟันธงหรือทำให้กลัว ห้ามวินิจฉัยโรค ห้ามแนะนำการลงทุนเฉพาะเจาะจง ห้ามเขียนกลอนสรุป ห้ามขึ้นต้นด้วยคำทักทายหรือปิดท้ายด้วยคำอวยพร\n' +
    'สะกดและวางวรรณยุกต์ภาษาไทยให้ถูกต้อง ใช้คำว่า "คุณ" เรียกลูกค้า เขียนเป็นย่อหน้าธรรมดา 2–4 ย่อหน้า ไม่ใช้หัวข้อย่อย ไม่ใช้ตัวหนา ไม่ใช้อีโมจิ ความยาวราว 150–260 คำ';
  /* Thai adaptation of the /humanizer rule set (Wikipedia "Signs of AI writing"), applied as a second pass */
  var SYS_HUMAN = 'คุณเป็นบรรณาธิการภาษาไทย หน้าที่คือเกลาร่างคำอ่านดวงให้อ่านเหมือนซินแสเขียนเองด้วยมือ คงเนื้อหา ข้อเท็จจริงในผัง และศัพท์ (ฐานะสิบประการ ธาตุ ชื่อเสา) ไว้ทั้งหมด\n' +
    'ลบหรือแก้ร่องรอยการเขียนของ AI ต่อไปนี้:\n' +
    '1) คำยกใหญ่เกินจริง เช่น "ถือเป็นจุดเปลี่ยนสำคัญ" "สะท้อนให้เห็นถึง" "เป็นเครื่องพิสูจน์" "มีบทบาทสำคัญยิ่ง" ให้พูดตรงๆ ว่าคืออะไร\n' +
    '2) คำโฆษณาและคำสวยเกิน เช่น "โดดเด่นเป็นพิเศษ" "อันทรงพลัง" "อย่างน่าทึ่ง" "เปล่งประกาย" ใช้เฉพาะที่จำเป็นจริง\n' +
    '3) คำเชื่อมฟุ่มเฟือย เช่น "นอกจากนี้" "ยิ่งไปกว่านั้น" "อย่างไรก็ตาม" "ทั้งนี้" "ในขณะเดียวกัน" ใช้ซ้ำไม่ได้ ตัดทิ้งเมื่อประโยคต่อกันได้เอง\n' +
    '4) วลีเปิดและปิดสำเร็จรูป เช่น "ในยุคปัจจุบัน" "มาดูกันว่า" "โดยสรุปแล้ว" "อนาคตสดใส" "ขอให้โชคดี" "หวังว่าจะเป็นประโยชน์"\n' +
    '5) โครง "ไม่ใช่แค่... แต่ยัง..." และ "ไม่เพียงแต่... ยังรวมถึง..." ให้เขียนตรงๆ\n' +
    '6) การจัดของเป็นชุดละสามเพื่อให้ดูครบ ถ้าไม่ได้มีสามอย่างจริง\n' +
    '7) คำฟุ่มเฟือย เช่น "ในการที่จะ" → "เพื่อ", "เนื่องจากว่า" → "เพราะ", "มีความสามารถในการ" → "ทำได้", "ทำการ..." → ตัดทิ้ง, "เป็นสิ่งที่" ที่ไม่จำเป็น\n' +
    '8) การกั๊กมากเกินไป เช่น "อาจจะเป็นไปได้ว่าอาจ" ให้เหลือคำระวังครั้งเดียวในที่ที่ควรระวังจริง\n' +
    '9) ประโยคยาวเท่ากันทุกประโยค ให้มีทั้งสั้นและยาวสลับกันตามจังหวะการพูด\n' +
    '10) ขีดยาว (—) ตัวหนา อีโมจิ หัวข้อย่อย และเครื่องหมายคำพูดโค้ง ให้ตัดออก\n' +
    '11) การวนคำพ้องความหมายเพื่อเลี่ยงคำซ้ำ (เช่น ธาตุประจำตัว → ตัวตน → แก่นแท้) ให้ใช้คำเดิมคำเดียว\n' +
    'จากนั้นถามตัวเองเงียบๆ ว่า "อะไรยังทำให้ข้อความนี้ดูเป็น AI" แล้วแก้ซ้ำอีกรอบ\n' +
    'รักษาน้ำเสียงครูอธิบายลูกศิษย์ อบอุ่นและเห็นใจ สะกดและวรรณยุกต์ไทยต้องถูกต้อง ห้ามเพิ่มกลอนสรุป\n' +
    'ตอบกลับเฉพาะข้อความฉบับสุดท้ายเท่านั้น ไม่ต้องอธิบายว่าแก้อะไร';
  function call(key, model, system, user, maxTok) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: model, max_tokens: maxTok || 1600, system: system, messages: [{ role: 'user', content: user }] })
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status)); return (j.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim(); }); });
  }
  function draftPrompt(section, context, current) {
    return 'ข้อมูลผังของลูกค้า:\n' + context + '\n\nหัวข้อที่ต้องเขียน: ' + SECTION[section] + (current && current.trim() ? '\n\nร่างหรือโน้ตเดิมของ Tommie ในหัวข้อนี้ (ใช้เป็นแนวทางและเก็บประเด็นของเขาไว้):\n' + current.trim() : '') + '\n\nเขียนคำอ่านหัวข้อนี้';
  }
  /* returns Promise<string>; onStage('draft'|'human') */
  function generate(section, context, current, onStage) {
    var c = cfg(); if (!c.key) return Promise.reject(new Error('nokey'));
    var model = c.model || 'claude-sonnet-5-5';
    onStage && onStage('draft');
    return call(c.key, model, SYS_DRAFT, draftPrompt(section, context, current)).then(function (draft) {
      onStage && onStage('human');
      return call(c.key, model, SYS_HUMAN, 'เกลาข้อความนี้:\n\n' + draft);
    });
  }
  function manualPrompt(section, context, current) { // for pasting into the Claude app when no API key is set
    return SYS_DRAFT + '\n\n' + draftPrompt(section, context, current) + '\n\nเมื่อเขียนเสร็จ ให้เกลาภาษาอีกรอบตามกฎนี้ก่อนตอบ:\n' + SYS_HUMAN;
  }
  root.TBZAI = { cfg: cfg, setCfg: setCfg, ctx: ctx, generate: generate, manualPrompt: manualPrompt, SECTION: SECTION };
})(this);
