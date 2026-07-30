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
      label: '난시', title: '난시 성장 (pack)',
      py: ['2025 난시 팩수', '2025난시팩수', '25년 난시 팩수', '25년난시팩수'],
      cy: ['2026 난시 팩수', '2026난시팩수', '26년 난시 팩수', '26년난시팩수'],
      rate: ['난시 성장률', '난시성장률']
    },
    mf: {
      label: '멀티포컬', title: '멀티포컬 성장 (pack)',
      py: ['2025 멀티포컬  팩수', '2025 멀티포컬 팩수', '2025멀티포컬팩수', '25년 멀티포컬  팩수', '25년 멀티포컬 팩수', '25년멀티포컬팩수'],
      cy: ['2026 멀티포컬  팩수', '2026 멀티포컬 팩수', '2026멀티포컬팩수', '26년 멀티포컬  팩수', '26년 멀티포컬 팩수', '26년멀티포컬팩수'],
      rate: ['멀티포컬 성장률', '멀티포컬성장률', 'MF 성장률', 'MF성장률']
    },
    max: {
      label: 'MAX', title: 'MAX 성장 (pack)',
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
  const fmtPackMain = v => {
    if (v == null) return '데이터 없음';
    const rounded = Math.round(Number(v));
    return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString('ko-KR')}`;
  };
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
    return kpi(
      FITTING_COLUMNS[key].title,
      `<span class="growth-kpi-line ${dclass(avgPack)}">
         <span class="growth-pack">${fmtPackMain(avgPack)}</span>
         <span class="growth-vs-py">(${fmtRate(cur)} vs PY)</span>
       </span>`,
      `<span class="growth-vs-avg ${dclass(diff)}">(${fmtPp(diff)} vs avg)</span>`
    );
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

    // 상세 분석 표는 현재 Gap 카드 선택을 즉시 반영하되 화면 이동은 하지 않습니다.
    const detailRows = rowsForGapFilter(rows);
    const detailMetrics = detailRows.map(r => metrics(r.안경사ID));
    renderSegment(detailRows, detailMetrics);
  }

  function getTopGapQuestions(rows, limit = 7) {
    getTopGapQuestions._ids = new Map();
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
      if (!getTopGapQuestions._ids) getTopGapQuestions._ids = new Map();
      if (!getTopGapQuestions._ids.has(q)) getTopGapQuestions._ids.set(q, new Set());
      getTopGapQuestions._ids.get(q).add(p.안경사ID);
    });
    return [...countByQuestion.entries()]
      .map(([q, count]) => ({
        q,
        count,
        avgScore: avg(scoreByQuestion.get(q) || []),
        targetIds: [...(getTopGapQuestions._ids?.get(q) || [])]
      }))
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
      ? top.map((x, i) => `<div class="rank-item">
          <span class="rank-no">${i + 1}</span>
          <b>${esc(x.q)}</b>
          <span>${x.count}명 <button class="button gap-target-button" type="button" data-gap-question="${i}">대상자 보기</button></span>
        </div>`).join('')
      : '<div class="empty-state">선택 대상의 인식 Gap 문항이 없습니다.</div>';

    document.querySelectorAll('[data-gap-question]').forEach(button => {
      button.onclick = () => {
        const item = top[Number(button.dataset.gapQuestion)];
        S.targetIds = new Set(item.targetIds || []);
        S.query = '';
        S.gapFilter = null;
        render();
        if ($('queryExplanation')) $('queryExplanation').textContent = `인식 Gap 문항 대상: ${item.q} / ${item.count}명`;
        view('segment');
      };
    });

    renderLinkedGapEducation(top);
    renderRecommendedEducationTop(top.slice(0, 3));
  }

  function ensureLinkedGapEducationLayout() {
    let section = $('linkedGapEducation');
    if (section) return section;

    section = document.createElement('section');
    section.id = 'linkedGapEducation';
    section.className = 'linked-gap-education-panel';
    section.innerHTML = `
      <div class="linked-panel-heading">
        <div>
          <h3>인식 Gap 문항 · 추천 교육</h3>
          <p>선택한 핵심 Gap 대상의 문항과 필요한 교육을 바로 연결합니다.</p>
        </div>
      </div>
      <div id="linkedGapEducationRows" class="linked-gap-education-rows"></div>
    `;

    const gapCards = $('gapCards');
    const gapSection = gapCards?.closest('section, .panel, .card, .section-card') || gapCards?.parentElement;
    if (gapSection?.parentElement) gapSection.insertAdjacentElement('afterend', section);
    else $('dashboard')?.appendChild(section);

    const questionPanel = $('questionTop')?.closest('section, .panel, .card, .section-card') || $('questionTop')?.parentElement;
    const educationPanel = $('topEducation')?.closest('section, .panel, .card, .section-card') || $('topEducation')?.parentElement;
    if (questionPanel && questionPanel !== section && !questionPanel.contains(gapCards)) questionPanel.classList.add('legacy-gap-panel-hidden');
    if (educationPanel && educationPanel !== section && educationPanel !== questionPanel && !educationPanel.contains(gapCards)) educationPanel.classList.add('legacy-gap-panel-hidden');

    return section;
  }

  function renderLinkedGapEducation(top) {
    ensureLinkedGapEducationLayout();
    const rowsBox = $('linkedGapEducationRows');
    if (!rowsBox) return;

    if (!top.length) {
      rowsBox.innerHTML = '<div class="empty-state">선택 대상의 인식 Gap 문항이 없습니다.</div>';
      return;
    }

    rowsBox.innerHTML = top.slice(0, 7).map((item, index) => {
      const recommendation = findBestEducationForQuestion(item.q);
      return `<div class="linked-gap-row">
        <div class="linked-rank">${index + 1}</div>
        <div class="linked-question">
          <b>${esc(item.q)}</b>
          <small>${item.count}명</small>
        </div>
        <div class="linked-arrow" aria-hidden="true">→</div>
        <div class="linked-education">
          <small>추천 교육</small>
          <b>${esc(recommendation.title)}</b>
          <span>${esc(recommendation.status)}</span>
        </div>
        <button class="button linked-target-button" type="button" data-linked-target="${index}">대상자 보기</button>
      </div>`;
    }).join('');

    rowsBox.querySelectorAll('[data-linked-target]').forEach(button => {
      button.onclick = () => {
        const item = top[Number(button.dataset.linkedTarget)];
        S.targetIds = new Set(item.targetIds || []);
        S.query = '';
        S.gapFilter = null;
        render();
        if ($('queryExplanation')) $('queryExplanation').textContent = `인식 Gap 문항 대상: ${item.q} / ${item.count}명`;
        view('segment');
      };
    });
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
    const targetIds = new Set(rows.map(r => r.안경사ID));
    const targetCount = targetIds.size;
    const all = S.edu.filter(r => targetIds.has(clean(get(r, ['안경사ID', '안경사 ID', 'ID']))));
    const related = all.filter(r => educationRelated(Object.values(r).join(' '), key));
    const base = related.length ? related : all;
    const doneRows = base.filter(eduDone);
    const incompleteRows = base.filter(r => !eduDone(r));
    const donePeople = new Set(doneRows.map(r => clean(get(r, ['안경사ID', '안경사 ID', 'ID']))).filter(Boolean));
    const incompletePeople = new Set(incompleteRows.map(r => clean(get(r, ['안경사ID', '안경사 ID', 'ID']))).filter(Boolean));
    const noRelatedPeople = targetCount ? [...targetIds].filter(id => !donePeople.has(id)).length : 0;
    const titles = [...new Set(doneRows.map(educationTitle).filter(Boolean))].slice(0, 5);
    return {
      all,
      base,
      relatedCount: related.length,
      total: base.length,
      done: doneRows.length,
      incomplete: incompleteRows.length,
      rate: base.length ? doneRows.length / base.length : null,
      titles,
      targetCount,
      donePeopleCount: donePeople.size,
      incompletePeopleCount: incompletePeople.size,
      noRelatedPeopleCount: noRelatedPeople
    };
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

  function insight(type, title, rows, key, symptom, causeList, otherList, edu, recs, priority, severityGroups = []) {
    return { type, title, targetIds: rows.map(r => r.안경사ID), size: rows.length, key, symptom, causeList, otherList, edu, recs, priority, severityGroups };
  }

  function segmentSeverityGroups(masterRows, key, overallGrowth) {
    const dims = [
      { field: 'Tier', label: 'Tier' },
      { field: '채널', label: '채널' },
      { field: '연차', label: '연차' },
      { field: '지역', label: '지역' }
    ];
    const selected = [];

    dims.forEach(dim => {
      const candidates = Object.entries(by(masterRows, dim.field)).map(([value, rows]) => {
        if (!value || rows.length < 3) return null;
        const sales = selectedSalesRows(rows);
        if (!dedupeSalesRows(sales).length) return null;
        const rg = growth(sales, key);
        if (rg == null) return null;
        const diff = overallGrowth != null ? rg - overallGrowth : null;
        const avgPack = avgPackDeltaPerAcc(sales, key);
        const issue = rg < 0 || (diff != null && diff <= -3);
        if (!issue) return null;
        const severity = (rg < 0 ? Math.abs(rg) * 10 : 0) + (diff != null && diff < 0 ? Math.abs(diff) * 8 : 0);
        return { dim: dim.label, value, rows, size: rows.length, growth: rg, diff, avgPack, severity };
      }).filter(Boolean).sort((a, b) => b.severity - a.severity);
      if (candidates.length) selected.push(candidates[0]);
    });

    return selected;
  }

  function rowsForProductIssue(masterRows, key, overallGrowth) {
    const salesRows = selectedSalesRows(masterRows);
    const affectedSales = affectedSalesRowsForProduct(salesRows, key, overallGrowth);
    const people = peopleInSalesAccounts(masterRows, affectedSales);
    return people.length ? people : masterRows;
  }

  function generateInsights() {
    const out = [];
    const baseRows = S.filtered && S.filtered.length ? S.filtered : S.master;
    const allSales = selectedSalesRows(baseRows);
    const overall = {
      ast: growth(allSales, 'ast'),
      mf: growth(allSales, 'mf'),
      max: growth(allSales, 'max')
    };

    ['ast', 'mf', 'max'].forEach(key => {
      const rg = overall[key];
      if (rg == null) return;

      const avgPack = avgPackDeltaPerAcc(allSales, key);
      const severeGroups = segmentSeverityGroups(baseRows, key, rg);
      const overallIssue = rg < 0;
      const segmentIssue = severeGroups.length > 0;
      if (!overallIssue && !segmentIssue) return;

      const affectedPeopleAll = rowsForProductIssue(baseRows, key, rg);
      const targetPeople = educationTargetPeople(affectedPeopleAll, key);
      const insightPeople = targetPeople.length ? targetPeople : affectedPeopleAll;
      if (!insightPeople.length) return;

      const causeList = lowQuestionsForRows(insightPeople, key, 3, true);
      const primary = causeList[0] || null;
      const otherList = otherLowAreas(insightPeople, key);
      const edu = educationSummaryForRows(insightPeople, key);
      const recs = recommendedEducationPlan(insightPeople, key, primary);
      const title = overallIssue
        ? `전체 ${FITTING_COLUMNS[key].label} 성장률 저하`
        : `${FITTING_COLUMNS[key].label} 평균 대비 저하 그룹 발견`;
      const symptom = overallIssue
        ? `${FITTING_COLUMNS[key].label} ${fmtPackPerAcc(avgPack)} (${fmtRate(rg)} vs PY)`
        : `${FITTING_COLUMNS[key].label} 전체는 ${fmtRate(rg)} vs PY이나, 일부 그룹에서 전체 평균 대비 낮은 성장률이 확인됩니다.`;
      const segmentSeverity = severeGroups.reduce((acc, g) => acc + g.severity, 0);
      const priority = priorityScore(rg, 0, causeList) + segmentSeverity;
      out.push(insight('전체 문제 → 공통 인식 원인 → 심화 그룹 확인', title, insightPeople, key, symptom, causeList, otherList, edu, recs, priority, severeGroups));
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

  function eduHtml(edu, targetCount = 0) {
    if (!edu || !targetCount) return '교육 대상자 기준 이수 현황을 확인할 수 없습니다.';
    const doneRate = targetCount ? Math.round((edu.donePeopleCount || 0) / targetCount * 100) : 0;
    const noDone = Math.max(0, targetCount - (edu.donePeopleCount || 0));
    const titleText = edu.titles && edu.titles.length ? edu.titles.map(esc).join(', ') : '확인된 관련 이수 교육 없음';
    return `대상자 ${targetCount}명 중 관련 교육 이수자 ${edu.donePeopleCount || 0}명(${doneRate}%), 관련 교육 미이수 또는 확인 필요 ${noDone}명.<br><small>확인된 관련 이수 교육: ${titleText}</small><br><small>※ 위 수치는 교육 이력 건수가 아니라 대상자 기준 이수 여부입니다.</small>`;
  }

  function recHtml(recs) {
    return recs.map(r => `<div class="recommend-card"><b>${r.step}: ${esc(r.title)}</b><br><small>${esc(r.reason)}</small></div>`).join('');
  }

  function followUpHtml(item) {
    const product = FITTING_COLUMNS[item.key]?.label || '해당 제품군';
    const topQuestion = item.causeList && item.causeList.length ? item.causeList[0].q : `${product} 관련 인식 TOP 문항`;
    const recTitles = (item.recs || []).map(r => r.title).filter(Boolean).slice(0, 2).join(', ') || '추천 교육';
    return `<b>교육 이후 Follow-up 추적</b><br>
      <small>1) 교육 이수 확인: ${esc(recTitles)} 완료 여부</small><br>
      <small>2) 인식 변화 확인: ${esc(topQuestion)} 문항 재측정</small><br>
      <small>3) 판매 변화 확인: ${esc(product)} 연환산 성장률과 팩 / ACC 재확인</small><br>
      <small>4) 판정: 인식 개선 + 판매 회복 시 완료, 미개선 시 추가 코칭/교육 필요</small>`;
  }

  function segmentHtml(item) {
    if (!item.severityGroups || !item.severityGroups.length) {
      return '특히 더 심한 세부 그룹은 확인되지 않았습니다.';
    }
    return item.severityGroups.map(g => {
      const diffText = g.diff != null ? ` / ${fmtPp(g.diff)} vs 전체` : '';
      return `<b>${esc(g.dim)}: ${esc(g.value)}</b><br><small>${fmtRate(g.growth)} vs PY${diffText} · 대상 ${g.size}명</small>`;
    }).join('<hr>');
  }

  function renderInsights() {
    S.insights = generateInsights();
    if ($('insightSummary')) {
      $('insightSummary').innerHTML = '';
      $('insightSummary').style.display = 'none';
    }
    if (!$('insightCards')) return;
    $('insightCards').innerHTML = S.insights.length ? S.insights.map((item, idx) => `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${idx + 1}. ${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 특히 증상이 심한 그룹</small>${segmentHtml(item)}</div><div class="insight-step"><small>4. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>5. 관련 교육 이수 현황</small>${eduHtml(item.edu, item.size)}</div><div class="insight-step rec"><small>6. 추천 교육 2개</small>${recHtml(item.recs)}</div><div class="insight-step"><small>7. 교육 후 Follow-up</small>${followUpHtml(item)}</div></div><div class="note">교육 대상 ${item.size}명</div><div class="insight-actions"><button class="button primary" data-insight="${idx}">대상 보기</button><button class="button" data-detail="${idx}">상세 보기</button></div></div>`).join('') : '<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>';
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
    $('insightDetail').innerHTML = `<div class="insight-card"><div class="type">${esc(item.type)}</div><h3>${esc(item.title)}</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(item.symptom)}</div><div class="insight-step"><small>2. ${esc(INSIGHT[item.key].focus)} 원인 후보</small>${causeHtml(item.causeList, item.key)}</div><div class="insight-step"><small>3. 특히 증상이 심한 그룹</small>${segmentHtml(item)}</div><div class="insight-step"><small>4. 참고 저하 영역</small>${otherHtml(item.otherList)}</div><div class="insight-step"><small>5. 관련 교육 이수 현황</small>${eduHtml(item.edu, item.size)}</div><div class="insight-step rec"><small>6. 추천 교육 2개</small>${recHtml(item.recs)}</div><div class="insight-step"><small>7. 교육 후 Follow-up</small>${followUpHtml(item)}</div></div><div class="note">교육 대상 ${item.size}명</div></div>`;
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


  function completedEducationForPerson(id, productKey = null) {
    const rows = S.eduById.get(id) || [];
    const doneRows = rows.filter(eduDone);
    const relatedRows = productKey
      ? doneRows.filter(r => educationRelated(Object.values(r).join(' '), productKey))
      : doneRows;
    return relatedRows.map(educationTitle).filter(Boolean);
  }

  function currentDownloadProductKey() {
    if (S.gapFilter && S.gapFilter.type === 'sales') return S.gapFilter.key;
    return null;
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
      const productKey = currentDownloadProductKey();
      const completedRelated = completedEducationForPerson(p.안경사ID, productKey);
      const completedAll = completedEducationForPerson(p.안경사ID, null);
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
        이상인식문항1: gaps[0]?.문항 || '',
        이상인식문항1_점수: gaps[0]?.점수 ?? '',
        이상인식문항1_목표: gaps[0]?.목표값 ?? '',
        이상인식문항2: gaps[1]?.문항 || '',
        이상인식문항2_점수: gaps[1]?.점수 ?? '',
        이상인식문항2_목표: gaps[1]?.목표값 ?? '',
        이상인식문항3: gaps[2]?.문항 || '',
        이상인식문항3_점수: gaps[2]?.점수 ?? '',
        이상인식문항3_목표: gaps[2]?.목표값 ?? '',
        필요교육: recs.map(r => r.title).join(' | '),
        필요교육1: recs[0]?.title || '',
        필요교육1_상태: recs[0]?.status || '',
        필요교육2: recs[1]?.title || '',
        필요교육2_상태: recs[1]?.status || '',
        필요교육3: recs[2]?.title || '',
        필요교육3_상태: recs[2]?.status || '',
        교육상태: recs.map(r => r.status).join(' | '),
        관련이수교육: completedRelated.join(' | '),
        전체이수교육: completedAll.join(' | '),
        관련이수교육수: completedRelated.length,
        전체이수교육수: completedAll.length,
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

  function resetSmartSearch() {
    S.query = '';
    S.targetIds = null;
    S.gapFilter = null;
    if ($('smartQuery')) $('smartQuery').value = '';
    render();
    if ($('queryExplanation')) $('queryExplanation').textContent = '스마트 검색이 초기화되었습니다. 상세 조건은 유지됩니다.';
  }

  function resetDetailFilters() {
    S.targetIds = null;
    S.gapFilter = null;
    ['regionFilter', 'yearsFilter', 'tierFilter', 'channelFilter', 'repFilter'].forEach(id => { if ($(id)) $(id).value = ''; });
    render();
    if ($('queryExplanation')) $('queryExplanation').textContent = S.query ? `상세 조건이 초기화되었습니다. 스마트 검색 "${S.query}"은 유지됩니다.` : '상세 조건이 초기화되었습니다.';
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
      .detail-analysis-tab { opacity: .55; }
      .detail-analysis-tab.active, .detail-analysis-tab:hover { opacity: 1; }
      .gap-target-button { margin-left: 8px; padding: 4px 9px; font-size: 12px; line-height: 1.2; }
      .growth-kpi-line { display: flex; align-items: baseline; gap: 0; flex-wrap: nowrap; white-space: nowrap; margin-top: 7px; width: 100%; }
      .growth-pack { font-size: 36px; line-height: 1; font-weight: 900; letter-spacing: -1px; white-space: nowrap; }
      .growth-unit { margin-left: 0; font-size: 13px; line-height: 1; font-weight: 700; color: #667085; white-space: nowrap; }
      .growth-vs-py { margin-left: 10px; font-size: 13px; line-height: 1.2; font-weight: 700; color: #475467; white-space: nowrap; }
      .growth-vs-avg { display: block; margin-top: 5px; font-size: 12px; line-height: 1.2; font-weight: 650; color: #667085; }
      /* KPI 성장 숫자 강조: 100팩/ACC를 한 덩어리로 표시 */
      .kpi-card .growth-kpi-line {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: baseline !important;
        gap: 0 !important;
        white-space: nowrap !important;
      }
      .kpi-card .growth-pack {
        display: inline-block !important;
        font-size: 40px !important;
        line-height: 1 !important;
        font-weight: 950 !important;
        letter-spacing: -1.5px !important;
        white-space: nowrap !important;
      }
      .kpi-card .growth-unit {
        display: inline-block !important;
        margin: 0 !important;
        font-size: 16px !important;
        line-height: 1 !important;
        font-weight: 800 !important;
        white-space: nowrap !important;
      }
      .kpi-card .growth-vs-py {
        margin-left: 12px !important;
        font-size: 13px !important;
        white-space: nowrap !important;
      }

      /* 핵심 Gap 카드 한 줄 */
      #gapCards {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 14px !important;
        width: 100% !important;
      }
      #gapCards .gap-card { min-width: 0 !important; }

      /* 문항과 추천 교육 직접 연결 */
      .legacy-gap-panel-hidden { display: none !important; }
      .linked-gap-education-panel {
        background: #fff;
        border: 1px solid #d8e1ee;
        border-radius: 18px;
        padding: 22px;
        margin-top: 18px;
        box-shadow: 0 10px 26px rgba(21, 42, 74, .05);
      }
      .linked-panel-heading h3 { margin: 0 0 4px; font-size: 21px; }
      .linked-panel-heading p { margin: 0 0 15px; color: #667085; }
      .linked-gap-education-rows { display: grid; gap: 0; }
      .linked-gap-row {
        display: grid;
        grid-template-columns: 34px minmax(300px, 1.45fr) 30px minmax(260px, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-height: 78px;
        padding: 13px 4px;
        border-bottom: 1px solid #e5eaf1;
      }
      .linked-gap-row:last-child { border-bottom: 0; }
      .linked-rank {
        width: 28px; height: 28px; border-radius: 50%;
        display: grid; place-items: center;
        background: #e7f4ff; color: #1265a8; font-weight: 900;
      }
      .linked-question b { display: block; font-size: 15px; line-height: 1.45; }
      .linked-question small { display: block; margin-top: 5px; color: #475467; font-weight: 800; }
      .linked-arrow { color: #00a3a3; font-size: 23px; font-weight: 900; text-align: center; }
      .linked-education {
        background: #f5f8fc; border-radius: 12px; padding: 11px 13px;
      }
      .linked-education small { display: block; color: #667085; margin-bottom: 3px; }
      .linked-education b { display: block; font-size: 15px; }
      .linked-education span { display: block; margin-top: 4px; color: #667085; font-size: 12px; }
      .linked-target-button { white-space: nowrap; padding: 8px 12px; }

      @media (max-width: 1200px) {
        .kpi-card .growth-pack { font-size: 34px !important; }
        #gapCards { grid-template-columns: repeat(5, minmax(150px, 1fr)) !important; overflow-x: auto; }
        .linked-gap-row { grid-template-columns: 30px minmax(230px, 1fr) 24px minmax(210px, .9fr) auto; }
      }
      @media (max-width: 800px) {
        .linked-gap-row { grid-template-columns: 30px 1fr auto; }
        .linked-arrow { display: none; }
        .linked-education { grid-column: 2 / 4; }
        .linked-target-button { grid-column: 2 / 4; justify-self: start; }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectDynamicStyles();
    const dashboardTab = document.querySelector('.tab[data-view="dashboard"]');
    const insightTab = document.querySelector('.tab[data-view="insight"]');
    const detailTab = document.querySelector('.tab[data-view="segment"]');
    if (dashboardTab) dashboardTab.textContent = '통합 대시보드';
    if (insightTab) insightTab.textContent = '교육 인사이트';
    if (detailTab) {
      detailTab.textContent = '안경사 상세 분석';
      detailTab.classList.add('detail-analysis-tab');
    }
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => view(t.dataset.view));
    if ($('workbookInput')) $('workbookInput').onchange = e => e.target.files[0] && upload(e.target.files[0]).catch(err => { console.error(err); alert('업로드 실패\n\n' + (err.message || err)); toast('업로드 실패'); });
    if ($('runQuery')) $('runQuery').onclick = () => { S.query = $('smartQuery')?.value || ''; S.targetIds = null; S.gapFilter = null; render(); if ($('queryExplanation') && !S.query) $('queryExplanation').textContent = `검색 조건 적용: 없음 / 결과 ${S.filtered.length}명`; view('segment'); };
    if ($('smartQuery')) $('smartQuery').onkeydown = e => { if (e.key === 'Enter') $('runQuery').click(); };
    if ($('clearQuery')) $('clearQuery').onclick = resetSmartSearch;
    if ($('resetFilters')) $('resetFilters').onclick = resetDetailFilters;
    document.querySelectorAll('.examples button').forEach(b => b.onclick = () => {
      // HTML에서 버튼명을 바꾸면 화면에 보이는 버튼 문구가 그대로 검색창에 입력됩니다.
      S.query = clean(b.textContent) || clean(b.dataset.query);
      S.targetIds = null;
      S.gapFilter = null;
      if ($('smartQuery')) $('smartQuery').value = S.query;
      render();
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
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const clean = v => v == null ? '' : String(v).trim();
  const norm = v => clean(v).replace(/\u00a0/g, '').replace(/[\s_\-()./]/g, '').toLowerCase();
  const esc = v => clean(v).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
  const n = v => { const m=clean(v).replace(/,/g,'').replace(/%/g,'').match(/[-+]?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
  const avg = a => { const v=a.map(n).filter(Number.isFinite); return v.length ? v.reduce((x,y)=>x+y,0)/v.length : null; };
  const sum = a => { const v=a.map(n).filter(Number.isFinite); return v.length ? v.reduce((x,y)=>x+y,0) : null; };
  const annualize = v => v == null ? null : v / (new Date().getMonth()+1) * 12;

  const PRODUCTS = {
    mf:{label:'멀티포컬', keys:['멀티포컬','다초점','노안','mf','적응','상담'], py:['2025 멀티포컬  팩수','2025 멀티포컬 팩수','2025멀티포컬팩수','25년 멀티포컬 팩수'], cy:['2026 멀티포컬  팩수','2026 멀티포컬 팩수','2026멀티포컬팩수','26년 멀티포컬 팩수'], edu:['멀티포컬 적응 관리 교육','멀티포컬 상담 기본 과정']},
    ast:{label:'난시', keys:['난시','토릭','asd','프리즘','축','원주','구면'], py:['2025 난시 팩수','2025난시팩수','25년 난시 팩수'], cy:['2026 난시 팩수','2026난시팩수','26년 난시 팩수'], edu:['난시 프리즘 및 디자인 관련 교육','난시 피팅 및 상담 실전 교육']},
    max:{label:'MAX', keys:['max','맥스','블루라이트','눈건강','자외선','실리콘','오아시스'], py:['2025 MAX  팩수','2025 MAX 팩수','2025MAX팩수','25년 MAX 팩수'], cy:['2026 MAX  팩수','2026 MAX 팩수','2026MAX팩수','26년 MAX 팩수'], edu:['블루라이트·눈건강 가치 전달 교육','ACUVUE OASYS MAX 상담 교육']}
  };
  const MENUS=[
    ['mf','reverse','멀티포컬 전년 대비 역성장'],['mf','under','멀티포컬 판매 평균 대비 낮음'],
    ['ast','reverse','난시 전년 대비 역성장'],['ast','under','난시 판매 평균 대비 낮음'],
    ['max','reverse','MAX 전년 대비 역성장'],['max','under','MAX 판매 평균 대비 낮음']
  ];

  function get(row,names){ const m={}; Object.keys(row||{}).forEach(k=>m[norm(k)]=row[k]); for(const x of names){const v=m[norm(x)]; if(v!==undefined&&clean(v)!=='')return v;} return ''; }
  function storeKey(r){ return norm(get(r,['안경원코드','매장코드','거래처코드','ShipTo','SoldTo','Outletnumber','Outlet Number','매장ID','CustomerID'])||get(r,['안경원명','안경원','매장명','거래처명'])||r?.안경원코드||r?.안경원명); }
  function uniqueSales(rows){const m=new Map(); rows.forEach((r,i)=>{const k=storeKey(r)||`r${i}`; if(!m.has(k))m.set(k,r);}); return [...m.values()];}
  function salesForPeople(people){const S=window.S||{}, out=[]; people.forEach(p=>{const d=S.salesById?.get(p.안경사ID)||[]; if(d.length)out.push(...d); else out.push(...(S.salesByStore?.get(storeKey(p))||[]));}); return uniqueSales(out);}
  function growth(rows,key){const p=PRODUCTS[key], py=sum(rows.map(r=>get(r,p.py))), cy=annualize(sum(rows.map(r=>get(r,p.cy)))); if(py==null&&cy==null)return null; if(!py&&cy)return 100; return py?(cy-py)/py*100:null;}
  function productPerception(p,key){const text=`${p.문항||''} ${p.문항ID||''} ${p.제품군||''}`.toLowerCase(); return p.제품군===key||PRODUCTS[key].keys.some(k=>text.includes(k));}
  function peopleForSales(master,sales){const stores=new Set(sales.map(storeKey).filter(Boolean)); return master.filter(p=>stores.has(storeKey(p)));}
  function topPerceptions(people,key){const ids=new Set(people.map(p=>p.안경사ID)), main=new Map(), other=new Map(); (window.S?.per||[]).forEach(p=>{if(!ids.has(p.안경사ID)||!p.gap)return; const map=productPerception(p,key)?main:other; if(!map.has(p.문항))map.set(p.문항,[]); map.get(p.문항).push(p.점수);}); const make=map=>[...map].map(([q,a])=>({q,score:avg(a),count:a.length})).sort((a,b)=>b.count-a.count||(a.score??99)-(b.score??99)); return {main:make(main).slice(0,2),other:make(other).slice(0,1)};}
  function focusGroup(people,question){if(!question)return ''; const dims=[['Tier','Tier'],['채널','채널'],['연차','연차'],['지역','지역']], candidates=[]; for(let i=0;i<dims.length;i++)for(let j=i+1;j<dims.length;j++){const [a]=dims[i],[b]=dims[j], groups=new Map(); people.forEach(p=>{if(!clean(p[a])||!clean(p[b]))return;const k=`${p[a]} · ${p[b]}`;(groups.get(k)||groups.set(k,[]).get(k)).push(p);}); groups.forEach((members,label)=>{if(members.length<2)return;const ids=new Set(members.map(x=>x.안경사ID));const sc=avg((window.S?.per||[]).filter(x=>ids.has(x.안경사ID)&&x.문항===question.q).map(x=>x.점수));if(sc!=null)candidates.push({label,score:sc});});} candidates.sort((a,b)=>a.score-b.score); return candidates[0]?`${candidates[0].label} · ${question.q} ${candidates[0].score.toFixed(1)}점`:'';}
  function build(menu){const [key,mode,title]=menu,S=window.S||{},master=(S.filtered&&S.filtered.length?S.filtered:S.master)||[], all=salesForPeople(master), overall=growth(all,key); if(overall==null)return null; const targetSales=all.filter(r=>{const g=growth([r],key);return g!=null&&(mode==='reverse'?g<0:g<overall-3);}); if(!targetSales.length)return null; const people=peopleForSales(master,targetSales), per=topPerceptions(people,key), focus=focusGroup(people,per.main[0]); return {key,title,people,per,focus,edu:PRODUCTS[key].edu};}
  function card(item,i){const main=item.per.main.length?item.per.main.map((x,j)=>`<div class="insight-result-main"><b>${j+1}. ${esc(x.q)}</b><span>${x.score==null?'-':x.score.toFixed(1)+'점'}</span></div>`).join(''):'<span>관련 제품 인식 Gap 없음</span>'; const other=item.per.other.length?`<div class="insight-result-other">참고: ${esc(item.per.other[0].q)} ${item.per.other[0].score?.toFixed(1)??'-'}점</div>`:''; return `<article class="insight-card restored-insight-card" data-card="${i}"><div class="type">인사이트 메뉴</div><h3>${esc(item.title)}</h3><div class="restored-grid"><section><small>대상</small><strong>${item.people.length.toLocaleString('ko-KR')}명</strong></section><section><small>인식 조사 분석 결과</small>${main}${other}</section><section><small>집중 포커스 그룹</small><div>${item.focus?esc(item.focus):'두드러지는 그룹 없음'}</div></section><section><small>추천 교육</small><div class="edu-line"><b>1.</b> ${esc(item.edu[0])}</div><div class="edu-line"><b>2.</b> ${esc(item.edu[1])}</div></section></div><div class="insight-actions"><button class="button primary" data-view-target="${i}" type="button">대상 안경사 보기</button></div></article>`;}
  function showDetail(item){const S=window.S||{};S.targetIds=new Set(item.people.map(p=>p.안경사ID));S.query='';S.gapFilter=null;if(typeof window.render==='function')window.render();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));$('segment')?.classList.add('active');document.querySelector('.tab[data-view="segment"]')?.classList.add('active');$('segment')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function renderRestored(){const items=MENUS.map(build).filter(Boolean).slice(0,5),box=$('insightCards'); if(!box)return;box.innerHTML=items.length?items.map(card).join(''):'<div class="empty-state">조건에 맞는 자동 인사이트가 없습니다.</div>'; box.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=e=>{e.stopPropagation();showDetail(items[+b.dataset.viewTarget]);}); box.querySelectorAll('[data-card]').forEach(c=>c.onclick=()=>showDetail(items[+c.dataset.card]));}
  function styles(){if($('restored-insight-style'))return;const s=document.createElement('style');s.id='restored-insight-style';s.textContent=`.restored-insight-card{cursor:pointer}.restored-grid{display:grid;grid-template-columns:.8fr 1.65fr 1.15fr 1.15fr;gap:12px;margin-top:14px}.restored-grid>section{background:#f4f7fb;border-radius:14px;padding:18px;min-height:155px}.restored-grid small{display:block;color:#667085;font-weight:800;margin-bottom:10px}.restored-grid strong{font-size:22px}.insight-result-main{display:flex;justify-content:space-between;gap:8px;font-weight:800;margin:8px 0}.insight-result-other{font-size:13px;color:#667085;font-weight:400;margin-top:12px}.edu-line{font-weight:700;margin:8px 0}.tab[data-view="segment"]{opacity:.55}.tab[data-view="segment"].active,.tab[data-view="segment"]:hover{opacity:1}@media(max-width:1050px){.restored-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.restored-grid{grid-template-columns:1fr}}`;document.head.appendChild(s);}
  document.addEventListener('DOMContentLoaded',()=>{styles();const t=document.querySelector('.tab[data-view="segment"]');if(t)t.textContent='안경사 상세 분석';const b=$('refreshInsights');if(b)b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();renderRestored();},true);});
})();


(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function placeDashboardSections() {
    const dashboard = $('dashboard');
    const kpiGrid = $('kpiGrid');
    const gapCards = $('gapCards');
    const linked = $('linkedGapEducation');
    if (!dashboard || !kpiGrid || !gapCards) return;

    const gapPanel = gapCards.closest('section, .panel, .card, .section-card') || gapCards.parentElement;
    const kpiPanel = kpiGrid.closest('section, .panel, .card, .section-card') || kpiGrid;

    if (gapPanel) {
      gapPanel.classList.add('full-width-gap-panel');
      if (kpiPanel.nextElementSibling !== gapPanel) kpiPanel.insertAdjacentElement('afterend', gapPanel);
    }
    if (linked && gapPanel && gapPanel.nextElementSibling !== linked) {
      gapPanel.insertAdjacentElement('afterend', linked);
    }

    const q = $('questionTop');
    const e = $('topEducation');
    [q, e].forEach(node => {
      const panel = node && (node.closest('section, .panel, .card, .section-card') || node.parentElement);
      if (panel && panel !== gapPanel && panel !== linked) panel.classList.add('legacy-gap-panel-hidden');
    });
  }

  function fixKpiUnits() {
    document.querySelectorAll('.growth-unit').forEach(el => { el.textContent = '/ACC'; });
  }

  function installStyles() {
    if ($('dashboard-final-visual-fix')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-final-visual-fix';
    style.textContent = `
      /* KPI: 숫자와 /ACC 한 줄, 비교 수치는 아래 줄 */
      .kpi-card strong { overflow: visible !important; }
      .kpi-card .growth-kpi-line {
        display: grid !important;
        grid-template-columns: max-content max-content !important;
        align-items: baseline !important;
        justify-content: start !important;
        column-gap: 0 !important;
        row-gap: 5px !important;
        width: 100% !important;
        white-space: nowrap !important;
      }
      .kpi-card .growth-pack {
        grid-column: 1 !important;
        font-size: 38px !important;
        line-height: .95 !important;
        font-weight: 950 !important;
        letter-spacing: -1.6px !important;
      }
      .kpi-card .growth-unit {
        grid-column: 2 !important;
        margin: 0 !important;
        font-size: 15px !important;
        line-height: 1 !important;
        font-weight: 800 !important;
        color: #475467 !important;
      }
      .kpi-card .growth-vs-py {
        grid-column: 1 / 3 !important;
        display: block !important;
        margin: 0 !important;
        font-size: 13px !important;
        line-height: 1.2 !important;
        font-weight: 700 !important;
        color: #475467 !important;
      }
      .kpi-card .growth-vs-avg {
        display: block !important;
        margin-top: 5px !important;
        font-size: 12px !important;
      }

      /* 핵심 Gap 전체 폭 한 줄 */
      .full-width-gap-panel {
        width: 100% !important;
        max-width: none !important;
        grid-column: 1 / -1 !important;
      }
      #gapCards {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 14px !important;
        width: 100% !important;
      }
      #gapCards .gap-card { min-width: 0 !important; min-height: 122px !important; }

      /* 문항 → 교육 → 대상자 보기 */
      #linkedGapEducation {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        grid-column: 1 / -1 !important;
      }
      .legacy-gap-panel-hidden { display: none !important; }
      .linked-gap-row {
        grid-template-columns: 34px minmax(360px, 1.45fr) 30px minmax(280px, 1fr) auto !important;
      }

      @media (max-width: 1280px) {
        .kpi-card .growth-pack { font-size: 32px !important; }
        #gapCards { grid-template-columns: repeat(5, minmax(170px, 1fr)) !important; overflow-x: auto !important; }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installStyles();
    fixKpiUnits();
    placeDashboardSections();
    const observer = new MutationObserver(() => {
      fixKpiUnits();
      placeDashboardSections();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();


(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pack-title-number-only-style')) return;
    const style = document.createElement('style');
    style.id = 'pack-title-number-only-style';
    style.textContent = `
      .kpi-card .growth-kpi-line {
        grid-template-columns: max-content !important;
      }
      .kpi-card .growth-pack {
        grid-column: 1 !important;
      }
      .kpi-card .growth-vs-py {
        grid-column: 1 !important;
      }
      .kpi-card .growth-unit {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function normalizeEmptyGrowthCards() {
    document.querySelectorAll('.growth-pack').forEach(el => {
      const empty = el.textContent.trim() === '데이터 없음';
      el.classList.toggle('growth-no-data', empty);
      if (empty) el.textContent = '-';
    });
  }

  function enforceDashboardAnalysisStack() {
    const dashboard = $('dashboard');
    const kpiGrid = $('kpiGrid');
    const gapCards = $('gapCards');
    if (!dashboard || !kpiGrid || !gapCards) return;

    let stack = $('dashboardAnalysisStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'dashboardAnalysisStack';
      stack.className = 'dashboard-analysis-stack';
      const kpiContainer = kpiGrid.closest('section, .panel, .card, .section-card') || kpiGrid;
      kpiContainer.insertAdjacentElement('afterend', stack);
    }

    const gapPanel = gapCards.closest('section, .panel, .card, .section-card') || gapCards.parentElement;
    if (gapPanel && gapPanel.parentElement !== stack) stack.appendChild(gapPanel);

    const linked = $('linkedGapEducation');
    if (linked && linked.parentElement !== stack) stack.appendChild(linked);
  }

  function installFinalDashboardStyles() {
    if ($('dashboard-empty-layout-fix')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-empty-layout-fix';
    style.textContent = `
      .growth-pack.growth-no-data {
        font-size: 34px !important;
        font-weight: 800 !important;
        letter-spacing: 0 !important;
      }
      .dashboard-analysis-stack {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 18px !important;
        width: 100% !important;
        margin-top: 18px !important;
      }
      .dashboard-analysis-stack > * {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }
      .dashboard-analysis-stack #gapCards {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 14px !important;
        width: 100% !important;
      }
      .dashboard-analysis-stack #linkedGapEducation {
        display: block !important;
        width: 100% !important;
      }
      @media (max-width: 1100px) {
        .dashboard-analysis-stack #gapCards {
          grid-template-columns: repeat(5, minmax(165px, 1fr)) !important;
          overflow-x: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installFinalDashboardStyles();
    normalizeEmptyGrowthCards();
    enforceDashboardAnalysisStack();
    const observer = new MutationObserver(() => {
      normalizeEmptyGrowthCards();
      enforceDashboardAnalysisStack();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function directChildOfDashboard(node, dashboard) {
    let current = node;
    while (current && current.parentElement && current.parentElement !== dashboard) {
      current = current.parentElement;
    }
    return current;
  }

  function alignKpiTypography() {
    document.querySelectorAll('.kpi-card .growth-pack').forEach(value => {
      value.style.setProperty('font-size', 'inherit', 'important');
      value.style.setProperty('font-weight', 'inherit', 'important');
      value.style.setProperty('line-height', 'inherit', 'important');
      value.style.setProperty('letter-spacing', 'inherit', 'important');
      value.style.setProperty('color', 'inherit', 'important');
    });
  }

  function expandGapSection() {
    const dashboard = $('dashboard');
    const kpiGrid = $('kpiGrid');
    const gapCards = $('gapCards');
    if (!dashboard || !kpiGrid || !gapCards) return;

    let stack = $('dashboardAnalysisStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'dashboardAnalysisStack';
      stack.className = 'dashboard-analysis-stack';
    }

    const kpiTopLevel = directChildOfDashboard(kpiGrid, dashboard);
    if (stack.parentElement !== dashboard) {
      if (kpiTopLevel) kpiTopLevel.insertAdjacentElement('afterend', stack);
      else dashboard.appendChild(stack);
    } else if (kpiTopLevel && kpiTopLevel.nextElementSibling !== stack) {
      kpiTopLevel.insertAdjacentElement('afterend', stack);
    }

    const gapPanel = gapCards.closest('section, .panel, .card, .section-card') || gapCards.parentElement;
    if (gapPanel && gapPanel.parentElement !== stack) stack.appendChild(gapPanel);

    const linked = $('linkedGapEducation');
    if (linked && linked.parentElement !== stack) stack.appendChild(linked);
  }

  function installTypographyAndWidthFix() {
    if ($('kpi-gap-width-final-style')) return;
    const style = document.createElement('style');
    style.id = 'kpi-gap-width-final-style';
    style.textContent = `
      /* 성장 KPI는 왼쪽 KPI 숫자와 동일한 크기, 굵기, 색상 */
      .kpi-card .growth-kpi-line {
        display: block !important;
        width: 100% !important;
      }
      .kpi-card .growth-pack {
        display: block !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        letter-spacing: inherit !important;
        color: inherit !important;
      }
      .kpi-card .growth-vs-py,
      .kpi-card .growth-vs-avg {
        display: block !important;
        margin: 5px 0 0 !important;
        font-size: 12px !important;
        line-height: 1.25 !important;
        font-weight: 650 !important;
      }

      /* 핵심 Gap 영역을 대시보드 전체 가로 폭으로 확장 */
      #dashboardAnalysisStack.dashboard-analysis-stack {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        grid-column: 1 / -1 !important;
        align-self: stretch !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        gap: 18px !important;
        margin: 18px 0 0 !important;
      }
      #dashboardAnalysisStack > * {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
      #dashboardAnalysisStack #gapCards {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        width: 100% !important;
        max-width: none !important;
        gap: 14px !important;
      }
      #dashboardAnalysisStack #gapCards .gap-card {
        width: 100% !important;
        min-width: 0 !important;
      }

      @media (max-width: 1080px) {
        #dashboardAnalysisStack #gapCards {
          grid-template-columns: repeat(5, minmax(160px, 1fr)) !important;
          overflow-x: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installTypographyAndWidthFix();
    alignKpiTypography();
    expandGapSection();

    const observer = new MutationObserver(() => {
      alignKpiTypography();
      expandGapSection();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function lowestCommonAncestor(a, b) {
    if (!a || !b) return null;
    const ancestors = new Set();
    let node = a;
    while (node) {
      ancestors.add(node);
      node = node.parentElement;
    }
    node = b;
    while (node) {
      if (ancestors.has(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function directChildUnder(node, ancestor) {
    let current = node;
    while (current && current.parentElement && current.parentElement !== ancestor) {
      current = current.parentElement;
    }
    return current;
  }

  function forceFullWidthDashboardOrder() {
    const kpiGrid = $('kpiGrid');
    const gapCards = $('gapCards');
    if (!kpiGrid || !gapCards) return;

    const gapPanel = gapCards.closest('section, .panel, .card, .section-card') || gapCards.parentElement;
    if (!gapPanel) return;

    const common = lowestCommonAncestor(kpiGrid, gapPanel);
    if (!common) return;

    const kpiBlock = directChildUnder(kpiGrid, common);
    if (!kpiBlock) return;

    let fullWidthRow = $('fullWidthGapRow');
    if (!fullWidthRow) {
      fullWidthRow = document.createElement('div');
      fullWidthRow.id = 'fullWidthGapRow';
      fullWidthRow.className = 'full-width-gap-row';
    }

    if (fullWidthRow.parentElement !== common || kpiBlock.nextElementSibling !== fullWidthRow) {
      kpiBlock.insertAdjacentElement('afterend', fullWidthRow);
    }
    if (gapPanel.parentElement !== fullWidthRow) fullWidthRow.appendChild(gapPanel);

    const linked = $('linkedGapEducation');
    if (linked && linked.parentElement !== fullWidthRow) fullWidthRow.appendChild(linked);

    common.classList.add('dashboard-common-layout');
    gapPanel.classList.add('gap-panel-forced-wide');
  }

  function normalizeGrowthKpi() {
    document.querySelectorAll('.growth-pack').forEach(el => {
      if (el.textContent.trim() === '데이터 없음') el.textContent = '-';
    });
  }

  function installForceStyles() {
    if ($('force-gap-one-line-style')) return;
    const style = document.createElement('style');
    style.id = 'force-gap-one-line-style';
    style.textContent = `
      /* 성장 KPI를 좌측 KPI 숫자와 동일한 시각 규칙으로 통일 */
      .kpi-card .growth-kpi-line {
        display: block !important;
        width: 100% !important;
      }
      .kpi-card .growth-pack {
        display: block !important;
        color: #0b2345 !important;
        font-size: 28px !important;
        font-weight: 800 !important;
        line-height: 1.12 !important;
        letter-spacing: -0.6px !important;
      }
      .kpi-card .growth-vs-py,
      .kpi-card .growth-vs-avg {
        display: block !important;
        margin: 5px 0 0 !important;
        color: #47627f !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.25 !important;
      }

      /* KPI 다음에 핵심 Gap과 연결 교육을 하나의 전체 폭 행으로 강제 배치 */
      .full-width-gap-row {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        grid-column: 1 / -1 !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        gap: 10px !important;
        margin: 16px 0 0 !important;
        padding: 0 !important;
      }
      .full-width-gap-row > * {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        margin: 0 !important;
      }
      .gap-panel-forced-wide {
        width: 100% !important;
        max-width: none !important;
      }
      .gap-panel-forced-wide #gapCards,
      .full-width-gap-row #gapCards {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 14px !important;
        width: 100% !important;
        max-width: none !important;
      }
      .full-width-gap-row #gapCards .gap-card {
        width: 100% !important;
        min-width: 0 !important;
      }

      /* 핵심 Gap과 문항/교육 패널 사이 간격 축소 */
      .full-width-gap-row #linkedGapEducation {
        margin-top: 0 !important;
        padding-top: 18px !important;
      }

      @media (max-width: 1100px) {
        .full-width-gap-row #gapCards {
          grid-template-columns: repeat(5, minmax(165px, 1fr)) !important;
          overflow-x: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installForceStyles();
    normalizeGrowthKpi();
    forceFullWidthDashboardOrder();

    const observer = new MutationObserver(() => {
      normalizeGrowthKpi();
      forceFullWidthDashboardOrder();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
