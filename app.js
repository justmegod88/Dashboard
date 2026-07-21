const CHANNELS = ["다비치", "으뜸", "안경진정성", "I/O"];
const YEARS = ["0~3년", "4~7년", "8~15년", "15년+", "20대", "30대", "40대", "50대", "60대"];
const REGIONS = ["서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종", "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주"];

let rawRows = [];
let crawlRows = [];
let activeDetail = "education";
let aiReport = null;

const $ = (id) => document.getElementById(id);
const pct = (v) => `${Math.round(Number(v) || 0)}%`;
const score = (v) => `${(Number(v) || 0).toFixed(1)}점`;
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, Number(v) || 0));
const avg = (rows, fn) => rows.length ? rows.reduce((s, r) => s + (Number(fn(r)) || 0), 0) / rows.length : 0;
const sum = (rows, fn) => rows.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
const yn = (v) => String(v ?? "").match(/1|Y|YES|TRUE|완료|사용|예|O|시청/i) != null;

const TEMPLATE_HEADERS = [
  "안경사ID", "안경사명", "안경원코드", "안경원명", "지역", "연차", "연령대", "Tier", "멀티포컬전문안경원", "Team", "담당영업사원", "채널",
  "온라인교육횟수", "온디맨드시청횟수", "오프라인교육횟수", "스마트피팅", "AI프로그램", "시뮬레이터",
  "전체렌즈판매", "난시판매", "멀티포컬판매", "맥스판매", "전년동기전체", "전년동기난시", "전년동기멀티포컬", "전년동기맥스",
  "멀티포컬피팅자신감", "피팅시간단축인식", "난시ASD인식", "블루라이트인식", "아큐브추천의향",
  "추천교육1", "추천교육2", "추천교육3", "추천사유", "추천생성일", "발송여부", "발송일", "시청여부", "시청일"
];

const clean = (v) => v === null || v === undefined ? "" : String(v).trim();
const normKey = (v) => clean(v).replace(/[\s_\-()\/]/g, "").toLowerCase();
const num = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
};
const pick = (row, names, fallback = "") => {
  const mapped = {};
  Object.keys(row || {}).forEach((k) => mapped[normKey(k)] = row[k]);
  for (const name of names) {
    const v = mapped[normKey(name)];
    if (v !== undefined && v !== null && clean(v) !== "") return v;
  }
  return fallback;
};
const dateValue = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && window.XLSX?.SSF) {
    const p = XLSX.SSF.parse_date_code(value);
    if (p) return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }
  const s = clean(value);
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
};

function seedSampleData() {
  const names = ["밝은눈안경", "아이편한안경", "렌즈스토리", "비전케어", "오늘안경", "클리어뷰", "스마트렌즈", "하이비전"];
  const opticians = ["김민수", "박지훈", "이서연", "최유진", "정하늘", "오지훈", "한서윤", "윤도현", "강지민", "임수빈", "송현우", "배지아"];
  const rows = [];
  let idx = 1001;
  REGIONS.forEach((region, ri) => {
    const count = region === "서울" ? 28 : region === "경기" ? 32 : region === "부산" ? 22 : 16;
    for (let i = 0; i < count; i++) {
      const seed = (ri + 1) * 100 + i;
      const channel = CHANNELS[seed % 4];
      const years = YEARS[(seed + 1) % 4];
      const edu = 45 + ((seed * 7) % 45);
      const usage = 28 + ((seed * 5) % 52);
      const total = 800 + (seed % 9) * 120;
      rows.push({
        opticianId: `A${String(idx).padStart(4, "0")}`,
        code: `ACV${idx++}`,
        store: `${names[(seed + 2) % names.length]} ${i + 1}`,
        optician: opticians[seed % opticians.length],
        region, channel, years,
        online: edu, ondemand: Math.max(10, edu - 5 + (seed % 17)), offline: Math.max(5, edu - 20 + (seed % 20)),
        smartFitting: usage, aiProgram: Math.max(5, usage - 12 + (seed % 18)), simulator: Math.max(5, usage - 8 + (seed % 22)),
        totalSales: total,
        toricSales: Math.round(total * (.08 + ((seed % 12) / 100))),
        mfSales: Math.round(total * (.06 + (((seed + 3) % 10) / 100))),
        maxSales: Math.round(total * (.04 + (((seed + 5) % 9) / 100))),
        lastTotalSales: 760 + (seed % 8) * 110,
        lastToricSales: Math.round((760 + (seed % 8) * 110) * (.07 + (((seed + 2) % 10) / 100))),
        lastMfSales: Math.round((760 + (seed % 8) * 110) * (.05 + (((seed + 4) % 9) / 100))),
        lastMaxSales: Math.round((760 + (seed % 8) * 110) * (.03 + (((seed + 6) % 8) / 100))),
        mfConfidence: 2.6 + ((seed % 24) / 10),
        timeSaving: 2.7 + (((seed + 3) % 23) / 10),
        asdAwareness: 2.8 + (((seed + 4) % 22) / 10),
        blueAwareness: 2.4 + (((seed + 5) % 25) / 10),
        acuvueRecommend: 2.8 + (((seed + 6) % 22) / 10),
        alcon: seed % 7,
        cooper: (seed + 2) % 5,
        bausch: (seed + 4) % 4,
        rec1: "", rec2: "", rec3: "", recReason: ""
      });
    }
  });
  rawRows = rows;
  crawlRows = [
    { date: "2026-06", region: "서울", brand: "알콘", title: "서울 알콘 렌즈 세미나 게시글", summary: "샘플 데이터입니다. 실제 크롤러 결과가 들어오면 제목, 지역, 브랜드, URL을 표시합니다.", url: "#", source: "sample" },
    { date: "2026-06", region: "부산", brand: "쿠퍼", title: "부산 쿠퍼렌즈 이벤트 게시글", summary: "지역 단위 경쟁사 활동으로 해석합니다.", url: "#", source: "sample" }
  ];
  $("fileStatus").textContent = "샘플 데이터";
}

function makeEmptyRow(id) {
  return {
    opticianId: clean(id), code: "", store: "", optician: "", region: "", channel: "", years: "", tier: "", team: "", salesRep: "",
    online: 0, ondemand: 0, offline: 0, smartFitting: 0, aiProgram: 0, simulator: 0,
    totalSales: 0, toricSales: 0, mfSales: 0, maxSales: 0, lastTotalSales: 0, lastToricSales: 0, lastMfSales: 0, lastMaxSales: 0,
    mfConfidence: 0, timeSaving: 0, asdAwareness: 0, blueAwareness: 0, acuvueRecommend: 0,
    alcon: 0, cooper: 0, bausch: 0,
    rec1: "", rec2: "", rec3: "", recReason: "", sent: "", sentDate: "", watched: "", watchedDate: ""
  };
}

function rowId(src) {
  return clean(pick(src, ["안경사ID", "OpticianID", "ID", "opticianId"])) || clean(pick(src, ["안경원코드"])) + "_" + clean(pick(src, ["안경사명", "안경사"]));
}

function ensure(map, id) {
  const safe = clean(id);
  if (!safe) return null;
  if (!map.has(safe)) map.set(safe, makeEmptyRow(safe));
  return map.get(safe);
}

function mergeBasic(rows, map) {
  rows.forEach((src) => {
    const r = ensure(map, rowId(src));
    if (!r) return;
    r.opticianId = clean(pick(src, ["안경사ID"], r.opticianId));
    r.optician = clean(pick(src, ["안경사명", "안경사", "성명", "이름"], r.optician));
    r.code = clean(pick(src, ["안경원코드", "거래처코드", "스토어코드"], r.code));
    r.store = clean(pick(src, ["안경원명", "안경원", "거래처명", "스토어명"], r.store));
    r.region = clean(pick(src, ["지역", "시도", "권역"], r.region));
    r.years = clean(pick(src, ["연차", "연령대", "나이대"], r.years));
    r.tier = clean(pick(src, ["Tier", "티어", "등급"], r.tier));
    r.team = clean(pick(src, ["Team", "팀"], r.team));
    r.salesRep = clean(pick(src, ["담당영업사원", "담당자", "영업사원"], r.salesRep));
    r.channel = clean(pick(src, ["채널", "Channel"], r.channel));
  });
}

function mergeFlatMetrics(rows, map) {
  rows.forEach((src) => {
    const r = ensure(map, rowId(src));
    if (!r) return;
    mergeBasic([src], map);
    r.online += num(pick(src, ["온라인", "온라인교육횟수", "온라인교육", "Online"]));
    r.ondemand += num(pick(src, ["온디맨드", "온디맨드시청횟수", "VOD", "Ondemand"]));
    r.offline += num(pick(src, ["오프라인", "오프라인교육횟수", "Offline"]));
    r.smartFitting += num(pick(src, ["스마트피팅", "SmartFitting"]));
    r.aiProgram += num(pick(src, ["AI프로그램", "AI 프로그램", "AIProgram"]));
    r.simulator += num(pick(src, ["시뮬레이터", "Simulator"]));
    r.totalSales += num(pick(src, ["전체렌즈판매", "전체판매", "총판매", "TotalSales"]));
    r.toricSales += num(pick(src, ["난시판매", "토릭판매", "AstigmatismSales", "ToricSales"]));
    r.mfSales += num(pick(src, ["멀티포컬판매", "MF판매", "MultifocalSales"]));
    r.maxSales += num(pick(src, ["맥스판매", "MAX판매", "MaxSales"]));
    r.lastTotalSales += num(pick(src, ["전년동기전체", "전년전체", "LY전체"]));
    r.lastToricSales += num(pick(src, ["전년동기난시", "전년난시", "LY난시"]));
    r.lastMfSales += num(pick(src, ["전년동기멀티포컬", "전년MF", "LY멀티포컬"]));
    r.lastMaxSales += num(pick(src, ["전년동기맥스", "전년MAX", "LY맥스"]));
    r.mfConfidence = num(pick(src, ["멀티포컬피팅자신감", "MF피팅자신감", "멀티포컬 자신감"], r.mfConfidence));
    r.timeSaving = num(pick(src, ["피팅시간단축인식", "피팅시간 단축", "시간단축인식"], r.timeSaving));
    r.asdAwareness = num(pick(src, ["난시ASD인식", "ASD인식", "난시 인식"], r.asdAwareness));
    r.blueAwareness = num(pick(src, ["블루라이트인식", "블루라이트"], r.blueAwareness));
    r.acuvueRecommend = num(pick(src, ["아큐브추천의향", "추천의향", "1순위추천율", "아큐브 1순위 추천"], r.acuvueRecommend));
    r.rec1 = clean(pick(src, ["추천교육1", "추천1", "1순위추천교육"], r.rec1));
    r.rec2 = clean(pick(src, ["추천교육2", "추천2", "2순위추천교육"], r.rec2));
    r.rec3 = clean(pick(src, ["추천교육3", "추천3", "3순위추천교육"], r.rec3));
    r.recReason = clean(pick(src, ["추천사유", "사유", "추천근거"], r.recReason));
    r.sent = clean(pick(src, ["발송여부", "발송상태", "발송"], r.sent));
    r.sentDate = dateValue(pick(src, ["발송일", "발송일자"], r.sentDate));
    r.watched = clean(pick(src, ["시청여부", "시청상태", "열람여부"], r.watched));
    r.watchedDate = dateValue(pick(src, ["시청일", "시청일자", "열람일"], r.watchedDate));
  });
}

function mergeEducationRows(rows, map) {
  rows.forEach((src) => {
    const r = ensure(map, rowId(src));
    if (!r) return;
    const type = clean(pick(src, ["교육유형", "교육형태", "교육채널", "채널", "수강방식", "구분"]));
    if (/offline|오프라인|현장/i.test(type)) r.offline += 1;
    else if (/ondemand|온디맨드|vod|시청/i.test(type)) r.ondemand += 1;
    else r.online += 1;
  });
}

function sheetName(workbook, aliases) {
  return workbook.SheetNames.find((name) => aliases.some((a) => normKey(name).includes(normKey(a)))) || "";
}
function sheetRows(workbook, name) {
  return name && workbook.Sheets[name] ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false }) : [];
}

function normalizeWorkbook(workbook) {
  const map = new Map();
  const basic = sheetName(workbook, ["안경사기본정보", "기본정보", "basic"]);
  const education = sheetName(workbook, ["교육참여이력", "교육이력", "교육참여"]);
  const fitting = sheetName(workbook, ["피팅", "판매", "sales", "fitting"]);
  const survey = sheetName(workbook, ["인식조사", "설문", "survey"]);
  const recommendation = sheetName(workbook, ["AI추천결과", "추천결과", "추천"]);
  const send = sheetName(workbook, ["발송요청관리", "발송결과", "발송"]);

  mergeBasic(sheetRows(workbook, basic), map);
  mergeEducationRows(sheetRows(workbook, education), map);
  mergeFlatMetrics(sheetRows(workbook, fitting), map);
  mergeFlatMetrics(sheetRows(workbook, survey), map);
  mergeFlatMetrics(sheetRows(workbook, recommendation), map);
  mergeFlatMetrics(sheetRows(workbook, send), map);

  if (!map.size) {
    workbook.SheetNames.forEach((name) => mergeFlatMetrics(sheetRows(workbook, name), map));
  }
  return Array.from(map.values()).map(finalizeRow);
}

function finalizeRow(r) {
  r.channel = r.channel || guessChannel(r.store);
  r.years = r.years || "-";
  if (!r.online && !r.ondemand && !r.offline) {
    r.online = num(r.online); r.ondemand = num(r.ondemand); r.offline = num(r.offline);
  }
  r.educationScore = Math.min(100, r.online * 10 + r.ondemand * 5 + r.offline * 15);
  if (!r.rec1 && r.mfConfidence > 0 && r.mfConfidence < 3.2) r.rec1 = "멀티포컬 기초";
  if (!r.rec1 && r.asdAwareness > 0 && r.asdAwareness < 3.2) r.rec1 = "ASD 난시 교육";
  if (!r.rec1 && r.blueAwareness > 0 && r.blueAwareness < 3.2) r.rec1 = "MAX 블루라이트";
  if (!r.recReason && r.rec1) r.recReason = "업로드 데이터 기반 자동 추천";
  return r;
}

function guessChannel(store) {
  const s = clean(store);
  if (/다비치/i.test(s)) return "다비치";
  if (/으뜸/i.test(s)) return "으뜸";
  if (/진정성/i.test(s)) return "안경진정성";
  return "I/O";
}

async function handleFileUpload(file) {
  if (!file) return;
  try {
    if (/\.csv$/i.test(file.name)) {
      const text = await file.text();
      const rows = parseCsv(text);
      const map = new Map();
      mergeFlatMetrics(rows, map);
      rawRows = Array.from(map.values()).map(finalizeRow);
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      rawRows = normalizeWorkbook(workbook);
    }
    $("fileStatus").textContent = `${file.name} 업로드 완료`;
    refreshFilterOptions();
    renderAll();
  } catch (e) {
    console.error(e);
    alert("파일을 읽는 중 오류가 발생했습니다. 엑셀 컬럼명과 시트 구조를 확인해 주세요.");
  }
}

function refreshFilterOptions() {
  fillSelect("regionFilter", uniqueValues(rawRows, "region", REGIONS));
  fillSelect("channelFilter", uniqueValues(rawRows, "channel", CHANNELS));
  fillSelect("yearFilter", uniqueValues(rawRows, "years", YEARS));
}
function uniqueValues(rows, key, fallback) {
  const vals = [...new Set(rows.map((r) => clean(r[key])).filter(Boolean))].sort();
  return vals.length ? vals : fallback;
}
function fillSelect(id, values) {
  const el = $(id);
  const current = el.value || "all";
  el.innerHTML = '<option value="all">전체</option>';
  values.forEach((v) => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    el.appendChild(o);
  });
  el.value = [...el.options].some((o) => o.value === current) ? current : "all";
}

function metricEducation(r) { return r.educationScore !== undefined ? r.educationScore : (+r.online + +r.ondemand + +r.offline) / 3; }
function metricUsage(r) { return (+r.smartFitting + +r.aiProgram + +r.simulator) / 3; }
function avgPerceptionScore(r) {
  const vals = [r.mfConfidence, r.timeSaving, r.asdAwareness, r.blueAwareness, r.acuvueRecommend].map(Number).filter((v) => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
function metricPerception(r) { return avgPerceptionScore(r) / 5 * 100; }
function toricShare(r) { return +r.totalSales ? +r.toricSales / +r.totalSales * 100 : 0; }
function mfShare(r) { return +r.totalSales ? +r.mfSales / +r.totalSales * 100 : 0; }
function maxShare(r) { return +r.totalSales ? +r.maxSales / +r.totalSales * 100 : 0; }
function functionalPerformance(r) { return (toricShare(r) + mfShare(r) + maxShare(r)) / 3; }
function lastFunctionalPerformance(r) {
  const t = +r.lastTotalSales || 1;
  return (+r.lastToricSales / t * 100 + +r.lastMfSales / t * 100 + +r.lastMaxSales / t * 100) / 3;
}
function competitorCount(r) { return +(r.alcon || 0) + +(r.cooper || 0) + +(r.bausch || 0); }

function filteredRows() {
  const q = $("searchBox").value.trim().toLowerCase();
  const region = $("regionFilter").value;
  const channel = $("channelFilter").value;
  const years = $("yearFilter").value;
  return rawRows.filter((r) => {
    const text = `${r.opticianId} ${r.code} ${r.store} ${r.optician || ""}`.toLowerCase();
    return (!q || text.includes(q)) &&
      (region === "all" || r.region === region) &&
      (channel === "all" || r.channel === channel) &&
      (years === "all" || r.years === years);
  });
}
function filteredCrawls() {
  const region = $("regionFilter").value;
  return crawlRows.filter((r) => region === "all" || r.region === region);
}
function statusBy(v, b, reverse = false) {
  if (!Number.isFinite(b) || b === 0) b = reverse ? 1 : 50;
  if (reverse) return v <= b ? "green" : v <= b * 1.25 ? "amber" : "red";
  return v >= b ? "green" : v >= b * .85 ? "amber" : "red";
}
function setLight(id, cls) { $(id).className = `light ${cls}`; }
function renderAll() { const rows = filteredRows(); renderKpis(rows); renderInsight(rows); renderDetail(rows); renderTable(rows); renderCrawlerList(); }
function renderKpis(rows) {
  const base = rawRows;
  const edu = avg(rows, metricEducation), use = avg(rows, metricUsage), per = avg(rows, avgPerceptionScore), perf = avg(rows, functionalPerformance), comp = avg(rows, competitorCount);
  $("kpiStores").textContent = new Set(rows.map((r) => r.opticianId || `${r.code}_${r.optician}`)).size.toLocaleString("ko-KR");
  $("kpiEducation").textContent = pct(edu);
  $("kpiUsage").textContent = pct(use);
  $("kpiPerception").textContent = score(per);
  $("kpiPerformance").textContent = pct(perf);
  $("kpiCompetitor").textContent = Math.round(comp) + "건";
  setLight("lightEducation", statusBy(edu, avg(base, metricEducation)));
  setLight("lightUsage", statusBy(use, avg(base, metricUsage)));
  setLight("lightPerception", statusBy(per, avg(base, avgPerceptionScore)));
  setLight("lightPerformance", statusBy(perf, avg(base, functionalPerformance)));
  setLight("lightCompetitor", statusBy(comp, avg(base, competitorCount), true));
}
function classifyGroup(rows) {
  const edu = avg(rows, metricEducation), use = avg(rows, metricUsage), per = avg(rows, avgPerceptionScore), perf = avg(rows, functionalPerformance), comp = avg(rows, competitorCount);
  if (comp >= 8 && (perf < 15 || use < 45)) return ["risk", "경쟁사 대응"];
  if (edu >= 70 && use >= 60 && per >= 4 && perf >= 16) return ["good", "Best Practice"];
  if (edu >= 65 && use < 45) return ["growth", "교육 후 실행 전환 필요"];
  if ((per > 0 && per < 3.2) || (perf > 0 && perf < 12)) return ["risk", "Follow-up 우선"];
  return ["watch", "관찰/선택 성장"];
}
function listItems(items, limit = 5) { return (items || []).filter(Boolean).slice(0, limit).map((x) => `<li>${x}</li>`).join(""); }
function aiList(key) { if (!aiReport) return []; const v = aiReport[key]; return Array.isArray(v) ? v : (v ? [v] : []); }
function renderInsight(rows) {
  const [cls, label] = classifyGroup(rows);
  $("insightBadge").className = `status ${cls}`;
  $("insightBadge").textContent = label;
  $("insightSub").textContent = `대상 ${rows.length.toLocaleString("ko-KR")}명 안경사 기준`;
  const edu = avg(rows, metricEducation), use = avg(rows, metricUsage), per = avg(rows, avgPerceptionScore), perf = avg(rows, functionalPerformance), blue = avg(rows, (r) => r.blueAwareness), max = avg(rows, maxShare), mfConf = avg(rows, (r) => r.mfConfidence), mf = avg(rows, mfShare), asd = avg(rows, (r) => r.asdAwareness), toric = avg(rows, toricShare), comp = avg(rows, competitorCount);
  const baseEdu = avg(rawRows, metricEducation), baseUse = avg(rawRows, metricUsage), basePerf = avg(rawRows, functionalPerformance), baseComp = avg(rawRows, competitorCount);
  const ruleInterpretation = [`현재 필터 기준 교육 참여도 ${pct(edu)}, 디지털 활용도 ${pct(use)}, 안경사 인식 ${score(per)}, 기능성렌즈 성과 ${pct(perf)}입니다.`];
  const ruleActions = ["Follow-up 리스트에서 우선순위가 높은 안경원/안경사 개인을 먼저 확인하고 담당자별 연락 대상을 배정하세요."];
  if (edu >= baseEdu && use < baseUse) ruleInterpretation.push("교육 도달률은 평균 이상이나 실제 피팅 프로그램 활용 전환이 낮아, 교육 이후 실행 관리가 핵심 병목입니다.");
  if (use >= baseUse && perf < basePerf) ruleInterpretation.push("프로그램 활용은 이루어지고 있지만 기능성렌즈 성과로 연결되는 상담/제품 추천 단계가 약합니다.");
  if (blue > 0 && (blue < 3.2 || max < avg(rawRows, maxShare))) ruleInterpretation.push(`블루라이트 인식(${score(blue)})과 MAX 비중(${pct(max)})을 함께 보면 MAX 메시지 보강이 필요합니다.`);
  if (mfConf > 0 && (mfConf < 3.2 || mf < avg(rawRows, mfShare))) ruleInterpretation.push(`멀티포컬 자신감(${score(mfConf)}) 또는 MF 비중(${pct(mf)})이 낮아 안경사 개인별 MF 피팅 코칭 대상이 존재합니다.`);
  if (asd > 0 && (asd < 3.2 || toric < avg(rawRows, toricShare))) ruleInterpretation.push(`ASD 인식(${score(asd)})과 난시 비중(${pct(toric)}) 기준으로 난시 상담 메시지 강화가 필요합니다.`);
  if (comp > baseComp) ruleInterpretation.push("경쟁사 활동이 평균보다 높아 해당 지역/채널 안경사에게 차별화 콘텐츠를 우선 제공할 필요가 있습니다.");
  if (use < baseUse) ruleActions.push("교육 이수자 중 프로그램 활용률이 낮은 안경사에게 스마트피팅/AI 활용 리마인드 교육을 발송하세요.");
  if (max < avg(rawRows, maxShare) || blue < 3.2) ruleActions.push("MAX/블루라이트 인식이 낮은 안경사에게 소비자 상담용 비교 메시지와 시뮬레이터 링크를 제공하세요.");
  if (mf < avg(rawRows, mfShare) || mfConf < 3.2) ruleActions.push("MF 자신감이 낮은 안경사에게 멀티포컬 기초 피팅 콘텐츠와 실습형 Follow-up을 연결하세요.");
  ruleActions.push("4주 후 동일 안경사ID 기준으로 교육 참여 → 프로그램 활용 → 기능성렌즈 성과 전환을 재확인하세요.");
  const aiInterpretation = aiList("overall_interpretation"), aiActions = aiList("next_actions");
  const aiBadge = aiReport ? `<span class="ai-source">GPT 리포트 연결됨 · ${aiReport.source || "AI"}</span>` : `<span class="ai-source muted">GPT 리포트 없음 · 규칙 분석만 표시</span>`;
  $("mainInsight").innerHTML = `<div class="insight-split"><article class="insight-section"><h3>전체 해석 <small>로직 + GPT</small></h3>${aiBadge}<ul>${listItems([...ruleInterpretation, ...aiInterpretation], 7)}</ul></article><article class="insight-section"><h3>Next Action <small>로직 + GPT</small></h3>${aiBadge}<ul>${listItems([...ruleActions, ...aiActions], 7)}</ul></article></div>`;
}
function recommendForRow(r) {
  const rec = [];
  const nMf = avg(rawRows, mfShare), nMax = avg(rawRows, maxShare), nT = avg(rawRows, toricShare);
  if (r.rec1) rec.push({ code: "AI", name: r.rec1, reason: r.recReason || "업로드 추천 결과" });
  if (+r.blueAwareness < 3.2 && +r.blueAwareness > 0 || maxShare(r) < nMax * .8) rec.push({ code: "E04", name: "MAX 블루라이트", reason: "블루라이트 인식 또는 MAX 판매 비중 낮음" });
  if (+r.mfConfidence < 3.2 && +r.mfConfidence > 0 || mfShare(r) < nMf * .8) rec.push({ code: "E01", name: "멀티포컬 기초", reason: "멀티포컬 자신감 또는 판매 비중 낮음" });
  if (+r.asdAwareness < 3.2 && +r.asdAwareness > 0 || toricShare(r) < nT * .8) rec.push({ code: "E03", name: "ASD 난시 교육", reason: "난시 ASD 인식 또는 난시 판매 비중 낮음" });
  if (metricUsage(r) < 40) rec.push({ code: "E02", name: "스마트피팅 활용", reason: "피팅 프로그램 활용도 낮음" });
  if (+r.acuvueRecommend < 3.5 && +r.acuvueRecommend > 0) rec.push({ code: "E05", name: "아큐브 추천 상담", reason: "아큐브 추천 의향 낮음" });
  return rec.length ? rec : [{ code: "E00", name: "아큐브 핵심 제품 업데이트", reason: "기본 제품 정보 업데이트" }];
}
function metricRow(label, value, color = "") { return `<div class="metric-row"><span>${label}</span><div class="bar ${color}"><i style="width:${clamp(value)}%"></i></div><b>${pct(value)}</b></div>`; }
function detailGroups(rows) {
  return {
    education: { title: "교육 참여도", desc: "온라인/온디맨드/오프라인 교육 참여 현황", items: [["교육 참여 점수", avg(rows, metricEducation), "green"], ["온라인 교육", avg(rows, (r) => r.online), ""], ["온디맨드 시청", avg(rows, (r) => r.ondemand), ""], ["오프라인 교육", avg(rows, (r) => r.offline), "amber"]] },
    usage: { title: "디지털 활용", desc: "스마트피팅/AI 프로그램/시뮬레이터 활용 현황", items: [["스마트피팅", avg(rows, (r) => r.smartFitting), "green"], ["AI 프로그램", avg(rows, (r) => r.aiProgram), ""], ["시뮬레이터", avg(rows, (r) => r.simulator), "amber"]] },
    perception: { title: "안경사 인식", desc: "안경사 개인의 제품/피팅 인식 평균", items: [["멀티포컬 피팅 자신감", avg(rows, (r) => r.mfConfidence) / 5 * 100, "green"], ["피팅 시간 단축 인식", avg(rows, (r) => r.timeSaving) / 5 * 100, ""], ["난시 ASD 인식", avg(rows, (r) => r.asdAwareness) / 5 * 100, "amber"], ["블루라이트 인식", avg(rows, (r) => r.blueAwareness) / 5 * 100, ""], ["아큐브 추천 의향", avg(rows, (r) => r.acuvueRecommend) / 5 * 100, "green"]] },
    performance: { title: "기능성렌즈 성과", desc: "난시/MF/MAX 판매 비중과 전년 대비 성과", items: [["난시 판매 비중", avg(rows, toricShare), "green"], ["멀티포컬 판매 비중", avg(rows, mfShare), ""], ["MAX 판매 비중", avg(rows, maxShare), "amber"], ["전년 대비 성과", avg(rows, (r) => functionalPerformance(r) - lastFunctionalPerformance(r)) + 50, ""]] },
    competitor: { title: "경쟁사 활동", desc: "공개 게시글 기반 경쟁사 활동 모니터링", blocks: ["알콘", "쿠퍼", "바슈롬"].map((b, i) => { const key = ["alcon", "cooper", "bausch"][i]; return { label: b, value: sum(rows, (r) => r[key]).toLocaleString("ko-KR") + "건", note: "공개 게시글 기반 모니터링" }; }) }
  };
}
function renderDetail(rows) {
  const groups = detailGroups(rows), g = groups[activeDetail] || groups.education;
  document.querySelectorAll(".kpi.clickable").forEach((card) => card.classList.toggle("active", card.dataset.detail === activeDetail));
  $("detailView").innerHTML = `<article class="detail-group selected-detail"><div class="selected-detail-head"><div><h3>${g.title}</h3><p>${g.desc || ""}</p></div><span class="detail-hint">KPI 카드 클릭으로 전환</span></div>${g.items ? g.items.map((x) => metricRow(x[0], x[1], x[2])).join("") : g.blocks.map((x) => `<div class="metric-block"><span>${x.label}</span><strong>${x.value}</strong><small>${x.note}</small></div>`).join("")}</article>`;
}
function renderTable(rows) {
  const nat = avg(rawRows, functionalPerformance);
  $("storeTable").innerHTML = rows.slice(0, 300).map((r) => {
    const rec = recommendForRow(r), [cls, label] = classifyGroup([r]), perf = functionalPerformance(r);
    return `<tr><td>${r.opticianId || "-"}</td><td>${r.code || "-"}</td><td>${r.store || "-"}</td><td>${r.optician || "-"}</td><td>${r.region || "-"}</td><td>${r.channel || "-"}</td><td>${r.years || "-"}</td><td>${pct(metricEducation(r))}</td><td>${pct(metricUsage(r))}</td><td>${score(avgPerceptionScore(r))}</td><td>${pct(perf)} <small>${perf >= nat ? "평균↑" : "평균↓"}</small></td><td>${rec[0] ? `${rec[0].code} ${rec[0].name}` : "-"}</td><td><span class="pill ${cls}">${label}</span></td></tr>`;
  }).join("");
}
function renderCrawlReport(rows) {
  const total = rows.length, brands = ["알콘", "쿠퍼", "바슈롬"];
  const brandCounts = brands.map((b) => ({ brand: b, count: rows.filter((r) => String(r.brand).includes(b)).length })).sort((a, b) => b.count - a.count);
  const topBrand = brandCounts[0]?.count ? `${brandCounts[0].brand} ${brandCounts[0].count}건` : "특정 브랜드 집중 없음";
  const regions = [...rows.reduce((m, r) => m.set(r.region, (m.get(r.region) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]} ${x[1]}건`).join(", ") || "지역 데이터 없음";
  const weekly = aiReport?.weekly_report || `총 ${total.toLocaleString("ko-KR")}건의 경쟁사/안경원 현장 활동이 수집되었습니다. 주요 브랜드는 ${topBrand}, 주요 지역은 ${regions}입니다.`;
  const acts = aiReport?.competitor_actions || ["경쟁사 활동이 많은 지역은 MAX/ASD/멀티포컬 콘텐츠를 우선 배포하세요.", "프로모션 게시글이 많은 경우 소비자 상담용 차별화 메시지를 강화하세요.", "교육/세미나 활동이 많은 경우 안경사 대상 전문성 콘텐츠로 대응하세요."];
  $("crawlReport").innerHTML = `<div class="report-card"><h3>AI 주간 리포트 <small>경쟁사 크롤링 + GPT</small></h3><p>${weekly}</p><ul>${acts.slice(0, 4).map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
}
function renderCrawlerList() {
  const rows = filteredCrawls();
  renderCrawlReport(rows);
  $("competitorList").innerHTML = rows.map((r, i) => `<div class="crawl-item" data-i="${i}"><strong>${r.title || `${r.region} ${r.brand} 활동`}</strong><small>${r.date || ""} · ${r.region || ""} · ${r.brand || ""}</small><div class="crawl-tags"><span>${r.source || "crawler"}</span><span>${r.url && r.url !== "#" ? "원문 있음" : "요약"}</span></div></div>`).join("") || `<p class="note">경쟁사 크롤링 결과가 없습니다.</p>`;
  document.querySelectorAll(".crawl-item").forEach((el) => el.onclick = () => openCrawl(rows[+el.dataset.i]));
}
function openCrawl(r) {
  $("modalTitle").textContent = r.title || `${r.region} ${r.brand} 활동`;
  $("modalMeta").textContent = `${r.date || "-"} · ${r.region || "-"} · ${r.brand || "-"} · ${r.source || "crawler"}`;
  $("modalSummary").textContent = r.summary || "상세 요약이 없습니다.";
  $("modalLink").href = r.url || "#";
  $("crawlModal").classList.add("show");
}
function csvEscape(v) { return `"${String(v ?? "").replaceAll('"', '""')}"`; }
function downloadCsv(name, rows) {
  const head = ["안경사ID", "안경원코드", "안경원명", "안경사", "지역", "채널", "연차/연령대", "추천교육코드", "추천교육명", "추천사유", "교육", "활용", "인식", "성과"];
  const lines = [head.map(csvEscape).join(",")];
  rows.forEach((r) => recommendForRow(r).forEach((rec) => lines.push([r.opticianId, r.code, r.store, r.optician || "", r.region, r.channel, r.years, rec.code, rec.name, rec.reason, pct(metricEducation(r)), pct(metricUsage(r)), score(avgPerceptionScore(r)), pct(functionalPerformance(r))].map(csvEscape).join(","))));
  download(name, "\ufeff" + lines.join("\n"));
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function template() { download("안경사_교육추천_대시보드_업로드템플릿.csv", "\ufeff" + TEMPLATE_HEADERS.map(csvEscape).join(",") + "\n"); }
function parseCsv(t) {
  const out = [];
  let row = [], cell = "", quoted = false;
  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { if (row.length || cell) { pushCell(); out.push(row); } row = []; };
  for (let i = 0; i < t.length; i++) {
    const ch = t[i], next = t[i + 1];
    if (ch === '"') { if (quoted && next === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) pushCell();
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && next === "\n") i++; pushRow(); }
    else cell += ch;
  }
  pushRow();
  if (out.length < 2) return [];
  const headers = out[0].map((h) => clean(h).replace(/^\ufeff/, ""));
  return out.slice(1).filter((r) => r.some((c) => clean(c))).map((r) => { const o = {}; headers.forEach((h, i) => o[h] = r[i] ?? ""); return o; });
}
async function loadCompetitorCsv() {
  try {
    const res = await fetch("./output/Competitor_Activity.csv?ts=" + Date.now());
    if (!res.ok) return;
    const txt = await res.text();
    const rows = parseCsv(txt);
    crawlRows = rows.map((r) => ({ date: r["월"] || r.date, region: r["지역"] || r.region, brand: r["브랜드"] || r.brand || bestBrand(r), title: r["제목"] || r.title, summary: r["요약"] || r.summary, url: r["URL"] || r.url, source: r["출처"] || r.source || "crawler", alcon: +(r["알콘"] || 0), cooper: +(r["쿠퍼"] || 0), bausch: +(r["바슈롬"] || 0) }));
    applyCompetitor(crawlRows); renderAll();
  } catch (e) { console.warn(e); }
}
function bestBrand(r) { if (+r["알콘"]) return "알콘"; if (+r["쿠퍼"]) return "쿠퍼"; if (+r["바슈롬"]) return "바슈롬"; return "경쟁사"; }
function applyCompetitor(rows) {
  const map = new Map();
  rows.forEach((r) => { const prev = map.get(r.region) || { alcon: 0, cooper: 0, bausch: 0 }; prev.alcon += +(r.alcon || 0); prev.cooper += +(r.cooper || 0); prev.bausch += +(r.bausch || 0); map.set(r.region, prev); });
  rawRows = rawRows.map((r) => map.has(r.region) ? { ...r, ...map.get(r.region) } : r);
}
function topRows(rows, mode, limit = 8) {
  const basePerf = avg(rawRows, functionalPerformance);
  const scored = rows.map((r) => {
    const edu = metricEducation(r), use = metricUsage(r), perf = functionalPerformance(r), per = avgPerceptionScore(r), comp = competitorCount(r), growth = (edu * .25 + use * .25 + per / 5 * 100 * .2 + Math.max(0, perf - basePerf + 20) * .3), risk = (Math.max(0, 65 - edu) * .2 + Math.max(0, 55 - use) * .25 + Math.max(0, 3.5 - per) * 18 + Math.max(0, 14 - perf) * 2 + comp * 2);
    return { r, edu, use, perf, per, comp, growth, risk };
  });
  if (mode === "growth") scored.sort((a, b) => b.growth - a.growth);
  else if (mode === "execution-gap") scored.sort((a, b) => (b.edu - b.perf) - (a.edu - a.perf));
  else scored.sort((a, b) => b.risk - a.risk);
  return scored.slice(0, limit);
}
function rowsToAnswer(items, mode) {
  if (!items.length) return "현재 필터 조건에서 분석할 데이터가 없습니다.";
  const title = mode === "growth" ? "성장 가능 안경원/안경사" : "위험 또는 Follow-up 우선 안경원/안경사";
  return `<strong>${title}</strong><ol>${items.map((x) => `<li><b>${x.r.store}</b> / ${x.r.optician || "-"} (${x.r.region}, ${x.r.channel}) · 교육 ${pct(x.edu)}, 활용 ${pct(x.use)}, 인식 ${score(x.per)}, 성과 ${pct(x.perf)}, 경쟁사 ${Math.round(x.comp)}건</li>`).join("")}</ol>`;
}
function answerCopilot() {
  const q = $("copilotQuestion")?.value.trim() || "";
  const rows = filteredRows();
  if (!$("copilotAnswer")) return;
  if (!q) { $("copilotAnswer").innerHTML = "질문을 입력해 주세요."; return; }
  let html = "";
  if (/성장|가능|우수|top|탑/i.test(q)) html = rowsToAnswer(topRows(rows, "growth"), "growth");
  else if (/교육.*성과|성과.*낮|전환|실행/i.test(q)) html = rowsToAnswer(topRows(rows, "execution-gap"), "execution-gap");
  else if (/경쟁|알콘|쿠퍼|바슈롬/i.test(q)) {
    const regionSummary = [...filteredCrawls().reduce((m, r) => m.set(r.region, (m.get(r.region) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => `${x[0]} ${x[1]}건`).join(", ") || "경쟁사 데이터 없음";
    html = `<strong>경쟁사 관점 요약</strong><p>${aiReport?.weekly_report || "AI 리포트가 없어서 크롤링 건수 기준으로만 답변합니다."}</p><p>주요 지역: ${regionSummary}</p>`;
  } else html = rowsToAnswer(topRows(rows, "risk"), "risk");
  const aiExtra = aiReport?.summary ? `<div class="copilot-ai-note"><b>GPT 리포트 참고:</b> ${aiReport.summary}</div>` : "";
  $("copilotAnswer").innerHTML = html + aiExtra;
}
async function loadAiReport() {
  try { const res = await fetch("./output/ai_report.json?ts=" + Date.now()); if (!res.ok) return; aiReport = await res.json(); renderAll(); } catch (e) { console.warn("AI report load failed", e); }
}
function init() {
  seedSampleData();
  refreshFilterOptions();
  document.querySelectorAll(".kpi.clickable").forEach((card) => {
    card.addEventListener("click", () => { activeDetail = card.dataset.detail; renderDetail(filteredRows()); });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activeDetail = card.dataset.detail; renderDetail(filteredRows()); } });
  });
  ["searchBox", "regionFilter", "channelFilter", "yearFilter"].forEach((id) => $(id).addEventListener("input", renderAll));
  $("fileInput").addEventListener("change", (e) => handleFileUpload(e.target.files[0]));
  $("clearBtn").onclick = () => { $("searchBox").value = ""; $("regionFilter").value = "all"; $("channelFilter").value = "all"; $("yearFilter").value = "all"; renderAll(); };
  $("resetBtn").onclick = () => { seedSampleData(); refreshFilterOptions(); renderAll(); loadCompetitorCsv(); };
  $("downloadTemplate").onclick = template;
  $("downloadRecommended").onclick = () => downloadCsv("추천교육대상.csv", filteredRows());
  $("exportFiltered").onclick = () => downloadCsv("현재결과_추천교육대상.csv", filteredRows());
  $("modalClose").onclick = () => $("crawlModal").classList.remove("show");
  $("crawlModal").onclick = (e) => { if (e.target.id === "crawlModal") $("crawlModal").classList.remove("show"); };
  if ($("copilotAsk")) $("copilotAsk").onclick = answerCopilot;
  if ($("copilotQuestion")) $("copilotQuestion").addEventListener("keydown", (e) => { if (e.key === "Enter") answerCopilot(); });
  renderAll();
  loadCompetitorCsv();
  loadAiReport();
}
document.addEventListener("DOMContentLoaded", init);
