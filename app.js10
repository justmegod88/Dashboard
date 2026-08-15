(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const clean = v => (v == null ? '' : String(v).trim());
  const norm = v => clean(v).replace(/\u00a0/g, '').replace(/[\s_\-()./]/g, '').toLowerCase();
  const keyVal = v => norm(v).replace(/[^a-z0-9가-힣]/g, '');
  const esc = v => clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

  const S = {
    master: [], content: [], edu: [], qm: [], per: [], per25: [], per26: [], sales: [], rec: [],
    filtered: [], query: '', targetIds: null, gapFilter: null, insights: [], insightsReady: false,
    baseMonth: Math.max(1, Math.min(12, new Date().getMonth() + 1)),
    baseMonthSource: '현재 월 기본값',
    masterById: new Map(), salesById: new Map(), salesByStore: new Map(),
    eduById: new Map(), perById: new Map(), per25ById: new Map(), recById: new Map(), metricCache: new Map()
  };
  window.S = S;

  const aliases = {
    master: ['01_안경사마스터', '안경사마스터'],
    content: ['02_교육콘텐츠', '교육콘텐츠마스터'],
    edu: ['03_교육참여', '교육참여이력', '교육이력'],
    qm: ['인식문항마스터', '문항마스터'],
    per25: ['04_인식조사_2025', '04_2025인식조사', '2025인식조사', '2025 인식조사', '25년인식조사', '25년 인식조사', '인식조사2025', '인식조사_2025'],
    per26: ['04_인식조사_2026', '04_2026인식조사', '2026인식조사', '2026 인식조사', '26년인식조사', '26년 인식조사', '인식조사2026', '인식조사_2026', '04_인식조사', '인식조사', 'Sheet1'],
    rec: ['AI추천결과', '교육추천결과', '08_교육추천']
  };

  const likert = {
    '전혀 그렇지 않다': 1, '그렇지 않다': 2, '보통이다': 3, '비슷하다': 3,
    '그렇다': 4, '매우 그렇다': 5
  };

  const FITTING_COLUMNS = {
    ast: {
      label: '난시', title: '난시 성장 (pack/ACC)',
      py: ['2025 난시 팩수', '2025난시팩수', '25년 난시 팩수', '25년난시팩수'],
      cy: ['2026 난시 팩수', '2026난시팩수', '26년 난시 팩수', '26년난시팩수'],
      wearerPy: ['2025 난시 착용자', '2025 난시 착용자수', '2025 난시 웨어러', '2025 난시 wearer', '25년 난시 착용자', '25년 난시 착용자수', '25년 난시 웨어러'],
      wearerCy: ['2026 난시 착용자', '2026 난시 착용자수', '2026 난시 웨어러', '2026 난시 wearer', '26년 난시 착용자', '26년 난시 착용자수', '26년 난시 웨어러'],
      newPy: ['2025 난시 신규', '2025 난시 신규착용자', '2025 난시 신규 착용자', '2025 난시 신규웨어러', '2025 난시 신규 웨어러', '2025 난시 new wearer', '25년 난시 신규', '25년 난시 신규착용자', '25년 난시 신규 웨어러'],
      newCy: ['2026 난시 신규', '2026 난시 신규착용자', '2026 난시 신규 착용자', '2026 난시 신규웨어러', '2026 난시 신규 웨어러', '2026 난시 new wearer', '26년 난시 신규', '26년 난시 신규착용자', '26년 난시 신규 웨어러']
    },
    mf: {
      label: '멀티포컬', title: '멀티포컬 성장 (pack/ACC)',
      py: ['2025 멀티포컬  팩수', '2025 멀티포컬 팩수', '2025멀티포컬팩수', '25년 멀티포컬  팩수', '25년 멀티포컬 팩수', '25년멀티포컬팩수'],
      cy: ['2026 멀티포컬  팩수', '2026 멀티포컬 팩수', '2026멀티포컬팩수', '26년 멀티포컬  팩수', '26년 멀티포컬 팩수', '26년멀티포컬팩수'],
      wearerPy: ['2025 멀티포컬 착용자', '2025 멀티포컬 착용자수', '2025 멀티포컬 웨어러', '2025 MF 착용자', '2025 MF 웨어러', '25년 멀티포컬 착용자', '25년 멀티포컬 착용자수', '25년 멀티포컬 웨어러'],
      wearerCy: ['2026 멀티포컬 착용자', '2026 멀티포컬 착용자수', '2026 멀티포컬 웨어러', '2026 MF 착용자', '2026 MF 웨어러', '26년 멀티포컬 착용자', '26년 멀티포컬 착용자수', '26년 멀티포컬 웨어러'],
      newPy: ['2025 멀티포컬 신규', '2025 멀티포컬 신규착용자', '2025 멀티포컬 신규 착용자', '2025 멀티포컬 신규웨어러', '2025 멀티포컬 신규 웨어러', '2025 MF 신규', '2025 MF 신규 웨어러', '25년 멀티포컬 신규', '25년 멀티포컬 신규착용자', '25년 멀티포컬 신규 웨어러'],
      newCy: ['2026 멀티포컬 신규', '2026 멀티포컬 신규착용자', '2026 멀티포컬 신규 착용자', '2026 멀티포컬 신규웨어러', '2026 멀티포컬 신규 웨어러', '2026 MF 신규', '2026 MF 신규 웨어러', '26년 멀티포컬 신규', '26년 멀티포컬 신규착용자', '26년 멀티포컬 신규 웨어러']
    },
    max: {
      label: 'MAX', title: 'MAX 성장 (pack/ACC)',
      py: ['2025 MAX  팩수', '2025 MAX 팩수', '2025MAX팩수', '25년 MAX  팩수', '25년 MAX 팩수', '25년MAX팩수'],
      cy: ['2026 MAX  팩수', '2026 MAX 팩수', '2026MAX팩수', '26년 MAX  팩수', '26년 MAX 팩수', '26년MAX팩수'],
      wearerPy: ['2025 MAX 착용자', '2025 MAX 착용자수', '2025 MAX 웨어러', '2025 맥스 착용자', '2025 맥스 웨어러', '25년 MAX 착용자', '25년 MAX 착용자수', '25년 MAX 웨어러'],
      wearerCy: ['2026 MAX 착용자', '2026 MAX 착용자수', '2026 MAX 웨어러', '2026 맥스 착용자', '2026 맥스 웨어러', '26년 MAX 착용자', '26년 MAX 착용자수', '26년 MAX 웨어러'],
      newPy: ['2025 MAX 신규', '2025 MAX 신규착용자', '2025 MAX 신규 착용자', '2025 MAX 신규웨어러', '2025 MAX 신규 웨어러', '2025 맥스 신규', '25년 MAX 신규', '25년 MAX 신규착용자', '25년 MAX 신규 웨어러'],
      newCy: ['2026 MAX 신규', '2026 MAX 신규착용자', '2026 MAX 신규 착용자', '2026 MAX 신규웨어러', '2026 MAX 신규 웨어러', '2026 맥스 신규', '26년 MAX 신규', '26년 MAX 신규착용자', '26년 MAX 신규 웨어러']
    }
  };

  const INSIGHT = {
    ast: {
      focus: '난시 관련 인식',
      keywords: ['난시', '토릭', 'asd', '조기교정', '교정', '피팅', '축', '원주', '프리즘', '구면'],
      eduFallback: ['난시 조기교정 인식 강화 교육', '난시 피팅·상담 실전 교육']
    },
    mf: {
      focus: '멀티포컬 관련 인식',
      keywords: ['멀티포컬', '다초점', '노안', 'mf', '상담', '적응', 'follow', '팔로우'],
      eduFallback: ['노안·멀티포컬 상담 기본 교육', '멀티포컬 실전 피팅·Follow-up 교육']
    },
    max: {
      focus: 'MAX·눈건강 관련 인식',
      keywords: ['max', '맥스', '블루라이트', '눈건강', '보호', '자외선', '실리콘', '오아시스', '피로'],
      eduFallback: ['블루라이트·눈건강 가치 전달 교육', 'ACUVUE OASYS MAX 상담 스크립트 교육']
    }
  };

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
    const text = clean(value);
    if (!text || text === '-' || text === '데이터 없음') return null;
    if (/신규\s*(판매|진입)?/.test(text)) return null;
    const match = text.replace(/,/g, '').replace(/%/g, '').match(/[-+]?\d+(?:\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    if (!Number.isFinite(n)) return null;
    if (/↓|감소|하락|역성장/.test(text)) return -Math.abs(n);
    return n;
  }

  function avg(values) {
    const nums = values.map(num).filter(v => v != null && Number.isFinite(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }

  function sum(rows, getter) {
    const nums = rows.map(getter).map(num).filter(v => v != null && Number.isFinite(v));
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  }

  function annualize(v) {
    return v == null ? null : (Number(v) / Math.max(1, S.baseMonth)) * 12;
  }

  const fmtPct = v => v == null ? '데이터 없음' : `${Math.round(Number(v) * 100)}%`;
  const fmtRate = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
  const fmtPp = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%p`;
  const fmtPack = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Math.round(Number(v)).toLocaleString('ko-KR')}팩`;
  const fmtPackPerAcc = v => v == null ? '데이터 없음' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}팩 / ACC`;
  const dclass = v => v == null ? 'neutral' : Number(v) < 0 ? 'negative' : Number(v) > 0 ? 'positive' : 'neutral';

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
    const names = wb.SheetNames || [];
    const name = names.find(n => sheetNameKey(n) === sheetNameKey('06_피팅판매'))
      || names.find(n => clean(n) === '피팅판매')
      || names.find(n => String(n).includes('피팅판매'));
    if (!name || !wb.Sheets[name]) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: true, blankrows: false });
  }

  function extractMonth(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12) return value;
    const text = clean(value);
    let m = text.match(/(?:^|[^0-9])(1[0-2]|0?[1-9])\s*월/);
    if (m) return Number(m[1]);
    m = text.match(/20\d{2}[-/.](1[0-2]|0?[1-9])(?:[-/.]|$)/);
    if (m) return Number(m[1]);
    if (/^(1[0-2]|[1-9])$/.test(text)) return Number(text);
    return null;
  }

  function detectSalesBaseMonth(wb, salesRows) {
    const monthFields = ['기준월', '판매기준월', '데이터기준월', '마감월', '실적기준월', 'BaseMonth', 'SalesBaseMonth'];
    for (const row of salesRows.slice(0, 30)) {
      const m = extractMonth(get(row, monthFields));
      if (m) return { month: m, source: '피팅판매 시트 자동 감지' };
    }

    for (const sheetName of wb.SheetNames || []) {
      if (!/기준|설정|config|setting/i.test(sheetName)) continue;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: true, blankrows: false }).slice(0, 30);
      for (const row of rows) {
        const m = extractMonth(get(row, monthFields));
        if (m) return { month: m, source: `${sheetName} 자동 감지` };
        for (const [k, v] of Object.entries(row)) {
          if (/기준월|마감월|basemonth/i.test(clean(k))) {
            const parsed = extractMonth(v);
            if (parsed) return { month: parsed, source: `${sheetName} 자동 감지` };
          }
        }
      }
    }
    return { month: Math.max(1, Math.min(12, new Date().getMonth() + 1)), source: '엑셀 기준월 없음 · 현재 월 기본값' };
  }

  function infer(text) {
    const q = clean(text);
    if (/블루라이트|실리콘|기술|MAX|맥스|눈건강|오아시스/i.test(q)) return 'max';
    if (/멀티포컬|다초점|노안|\bMF\b/i.test(q)) return 'mf';
    if (/난시|토릭|ASD|프리즘|원주|축/i.test(q)) return 'ast';
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
      const productRaw = clean(get(r, ['제품군']));
      return {
        문항ID: clean(get(r, ['문항ID', 'QuestionID'])) || `Q${String(i + 1).padStart(3, '0')}`,
        문항: q,
        제품군: productRaw ? infer(productRaw) : infer(q),
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
        const normalizedCol = norm(col);
        const qm = S.qm.find(q => {
          const qid = norm(q.문항ID);
          const qt = norm(q.문항);
          return (qid && normalizedCol.includes(qid)) || (qt && normalizedCol.includes(qt));
        }) || {
          문항ID: col, 문항: col, 제품군: infer(col), 목표값: 4,
          긍정방향: /역코딩/.test(col) ? '낮을수록 긍정' : '높을수록 긍정', 사용: 'Y'
        };
        const rawScore = score(r[col]);
        if (rawScore == null || rawScore < 1 || rawScore > 5 || qm.사용 === 'N') return;
        const adjusted = /낮을수록/.test(qm.긍정방향) ? 6 - rawScore : rawScore;
        out.push({
          안경사ID: id, 문항ID: qm.문항ID, 문항: qm.문항, 제품군: qm.제품군,
          원응답: r[col], 점수: adjusted, 목표값: qm.목표값, gap: adjusted < qm.목표값
        });
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

  function dedupeSalesRows(rows) {
    const map = new Map();
    rows.forEach((row, i) => {
      const key = storeKey(row) || salesId(row) || `row-${i}`;
      if (!map.has(key)) map.set(key, row);
    });
    return [...map.values()];
  }

  function rebuildIndexes() {
    S.masterById = new Map(); S.salesById = new Map(); S.salesByStore = new Map();
    S.eduById = new Map(); S.perById = new Map(); S.per25ById = new Map(); S.recById = new Map(); S.metricCache = new Map();

    S.master.forEach(r => { if (r.안경사ID) S.masterById.set(r.안경사ID, r); });
    S.sales.forEach(r => {
      const id = salesId(r);
      if (id) {
        if (!S.salesById.has(id)) S.salesById.set(id, []);
        S.salesById.get(id).push(r);
      }
      const store = storeKey(r);
      if (store) {
        if (!S.salesByStore.has(store)) S.salesByStore.set(store, []);
        S.salesByStore.get(store).push(r);
      }
    });
    S.edu.forEach(r => {
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
      if (!id) return;
      if (!S.eduById.has(id)) S.eduById.set(id, []);
      S.eduById.get(id).push(r);
    });
    S.per26.forEach(r => {
      if (!S.perById.has(r.안경사ID)) S.perById.set(r.안경사ID, []);
      S.perById.get(r.안경사ID).push(r);
    });
    S.per25.forEach(r => {
      if (!S.per25ById.has(r.안경사ID)) S.per25ById.set(r.안경사ID, []);
      S.per25ById.get(r.안경사ID).push(r);
    });
    S.per = S.per26;
    S.rec.forEach(r => {
      const id = clean(get(r, ['안경사ID', '안경사 ID', 'ID']));
      if (id && !S.recById.has(id)) S.recById.set(id, r);
    });
  }

  function rowsFor(id) {
    const person = S.masterById.get(id);
    const store = person ? storeKey(person) : '';
    if (store) {
      const rows = S.salesByStore.get(store) || [];
      if (rows.length) return dedupeSalesRows(rows);
    }
    return dedupeSalesRows(S.salesById.get(id) || []);
  }

  function selectedSalesRows(masterRows) {
    const stores = new Set();
    const rows = [];
    masterRows.forEach(person => {
      const store = storeKey(person);
      if (store && stores.has(store)) return;
      const matched = rowsFor(person.안경사ID);
      matched.forEach(r => {
        const key = storeKey(r) || `id:${salesId(r)}`;
        if (!stores.has(key)) {
          stores.add(key);
          rows.push(r);
        }
      });
    });
    return dedupeSalesRows(rows);
  }

  function growthInfo(rows, key) {
    const col = FITTING_COLUMNS[key];
    const unique = dedupeSalesRows(rows);
    const py = sum(unique, r => get(r, col.py));
    const cyYtd = sum(unique, r => get(r, col.cy));
    if (py == null && cyYtd == null) return { status: 'none', rate: null, py: null, cyYtd: null, cyAnnualized: null };
    const cyAnnualized = annualize(cyYtd || 0);
    if ((py == null || py === 0) && (cyYtd || 0) > 0) {
      return { status: 'new', rate: null, py: py || 0, cyYtd: cyYtd || 0, cyAnnualized };
    }
    if ((py || 0) === 0 && (cyYtd || 0) === 0) {
      return { status: 'flat', rate: 0, py: py || 0, cyYtd: cyYtd || 0, cyAnnualized: 0 };
    }
    const rate = py ? ((cyAnnualized - py) / py) * 100 : null;
    return { status: rate == null ? 'none' : 'normal', rate, py, cyYtd: cyYtd || 0, cyAnnualized };
  }

  function countGrowthInfo(rows, key, metric) {
    const col = FITTING_COLUMNS[key];
    const pyCols = metric === 'wearer' ? col.wearerPy : col.newPy;
    const cyCols = metric === 'wearer' ? col.wearerCy : col.newCy;
    const unique = dedupeSalesRows(rows);
    const py = sum(unique, r => get(r, pyCols || []));
    const cyYtd = sum(unique, r => get(r, cyCols || []));
    if (py == null && cyYtd == null) return { status: 'none', rate: null, py: null, cyYtd: null, cyAnnualized: null };
    const cyAnnualized = annualize(cyYtd || 0);
    if ((py == null || py === 0) && (cyYtd || 0) > 0) return { status: 'new', rate: null, py: py || 0, cyYtd: cyYtd || 0, cyAnnualized };
    if ((py || 0) === 0 && (cyYtd || 0) === 0) return { status: 'flat', rate: 0, py: py || 0, cyYtd: cyYtd || 0, cyAnnualized: 0 };
    const rate = py ? ((cyAnnualized - py) / py) * 100 : null;
    return { status: rate == null ? 'none' : 'normal', rate, py, cyYtd: cyYtd || 0, cyAnnualized };
  }

  function metricRateLabel(info) {
    if (!info || info.status === 'none') return '데이터 없음';
    if (info.status === 'new') return '신규 발생';
    return fmtRate(info.rate);
  }

  function packPerWearerInfo(rows, key) {
    const pack = growthInfo(rows, key);
    const wearer = countGrowthInfo(rows, key, 'wearer');
    if (pack.py == null || wearer.py == null || !wearer.py || pack.cyAnnualized == null || wearer.cyAnnualized == null || !wearer.cyAnnualized) {
      return { py: null, cy: null, rate: null };
    }
    const py = pack.py / wearer.py;
    const cy = pack.cyAnnualized / wearer.cyAnnualized;
    return { py, cy, rate: py ? ((cy - py) / py) * 100 : null };
  }

  function salesDriver(rows, key) {
    const pack = growthInfo(rows, key);
    const wearer = countGrowthInfo(rows, key, 'wearer');
    const newWearer = countGrowthInfo(rows, key, 'new');
    const intensity = packPerWearerInfo(rows, key);
    const pr = pack.rate, wr = wearer.rate, nr = newWearer.rate;

    let type = 'mixed', label = '복합 요인', reason = '팩수·착용자·신규 지표를 함께 확인할 필요가 있습니다.';
    if (nr != null && nr <= -5 && wr != null && wr <= -3) {
      type = 'acquisition'; label = '신규 유입 약화';
      reason = '신규 착용자 감소가 전체 착용자와 판매 감소로 이어지는 패턴입니다.';
    } else if (nr != null && nr >= -2 && wr != null && wr <= -5) {
      type = 'retention'; label = '착용자 유지 약화';
      reason = '신규 유입은 유지되지만 전체 착용자가 감소해 적응·Follow-up·재방문 관리 이슈 가능성이 있습니다.';
    } else if (pr != null && pr <= -2 && wr != null && wr >= -3 && intensity.rate != null && intensity.rate <= -3) {
      type = 'intensity'; label = '착용자당 구매량 감소';
      reason = '착용자 규모보다 팩수가 더 크게 감소해 재구매·제품가치 전달·구매주기 이슈 가능성이 있습니다.';
    } else if (pr != null && pr >= 0 && nr != null && nr <= -5) {
      type = 'future-risk'; label = '신규 Pipeline 약화';
      reason = '현재 팩수는 유지되지만 신규 착용자가 줄어 향후 성장 위험 신호가 있습니다.';
    } else if (nr != null && nr <= -5) {
      type = 'acquisition'; label = '신규 유입 약화';
      reason = '신규 착용자 감소가 가장 뚜렷한 선행 신호입니다.';
    } else if (wr != null && wr <= -5) {
      type = 'retention'; label = '착용자 기반 감소';
      reason = '전체 착용자 수 감소가 판매 저하와 함께 나타납니다.';
    } else if (intensity.rate != null && intensity.rate <= -3) {
      type = 'intensity'; label = '착용자당 구매량 감소';
      reason = '착용자 대비 팩수 효율이 전년보다 낮아졌습니다.';
    }

    return { type, label, reason, pack, wearer, newWearer, intensity };
  }

  function driverEducationKeywords(type) {
    if (type === 'acquisition' || type === 'future-risk') return ['신규', '상담', '추천', '대상', '전환', '발굴', '첫', '스크립트'];
    if (type === 'retention') return ['적응', 'follow', '팔로우', '재방문', '관리', '불편', '유지'];
    if (type === 'intensity') return ['가치', '재구매', '제품', '사용', '착용', '혜택', '상담'];
    return [];
  }

  function driverFallbackEducation(key, type) {
    const product = FITTING_COLUMNS[key].label;
    if (type === 'acquisition' || type === 'future-risk') return `${product} 신규 착용자 발굴·상담 전환 교육`;
    if (type === 'retention') return `${product} 적응 관리·Follow-up 교육`;
    if (type === 'intensity') return `${product} 제품 가치·재구매 상담 교육`;
    return INSIGHT[key].eduFallback[0];
  }

  function packDelta(rows, key) {
    const info = growthInfo(rows, key);
    if (info.py == null && info.cyAnnualized == null) return null;
    return (info.cyAnnualized || 0) - (info.py || 0);
  }

  function avgPackDeltaPerAcc(rows, key) {
    const unique = dedupeSalesRows(rows);
    if (!unique.length) return null;
    const total = packDelta(unique, key);
    return total == null ? null : total / unique.length;
  }

  function growthLabel(info) {
    if (!info || info.status === 'none') return '데이터 없음';
    if (info.status === 'new') return '신규 판매';
    return fmtRate(info.rate);
  }

  function growthClass(info) {
    if (!info || info.status === 'none') return 'neutral';
    if (info.status === 'new') return 'new-sale';
    return dclass(info.rate);
  }

  function negativeAccCount(rows, key) {
    return dedupeSalesRows(rows).filter(r => {
      const info = growthInfo([r], key);
      return info.rate != null && info.rate < 0;
    }).length;
  }

  function eduDone(row) {
    const flag = clean(get(row, ['완료여부', '수료여부', '참여여부', '시청여부'])).toUpperCase();
    if (['Y', 'YES', 'TRUE', '완료', '수료', 'DONE', 'COMPLETED'].includes(flag)) return true;
    const progress = num(get(row, ['완료율', '진도율', '진행률']));
    return progress != null && progress >= 100;
  }

  function educationTitle(row) {
    return clean(get(row, ['교육명', '콘텐츠명', '추천교육명', '과정명', 'Title'])) || clean(get(row, ['교육ID', '콘텐츠ID', 'ID']));
  }

  function contentName(id) {
    const content = S.content.find(x => clean(get(x, ['교육ID', '콘텐츠ID', 'ID'])) === clean(id));
    return educationTitle(content) || clean(id);
  }

  function questionRelevance(q, key) {
    const text = `${q.문항 || ''} ${q.문항ID || ''} ${q.제품군 || ''}`.toLowerCase();
    let value = q.제품군 === key ? 4 : 0;
    INSIGHT[key].keywords.forEach(k => { if (text.includes(String(k).toLowerCase())) value += 1; });
    return value;
  }

  function educationRelated(text, key) {
    const normalized = clean(text).toLowerCase();
    return INSIGHT[key].keywords.some(k => normalized.includes(String(k).toLowerCase()));
  }

  function metrics(id) {
    if (S.metricCache.has(id)) return S.metricCache.get(id);
    const person = S.masterById.get(id);
    const sales = rowsFor(id);
    const perc = S.perById.get(id) || [];
    const gaps = perc.filter(x => x.gap);
    const edu = S.eduById.get(id) || [];
    const eduRate = edu.length ? edu.filter(eduDone).length / edu.length : null;
    const rec = S.recById.get(id) || {};
    const growths = {};
    ['ast', 'mf', 'max'].forEach(key => {
      growths[key] = {
        info: growthInfo(sales, key), pack: packDelta(sales, key), avgPack: avgPackDeltaPerAcc(sales, key)
      };
    });
    const hasNegative = ['ast', 'mf', 'max'].some(k => growths[k].info.rate != null && growths[k].info.rate < 0);
    const priority = gaps.length >= 3 || hasNegative ? '높음' : (gaps.length || eduRate == null || eduRate < 1) ? '중간' : '낮음';
    const m = { p: person, perc, gaps, eduRate, rec, growths, priority, educationIncomplete: eduRate == null || eduRate < 1 };
    S.metricCache.set(id, m);
    return m;
  }

  function uniqueValues(field) {
    return [...new Set(S.master.map(r => clean(r[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  }

  function buildFilters() {
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => {
      const el = $(id);
      if (!el) return;
      el.innerHTML = '<option value="">전체</option>' + uniqueValues(field).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      el.onchange = () => { S.query = ''; S.targetIds = null; S.gapFilter = null; render(); if (S.insightsReady) renderInsights(); };
    });
  }

  function filterByDropdown() {
    let rows = [...S.master];
    [['regionFilter', '지역'], ['yearsFilter', '연차'], ['tierFilter', 'Tier'], ['channelFilter', '채널'], ['repFilter', '담당영업사원']].forEach(([id, field]) => {
      const value = $(id)?.value;
      if (value) rows = rows.filter(r => clean(r[field]) === value);
    });
    return rows;
  }

  function productFromQuery(q) {
    if (/멀티포컬|다초점|노안|\bMF\b/i.test(q)) return 'mf';
    if (/MAX|맥스|블루라이트|눈건강/i.test(q)) return 'max';
    if (/난시|토릭|ASD/i.test(q)) return 'ast';
    return null;
  }

  function lowPerceptionForPerson(id, productKey) {
    return (S.perById.get(id) || []).some(p => (!productKey || questionRelevance(p, productKey) > 0) && p.gap);
  }

  function parseSmartConditions(q) {
    const product = productFromQuery(q);
    const conditions = [];
    const region = uniqueValues('지역').find(v => norm(q).includes(norm(v)));
    const tier = uniqueValues('Tier').find(v => norm(q).includes(norm(v)));
    const channel = uniqueValues('채널').find(v => norm(q).includes(norm(v)));
    const rep = uniqueValues('담당영업사원').find(v => norm(q).includes(norm(v)));
    if (region) conditions.push({ label: `지역=${region}`, test: r => clean(r.지역) === region });
    if (tier) conditions.push({ label: `Tier=${tier}`, test: r => clean(r.Tier) === tier });
    if (channel) conditions.push({ label: `채널=${channel}`, test: r => clean(r.채널) === channel });
    if (rep) conditions.push({ label: `담당=${rep}`, test: r => clean(r.담당영업사원) === rep });
    const years = q.match(/(\d+)\s*년차/);
    if (years) conditions.push({ label: `${years[1]}년차`, test: r => clean(r.연차).includes(years[1]) });
    if (/인식|gap|갭|낮|부족|저하/i.test(q)) {
      conditions.push({ label: product ? `${FITTING_COLUMNS[product].label} 인식 낮음` : '인식 목표 미달', test: r => lowPerceptionForPerson(r.안경사ID, product) });
    }
    if (/교육.*미완료|미완료|미수료|미이수/i.test(q)) {
      conditions.push({ label: '교육 미완료', test: r => metrics(r.안경사ID).educationIncomplete });
    }
    if (/역성장|성장률.*음수|마이너스|판매.*감소/i.test(q)) {
      conditions.push({
        label: product ? `${FITTING_COLUMNS[product].label} 역성장` : '제품 역성장',
        test: r => {
          const m = metrics(r.안경사ID);
          if (product) return m.growths[product].info.rate != null && m.growths[product].info.rate < 0;
          return ['ast', 'mf', 'max'].some(k => m.growths[k].info.rate != null && m.growths[k].info.rate < 0);
        }
      });
    }
    return conditions;
  }

  function filtered() {
    let rows = filterByDropdown();
    const q = clean(S.query);
    if (q) {
      const conditions = parseSmartConditions(q);
      if (conditions.length) rows = rows.filter(r => conditions.every(c => c.test(r)));
      else rows = rows.filter(r => Object.values(r).some(v => norm(v).includes(norm(q))));
      if ($('queryExplanation')) {
        const labels = conditions.map(c => `[${c.label}]`).join(' ');
        $('queryExplanation').textContent = `${labels || `검색어=${q}`} / 결과 ${rows.length}명 · 판매 기준 ${S.baseMonth}월 (${S.baseMonthSource})`;
      }
    }
    if (S.targetIds) rows = rows.filter(r => S.targetIds.has(r.안경사ID));
    return rows;
  }

  function rowsForSalesReverse(rows, key) {
    const sales = selectedSalesRows(rows).filter(r => {
      const info = growthInfo([r], key);
      return info.rate != null && info.rate < 0;
    });
    const stores = new Set(sales.map(storeKey).filter(Boolean));
    return rows.filter(r => stores.has(storeKey(r)));
  }

  function rowsForGapFilter(rows) {
    if (!S.gapFilter) return rows;
    if (S.gapFilter.type === 'education') return rows.filter(r => metrics(r.안경사ID).educationIncomplete);
    if (S.gapFilter.type === 'perception') return rows.filter(r => metrics(r.안경사ID).gaps.length > 0);
    if (S.gapFilter.type === 'sales') return rowsForSalesReverse(rows, S.gapFilter.key);
    return rows;
  }

  function gapFilterTitle() {
    if (!S.gapFilter) return '현재 그룹';
    if (S.gapFilter.type === 'education') return '교육 미완료 대상';
    if (S.gapFilter.type === 'perception') return '인식 목표 미달 대상';
    if (S.gapFilter.type === 'sales') return `${FITTING_COLUMNS[S.gapFilter.key].label} 역성장 안경원 대상`;
    return '현재 그룹';
  }

  function setGapFilter(type, key = null) {
    const same = S.gapFilter && S.gapFilter.type === type && S.gapFilter.key === key;
    S.gapFilter = same ? null : { type, key };
    render();
  }

  function kpi(label, value, note) {
    return `<div class="kpi-card"><span class="label">${label}</span><strong>${value}</strong><small>${note}</small></div>`;
  }

  function kpiGrowth(key, rows) {
    const sales = selectedSalesRows(rows);
    const info = growthInfo(sales, key);
    const allInfo = growthInfo(dedupeSalesRows(S.sales), key);
    const avgPack = avgPackDeltaPerAcc(sales, key);
    const diff = info.rate != null && allInfo.rate != null ? info.rate - allInfo.rate : null;
    const main = avgPack == null ? '-' : `${Number(avgPack) >= 0 ? '+' : ''}${Number(avgPack).toFixed(1)}`;
    const compare = info.status === 'new' ? '신규 판매' : growthLabel(info);
    return kpi(
      FITTING_COLUMNS[key].title,
      `<span class="${dclass(avgPack)}">${main}</span>`,
      `<span class="${growthClass(info)}">${compare} vs PY</span><span class="metric-note ${dclass(diff)}">${diff == null ? '전체 평균 비교 없음' : `${fmtPp(diff)} vs avg`}</span>`
    );
  }

  function renderGapCards(rows, ms) {
    const sales = selectedSalesRows(rows);
    const cards = [
      { cls: 'education', type: 'education', key: null, label: '교육 미완료', value: `${ms.filter(m => m.educationIncomplete).length}명` },
      { cls: 'perception', type: 'perception', key: null, label: '인식 목표 미달', value: `${ms.filter(m => m.gaps.length).length}명` },
      { cls: 'ast', type: 'sales', key: 'ast', label: '난시 역성장', value: `${negativeAccCount(sales, 'ast')} ACC` },
      { cls: 'mf', type: 'sales', key: 'mf', label: '멀티포컬 역성장', value: `${negativeAccCount(sales, 'mf')} ACC` },
      { cls: 'max', type: 'sales', key: 'max', label: 'MAX 역성장', value: `${negativeAccCount(sales, 'max')} ACC` }
    ];
    $('gapCards').innerHTML = cards.map(c => {
      const active = S.gapFilter && S.gapFilter.type === c.type && S.gapFilter.key === c.key ? ' active' : '';
      return `<button class="gap-card ${c.cls}${active}" data-gap-type="${c.type}" data-gap-key="${c.key || ''}" type="button"><span>${c.label}</span><b>${c.value}</b><small>${active ? '선택됨 · 다시 클릭하면 해제' : '클릭해서 대상 좁히기'}</small></button>`;
    }).join('');
    document.querySelectorAll('[data-gap-type]').forEach(btn => {
      btn.onclick = () => setGapFilter(btn.dataset.gapType, btn.dataset.gapKey || null);
    });
  }

  function getTopGapQuestions(rows, limit = 7) {
    const targetRows = rowsForGapFilter(rows);
    const ids = new Set(targetRows.map(r => r.안경사ID));
    const byQuestion = new Map();
    S.per.forEach(p => {
      if (!ids.has(p.안경사ID) || !p.gap || !p.문항) return;
      if (S.gapFilter?.type === 'sales' && questionRelevance(p, S.gapFilter.key) <= 0) return;
      if (!byQuestion.has(p.문항)) byQuestion.set(p.문항, { scores: [], ids: new Set() });
      const bucket = byQuestion.get(p.문항);
      bucket.scores.push(p.점수);
      bucket.ids.add(p.안경사ID);
    });
    return [...byQuestion.entries()].map(([q, item]) => ({
      q, count: item.ids.size, avgScore: avg(item.scores), targetIds: [...item.ids]
    })).sort((a, b) => b.count - a.count || (a.avgScore ?? 99) - (b.avgScore ?? 99)).slice(0, limit);
  }

  function productKeyFromQuestion(text) {
    const inferred = infer(text);
    return inferred === 'other' ? null : inferred;
  }

  function overlapScore(a, b) {
    const tokens = [...new Set(clean(a).toLowerCase().match(/[a-z0-9가-힣]{2,}/g) || [])];
    const text = clean(b).toLowerCase();
    return tokens.reduce((acc, token) => acc + (text.includes(token) ? 1 : 0), 0);
  }

  function suggestedEducationTitle(questionText) {
    if (/프리즘|한쪽.*난시|구면|수직/i.test(questionText)) return '난시 프리즘 및 디자인 관련 교육';
    if (/난시|토릭|ASD|축|원주/i.test(questionText)) return '난시 피팅 및 디자인 관련 교육';
    if (/멀티포컬|다초점|노안|적응|follow|팔로우/i.test(questionText)) return '멀티포컬 상담 및 적응 관리 교육';
    if (/블루라이트|눈건강|자외선|MAX|맥스/i.test(questionText)) return '블루라이트·눈건강 가치 전달 교육';
    return '인식 Gap 보완 교육';
  }

  function findBestEducationForQuestion(questionText, excludedTitles = new Set()) {
    const productKey = productKeyFromQuestion(questionText);
    const rows = (S.content || []).map(row => ({ row, title: educationTitle(row) })).filter(x => x.title);
    const candidates = rows.map(x => {
      let s = overlapScore(questionText, x.title);
      if (productKey && educationRelated(x.title, productKey)) s += 2;
      if (excludedTitles.has(norm(x.title))) s -= 5;
      return { ...x, score: s };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    if (candidates.length) return { title: candidates[0].title, status: '교육 리스트 매칭' };
    return { title: suggestedEducationTitle(questionText), status: '현재 교육 리스트에 없음 · 제작 필요' };
  }

  function renderLinkedGapEducation(rows) {
    const targetRows = rowsForGapFilter(rows);
    const top = getTopGapQuestions(rows, 7);
    if ($('gapEducationSubtitle')) $('gapEducationSubtitle').textContent = `${gapFilterTitle()} 기준 · 대상 ${targetRows.length}명 · 부족 인식과 교육을 연결합니다.`;
    const box = $('linkedGapEducationRows');
    if (!top.length) {
      box.innerHTML = '<div class="empty-state">선택 대상의 인식 Gap 문항이 없습니다.</div>';
      return;
    }
    box.innerHTML = top.map((item, i) => {
      const rec = findBestEducationForQuestion(item.q);
      return `<div class="linked-gap-row">
        <div class="linked-rank">${i + 1}</div>
        <div class="linked-question"><b>${esc(item.q)}</b><small>${item.count}명 · 평균 ${item.avgScore == null ? '-' : item.avgScore.toFixed(1)}점</small></div>
        <div class="linked-arrow" aria-hidden="true">→</div>
        <div class="linked-education"><small>추천 교육</small><b>${esc(rec.title)}</b><span>${esc(rec.status)}</span></div>
        <button class="button linked-target-button" type="button" data-question-target="${i}">대상자 보기</button>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-question-target]').forEach(button => {
      button.onclick = () => {
        const item = top[Number(button.dataset.questionTarget)];
        S.targetIds = new Set(item.targetIds);
        S.query = '';
        S.gapFilter = null;
        render();
        if ($('queryExplanation')) $('queryExplanation').textContent = `인식 Gap 문항 대상: ${item.q} / ${item.count}명 · 판매 기준 ${S.baseMonth}월`;
        view('segment');
      };
    });
  }

  function recommendedEducationForPerson(id) {
    const m = metrics(id);
    const recName = clean(get(m.rec, ['추천교육명', '교육명'])) || contentName(get(m.rec, ['추천교육ID', '교육ID']));
    if (recName) return recName;
    const firstGap = m.gaps.sort((a, b) => a.점수 - b.점수)[0];
    return firstGap ? findBestEducationForQuestion(firstGap.문항).title : '없음';
  }

  function renderSegment(rows, ms) {
    $('resultCount').textContent = `${rows.length.toLocaleString('ko-KR')}명`;
    $('segmentSummary').innerHTML = `<div class="three-col"><div>${kpiGrowth('ast', rows)}</div><div>${kpiGrowth('mf', rows)}</div><div>${kpiGrowth('max', rows)}</div></div>`;
    $('segmentTable').innerHTML = ms.map(m => {
      const p = m.p || {};
      const cell = key => {
        const g = m.growths[key];
        return `${fmtPack(g.pack)}<br><small class="${growthClass(g.info)}">${growthLabel(g.info)}</small>`;
      };
      return `<tr data-id="${esc(p.안경사ID)}">
        <td><b>${esc(p.안경사명)}</b><small><br>${esc(p.안경사ID)}</small></td>
        <td>${esc(p.안경원명)}<small><br>${esc(p.지역)} · ${esc(p.채널)}</small></td>
        <td>${esc(p.연차)} / ${esc(p.Tier)}</td>
        <td>${m.eduRate == null ? '확인 필요' : fmtPct(m.eduRate)}</td>
        <td>${m.perc.length ? `${m.gaps.length}개` : '데이터 없음'}</td>
        <td>${cell('ast')}</td><td>${cell('mf')}</td><td>${cell('max')}</td>
        <td>${esc(recommendedEducationForPerson(p.안경사ID))}</td><td>${esc(m.priority)}</td>
      </tr>`;
    }).join('');
    document.querySelectorAll('#segmentTable tr').forEach(tr => { tr.onclick = () => showProfile(tr.dataset.id); });
  }

  function showProfile(id) {
    const m = metrics(id);
    if (!m.p) return;
    const salesCards = ['ast', 'mf', 'max'].map(key => {
      const g = m.growths[key];
      return `<div class="status-card"><small>${FITTING_COLUMNS[key].label} 소속 안경원</small><h3 class="${growthClass(g.info)}">${growthLabel(g.info)}</h3><small>${fmtPack(g.pack)} 연환산 증감</small></div>`;
    }).join('');
    $('profilePanel').hidden = false;
    $('profileContent').innerHTML = `
      <h3>${esc(m.p.안경사명)} <small>${esc(id)}</small></h3>
      <p>${esc(m.p.안경원명)} · ${esc(m.p.지역)} · ${esc(m.p.연차)} / ${esc(m.p.Tier)}</p>
      <div class="profile-grid">
        <div class="status-card"><small>교육완료</small><h3>${m.eduRate == null ? '확인 필요' : fmtPct(m.eduRate)}</h3></div>
        <div class="status-card"><small>인식 Gap</small><h3>${m.perc.length ? `${m.gaps.length}개` : '데이터 없음'}</h3></div>
        <div class="status-card"><small>우선순위</small><h3>${esc(m.priority)}</h3></div>
      </div>
      <div class="profile-sales">${salesCards}</div>
      <h3>문항별 Gap</h3>
      ${m.gaps.slice().sort((a, b) => a.점수 - b.점수).slice(0, 10).map(g => `<div class="question-card"><b>${esc(g.문항)}</b><br><small>응답 ${esc(g.원응답)} · 보정점수 ${g.점수} · 목표 ${g.목표값}</small></div>`).join('') || '<div class="empty-state">Gap 문항이 없습니다.</div>'}
    `;
    $('profilePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    view('segment');
  }

  function lowQuestionsForRows(masterRows, key, maxCount = 3) {
    const ids = new Set(masterRows.map(r => r.안경사ID));
    const seg26ByQ = new Map();
    const all26ByQ = new Map();
    const seg25ByQ = new Map();
    const infoByQ = new Map();

    S.per26.forEach(p => {
      if (questionRelevance(p, key) <= 0 || !p.문항) return;
      if (!all26ByQ.has(p.문항)) all26ByQ.set(p.문항, []);
      all26ByQ.get(p.문항).push(p.점수);
      infoByQ.set(p.문항, { target: p.목표값 || 4 });
      if (ids.has(p.안경사ID)) {
        if (!seg26ByQ.has(p.문항)) seg26ByQ.set(p.문항, []);
        seg26ByQ.get(p.문항).push(p.점수);
      }
    });

    S.per25.forEach(p => {
      if (questionRelevance(p, key) <= 0 || !p.문항 || !ids.has(p.안경사ID)) return;
      if (!seg25ByQ.has(p.문항)) seg25ByQ.set(p.문항, []);
      seg25ByQ.get(p.문항).push(p.점수);
    });

    return [...seg26ByQ.entries()].map(([q, vals]) => {
      const seg = avg(vals);
      const all = avg(all26ByQ.get(q) || []);
      const prev = avg(seg25ByQ.get(q) || []);
      const target = infoByQ.get(q)?.target || 4;
      const diff = seg != null && all != null ? seg - all : null;
      const targetGap = seg != null ? seg - target : null;
      const change = seg != null && prev != null ? seg - prev : null;
      const prevGap = prev != null ? prev - target : null;

      let trendType = 'current-gap', trendLabel = '2026 현재 Gap';
      if (change != null && seg < target && change <= -0.2) { trendType = 'worsening'; trendLabel = '현재 미달 + 전년 대비 악화'; }
      else if (change != null && seg < target && prev < target && Math.abs(change) < 0.2) { trendType = 'persistent'; trendLabel = '2년 연속 지속 Gap'; }
      else if (change != null && seg < target && change >= 0.2) { trendType = 'recovering'; trendLabel = '개선 중이나 아직 미달'; }
      else if (change != null && seg >= target && change <= -0.3) { trendType = 'early-warning'; trendLabel = '현재 도달이나 하락 추세'; }

      const severity =
        Math.max(0, -(diff || 0)) * 35 +
        Math.max(0, -(targetGap || 0)) * 30 +
        Math.max(0, -(change || 0)) * 60 +
        (trendType === 'persistent' ? 12 : 0) +
        (trendType === 'early-warning' ? 8 : 0) +
        vals.length;

      return { q, seg, all, prev, change, diff, targetGap, prevGap, target, count: vals.length, severity, trendType, trendLabel };
    }).filter(x => {
      const currentIssue = x.seg != null && ((x.diff != null && x.diff <= -0.2) || (x.targetGap != null && x.targetGap < 0));
      const trendIssue = x.change != null && x.change <= -0.3;
      return currentIssue || trendIssue;
    }).sort((a, b) => b.severity - a.severity).slice(0, maxCount);
  }

  function perceptionTrendText(item) {
    if (!item) return '인식 데이터에서 뚜렷한 원인 후보가 확인되지 않음';
    const current = item.seg == null ? '-' : item.seg.toFixed(1);
    const prev = item.prev == null ? null : item.prev.toFixed(1);
    const change = item.change == null ? null : `${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)}`;
    const yearText = prev == null ? `2026 ${current}점` : `2025 ${prev} → 2026 ${current}점 (${change})`;
    return `${item.q} · ${yearText} · ${item.trendLabel}`;
  }


  function completedEducationTitles(rows) {
    const ids = new Set(rows.map(r => r.안경사ID));
    return new Set(S.edu.filter(r => ids.has(clean(get(r, ['안경사ID', '안경사 ID', 'ID']))) && eduDone(r)).map(educationTitle).filter(Boolean).map(norm));
  }

  function recommendedEducationPlan(rows, key, primaryCause, driver) {
    const completed = completedEducationTitles(rows);
    const question = primaryCause?.q || `${FITTING_COLUMNS[key].label} 관련 인식`;
    const driverKeywords = driverEducationKeywords(driver?.type);
    const contentRows = (S.content || []).map(row => ({ row, title: educationTitle(row) })).filter(x => x.title);

    const scored = contentRows.map(x => {
      let scoreValue = overlapScore(question, x.title);
      if (educationRelated(x.title, key)) scoreValue += 3;
      driverKeywords.forEach(k => { if (clean(x.title).toLowerCase().includes(String(k).toLowerCase())) scoreValue += 2; });
      if (completed.has(norm(x.title))) scoreValue -= 8;
      return { ...x, score: scoreValue };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    const first = scored.length
      ? { title: scored[0].title, status: '인식·판매 Driver 매칭' }
      : { title: driverFallbackEducation(key, driver?.type), status: 'Driver 기반 추천' };

    const blocked = new Set([...completed, norm(first.title)]);
    const secondCandidate = scored.find(x => !blocked.has(norm(x.title)));
    const second = secondCandidate
      ? { title: secondCandidate.title, status: '교육 리스트 매칭' }
      : (() => {
          const fallback = INSIGHT[key].eduFallback.find(x => !blocked.has(norm(x))) || driverFallbackEducation(key, driver?.type);
          return { title: fallback, status: '보완 교육' };
        })();

    return [first, second];
  }

  function personHasLowRelatedPerception(id, key) {
    return (S.perById.get(id) || []).some(p => questionRelevance(p, key) > 0 && p.gap);
  }

  function personHasIncompleteRelatedEducation(id, key) {
    const rows = S.eduById.get(id) || [];
    if (!rows.length) return true;
    const related = rows.filter(r => educationRelated(Object.values(r).join(' '), key));
    const base = related.length ? related : rows;
    return base.some(r => !eduDone(r));
  }

  function peopleInSalesAccounts(masterRows, salesRows) {
    const stores = new Set(dedupeSalesRows(salesRows).map(storeKey).filter(Boolean));
    return masterRows.filter(r => stores.has(storeKey(r)));
  }

  function focusGroup(people, questionText) {
    if (!people.length || !questionText) return '';
    const dims = [['Tier', 'Tier'], ['채널', '채널'], ['연차', '연차'], ['지역', '지역']];
    const candidates = [];
    dims.forEach(([field, label]) => {
      const groups = new Map();
      people.forEach(p => {
        const value = clean(p[field]);
        if (!value) return;
        if (!groups.has(value)) groups.set(value, []);
        groups.get(value).push(p);
      });
      groups.forEach((members, value) => {
        if (members.length < 2) return;
        const ids = new Set(members.map(x => x.안경사ID));
        const scores = S.per.filter(x => ids.has(x.안경사ID) && x.문항 === questionText).map(x => x.점수);
        const groupAvg = avg(scores);
        if (groupAvg != null) candidates.push({ label, value, avg: groupAvg, size: members.length });
      });
    });
    candidates.sort((a, b) => a.avg - b.avg || b.size - a.size);
    return candidates[0] ? `${candidates[0].label} ${candidates[0].value} · ${candidates[0].avg.toFixed(1)}점` : '';
  }

  function generateInsights() {
    const baseRows = Array.isArray(S.filtered) ? S.filtered : S.master;
    const allSales = selectedSalesRows(baseRows);
    const insights = [];

    // 같은 제품이라도 "전년 대비 역성장"과 "평균 대비 저성과"는 서로 다른 집단으로 분리해
    // 각 집단의 인식 변화와 교육 니즈를 별도로 분석합니다.
    const tracks = [
      { mode: 'reverse', label: '전년 대비 역성장' },
      { mode: 'under', label: '평균 대비 저성과' }
    ];

    ['ast', 'mf', 'max'].forEach(key => {
      const overallDriver = salesDriver(allSales, key);
      const overall = overallDriver.pack;
      if (overall.status === 'none') return;

      tracks.forEach(track => {
        const affectedSales = dedupeSalesRows(allSales).filter(row => {
          const pack = growthInfo([row], key);
          if (pack.rate == null) return false;

          if (track.mode === 'reverse') {
            return pack.rate < 0;
          }

          // 평균 대비 저성과는 역성장 그룹과 원인 분석이 섞이지 않도록
          // 0% 이상 성장 중이지만 전체 성장률보다 3%p 이상 낮은 ACC만 분리합니다.
          return pack.rate >= 0 && overall.rate != null && pack.rate <= overall.rate - 3;
        });
        if (!affectedSales.length) return;

        const affectedPeople = peopleInSalesAccounts(baseRows, affectedSales);
        if (!affectedPeople.length) return;

        const respondents = affectedPeople.filter(p =>
          (S.perById.get(p.안경사ID) || []).some(x => questionRelevance(x, key) > 0)
        );
        const causeList = lowQuestionsForRows(respondents.length ? respondents : affectedPeople, key, 3);
        const primary = causeList[0] || null;
        const affectedDriver = salesDriver(affectedSales, key);

        const targetPeople = affectedPeople.filter(p =>
          personHasLowRelatedPerception(p.안경사ID, key) ||
          personHasIncompleteRelatedEducation(p.안경사ID, key)
        );
        const finalTargets = targetPeople.length ? targetPeople : affectedPeople;
        const targetAccCount = new Set(finalTargets.map(storeKey).filter(Boolean)).size;
        const affectedAccCount = dedupeSalesRows(affectedSales).length;
        const incompleteCount = finalTargets.filter(p => personHasIncompleteRelatedEducation(p.안경사ID, key)).length;
        const recs = recommendedEducationPlan(finalTargets, key, primary, affectedDriver);
        const focus = focusGroup(respondents, primary?.q);

        const packRisk = Math.max(0, -(affectedDriver.pack.rate || 0));
        const wearerRisk = Math.max(0, -(affectedDriver.wearer.rate || 0));
        const newRisk = Math.max(0, -(affectedDriver.newWearer.rate || 0));
        const trendRisk = Math.max(0, -(primary?.change || 0)) * 20;
        const underGap = track.mode === 'under' && overall.rate != null && affectedDriver.pack.rate != null
          ? Math.max(0, overall.rate - affectedDriver.pack.rate)
          : 0;
        const priority = packRisk * 8 + wearerRisk * 5 + newRisk * 7 + trendRisk + underGap * 6 + affectedAccCount * 4 + incompleteCount;

        const causeText = primary
          ? perceptionTrendText(primary)
          : `${INSIGHT[key].focus}에서 현재/전년 추세상 뚜렷한 저하 문항은 아직 확인되지 않음`;

        const perceptionEvidence = primary?.change != null
          ? (primary.change <= -0.2
              ? `관련 인식도 전년 대비 악화되어 교육 원인 후보의 근거가 강화됩니다.`
              : primary.change >= 0.2
                ? `관련 인식은 개선 중이므로 판매 저하를 인식 하나만으로 설명하기 어렵습니다.`
                : `관련 인식은 전년과 유사한 수준으로 지속되고 있습니다.`)
          : `2025 인식 데이터가 없거나 동일 문항 매칭이 되지 않아 현재 인식 기준으로 판단합니다.`;

        const performanceText = track.mode === 'reverse'
          ? `${FITTING_COLUMNS[key].label} 전년 대비 역성장 ACC ${affectedAccCount}개`
          : `${FITTING_COLUMNS[key].label} 전체 성장률 ${growthLabel(overall)} 대비 낮은 ACC ${affectedAccCount}개`;

        const narrative = `${performanceText}의 판매 구조를 별도로 분석한 결과 ${affectedDriver.label} 패턴이 우선 확인됩니다. ` +
          `${primary ? `인식에서는 ‘${primary.q}’가 ${primary.prev != null ? `2025 ${primary.prev.toFixed(1)}점에서 2026 ${primary.seg.toFixed(1)}점으로 ${primary.change >= 0 ? '+' : ''}${primary.change.toFixed(1)}점 변화했습니다.` : `2026 ${primary.seg.toFixed(1)}점으로 확인됩니다.`}` : ''} ` +
          perceptionEvidence + (focus ? ` 특히 ${focus}에서 Gap이 두드러집니다.` : '');

        insights.push({
          key,
          mode: track.mode,
          trackLabel: track.label,
          title: `${FITTING_COLUMNS[key].label} · ${track.label}`,
          narrative,
          affectedSales,
          affectedPeople,
          affectedAccCount,
          respondents,
          targetPeople: finalTargets,
          targetAccCount,
          incompleteCount,
          causeList,
          causeText,
          recs,
          focus,
          priority,
          driver: affectedDriver,
          overallDriver
        });
      });
    });

    return insights.sort((a, b) => b.priority - a.priority);
  }

  function renderInsights() {
    S.insightsReady = true;
    S.insights = generateInsights();
    const box = $('insightCards');
    if (!S.insights.length) {
      box.innerHTML = '<div class="empty-state">현재 조건에서 우선 실행할 교육 Opportunity가 없습니다.</div>';
      return;
    }
    box.innerHTML = S.insights.map((item, i) => {
      const product = FITTING_COLUMNS[item.key].label;
      const d = item.driver;
      const salesBits = [
        `팩 ${growthLabel(d.pack)}`,
        d.wearer.status !== 'none' ? `웨어러 ${metricRateLabel(d.wearer)}` : null,
        d.newWearer.status !== 'none' ? `신규 ${metricRateLabel(d.newWearer)}` : null
      ].filter(Boolean);
      const avgCompare = item.mode === 'under' && item.overallDriver?.pack?.rate != null ? ` · 전체 평균 ${growthLabel(item.overallDriver.pack)}` : '';
      const symptom = `${item.affectedAccCount} ACC · ${salesBits.join(' · ')}${avgCompare}`;
      const primary = item.causeList[0] || null;
      const perceptionLine = primary
        ? `${perceptionTrendText(primary)}${primary.all != null ? ` · 2026 전체 평균 ${primary.all.toFixed(1)}점` : ''}`
        : '제품 관련 인식에서 뚜렷한 원인 후보 없음';
      const target = `대상 안경사 ${item.targetPeople.length}명 (${item.targetAccCount} ACC) · 2026 인식 응답 ${item.respondents.length}명 · 교육 미완료/확인 필요 ${item.incompleteCount}명`;
      const action = item.recs.map((r, idx) => `${idx + 1}. ${esc(r.title)} <span class="rec-status">${esc(r.status)}</span>`).join('<br>');
      const followMetrics = [
        '2026 인식 재측정',
        d.newWearer.status !== 'none' ? '신규 착용자' : null,
        d.wearer.status !== 'none' ? '웨어러' : null,
        '팩수'
      ].filter(Boolean).join(' → ');
      const follow = `교육 이수 확인 → ${followMetrics} 재확인`;

      return `<article class="insight-card">
        <div class="type">EDUCATION OPPORTUNITY <span class="priority-chip">우선순위 ${i + 1}</span></div>
        <h3>${esc(item.title)}</h3>
        <p class="insight-narrative">${esc(item.narrative)}</p>
        <div class="insight-flow">
          <div class="flow-step"><small>1. 현상</small><b>${esc(symptom)}</b><p>${esc(d.label)} · ${esc(d.reason)}</p></div>
          <div class="flow-step"><small>2. 원인</small><b>${esc(perceptionLine)}</b><p>${item.focus ? `집중 그룹: ${esc(item.focus)}` : '25→26 인식 변화와 판매 Driver를 함께 판단'}</p></div>
          <div class="flow-step"><small>3. Target</small><b>${esc(target)}</b><p>판매는 안경원, 교육/인식은 안경사 기준</p></div>
          <div class="flow-step"><small>4. Action</small><b>${action}</b><p>${esc(d.label)} + 인식 Gap에 맞춰 교육 우선순위 결정</p></div>
          <div class="flow-step"><small>5. Follow-up</small><b>${esc(follow)}</b><p>교육 후 인식과 신규·웨어러·팩수 변화를 함께 확인</p></div>
        </div>
        <div class="coverage-note">※ 판매 기준월 ${S.baseMonth}월 · ${esc(S.baseMonthSource)} · 2025 인식 ${S.per25.length ? '연결됨' : '미연결'} · 2026 인식 ${S.per26.length ? '연결됨' : '미연결'}</div>
        <div class="insight-actions"><button class="button primary" type="button" data-insight-target="${i}">교육 대상 안경사 보기</button></div>
      </article>`;
    }).join('');
    box.querySelectorAll('[data-insight-target]').forEach(btn => {
      btn.onclick = () => {
        const item = S.insights[Number(btn.dataset.insightTarget)];
        S.targetIds = new Set(item.targetPeople.map(p => p.안경사ID));
        S.query = '';
        S.gapFilter = null;
        render();
        if ($('queryExplanation')) $('queryExplanation').textContent = `${item.title} · 대상 안경사 ${item.targetPeople.length}명 (${item.targetAccCount} ACC) · 판매 기준 ${S.baseMonth}월`;
        view('segment');
      };
    });
  }

  function render() {
    const rows = filtered();
    S.filtered = rows;
    const ms = rows.map(r => metrics(r.안경사ID));
    const eduComplete = ms.filter(m => m.eduRate === 1).length;
    const reached = ms.filter(m => m.perc.length && m.gaps.length === 0).length;
    const stores = selectedSalesRows(rows).length;
    $('kpiGrid').innerHTML = [
      kpi('관리 안경사', rows.length.toLocaleString('ko-KR'), `${stores.toLocaleString('ko-KR')}개 안경원 · 현재 필터`),
      kpi('교육 완료 안경사', eduComplete.toLocaleString('ko-KR'), `${fmtPct(rows.length ? eduComplete / rows.length : null)} 완료`),
      kpi('인식 목표 도달', reached.toLocaleString('ko-KR'), `${fmtPct(rows.length ? reached / rows.length : null)} 도달`),
      kpiGrowth('ast', rows), kpiGrowth('mf', rows), kpiGrowth('max', rows)
    ].join('');
    renderGapCards(rows, ms);
    renderLinkedGapEducation(rows);
    const detailRows = rowsForGapFilter(rows);
    renderSegment(detailRows, detailRows.map(r => metrics(r.안경사ID)));

    if (!S.query && !S.targetIds && $('queryExplanation')) {
      $('queryExplanation').textContent = `현재 필터 결과 ${rows.length}명 · 판매 기준 ${S.baseMonth}월 (${S.baseMonthSource}) · 판매는 안경원(ACC) 단위로 중복 제거`;
    }
  }
  window.render = render;

  function gapQuestionsForPerson(id, productKey = null) {
    return (S.perById.get(id) || []).filter(p => p.gap && (!productKey || questionRelevance(p, productKey) > 0)).sort((a, b) => a.점수 - b.점수);
  }

  function completedEducationForPerson(id, productKey = null) {
    return (S.eduById.get(id) || []).filter(eduDone).filter(r => !productKey || educationRelated(Object.values(r).join(' '), productKey)).map(educationTitle).filter(Boolean);
  }

  function download() {
    if (!window.XLSX) return;
    const rows = rowsForGapFilter(S.filtered || []);
    const productKey = S.gapFilter?.type === 'sales' ? S.gapFilter.key : null;
    const output = rows.map(p => {
      const m = metrics(p.안경사ID);
      const gaps = gapQuestionsForPerson(p.안경사ID, productKey).slice(0, 3);
      const recs = gaps.map(g => findBestEducationForQuestion(g.문항));
      const row = {
        다운로드기준: gapFilterTitle(), 판매기준월: S.baseMonth, 판매기준월출처: S.baseMonthSource,
        안경사ID: p.안경사ID, 안경사명: p.안경사명, 안경원코드: p.안경원코드, 안경원명: p.안경원명,
        지역: p.지역, 연차: p.연차, Tier: p.Tier, 채널: p.채널, 담당영업사원: p.담당영업사원,
        인식Gap수: m.gaps.length, 교육완료율: m.eduRate,
        필요교육: recs.map(r => r.title).join(' | '), 관련이수교육: completedEducationForPerson(p.안경사ID, productKey).join(' | ')
      };
      gaps.forEach((g, i) => {
        row[`이상인식문항${i + 1}`] = g.문항; row[`이상인식문항${i + 1}_점수`] = g.점수; row[`이상인식문항${i + 1}_목표`] = g.목표값;
      });
      ['ast', 'mf', 'max'].forEach(key => {
        const label = FITTING_COLUMNS[key].label;
        const storeSales = rowsFor(p.안경사ID);
        const wearer = countGrowthInfo(storeSales, key, 'wearer');
        const newWearer = countGrowthInfo(storeSales, key, 'new');
        row[`${label}_연환산팩증감`] = m.growths[key].pack;
        row[`${label}_성장구분`] = growthLabel(m.growths[key].info);
        row[`${label}_팩성장률`] = m.growths[key].info.rate;
        row[`${label}_웨어러성장률`] = wearer.rate;
        row[`${label}_신규성장률`] = newWearer.rate;
      });
      return row;
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(output), '대상목록');
    XLSX.writeFile(wb, 'ACUVUE_교육대상.xlsx');
  }

  function resetSmartSearch() {
    S.query = ''; S.targetIds = null; S.gapFilter = null;
    if ($('smartQuery')) $('smartQuery').value = '';
    render();
    if (S.insightsReady) renderInsights();
  }

  function resetFilters() {
    ['regionFilter', 'yearsFilter', 'tierFilter', 'channelFilter', 'repFilter'].forEach(id => { if ($(id)) $(id).value = ''; });
    S.query = ''; S.targetIds = null; S.gapFilter = null;
    if ($('smartQuery')) $('smartQuery').value = '';
    render();
    if (S.insightsReady) renderInsights();
  }

  function view(id) {
    if (id === 'insight' && S.insightsReady) renderInsights();
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === id));
    const searchShell = document.querySelector('.search-shell');
    if (searchShell) searchShell.hidden = (id === 'insight');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast._timer); toast._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function upload(file) {
    if (!window.XLSX) throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    S.master = normMaster(sheet(wb, aliases.master));
    S.content = sheet(wb, aliases.content);
    S.edu = sheet(wb, aliases.edu);
    S.qm = normQm(sheet(wb, aliases.qm));
    S.per25 = normPer(sheet(wb, aliases.per25));
    S.per26 = normPer(sheet(wb, aliases.per26));
    S.per = S.per26;
    S.sales = loadFittingSalesSheet(wb);
    S.rec = sheet(wb, aliases.rec);

    const detected = detectSalesBaseMonth(wb, S.sales);
    S.baseMonth = detected.month; S.baseMonthSource = detected.source;
    if ($('salesBaseMonth')) $('salesBaseMonth').value = String(S.baseMonth);

    rebuildIndexes(); buildFilters();
    S.query = ''; S.targetIds = null; S.gapFilter = null; S.insights = []; S.insightsReady = false;
    render();
    $('insightCards').innerHTML = '<div class="empty-state">데이터가 준비되었습니다. <b>교육 Opportunity 분석</b>을 눌러주세요.</div>';
    $('uploadStatus').textContent = `${file.name} · ${S.master.length}명 / ${dedupeSalesRows(S.sales).length} ACC · 인식25 ${S.per25.length ? 'O' : '-'} / 인식26 ${S.per26.length ? 'O' : '-'}`;
    toast(`업로드 완료 · 판매 기준 ${S.baseMonth}월 · 25→26 인식/신규·웨어러 분석 준비`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(t => { t.onclick = () => view(t.dataset.view); });
    $('workbookInput').onchange = e => e.target.files[0] && upload(e.target.files[0]).catch(err => {
      console.error(err); alert(`업로드 실패\n\n${err.message || err}`); toast('업로드 실패');
    });
    $('runQuery').onclick = () => {
      S.query = $('smartQuery').value || ''; S.targetIds = null; S.gapFilter = null; render(); if (S.insightsReady) renderInsights(); view('segment');
    };
    $('smartQuery').onkeydown = e => { if (e.key === 'Enter') $('runQuery').click(); };
    $('clearQuery').onclick = resetSmartSearch;
    $('resetFilters').onclick = resetFilters;
    document.querySelectorAll('.examples button').forEach(b => {
      b.onclick = () => { S.query = clean(b.dataset.query || b.textContent); $('smartQuery').value = S.query; S.targetIds = null; S.gapFilter = null; render(); if (S.insightsReady) renderInsights(); view('segment'); };
    });
    $('salesBaseMonth').value = String(S.baseMonth);
    $('salesBaseMonth').onchange = () => {
      S.baseMonth = Number($('salesBaseMonth').value) || S.baseMonth;
      S.baseMonthSource = '화면에서 직접 선택';
      S.metricCache = new Map();
      render();
      if (S.insights.length) renderInsights();
      toast(`판매 기준월 ${S.baseMonth}월로 변경`);
    };
    $('downloadResults').onclick = download;
    $('closeProfile').onclick = () => { $('profilePanel').hidden = true; };
    $('refreshInsights').onclick = () => { renderInsights(); toast('교육 Opportunity 분석 완료'); };
    render();
  });
})();
