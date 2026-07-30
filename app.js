(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const S = { master: [], content: [], edu: [], qm: [], per: [], sales: [], rec: [], filtered: [], query: '', targetIds: null, insights: [], masterById: new Map(), salesById: new Map(), salesByStore: new Map(), eduById: new Map(), perById: new Map(), recById: new Map(), metricCache: new Map() };
  window.S = S;

  const aliases = {
    master: ['01_안경사마스터', '안경사마스터'],
    content: ['02_교육콘텐츠', '교육콘텐츠마스터'],
    edu: ['03_교육참여', '교육참여이력', '교육이력'],
    qm: ['인식문항마스터', '문항마스터'],
    per: ['04_인식조사', '인식조사', 'Sheet1'],
    rec: ['AI추천결과', '교육추천결과', '08_교육추천']
  };

  const likert = { '전혀 그렇지 않다': 1, '그렇지 않다': 2, '보통이다': 3, '비슷하다': 3, '그렇다': 4, '매우 그렇다': 5 };

  const FITTING_COLUMNS = {
    ast: { label: '난시', title: '난시 성장', py: ['2025 난시 팩수', '2025난시팩수', '25년 난시 팩수', '25년난시팩수'], cy: ['2026 난시 팩수', '2026난시팩수', '26년 난시 팩수', '26년난시팩수'], rate: ['난시 성장률', '난시성장률'] },
    mf: { label: '멀티포컬', title: '멀티포컬 성장', py: ['2025 멀티포컬  팩수', '2025 멀티포컬 팩수', '2025멀티포컬팩수', '25년 멀티포컬  팩수', '25년 멀티포컬 팩수', '25년멀티포컬팩수'], cy: ['2026 멀티포컬  팩수', '2026 멀티포컬 팩수', '2026멀티포컬팩수', '26년 멀티포컬  팩수', '26년 멀티포컬 팩수', '26년멀티포컬팩수'], rate: ['멀티포컬 성장률', '멀티포컬성장률', 'MF 성장률', 'MF성장률'] },
    max: { label: 'MAX', title: 'MAX 성장', py: ['2025 MAX  팩수', '2025 MAX 팩수', '2025MAX팩수', '25년 MAX  팩수', '25년 MAX 팩수', '25년MAX팩수'], cy: ['2026 MAX  팩수', '2026 MAX 팩수', '2026MAX팩수', '26년 MAX  팩수', '26년 MAX 팩수', '26년MAX팩수'], rate: ['MAX 성장률', 'MAX성장률', '맥스 성장률', '맥스성장률'] }
  };

  const INSIGHT = {
    ast: { focus: '난시 관련 인식', keywords: ['난시', '토릭', 'ASD', '조기교정', '교정', '피팅', '축', '원주'], eduFallback: ['난시 조기교정 인식 강화 교육', '난시 피팅·상담 실전 교육'] },
    mf: { focus: '멀티포컬 관련 인식', keywords: ['멀티포컬', '다초점', '노안', 'MF', '상담', '적응', 'Follow', '팔로우'], eduFallback: ['노안·멀티포컬 상담 기본 교육', '멀티포컬 실전 피팅·Follow-up 교육'] },
    max: { focus: '블루라이트·눈건강 관련 인식', keywords: ['MAX', '맥스', '블루라이트', '눈건강', '보호', '자외선', '실리콘', '오아시스', '피로'], eduFallback: ['블루라이트·눈건강 가치 전달 교육', 'ACUVUE OASYS MAX 상담 스크립트 교육'] }
  };

  const clean = v => (v == null ? '' : String(v).trim());
  const norm = s => clean(s).replace(/\u00a0/g, '').replace(/[\s_\-()./]/g, '').toLowerCase();
  const keyVal = v => norm(v).replace(/[^a-z0-9가-힣]/g, '');
  const esc = s => clean(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  function get(row, names) {
    if (!row) return '';
    const map = {};
    Object.keys(row).forEach(k => { map[norm(k)] = row[k]; });
    for (const n of names) {
      const v = map[norm(n)];
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

  const avg = (arr, fn = x => x) => { const vals = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v)); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; };
  const sum = (arr, fn = x => x) => { const vals = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v)); return vals.length ? vals.reduce((a, b) => a + b, 0) : null; };

  const currentMonth = () => Math.max(1, Math.min(12, new Date().getMonth() + 1));
  const annualize = v => v == null ? null : (v / currentMonth()) * 12;
  const fmtPct = v => v == null ? '데이터 없음' : `${Math.round(Number(v) * 100)}%`;
  const fmtRate = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
  const fmtPp = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%p`;
  const fmtPack = v => v == null ? '데이터 없음' : `${Math.round(Number(v)) >= 0 ? '+' : ''}${Math.round(Number(v)).toLocaleString('ko-KR')}팩`;
  const fmtPackPerAcc = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}팩 / ACC`;
  const dclass = v => v == null ? '' : Number(v) < 0 ? 'negative' : 'positive';

  function sheetNameKey(v) { return clean(v).replace(/\u00a0/g, '').replace(/[\s_\-.()\/]/g, '').toLowerCase(); }
  function findWorkbookSheetName(wb, names) {
    const sheetNames = wb.SheetNames || [];
    const targets = (names || []).map(sheetNameKey).filter(Boolean);
    let matched = sheetNames.find(name => targets.includes(sheetNameKey(name)));
    if (matched) return matched;
    matched = sheetNames.find(name => targets.some(t => sheetNameKey(name).includes(t) || t.includes(sheetNameKey(name))));
    return matched || '';
  }
  function sheet(wb, names) { const n = findWorkbookSheetName(wb, names); return n && wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: true, blankrows: false }) : []; }

  function loadFittingSalesSheet(wb) {
    const sheetNames = wb.SheetNames || [];
    let sheetName = sheetNames.find(n => sheetNameKey(n) === sheetNameKey('06_피팅판매'));
    if (!sheetName) sheetName = sheetNames.find(n => clean(n) === '피팅판매');
    if (!sheetName) sheetName = sheetNames.find(n => String(n).includes('피팅판매'));
    console.log('[사용 시트]', sheetName);
    console.log('[전체 시트]', sheetNames);
    if (!sheetName || !wb.Sheets[sheetName]) { console.error('[피팅판매 시트 없음]', sheetNames); return []; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: true, blankrows: false });
    console.log('[판매행 수]', rows.length);
    console.log('[첫번째 판매행]', rows[0]);
    console.log('[판매 헤더]', Object.keys(rows[0] || {}));
    return rows;
  }

  function infer(q) { q = clean(q); if (/블루라이트|실리콘|기술|MAX|맥스|눈건강/.test(q)) return 'max'; if (/멀티포컬|다초점|노안|MF/.test(q)) return 'mf'; if (/난시|토릭|ASD/.test(q)) return 'ast'; return 'other'; }
  function score(v) { if (typeof v === 'number') return v; return likert[clean(v)] ?? num(v); }

  function normMaster(rows) {
    return rows.map((r, i) => ({ ...r, 안경사ID: clean(get(r, ['안경사ID', '안경사 ID', 'ID', 'OpticianID'])) || `AUTO-${i + 1}`, 안경사명: clean(get(r, ['안경사명', '안경사', '이름', '성명'])), 안경원코드: clean(get(r, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID'])), 안경원명: clean(get(r, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName'])), 지역: clean(get(r, ['지역', '시도', 'Region'])), 연차: clean(get(r, ['연차', 'Years', '경력'])), Tier: clean(get(r, ['Tier', '티어', '등급'])), 채널: clean(get(r, ['채널', 'Channel', '전략구분', '유형'])), 담당영업사원: clean(get(r, ['담당영업사원', '담당자', '영업사원'])) })).filter(r => r.안경사ID || r.안경사명);
  }

  function normQm(rows) {
    return rows.map((r, i) => { const q = clean(get(r, ['문항', '문항명', 'Question'])); return { 문항ID: clean(get(r, ['문항ID', 'QuestionID'])) || `Q${String(i + 1).padStart(3, '0')}`, 문항: q, 제품군: clean(get(r, ['제품군'])) ? infer(clean(get(r, ['제품군']))) : infer(q), 목표값: num(get(r, ['목표값'])) ?? 4, 긍정방향: clean(get(r, ['긍정방향'])) || (/역코딩/.test(q) ? '낮을수록 긍정' : '높을수록 긍정'), 사용: clean(get(r, ['분석사용여부', '사용여부'])) || 'Y' }; });
  }

  function normPer(rows) {
    const meta = ['안경사ID', 'ID', '안경사명', '안경원명', '지역', '연차', 'Tier', 'SEG', 'No', '번호'];
    const out = [];
    rows.forEach(r => {
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
      if (!id) return;
      Object.keys(r).forEach(col => {
        if (meta.some(m => norm(m) === norm(col))) return;
        const qm = S.qm.find(q => norm(col).includes(norm(q.문항ID)) || norm(col).includes(norm(q.문항))) || { 문항ID: col, 문항: col, 제품군: infer(col), 목표값: 4, 긍정방향: /역코딩/.test(col) ? '낮을수록 긍정' : '높을수록 긍정', 사용: 'Y' };
        const s = score(r[col]);
        if (s == null || s < 1 || s > 5 || qm.사용 === 'N') return;
        const adj = /낮을수록/.test(qm.긍정방향) ? 6 - s : s;
        out.push({ 안경사ID: id, 문항ID: qm.문항ID, 문항: qm.문항, 제품군: qm.제품군, 원응답: r[col], 점수: adj, 목표값: qm.목표값, gap: adj < qm.목표값 });
      });
    });
    return out;
  }

  function storeKey(row) { const code = clean(get(row, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID']) || row?.안경원코드); const name = clean(get(row, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName']) || row?.안경원명); return code ? keyVal(code) : (name ? keyVal(name) : ''); }
  function salesId(row) { return clean(get(row, ['안경사ID', '안경사 ID', 'ID', 'OpticianID'])); }

  function rebuildIndexes() {
    S.salesByStore = new Map(); S.salesById = new Map(); S.masterById = new Map(); S.eduById = new Map(); S.perById = new Map(); S.recById = new Map(); S.metricCache = new Map();
    S.master.forEach(r => { if (r.안경사ID) S.masterById.set(r.안경사ID, r); });
    S.sales.forEach(r => { const id = salesId(r); if (id) { let a = S.salesById.get(id); if (!a) { a = []; S.salesById.set(id, a); } a.push(r); } const sk = storeKey(r); if (sk) { let a = S.salesByStore.get(sk); if (!a) { a = []; S.salesByStore.set(sk, a); } a.push(r); } });
    S.edu.forEach(r => { const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID'])); if (!id) return; let a = S.eduById.get(id); if (!a) { a = []; S.eduById.set(id, a); } a.push(r); });
    S.per.forEach(r => { const id = r.안경사ID; if (!id) return; let a = S.perById.get(id); if (!a) { a = []; S.perById.set(id, a); } a.push(r); });
    S.rec.forEach(r => { const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID'])); if (id && !S.recById.has(id)) S.recById.set(id, r); });
  }

  function dedupeSalesRows(rows) { const map = new Map(); rows.forEach((r, i) => { const store = storeKey(r); const id = salesId(r); const key = store || id || `row-${i}`; if (!map.has(key)) map.set(key, r); }); return [...map.values()]; }
  function rowsFor(id) { const direct = S.salesById.get(id) || []; if (direct.length) return dedupeSalesRows(direct); const m = S.masterById.get(id); if (!m) return []; const store = storeKey(m); return store ? dedupeSalesRows(S.salesByStore.get(store) || []) : []; }
  function selectedSalesRows(masterRows) { const rows = []; masterRows.forEach(r => rows.push(...rowsFor(r.안경사ID))); return dedupeSalesRows(rows); }

  function packDelta(rows, key) { const col = FITTING_COLUMNS[key]; const py = sum(rows, r => get(r, col.py)); const cyAnnualized = annualize(sum(rows, r => get(r, col.cy))); if (py == null && cyAnnualized == null) return null; return (cyAnnualized || 0) - (py || 0); }
  function avgPackDeltaPerAcc(rows, key) { const u = dedupeSalesRows(rows); if (!u.length) return null; const total = packDelta(u, key); return total == null ? null : total / u.length; }
  function growth(rows, key) { const col = FITTING_COLUMNS[key]; const py = sum(rows, r => get(r, col.py)); const cyAnnualized = annualize(sum(rows, r => get(r, col.cy))); if (py == null && cyAnnualized == null) return null; if (!py && cyAnnualized) return 100; return py ? ((cyAnnualized - py) / py * 100) : null; }
  function negativeAccCount(rows, key) { return dedupeSalesRows(rows).filter(r => { const g = growth([r], key); return g != null && g < 0; }).length; }

  function eduDone(row) { const f = clean(get(row, ['완료여부', '수료여부', '참여여부', '시청여부'])).toUpperCase(); if (['Y', 'YES', 'TRUE', '완료', '수료', 'DONE', 'COMPLETED'].includes(f)) return true; const p = num(get(row, ['완료율', '진도율', '진행률'])); return p != null && p >= 100; }

  function metrics(id) {
    if (S.metricCache.has(id)) return S.metricCache.get(id);
    const person = S.masterById.get(id);
    const sr = rowsFor(id);
    const perc = S.perById.get(id) || [];
    const gaps = perc.filter(x => x.gap);
    const edu = S.eduById.get(id) || [];
    const eduRate = edu.length ? edu.filter(eduDone).length / edu.length : null;
    const rec = S.recById.get(id) || {};
    const growths = { ast: { cur: growth(sr, 'ast'), pack: packDelta(sr, 'ast'), avgPack: avgPackDeltaPerAcc(sr, 'ast') }, mf: { cur: growth(sr, 'mf'), pack: packDelta(sr, 'mf'), avgPack: avgPackDeltaPerAcc(sr, 'mf') }, max: { cur: growth(sr, 'max'), pack: packDelta(sr, 'max'), avgPack: avgPackDeltaPerAcc(sr, 'max') } };
    const avgGrowth = avg([growths.ast.cur, growths.mf.cur, growths.max.cur]);
    const priority = gaps.length >= 3 || (avgGrowth != null && avgGrowth < 0) ? '높음' : gaps.length ? '중간' : '낮음';
    const m = { p: person, perc, gaps, eduRate, rec, growths, priority, educationIncomplete: eduRate == null || eduRate < 1 };
    S.metricCache.set(id, m); return m;
  }

  function filterByDropdown() { let rows = [...S.master]; [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, f]) => { const v = $(id)?.value; if (v) rows = rows.filter(r => clean(r[f]) === v); }); return rows; }
  function filtered() {
    let rows = filterByDropdown(); const q = clean(S.query);
    if (q) { const years = (q.match(/(\d+)\s*년차/) || [])[1]; if (years) rows = rows.filter(r => clean(r.연차).includes(years)); const wantGap = /인식|Gap|갭|문항/.test(q); const eduIn = /미완료|미수료|교육/.test(q); const negative = /성장률 음수|역성장|마이너스|성장률.*낮/.test(q); rows = rows.filter(r => { const m = metrics(r.안경사ID); if (wantGap && !m.gaps.length) return false; if (eduIn && !(m.eduRate == null || m.eduRate < 1)) return false; if (negative && !['ast', 'mf', 'max'].some(k => m.growths[k].cur != null && m.growths[k].cur < 0)) return false; return true; }); }
    if (S.targetIds) rows = rows.filter(r => S.targetIds.has(r.안경사ID)); return rows;
  }

  function kpi(label, value, note) { return `<div class="kpi-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`; }
  function kpiGrowth(key, rows) { const sales = selectedSalesRows(rows); const cur = growth(sales, key); const all = growth(dedupeSalesRows(S.sales), key); const diff = cur != null && all != null ? cur - all : null; const avgPack = avgPackDeltaPerAcc(sales, key); return kpi(FITTING_COLUMNS[key].title, `<span class="${dclass(avgPack)}">${fmtPackPerAcc(avgPack)}</span>`, `<span>${fmtRate(cur)} <span class="kpi-sub">(vs PY)</span></span><br><span class="delta ${dclass(diff)}">${fmtPp(diff)} <span class="kpi-sub">(vs 전체평균)</span></span>`); }

  function render() {
    const rows = filtered(); S.filtered = rows;
    const ms = rows.map(r => metrics(r.안경사ID));
    const eduComplete = ms.filter(m => m.eduRate === 1).length;
    const reached = ms.filter(m => m.perc.length && m.gaps.length === 0).length;
    const salesForCurrentRows = selectedSalesRows(rows);
    if ($('kpiGrid')) $('kpiGrid').innerHTML = [kpi('전체 관리 안경사', rows.length.toLocaleString('ko-KR'), '현재 필터'), kpi('교육 완료 안경사', eduComplete.toLocaleString('ko-KR'), `${fmtPct(rows.length ? eduComplete / rows.length : null)} 완료`), kpi('인식 목표 도달 안경사', reached.toLocaleString('ko-KR'), `${fmtPct(rows.length ? reached / rows.length : null)} 도달`), kpiGrowth('ast', rows), kpiGrowth('mf', rows), kpiGrowth('max', rows)].join('');
    if ($('gapCards')) { const cards = [['education', '교육 미완료', `${ms.filter(m => m.educationIncomplete).length}명`], ['perception', '인식 목표 미달', `${ms.filter(m => m.gaps.length).length}명`], ['sales ast', '난시 역성장', `${negativeAccCount(salesForCurrentRows, 'ast')} ACC`], ['sales mf', '멀티포컬 역성장', `${negativeAccCount(salesForCurrentRows, 'mf')} ACC`], ['sales max', 'MAX 역성장', `${negativeAccCount(salesForCurrentRows, 'max')} ACC`]]; $('gapCards').innerHTML = cards.map(c => `<div class="gap-card ${c[0]}"><span>${c[1]}</span><b>${c[2]}</b><small>현재 그룹 기준</small></div>`).join(''); }
    renderQuestionTop(rows); renderTopEdu(ms); renderSegment(rows, ms);
  }

  function renderQuestionTop(rows) { if (!$('questionTop')) return; const ids = new Set(rows.map(r => r.안경사ID)); const counts = {}; S.per.forEach(p => { if (ids.has(p.안경사ID) && p.gap) counts[p.문항] = (counts[p.문항] || 0) + 1; }); $('questionTop').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">인식 Gap 문항이 없습니다.</div>'; }
  function contentName(id) { const c = S.content.find(x => clean(get(x, ['교육ID'])) === clean(id)); return clean(get(c, ['교육명', '콘텐츠명'])) || clean(id); }
  function renderTopEdu(ms) { if (!$('topEducation')) return; const counts = {}; ms.forEach(m => { const name = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID'])); if (name) counts[name] = (counts[name] || 0) + 1; }); $('topEducation').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">추천 교육 데이터가 없습니다.</div>'; }

  function renderSegment(rows, ms) {
    if ($('resultCount')) $('resultCount').textContent = `${rows.length.toLocaleString('ko-KR')}명`;
    if ($('segmentSummary')) $('segmentSummary').innerHTML = `<div class="three-col"><div>${kpiGrowth('ast', rows)}</div><div>${kpiGrowth('mf', rows)}</div><div>${kpiGrowth('max', rows)}</div></div>`;
    if (!$('segmentTable')) return;
    $('segmentTable').innerHTML = ms.map(m => { const p = m.p || {}; const eduName = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID'])); return `<tr data-id="${esc(p.안경사ID)}"><td><b>${esc(p.안경사명)}</b><small><br>${esc(p.안경사ID)}</small></td><td>${esc(p.안경원명)}<small><br>${esc(p.지역)} · ${esc(p.채널)}</small></td><td>${esc(p.연차)} / ${esc(p.Tier)}</td><td>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</td><td>${m.gaps.length}개</td><td>${fmtPack(m.growths.ast.pack)}<br><small>${fmtRate(m.growths.ast.cur)}</small></td><td>${fmtPack(m.growths.mf.pack)}<br><small>${fmtRate(m.growths.mf.cur)}</small></td><td>${fmtPack(m.growths.max.pack)}<br><small>${fmtRate(m.growths.max.cur)}</small></td><td>${esc(eduName || '없음')}</td><td>${m.priority}</td></tr>`; }).join('');
    document.querySelectorAll('#segmentTable tr').forEach(tr => tr.onclick = () => showProfile(tr.dataset.id));
  }

  function showProfile(id) { const m = metrics(id); if (!m.p || !$('profilePanel')) return; $('profilePanel').hidden = false; $('profileContent').innerHTML = `<h3>${esc(m.p.안경사명)} <small>${esc(id)}</small></h3><p>${esc(m.p.안경원명)} · ${esc(m.p.지역)} · ${esc(m.p.연차)} / ${esc(m.p.Tier)}</p><div class="profile-grid"><div class="status-card"><small>교육완료</small><h3>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</h3></div><div class="status-card"><small>인식 Gap</small><h3>${m.gaps.length}개</h3></div><div class="status-card"><small>우선순위</small><h3>${m.priority}</h3></div></div><h3>문항별 Gap</h3>${m.gaps.slice(0, 10).map(g => `<div class="question-card"><b>${esc(g.문항)}</b><br><small>${esc(g.제품군)} · 응답 ${esc(g.원응답)} · 목표 ${g.목표값}</small></div>`).join('') || '<div class="empty-state">Gap 문항이 없습니다.</div>'}`; $('profilePanel').scrollIntoView({ behavior: 'smooth' }); view('segment'); }

  function by(arr, key) { const map = {}; arr.forEach(item => { const value = clean(item[key]) || '미분류'; (map[value] || (map[value] = [])).push(item); }); return map; }

  function questionRelevance(q, key) {
    const txt = `${q.문항 || ''} ${q.문항ID || ''}`;
    const keywords = INSIGHT[key].keywords;
    let scoreValue = q.제품군 === key ? 4 : 0;
    keywords.forEach(k => { if (txt.toLowerCase().includes(String(k).toLowerCase())) scoreValue += 1; });
    return scoreValue;
  }

  function lowQuestionsForRows(masterRows, key, maxCount = 3, relevantOnly = true) {
    const ids = new Set(masterRows.map(r => r.안경사ID));
    const allByQ = new Map();
    const segByQ = new Map();
    const qInfo = new Map();
    S.per.forEach(p => { const rel = questionRelevance(p, key); if (relevantOnly && rel <= 0) return; const q = p.문항; if (!q) return; if (!allByQ.has(q)) allByQ.set(q, []); allByQ.get(q).push(p.점수); qInfo.set(q, { q, product: p.제품군, rel, target: p.목표값 || 4 }); if (ids.has(p.안경사ID)) { if (!segByQ.has(q)) segByQ.set(q, []); segByQ.get(q).push(p.점수); } });
    return [...segByQ.entries()].map(([q, vals]) => { const seg = avg(vals); const all = avg(allByQ.get(q) || []); const info = qInfo.get(q) || { rel: 0, target: 4, product: 'other' }; const diff = seg != null && all != null ? seg - all : null; const targetGap = seg != null ? seg - info.target : null; const severity = (diff == null ? 0 : -diff * 20) + (targetGap == null ? 0 : -targetGap * 12) + info.rel * 3; return { q, seg, all, diff, targetGap, rel: info.rel, product: info.product, severity }; }).filter(x => x.seg != null && (x.diff <= -0.2 || x.targetGap < 0 || x.rel >= 4)).sort((a, b) => b.severity - a.severity).slice(0, maxCount);
  }

  function educationTitle(row) { return clean(get(row, ['교육명', '콘텐츠명', '추천교육명', '과정명', 'Title'])) || clean(get(row, ['교육ID', '콘텐츠ID', 'ID'])); }
  function educationRelated(title, key) { const txt = clean(title).toLowerCase(); return INSIGHT[key].keywords.some(k => txt.includes(String(k).toLowerCase())); }
  function educationSummaryForRows(rows, key) {
    const ids = new Set(rows.map(r => r.안경사ID));
    const all = S.edu.filter(r => ids.has(clean(get(r, ['안경사ID', '안경사 ID', 'ID']))));
    const related = all.filter(r => educationRelated(Object.values(r).join(' '), key));
    const base = related.length ? related : all;
    const done = base.filter(eduDone).length;
    const incomplete = base.length - done;
    const titles = [...new Set(base.map(educationTitle).filter(Boolean))].slice(0, 4);
    return { all, base, relatedCount: related.length, total: base.length, done, incomplete, rate: base.length ? done / base.length : null, titles };
  }

  function completedEducationTitles(rows) {
    const ids = new Set(rows.map(r => r.안경사ID));
    return new Set(S.edu.filter(r => ids.has(clean(get(r, ['안경사ID', '안경사 ID', 'ID']))) && eduDone(r)).map(educationTitle).filter(Boolean).map(norm));
  }

  function pickEducationFromContent(key, completed) {
    const contentRows = S.content || [];
    const candidates = contentRows.map(r => ({ title: educationTitle(r), raw: r })).filter(x => x.title && educationRelated(x.title, key));
    const notDone = candidates.filter(x => !completed.has(norm(x.title))).map(x => x.title);
    const all = candidates.map(x => x.title);
    const chosen = [...new Set([...notDone, ...all, ...INSIGHT[key].eduFallback])].slice(0, 2);
    while (chosen.length < 2) chosen.push(INSIGHT[key].eduFallback[chosen.length]);
    return chosen.slice(0, 2);
  }

  function recommendedEducationPlan(rows, key, primaryCause) {
    const done = completedEducationTitles(rows);
    const titles = pickEducationFromContent(key, done);
    const reason1 = primaryCause ? `${primaryCause.q} 문항의 선택 그룹 평균이 낮아 ${INSIGHT[key].focus} 보완이 필요합니다.` : `${INSIGHT[key].focus} 보완을 위한 기본 교육입니다.`;
    const lowScore = primaryCause && primaryCause.seg != null && primaryCause.seg < 3.6;
    return [
      { step: '1차 추천', title: titles[0], reason: reason1 },
      { step: '2차 추천', title: titles[1], reason: lowScore ? '인식 저하 폭이 커서 실전 스크립트·피팅 적용 교육을 이어서 권장합니다.' : '판매 전환을 위해 상담/피팅 실행 교육을 이어서 권장합니다.' }
    ];
  }

  function otherLowAreas(rows, key) { return lowQuestionsForRows(rows, key, 3, false).filter(x => questionRelevance({ 문항: x.q, 제품군: x.product }, key) <= 0).slice(0, 2); }

  function insight(type, title, rows, key, symptom, causeList, otherList, edu, recs, scoreValue) { return { type, title, targetIds: rows.map(r => r.안경사ID), size: rows.length, key, symptom, causeList, otherList, edu, recs, score: scoreValue }; }

  function generateInsights() {
    const out = [];
    const allSales = dedupeSalesRows(S.sales);
    const overall = { ast: growth(allSales, 'ast'), mf: growth(allSales, 'mf'), max: growth(allSales, 'max') };
    const groups = [];
    ['채널', '지역', '연차', 'Tier', '담당영업사원'].forEach(dim => { Object.entries(by(S.master, dim)).forEach(([value, rows]) => { if (rows.length >= 3) groups.push({ name: value, rows, dim }); }); });
    Object.entries(by(S.master, '지역')).forEach(([region, rRows]) => { Object.entries(by(rRows, '채널')).forEach(([channel, rows]) => { if (rows.length >= 3) groups.push({ name: `${region} ${channel}`, rows, dim: '지역+채널' }); }); });

    groups.forEach(g => {
      const sales = selectedSalesRows(g.rows);
      const accCount = dedupeSalesRows(sales).length;
      if (!accCount) return;
      ['ast', 'mf', 'max'].forEach(key => {
        const rg = growth(sales, key);
        if (rg == null) return;
        const diff = overall[key] != null ? rg - overall[key] : null;
        const avgPack = avgPackDeltaPerAcc(sales, key);
        const issue = rg < 0 || (diff != null && diff <= -3);
        if (!issue) return;
        const causeList = lowQuestionsForRows(g.rows, key, 3, true);
        const primary = causeList[0] || null;
        const otherList = otherLowAreas(g.rows, key);
        const edu = educationSummaryForRows(g.rows, key);
        const recs = recommendedEducationPlan(g.rows, key, primary);
        const symptom = `${FITTING_COLUMNS[key].label} ${fmtPackPerAcc(avgPack)} (${fmtRate(rg)} vs PY)${diff != null ? ` / ${fmtPp(diff)} vs 전체평균` : ''}`;
        const scoreValue = (rg < 0 ? 60 : 0) + (diff != null ? Math.abs(Math.min(diff, 0)) * 8 : 0) + Math.abs(avgPack || 0) * 4 + accCount / 2 + (primary ? primary.severity : 0) + (edu.incomplete || 0) * 0.5;
        out.push(insight('판매 이상 → 인식 원인 후보 → 교육 추천', `${g.name} ${FITTING_COLUMNS[key].label} 성장 이슈`, g.rows, key, symptom, causeList, otherList, edu, recs, scoreValue));
      });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  function renderInsightPlaceholder() { if ($('insightSummary')) $('insightSummary').innerHTML = [kpi('인사이트 상태', '대기', 'AI 인사이트 생성 버튼을 눌러 계산하세요')].join(''); if ($('insightCards')) $('insightCards').innerHTML = '<div class="empty-state">엑셀 업로드 후 <b>AI 인사이트 생성</b> 버튼을 누르세요.</div>'; }

  function causeHtml(list, key) {
    if (!list.length) return `${INSIGHT[key].focus}에서 통계적으로 두드러진 저하 문항은 아직 없습니다. 판매 실행, 상권, 제품 노출, 교육 이수 여부를 함께 점검하세요.`;
    return list.map(x => `<b>${esc(x.q)}</b><br><small>선택 그룹 평균 ${x.seg.toFixed(1)}점, 전체 평균 ${x.all.toFixed(1)}점${x.diff != null ? `, 차이 ${x.diff.toFixed(1)}점` : ''}</small>`).join('<hr>');
  }

  function otherHtml(list) { return list.length ? list.map(x => `<b>${esc(x.q)}</b><br><small>선택 그룹 평균 ${x.seg.toFixed(1)}점, 전체 평균 ${x.all.toFixed(1)}점</small>`).join('<hr>') : '특별히 추가로 두드러진 저하 영역은 없습니다.'; }

  function eduHtml(edu) { return edu.total ? `관련/전체 교육 이력 ${edu.total}건 중 완료 ${edu.done}건(${fmtPct(edu.rate)}), 미완료 ${edu.incomplete}건.<br><small>${edu.titles.length ? '확인된 교육: ' + edu.titles.map(esc).join(', ') : '교육명 데이터 없음'}</small>` : '관련 교육 이력이 확인되지 않았습니다.'; }

  function recHtml(recs) { return recs.map(r => `<div class="recommend-card"><b>${r.step}: ${esc(r.title)}</b><br><small>${esc(r.reason)}</small></div>`).join(''); }

  function renderInsights() {
    S.insights = generateInsights();
    if ($('insightSummary')) $('insightSummary').innerHTML = [kpi('발견 인사이트', S.insights.length, 'TOP 5'), kpi('추천 교육', S.insights.length * 2, '인사이트별 2개'), kpi('분석 기준', `${currentMonth()}월 연환산`, 'vs PY + vs 전체평균'), kpi('집계 단위', 'ACC', '판매 중복 제거')].join('');
    if (!$('insightCards')) return;
    $('insightCards').innerHTML = S.insights.length ? S.insights.map((item, idx) => `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${idx + 1}. ${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>4. 교육 이수 내역</small>${eduHtml(item.edu)}</div><div class="insight-step rec"><small>5. 추천 교육 2개</small>${recHtml(item.recs)}</div></div><div class="note">대상 ${item.size}명 · 점수 ${Math.round(item.score)}</div><div class="insight-actions"><button class="button primary" data-insight="${idx}">대상 보기</button><button class="button" data-detail="${idx}">상세 보기</button></div></div>`).join('') : '<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>';
    document.querySelectorAll('[data-insight]').forEach(button => button.onclick = () => { const ins = S.insights[+button.dataset.insight]; S.targetIds = new Set(ins.targetIds); S.query = ''; render(); if ($('queryExplanation')) $('queryExplanation').textContent = `인사이트 대상 필터 적용: ${ins.title} / 결과 ${S.filtered.length}명`; view('segment'); });
    document.querySelectorAll('[data-detail]').forEach(button => button.onclick = () => showInsightDetail(+button.dataset.detail));
  }

  function showInsightDetail(idx) { const item = S.insights[idx]; if (!$('insightDetailPanel')) return; $('insightDetailPanel').hidden = false; $('insightDetail').innerHTML = `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>4. 교육 이수 내역</small>${eduHtml(item.edu)}</div><div class="insight-step rec"><small>5. 추천 교육 2개</small>${recHtml(item.recs)}</div></div></div>`; $('insightDetailPanel').scrollIntoView({ behavior: 'smooth' }); }

  function buildFilters() { [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => { const el = $(id); if (!el) return; const vals = [...new Set(S.master.map(row => clean(row[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true })); el.innerHTML = '<option value="">전체</option>' + vals.map(v => `<option>${esc(v)}</option>`).join(''); el.onchange = () => { S.query = ''; S.targetIds = null; render(); }; }); }

  async function upload(file) { if (!window.XLSX) throw new Error('XLSX 라이브러리가 로드되지 않았습니다.'); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false }); console.log('[workbook sheets]', wb.SheetNames); S.master = normMaster(sheet(wb, aliases.master)); S.content = sheet(wb, aliases.content); S.edu = sheet(wb, aliases.edu); S.qm = normQm(sheet(wb, aliases.qm)); S.per = normPer(sheet(wb, aliases.per)); S.sales = loadFittingSalesSheet(wb); S.rec = sheet(wb, aliases.rec); rebuildIndexes(); S.targetIds = null; if ($('uploadStatus')) $('uploadStatus').textContent = file.name; buildFilters(); render(); renderInsightPlaceholder(); toast(`업로드 완료: 안경사 ${S.master.length}명, 판매행 ${S.sales.length}건`); }

  function resetAll() { S.query = ''; S.targetIds = null; if ($('smartQuery')) $('smartQuery').value = ''; ['regionFilter', 'yearsFilter', 'tierFilter', 'channelFilter', 'repFilter'].forEach(id => { if ($(id)) $(id).value = ''; }); if ($('queryExplanation')) $('queryExplanation').textContent = '필터를 선택하거나 검색어를 입력하세요.'; render(); }
  function view(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); $(id)?.classList.add('active'); document.querySelector(`.tab[data-view="${id}"]`)?.classList.add('active'); }
  function toast(msg) { const t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

  function download() { if (!window.XLSX) return; const rows = S.filtered.map(p => { const m = metrics(p.안경사ID); return { 안경사ID: p.안경사ID, 안경사명: p.안경사명, 안경원명: p.안경원명, 난시성장팩_연환산: m.growths.ast.pack, 난시평균팩ACC: m.growths.ast.avgPack, 난시성장률_연환산: m.growths.ast.cur, 멀티포컬성장팩_연환산: m.growths.mf.pack, 멀티포컬평균팩ACC: m.growths.mf.avgPack, 멀티포컬성장률_연환산: m.growths.mf.cur, MAX성장팩_연환산: m.growths.max.pack, MAX평균팩ACC: m.growths.max.avgPack, MAX성장률_연환산: m.growths.max.cur, 인식Gap: m.gaps.length, 교육완료율: m.eduRate }; }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '대상목록'); XLSX.writeFile(wb, 'ACUVUE_대상목록.xlsx'); }

  function parseCsv(text) { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < text.length; i++) { const ch = text[i], nx = text[i + 1]; if (ch === '"' && q && nx === '"') { cell += '"'; i++; continue; } if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { row.push(cell); cell = ''; continue; } if ((ch === '\n' || ch === '\r') && !q) { if (ch === '\r' && nx === '\n') i++; row.push(cell); if (row.some(v => clean(v))) rows.push(row); row = []; cell = ''; continue; } cell += ch; } row.push(cell); if (row.some(v => clean(v))) rows.push(row); if (!rows.length) return []; const head = rows.shift().map(clean); return rows.map(r => Object.fromEntries(head.map((h, i) => [h, clean(r[i])]))); }
  function renderExternal(rows = [], source = 'output/Competitor_Activity.csv') { if (!$('externalInsight')) return; $('externalInsight').innerHTML = rows.length ? `<div class="query-explanation">${esc(source)} · ${rows.length}건</div>` : '자동 연결 실패 또는 데이터 없음. 타사 CSV 업로드 버튼으로 파일을 선택하세요.'; }
  async function loadExternal() { try { const res = await fetch('output/Competitor_Activity.csv', { cache: 'no-store' }); if (!res.ok) throw new Error(); renderExternal(parseCsv(await res.text())); } catch (e) { renderExternal([]); } }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => view(t.dataset.view));
    if ($('workbookInput')) $('workbookInput').onchange = e => e.target.files[0] && upload(e.target.files[0]).catch(err => { console.error(err); alert('업로드 실패\n\n' + (err.message || err)); toast('업로드 실패'); });
    if ($('runQuery')) $('runQuery').onclick = () => { S.query = $('smartQuery')?.value || ''; S.targetIds = null; render(); if ($('queryExplanation')) $('queryExplanation').textContent = `검색 조건 적용: ${S.query || '없음'} / 결과 ${S.filtered.length}명`; view('segment'); };
    if ($('smartQuery')) $('smartQuery').onkeydown = e => { if (e.key === 'Enter') $('runQuery').click(); };
    if ($('clearQuery')) $('clearQuery').onclick = resetAll;
    if ($('resetFilters')) $('resetFilters').onclick = resetAll;
    document.querySelectorAll('.examples button').forEach(b => b.onclick = () => { S.query = b.dataset.query; S.targetIds = null; if ($('smartQuery')) $('smartQuery').value = S.query; render(); if ($('queryExplanation')) $('queryExplanation').textContent = `검색 조건 적용: ${S.query} / 결과 ${S.filtered.length}명`; view('segment'); });
    if ($('downloadResults')) $('downloadResults').onclick = download;
    if ($('closeProfile')) $('closeProfile').onclick = () => { $('profilePanel').hidden = true; };
    if ($('refreshInsights')) $('refreshInsights').onclick = () => { renderInsights(); toast('자동 인사이트 분석을 완료했습니다'); };
    if ($('closeInsightDetail')) $('closeInsightDetail').onclick = () => { $('insightDetailPanel').hidden = true; };
    if ($('competitorInput')) $('competitorInput').onchange = e => e.target.files[0] && e.target.files[0].text().then(t => renderExternal(parseCsv(t), e.target.files[0].name));
    if ($('closeExternalDetail')) $('closeExternalDetail').onclick = () => { $('externalDetailPanel').hidden = true; };
    render();
    renderInsightPlaceholder();
    loadExternal();
  });
})();
