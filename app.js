const TARGET_MS = 0.22;
const HOSPITAL_API_BASE = "https://apis.data.go.kr/B551182/hospInfoServicev2";
const HIRA_KEY_STORAGE = "pciDashboard.hiraServiceKey";
const HIRA_CODE_STORAGE = "pciDashboard.hiraSt5Cd";
const HIRA_YEAR_STORAGE = "pciDashboard.hiraYear";
const TG_PAYLOAD_STORAGE = "pciDashboard.tgPayload.v1";
let marketDataSource = "sample";
let hospitalAutoRefresh = true;
let selectedDistrictKey = null;
let currentHospitalRows = [];
let currentHospitalRegionId = null;
let hiraMarketRows = [];
let marketProvinceSummary = new Map();
let marketDistrictSummary = new Map();

const regions = [
  { id: "gangwon", name: "Gangwon", label: "강원", territory: "Gangwon", sidoCd: "320000", market: 3100, ourUnits: 420, row: 1, col: 4 },
  { id: "seoul", name: "Seoul", label: "서울", territory: "Capital", sidoCd: "110000", market: 28500, ourUnits: 5200, row: 2, col: 3 },
  { id: "gyeonggi", name: "Gyeonggi", label: "경기", territory: "Capital", sidoCd: "310000", market: 24400, ourUnits: 3100, row: 2, col: 4 },
  { id: "incheon", name: "Incheon", label: "인천", territory: "Capital", sidoCd: "230000", market: 7600, ourUnits: 890, row: 2, col: 2 },
  { id: "chungnam", name: "Chungnam", label: "충남", territory: "Chungcheong", sidoCd: "340000", market: 4500, ourUnits: 570, row: 3, col: 2 },
  { id: "sejong", name: "Sejong", label: "세종", territory: "Chungcheong", sidoCd: "410000", market: 900, ourUnits: 120, row: 3, col: 3 },
  { id: "daejeon", name: "Daejeon", label: "대전", territory: "Chungcheong", sidoCd: "250000", market: 3900, ourUnits: 700, row: 3, col: 4 },
  { id: "chungbuk", name: "Chungbuk", label: "충북", territory: "Chungcheong", sidoCd: "330000", market: 3500, ourUnits: 520, row: 3, col: 5 },
  { id: "jeonbuk", name: "Jeonbuk", label: "전북", territory: "Honam", sidoCd: "350000", market: 3900, ourUnits: 510, row: 4, col: 2 },
  { id: "gwangju", name: "Gwangju", label: "광주", territory: "Honam", sidoCd: "240000", market: 4100, ourUnits: 620, row: 5, col: 2 },
  { id: "jeonnam", name: "Jeonnam", label: "전남", territory: "Honam", sidoCd: "360000", market: 3300, ourUnits: 440, row: 6, col: 2 },
  { id: "daegu", name: "Daegu", label: "대구", territory: "Southeast", sidoCd: "220000", market: 6800, ourUnits: 950, row: 4, col: 5 },
  { id: "gyeongbuk", name: "Gyeongbuk", label: "경북", territory: "Southeast", sidoCd: "370000", market: 5200, ourUnits: 650, row: 4, col: 6 },
  { id: "busan", name: "Busan", label: "부산", territory: "Southeast", sidoCd: "210000", market: 9100, ourUnits: 1400, row: 6, col: 6 },
  { id: "ulsan", name: "Ulsan", label: "울산", territory: "Southeast", sidoCd: "260000", market: 2600, ourUnits: 300, row: 5, col: 6 },
  { id: "gyeongnam", name: "Gyeongnam", label: "경남", territory: "Southeast", sidoCd: "380000", market: 6200, ourUnits: 780, row: 6, col: 5 },
  { id: "jeju", name: "Jeju", label: "제주", territory: "Jeju", sidoCd: "390000", market: 1200, ourUnits: 160, row: 7, col: 3 },
];

const mapShapes = {
  gangwon: { d: "M342 74 L476 96 L548 180 L525 283 L438 287 L377 235 L330 152 Z", x: 438, y: 183, valueY: 210 },
  gyeonggi: { d: "M210 138 L330 132 L377 235 L326 305 L214 287 L164 218 Z", x: 265, y: 236, valueY: 263 },
  seoul: { d: "M248 205 L288 199 L306 226 L283 254 L244 244 L232 219 Z", x: 269, y: 229, valueY: 252 },
  incheon: { d: "M155 211 L218 196 L232 221 L219 268 L162 266 L126 239 Z", x: 178, y: 236, valueY: 259 },
  chungbuk: { d: "M326 305 L438 287 L460 372 L393 445 L292 412 L286 334 Z", x: 371, y: 367, valueY: 394 },
  chungnam: { d: "M166 294 L286 334 L292 412 L214 482 L131 427 L111 342 Z", x: 203, y: 387, valueY: 414 },
  sejong: { d: "M252 346 L287 352 L292 388 L259 404 L232 381 Z", x: 262, y: 379, valueY: 401 },
  daejeon: { d: "M268 399 L305 415 L306 455 L264 470 L235 442 Z", x: 273, y: 437, valueY: 459 },
  gyeongbuk: { d: "M460 372 L546 354 L585 449 L544 574 L432 558 L393 445 Z", x: 492, y: 475, valueY: 502 },
  daegu: { d: "M442 480 L496 476 L515 521 L478 554 L428 533 L412 502 Z", x: 465, y: 517, valueY: 540 },
  jeonbuk: { d: "M214 482 L306 455 L369 510 L343 596 L227 607 L168 546 Z", x: 273, y: 538, valueY: 565 },
  gwangju: { d: "M214 623 L256 610 L284 640 L266 678 L219 676 L195 646 Z", x: 239, y: 649, valueY: 671 },
  jeonnam: { d: "M134 566 L227 607 L219 676 L288 692 L252 754 L133 727 L82 650 Z", x: 178, y: 669, valueY: 696 },
  gyeongnam: { d: "M343 596 L432 558 L478 617 L437 701 L320 707 L288 642 Z", x: 390, y: 641, valueY: 668 },
  ulsan: { d: "M503 575 L555 585 L568 636 L529 670 L482 638 Z", x: 526, y: 624, valueY: 647 },
  busan: { d: "M452 681 L529 670 L555 719 L509 761 L443 736 Z", x: 497, y: 718, valueY: 741 },
  jeju: { d: "M185 817 C234 792 315 795 360 825 C318 862 231 865 185 817 Z", x: 273, y: 830, valueY: 852 },
};

const koreaCoastPath = "M344 72 C475 85 584 178 574 326 C566 442 616 528 553 642 C513 716 456 761 342 757 C247 754 137 740 82 650 C35 574 82 485 129 418 C91 330 115 241 190 170 C235 128 276 88 344 72 Z";

const mapMarkers = {
  seoul: { x: 50, y: 29, name: "서울특별시" },
  incheon: { x: 37, y: 28, name: "인천광역시" },
  gyeonggi: { x: 69, y: 28, name: "경기도" },
  gangwon: { x: 66, y: 15, name: "강원도" },
  chungnam: { x: 40, y: 45, name: "충청남도" },
  sejong: { x: 50, y: 44, name: "세종특별자치시" },
  daejeon: { x: 53, y: 50, name: "대전광역시" },
  chungbuk: { x: 58, y: 42, name: "충청북도" },
  jeonbuk: { x: 45, y: 59, name: "전라북도" },
  gwangju: { x: 45, y: 76, name: "광주광역시" },
  jeonnam: { x: 38, y: 70, name: "전라남도" },
  gyeongbuk: { x: 72, y: 53, name: "경상북도" },
  daegu: { x: 70, y: 59, name: "대구광역시" },
  gyeongnam: { x: 66, y: 70, name: "경상남도" },
  ulsan: { x: 83, y: 65, name: "울산광역시" },
  busan: { x: 79, y: 74, name: "부산광역시" },
  jeju: { x: 18, y: 90, name: "제주특별자치도" },
};

const regionAliases = {
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  인천: "Incheon",
  광주: "Gwangju",
  대전: "Daejeon",
  울산: "Ulsan",
  세종: "Sejong",
  경기: "Gyeonggi",
  경기도: "Gyeonggi",
  강원: "Gangwon",
  강원도: "Gangwon",
  충북: "Chungbuk",
  충청북도: "Chungbuk",
  충남: "Chungnam",
  충청남도: "Chungnam",
  전북: "Jeonbuk",
  전라북도: "Jeonbuk",
  전남: "Jeonnam",
  전라남도: "Jeonnam",
  경북: "Gyeongbuk",
  경상북도: "Gyeongbuk",
  경남: "Gyeongnam",
  경상남도: "Gyeongnam",
  제주: "Jeju",
  제주도: "Jeju",
};

const provinceAreaAliases = {
  seoul: ["서울특별시", "서울"],
  busan: ["부산광역시", "부산"],
  daegu: ["대구광역시", "대구"],
  incheon: ["인천광역시", "인천"],
  gwangju: ["광주광역시", "광주"],
  daejeon: ["대전광역시", "대전"],
  ulsan: ["울산광역시", "울산"],
  sejong: ["세종특별자치시", "세종"],
  gyeonggi: ["경기도", "경기"],
  gangwon: ["강원특별자치도", "강원도", "강원"],
  chungbuk: ["충청북도", "충북"],
  chungnam: ["충청남도", "충남"],
  jeonbuk: ["전라북도", "전북"],
  jeonnam: ["전라남도", "전남"],
  gyeongbuk: ["경상북도", "경북"],
  gyeongnam: ["경상남도", "경남"],
  jeju: ["제주특별자치도", "제주도", "제주"],
};

const regionLookup = new Map();
regions.forEach((region) => {
  regionLookup.set(region.name.toLowerCase(), region);
  regionLookup.set(region.label.toLowerCase(), region);
});
Object.entries(regionAliases).forEach(([alias, canonical]) => {
  regionLookup.set(alias.toLowerCase(), regions.find((region) => region.name === canonical));
});
let selectedId = "seoul";
let tgTargets = [];
let tgRegionSummary = {};
let tgMeta = null;

const formatUnits = (value) => `${Math.round(value).toLocaleString("en-US")} units`;
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
const formatKRW = (value) => `₩${Math.round(value).toLocaleString("ko-KR")}`;

function marketColor(market) {
  const max = Math.max(...regions.map((region) => region.market));
  const ratio = market / max;
  if (ratio > 0.65) return "var(--high)";
  if (ratio > 0.22) return "var(--mid)";
  return "var(--low)";
}

function marketTier(market) {
  const max = Math.max(...regions.map((region) => region.market));
  const ratio = market / max;
  if (ratio > 0.65) return "high";
  if (ratio > 0.22) return "mid";
  return "low";
}

function seedSampleMarketRows() {
  return regions.map((region) => ({
    rawRegion: region.label,
    provinceId: region.id,
    provinceLabel: region.label,
    districtKey: `${region.id}:전체`,
    districtLabel: "전체",
    market: region.market,
    patients: 0,
    amountKrw000: 0,
    code: "sample",
    codeName: "sample",
    year: "",
  }));
}

function parseProvinceFromText(text) {
  const compact = String(text || "").replace(/\s+/g, "");
  for (const region of regions) {
    const aliases = provinceAreaAliases[region.id] || [region.label];
    if (aliases.some((alias) => compact.includes(alias))) {
      return region;
    }
  }
  return null;
}

function parseAreaHierarchy(rawText) {
  const raw = String(rawText || "").trim();
  const compact = raw.replace(/\s+/g, "");
  const province = parseProvinceFromText(raw);
  if (!province) {
    return {
      rawRegion: raw || "기타",
      provinceId: "unknown",
      provinceLabel: "기타",
      districtKey: `unknown:${compact || raw || "기타"}`,
      districtLabel: raw || "기타",
    };
  }
  let remainder = compact;
  (provinceAreaAliases[province.id] || [province.label]).forEach((alias) => {
    remainder = remainder.split(alias).join("");
  });
  remainder = remainder.replace(/특별시|광역시|특별자치시|특별자치도|자치시|자치도|도|시/g, "");
  remainder = remainder.replace(/^[\s\-\(\)\[\]\/]+/, "").replace(/[\s\-\(\)\[\]\/]+$/, "");
  const districtLabel = remainder || "전체";
  return {
    rawRegion: raw || province.label,
    provinceId: province.id,
    provinceLabel: province.label,
    districtKey: `${province.id}:${districtLabel}`,
    districtLabel,
  };
}

function rebuildMarketSummaries(rows, options = {}) {
  const provinceSummary = new Map();
  const districtSummary = new Map();
  const detailedProvinces = new Set();
  rows.forEach((row) => {
    const area = row.area || parseAreaHierarchy(row.rawRegion);
    if (area.districtLabel && area.districtLabel !== "전체") {
      detailedProvinces.add(area.provinceId);
    }
  });
  rows.forEach((row) => {
    const area = row.area || parseAreaHierarchy(row.rawRegion);
    const market = Number(row.market || 0);
    const patients = Number(row.patients || 0);
    const amountKrw000 = Number(row.amountKrw000 || 0);
    const isProvinceTotal = area.districtLabel === "전체";
    if (isProvinceTotal && detailedProvinces.has(area.provinceId)) {
      const district = districtSummary.get(area.districtKey) || {
        provinceId: area.provinceId,
        provinceLabel: area.provinceLabel,
        districtKey: area.districtKey,
        districtLabel: area.districtLabel,
        market: 0,
        patients: 0,
        amountKrw000: 0,
      };
      district.market += market;
      district.patients += patients;
      district.amountKrw000 += amountKrw000;
      districtSummary.set(area.districtKey, district);
      return;
    }
    const province = provinceSummary.get(area.provinceId) || {
      provinceId: area.provinceId,
      provinceLabel: area.provinceLabel,
      market: 0,
      patients: 0,
      amountKrw000: 0,
    };
    province.market += market;
    province.patients += patients;
    province.amountKrw000 += amountKrw000;
    provinceSummary.set(area.provinceId, province);

    const district = districtSummary.get(area.districtKey) || {
      provinceId: area.provinceId,
      provinceLabel: area.provinceLabel,
      districtKey: area.districtKey,
      districtLabel: area.districtLabel,
      market: 0,
      patients: 0,
      amountKrw000: 0,
    };
    district.market += market;
    district.patients += patients;
    district.amountKrw000 += amountKrw000;
    districtSummary.set(area.districtKey, district);
  });

  marketProvinceSummary = provinceSummary;
  marketDistrictSummary = districtSummary;
  regions.forEach((region) => {
    const summary = provinceSummary.get(region.id);
    if (summary && Number.isFinite(Number(summary.market))) {
      region.market = Number(summary.market);
    }
  });
  if (options.source === "api") {
    marketDataSource = "api";
  } else if (options.source === "sample") {
    marketDataSource = "sample";
  }
}

function getComputed(region) {
  const share = region.market ? region.ourUnits / region.market : 0;
  const gapUnits = Math.max(0, TARGET_MS * region.market - region.ourUnits);
  const opportunity = gapUnits * 950000;
  const priorityScore = 0.55 * Math.min(gapUnits / 2500, 1) + 0.30 * Math.min(region.market / 28500, 1) + 0.15 * Math.max(TARGET_MS - share, 0);
  const priority = priorityScore >= 0.58 ? "A" : priorityScore >= 0.32 ? "B" : "C";
  return { share, gapUnits, opportunity, priorityScore, priority };
}

function renderMap() {
  const map = document.getElementById("koreaMap");
  map.innerHTML = "";
  const canvas = document.createElement("div");
  canvas.className = "map-canvas";
  map.appendChild(canvas);

  const img = document.createElement("img");
  img.src = "./assets/korea-region-reference.jpeg";
  img.alt = "대한민국 광역시별 지도";
  img.className = "reference-map-image";
  canvas.appendChild(img);

  regions.forEach((region) => {
    const marker = mapMarkers[region.id];
    if (!marker) return;
    const computed = getComputed(region);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-marker ${marketTier(region.market)}${region.id === selectedId ? " active" : ""}`;
    button.style.left = `${marker.x}%`;
    button.style.top = `${marker.y}%`;
    button.setAttribute("aria-label", `${marker.name} ${formatUnits(region.market)}, market share ${formatPercent(computed.share)}`);
    button.innerHTML = `
      <strong>${region.label}</strong>
      <span>${Math.round(region.market).toLocaleString("en-US")}</span>
    `;
    button.addEventListener("click", () => {
      selectedId = region.id;
      selectedDistrictKey = null;
      currentHospitalRows = [];
      currentHospitalRegionId = null;
      render();
      if (hospitalAutoRefresh) void fetchHospitals({ auto: true });
    });
    canvas.appendChild(button);
  });
}

function renderSummary() {
  const totalMarket = regions.reduce((sum, region) => sum + region.market, 0);
  const totalOurUnits = regions.reduce((sum, region) => sum + region.ourUnits, 0);
  const totalGap = Math.max(0, TARGET_MS * totalMarket - totalOurUnits);
  document.getElementById("totalMarket").textContent = formatUnits(totalMarket);
  document.getElementById("totalOurUnits").textContent = formatUnits(totalOurUnits);
  document.getElementById("nationalShare").textContent = formatPercent(totalOurUnits / totalMarket);
  document.getElementById("openGap").textContent = formatUnits(totalGap);
  document.getElementById("marketSourceLabel").textContent =
    marketDataSource === "api" ? "출처: HIRA API" : "출처: sample";
  const baseMode = marketDataSource === "api" ? "HIRA API 반영" : "샘플 시장 데이터";
  if (tgTargets.length) {
    const unknownAccounts = tgTargets.filter((account) => account.regionId === "unknown").length;
    document.getElementById("dataModeStatus").textContent =
      `${baseMode} + TG workbook (${tgTargets.length - unknownAccounts} 매핑 / ${unknownAccounts} 미매핑)`;
  } else {
    document.getElementById("dataModeStatus").textContent = baseMode;
  }
}

function renderDetail() {
  const region = getSelectedProvince();
  const computed = getComputed(region);
  const districtInfo = getSelectedDistrictInfo();
  document.getElementById("selectedTerritory").textContent = region.territory;
  document.getElementById("selectedRegion").textContent = `${region.label} ${region.name}`;
  document.getElementById("selectedDistrict").textContent = districtInfo
    ? `${districtInfo.districtLabel} · 시군구 드릴다운`
    : "시군구 전체";
  document.getElementById("regionMarket").textContent = formatUnits(region.market);
  document.getElementById("regionOurUnits").textContent = formatUnits(region.ourUnits);
  document.getElementById("regionShare").textContent = formatPercent(computed.share);
  document.getElementById("regionGap").textContent = `${formatUnits(computed.gapUnits)} / ${formatKRW(computed.opportunity)}`;
  document.getElementById("barShareLabel").textContent = formatPercent(computed.share);
  document.getElementById("shareBar").style.width = `${Math.min(computed.share / 0.30, 1) * 100}%`;
  document.getElementById("commercialRead").textContent = commercialRead(region, computed);
  renderTargetAccounts(region);
  if (currentHospitalRows.length && currentHospitalRegionId === region.id) {
    renderHospitals(currentHospitalRows);
  } else {
    renderHospitals([]);
    document.getElementById("hospitalStatus").textContent = "선택 지역 병원은 조회 버튼으로 불러올 수 있습니다.";
  }
}

function commercialRead(region, computed) {
  if (computed.priority === "A") {
    return `${region.label}은 시장규모와 MS gap이 모두 커서 우선 영업 타겟입니다. 상급종합/PCI high-volume account부터 account plan을 잡는 것이 좋습니다.`;
  }
  if (computed.priority === "B") {
    return `${region.label}은 선택적 성장 지역입니다. 특정 병원/대리점 barrier를 확인하고 1-2개 계정 중심으로 전환 기회를 보세요.`;
  }
  return `${region.label}은 현재 샘플 기준으로 유지/모니터링 성격이 강합니다. 신규 데이터에서 시장 성장률이나 access score가 올라가면 재평가하세요.`;
}

function getSelectedProvince() {
  return regions.find((item) => item.id === selectedId) || regions[0];
}

function getSelectedDistrictInfo() {
  if (!selectedDistrictKey) return null;
  return marketDistrictSummary.get(selectedDistrictKey) || null;
}

function getSelectedDistrictLabel() {
  return getSelectedDistrictInfo()?.districtLabel || "전체";
}

function filterByDistrictLabel(rows, districtLabel) {
  const needle = String(districtLabel || "").replace(/\s+/g, "").toLowerCase();
  if (!needle || needle === "전체") return rows;
  return rows.filter((row) => {
    const haystack = `${row.account || ""}${row.hiraRegion || ""}${row.territory || ""}${row.rep || ""}`.replace(/\s+/g, "").toLowerCase();
    return haystack.includes(needle);
  });
}

function renderTargetAccounts(region) {
  const status = document.getElementById("targetStatus");
  const list = document.getElementById("targetList");
  const period = document.getElementById("targetPeriod");
  if (!tgTargets.length) {
    status.textContent = "TG workbook data가 로드되지 않았습니다.";
    list.innerHTML = "";
    period.textContent = "-";
    return;
  }
  period.textContent = tgMeta?.actualPeriod || "-";
  const provinceRows = tgTargets
    .filter((account) => account.regionId === region.id)
    .sort((a, b) => (b.pciAssumption || 0) - (a.pciAssumption || 0));
  const summary = tgRegionSummary[region.id];
  const districtLabel = getSelectedDistrictLabel();
  const rows = filterByDistrictLabel(provinceRows, districtLabel);
  if (!provinceRows.length) {
    status.textContent = `${region.label}에 매핑된 TG account가 없습니다. 지역 미확정 account는 원본의 심평원 구분 보강이 필요합니다.`;
    list.innerHTML = "";
    return;
  }
  const displayRows = rows.length ? rows : provinceRows;
  const districtHint = rows.length || districtLabel === "전체" ? "" : " (시군구 exact match 없음)";
  status.textContent = `${region.label}${districtLabel && districtLabel !== "전체" ? ` · ${districtLabel}` : ""}: ${displayRows.length}개 account${districtHint} / 시도 실적 ${Math.round(summary?.actualUnits || 0).toLocaleString("en-US")} units / target ${Math.round(summary?.planTotal || 0).toLocaleString("en-US")} units`;
  list.innerHTML = displayRows
    .slice(0, 10)
    .map(
      (row) => `
        <div class="target-item">
          <strong>${row.account}</strong>
          <div class="target-meta">${row.rep || "-"} · ${row.territory || "-"} · ${row.hiraRegion || "지역 미확정"}</div>
          <div class="target-metrics">
            <span>Actual ${Math.round(row.actualUnits || 0).toLocaleString("en-US")}</span>
            <span>Target ${Math.round(row.planTotal || 0).toLocaleString("en-US")}</span>
            <span>Ach ${(Number(row.achievement || 0) * 100).toFixed(0)}%</span>
            <span>PCI ${Math.round(row.pciAssumption || 0).toLocaleString("en-US")}</span>
            <span>MS ${(Number(row.ms12m || 0) * 100).toFixed(1)}%</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderTable() {
  const tbody = document.getElementById("regionTable");
  const sorted = [...regions].sort((a, b) => {
    const aComputed = getComputed(a);
    const bComputed = getComputed(b);
    return bComputed.priorityScore - aComputed.priorityScore;
  });
  tbody.innerHTML = sorted
    .map((region) => {
      const computed = getComputed(region);
      return `
        <tr data-region="${region.id}">
          <td>${region.label} ${region.name}</td>
          <td>${region.territory}</td>
          <td>${formatUnits(region.market)}</td>
          <td>${formatUnits(region.ourUnits)}</td>
          <td>${formatPercent(computed.share)}</td>
          <td>${formatUnits(computed.gapUnits)}</td>
          <td><span class="priority ${computed.priority.toLowerCase()}">${computed.priority}</span></td>
        </tr>
      `;
    })
    .join("");
  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      selectedId = row.dataset.region;
      selectedDistrictKey = null;
      currentHospitalRows = [];
      currentHospitalRegionId = null;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    });
  });
}

function renderRegionHighlights() {
  const list = document.getElementById("regionHighlights");
  const meta = document.getElementById("highlightMeta");
  if (!list) return;
  const province = getSelectedProvince();
  const rows = Array.from(marketDistrictSummary.values())
    .filter((row) => row.provinceId === province.id)
    .sort((a, b) => b.market - a.market);
  const displayRows = rows.length
    ? rows.slice(0, 6)
    : [
        {
          provinceId: province.id,
          provinceLabel: province.label,
          districtKey: `${province.id}:전체`,
          districtLabel: "전체",
          market: province.market,
          patients: 0,
          amountKrw000: 0,
        },
      ];
  const selectedRow = selectedDistrictKey ? rows.find((row) => row.districtKey === selectedDistrictKey) : null;
  const spotlightRow = selectedRow || displayRows[0];
  const provinceMarket = Math.max(province.market || 0, 1);
  const topMarket = Math.max(...displayRows.map((row) => row.market || 0), province.market || 0, 1);
  if (meta) {
    meta.textContent = `${province.label} · ${displayRows.length}개 시군구 · 클릭해서 상세 보기`;
  }
  list.innerHTML = `
    <button type="button" class="district-spotlight${selectedRow ? " active" : ""}" data-district-key="${spotlightRow.districtKey}">
      <div class="spotlight-copy">
        <span>${selectedRow ? "선택한 시군구" : "가장 큰 시군구"}</span>
        <strong>${spotlightRow.districtLabel}</strong>
        <small>${spotlightRow.provinceLabel} · 환자 ${Math.round(spotlightRow.patients || 0).toLocaleString("en-US")} · ${formatPercent((spotlightRow.market || 0) / provinceMarket)} 비중</small>
      </div>
      <div class="spotlight-metric">
        <span>시장 케파</span>
        <strong>${formatUnits(spotlightRow.market || 0)}</strong>
        <small>시도 대비 ${formatPercent((spotlightRow.market || 0) / provinceMarket)}</small>
      </div>
    </button>
    <div class="district-grid">
      ${displayRows
        .map((row, index) => {
          const isActive = selectedDistrictKey === row.districtKey;
          const tier = row.market > province.market * 0.2 ? "a" : row.market > province.market * 0.08 ? "b" : "c";
          const barWidth = Math.max(((row.market || 0) / topMarket) * 100, 4);
          return `
            <button type="button" class="district-card${isActive ? " active" : ""}" data-district-key="${row.districtKey}">
              <div class="district-card-head">
                <span class="district-rank">${String(index + 1).padStart(2, "0")}</span>
                <span class="priority ${tier}">${tier.toUpperCase()}</span>
              </div>
              <strong>${row.districtLabel}</strong>
              <div class="district-card-value">${formatUnits(row.market || 0)}</div>
              <div class="district-card-meta">
                <span>${formatPercent((row.market || 0) / provinceMarket)} 비중</span>
                <span>환자 ${Math.round(row.patients || 0).toLocaleString("en-US")}</span>
              </div>
              <div class="district-card-bar"><span style="width: ${barWidth}%"></span></div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
  list.querySelectorAll("[data-district-key]").forEach((row) => {
    row.addEventListener("click", () => {
      selectedDistrictKey = row.dataset.districtKey;
      render();
      if (hospitalAutoRefresh) void fetchHospitals({ auto: true });
    });
  });
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

function cleanAccountName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/-씨엠메드|-제이비|-중원엠디/g, "");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function columnIndexFromRef(ref) {
  const letters = String(ref || "").match(/[A-Z]+/i)?.[0] || "A";
  return letters
    .toUpperCase()
    .split("")
    .reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

async function inflateZipData(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("이 브라우저는 XLSX 압축 해제를 지원하지 않습니다.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("XLSX zip directory를 찾지 못했습니다.");

  const entryCount = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");
  const files = {};
  let offset = cdOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("XLSX central directory가 손상되었습니다.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let fileBytes;
    if (method === 0) {
      fileBytes = compressed;
    } else if (method === 8) {
      fileBytes = await inflateZipData(compressed);
    } else {
      throw new Error(`지원하지 않는 XLSX 압축 방식입니다: ${method}`);
    }
    files[name] = decoder.decode(fileBytes);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function parseWorkbookSheets(files) {
  const workbookXml = files["xl/workbook.xml"];
  const relsXml = files["xl/_rels/workbook.xml.rels"];
  if (!workbookXml || !relsXml) throw new Error("XLSX workbook metadata가 없습니다.");
  const parser = new DOMParser();
  const workbookDoc = parser.parseFromString(workbookXml, "application/xml");
  const relsDoc = parser.parseFromString(relsXml, "application/xml");
  const relMap = new Map(
    Array.from(relsDoc.getElementsByTagName("Relationship")).map((rel) => [
      rel.getAttribute("Id"),
      rel.getAttribute("Target"),
    ]),
  );
  return Array.from(workbookDoc.getElementsByTagName("sheet")).map((sheet) => {
    const relId =
      sheet.getAttribute("r:id") ||
      sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ||
      sheet.getAttribute("id");
    const target = relMap.get(relId) || "";
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    return { name: sheet.getAttribute("name"), path };
  });
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t")).map((node) => node.textContent || "").join(""),
  );
}

function parseSheetRows(xml, sharedStrings) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rows = [];
  Array.from(doc.getElementsByTagName("row")).forEach((rowNode) => {
    const rowIndex = Number(rowNode.getAttribute("r") || rows.length + 1) - 1;
    const row = rows[rowIndex] || [];
    Array.from(rowNode.getElementsByTagName("c")).forEach((cell) => {
      const colIndex = columnIndexFromRef(cell.getAttribute("r"));
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t")).map((node) => node.textContent || "").join("");
      } else {
        value = cell.getElementsByTagName("v")[0]?.textContent || "";
      }
      if (type === "s") {
        value = sharedStrings[Number(value)] || "";
      } else if (type === "b") {
        value = value === "1";
      } else if (value !== "" && !Number.isNaN(Number(value))) {
        value = Number(value);
      }
      row[colIndex] = value;
    });
    rows[rowIndex] = row;
  });
  return rows;
}

async function readXlsxWorkbook(file) {
  const files = await readZipEntries(await file.arrayBuffer());
  const sharedStrings = parseSharedStrings(files["xl/sharedStrings.xml"]);
  const sheets = parseWorkbookSheets(files);
  const workbook = {};
  sheets.forEach((sheet) => {
    const xml = files[sheet.path];
    if (!xml) return;
    workbook[sheet.name] = parseSheetRows(xml, sharedStrings);
  });
  return workbook;
}

function buildTgPayloadFromWorkbook(workbook, fileName) {
  const usageRows = workbook.Master_Usage;
  const scenarioRows = workbook["TG Scenario_2026_RQ2_A"];
  if (!usageRows?.length || !scenarioRows?.length) {
    throw new Error("필수 시트(Master_Usage, TG Scenario_2026_RQ2_A)를 찾지 못했습니다.");
  }

  const territoryToId = { Seoul: "seoul", Busan: "busan", Daejeon: "daejeon", Gwangju: "gwangju", Daegu: "daegu" };
  const specialRegionMap = { 전라도: "gwangju", 어디야: "unknown" };
  const usageByAccount = new Map();
  usageRows.slice(1).forEach((row) => {
    const account = row[3];
    if (!account) return;
    const key = cleanAccountName(account);
    const entry = usageByAccount.get(key) || { actualUnits: 0, byMonth: {}, byProduct: {}, rep: "" };
    const qty = toNumber(row[6]);
    entry.actualUnits += qty;
    entry.byMonth[row[1] || ""] = (entry.byMonth[row[1] || ""] || 0) + qty;
    entry.byProduct[row[5] || ""] = (entry.byProduct[row[5] || ""] || 0) + qty;
    if (row[4]) entry.rep = row[4];
    usageByAccount.set(key, entry);
  });

  const accounts = [];
  scenarioRows.slice(4).forEach((row) => {
    const account = row[1];
    if (!account) return;
    const accountKey = cleanAccountName(account);
    const hiraRegion = row[3] || "";
    const regionFromName = normalizeRegionName(hiraRegion);
    const regionId = regionFromName?.id || specialRegionMap[hiraRegion] || territoryToId[row[2]] || "unknown";
    const usage = usageByAccount.get(accountKey) || { actualUnits: 0, byMonth: {}, byProduct: {}, rep: "" };
    const planMonths = row.slice(10, 22).map(toNumber);
    const actualMonths = row.slice(27, 39).map(toNumber);
    const planTotal = toNumber(row[26]) || planMonths.reduce((sum, value) => sum + value, 0);
    const scenarioActualTotal = toNumber(row[43]) || actualMonths.reduce((sum, value) => sum + value, 0);
    const actualUnits = usage.actualUnits || scenarioActualTotal;
    accounts.push({
      account: String(account).trim(),
      accountKey,
      territory: row[2] || "",
      hiraRegion,
      regionId,
      manager: row[8] || "",
      rep: row[9] || usage.rep || "",
      pciAssumption: Math.round(toNumber(row[4]) * 100) / 100,
      monthlyPci: Math.round(toNumber(row[5]) * 100) / 100,
      ms12m: Math.round(toNumber(row[6]) * 10000) / 10000,
      possibility: row[7] || "",
      planTotal: Math.round(planTotal * 100) / 100,
      actualUnits: Math.round(actualUnits * 100) / 100,
      achievement: planTotal ? Math.round((actualUnits / planTotal) * 10000) / 10000 : 0,
      usageByProduct: usage.byProduct,
      usageByMonth: usage.byMonth,
    });
  });

  const regionSummary = {};
  accounts.forEach((account) => {
    const summary = regionSummary[account.regionId] || {
      accounts: 0,
      actualUnits: 0,
      planTotal: 0,
      pciAssumption: 0,
      weightedMsNumerator: 0,
      weightedMsDenominator: 0,
    };
    summary.accounts += 1;
    summary.actualUnits += account.actualUnits;
    summary.planTotal += account.planTotal;
    summary.pciAssumption += account.pciAssumption;
    if (account.pciAssumption) {
      summary.weightedMsNumerator += account.ms12m * account.pciAssumption;
      summary.weightedMsDenominator += account.pciAssumption;
    }
    regionSummary[account.regionId] = summary;
  });

  Object.entries(regionSummary).forEach(([regionId, summary]) => {
    regionSummary[regionId] = {
      accounts: summary.accounts,
      actualUnits: Math.round(summary.actualUnits * 100) / 100,
      planTotal: Math.round(summary.planTotal * 100) / 100,
      pciAssumption: Math.round(summary.pciAssumption * 100) / 100,
      weightedMs12m: summary.weightedMsDenominator
        ? Math.round((summary.weightedMsNumerator / summary.weightedMsDenominator) * 10000) / 10000
        : 0,
    };
  });

  return {
    sourceFile: fileName,
    actualPeriod: "2026 Jan-May",
    scenarioDate: String(scenarioRows[0]?.[1] || ""),
    accounts,
    regionSummary,
    notes: "Uploaded workbook calculated in browser from Master_Usage and TG Scenario_2026_RQ2_A.",
  };
}

function applyCsvText(text) {
  const rows = parseCsv(text);
  rows.forEach((row) => {
    const region = regionLookup.get(String(row.region || "").trim().toLowerCase());
    if (!region) return;
    const units = Number(String(row.our_units || "").replace(/,/g, ""));
    if (Number.isFinite(units)) region.ourUnits = units;
  });
  render();
}

function normalizeRegionName(value) {
  const raw = String(value || "").trim();
  const compact = raw.replace(/\s/g, "");
  const withoutSuffix = compact
    .replace(/특별시|광역시|특별자치시|특별자치도|자치도|자치시|도|시/g, "");
  return regionLookup.get(raw.toLowerCase()) || regionLookup.get(compact.toLowerCase()) || regionLookup.get(withoutSuffix.toLowerCase());
}

function getHiraCodes() {
  const raw = document.getElementById("hiraCode").value;
  const seen = new Set();
  return raw
    .split(/[\s,;/]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .filter((code) => {
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
}

function setApiStatus(dotId, textId, state, message) {
  const dot = document.getElementById(dotId);
  const text = document.getElementById(textId);
  if (dot) dot.className = `status-dot ${state || ""}`.trim();
  if (text) text.textContent = message;
}

function parseHiraXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("XML 파싱 실패");
  const resultCode = doc.querySelector("resultCode")?.textContent || "";
  const resultMsg = doc.querySelector("resultMsg")?.textContent || "";
  const items = Array.from(doc.querySelectorAll("item"));
  if (!items.length && resultCode && resultCode !== "00") {
    throw new Error(resultMsg || `HIRA resultCode ${resultCode}`);
  }
  return items.map((item) => ({
    regionName: item.querySelector("ykihoCdNm")?.textContent || "",
    market: Number(item.querySelector("totUseQty")?.textContent || 0),
    patients: Number(item.querySelector("ptntCnt")?.textContent || 0),
    amountKrw000: Number(item.querySelector("diagAmt")?.textContent || 0),
    code: item.querySelector("st5Cd")?.textContent || "",
    codeName: item.querySelector("st5CdNm")?.textContent || "",
    year: item.querySelector("year")?.textContent || "",
  }));
}

function parseHospitalXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("XML 파싱 실패");
  const resultCode = doc.querySelector("resultCode")?.textContent || "";
  const resultMsg = doc.querySelector("resultMsg")?.textContent || "";
  const items = Array.from(doc.querySelectorAll("item"));
  if (!items.length && resultCode && resultCode !== "00") {
    throw new Error(resultMsg || `Hospital API resultCode ${resultCode}`);
  }
  return items.map((item) => ({
    name: item.querySelector("yadmNm")?.textContent || "",
    type: item.querySelector("clCdNm")?.textContent || "",
    sido: item.querySelector("sidoCdNm")?.textContent || "",
    sggu: item.querySelector("sgguCdNm")?.textContent || "",
    address: item.querySelector("addr")?.textContent || "",
    tel: item.querySelector("telno")?.textContent || "",
    ykiho: item.querySelector("ykiho")?.textContent || "",
  }));
}

async function fetchHiraMarket(options = {}) {
  const status = document.getElementById("hiraStatus");
  const serviceKey = document.getElementById("hiraKey").value.trim();
  const year = document.getElementById("hiraYear").value.trim();
  const st5Codes = getHiraCodes();
  saveApiInputs();
  if (!serviceKey || !year || !st5Codes.length) {
    const missing = !st5Codes.length ? "PCI st5Cd 필요" : "Service Key 또는 Year 필요";
    status.textContent = `${missing}. Key만으로는 PCI 시장사이즈를 특정할 수 없습니다.`;
    setApiStatus("marketApiDot", "marketApiStatus", "pending", `${missing}: 시장 API 자동 호출 대기`);
    return false;
  }
  const codeLabel = st5Codes.join(",");
  status.textContent = options.auto ? `새로고침 자동 연동: HIRA 시장 API ${st5Codes.length}개 코드 호출 중...` : `HIRA API ${st5Codes.length}개 코드 호출 중...`;
  setApiStatus("marketApiDot", "marketApiStatus", "pending", `호출 중: ${year} / ${codeLabel}`);

  try {
    const rawRows = [];
    const codeSummaries = [];
    for (const st5Cd of st5Codes) {
      const url = new URL("https://apis.data.go.kr/B551182/mdlrtActionInfoService/getMdlrtActionByAreaStats");
      url.searchParams.set("ServiceKey", serviceKey);
      url.searchParams.set("pageNo", "1");
      url.searchParams.set("numOfRows", "100");
      url.searchParams.set("year", year);
      url.searchParams.set("stdType", "1");
      url.searchParams.set("st5Cd", st5Cd);
      const response = await fetch(url.toString());
      const xml = await response.text();
      const rows = parseHiraXml(xml);
      let codeTotal = 0;
      rows.forEach((row) => {
        if (!row.market) return;
        const area = parseAreaHierarchy(row.regionName);
        rawRows.push({
          rawRegion: row.regionName,
          area,
          market: row.market,
          patients: row.patients,
          amountKrw000: row.amountKrw000,
          code: row.code,
          codeName: row.codeName,
          year: row.year,
        });
        codeTotal += row.market;
      });
      codeSummaries.push(`${st5Cd}:${Math.round(codeTotal).toLocaleString("en-US")}`);
    }
    hiraMarketRows = rawRows;
    rebuildMarketSummaries(rawRows, { source: "api" });
    const applied = marketProvinceSummary.size;
    if (applied) marketDataSource = "api";
    render();
    status.textContent = applied
      ? `${year} / ${st5Codes.length}개 코드 합산 완료: ${applied}개 시도, ${marketDistrictSummary.size}개 시군구 반영 (${codeSummaries.join(" / ")})`
      : "응답은 왔지만 지역/총사용량 매칭값이 없습니다. 코드 유효성 또는 삭제 코드를 확인하세요.";
    setApiStatus(
      "marketApiDot",
      "marketApiStatus",
      applied ? "ready" : "pending",
      applied ? `연결됨: ${year} / ${st5Codes.length}개 코드 합산 / ${applied}개 시도` : "응답 수신, 지역 매칭값 없음",
    );
    return Boolean(applied);
  } catch (error) {
    status.textContent = `호출 실패: ${error.message}. 브라우저 CORS 제한이면 Python 샘플로 실행하세요.`;
    setApiStatus("marketApiDot", "marketApiStatus", "error", `시장 API 실패: ${error.message}`);
    return false;
  }
}

function renderHospitals(rows, districtLabel = getSelectedDistrictLabel()) {
  const list = document.getElementById("hospitalList");
  const needle = String(districtLabel || "").replace(/\s+/g, "").toLowerCase();
  const filtered =
    !needle || needle === "전체"
      ? rows
      : rows.filter((row) => {
          const haystack = `${row.name || ""}${row.sggu || ""}${row.sido || ""}${row.address || ""}`
            .replace(/\s+/g, "")
            .toLowerCase();
          return haystack.includes(needle);
        });
  const displayRows = filtered.length ? filtered : rows;
  if (!displayRows.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = displayRows
    .slice(0, 20)
    .map(
      (row) => `
        <div class="hospital-item">
          <strong>${row.name || "이름 없음"}</strong>
          <span>${row.type || "-"} · ${row.sido || ""} ${row.sggu || ""}</span>
          <span>${row.address || ""}</span>
        </div>
      `,
    )
    .join("");
}

async function fetchHospitals(options = {}) {
  const status = document.getElementById("hospitalStatus");
  const list = document.getElementById("hospitalList");
  const serviceKey = document.getElementById("hiraKey").value.trim();
  const region = regions.find((item) => item.id === selectedId) || regions[0];
  if (!serviceKey) {
    status.textContent = "왼쪽 HIRA Service Key를 먼저 입력해 주세요.";
    setApiStatus("hospitalApiDot", "hospitalApiTopStatus", "pending", "Service Key 필요: 병원 API 대기");
    return false;
  }
  saveApiInputs();
  status.textContent = `${region.label} 병원정보 API 호출 중...`;
  setApiStatus("hospitalApiDot", "hospitalApiTopStatus", "pending", `${region.label} 병원 API 호출 중`);
  list.innerHTML = "";
  const url = new URL(`${HOSPITAL_API_BASE}/getHospBasisList`);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "200");
  url.searchParams.set("sidoCd", region.sidoCd);

  try {
    const response = await fetch(url.toString());
    const xml = await response.text();
    const rows = parseHospitalXml(xml);
    currentHospitalRows = rows;
    currentHospitalRegionId = region.id;
    const districtLabel = getSelectedDistrictLabel();
    renderHospitals(rows, districtLabel);
    status.textContent = rows.length
      ? `${region.label}${districtLabel && districtLabel !== "전체" ? ` · ${districtLabel}` : ""} 병원 ${rows.length}개 로드. PCI volume은 별도 진료행위/내부데이터 매칭 필요.`
      : `${region.label} 병원 응답이 없습니다. Service Key 승인 상태와 sidoCd를 확인하세요.`;
    setApiStatus(
      "hospitalApiDot",
      "hospitalApiTopStatus",
      rows.length ? "ready" : "pending",
      rows.length ? `연결됨: ${region.label} 병원 ${rows.length}개` : `${region.label} 병원 응답 없음`,
    );
    return Boolean(rows.length);
  } catch (error) {
    status.textContent = `호출 실패: ${error.message}. 브라우저 CORS 제한이면 Python 샘플로 실행하세요.`;
    setApiStatus("hospitalApiDot", "hospitalApiTopStatus", "error", `병원 API 실패: ${error.message}`);
    return false;
  }
}

function downloadCsv() {
  const header = ["region", "territory", "market_capacity", "our_actual", "market_share", "gap_units", "priority"];
  const rows = regions.map((region) => {
    const computed = getComputed(region);
    return [
      region.name,
      region.territory,
      region.market,
      region.ourUnits,
      computed.share.toFixed(4),
      Math.round(computed.gapUnits),
      computed.priority,
    ];
  });
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pci_region_targeting.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function resetSample() {
  selectedDistrictKey = null;
  const sampleUnits = {
    Seoul: 5200,
    Busan: 1400,
    Daegu: 950,
    Incheon: 890,
    Gwangju: 620,
    Daejeon: 700,
    Ulsan: 300,
    Sejong: 120,
    Gyeonggi: 3100,
    Gangwon: 420,
    Chungbuk: 520,
    Chungnam: 570,
    Jeonbuk: 510,
    Jeonnam: 440,
    Gyeongbuk: 650,
    Gyeongnam: 780,
    Jeju: 160,
  };
  regions.forEach((region) => {
    region.ourUnits = sampleUnits[region.name] || 0;
  });
  render();
}

function loadSavedApiInputs() {
  const keyInput = document.getElementById("hiraKey");
  const codeInput = document.getElementById("hiraCode");
  const yearInput = document.getElementById("hiraYear");
  const periodSelect = document.getElementById("period");
  try {
    const saved = localStorage.getItem(HIRA_KEY_STORAGE);
    const configured = window.PCI_DASHBOARD_CONFIG?.serviceKey || "";
    const savedCode = localStorage.getItem(HIRA_CODE_STORAGE);
    const configuredCode = window.PCI_DASHBOARD_CONFIG?.st5Cd || "";
    const savedYear = localStorage.getItem(HIRA_YEAR_STORAGE);
    const configuredYear = window.PCI_DASHBOARD_CONFIG?.year || "";
    if (saved || configured) keyInput.value = saved || configured;
    if (savedCode || configuredCode) codeInput.value = savedCode || configuredCode;
    if (savedYear || configuredYear) yearInput.value = savedYear || configuredYear;
    if (yearInput.value) periodSelect.value = yearInput.value;
  } catch {
    keyInput.value = window.PCI_DASHBOARD_CONFIG?.serviceKey || "";
    codeInput.value = window.PCI_DASHBOARD_CONFIG?.st5Cd || "";
    yearInput.value = window.PCI_DASHBOARD_CONFIG?.year || yearInput.value;
    periodSelect.value = yearInput.value;
  }
}

function saveApiInputs() {
  const keyInput = document.getElementById("hiraKey");
  const codeInput = document.getElementById("hiraCode");
  const yearInput = document.getElementById("hiraYear");
  const periodSelect = document.getElementById("period");
  if (periodSelect.value !== yearInput.value) periodSelect.value = yearInput.value;
  try {
    const key = keyInput.value.trim();
    const code = codeInput.value.trim();
    const year = yearInput.value.trim();
    if (key) {
      localStorage.setItem(HIRA_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(HIRA_KEY_STORAGE);
    }
    if (code) {
      localStorage.setItem(HIRA_CODE_STORAGE, code);
    } else {
      localStorage.removeItem(HIRA_CODE_STORAGE);
    }
    if (year) {
      localStorage.setItem(HIRA_YEAR_STORAGE, year);
    }
  } catch {
    // Keep API calls usable even if localStorage is blocked.
  }
}

function syncYearFromPeriod() {
  document.getElementById("hiraYear").value = document.getElementById("period").value;
  saveApiInputs();
  void autoRefreshApis();
}

function applyTgPayload(data, options = {}) {
  if (!data?.accounts?.length) return false;
  tgTargets = data.accounts;
  tgRegionSummary = data.regionSummary || {};
  tgMeta = data;
  regions.forEach((region) => {
    const summary = tgRegionSummary[region.id];
    if (summary && Number.isFinite(Number(summary.actualUnits))) {
      region.ourUnits = Number(summary.actualUnits);
    }
  });
  const knownAccounts = tgTargets.filter((account) => account.regionId !== "unknown").length;
  const unknownAccounts = tgTargets.length - knownAccounts;
  const knownActual = Object.entries(tgRegionSummary)
    .filter(([regionId]) => regionId !== "unknown")
    .reduce((sum, [, value]) => sum + Number(value.actualUnits || 0), 0);
  document.getElementById("dataModeStatus").textContent =
    `TG workbook 반영: ${knownAccounts} 매핑 / ${unknownAccounts} 미매핑`;
  const ourLabel = document.querySelector(".summary-strip article:nth-child(2) small");
  if (ourLabel) {
    ourLabel.textContent = `업로드 실적: ${Math.round(knownActual).toLocaleString("en-US")} mapped units`;
  }
  const workbookStatus = document.getElementById("workbookStatus");
  if (workbookStatus) {
    workbookStatus.textContent =
      `${options.source || data.sourceFile || "TG workbook"} 계산 완료: ${knownAccounts} 매핑 / ${unknownAccounts} 미매핑`;
  }
  if (options.persist) {
    try {
      localStorage.setItem(TG_PAYLOAD_STORAGE, JSON.stringify(data));
    } catch {
      // Processed workbook can still be used for this session.
    }
  }
  return true;
}

function loadTgTargetData() {
  try {
    const saved = localStorage.getItem(TG_PAYLOAD_STORAGE);
    if (saved && applyTgPayload(JSON.parse(saved), { source: "last uploaded workbook" })) return;
  } catch {
    // Fall back to bundled TG data.
  }
  applyTgPayload(window.TG_TARGET_DATA, { source: "default TG data" });
}

function render() {
  renderSummary();
  renderMap();
  renderDetail();
  renderRegionHighlights();
  renderTable();
}

async function autoRefreshApis() {
  saveApiInputs();
  const key = document.getElementById("hiraKey").value.trim();
  const codes = getHiraCodes();
  const year = document.getElementById("hiraYear").value.trim();
  if (!key) {
    setApiStatus("marketApiDot", "marketApiStatus", "pending", "Service Key 필요: API 자동연동 대기");
    setApiStatus("hospitalApiDot", "hospitalApiTopStatus", "pending", "Service Key 필요: 병원 API 대기");
    return;
  }
  if (codes.length && year) {
    void fetchHiraMarket({ auto: true });
  } else {
    document.getElementById("hiraStatus").textContent =
      "Service Key는 들어왔습니다. PCI 시장사이즈 자동 반영에는 st5Cd가 추가로 필요합니다.";
    setApiStatus("marketApiDot", "marketApiStatus", "pending", "Service Key 확인됨, PCI st5Cd 필요");
  }
  if (hospitalAutoRefresh) {
    void fetchHospitals({ auto: true });
  }
}

async function handleWorkbookUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById("workbookStatus");
  const dataModeStatus = document.getElementById("dataModeStatus");
  document.getElementById("workbookFileName").textContent = file.name;
  status.textContent = `${file.name} 읽는 중...`;
  dataModeStatus.textContent = `${file.name} 읽는 중...`;
  try {
    const workbook = await readXlsxWorkbook(file);
    const payload = buildTgPayloadFromWorkbook(workbook, file.name);
    applyTgPayload(payload, { persist: true, source: file.name });
    render();
    status.textContent = `${file.name} 자동 계산 완료: ${payload.accounts.length}개 계정`;
  } catch (error) {
    status.textContent = `Excel 계산 실패: ${error.message}. 시트명/컬럼 구조가 기존 TG 파일과 같은지 확인해 주세요.`;
    dataModeStatus.textContent = `Excel 계산 실패: ${error.message}`;
  }
}

function clearUploadedWorkbookData() {
  try {
    localStorage.removeItem(TG_PAYLOAD_STORAGE);
  } catch {
    // Ignore storage errors.
  }
  tgTargets = [];
  tgRegionSummary = {};
  tgMeta = null;
  selectedDistrictKey = null;
  currentHospitalRows = [];
  currentHospitalRegionId = null;
  resetSample();
  loadTgTargetData();
  render();
  document.getElementById("workbookFile").value = "";
  document.getElementById("workbookFileName").textContent = "기본 TG 데이터 사용 중";
  document.getElementById("workbookStatus").textContent = "업로드 데이터를 지우고 기본 TG 데이터로 되돌렸습니다.";
}

document.getElementById("applyCsv").addEventListener("click", () => {
  applyCsvText(document.getElementById("csvInput").value);
});

document.getElementById("resetData").addEventListener("click", resetSample);
document.getElementById("downloadCsv").addEventListener("click", downloadCsv);
document.getElementById("fetchHira").addEventListener("click", fetchHiraMarket);
document.getElementById("fetchHospitals").addEventListener("click", fetchHospitals);
document.getElementById("autoRefreshNow").addEventListener("click", autoRefreshApis);
document.getElementById("hiraKey").addEventListener("change", saveApiInputs);
document.getElementById("hiraKey").addEventListener("blur", saveApiInputs);
document.getElementById("hiraCode").addEventListener("change", saveApiInputs);
document.getElementById("hiraCode").addEventListener("blur", saveApiInputs);
document.getElementById("hiraYear").addEventListener("change", saveApiInputs);
document.getElementById("hiraYear").addEventListener("blur", saveApiInputs);
document.getElementById("period").addEventListener("change", syncYearFromPeriod);
document.getElementById("workbookFile").addEventListener("change", handleWorkbookUpload);
document.getElementById("clearWorkbookData").addEventListener("click", clearUploadedWorkbookData);

document.getElementById("csvFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById("csvFileName").textContent = file.name;
  const text = await file.text();
  document.getElementById("csvInput").value = text;
  applyCsvText(text);
});

hiraMarketRows = seedSampleMarketRows();
rebuildMarketSummaries(hiraMarketRows, { source: "sample" });
loadSavedApiInputs();
loadTgTargetData();
render();
void autoRefreshApis();
