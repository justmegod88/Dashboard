/*
  ACUVUE Education Recommendation Dashboard - V1
  Works with: 안경사_교육 추천 플랫폼_V1.xlsx
  Expected HTML IDs: index.html generated earlier in this chat.
*/
(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    workbookName: '데모 데이터',
    master: [],
    content: [],
    education: [],
    knowledge: [],
    perceptionRaw: [],
    perceptionLong: [],
    sales: [],
    diagnosis: [],
    recommendations: [],
    delivery: [],
    impact: [],
    questionMaster: [],
    filtered: [],
    selectedId: null,
    lastQuery: ''
  };

  const aliases = {
    master: ['01_안경사마스터','안경사마스터','안경사기본정보','OpticianMaster'],
    content: ['02_교육콘텐츠마스터','교육콘텐츠마스터','카카오톡 콘텐츠 리스트','콘텐츠 리스트','교육콘텐츠'],
    education: ['03_교육참여이력','교육참여이력','교육이력','수강이력'],
    knowledge: ['04_지식평가','지식평가','교육평가'],
    perception: ['05_인식조사','인식조사','설문','Perception','Survey'],
    sales: ['06_피팅판매월별','피팅판매월별','피팅판매','판매데이터','판매 분석'],
    diagnosis: ['07_진단스냅샷','진단스냅샷','진단결과'],
    recommendations: ['08_교육추천결과','교육추천결과','AI추천결과','추천결과'],
    delivery: ['09_발송시청이력','발송시청이력','발송요청관리','발송결과','발송'],
    impact: ['10_교육효과측정','교육효과측정','효과측정'],
    questionMaster: ['11_인식문항마스터','10_인식문항마스터','인식문항마스터','문항마스터']
  };

  const metaColumns = [
    '조사응답ID','안경사ID','OpticianID','ID','조사일','응답일','조사명','조사차수','Timestamp','타임스탬프',
    '안경사명','안경원명','안경원코드','지역','연차','연령대','Tier','채널','Team','담당영업사원','비고'
  ];

  function clean(v){ return v === null || v === undefined ? '' : String(v).trim(); }
  function key(v){ return clean(v).replace(/[\s_\-()\/]/g,'').toLowerCase(); }
  function num(v){
    if(v === null || v === undefined || v === '') return null;
    if(typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(String(v).replace(/,/g,'').replace(/%/g,'').trim());
    return Number.isFinite(n) ? n : null;
  }
  function avg(arr, fn){
    const vals = arr.map(fn).filter(v => v !== null && v !== undefined && Number.isFinite(Number(v))).map(Number);
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  }
  function sum(arr, fn){ return arr.reduce((s,x)=>s+(Number(fn(x))||0),0); }
  function yes(v){ return /^(y|yes|true|1|완료|수료|시청|발송완료|성공)$/i.test(clean(v)); }
  function pct(v){ return v === null || v === undefined ? '데이터 없음' : `${Math.round(Number(v)*100)}%`; }
  function score(v){ return v === null || v === undefined ? '데이터 없음' : `${Number(v).toFixed(1)}점`; }
  function plain(v){ return v === null || v === undefined || v === '' ? '데이터 없음' : clean(v); }
  function latest(arr, dateFieldCandidates){
    const fields = Array.isArray(dateFieldCandidates) ? dateFieldCandidates : [dateFieldCandidates];
    return [...arr].sort((a,b)=>{
      const av = fields.map(f=>clean(a[f])).find(Boolean) || '';
      const bv = fields.map(f=>clean(b[f])).find(Boolean) || '';
      return bv.localeCompare(av);
    })[0];
  }
  function get(row, candidates){
    if(!row) return '';
    const mapped = {};
    Object.keys(row).forEach(k => mapped[key(k)] = row[k]);
    for(const c of candidates){
      const v = mapped[key(c)];
      if(v !== undefined && v !== null && clean(v) !== '') return v;
    }
    return '';
  }
  function sheetRows(wb, list){
    const name = (wb.SheetNames || []).find(n => list.some(a => key(n).includes(key(a))));
    if(!name) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:'', raw:true});
  }

  function inferArea(question){
    const q = clean(question);
    if(/멀티포컬|MF|노안|가입도|우위안|동공/.test(q)) return '멀티포컬';
    if(/난시|저난시|ASD|토릭/.test(q)) return '난시/저난시';
    if(/MAX|맥스|블루|블루라이트/.test(q)) return 'MAX/블루라이트';
    if(/아큐브|브랜드|추천|신뢰|첫.?번째|1순위|우선/.test(q)) return '브랜드/아큐브 추천';
    if(/피팅|검안|상담|설명|응대/.test(q)) return '피팅/상담';
    return '기타 인식';
  }

  function normalizeMaster(rows){
    return (rows||[]).map((r,i)=>({
      ...r,
      안경사ID: clean(get(r,['안경사ID','OpticianID','ID'])) || `AUTO-${i+1}`,
      안경사명: clean(get(r,['안경사명','안경사','성명','이름'])),
      안경원코드: clean(get(r,['안경원코드','거래처코드','스토어코드'])),
      안경원명: clean(get(r,['안경원명','안경원','거래처명','스토어명'])),
      지역: clean(get(r,['지역','시도','권역'])),
      연차: clean(get(r,['연차','경력','Years'])),
      연령대: clean(get(r,['연령대','나이대'])),
      Tier: clean(get(r,['Tier','티어','등급'])),
      채널: clean(get(r,['채널','Channel'])),
      Team: clean(get(r,['Team','팀'])),
      담당영업사원: clean(get(r,['담당영업사원','담당자','영업사원']))
    })).filter(r=>r.안경사ID || r.안경사명 || r.안경원명);
  }

  function normalizeQuestionMaster(rows){
    return (rows||[]).map((r,i)=>({
      문항ID: clean(get(r,['문항ID','QuestionID','QID'])) || `Q${String(i+1).padStart(3,'0')}`,
      문항: clean(get(r,['문항','문항명','Question'])) || clean(get(r,['문항ID','QuestionID','QID'])),
      인식영역: clean(get(r,['인식영역','영역','Category'])) || inferArea(get(r,['문항','문항명','Question'])),
      세부영역: clean(get(r,['세부영역','SubCategory'])),
      제품군: clean(get(r,['제품군','Product'])),
      긍정방향: clean(get(r,['긍정방향','방향'])) || '높을수록 긍정',
      척도최소: num(get(r,['척도최소','최소'])) ?? 1,
      척도최대: num(get(r,['척도최대','최대'])) ?? 5,
      목표값: num(get(r,['목표값','Target'])) ?? 4,
      변화필요기준: clean(get(r,['변화필요기준','기준'])) || '3 이하',
      추천유형: clean(get(r,['추천유형','교육유형'])),
      추천교육ID: clean(get(r,['추천교육ID','교육ID'])),
      분석사용여부: clean(get(r,['분석사용여부','사용여부'])) || 'Y'
    })).filter(r=>r.문항ID || r.문항);
  }

  function isMetaColumn(col){ return metaColumns.some(m => key(col) === key(m)); }
  function qmByIdOrText(col){
    const c = clean(col);
    const id = (c.match(/^(Q\d{2,4})[_\-\s]*/i)||[])[1];
    return state.questionMaster.find(q=>key(q.문항ID)===key(id || c)) ||
           state.questionMaster.find(q=>key(q.문항)===key(c.replace(/^Q\d{2,4}[_\-\s]*/i,''))) ||
           state.questionMaster.find(q=>c.includes(q.문항) || clean(q.문항).includes(c));
  }
  function normalizePerception(rows){
    const out=[];
    (rows||[]).forEach((r,ri)=>{
      const id = clean(get(r,['안경사ID','OpticianID','ID']));
      const date = clean(get(r,['조사일','응답일','Timestamp','타임스탬프']));
      const round = clean(get(r,['조사차수','차수','조사명']));
      if(('문항' in r || '문항ID' in r) && ('응답점수' in r || '응답' in r)){
        const qText = clean(get(r,['문항','문항명','Question'])) || clean(get(r,['문항ID']));
        const qm = qmByIdOrText(clean(get(r,['문항ID','문항','문항명'])));
        out.push({
          조사응답ID: clean(get(r,['조사응답ID','조사ID'])) || `SUR-${ri+1}`,
          안경사ID: id,
          조사일: date,
          조사차수: round,
          문항ID: clean(get(r,['문항ID'])) || qm?.문항ID || qText,
          문항: qText,
          인식영역: clean(get(r,['인식영역'])) || qm?.인식영역 || inferArea(qText),
          긍정방향: qm?.긍정방향 || '높을수록 긍정',
          목표값: qm?.목표값 ?? 4,
          추천교육ID: qm?.추천교육ID || '',
          원점수: num(get(r,['응답점수','응답'])),
          응답텍스트: clean(get(r,['응답텍스트','주관식']))
        });
        return;
      }
      Object.keys(r).forEach(col=>{
        if(isMetaColumn(col)) return;
        const v = r[col];
        const n = num(v);
        if(v === '' || v === null || v === undefined || n === null) return;
        const qm = qmByIdOrText(col);
        const qText = qm?.문항 || clean(col).replace(/^Q\d{2,4}[_\-\s]*/i,'');
        out.push({
          조사응답ID: clean(get(r,['조사응답ID','조사ID'])) || `SUR-${ri+1}`,
          안경사ID: id,
          조사일: date,
          조사차수: round,
          문항ID: qm?.문항ID || (clean(col).match(/^(Q\d{2,4})/i)||[])[1] || clean(col),
          문항: qText,
          인식영역: qm?.인식영역 || inferArea(qText),
          긍정방향: qm?.긍정방향 || '높을수록 긍정',
          목표값: qm?.목표값 ?? 4,
          추천교육ID: qm?.추천교육ID || '',
          원점수: n,
          응답텍스트: ''
        });
      });
    });
    return out.filter(x=>x.안경사ID && x.문항 && x.원점수 !== null);
  }

  function normalizedScore(p){
    const min = 1, max = 5;
    if(p.원점수 === null || p.원점수 === undefined) return null;
    if(/낮을수록/.test(p.긍정방향)) return max + min - Number(p.원점수);
    return Number(p.원점수);
  }
  function isLowPerception(p){
    const s = normalizedScore(p);
    return s !== null && s < 3.5;
  }

  function normalizeRecommendations(rows){
    return (rows||[]).map((r,i)=>({
      ...r,
      추천ID: clean(get(r,['추천ID','ID'])) || `REC-${i+1}`,
      안경사ID: clean(get(r,['안경사ID','OpticianID'])),
      추천순위: num(get(r,['추천순위','순위'])) ?? 1,
      교육ID: clean(get(r,['교육ID','추천교육ID'])),
      추천교육명: clean(get(r,['추천교육명','교육명'])),
      추천유형: clean(get(r,['추천유형','유형'])),
      추천사유요약: clean(get(r,['추천사유요약','추천사유','사유'])),
      근거1: clean(get(r,['근거1'])),
      근거2: clean(get(r,['근거2'])),
      근거3: clean(get(r,['근거3'])),
      우선순위: clean(get(r,['우선순위','Priority'])) || '중간',
      추천상태: clean(get(r,['추천상태','상태']))
    })).filter(r=>r.안경사ID || r.추천교육명 || r.교육ID);
  }

  function byPerson(id){
    return {
      p: state.master.find(x=>clean(x.안경사ID)===clean(id)),
      edu: state.education.filter(x=>clean(get(x,['안경사ID','OpticianID']))===clean(id)),
      know: state.knowledge.filter(x=>clean(get(x,['안경사ID','OpticianID']))===clean(id)),
      perc: state.perceptionLong.filter(x=>clean(x.안경사ID)===clean(id)),
      sales: state.sales.filter(x=>clean(get(x,['안경사ID','OpticianID']))===clean(id) || clean(get(x,['안경원코드']))===clean((state.master.find(m=>m.안경사ID===id)||{}).안경원코드)),
      rec: state.recommendations.filter(x=>clean(x.안경사ID)===clean(id)),
      del: state.delivery.filter(x=>clean(get(x,['안경사ID','OpticianID']))===clean(id)),
      impact: state.impact.filter(x=>clean(get(x,['안경사ID','OpticianID']))===clean(id))
    };
  }

  function metrics(id){
    const b = byPerson(id);
    const completed = b.edu.filter(x=>yes(get(x,['수료여부','완료여부','참여여부']))).length;
    const eduRate = b.edu.length ? completed / b.edu.length : null;
    const kAvg = avg(b.know, x=>num(get(x,['점수','사후평가점수','평가점수'])));
    const pAvg = avg(b.perc, x=>normalizedScore(x));
    const latestSale = latest(b.sales, ['기준월','월','Month','날짜']);
    const acuvueShare = num(get(latestSale,['아큐브판매비중','아큐브전체비중','아큐브비중']));
    const mfShare = num(get(latestSale,['아큐브멀티포컬비중','멀티포컬비중','MF비중']));
    const astShare = num(get(latestSale,['아큐브난시비중','난시비중','Toric비중']));
    const maxSales = num(get(latestSale,['MAX판매','맥스판매','MaxSales']));
    const rec = [...b.rec].sort((a,b)=>(a.추천순위||99)-(b.추천순위||99))[0];
    return { ...b, eduRate, kAvg, pAvg, acuvueShare, mfShare, astShare, maxSales, rec };
  }

  function contentName(id){
    const c = state.content.find(x=>clean(get(x,['교육ID','ID']))===clean(id));
    return clean(get(c,['교육명','콘텐츠명'])) || id || '';
  }
  function priorityBadge(v){
    const cls = v === '높음' ? 'high' : v === '중간' ? 'medium' : 'low';
    return `<span class="pill ${cls}">${plain(v || '낮음')}</span>`;
  }
  function view(id){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    $(id)?.classList.add('active');
    document.querySelector(`.tab[data-view="${id}"]`)?.classList.add('active');
  }
  function toast(msg){
    const t = $('toast'); if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 2200);
  }

  function populateSelect(id, field){
    const el = $(id); if(!el) return;
    const current = el.value;
    const vals = [...new Set(state.master.map(x=>clean(x[field])).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}));
    el.innerHTML = '<option value="">전체</option>' + vals.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    el.value = vals.includes(current) ? current : '';
  }
  function buildFilters(){
    populateSelect('regionFilter','지역');
    populateSelect('yearsFilter','연차');
    populateSelect('tierFilter','Tier');
    populateSelect('channelFilter','채널');
    populateSelect('repFilter','담당영업사원');
    ['regionFilter','yearsFilter','tierFilter','channelFilter','repFilter'].forEach(id=>{
      const el=$(id); if(el) el.onchange=()=>{ state.lastQuery=''; renderAll(); };
    });
  }

  function filteredRows(){
    const filters = {
      지역: $('regionFilter')?.value || '',
      연차: $('yearsFilter')?.value || '',
      Tier: $('tierFilter')?.value || '',
      채널: $('channelFilter')?.value || '',
      담당영업사원: $('repFilter')?.value || ''
    };
    let rows = state.master.filter(r=>Object.entries(filters).every(([k,v])=>!v || clean(r[k])===v));
    const q = clean(state.lastQuery || $('smartQuery')?.value || '');
    if(q){
      const parsed = parseQuery(q);
      if(parsed.year) rows = rows.filter(r=>clean(r.연차).includes(parsed.year));
      if(parsed.region) rows = rows.filter(r=>clean(r.지역).includes(parsed.region));
      if(parsed.textSearch){
        rows = rows.filter(r=>[r.안경사ID,r.안경사명,r.안경원명,r.안경원코드,r.지역,r.채널,r.Tier,r.담당영업사원].join(' ').includes(parsed.textSearch));
      }
      if(parsed.product || parsed.lowPerception || parsed.lowSales || parsed.educationNeeded || parsed.completed){
        rows = rows.filter(r=>matchAdvanced(r, parsed));
      }
    }
    return rows;
  }
  function parseQuery(q){
    const out={raw:q};
    const year = q.match(/(\d+)\s*년차/);
    if(year) out.year = year[1];
    const regions=['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];
    out.region = regions.find(r=>q.includes(r));
    if(/멀티포컬|MF/i.test(q)) out.product='멀티포컬';
    if(/난시|ASD|저난시|토릭/i.test(q)) out.product='난시';
    if(/MAX|맥스|블루/i.test(q)) out.product='MAX';
    if(/인식.*낮|인식.*필요|인식 변화|부정/i.test(q)) out.lowPerception=true;
    if(/판매.*낮|판매.*감소|판매.*오르지|미전환|전환/i.test(q)) out.lowSales=true;
    if(/교육.*필요|추천.*필요|추천교육/i.test(q)) out.educationNeeded=true;
    if(/수료|들었|참여/i.test(q)) out.completed=true;
    const simple = q.replace(/\d+\s*년차/g,'').replace(/MAX|맥스|멀티포컬|난시|저난시|ASD|교육|필요|인식|낮은|낮다|판매|오르지|않은|수료|했지만|중|찾아줘|안경사|매장/g,'').trim();
    if(simple.length >= 2) out.textSearch=simple;
    return out;
  }
  function matchAdvanced(r, f){
    const m = metrics(r.안경사ID);
    const recText = (m.rec ? [m.rec.추천교육명,m.rec.추천사유요약,m.rec.근거1,m.rec.근거2,m.rec.근거3].join(' ') : '');
    const percText = m.perc.map(x=>[x.문항,x.인식영역].join(' ')).join(' ');
    const contentText = recText + ' ' + percText;
    if(f.product && !contentText.includes(f.product)) return false;
    if(f.lowPerception && !m.perc.some(isLowPerception)) return false;
    if(f.educationNeeded && !m.rec) return false;
    if(f.completed && !(m.eduRate === 1)) return false;
    if(f.lowSales){
      const base = avg(state.master, x=>metrics(x.안경사ID).acuvueShare);
      if(m.acuvueShare === null || base === null || m.acuvueShare >= base) return false;
    }
    return true;
  }

  function renderKpis(rows){
    const ids = new Set(rows.map(x=>x.안경사ID));
    const recs = state.recommendations.filter(x=>ids.has(x.안경사ID));
    const dels = state.delivery.filter(x=>ids.has(clean(get(x,['안경사ID','OpticianID']))));
    const impacts = state.impact.filter(x=>ids.has(clean(get(x,['안경사ID','OpticianID']))));
    const acuvueFirst = state.perceptionLong.filter(p=>ids.has(p.안경사ID) && /아큐브|첫.?번째|1순위|우선/.test(p.문항));
    const acuvueFirstAvg = avg(acuvueFirst, p=>normalizedScore(p));
    const html = [
      kpi('전체 관리 안경사', rows.length.toLocaleString('ko-KR'), '현재 필터'),
      kpi('교육추천 필요', new Set(recs.map(x=>x.안경사ID)).size.toLocaleString('ko-KR'), '추천 결과 보유'),
      kpi('추천 생성', recs.length.toLocaleString('ko-KR'), '추천 건'),
      kpi('발송 완료', dels.filter(x=>/발송완료|성공/.test(clean(get(x,['발송상태','발송결과'])))).length.toLocaleString('ko-KR'), '발송/결과 기준'),
      kpi('시청/수료', dels.filter(x=>yes(get(x,['수료여부','시청여부','승인여부']))).length.toLocaleString('ko-KR'), '완료 기준'),
      kpi('아큐브 1순위 추천', acuvueFirstAvg===null?'데이터 없음':pct(acuvueFirstAvg/5), '문항 기반'),
      kpi('교육 후 판매 개선', impacts.filter(x=>num(get(x,['아큐브비중변화','제품군비중변화']))>0 || /개선|성장/.test(clean(get(x,['효과판정'])))).length.toLocaleString('ko-KR'), '효과측정')
    ].join('');
    if($('kpiGrid')) $('kpiGrid').innerHTML = html;

    const ms = rows.map(x=>metrics(x.안경사ID));
    const gaps = [
      ['education','교육 Gap', ms.filter(x=>x.eduRate===null || x.eduRate<1).length],
      ['knowledge','지식 Gap', ms.filter(x=>x.kAvg!==null && x.kAvg<70).length],
      ['perception','인식 Gap', ms.filter(x=>x.perc.some(isLowPerception)).length],
      ['sales','판매 Gap', ms.filter(x=>x.acuvueShare!==null && x.acuvueShare < (avg(ms,y=>y.acuvueShare)||0)).length]
    ];
    if($('gapCards')) $('gapCards').innerHTML = gaps.map(g=>`<div class="gap-card ${g[0]}"><span>${g[1]}</span><b>${g[2]}명</b><small>현재 그룹 기준</small></div>`).join('');

    const top={};
    recs.forEach(r=>{ const name = r.추천교육명 || contentName(r.교육ID); if(name) top[name]=(top[name]||0)+1; });
    if($('topEducation')) $('topEducation').innerHTML = Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,6).map((x,i)=>`<div class="rank-item"><span class="rank-no">${i+1}</span><b>${escapeHtml(x[0])}</b><span>${x[1]}명</span></div>`).join('') || '<div class="empty-state">추천 결과가 없습니다.</div>';

    if($('funnel')){
      const stages=[
        ['관리대상', rows.length],
        ['추천대상', new Set(recs.map(x=>x.안경사ID)).size],
        ['발송완료', new Set(dels.filter(x=>/발송완료|성공/.test(clean(get(x,['발송상태','발송결과'])))).map(x=>clean(get(x,['안경사ID','OpticianID'])))).size],
        ['시청/수료', new Set(dels.filter(x=>yes(get(x,['수료여부','시청여부','승인여부']))).map(x=>clean(get(x,['안경사ID','OpticianID'])))).size],
        ['효과측정', new Set(impacts.map(x=>clean(get(x,['안경사ID','OpticianID'])))).size],
        ['개선', new Set(impacts.filter(x=>num(get(x,['아큐브비중변화','제품군비중변화']))>0 || /개선|성장/.test(clean(get(x,['효과판정'])))).map(x=>clean(get(x,['안경사ID','OpticianID'])))).size]
      ];
      $('funnel').innerHTML = stages.map(s=>`<div class="funnel-step"><small>${s[0]}</small><strong>${s[1]}</strong></div>`).join('');
    }
  }
  function kpi(label,value,note){ return `<div class="kpi-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`; }

  function renderSegment(rows){
    const summary = $('segmentSummary');
    const tb = $('segmentTable');
    if($('resultCount')) $('resultCount').textContent = `${rows.length.toLocaleString('ko-KR')}명`;
    const ms=rows.map(r=>metrics(r.안경사ID));
    if(summary){
      summary.innerHTML = `<div class="three-col">
        <div>${metricBar('평균 지식', avg(ms,x=>x.kAvg), 100, '점')}</div>
        <div>${metricBar('평균 인식', avg(ms,x=>x.pAvg), 5, '점')}</div>
        <div>${metricBar('평균 아큐브 비중', avg(ms,x=>x.acuvueShare), 1, '%')}</div>
      </div>`;
    }
    if(!tb) return;
    tb.innerHTML = ms.map(m=>{
      const p=m.p || {};
      const recName = m.rec ? (m.rec.추천교육명 || contentName(m.rec.교육ID)) : '';
      return `<tr data-id="${escapeHtml(p.안경사ID||'')}">
        <td><b>${escapeHtml(p.안경사명||'')}</b><small><br>${escapeHtml(p.안경사ID||'')}</small></td>
        <td>${escapeHtml(p.안경원명||'')}<small><br>${escapeHtml(p.지역||'')} · ${escapeHtml(p.채널||'')}</small></td>
        <td>${escapeHtml(p.연차||'')} / ${escapeHtml(p.Tier||'')}</td>
        <td>${pct(m.eduRate)}</td>
        <td>${score(m.kAvg)}</td>
        <td>${score(m.pAvg)}</td>
        <td>${pct(m.acuvueShare)}</td>
        <td>${escapeHtml(recName || '없음')}</td>
        <td>${priorityBadge(m.rec?.우선순위)}</td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('tr').forEach(tr=>tr.onclick=()=>showProfile(tr.dataset.id));
  }
  function metricBar(label,v,max,suffix){
    let display='데이터 없음', width=0;
    if(v !== null && v !== undefined){
      if(suffix === '%'){ display = `${Math.round(v*100)}%`; width = Math.max(0,Math.min(100,v*100)); }
      else { display = `${Number(v).toFixed(1)}${suffix}`; width = Math.max(0,Math.min(100,(v/max)*100)); }
    }
    return `<div class="metric"><div class="metric-head"><span>${label}</span><b>${display}</b></div><div class="bar"><i style="width:${width}%"></i></div></div>`;
  }

  function renderRecommendations(rows){
    const ids = new Set(rows.map(x=>x.안경사ID));
    const recs = state.recommendations.filter(x=>ids.has(x.안경사ID));
    if($('recommendationKpis')){
      $('recommendationKpis').innerHTML = [
        kpi('추천 대상', new Set(recs.map(x=>x.안경사ID)).size.toLocaleString('ko-KR'), '안경사'),
        kpi('고우선순위', recs.filter(x=>x.우선순위==='높음').length.toLocaleString('ko-KR'), '추천 건'),
        kpi('발송 대기', recs.filter(x=>/발송대기|생성|검토/.test(clean(x.추천상태))).length.toLocaleString('ko-KR'), '추천상태'),
        kpi('근거 미완성', recs.filter(x=>![x.근거1,x.근거2,x.근거3,x.추천사유요약].some(Boolean)).length.toLocaleString('ko-KR'), '검토 필요')
      ].join('');
    }
    if($('recommendationTable')){
      $('recommendationTable').innerHTML = recs.map(r=>{
        const p = state.master.find(x=>x.안경사ID===r.안경사ID) || {};
        const d = state.delivery.find(x=>clean(get(x,['추천ID']))===clean(r.추천ID) || (clean(get(x,['안경사ID']))===r.안경사ID && clean(get(x,['교육ID']))===clean(r.교육ID))) || {};
        const edu = r.추천교육명 || contentName(r.교육ID);
        const reason = r.추천사유요약 || [r.근거1,r.근거2,r.근거3].filter(Boolean).join(' / ');
        return `<tr data-id="${escapeHtml(r.안경사ID)}"><td><b>${escapeHtml(p.안경사명||r.안경사ID)}</b><small><br>${escapeHtml(p.안경원명||'')}</small></td><td>${escapeHtml(edu)}</td><td>${escapeHtml(r.추천유형||'')}</td><td>${escapeHtml(reason||'')}</td><td>${priorityBadge(r.우선순위)}</td><td>${escapeHtml(r.추천상태||'')}</td><td>${escapeHtml(get(d,['발송상태','발송결과'])||'미발송')}</td><td>${escapeHtml(get(d,['수료여부','시청여부','승인여부'])||'-')}</td><td>${escapeHtml(get(d,['후속액션','담당영업사원후속조치','아큐비아메모'])||'-')}</td></tr>`;
      }).join('') || '<tr><td colspan="9">추천 결과가 없습니다.</td></tr>';
      $('recommendationTable').querySelectorAll('tr[data-id]').forEach(tr=>tr.onclick=()=>showProfile(tr.dataset.id));
    }
  }

  function renderImpact(rows){
    const ids = new Set(rows.map(x=>x.안경사ID));
    const arr = state.impact.filter(x=>ids.has(clean(get(x,['안경사ID','OpticianID']))));
    if($('impactKpis')){
      $('impactKpis').innerHTML = [
        kpi('효과 측정', arr.length.toLocaleString('ko-KR'), '측정 건'),
        kpi('지식 개선', arr.filter(x=>num(get(x,['지식변화']))>0 || num(get(x,['사후지식점수']))>num(get(x,['사전지식점수']))).length.toLocaleString('ko-KR'), '건'),
        kpi('인식 개선', arr.filter(x=>num(get(x,['인식변화']))>0 || num(get(x,['사후인식점수']))>num(get(x,['사전인식점수']))).length.toLocaleString('ko-KR'), '건'),
        kpi('판매 개선', arr.filter(x=>num(get(x,['아큐브비중변화','제품군비중변화']))>0 || /개선|성장/.test(clean(get(x,['효과판정'])))).length.toLocaleString('ko-KR'), '건')
      ].join('');
    }
    if($('impactBars')) $('impactBars').innerHTML = metricBar('평균 지식 변화', avg(arr,x=>num(get(x,['지식변화']))), 100, '점') + metricBar('평균 인식 변화', avg(arr,x=>num(get(x,['인식변화']))), 5, '점') + metricBar('평균 아큐브 비중 변화', avg(arr,x=>num(get(x,['아큐브비중변화']))), 1, '%');
    if($('impactStatus')){
      const counts={}; arr.forEach(x=>{const k=clean(get(x,['효과판정']))||'미분류'; counts[k]=(counts[k]||0)+1;});
      $('impactStatus').innerHTML = Object.entries(counts).map((x,i)=>`<div class="rank-item"><span class="rank-no">${i+1}</span><b>${escapeHtml(x[0])}</b><span>${x[1]}건</span></div>`).join('') || '<div class="empty-state">효과 측정 데이터가 없습니다.</div>';
    }
  }

  function renderQuestionAnalysis(rows){
    const ids = new Set(rows.map(x=>x.안경사ID));
    const data = state.perceptionLong.filter(x=>ids.has(x.안경사ID));
    // If index has no dedicated question section, show a compact insight inside main insight/profile recommendation area when possible.
    if(!data.length) return;
    const byQ = {};
    data.forEach(p=>{ const q=p.문항ID+'|'+p.문항; (byQ[q] ||= []).push(p); });
    const stats = Object.entries(byQ).map(([k,a])=>{
      const [qid,q] = k.split('|');
      return {qid,q,area:a[0].인식영역,n:a.length,avg:avg(a,normalizedScore),low:a.filter(isLowPerception).length,edu:a[0].추천교육ID};
    }).sort((a,b)=>(a.avg??99)-(b.avg??99));
    const weakest = stats[0];
    if($('mainInsight') && weakest){
      $('mainInsight').innerHTML = `<div class="query-explanation"><b>가장 낮은 인식 문항:</b> ${escapeHtml(weakest.q)} · ${score(weakest.avg)} · 낮은 응답 ${weakest.low}명 · 연결교육 ${escapeHtml(contentName(weakest.edu)||weakest.edu||'미지정')}</div>`;
    }
  }

  function showProfile(id){
    const m = metrics(id); if(!m.p) return;
    state.selectedId = id;
    view('profile');
    if($('profileEmpty')) $('profileEmpty').hidden = true;
    if($('profileContent')) $('profileContent').hidden = false;
    const p=m.p;
    if($('profileHero')) $('profileHero').innerHTML = `<div class="profile-title"><div><p class="eyebrow">OPTICIAN 360</p><h2>${escapeHtml(p.안경사명)} <small>${escapeHtml(p.안경사ID)}</small></h2><p>${escapeHtml(p.안경원명||'')}</p><div class="profile-meta"><span class="badge neutral">${escapeHtml(p.지역||'')}</span><span class="badge neutral">${escapeHtml(p.채널||'')}</span><span class="badge neutral">${escapeHtml(p.연차||'')}</span><span class="badge neutral">${escapeHtml(p.Tier||'')}</span><span class="badge neutral">담당 ${escapeHtml(p.담당영업사원||'')}</span></div></div><div>${priorityBadge(m.rec?.우선순위)}</div></div>`;
    if($('profileStatus')) $('profileStatus').innerHTML = [
      ['교육 상태', pct(m.eduRate), '수료율'],
      ['지식 상태', score(m.kAvg), '평균 점수'],
      ['인식 상태', score(m.pAvg), '문항 방향 보정'],
      ['아큐브 판매', pct(m.acuvueShare), '최근/매핑 데이터'],
      ['MF 비중', pct(m.mfShare), '최근/매핑 데이터'],
      ['난시 비중', pct(m.astShare), '최근/매핑 데이터']
    ].map(x=>`<article class="panel status-card"><h3>${x[0]}</h3><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('');
    if($('profileRecommendation')){
      const r=m.rec;
      const lowP=m.perc.filter(isLowPerception).sort((a,b)=>normalizedScore(a)-normalizedScore(b)).slice(0,5);
      $('profileRecommendation').innerHTML = r ? `<div class="recommendation-box"><h3>${escapeHtml(r.추천교육명 || contentName(r.교육ID))}</h3><p>${escapeHtml(r.추천사유요약||'')}</p><ul>${[r.근거1,r.근거2,r.근거3].filter(Boolean).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}${lowP.map(x=>`<li>낮은 인식 문항: ${escapeHtml(x.문항)} (${score(normalizedScore(x))})</li>`).join('')}</ul></div>` : `<div class="recommendation-box"><h3>추천 결과 없음</h3><p>낮은 인식 문항 ${lowP.length}개를 확인했습니다.</p><ul>${lowP.map(x=>`<li>${escapeHtml(x.문항)} (${score(normalizedScore(x))}) · 연결교육 ${escapeHtml(contentName(x.추천교육ID)||x.추천교육ID||'미지정')}</li>`).join('')}</ul></div>`;
    }
    if($('profileTimeline')){
      const events=[];
      m.edu.forEach(x=>events.push([clean(get(x,['교육일','완료일','신청일'])), '교육', `${contentName(get(x,['교육ID'])) || get(x,['교육ID'])} · ${get(x,['수료여부','참여여부'])}`]));
      m.perc.forEach(x=>events.push([x.조사일, '인식조사', `${x.문항} · 원점수 ${x.원점수}`]));
      m.sales.forEach(x=>events.push([clean(get(x,['기준월','월','Month'])), '판매/피팅', `아큐브 비중 ${pct(num(get(x,['아큐브판매비중','아큐브비중'])))}`]));
      m.del.forEach(x=>events.push([clean(get(x,['발송일','요청일'])), '발송/시청', `${get(x,['발송상태','발송결과'])} · ${get(x,['수료여부','시청여부','승인여부'])}`]));
      $('profileTimeline').innerHTML = events.filter(x=>x[0]).sort((a,b)=>clean(b[0]).localeCompare(clean(a[0]))).slice(0,20).map(e=>`<div class="timeline-item"><b>${escapeHtml(e[1])}</b><small>${escapeHtml(e[0])} · ${escapeHtml(e[2])}</small></div>`).join('') || '<p>타임라인 데이터가 없습니다.</p>';
    }
  }

  function renderAll(){
    const rows = filteredRows();
    state.filtered = rows;
    renderKpis(rows);
    renderSegment(rows);
    renderRecommendations(rows);
    renderImpact(rows);
    renderQuestionAnalysis(rows);
    if($('uploadStatus')) $('uploadStatus').textContent = state.workbookName;
  }

  async function handleUpload(file){
    if(!file) return;
    if(!window.XLSX){ toast('XLSX 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 CDN 접근을 확인해 주세요.'); return; }
    const wb = XLSX.read(await file.arrayBuffer(), {type:'array', cellDates:false});
    state.workbookName = file.name;
    state.master = normalizeMaster(sheetRows(wb, aliases.master));
    state.content = sheetRows(wb, aliases.content);
    state.education = sheetRows(wb, aliases.education);
    state.knowledge = sheetRows(wb, aliases.knowledge);
    state.perceptionRaw = sheetRows(wb, aliases.perception);
    state.sales = sheetRows(wb, aliases.sales);
    state.diagnosis = sheetRows(wb, aliases.diagnosis);
    state.questionMaster = normalizeQuestionMaster(sheetRows(wb, aliases.questionMaster));
    state.perceptionLong = normalizePerception(state.perceptionRaw);
    state.recommendations = normalizeRecommendations(sheetRows(wb, aliases.recommendations));
    state.delivery = sheetRows(wb, aliases.delivery);
    state.impact = sheetRows(wb, aliases.impact);
    buildFilters();
    renderAll();
    toast(`업로드 완료: 안경사 ${state.master.length}명, 인식 응답 ${state.perceptionLong.length}건`);
  }

  function ask(){
    state.lastQuery = clean($('smartQuery')?.value || '');
    renderAll();
    const count = state.filtered.length;
    if($('queryExplanation')) $('queryExplanation').textContent = state.lastQuery ? `검색 조건 적용: ${state.lastQuery} / 결과 ${count.toLocaleString('ko-KR')}명` : '필터를 선택하거나 자연어로 대상을 찾아보세요.';
    view('segment');
    if(count === 1) showProfile(state.filtered[0].안경사ID);
  }

  function reset(){
    ['regionFilter','yearsFilter','tierFilter','channelFilter','repFilter'].forEach(id=>{ if($(id)) $(id).value=''; });
    if($('smartQuery')) $('smartQuery').value='';
    state.lastQuery='';
    renderAll();
  }

  function downloadResults(){
    const rows = (state.filtered.length ? state.filtered : filteredRows()).map(p=>{
      const m=metrics(p.안경사ID);
      return {
        안경사ID:p.안경사ID, 안경사명:p.안경사명, 안경원명:p.안경원명, 지역:p.지역, 연차:p.연차, Tier:p.Tier, 채널:p.채널, 담당영업사원:p.담당영업사원,
        교육수료율:m.eduRate, 지식평균:m.kAvg, 인식평균:m.pAvg, 아큐브판매비중:m.acuvueShare,
        추천교육:m.rec ? (m.rec.추천교육명 || contentName(m.rec.교육ID)) : '', 추천사유:m.rec?.추천사유요약||'', 우선순위:m.rec?.우선순위||''
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '검색결과');
    XLSX.writeFile(wb, 'ACUVUE_교육추천_검색결과.xlsx');
  }

  function escapeHtml(s){ return clean(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

  function seedDemo(){
    state.master = normalizeMaster([
      {안경사ID:'A001',안경사명:'홍길동',안경원코드:'S001',안경원명:'A안경원',지역:'서울',연차:'3년차',Tier:'Gold',채널:'I/O',담당영업사원:'김담당'},
      {안경사ID:'A002',안경사명:'김민지',안경원코드:'S002',안경원명:'B안경원',지역:'경기',연차:'5년차',Tier:'Silver',채널:'Top50',담당영업사원:'이담당'}
    ]);
    state.content=[{교육ID:'E024',교육명:'숫자로 보는 난시',유형:'KOL 난시 강의'},{교육ID:'E003',교육명:'성공적인 멀티포컬 피팅',유형:'멀티포컬 검안'}];
    state.questionMaster=normalizeQuestionMaster([
      {문항ID:'Q001',문항:'저난시도 교정해야 한다고 생각한다',인식영역:'난시/저난시',긍정방향:'높을수록 긍정',추천교육ID:'E024'},
      {문항ID:'Q002',문항:'멀티포컬 렌즈를 성공적으로 피팅할 자신이 있다',인식영역:'멀티포컬',긍정방향:'높을수록 긍정',추천교육ID:'E003'}
    ]);
    state.perceptionRaw=[{안경사ID:'A001',조사일:'2026-07-01','Q001_저난시도 교정해야 한다고 생각한다':2,'Q002_멀티포컬 렌즈를 성공적으로 피팅할 자신이 있다':3},{안경사ID:'A002',조사일:'2026-07-01','Q001_저난시도 교정해야 한다고 생각한다':4,'Q002_멀티포컬 렌즈를 성공적으로 피팅할 자신이 있다':2}];
    state.perceptionLong=normalizePerception(state.perceptionRaw);
    state.recommendations=normalizeRecommendations([{안경사ID:'A001',추천교육명:'숫자로 보는 난시',추천사유요약:'저난시 인식 보완',우선순위:'높음',추천상태:'생성'}]);
    buildFilters();
    renderAll();
  }

  function init(){
    document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>view(tab.dataset.view)));
    $('workbookInput')?.addEventListener('change', e=>handleUpload(e.target.files[0]).catch(err=>{console.error(err); toast('엑셀 업로드 중 오류가 발생했습니다.');}));
    $('runQuery')?.addEventListener('click', ask);
    $('smartQuery')?.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(); });
    $('resetFilters')?.addEventListener('click', reset);
    $('downloadResults')?.addEventListener('click', downloadResults);
    document.querySelectorAll('.examples button').forEach(b=>b.addEventListener('click',()=>{ if($('smartQuery')) $('smartQuery').value=b.dataset.query||b.textContent; ask(); }));
    seedDemo();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
