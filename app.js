(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  const S = {
    master: [], content: [], edu: [], qm: [], per: [], sales: [], rec: [],
    filtered: [], query: '', targetIds: null, insights: [],
    masterById: new Map(), salesById: new Map(), salesByStore: new Map(),
    eduById: new Map(), perById: new Map(), recById: new Map(), metricCache: new Map()
  };
  window.S = S;

  const aliases = {
    master: ['01_안경사마스터', '안경사마스터'],
    content: ['02_교육콘텐츠', '교육콘텐츠마스터'],
    edu: ['03_교육참여', '교육참여이력', '교육이력'],
    qm: ['인식문항마스터', '문항마스터'],
    per: ['04_인식조사', '인식조사', 'Sheet1'],
    sales: ['06_피팅판매', '피팅판매', 'Sheet2'],
    rec: ['AI추천결과', '교육추천결과', '08_교육추천']
  };

  const likert = {
    '전혀 그렇지 않다': 1,
    '그렇지 않다': 2,
    '보통이다': 3,
    '비슷하다': 3,
    '그렇다': 4,
    '매우 그렇다': 5
  };

  const FITTING_COLUMNS = {
    ast: {
      label: '난시',
      title: '난시 성장',
      py: ['2025 난시 팩수', '2025난시팩수', '25년 난시 팩수', '25년난시팩수'],
      cy: ['2026 난시 팩수', '2026난시팩수', '26년 난시 팩수', '26년난시팩수'],
      rate: ['난시 성장률', '난시성장률']
    },
    mf: {
      label: '멀티포컬',
      title: '멀티포컬 성장',
      py: ['2025 멀티포컬  팩수', '2025 멀티포컬 팩수', '2025멀티포컬팩수', '25년 멀티포컬  팩수', '25년 멀티포컬 팩수', '25년멀티포컬팩수'],
      cy: ['2026 멀티포컬  팩수', '2026 멀티포컬 팩수', '2026멀티포컬팩수', '26년 멀티포컬  팩수', '26년 멀티포컬 팩수', '26년멀티포컬팩수'],
      rate: ['멀티포컬 성장률', '멀티포컬성장률', 'MF 성장률', 'MF성장률']
    },
    max: {
      label: 'MAX',
      title: 'MAX 성장',
      py: ['2025 MAX  팩수', '2025 MAX 팩수', '2025MAX팩수', '25년 MAX  팩수', '25년 MAX 팩수', '25년MAX팩수'],
      cy: ['2026 MAX  팩수', '2026 MAX 팩수', '2026MAX팩수', '26년 MAX  팩수', '26년 MAX 팩수', '26년MAX팩수'],
      rate: ['MAX 성장률', 'MAX성장률', '맥스 성장률', '맥스성장률']
    }
  };

  const productWords = {
    ast: ['난시', '토릭', 'TORIC', 'ASD'],
    mf: ['멀티포컬', 'MULTIFOCAL', '다초점', '노안', 'MF'],
    max: ['MAX', '맥스', '블루라이트', '실리콘']
  };

  const clean = v => (v == null ? '' : String(v).trim());
  const norm = s => clean(s).replace(/[\s_\-()\.\/]/g, '').toLowerCase();
  const keyVal = v => norm(v).replace(/[^a-z0-9가-힣]/g, '');
  const esc = s => clean(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  function get(row, names) {
    if (!row) return '';
    const map = {};
    Object.keys(row).forEach(k => { map[norm(k)] = row[k]; });
    for (const name of names) {
      const v = map[norm(name)];
      if (v !== undefined && clean(v) !== '') return v;
    }
    return '';
  }

  function num(value) {
    if (value == null || value === '') return null;
    const text = String(value).trim();
    if (!text || text === '-' || text === '데이터 없음') return null;
    if (/신규\s*진입/.test(text)) return null;
    const match = text.replace(/,/g, '').replace(/%/g, '').match(/[-+]?\d+(?:\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    if (!Number.isFinite(n)) return null;
    if (/↓|감소|하락|역성장/.test(text)) return -Math.abs(n);
    return n;
  }

  const avg = (arr, fn = x => x) => {
    const vals = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const sum = (arr, fn = x => x) => {
    const vals = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };

  const fmtPct = v => v == null ? '데이터 없음' : `${Math.round(Number(v) * 100)}%`;
  const fmtRate = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%p`;
  const fmtPack = v => v == null ? '데이터 없음' : `${Math.round(Number(v)) >= 0 ? '+' : ''}${Math.round(Number(v)).toLocaleString('ko-KR')}팩`;
  const dclass = v => v == null ? '' : Number(v) < 0 ? 'negative' : 'positive';

  function sheetNameKey(value) {
    return clean(value).replace(/\u00a0/g, '').replace(/[\s_\-.()\/]/g, '').toLowerCase();
  }

  function findWorkbookSheetName(wb, names) {
    const sheetNames = wb.SheetNames || [];
    const targets = (names || []).map(sheetNameKey).filter(Boolean);
    let m = sheetNames.find(name => targets.includes(sheetNameKey(name)));
    if (m) return m;
    m = sheetNames.find(name => targets.some(target => sheetNameKey(name).includes(target) || target.includes(sheetNameKey(name))));
    if (m) return m;
    if ((names || []).some(n => String(n).includes('피팅판매'))) {
      m = sheetNames.find(name => sheetNameKey(name).includes('피팅판매'));
      if (m) return m;
    }
    return '';
  }

  function rowLooksLikeHeader(row) {
    const text = (row || []).map(v => clean(v)).join('|');
    return [/안경사ID/.test(text), /안경원코드/.test(text), /안경원명/.test(text), /2025|25년/.test(text), /2026|26년/.test(text), /팩수/.test(text), /성장률/.test(text)].filter(Boolean).length >= 3;
  }

  function aoaToObjects(aoa, headerIndex) {
    const header = (aoa[headerIndex] || []).map(h => clean(h));
    const rows = [];
    for (let i = headerIndex + 1; i < aoa.length; i++) {
      const line = aoa[i] || [];
      if (!line.some(v => clean(v))) continue;
      const obj = {};
      header.forEach((h, idx) => { if (h) obj[h] = line[idx] == null ? '' : line[idx]; });
      rows.push(obj);
    }
    return rows;
  }

  function sheet(wb, names) {
    const name = findWorkbookSheetName(wb, names);
    console.log('[sheet]', names, '=>', name);
    if (!name || !wb.Sheets[name]) return [];
    const ws = wb.Sheets[name];
    let rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true, blankrows: false });
    if (rows && rows.length) {
      console.log('[sheet loaded]', name, rows.length, rows[0]);
      return rows;
    }
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false });
    const idx = aoa.findIndex(rowLooksLikeHeader);
    if (idx < 0) {
      console.warn('[sheet header not found]', name, aoa.slice(0, 8));
      return [];
    }
    rows = aoaToObjects(aoa, idx);
    console.log('[sheet fallback loaded]', name, rows.length, rows[0]);
    return rows;
  }

  function infer(q) {
    q = clean(q);
    if (/블루라이트|실리콘|기술|MAX|맥스/.test(q)) return 'max';
    if (/멀티포컬|다초점|노안|MF/.test(q)) return 'mf';
    if (/난시|토릭|ASD/.test(q)) return 'ast';
    return 'other';
  }

  function score(v) {
    if (typeof v === 'number') return v;
    return likert[clean(v)] ?? num(v);
  }

  function normMaster(rows) {
    return rows.map((r, i) => ({
      ...r,
      안경사ID: clean(get(r, ['안경사ID', 'ID', 'OpticianID'])) || `AUTO-${i + 1}`,
      안경사명: clean(get(r, ['안경사명', '이름', '성명'])),
      안경원코드: clean(get(r, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID'])),
      안경원명: clean(get(r, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName'])),
      지역: clean(get(r, ['지역', '시도', 'Region'])),
      연차: clean(get(r, ['연차', 'Years', '경력'])),
      Tier: clean(get(r, ['Tier', '티어', '등급'])),
      채널: clean(get(r, ['채널', 'Channel', '전략구분', '유형'])),
      담당영업사원: clean(get(r, ['담당영업사원', '담당자', '영업사원']))
    })).filter(r => r.안경사ID || r.안경사명);
  }

  function normQm(rows) {
    return rows.map((r, i) => {
      const q = clean(get(r, ['문항', '문항명', 'Question']));
      return {
        문항ID: clean(get(r, ['문항ID', 'QuestionID'])) || `Q${String(i + 1).padStart(3, '0')}`,
        문항: q,
        제품군: clean(get(r, ['제품군'])) ? infer(clean(get(r, ['제품군']))) : infer(q),
        목표값: num(get(r, ['목표값'])) ?? 4,
        긍정방향: clean(get(r, ['긍정방향'])) || (/역코딩/.test(q) ? '낮을수록 긍정' : '높을수록 긍정'),
        사용: clean(get(r, ['분석사용여부', '사용여부'])) || 'Y'
      };
    });
  }

  function normPer(rows) {
    const meta = ['안경사ID', 'ID', '안경사명', '안경원명', '지역', '연차', 'Tier', 'SEG', 'No', '번호'];
    const out = [];
    rows.forEach(r => {
      const id = clean(get(r, ['안경사ID', 'ID']));
      if (!id) return;
      Object.keys(r).forEach(col => {
        if (meta.some(m => norm(m) === norm(col))) return;
        const qm = S.qm.find(q => norm(col).includes(norm(q.문항ID)) || norm(col).includes(norm(q.문항))) || {
          문항ID: col,
          문항: col,
          제품군: infer(col),
          목표값: 4,
          긍정방향: /역코딩/.test(col) ? '낮을수록 긍정' : '높을수록 긍정',
          사용: 'Y'
        };
        const s = score(r[col]);
        if (s == null || s < 1 || s > 5 || qm.사용 === 'N') return;
        const adj = /낮을수록/.test(qm.긍정방향) ? 6 - s : s;
        out.push({ 안경사ID: id, 문항ID: qm.문항ID, 문항: qm.문항, 제품군: qm.제품군, 원응답: r[col], 점수: adj, 목표값: qm.목표값, gap: adj < qm.목표값 });
      });
    });
    return out;
  }

  function storeKey(r) {
    const code = clean(get(r, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID']) || r?.안경원코드);
    const name = clean(get(r, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName']) || r?.안경원명);
    return code ? keyVal(code) : (name ? keyVal(name) : '');
  }

  function rebuildIndexes() {
    S.salesByStore = new Map();
    S.salesById = new Map();
    S.masterById = new Map();
    S.eduById = new Map();
    S.perById = new Map();
    S.recById = new Map();
    S.metricCache = new Map();

    S.master.forEach(r => { if (r.안경사ID) S.masterById.set(r.안경사ID, r); });
    S.sales.forEach(r => {
      const sk = storeKey(r);
      if (sk) {
        let a = S.salesByStore.get(sk);
        if (!a) { a = []; S.salesByStore.set(sk, a); }
        a.push(r);
      }
      const id = clean(get(r, ['안경사ID', 'ID', 'OpticianID']));
      if (id) {
        let a = S.salesById.get(id);
        if (!a) { a = []; S.salesById.set(id, a); }
        a.push(r);
      }
    });
    S.edu.forEach(r => {
      const id = clean(get(r, ['안경사ID', 'ID']));
      if (!id) return;
      let a = S.eduById.get(id);
      if (!a) { a = []; S.eduById.set(id, a); }
      a.push(r);
    });
    S.per.forEach(r => {
      const id = r.안경사ID;
      if (!id) return;
      let a = S.perById.get(id);
      if (!a) { a = []; S.perById.set(id, a); }
      a.push(r);
    });
    S.rec.forEach(r => {
      const id = clean(get(r, ['안경사ID', 'ID']));
      if (id && !S.recById.has(id)) S.recById.set(id, r);
    });
  }

  function rowsFor(id) {
    const direct = S.salesById.get(id) || [];
    const m = S.masterById.get(id);
    const byStore = m ? (S.salesByStore.get(storeKey(m)) || []) : [];
    return direct.length ? direct : byStore;
  }

  function packDelta(rows, key) {
    const col = FITTING_COLUMNS[key];
    const py = sum(rows, r => get(r, col.py));
    const cy = sum(rows, r => get(r, col.cy));
    if (py == null && cy == null) return null;
    return (cy || 0) - (py || 0);
  }

  function growth(rows, key) {
    const col = FITTING_COLUMNS[key];
    const directRate = avg(rows, r => get(r, col.rate));
    if (directRate != null) return directRate;
    const py = sum(rows, r => get(r, col.py));
    const cy = sum(rows, r => get(r, col.cy));
    if (py == null && cy == null) return null;
    if (!py && cy) return 100;
    return py ? ((cy - py) / py * 100) : null;
  }

  function eduDone(r) {
    const f = clean(get(r, ['완료여부', '수료여부', '참여여부', '시청여부'])).toUpperCase();
    if (['Y', 'YES', 'TRUE', '완료', '수료', 'DONE', 'COMPLETED'].includes(f)) return true;
    const v = num(get(r, ['완료율', '진도율', '진행률']));
    return v != null && v >= 100;
  }

  function metrics(id) {
    if (S.metricCache.has(id)) return S.metricCache.get(id);
    const p = S.masterById.get(id);
    const sr = rowsFor(id);
    const perc = S.perById.get(id) || [];
    const gaps = perc.filter(x => x.gap);
    const edu = S.eduById.get(id) || [];
    const eduRate = edu.length ? edu.filter(eduDone).length / edu.length : null;
    const rec = S.recById.get(id) || {};
    const growths = {
      ast: { cur: growth(sr, 'ast'), pack: packDelta(sr, 'ast') },
      mf: { cur: growth(sr, 'mf'), pack: packDelta(sr, 'mf') },
      max: { cur: growth(sr, 'max'), pack: packDelta(sr, 'max') }
    };
    const avgGrowth = avg([growths.ast.cur, growths.mf.cur, growths.max.cur]);
    const priority = gaps.length >= 3 || (avgGrowth != null && avgGrowth < 0) ? '높음' : gaps.length ? '중간' : '낮음';
    const m = { p, perc, gaps, eduRate, rec, growths, priority, educationIncomplete: eduRate == null || eduRate < 1 };
    S.metricCache.set(id, m);
    return m;
  }

  function filterByDropdown() {
    let rows = [...S.master];
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, f]) => {
      const v = $(id)?.value;
      if (v) rows = rows.filter(r => clean(r[f]) === v);
    });
    return rows;
  }

  function filtered() {
    let rows = filterByDropdown();
    const q = clean(S.query);
    if (q) {
      const y = (q.match(/(\d+)\s*년차/) || [])[1];
      if (y) rows = rows.filter(r => clean(r.연차).includes(y));
      const wantGap = /인식|Gap|갭|문항/.test(q);
      const eduIn = /미완료|미수료|교육/.test(q);
      const neg = /성장률 음수|역성장|마이너스|성장률.*낮/.test(q);
      rows = rows.filter(r => {
        const m = metrics(r.안경사ID);
        if (wantGap && !m.gaps.length) return false;
        if (eduIn && !(m.eduRate == null || m.eduRate < 1)) return false;
        if (neg && !['ast', 'mf', 'max'].some(k => m.growths[k].cur != null && m.growths[k].cur < 0)) return false;
        return true;
      });
    }
    if (S.targetIds) rows = rows.filter(r => S.targetIds.has(r.안경사ID));
    return rows;
  }

  function kpi(label, value, note) {
    return `<div class="kpi-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
  }

  function kpiGrowth(key, rows) {
    const ms = rows.map(r => metrics(r.안경사ID));
    const cur = avg(ms, m => m.growths[key].cur);
    const all = avg(S.master, r => metrics(r.안경사ID).growths[key].cur);
    const diff = cur != null && all != null ? cur - all : null;
    const packSum = sum(ms, m => m.growths[key].pack);
    return kpi(
      FITTING_COLUMNS[key].title,
      `<span class="${dclass(packSum)}">${fmtPack(packSum)}</span>`,
      `<span>${fmtRate(cur)} <span class="kpi-sub">(vs 전년)</span></span><br>
       <span class="delta ${dclass(diff)}">${fmtRate(diff)} <span class="kpi-sub">(vs 전체평균)</span></span>`
    );
  }

  function render() {
    const rows = filtered();
    S.filtered = rows;
    const ms = rows.map(r => metrics(r.안경사ID));
    const eduComplete = ms.filter(m => m.eduRate === 1).length;
    const reached = ms.filter(m => m.perc.length && m.gaps.length === 0).length;
    if ($('kpiGrid')) $('kpiGrid').innerHTML = [
      kpi('전체 관리 안경사', rows.length.toLocaleString('ko-KR'), '현재 필터'),
      kpi('교육 완료 안경사', eduComplete.toLocaleString('ko-KR'), `${fmtPct(rows.length ? eduComplete / rows.length : null)} 완료`),
      kpi('인식 목표 도달 안경사', reached.toLocaleString('ko-KR'), `${fmtPct(rows.length ? reached / rows.length : null)} 도달`),
      kpiGrowth('ast', rows),
      kpiGrowth('mf', rows),
      kpiGrowth('max', rows)
    ].join('');
    if ($('gapCards')) {
      const cards = [
        ['education', '교육 미완료', ms.filter(m => m.educationIncomplete).length],
        ['perception', '인식 목표 미달', ms.filter(m => m.gaps.length).length],
        ['sales ast', '난시 역성장', ms.filter(m => m.growths.ast.cur != null && m.growths.ast.cur < 0).length],
        ['sales mf', '멀티포컬 역성장', ms.filter(m => m.growths.mf.cur != null && m.growths.mf.cur < 0).length],
        ['sales max', 'MAX 역성장', ms.filter(m => m.growths.max.cur != null && m.growths.max.cur < 0).length]
      ];
      $('gapCards').innerHTML = cards.map(c => `<div class="gap-card ${c[0]}"><span>${c[1]}</span><b>${c[2]}명</b><small>현재 그룹 기준</small></div>`).join('');
    }
    renderQuestionTop(rows);
    renderTopEdu(ms);
    renderSegment(rows, ms);
  }

  function renderQuestionTop(rows) {
    if (!$('questionTop')) return;
    const ids = new Set(rows.map(r => r.안경사ID));
    const cnt = {};
    S.per.forEach(p => {
      if (ids.has(p.안경사ID) && p.gap) cnt[p.문항] = (cnt[p.문항] || 0) + 1;
    });
    $('questionTop').innerHTML = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">인식 Gap 문항이 없습니다.</div>';
  }

  function contentName(id) {
    const c = S.content.find(x => clean(get(x, ['교육ID'])) === clean(id));
    return clean(get(c, ['교육명', '콘텐츠명'])) || clean(id);
  }

  function renderTopEdu(ms) {
    if (!$('topEducation')) return;
    const cnt = {};
    ms.forEach(m => {
      const n = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID']));
      if (n) cnt[n] = (cnt[n] || 0) + 1;
    });
    $('topEducation').innerHTML = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">추천 교육 데이터가 없습니다.</div>';
  }

  function renderSegment(rows, ms) {
    if ($('resultCount')) $('resultCount').textContent = `${rows.length.toLocaleString('ko-KR')}명`;
    if ($('segmentSummary')) $('segmentSummary').innerHTML = `<div class="three-col"><div>${kpiGrowth('ast', rows)}</div><div>${kpiGrowth('mf', rows)}</div><div>${kpiGrowth('max', rows)}</div></div>`;
    if (!$('segmentTable')) return;
    $('segmentTable').innerHTML = ms.map(m => {
      const p = m.p || {};
      const eduName = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID']));
      return `<tr data-id="${esc(p.안경사ID)}">
        <td><b>${esc(p.안경사명)}</b><small><br>${esc(p.안경사ID)}</small></td>
        <td>${esc(p.안경원명)}<small><br>${esc(p.지역)} · ${esc(p.채널)}</small></td>
        <td>${esc(p.연차)} / ${esc(p.Tier)}</td>
        <td>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</td>
        <td>${m.gaps.length}개</td>
        <td>${fmtPack(m.growths.ast.pack)}<br><small>${fmtRate(m.growths.ast.cur)}</small></td>
        <td>${fmtPack(m.growths.mf.pack)}<br><small>${fmtRate(m.growths.mf.cur)}</small></td>
        <td>${fmtPack(m.growths.max.pack)}<br><small>${fmtRate(m.growths.max.cur)}</small></td>
        <td>${esc(eduName || '없음')}</td>
        <td>${m.priority}</td>
      </tr>`;
    }).join('');
    document.querySelectorAll('#segmentTable tr').forEach(tr => tr.onclick = () => showProfile(tr.dataset.id));
  }

  function showProfile(id) {
    const m = metrics(id);
    if (!m.p || !$('profilePanel')) return;
    $('profilePanel').hidden = false;
    $('profileContent').innerHTML = `<h3>${esc(m.p.안경사명)} <small>${esc(id)}</small></h3>
      <p>${esc(m.p.안경원명)} · ${esc(m.p.지역)} · ${esc(m.p.연차)} / ${esc(m.p.Tier)}</p>
      <div class="profile-grid">
        <div class="status-card"><small>교육완료</small><h3>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</h3></div>
        <div class="status-card"><small>인식 Gap</small><h3>${m.gaps.length}개</h3></div>
        <div class="status-card"><small>우선순위</small><h3>${m.priority}</h3></div>
      </div>
      <h3>문항별 Gap</h3>
      ${m.gaps.slice(0, 10).map(g => `<div class="question-card"><b>${esc(g.문항)}</b><br><small>${esc(g.제품군)} · 응답 ${esc(g.원응답)} · 목표 ${g.목표값}</small></div>`).join('') || '<div class="empty-state">Gap 문항이 없습니다.</div>'}`;
    $('profilePanel').scrollIntoView({ behavior: 'smooth' });
    view('segment');
  }

  function by(arr, key) {
    const m = {};
    arr.forEach(x => {
      const v = clean(x[key]) || '미분류';
      (m[v] || (m[v] = [])).push(x);
    });
    return m;
  }

  function lowQuestions(keys, ms) {
    const ids = new Set(ms.map(m => m.p?.안경사ID));
    const allQ = {};
    S.per.forEach(p => {
      if (keys === 'all' || keys.includes(p.제품군)) (allQ[p.문항] || (allQ[p.문항] = [])).push(p.점수);
    });
    const segQ = {};
    S.per.forEach(p => {
      if (ids.has(p.안경사ID) && (keys === 'all' || keys.includes(p.제품군))) (segQ[p.문항] || (segQ[p.문항] = [])).push(p.점수);
    });
    return Object.keys(segQ).map(q => ({ q, seg: avg(segQ[q]), all: avg(allQ[q]) }))
      .filter(x => x.seg != null && x.all != null)
      .map(x => ({ ...x, diff: x.seg - x.all }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);
  }

  function educationSummaryForRows(rows, key) {
    const ids = new Set(rows.map(r => r.안경사ID));
    const keywords = productWords[key] || [];
    const eduRows = S.edu.filter(r => ids.has(clean(get(r, ['안경사ID', 'ID']))));
    const related = eduRows.filter(r => keywords.some(k => Object.values(r).join(' ').includes(k)));
    const base = related.length ? related : eduRows;
    const done = base.filter(eduDone).length;
    const rateVal = base.length ? done / base.length : null;
    const names = [...new Set(base.map(r => clean(get(r, ['교육명', '콘텐츠명'])) || contentName(get(r, ['교육ID', 'ID']))).filter(Boolean))].slice(0, 3);
    return { total: base.length, done, rate: rateVal, names };
  }

  function insight(type, title, rows, key, symptom, cause, action, score) {
    return { type, title, targetIds: rows.map(r => r.안경사ID), size: rows.length, key, symptom, cause, action, score };
  }

  function generateInsights() {
    const out = [];
    const overall = {
      ast: avg(S.master, r => metrics(r.안경사ID).growths.ast.cur),
      mf: avg(S.master, r => metrics(r.안경사ID).growths.mf.cur),
      max: avg(S.master, r => metrics(r.안경사ID).growths.max.cur)
    };
    const groups = [];
    ['지역', '연차', 'Tier', '채널', '담당영업사원'].forEach(dim => {
      Object.entries(by(S.master, dim)).forEach(([v, rows]) => {
        if (rows.length >= 3) groups.push({ name: v, rows, dim });
      });
    });
    groups.forEach(g => {
      const ms = g.rows.map(r => metrics(r.안경사ID));
      ['ast', 'mf', 'max'].forEach(key => {
        const rg = avg(ms, m => m.growths[key].cur);
        const pk = sum(ms, m => m.growths[key].pack);
        if (rg == null) return;
        const diff = overall[key] != null ? rg - overall[key] : null;
        const below = diff != null && diff <= -3;
        const reverse = rg < 0;
        if (!below && !reverse) return;
        const best = lowQuestions([key], ms)[0] || lowQuestions('all', ms)[0];
        const edu = educationSummaryForRows(g.rows, key);
        const symptom = `${FITTING_COLUMNS[key].title} ${fmtPack(pk)} (${fmtRate(rg)} vs 전년)${diff != null ? ` / ${fmtRate(diff)} vs 전체평균` : ''}`;
        const cause = best ? `${best.q}: 선택 그룹 평균 ${best.seg.toFixed(1)}점, 전체 평균 ${best.all.toFixed(1)}점으로 ${best.diff.toFixed(1)}점 낮습니다.` : `${FITTING_COLUMNS[key].title} 관련 인식 문항에서 뚜렷한 저하는 확인되지 않았습니다. 판매 실행, 상권, 제품 노출 요인을 함께 점검하세요.`;
        const eduText = edu.total ? `관련/전체 교육 이력 ${edu.total}건 중 완료 ${edu.done}건(${fmtPct(edu.rate)}). ${edu.names.length ? '주요 이수/추천 교육: ' + edu.names.join(', ') : '교육명 데이터 없음'}` : '교육 이력 데이터 없음';
        const scoreVal = (reverse ? 25 : 0) + (below ? Math.abs(diff) * 8 : 0) + Math.abs(pk || 0) / 50 + g.rows.length / 3 + (best ? Math.abs(best.diff) * 15 : 0);
        out.push(insight(best ? '판매 이상 → 인식 원인 후보' : '판매 이상', `${g.name} ${FITTING_COLUMNS[key].title} 이슈`, g.rows, key, symptom, cause, eduText, scoreVal));
      });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function renderInsightPlaceholder() {
    if ($('insightSummary')) $('insightSummary').innerHTML = [kpi('인사이트 상태', '대기', 'AI 인사이트 생성 버튼을 눌러 계산하세요')].join('');
    if ($('insightCards')) $('insightCards').innerHTML = '<div class="empty-state">엑셀 업로드 후 <b>AI 인사이트 생성</b> 버튼을 누르세요.</div>';
  }

  function renderInsights() {
    S.insights = generateInsights();
    if ($('insightSummary')) $('insightSummary').innerHTML = [
      kpi('발견 인사이트', S.insights.length, 'TOP 8'),
      kpi('우선 대상', S.insights.reduce((a, i) => a + i.size, 0).toLocaleString('ko-KR'), '중복 포함'),
      kpi('인식×판매', S.insights.filter(i => /인식/.test(i.type)).length, '원인 후보'),
      kpi('교육 로드맵', S.insights.length, 'STEP1+STEP2')
    ].join('');
    if (!$('insightCards')) return;
    $('insightCards').innerHTML = S.insights.length ? S.insights.map((i, idx) => `<div class="insight-card"><div class="type">${esc(i.type)}</div><h3>${idx + 1}. ${esc(i.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(i.symptom)}</div><div class="insight-step"><small>2. 원인 후보</small>${esc(i.cause)}</div><div class="insight-step"><small>3. 교육 이력</small>${esc(i.action || '교육 이력 데이터 없음')}</div></div><div class="note">대상 ${i.size}명 · 점수 ${Math.round(i.score)}</div><div class="insight-actions"><button class="button primary" data-insight="${idx}">대상 보기</button><button class="button" data-detail="${idx}">상세 보기</button></div></div>`).join('') : '<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>';
    document.querySelectorAll('[data-insight]').forEach(b => b.onclick = () => {
      const ins = S.insights[+b.dataset.insight];
      S.targetIds = new Set(ins.targetIds);
      S.query = '';
      render();
      if ($('queryExplanation')) $('queryExplanation').textContent = `인사이트 대상 필터 적용: ${ins.title} / 결과 ${S.filtered.length}명`;
      view('segment');
    });
    document.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => showInsightDetail(+b.dataset.detail));
  }

  function showInsightDetail(idx) {
    const i = S.insights[idx];
    if (!$('insightDetailPanel')) return;
    $('insightDetailPanel').hidden = false;
    $('insightDetail').innerHTML = `<div class="insight-card"><div class="type">${esc(i.type)}</div><h3>${esc(i.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 무엇이 낮은가</small>${esc(i.symptom)}</div><div class="insight-step"><small>2. 어떤 원인이 의심되는가</small>${esc(i.cause)}</div><div class="insight-step"><small>3. 교육 이력</small>${esc(i.action || '교육 이력 데이터 없음')}</div></div></div>`;
    $('insightDetailPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function buildFilters() {
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, f]) => {
      const el = $(id);
      if (!el) return;
      const vals = [...new Set(S.master.map(r => clean(r[f])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
      el.innerHTML = '<option value="">전체</option>' + vals.map(v => `<option>${esc(v)}</option>`).join('');
      el.onchange = () => { S.query = ''; S.targetIds = null; render(); };
    });
  }

  async function upload(file) {
    if (!window.XLSX) throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    console.log('[workbook sheets]', wb.SheetNames);
    S.master = normMaster(sheet(wb, aliases.master));
    S.content = sheet(wb, aliases.content);
    S.edu = sheet(wb, aliases.edu);
    S.qm = normQm(sheet(wb, aliases.qm));
    S.per = normPer(sheet(wb, aliases.per));
    S.sales = sheet(wb, aliases.sales);
    S.rec = sheet(wb, aliases.rec);
    rebuildIndexes();
    S.targetIds = null;
    if ($('uploadStatus')) $('uploadStatus').textContent = file.name;
    buildFilters();
    render();
    renderInsightPlaceholder();
    toast(`업로드 완료: 안경사 ${S.master.length}명, 판매행 ${S.sales.length}건`);
  }

  function resetAll() {
    S.query = '';
    S.targetIds = null;
    if ($('smartQuery')) $('smartQuery').value = '';
    ['regionFilter', 'yearsFilter', 'tierFilter', 'channelFilter', 'repFilter'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('queryExplanation')) $('queryExplanation').textContent = '필터를 선택하거나 검색어를 입력하세요.';
    render();
  }

  function view(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    $(id)?.classList.add('active');
    document.querySelector(`.tab[data-view="${id}"]`)?.classList.add('active');
  }

  function toast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function download() {
    if (!window.XLSX) return;
    const rows = S.filtered.map(p => {
      const m = metrics(p.안경사ID);
      return {
        안경사ID: p.안경사ID,
        안경사명: p.안경사명,
        안경원명: p.안경원명,
        난시성장팩: m.growths.ast.pack,
        난시성장률: m.growths.ast.cur,
        멀티포컬성장팩: m.growths.mf.pack,
        멀티포컬성장률: m.growths.mf.cur,
        MAX성장팩: m.growths.max.pack,
        MAX성장률: m.growths.max.cur,
        인식Gap: m.gaps.length,
        교육완료율: m.eduRate
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '대상목록');
    XLSX.writeFile(wb, 'ACUVUE_대상목록.xlsx');
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], nx = text[i + 1];
      if (ch === '"' && q && nx === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { row.push(cell); cell = ''; continue; }
      if ((ch === '\n' || ch === '\r') && !q) {
        if (ch === '\r' && nx === '\n') i++;
        row.push(cell);
        if (row.some(v => clean(v))) rows.push(row);
        row = [];
        cell = '';
        continue;
      }
      cell += ch;
    }
    row.push(cell);
    if (row.some(v => clean(v))) rows.push(row);
    if (!rows.length) return [];
    const head = rows.shift().map(clean);
    return rows.map(r => Object.fromEntries(head.map((h, i) => [h, clean(r[i])])));
  }

  function renderExternal(rows = [], source = 'output/Competitor_Activity.csv') {
    if (!$('externalInsight')) return;
    $('externalInsight').innerHTML = rows.length ? `<div class="query-explanation">${esc(source)} · ${rows.length}건</div>` : '자동 연결 실패 또는 데이터 없음. 타사 CSV 업로드 버튼으로 파일을 선택하세요.';
  }

  async function loadExternal() {
    try {
      const res = await fetch('output/Competitor_Activity.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      renderExternal(parseCsv(await res.text()));
    } catch (e) {
      renderExternal([]);
    }
  }

  function seed() {
    S.master = normMaster([
      { 안경사ID: 'A001', 안경사명: '데모1', 안경원코드: 'S001', 안경원명: '데모안경원', 지역: '서울', 연차: '3년차', Tier: 'VIP', 채널: 'Top50' },
      { 안경사ID: 'A002', 안경사명: '데모2', 안경원코드: 'S002', 안경원명: '테스트안경원', 지역: '강원', 연차: '3년차', Tier: 'Gold', 채널: 'I/O' }
    ]);
    S.qm = normQm([
      { 문항ID: 'Q001', 문항: '블루라이트 보호 중요성을 설명할 수 있다', 목표값: 4 },
      { 문항ID: 'Q002', 문항: '난시 조기 교정의 중요성을 설명할 수 있다', 목표값: 4 }
    ]);
    S.per = normPer([
      { 안경사ID: 'A001', 'Q001_블루라이트 보호 중요성을 설명할 수 있다': '보통이다', 'Q002_난시 조기 교정의 중요성을 설명할 수 있다': '그렇다' },
      { 안경사ID: 'A002', 'Q001_블루라이트 보호 중요성을 설명할 수 있다': '그렇지 않다', 'Q002_난시 조기 교정의 중요성을 설명할 수 있다': '보통이다' }
    ]);
    S.edu = [{ 안경사ID: 'A001', 완료여부: 'N' }, { 안경사ID: 'A002', 완료여부: 'Y' }];
    S.sales = [
      { 안경사ID: 'A001', 안경원코드: 'S001', 안경원명: '데모안경원', '2025 난시 팩수': 100, '2026 난시 팩수': 120, '난시 성장률': 20, '2025 멀티포컬  팩수': 50, '2026 멀티포컬  팩수': 40, '멀티포컬 성장률': -20, '2025 MAX  팩수': 200, '2026 MAX  팩수': 260, 'MAX 성장률': 30 },
      { 안경사ID: 'A002', 안경원코드: 'S002', 안경원명: '테스트안경원', '2025 난시 팩수': 80, '2026 난시 팩수': 70, '난시 성장률': -12.5, '2025 멀티포컬  팩수': 40, '2026 멀티포컬  팩수': 60, '멀티포컬 성장률': 50, '2025 MAX  팩수': 100, '2026 MAX  팩수': 90, 'MAX 성장률': -10 }
    ];
    rebuildIndexes();
    buildFilters();
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => view(t.dataset.view));
    if ($('workbookInput')) $('workbookInput').onchange = e => e.target.files[0] && upload(e.target.files[0]).catch(err => {
      console.error(err);
      alert('업로드 실패\n\n' + (err.message || err));
      toast('업로드 실패');
    });
    if ($('runQuery')) $('runQuery').onclick = () => {
      S.query = $('smartQuery')?.value || '';
      S.targetIds = null;
      render();
      if ($('queryExplanation')) $('queryExplanation').textContent = `검색 조건 적용: ${S.query || '없음'} / 결과 ${S.filtered.length}명`;
      view('segment');
    };
    if ($('smartQuery')) $('smartQuery').onkeydown = e => { if (e.key === 'Enter') $('runQuery').click(); };
    if ($('clearQuery')) $('clearQuery').onclick = resetAll;
    if ($('resetFilters')) $('resetFilters').onclick = resetAll;
    document.querySelectorAll('.examples button').forEach(b => b.onclick = () => {
      S.query = b.dataset.query;
      S.targetIds = null;
      if ($('smartQuery')) $('smartQuery').value = S.query;
      render();
      if ($('queryExplanation')) $('queryExplanation').textContent = `검색 조건 적용: ${S.query} / 결과 ${S.filtered.length}명`;
      view('segment');
    });
    if ($('downloadResults')) $('downloadResults').onclick = download;
    if ($('closeProfile')) $('closeProfile').onclick = () => { $('profilePanel').hidden = true; };
    if ($('refreshInsights')) $('refreshInsights').onclick = () => { renderInsights(); toast('자동 인사이트 분석을 완료했습니다'); };
    if ($('closeInsightDetail')) $('closeInsightDetail').onclick = () => { $('insightDetailPanel').hidden = true; };
    if ($('competitorInput')) $('competitorInput').onchange = e => e.target.files[0] && e.target.files[0].text().then(t => renderExternal(parseCsv(t), e.target.files[0].name));
    if ($('closeExternalDetail')) $('closeExternalDetail').onclick = () => { $('externalDetailPanel').hidden = true; };
    seed();
    renderInsightPlaceholder();
    loadExternal();
  });
})();
