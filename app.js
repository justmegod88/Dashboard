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

  const productWords = {
    ast: ['난시', '토릭', 'TORIC', 'ASD'],
    mf: ['멀티포컬', 'MULTIFOCAL', '다초점', '노안', 'MF'],
    max: ['MAX', '맥스', '블루라이트', '실리콘']
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

  const clean = v => (v == null ? '' : String(v).trim());
  const norm = s => clean(s).replace(/\u00a0/g, '').replace(/[\s_\-()./]/g, '').toLowerCase();
  const keyVal = v => norm(v).replace(/[^a-z0-9가-힣]/g, '');
  const esc = s => clean(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  function get(row, names) {
    if (!row) return '';
    const map = {};
    Object.keys(row).forEach(k => { map[norm(k)] = row[k]; });
    for (const name of names) {
      const value = map[norm(name)];
      if (value !== undefined && clean(value) !== '') return value;
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
    const values = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  const sum = (arr, fn = x => x) => {
    const values = arr.map(fn).map(num).filter(v => v != null && Number.isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };

  const currentMonth = () => Math.max(1, Math.min(12, new Date().getMonth() + 1));
  const annualize = value => value == null ? null : (value / currentMonth()) * 12;

  const fmtPct = v => v == null ? '데이터 없음' : `${Math.round(Number(v) * 100)}%`;
  const fmtRate = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
  const fmtPp = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%p`;
  const fmtPack = v => v == null ? '데이터 없음' : `${Math.round(Number(v)) >= 0 ? '+' : ''}${Math.round(Number(v)).toLocaleString('ko-KR')}팩`;
  const fmtPackPerAcc = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}팩 / ACC`;
  const dclass = v => v == null ? '' : Number(v) < 0 ? 'negative' : 'positive';

  function sheetNameKey(value) {
    return clean(value).replace(/\u00a0/g, '').replace(/[\s_\-.()\/]/g, '').toLowerCase();
  }

  function findWorkbookSheetName(wb, names) {
    const sheetNames = wb.SheetNames || [];
    const targets = (names || []).map(sheetNameKey).filter(Boolean);
    let matched = sheetNames.find(name => targets.includes(sheetNameKey(name)));
    if (matched) return matched;
    matched = sheetNames.find(name => targets.some(target => sheetNameKey(name).includes(target) || target.includes(sheetNameKey(name))));
    return matched || '';
  }

  function sheet(wb, names) {
    const name = findWorkbookSheetName(wb, names);
    if (!name || !wb.Sheets[name]) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: true, blankrows: false });
  }

  // 핵심: 06_피팅판매 강제 로딩. 헤더 탐지 안 함.
  function loadFittingSalesSheet(wb) {
    const sheetNames = wb.SheetNames || [];
    let sheetName = sheetNames.find(n => sheetNameKey(n) === sheetNameKey('06_피팅판매'));
    if (!sheetName) sheetName = sheetNames.find(n => clean(n) === '피팅판매');
    if (!sheetName) sheetName = sheetNames.find(n => String(n).includes('피팅판매'));

    console.log('[사용 시트]', sheetName);
    console.log('[전체 시트]', sheetNames);

    if (!sheetName || !wb.Sheets[sheetName]) {
      console.error('[피팅판매 시트 없음]', sheetNames);
      return [];
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      defval: '',
      raw: true,
      blankrows: false
    });

    console.log('[판매행 수]', rows.length);
    console.log('[첫번째 판매행]', rows[0]);
    console.log('[판매 헤더]', Object.keys(rows[0] || {}));

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
    return rows.map((row, index) => ({
      ...row,
      안경사ID: clean(get(row, ['안경사ID', '안경사 ID', 'ID', 'OpticianID'])) || `AUTO-${index + 1}`,
      안경사명: clean(get(row, ['안경사명', '안경사', '이름', '성명'])),
      안경원코드: clean(get(row, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID'])),
      안경원명: clean(get(row, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName'])),
      지역: clean(get(row, ['지역', '시도', 'Region'])),
      연차: clean(get(row, ['연차', 'Years', '경력'])),
      Tier: clean(get(row, ['Tier', '티어', '등급'])),
      채널: clean(get(row, ['채널', 'Channel', '전략구분', '유형'])),
      담당영업사원: clean(get(row, ['담당영업사원', '담당자', '영업사원']))
    })).filter(row => row.안경사ID || row.안경사명);
  }

  function normQm(rows) {
    return rows.map((row, index) => {
      const q = clean(get(row, ['문항', '문항명', 'Question']));
      return {
        문항ID: clean(get(row, ['문항ID', 'QuestionID'])) || `Q${String(index + 1).padStart(3, '0')}`,
        문항: q,
        제품군: clean(get(row, ['제품군'])) ? infer(clean(get(row, ['제품군']))) : infer(q),
        목표값: num(get(row, ['목표값'])) ?? 4,
        긍정방향: clean(get(row, ['긍정방향'])) || (/역코딩/.test(q) ? '낮을수록 긍정' : '높을수록 긍정'),
        사용: clean(get(row, ['분석사용여부', '사용여부'])) || 'Y'
      };
    });
  }

  function normPer(rows) {
    const meta = ['안경사ID', 'ID', '안경사명', '안경원명', '지역', '연차', 'Tier', 'SEG', 'No', '번호'];
    const out = [];
    rows.forEach(row => {
      const id = clean(get(row, ['안경사ID', '안경사 ID', 'ID']));
      if (!id) return;
      Object.keys(row).forEach(col => {
        if (meta.some(m => norm(m) === norm(col))) return;
        const qm = S.qm.find(q => norm(col).includes(norm(q.문항ID)) || norm(col).includes(norm(q.문항))) || {
          문항ID: col,
          문항: col,
          제품군: infer(col),
          목표값: 4,
          긍정방향: /역코딩/.test(col) ? '낮을수록 긍정' : '높을수록 긍정',
          사용: 'Y'
        };
        const s = score(row[col]);
        if (s == null || s < 1 || s > 5 || qm.사용 === 'N') return;
        const adj = /낮을수록/.test(qm.긍정방향) ? 6 - s : s;
        out.push({ 안경사ID: id, 문항ID: qm.문항ID, 문항: qm.문항, 제품군: qm.제품군, 원응답: row[col], 점수: adj, 목표값: qm.목표값, gap: adj < qm.목표값 });
      });
    });
    return out;
  }

  function storeKey(row) {
    const code = clean(get(row, ['안경원코드', '매장코드', '거래처코드', 'ShipTo', 'SoldTo', 'Outletnumber', 'Outlet Number', '매장ID', '매장번호', 'CustomerID']) || row?.안경원코드);
    const name = clean(get(row, ['안경원명', '안경원', '매장명', '거래처명', 'OutletName', 'StoreName']) || row?.안경원명);
    return code ? keyVal(code) : (name ? keyVal(name) : '');
  }

  function salesId(row) {
    return clean(get(row, ['안경사ID', '안경사 ID', 'ID', 'OpticianID']));
  }

  function rebuildIndexes() {
    S.salesByStore = new Map();
    S.salesById = new Map();
    S.masterById = new Map();
    S.eduById = new Map();
    S.perById = new Map();
    S.recById = new Map();
    S.metricCache = new Map();

    S.master.forEach(row => { if (row.안경사ID) S.masterById.set(row.안경사ID, row); });

    S.sales.forEach(row => {
      const id = salesId(row);
      if (id) {
        let arr = S.salesById.get(id);
        if (!arr) { arr = []; S.salesById.set(id, arr); }
        arr.push(row);
      }
      const sk = storeKey(row);
      if (sk) {
        let arr = S.salesByStore.get(sk);
        if (!arr) { arr = []; S.salesByStore.set(sk, arr); }
        arr.push(row);
      }
    });

    S.edu.forEach(row => {
      const id = clean(get(row, ['안경사ID', '안경사 ID', 'ID']));
      if (!id) return;
      let arr = S.eduById.get(id);
      if (!arr) { arr = []; S.eduById.set(id, arr); }
      arr.push(row);
    });

    S.per.forEach(row => {
      const id = row.안경사ID;
      if (!id) return;
      let arr = S.perById.get(id);
      if (!arr) { arr = []; S.perById.set(id, arr); }
      arr.push(row);
    });

    S.rec.forEach(row => {
      const id = clean(get(row, ['안경사ID', '안경사 ID', 'ID']));
      if (id && !S.recById.has(id)) S.recById.set(id, row);
    });
  }

  // 같은 안경원코드가 여러 번 걸리면 1개만 계산
  function dedupeSalesRows(rows) {
    const map = new Map();
    rows.forEach((row, idx) => {
      const store = storeKey(row);
      const id = salesId(row);
      const key = store || id || `row-${idx}`;
      if (!map.has(key)) map.set(key, row);
    });
    return [...map.values()];
  }

  // 1순위 안경사ID 매칭, 없을 때만 안경원코드 fallback
  function rowsFor(id) {
    const direct = S.salesById.get(id) || [];
    if (direct.length) return dedupeSalesRows(direct);

    const master = S.masterById.get(id);
    if (!master) return [];
    const store = storeKey(master);
    if (!store) return [];
    return dedupeSalesRows(S.salesByStore.get(store) || []);
  }

  function selectedSalesRows(masterRows) {
    const rows = [];
    masterRows.forEach(row => rows.push(...rowsFor(row.안경사ID)));
    return dedupeSalesRows(rows);
  }

  function annualizedCY(rows, key) {
    const cy = sum(rows, row => get(row, FITTING_COLUMNS[key].cy));
    return annualize(cy);
  }

  function packDelta(rows, key) {
    const col = FITTING_COLUMNS[key];
    const py = sum(rows, row => get(row, col.py));
    const cyAnnualized = annualize(sum(rows, row => get(row, col.cy)));
    if (py == null && cyAnnualized == null) return null;
    return (cyAnnualized || 0) - (py || 0);
  }

  function avgPackDeltaPerAcc(rows, key) {
    const uniqueRows = dedupeSalesRows(rows);
    if (!uniqueRows.length) return null;
    const total = packDelta(uniqueRows, key);
    return total == null ? null : total / uniqueRows.length;
  }

  function growth(rows, key) {
    const col = FITTING_COLUMNS[key];
    const py = sum(rows, row => get(row, col.py));
    const cyAnnualized = annualize(sum(rows, row => get(row, col.cy)));
    if (py == null && cyAnnualized == null) return null;
    if (!py && cyAnnualized) return 100;
    return py ? ((cyAnnualized - py) / py * 100) : null;
  }

  function negativeAccCount(rows, key) {
    return dedupeSalesRows(rows).filter(row => {
      const g = growth([row], key);
      return g != null && g < 0;
    }).length;
  }

  function eduDone(row) {
    const flag = clean(get(row, ['완료여부', '수료여부', '참여여부', '시청여부'])).toUpperCase();
    if (['Y', 'YES', 'TRUE', '완료', '수료', 'DONE', 'COMPLETED'].includes(flag)) return true;
    const progress = num(get(row, ['완료율', '진도율', '진행률']));
    return progress != null && progress >= 100;
  }

  function metrics(id) {
    if (S.metricCache.has(id)) return S.metricCache.get(id);
    const person = S.masterById.get(id);
    const sr = rowsFor(id);
    const perc = S.perById.get(id) || [];
    const gaps = perc.filter(x => x.gap);
    const edu = S.eduById.get(id) || [];
    const eduRate = edu.length ? edu.filter(eduDone).length / edu.length : null;
    const rec = S.recById.get(id) || {};
    const growths = {
      ast: { cur: growth(sr, 'ast'), pack: packDelta(sr, 'ast'), avgPack: avgPackDeltaPerAcc(sr, 'ast') },
      mf: { cur: growth(sr, 'mf'), pack: packDelta(sr, 'mf'), avgPack: avgPackDeltaPerAcc(sr, 'mf') },
      max: { cur: growth(sr, 'max'), pack: packDelta(sr, 'max'), avgPack: avgPackDeltaPerAcc(sr, 'max') }
    };
    const avgGrowth = avg([growths.ast.cur, growths.mf.cur, growths.max.cur]);
    const priority = gaps.length >= 3 || (avgGrowth != null && avgGrowth < 0) ? '높음' : gaps.length ? '중간' : '낮음';
    const m = { p: person, perc, gaps, eduRate, rec, growths, priority, educationIncomplete: eduRate == null || eduRate < 1 };
    S.metricCache.set(id, m);
    return m;
  }

  function filterByDropdown() {
    let rows = [...S.master];
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => {
      const value = $(id)?.value;
      if (value) rows = rows.filter(row => clean(row[field]) === value);
    });
    return rows;
  }

  function filtered() {
    let rows = filterByDropdown();
    const q = clean(S.query);
    if (q) {
      const years = (q.match(/(\d+)\s*년차/) || [])[1];
      if (years) rows = rows.filter(row => clean(row.연차).includes(years));
      const wantGap = /인식|Gap|갭|문항/.test(q);
      const eduIn = /미완료|미수료|교육/.test(q);
      const negative = /성장률 음수|역성장|마이너스|성장률.*낮/.test(q);
      rows = rows.filter(row => {
        const m = metrics(row.안경사ID);
        if (wantGap && !m.gaps.length) return false;
        if (eduIn && !(m.eduRate == null || m.eduRate < 1)) return false;
        if (negative && !['ast', 'mf', 'max'].some(k => m.growths[k].cur != null && m.growths[k].cur < 0)) return false;
        return true;
      });
    }
    if (S.targetIds) rows = rows.filter(row => S.targetIds.has(row.안경사ID));
    return rows;
  }

  function kpi(label, value, note) {
    return `<div class="kpi-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
  }

  function kpiGrowth(key, rows) {
    const sales = selectedSalesRows(rows);
    const cur = growth(sales, key);
    const all = growth(dedupeSalesRows(S.sales), key);
    const diff = cur != null && all != null ? cur - all : null;
    const avgPack = avgPackDeltaPerAcc(sales, key);
    return kpi(
      FITTING_COLUMNS[key].title,
      `<span class="${dclass(avgPack)}">${fmtPackPerAcc(avgPack)}</span>`,
      `<span>${fmtRate(cur)} <span class="kpi-sub">(vs PY)</span></span><br>
       <span class="delta ${dclass(diff)}">${fmtPp(diff)} <span class="kpi-sub">(vs 전체평균)</span></span>`
    );
  }

  function render() {
    const rows = filtered();
    S.filtered = rows;
    const ms = rows.map(row => metrics(row.안경사ID));
    const eduComplete = ms.filter(m => m.eduRate === 1).length;
    const reached = ms.filter(m => m.perc.length && m.gaps.length === 0).length;
    const salesForCurrentRows = selectedSalesRows(rows);

    if ($('kpiGrid')) {
      $('kpiGrid').innerHTML = [
        kpi('전체 관리 안경사', rows.length.toLocaleString('ko-KR'), '현재 필터'),
        kpi('교육 완료 안경사', eduComplete.toLocaleString('ko-KR'), `${fmtPct(rows.length ? eduComplete / rows.length : null)} 완료`),
        kpi('인식 목표 도달 안경사', reached.toLocaleString('ko-KR'), `${fmtPct(rows.length ? reached / rows.length : null)} 도달`),
        kpiGrowth('ast', rows),
        kpiGrowth('mf', rows),
        kpiGrowth('max', rows)
      ].join('');
    }

    if ($('gapCards')) {
      const cards = [
        ['education', '교육 미완료', `${ms.filter(m => m.educationIncomplete).length}명`],
        ['perception', '인식 목표 미달', `${ms.filter(m => m.gaps.length).length}명`],
        ['sales ast', '난시 역성장', `${negativeAccCount(salesForCurrentRows, 'ast')} ACC`],
        ['sales mf', '멀티포컬 역성장', `${negativeAccCount(salesForCurrentRows, 'mf')} ACC`],
        ['sales max', 'MAX 역성장', `${negativeAccCount(salesForCurrentRows, 'max')} ACC`]
      ];
      $('gapCards').innerHTML = cards.map(c => `<div class="gap-card ${c[0]}"><span>${c[1]}</span><b>${c[2]}</b><small>현재 그룹 기준</small></div>`).join('');
    }

    renderQuestionTop(rows);
    renderTopEdu(ms);
    renderSegment(rows, ms);
  }

  function renderQuestionTop(rows) {
    if (!$('questionTop')) return;
    const ids = new Set(rows.map(row => row.안경사ID));
    const counts = {};
    S.per.forEach(p => {
      if (ids.has(p.안경사ID) && p.gap) counts[p.문항] = (counts[p.문항] || 0) + 1;
    });
    $('questionTop').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">인식 Gap 문항이 없습니다.</div>';
  }

  function contentName(id) {
    const c = S.content.find(x => clean(get(x, ['교육ID'])) === clean(id));
    return clean(get(c, ['교육명', '콘텐츠명'])) || clean(id);
  }

  function renderTopEdu(ms) {
    if (!$('topEducation')) return;
    const counts = {};
    ms.forEach(m => {
      const name = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID']));
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    $('topEducation').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">추천 교육 데이터가 없습니다.</div>';
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
    const map = {};
    arr.forEach(item => {
      const value = clean(item[key]) || '미분류';
      (map[value] || (map[value] = [])).push(item);
    });
    return map;
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
    const ids = new Set(rows.map(row => row.안경사ID));
    const keywords = productWords[key] || [];
    const eduRows = S.edu.filter(row => ids.has(clean(get(row, ['안경사ID', '안경사 ID', 'ID']))));
    const related = eduRows.filter(row => keywords.some(k => Object.values(row).join(' ').includes(k)));
    const base = related.length ? related : eduRows;
    const done = base.filter(eduDone).length;
    const rateVal = base.length ? done / base.length : null;
    const names = [...new Set(base.map(row => clean(get(row, ['교육명', '콘텐츠명'])) || contentName(get(row, ['교육ID', 'ID']))).filter(Boolean))].slice(0, 3);
    return { total: base.length, done, rate: rateVal, names };
  }

  function insight(type, title, rows, key, symptom, cause, action, scoreValue) {
    return { type, title, targetIds: rows.map(row => row.안경사ID), size: rows.length, key, symptom, cause, action, score: scoreValue };
  }

  function generateInsights() {
    const out = [];
    const allSales = dedupeSalesRows(S.sales);
    const overall = {
      ast: growth(allSales, 'ast'),
      mf: growth(allSales, 'mf'),
      max: growth(allSales, 'max')
    };
    const groups = [];
    ['지역', '연차', 'Tier', '채널', '담당영업사원'].forEach(dim => {
      Object.entries(by(S.master, dim)).forEach(([value, rows]) => {
        if (rows.length >= 3) groups.push({ name: value, rows, dim });
      });
    });
    groups.forEach(g => {
      const sales = selectedSalesRows(g.rows);
      const ms = g.rows.map(row => metrics(row.안경사ID));
      ['ast', 'mf', 'max'].forEach(key => {
        const rg = growth(sales, key);
        const pk = packDelta(sales, key);
        if (rg == null) return;
        const diff = overall[key] != null ? rg - overall[key] : null;
        const below = diff != null && diff <= -3;
        const reverse = rg < 0;
        if (!below && !reverse) return;
        const best = lowQuestions([key], ms)[0] || lowQuestions('all', ms)[0];
        const edu = educationSummaryForRows(g.rows, key);
        const symptom = `${FITTING_COLUMNS[key].title} ${fmtPack(pk)} (${fmtRate(rg)} vs PY)${diff != null ? ` / ${fmtPp(diff)} vs 전체평균` : ''}`;
        const cause = best ? `${best.q}: 선택 그룹 평균 ${best.seg.toFixed(1)}점, 전체 평균 ${best.all.toFixed(1)}점으로 ${best.diff.toFixed(1)}점 낮습니다.` : `${FITTING_COLUMNS[key].title} 관련 인식 문항에서 뚜렷한 저하는 확인되지 않았습니다. 판매 실행, 상권, 제품 노출 요인을 함께 점검하세요.`;
        const eduText = edu.total ? `관련/전체 교육 이력 ${edu.total}건 중 완료 ${edu.done}건(${fmtPct(edu.rate)}). ${edu.names.length ? '주요 이수/추천 교육: ' + edu.names.join(', ') : '교육명 데이터 없음'}` : '교육 이력 데이터 없음';
        const scoreValue = (reverse ? 25 : 0) + (below ? Math.abs(diff) * 8 : 0) + Math.abs(pk || 0) / 50 + g.rows.length / 3 + (best ? Math.abs(best.diff) * 15 : 0);
        out.push(insight(best ? '판매 이상 → 인식 원인 후보' : '판매 이상', `${g.name} ${FITTING_COLUMNS[key].title} 이슈`, g.rows, key, symptom, cause, eduText, scoreValue));
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
    $('insightCards').innerHTML = S.insights.length ? S.insights.map((item, idx) => `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${idx + 1}. ${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. 원인 후보</small>${esc(item.cause)}</div><div class="insight-step"><small>3. 교육 이력</small>${esc(item.action || '교육 이력 데이터 없음')}</div></div><div class="note">대상 ${item.size}명 · 점수 ${Math.round(item.score)}</div><div class="insight-actions"><button class="button primary" data-insight="${idx}">대상 보기</button><button class="button" data-detail="${idx}">상세 보기</button></div></div>`).join('') : '<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>';
    document.querySelectorAll('[data-insight]').forEach(button => button.onclick = () => {
      const ins = S.insights[+button.dataset.insight];
      S.targetIds = new Set(ins.targetIds);
      S.query = '';
      render();
      if ($('queryExplanation')) $('queryExplanation').textContent = `인사이트 대상 필터 적용: ${ins.title} / 결과 ${S.filtered.length}명`;
      view('segment');
    });
    document.querySelectorAll('[data-detail]').forEach(button => button.onclick = () => showInsightDetail(+button.dataset.detail));
  }

  function showInsightDetail(idx) {
    const item = S.insights[idx];
    if (!$('insightDetailPanel')) return;
    $('insightDetailPanel').hidden = false;
    $('insightDetail').innerHTML = `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 무엇이 낮은가</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. 어떤 원인이 의심되는가</small>${esc(item.cause)}</div><div class="insight-step"><small>3. 교육 이력</small>${esc(item.action || '교육 이력 데이터 없음')}</div></div></div>`;
    $('insightDetailPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function buildFilters() {
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => {
      const el = $(id);
      if (!el) return;
      const vals = [...new Set(S.master.map(row => clean(row[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
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
    S.sales = loadFittingSalesSheet(wb);
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
        난시평균팩ACC: m.growths.ast.avgPack,
        난시성장률_연환산: m.growths.ast.cur,
        멀티포컬성장팩: m.growths.mf.pack,
        멀티포컬평균팩ACC: m.growths.mf.avgPack,
        멀티포컬성장률_연환산: m.growths.mf.cur,
        MAX성장팩: m.growths.max.pack,
        MAX평균팩ACC: m.growths.max.avgPack,
        MAX성장률_연환산: m.growths.max.cur,
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
    render();
    renderInsightPlaceholder();
    loadExternal();
  });
})();
