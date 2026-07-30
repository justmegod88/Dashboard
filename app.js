(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  const S = {
    master: [], content: [], edu: [], qm: [], per: [], sales: [], rec: [],
    filtered: [], query: '', targetIds: null, insights: [], gapFilter: null,
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

  const FITTING_COLUMNS = {
    ast: {
      label: '난시', title: '난시 성장',
      py: ['2025 난시 팩수', '2025난시팩수', '25년 난시 팩수', '25년난시팩수'],
      cy: ['2026 난시 팩수', '2026난시팩수', '26년 난시 팩수', '26년난시팩수'],
      rate: ['난시 성장률', '난시성장률']
    },
    mf: {
      label: '멀티포컬', title: '멀티포컬 성장',
      py: ['2025 멀티포컬  팩수', '2025 멀티포컬 팩수', '2025멀티포컬팩수', '25년 멀티포컬  팩수', '25년 멀티포컬 팩수', '25년멀티포컬팩수'],
      cy: ['2026 멀티포컬  팩수', '2026 멀티포컬 팩수', '2026멀티포컬팩수', '26년 멀티포컬  팩수', '26년 멀티포컬 팩수', '26년멀티포컬팩수'],
      rate: ['멀티포컬 성장률', '멀티포컬성장률', 'MF 성장률', 'MF성장률']
    },
    max: {
      label: 'MAX', title: 'MAX 성장',
      py: ['2025 MAX  팩수', '2025 MAX 팩수', '2025MAX팩수', '25년 MAX  팩수', '25년 MAX 팩수', '25년MAX팩수'],
      cy: ['2026 MAX  팩수', '2026 MAX 팩수', '2026MAX팩수', '26년 MAX  팩수', '26년 MAX 팩수', '26년MAX팩수'],
      rate: ['MAX 성장률', 'MAX성장률', '맥스 성장률', '맥스성장률']
    }
  };

  const INSIGHT = {
    ast: {
      focus: '난시 관련 인식',
      keywords: ['난시', '토릭', 'ASD', '조기교정', '교정', '피팅', '축', '원주', '프리즘', '구면'],
      eduFallback: ['난시 조기교정 인식 강화 교육', '난시 피팅·상담 실전 교육']
    },
    mf: {
      focus: '멀티포컬 관련 인식',
      keywords: ['멀티포컬', '다초점', '노안', 'MF', '상담', '적응', 'Follow', '팔로우'],
      eduFallback: ['노안·멀티포컬 상담 기본 교육', '멀티포컬 실전 피팅·Follow-up 교육']
    },
    max: {
      focus: '블루라이트·눈건강 관련 인식',
      keywords: ['MAX', '맥스', '블루라이트', '눈건강', '보호', '자외선', '실리콘', '오아시스', '피로'],
      eduFallback: ['블루라이트·눈건강 가치 전달 교육', 'ACUVUE OASYS MAX 상담 스크립트 교육']
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

  const currentMonth = () => Math.max(1, Math.min(12, new Date().getMonth() + 1));
  const annualize = v => v == null ? null : (v / currentMonth()) * 12;
  const fmtPct = v => v == null ? '데이터 없음' : `${Math.round(Number(v) * 100)}%`;
  const fmtRate = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
  const fmtPp = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%p`;
  const fmtPack = v => v == null ? '데이터 없음' : `${Math.round(Number(v)) >= 0 ? '+' : ''}${Math.round(Number(v)).toLocaleString('ko-KR')}팩`;
  const fmtPackPerAcc = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}팩 / ACC`;
  const dclass = v => v == null ? '' : Number(v) < 0 ? 'negative' : 'positive';

  function sheetNameKey(v) {
    return clean(v).replace(/\u00a0/g, '').replace(/[\s_\-.()\/]/g, '').toLowerCase();
  }

  function findWorkbookSheetName(wb, names) {
    const sheetNames = wb.SheetNames || [];
    const targets = (names || []).map(sheetNameKey).filter(Boolean);
    let matched = sheetNames.find(name => targets.includes(sheetNameKey(name)));
    if (matched) return matched;
    matched = sheetNames.find(name => targets.some(t => sheetNameKey(name).includes(t) || t.includes(sheetNameKey(name))));
    return matched || '';
  }

  function sheet(wb, names) {
    const name = findWorkbookSheetName(wb, names);
    return name && wb.Sheets[name]
      ? XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: true, blankrows: false })
      : [];
  }

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
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: true, blankrows: false });
    console.log('[판매행 수]', rows.length);
    console.log('[첫번째 판매행]', rows[0]);
    return rows;
  }

  function infer(q) {
    q = clean(q);
    if (/블루라이트|실리콘|기술|MAX|맥스|눈건강/.test(q)) return 'max';
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
      안경사ID: clean(get(r, ['안경사ID', '안경사 ID', 'ID', 'OpticianID'])) || `AUTO-${i + 1}`,
      안경사명: clean(get(r, ['안경사명', '안경사', '이름', '성명'])),
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
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
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

    S.master.forEach(r => { if (r.안경사ID) S.masterById.set(r.안경사ID, r); });
    S.sales.forEach(r => {
      const id = salesId(r);
      if (id) {
        let arr = S.salesById.get(id);
        if (!arr) { arr = []; S.salesById.set(id, arr); }
        arr.push(r);
      }
      const sk = storeKey(r);
      if (sk) {
        let arr = S.salesByStore.get(sk);
        if (!arr) { arr = []; S.salesByStore.set(sk, arr); }
        arr.push(r);
      }
    });
    S.edu.forEach(r => {
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
      if (!id) return;
      let arr = S.eduById.get(id);
      if (!arr) { arr = []; S.eduById.set(id, arr); }
      arr.push(r);
    });
    S.per.forEach(r => {
      const id = r.안경사ID;
      if (!id) return;
      let arr = S.perById.get(id);
      if (!arr) { arr = []; S.perById.set(id, arr); }
      arr.push(r);
    });
    S.rec.forEach(r => {
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
      if (id && !S.recById.has(id)) S.recById.set(id, r);
    });
  }

  function dedupeSalesRows(rows) {
    const map = new Map();
    rows.forEach((r, i) => {
      const store = storeKey(r);
      const id = salesId(r);
      const key = store || id || `row-${i}`;
      if (!map.has(key)) map.set(key, r);
    });
    return [...map.values()];
  }

  function rowsFor(id) {
    const direct = S.salesById.get(id) || [];
    if (direct.length) return dedupeSalesRows(direct);
    const m = S.masterById.get(id);
    if (!m) return [];
    const store = storeKey(m);
    return store ? dedupeSalesRows(S.salesByStore.get(store) || []) : [];
  }

  function selectedSalesRows(masterRows) {
    const rows = [];
    masterRows.forEach(r => rows.push(...rowsFor(r.안경사ID)));
    return dedupeSalesRows(rows);
  }

  function packDelta(rows, key) {
    const col = FITTING_COLUMNS[key];
    const py = sum(rows, r => get(r, col.py));
    const cyAnnualized = annualize(sum(rows, r => get(r, col.cy)));
    if (py == null && cyAnnualized == null) return null;
    return (cyAnnualized || 0) - (py || 0);
  }

  function avgPackDeltaPerAcc(rows, key) {
    const unique = dedupeSalesRows(rows);
    if (!unique.length) return null;
    const total = packDelta(unique, key);
    return total == null ? null : total / unique.length;
  }

  function growth(rows, key) {
    const col = FITTING_COLUMNS[key];
    const py = sum(rows, r => get(r, col.py));
    const cyAnnualized = annualize(sum(rows, r => get(r, col.cy)));
    if (py == null && cyAnnualized == null) return null;
    if (!py && cyAnnualized) return 100;
    return py ? ((cyAnnualized - py) / py * 100) : null;
  }

  function negativeAccCount(rows, key) {
    return dedupeSalesRows(rows).filter(r => {
      const g = growth([r], key);
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
      if (value) rows = rows.filter(r => clean(r[field]) === value);
    });
    return rows;
  }

  function uniqueValues(field) {
    return [...new Set(S.master.map(r => clean(r[field])).filter(Boolean))].sort((a, b) => b.length - a.length);
  }

  function queryHas(text, value) {
    return norm(text).includes(norm(value));
  }

  function productFromQuery(q) {
    if (/멀티포컬|다초점|노안|\bMF\b/i.test(q)) return 'mf';
    if (/MAX|맥스|블루라이트|눈건강/i.test(q)) return 'max';
    if (/난시|토릭|ASD/i.test(q)) return 'ast';
    return null;
  }

  function questionRelevance(q, key) {
    const text = `${q.문항 || ''} ${q.문항ID || ''}`;
    let scoreValue = q.제품군 === key ? 4 : 0;
    INSIGHT[key].keywords.forEach(k => { if (text.toLowerCase().includes(String(k).toLowerCase())) scoreValue += 1; });
    return scoreValue;
  }

  function lowPerceptionForPerson(id, productKey) {
    const rows = S.perById.get(id) || [];
    return rows.some(p => (!productKey || questionRelevance(p, productKey) > 0) && (p.gap || (p.점수 != null && p.목표값 != null && p.점수 < p.목표값)));
  }

  function matchYearsQuery(row, q) {
    const m = q.match(/(\d+)\s*년차/);
    if (m) return clean(row.연차).includes(m[1]);
    const exact = uniqueValues('연차').find(v => queryHas(q, v));
    return exact ? clean(row.연차) === exact : true;
  }

  function parseSmartConditions(q) {
    const product = productFromQuery(q);
    const conditions = [];
    const region = uniqueValues('지역').find(v => queryHas(q, v));
    if (region) conditions.push({ label: `지역=${region}`, test: r => clean(r.지역) === region });
    const tier = uniqueValues('Tier').find(v => queryHas(q, v)) || (/TOP|탑|상위/i.test(q) ? uniqueValues('Tier').find(v => /top|탑|상위/i.test(v)) : '');
    if (tier) conditions.push({ label: `Tier=${tier}`, test: r => clean(r.Tier) === tier });
    const channel = uniqueValues('채널').find(v => queryHas(q, v));
    if (channel) conditions.push({ label: `채널=${channel}`, test: r => clean(r.채널) === channel });
    if (/(\d+)\s*년차/.test(q) || uniqueValues('연차').some(v => queryHas(q, v))) {
      conditions.push({ label: '연차 조건', test: r => matchYearsQuery(r, q) });
    }
    if (/인식|gap|갭|낮|부족|저하/i.test(q)) {
      conditions.push({ label: product ? `${FITTING_COLUMNS[product].label} 인식 낮음` : '인식 낮음', test: r => lowPerceptionForPerson(r.안경사ID, product) });
    }
    if (/교육.*미완료|미완료|미수료|미이수/i.test(q)) {
      conditions.push({ label: '교육 미완료', test: r => { const m = metrics(r.안경사ID); return m.eduRate == null || m.eduRate < 1; } });
    }
    if (/역성장|성장률.*음수|마이너스|성장.*낮/i.test(q)) {
      conditions.push({ label: product ? `${FITTING_COLUMNS[product].label} 역성장` : '역성장', test: r => {
        const m = metrics(r.안경사ID);
        if (product) return m.growths[product].cur != null && m.growths[product].cur < 0;
        return ['ast', 'mf', 'max'].some(k => m.growths[k].cur != null && m.growths[k].cur < 0);
      }});
    }
    return { product, conditions };
  }

  function rowsForSalesReverse(rows, key) {
    const salesRows = selectedSalesRows(rows);
    const reverseSalesRows = dedupeSalesRows(salesRows).filter(salesRow => {
      const g = growth([salesRow], key);
      return g != null && g < 0;
    });
    const stores = new Set(reverseSalesRows.map(storeKey).filter(Boolean));
    if (!stores.size) return [];
    return rows.filter(row => stores.has(storeKey(row)));
  }

  function rowsForGapFilter(rows) {
    if (!S.gapFilter) return rows;
    if (S.gapFilter.type === 'education') return rows.filter(row => metrics(row.안경사ID).educationIncomplete);
    if (S.gapFilter.type === 'perception') return rows.filter(row => metrics(row.안경사ID).gaps.length > 0);
    if (S.gapFilter.type === 'sales' && S.gapFilter.key) return rowsForSalesReverse(rows, S.gapFilter.key);
    return rows;
  }

  function gapFilterTitle() {
    if (!S.gapFilter) return '현재 그룹';
    if (S.gapFilter.type === 'education') return '교육 미완료 대상';
    if (S.gapFilter.type === 'perception') return '인식 목표 미달 대상';
    if (S.gapFilter.type === 'sales') return `${FITTING_COLUMNS[S.gapFilter.key].label} 역성장 ACC 소속 안경사`;
    return '현재 그룹';
  }

  function setGapFilter(type, key = null) {
    S.gapFilter = { type, key };
    render();
  }

  function clearGapFilter() {
    S.gapFilter = null;
    render();
  }

  function filtered() {
    let rows = filterByDropdown();
    const q = clean(S.query);
    if (q) {
      const parsed = parseSmartConditions(q);
      if (parsed.conditions.length) rows = rows.filter(r => parsed.conditions.every(c => c.test(r)));
      else rows = rows.filter(r => Object.values(r).some(v => norm(v).includes(norm(q))));
      if ($('queryExplanation')) {
        const labels = parsed.conditions.map(c => `[${c.label}]`).join(' ');
        $('queryExplanation').textContent = labels ? `적용 조건 ${labels} / 결과 ${rows.length}명` : `검색어 적용: ${q} / 결과 ${rows.length}명`;
      }
    }
    if (S.targetIds) rows = rows.filter(r => S.targetIds.has(r.안경사ID));
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
    return kpi(FITTING_COLUMNS[key].title, `<span class="${dclass(avgPack)}">${fmtPackPerAcc(avgPack)}</span>`, `<span>${fmtRate(cur)} <span class="kpi-sub">(vs PY)</span></span><br><span class="delta ${dclass(diff)}">${fmtPp(diff)} <span class="kpi-sub">(vs 전체평균)</span></span>`);
  }

  function renderGapCards(rows, ms) {
    const salesForCurrentRows = selectedSalesRows(rows);
    const cards = [
      { cls: 'education', type: 'education', key: null, label: '교육 미완료', value: `${ms.filter(m => m.educationIncomplete).length}명` },
      { cls: 'perception', type: 'perception', key: null, label: '인식 목표 미달', value: `${ms.filter(m => m.gaps.length).length}명` },
      { cls: 'sales ast', type: 'sales', key: 'ast', label: '난시 역성장', value: `${negativeAccCount(salesForCurrentRows, 'ast')} ACC` },
      { cls: 'sales mf', type: 'sales', key: 'mf', label: '멀티포컬 역성장', value: `${negativeAccCount(salesForCurrentRows, 'mf')} ACC` },
      { cls: 'sales max', type: 'sales', key: 'max', label: 'MAX 역성장', value: `${negativeAccCount(salesForCurrentRows, 'max')} ACC` }
    ];

    $('gapCards').innerHTML = cards.map(c => {
      const active = S.gapFilter && S.gapFilter.type === c.type && S.gapFilter.key === c.key ? ' active' : '';
      return `<button class="gap-card ${c.cls}${active}" data-gap-type="${c.type}" data-gap-key="${c.key || ''}" type="button"><span>${c.label}</span><b>${c.value}</b><small>${active ? '선택됨 · 다시 클릭하면 해제' : '클릭 시 아래 TOP 문항/교육 변경'}</small></button>`;
    }).join('');

    document.querySelectorAll('[data-gap-type]').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.gapType;
        const key = btn.dataset.gapKey || null;
        if (S.gapFilter && S.gapFilter.type === type && S.gapFilter.key === key) clearGapFilter();
        else setGapFilter(type, key);
      };
    });
  }

  function render() {
    const rows = filtered();
    S.filtered = rows;
    const ms = rows.map(r => metrics(r.안경사ID));
    const eduComplete = ms.filter(m => m.eduRate === 1).length;
    const reached = ms.filter(m => m.perc.length && m.gaps.length === 0).length;
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
    if ($('gapCards')) renderGapCards(rows, ms);
    renderQuestionTop(rows);
    renderSegment(rows, ms);
  }

  function getTopGapQuestions(rows, limit = 7) {
    const targetRows = rowsForGapFilter(rows);
    const ids = new Set(targetRows.map(row => row.안경사ID));
    const countByQuestion = new Map();
    const scoreByQuestion = new Map();
    S.per.forEach(p => {
      if (!ids.has(p.안경사ID) || !p.gap) return;
      const q = p.문항;
      if (!q) return;
      countByQuestion.set(q, (countByQuestion.get(q) || 0) + 1);
      if (!scoreByQuestion.has(q)) scoreByQuestion.set(q, []);
      scoreByQuestion.get(q).push(p.점수);
    });
    return [...countByQuestion.entries()]
      .map(([q, count]) => ({ q, count, avgScore: avg(scoreByQuestion.get(q) || []) }))
      .sort((a, b) => b.count - a.count || (a.avgScore ?? 99) - (b.avgScore ?? 99))
      .slice(0, limit);
  }

  function renderQuestionTop(rows) {
    if (!$('questionTop')) return;
    const targetRows = rowsForGapFilter(rows);
    const top = getTopGapQuestions(rows, 7);
    const subtitle = $('questionTop')?.previousElementSibling;
    if (subtitle && subtitle.tagName && subtitle.tagName.toLowerCase() === 'p') {
      subtitle.textContent = `${gapFilterTitle()} 기준으로 가장 많이 부족한 문항입니다. 대상 ${targetRows.length}명`;
    }
    $('questionTop').innerHTML = top.length
      ? top.map((x, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(x.q)}</b><span>${x.count}명</span></div>`).join('')
      : '<div class="empty-state">선택 대상의 인식 Gap 문항이 없습니다.</div>';
    renderRecommendedEducationTop(top.slice(0, 3));
  }

  function contentName(id) {
    const c = S.content.find(x => clean(get(x, ['교육ID'])) === clean(id));
    return clean(get(c, ['교육명', '콘텐츠명'])) || clean(id);
  }

  function educationTitle(row) {
    return clean(get(row, ['교육명', '콘텐츠명', '추천교육명', '과정명', 'Title'])) || clean(get(row, ['교육ID', '콘텐츠ID', 'ID']));
  }

  function productKeyFromQuestion(questionText) {
    if (/멀티포컬|다초점|노안|MF/i.test(questionText)) return 'mf';
    if (/MAX|맥스|블루라이트|눈건강|자외선|실리콘/i.test(questionText)) return 'max';
    if (/난시|토릭|ASD|프리즘|축|원주/i.test(questionText)) return 'ast';
    return null;
  }

  function suggestedEducationTitle(questionText) {
    if (/프리즘|한쪽.*난시|구면|수직/i.test(questionText)) return '난시 프리즘 및 디자인 관련 교육';
    if (/난시|토릭|ASD|축|원주/i.test(questionText)) return '난시 피팅 및 디자인 관련 교육';
    if (/멀티포컬|다초점|노안|적응|체크|follow|팔로우/i.test(questionText)) return '멀티포컬 상담 및 적응 관리 교육';
    if (/블루라이트|눈건강|자외선|MAX|맥스/i.test(questionText)) return '블루라이트·눈건강 가치 전달 교육';
    return '인식 Gap 보완 교육';
  }

  function overlapScore(a, b) {
    const tokens = [...new Set(norm(a).match(/[a-z0-9가-힣]{2,}/g) || [])];
    const text = norm(b);
    return tokens.reduce((acc, token) => acc + (text.includes(token) ? 1 : 0), 0);
  }

  function educationRelated(title, key) {
    const text = clean(title).toLowerCase();
    return INSIGHT[key].keywords.some(k => text.includes(String(k).toLowerCase()));
  }

  function findBestEducationForQuestion(questionText) {
    const productKey = productKeyFromQuestion(questionText);
    const fallbackTitle = suggestedEducationTitle(questionText);
    const rows = (S.content || []).map(row => ({ row, title: educationTitle(row) })).filter(x => x.title);
    const candidates = rows
      .map(x => ({ ...x, score: overlapScore(questionText, x.title) + (productKey && INSIGHT[productKey].keywords.some(k => norm(x.title).includes(norm(k))) ? 2 : 0) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (candidates.length) return { title: candidates[0].title, status: '교육 리스트 매칭', question: questionText };
    return { title: fallbackTitle, status: '현재 교육 리스트에 없음 · 제작 필요', question: questionText };
  }

  function renderRecommendedEducationTop(topQuestions) {
    if (!$('topEducation')) return;
    const subtitle = $('topEducation')?.previousElementSibling;
    if (subtitle && subtitle.tagName && subtitle.tagName.toLowerCase() === 'p') {
      subtitle.textContent = '선택된 Gap 대상의 인식 TOP 문항에 연결된 추천 교육입니다.';
    }
    if (!topQuestions.length) {
      $('topEducation').innerHTML = '<div class="empty-state">추천 교육 데이터가 없습니다.</div>';
      return;
    }
    const recs = topQuestions.map(q => findBestEducationForQuestion(q.q));
    $('topEducation').innerHTML = recs.map((rec, i) => `<div class="rank-item"><span class="rank-no">${i + 1}</span><b>${esc(rec.title)}</b><span>${esc(rec.status)}</span><small style="display:block;grid-column:2 / 4;color:#667085;margin-top:4px;">연결 문항: ${esc(rec.question)}</small></div>`).join('');
  }

  function renderTopEdu(ms) {
    // 추천 교육 TOP은 renderQuestionTop에서 인식 TOP 문항 기반으로 갱신합니다.
  }

  function renderSegment(rows, ms) {
    if ($('resultCount')) $('resultCount').textContent = `${rows.length.toLocaleString('ko-KR')}명`;
    if ($('segmentSummary')) $('segmentSummary').innerHTML = `<div class="three-col"><div>${kpiGrowth('ast', rows)}</div><div>${kpiGrowth('mf', rows)}</div><div>${kpiGrowth('max', rows)}</div></div>`;
    if (!$('segmentTable')) return;
    $('segmentTable').innerHTML = ms.map(m => {
      const p = m.p || {};
      const eduName = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID']));
      return `<tr data-id="${esc(p.안경사ID)}"><td><b>${esc(p.안경사명)}</b><small><br>${esc(p.안경사ID)}</small></td><td>${esc(p.안경원명)}<small><br>${esc(p.지역)} · ${esc(p.채널)}</small></td><td>${esc(p.연차)} / ${esc(p.Tier)}</td><td>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</td><td>${m.gaps.length}개</td><td>${fmtPack(m.growths.ast.pack)}<br><small>${fmtRate(m.growths.ast.cur)}</small></td><td>${fmtPack(m.growths.mf.pack)}<br><small>${fmtRate(m.growths.mf.cur)}</small></td><td>${fmtPack(m.growths.max.pack)}<br><small>${fmtRate(m.growths.max.cur)}</small></td><td>${esc(eduName || '없음')}</td><td>${m.priority}</td></tr>`;
    }).join('');
    document.querySelectorAll('#segmentTable tr').forEach(tr => tr.onclick = () => showProfile(tr.dataset.id));
  }

  function showProfile(id) {
    const m = metrics(id);
    if (!m.p || !$('profilePanel')) return;
    $('profilePanel').hidden = false;
    $('profileContent').innerHTML = `<h3>${esc(m.p.안경사명)} <small>${esc(id)}</small></h3><p>${esc(m.p.안경원명)} · ${esc(m.p.지역)} · ${esc(m.p.연차)} / ${esc(m.p.Tier)}</p><div class="profile-grid"><div class="status-card"><small>교육완료</small><h3>${m.eduRate == null ? '데이터 없음' : fmtPct(m.eduRate)}</h3></div><div class="status-card"><small>인식 Gap</small><h3>${m.gaps.length}개</h3></div><div class="status-card"><small>우선순위</small><h3>${m.priority}</h3></div></div><h3>문항별 Gap</h3>${m.gaps.slice(0, 10).map(g => `<div class="question-card"><b>${esc(g.문항)}</b><br><small>${esc(g.제품군)} · 응답 ${esc(g.원응답)} · 목표 ${g.목표값}</small></div>`).join('') || '<div class="empty-state">Gap 문항이 없습니다.</div>'}`;
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

  function lowQuestionsForRows(masterRows, key, maxCount = 3, relevantOnly = true) {
    const ids = new Set(masterRows.map(r => r.안경사ID));
    const allByQ = new Map();
    const segByQ = new Map();
    const qInfo = new Map();
    S.per.forEach(p => {
      const rel = questionRelevance(p, key);
      if (relevantOnly && rel <= 0) return;
      const q = p.문항;
      if (!q) return;
      if (!allByQ.has(q)) allByQ.set(q, []);
      allByQ.get(q).push(p.점수);
      qInfo.set(q, { product: p.제품군, rel, target: p.목표값 || 4 });
      if (ids.has(p.안경사ID)) {
        if (!segByQ.has(q)) segByQ.set(q, []);
        segByQ.get(q).push(p.점수);
      }
    });
    return [...segByQ.entries()].map(([q, vals]) => {
      const seg = avg(vals);
      const all = avg(allByQ.get(q) || []);
      const info = qInfo.get(q) || { rel: 0, target: 4, product: 'other' };
      const diff = seg != null && all != null ? seg - all : null;
      const targetGap = seg != null ? seg - info.target : null;
      const severity = (diff == null ? 0 : Math.max(0, -diff) * 40) + (targetGap == null ? 0 : Math.max(0, -targetGap) * 25) + info.rel * 3;
      return { q, seg, all, diff, targetGap, rel: info.rel, product: info.product, severity };
    }).filter(x => x.seg != null && (x.diff <= -0.2 || x.targetGap < 0 || x.rel >= 4))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, maxCount);
  }

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
    const candidates = (S.content || []).map(r => ({ title: educationTitle(r), raw: r })).filter(x => x.title && educationRelated(x.title, key));
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

  function otherLowAreas(rows, key) {
    return lowQuestionsForRows(rows, key, 3, false).filter(x => questionRelevance({ 문항: x.q, 제품군: x.product }, key) <= 0).slice(0, 2);
  }

  function personHasLowRelatedPerception(personId, key) {
    const rows = S.perById.get(personId) || [];
    return rows.some(p => questionRelevance(p, key) > 0 && (p.gap || (p.점수 != null && p.목표값 != null && p.점수 < p.목표값)));
  }

  function personHasIncompleteRelatedEducation(personId, key) {
    const eduRows = S.eduById.get(personId) || [];
    const related = eduRows.filter(r => educationRelated(Object.values(r).join(' '), key));
    const base = related.length ? related : eduRows;
    return base.some(r => !eduDone(r));
  }

  function peopleInSalesAccounts(masterRows, salesRows) {
    const stores = new Set(dedupeSalesRows(salesRows).map(storeKey).filter(Boolean));
    if (!stores.size) return [];
    return masterRows.filter(r => stores.has(storeKey(r)));
  }

  function affectedSalesRowsForProduct(salesRows, key, overallGrowth) {
    const rows = dedupeSalesRows(salesRows);
    const affected = rows.filter(r => {
      const g = growth([r], key);
      if (g == null) return false;
      const diff = overallGrowth != null ? g - overallGrowth : null;
      return g < 0 || (diff != null && diff <= -3);
    });
    return affected.length ? affected : rows;
  }

  function educationTargetPeople(peopleRows, key) {
    const perceptionLow = peopleRows.filter(p => personHasLowRelatedPerception(p.안경사ID, key));
    if (perceptionLow.length) return perceptionLow;
    const educationIncomplete = peopleRows.filter(p => personHasIncompleteRelatedEducation(p.안경사ID, key));
    if (educationIncomplete.length) return educationIncomplete;
    return peopleRows;
  }

  function priorityScore(rg, diff, causeList) {
    const reverse = rg != null && rg < 0 ? Math.abs(rg) * 10 : 0;
    const underAvg = diff != null && diff < 0 ? Math.abs(diff) * 8 : 0;
    const perception = causeList && causeList.length ? causeList[0].severity : 0;
    return reverse + underAvg + perception;
  }

  function insight(type, title, rows, key, symptom, causeList, otherList, edu, recs, priority) {
    return { type, title, targetIds: rows.map(r => r.안경사ID), size: rows.length, key, symptom, causeList, otherList, edu, recs, priority };
  }

  function generateInsights() {
    const out = [];
    const allSales = dedupeSalesRows(S.sales);
    const overall = { ast: growth(allSales, 'ast'), mf: growth(allSales, 'mf'), max: growth(allSales, 'max') };
    const groups = [];
    ['Tier', '연차', '채널'].forEach(dim => {
      Object.entries(by(S.master, dim)).forEach(([value, rows]) => {
        if (rows.length >= 3) groups.push({ name: value, rows, dim });
      });
    });
    groups.forEach(g => {
      const groupSales = selectedSalesRows(g.rows);
      if (!dedupeSalesRows(groupSales).length) return;
      ['ast', 'mf', 'max'].forEach(key => {
        const rg = growth(groupSales, key);
        if (rg == null) return;
        const diff = overall[key] != null ? rg - overall[key] : null;
        const avgPack = avgPackDeltaPerAcc(groupSales, key);
        const salesIssue = rg < 0 || (diff != null && diff <= -3);
        const affectedSales = affectedSalesRowsForProduct(groupSales, key, overall[key]);
        const affectedPeople = peopleInSalesAccounts(g.rows, affectedSales);
        const targetPeople = educationTargetPeople(affectedPeople, key);
        const insightPeople = targetPeople.length ? targetPeople : affectedPeople;
        if (!insightPeople.length) return;
        const causeList = lowQuestionsForRows(insightPeople, key, 3, true);
        const perceptionIssue = causeList.length > 0 && (causeList[0].diff <= -0.2 || causeList[0].targetGap < 0);
        if (!salesIssue && !perceptionIssue) return;
        const primary = causeList[0] || null;
        const otherList = otherLowAreas(insightPeople, key);
        const edu = educationSummaryForRows(insightPeople, key);
        const recs = recommendedEducationPlan(insightPeople, key, primary);
        const symptom = `${FITTING_COLUMNS[key].label} ${fmtPackPerAcc(avgPack)} (${fmtRate(rg)} vs PY)${diff != null ? ` / ${fmtPp(diff)} vs 전체평균` : ''}`;
        const priority = priorityScore(rg, diff, causeList);
        out.push(insight('판매 이상 → 개인 인식 원인 후보 → 교육 추천', `${g.name} ${FITTING_COLUMNS[key].label} 성장 이슈`, insightPeople, key, symptom, causeList, otherList, edu, recs, priority));
      });
    });
    return out.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  function renderInsightPlaceholder() {
    if ($('insightSummary')) {
      $('insightSummary').innerHTML = '';
      $('insightSummary').style.display = 'none';
    }
    if ($('insightCards')) $('insightCards').innerHTML = '<div class="empty-state">엑셀 업로드 후 <b>AI 인사이트 생성</b> 버튼을 누르세요.</div>';
  }

  function causeHtml(list, key) {
    if (!list.length) return `${INSIGHT[key].focus}에서 통계적으로 두드러진 저하 문항은 아직 없습니다. 판매 실행, 상권, 제품 노출, 교육 이수 여부를 함께 점검하세요.`;
    return list.map(x => `<b>${esc(x.q)}</b><br><small>선택 그룹 평균 ${x.seg.toFixed(1)}점, 전체 평균 ${x.all.toFixed(1)}점${x.diff != null ? `, 차이 ${x.diff.toFixed(1)}점` : ''}</small>`).join('<hr>');
  }

  function otherHtml(list) {
    return list.length ? list.map(x => `<b>${esc(x.q)}</b><br><small>선택 그룹 평균 ${x.seg.toFixed(1)}점, 전체 평균 ${x.all.toFixed(1)}점</small>`).join('<hr>') : '특별히 추가로 두드러진 저하 영역은 없습니다.';
  }

  function eduHtml(edu) {
    return edu.total ? `관련/전체 교육 이력 ${edu.total}건 중 완료 ${edu.done}건(${fmtPct(edu.rate)}), 미완료 ${edu.incomplete}건.<br><small>${edu.titles.length ? '확인된 교육: ' + edu.titles.map(esc).join(', ') : '교육명 데이터 없음'}</small>` : '관련 교육 이력이 확인되지 않았습니다.';
  }

  function recHtml(recs) {
    return recs.map(r => `<div class="recommend-card"><b>${r.step}: ${esc(r.title)}</b><br><small>${esc(r.reason)}</small></div>`).join('');
  }

  function renderInsights() {
    S.insights = generateInsights();
    if ($('insightSummary')) {
      $('insightSummary').innerHTML = '';
      $('insightSummary').style.display = 'none';
    }
    if (!$('insightCards')) return;
    $('insightCards').innerHTML = S.insights.length ? S.insights.map((item, idx) => `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${idx + 1}. ${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>4. 교육 이수 내역</small>${eduHtml(item.edu)}</div><div class="insight-step rec"><small>5. 추천 교육 2개</small>${recHtml(item.recs)}</div></div><div class="note">교육 대상 ${item.size}명</div><div class="insight-actions"><button class="button primary" data-insight="${idx}">대상 보기</button><button class="button" data-detail="${idx}">상세 보기</button></div></div>`).join('') : '<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>';
    document.querySelectorAll('[data-insight]').forEach(button => button.onclick = () => {
      const ins = S.insights[+button.dataset.insight];
      S.targetIds = new Set(ins.targetIds);
      S.query = '';
      S.gapFilter = null;
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
    $('insightDetail').innerHTML = `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>4. 교육 이수 내역</small>${eduHtml(item.edu)}</div><div class="insight-step rec"><small>5. 추천 교육 2개</small>${recHtml(item.recs)}</div></div><div class="note">교육 대상 ${item.size}명</div></div>`;
    $('insightDetailPanel').scrollIntoView({ behavior: 'smooth' });
  }

  function gapQuestionsForPerson(id) {
    const rows = S.perById.get(id) || [];
    let product = null;
    if (S.gapFilter && S.gapFilter.type === 'sales') product = S.gapFilter.key;
    return rows.filter(p => p.gap && (!product || questionRelevance(p, product) > 0)).sort((a, b) => (a.점수 || 9) - (b.점수 || 9));
  }

  function neededEducationForPerson(id) {
    const qs = gapQuestionsForPerson(id).slice(0, 3);
    return qs.map(q => findBestEducationForQuestion(q.문항));
  }

  function downloadRows() {
    const baseRows = S.filtered || [];
    return S.gapFilter ? rowsForGapFilter(baseRows) : baseRows;
  }

  function download() {
    if (!window.XLSX) return;
    const targetRows = downloadRows();
    const rows = targetRows.map(p => {
      const m = metrics(p.안경사ID);
      const gaps = gapQuestionsForPerson(p.안경사ID);
      const recs = neededEducationForPerson(p.안경사ID);
      return {
        다운로드기준: S.gapFilter ? gapFilterTitle() : '현재 필터 대상',
        안경사ID: p.안경사ID,
        안경사명: p.안경사명,
        안경원코드: p.안경원코드,
        안경원명: p.안경원명,
        지역: p.지역,
        연차: p.연차,
        Tier: p.Tier,
        채널: p.채널,
        이상인식문항: gaps.map(g => g.문항).join(' | '),
        필요교육: recs.map(r => r.title).join(' | '),
        교육상태: recs.map(r => r.status).join(' | '),
        난시성장팩_연환산: m.growths.ast.pack,
        난시평균팩ACC: m.growths.ast.avgPack,
        난시성장률_연환산: m.growths.ast.cur,
        멀티포컬성장팩_연환산: m.growths.mf.pack,
        멀티포컬평균팩ACC: m.growths.mf.avgPack,
        멀티포컬성장률_연환산: m.growths.mf.cur,
        MAX성장팩_연환산: m.growths.max.pack,
        MAX평균팩ACC: m.growths.max.avgPack,
        MAX성장률_연환산: m.growths.max.cur,
        인식Gap수: m.gaps.length,
        교육완료율: m.eduRate
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '대상목록');
    XLSX.writeFile(wb, 'ACUVUE_대상목록.xlsx');
  }

  function buildFilters() {
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => {
      const el = $(id);
      if (!el) return;
      const vals = [...new Set(S.master.map(row => clean(row[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
      el.innerHTML = '<option value="">전체</option>' + vals.map(v => `<option>${esc(v)}</option>`).join('');
      el.onchange = () => { S.query = ''; S.targetIds = null; S.gapFilter = null; render(); };
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
    S.gapFilter = null;
    if ($('uploadStatus')) $('uploadStatus').textContent = file.name;
    buildFilters();
    render();
    renderInsightPlaceholder();
    toast(`업로드 완료: 안경사 ${S.master.length}명, 판매행 ${S.sales.length}건`);
  }

  function resetAll() {
    S.query = '';
    S.targetIds = null;
    S.gapFilter = null;
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

  function injectDynamicStyles() {
    if (document.getElementById('dynamic-gap-style')) return;
    const style = document.createElement('style');
    style.id = 'dynamic-gap-style';
    style.textContent = `
      button.gap-card { width: 100%; text-align: left; border: 0; cursor: pointer; font: inherit; }
      button.gap-card.active { outline: 3px solid rgba(0, 102, 204, .28); box-shadow: 0 0 0 5px rgba(0, 102, 204, .08); transform: translateY(-1px); }
      button.gap-card.active small { color: #0057a3; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectDynamicStyles();
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => view(t.dataset.view));
    if ($('workbookInput')) $('workbookInput').onchange = e => e.target.files[0] && upload(e.target.files[0]).catch(err => { console.error(err); alert('업로드 실패\n\n' + (err.message || err)); toast('업로드 실패'); });
    if ($('runQuery')) $('runQuery').onclick = () => { S.query = $('smartQuery')?.value || ''; S.targetIds = null; S.gapFilter = null; render(); if ($('queryExplanation') && !S.query) $('queryExplanation').textContent = `검색 조건 적용: 없음 / 결과 ${S.filtered.length}명`; view('segment'); };
    if ($('smartQuery')) $('smartQuery').onkeydown = e => { if (e.key === 'Enter') $('runQuery').click(); };
    if ($('clearQuery')) $('clearQuery').onclick = resetAll;
    if ($('resetFilters')) $('resetFilters').onclick = resetAll;
    document.querySelectorAll('.examples button').forEach(b => b.onclick = () => { S.query = b.dataset.query; S.targetIds = null; S.gapFilter = null; if ($('smartQuery')) $('smartQuery').value = S.query; render(); view('segment'); });
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
