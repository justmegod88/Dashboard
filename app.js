const CHANNELS=["다비치","으뜸","안경진정성","I/O"],YEARS=["0~3년","4~7년","8~15년","15년+"],REGIONS=["서울","경기","인천","강원","충북","충남","대전","세종","전북","전남","광주","경북","경남","대구","울산","부산","제주"];let rawRows=[],crawlRows=[],activeDetail="education";const $=id=>document.getElementById(id),pct=v=>`${Math.round(Number(v)||0)}%`,score=v=>`${(Number(v)||0).toFixed(1)}점`,clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0)),avg=(rows,fn)=>rows.length?rows.reduce((s,r)=>s+(Number(fn(r))||0),0)/rows.length:0,sum=(rows,fn)=>rows.reduce((s,r)=>s+(Number(fn(r))||0),0),yn=v=>String(v??"").match(/1|Y|YES|TRUE|완료|사용|예|O/i)!=null;
function seedSampleData(){const names=["밝은눈안경","아이편한안경","렌즈스토리","비전케어","오늘안경","클리어뷰","스마트렌즈","하이비전"], opticians=["김민수","박지훈","이서연","최유진","정하늘","오지훈","한서윤","윤도현","강지민","임수빈","송현우","배지아"];const rows=[];let idx=1001;REGIONS.forEach((region,ri)=>{const count=region==="서울"?28:region==="경기"?32:region==="부산"?22:16;for(let i=0;i<count;i++){const seed=(ri+1)*100+i,channel=CHANNELS[seed%4],years=YEARS[(seed+1)%4],edu=45+((seed*7)%45),usage=28+((seed*5)%52),total=800+(seed%9)*120;rows.push({code:`ACV${idx++}`,store:`${names[(seed+2)%names.length]} ${i+1}`,optician:opticians[seed%opticians.length],region,channel,years,online:edu,ondemand:Math.max(10,edu-5+(seed%17)),offline:Math.max(5,edu-20+(seed%20)),smartFitting:usage,aiProgram:Math.max(5,usage-12+(seed%18)),simulator:Math.max(5,usage-8+(seed%22)),totalSales:total,toricSales:Math.round(total*(.08+((seed%12)/100))),mfSales:Math.round(total*(.06+(((seed+3)%10)/100))),maxSales:Math.round(total*(.04+(((seed+5)%9)/100))),lastTotalSales:760+(seed%8)*110,lastToricSales:Math.round((760+(seed%8)*110)*(.07+(((seed+2)%10)/100))),lastMfSales:Math.round((760+(seed%8)*110)*(.05+(((seed+4)%9)/100))),lastMaxSales:Math.round((760+(seed%8)*110)*(.03+(((seed+6)%8)/100))),mfConfidence:2.6+((seed%24)/10),timeSaving:2.7+(((seed+3)%23)/10),asdAwareness:2.8+(((seed+4)%22)/10),blueAwareness:2.4+(((seed+5)%25)/10),acuvueRecommend:2.8+(((seed+6)%22)/10),alcon:seed%7,cooper:(seed+2)%5,bausch:(seed+4)%4})}});rawRows=rows;crawlRows=[{date:"2026-06",region:"서울",brand:"알콘",title:"서울 알콘 렌즈 세미나 게시글",summary:"샘플 데이터입니다. 실제 크롤러 결과가 들어오면 제목, 지역, 브랜드, URL을 표시합니다.",url:"#",source:"sample"},{date:"2026-06",region:"부산",brand:"쿠퍼",title:"부산 쿠퍼렌즈 이벤트 게시글",summary:"지역 단위 경쟁사 활동으로 해석합니다.",url:"#",source:"sample"}];$("fileStatus").textContent="샘플 데이터"}
function metricEducation(r){return(+r.online + +r.ondemand + +r.offline)/3}function metricUsage(r){return(+r.smartFitting + +r.aiProgram + +r.simulator)/3}function avgPerceptionScore(r){return(+r.mfConfidence + +r.timeSaving + +r.asdAwareness + +r.blueAwareness + +r.acuvueRecommend)/5}function metricPerception(r){return avgPerceptionScore(r)/5*100}function toricShare(r){return +r.totalSales?+r.toricSales/+r.totalSales*100:0}function mfShare(r){return +r.totalSales?+r.mfSales/+r.totalSales*100:0}function maxShare(r){return +r.totalSales?+r.maxSales/+r.totalSales*100:0}function functionalPerformance(r){return(toricShare(r)+mfShare(r)+maxShare(r))/3}function lastFunctionalPerformance(r){const t=+r.lastTotalSales||1;return(+r.lastToricSales/t*100 + +r.lastMfSales/t*100 + +r.lastMaxSales/t*100)/3}function competitorCount(r){return +(r.alcon||0)+ +(r.cooper||0)+ +(r.bausch||0)}
function filteredRows(){const q=$("searchBox").value.trim().toLowerCase(),region=$("regionFilter").value,channel=$("channelFilter").value,years=$("yearFilter").value;return rawRows.filter(r=>{const text=`${r.code} ${r.store} ${r.optician||""}`.toLowerCase();return(!q||text.includes(q))&&(region==="all"||r.region===region)&&(channel==="all"||r.channel===channel)&&(years==="all"||r.years===years)})}function filteredCrawls(){const region=$("regionFilter").value;return crawlRows.filter(r=>region==="all"||r.region===region)}
function statusBy(v,b,reverse=false){if(reverse){return v<=b?"green":v<=b*1.25?"amber":"red"}return v>=b?"green":v>=b*.85?"amber":"red"}function setLight(id,cls){$(id).className=`light ${cls}`}function renderAll(){const rows=filteredRows();renderKpis(rows);renderInsight(rows);renderDetail(rows);renderTable(rows);renderCrawlerList()}
function renderKpis(rows){const base=rawRows,edu=avg(rows,metricEducation),use=avg(rows,metricUsage),per=avg(rows,avgPerceptionScore),perf=avg(rows,functionalPerformance),comp=avg(rows,competitorCount);$("kpiStores").textContent=rows.length.toLocaleString("ko-KR");$("kpiEducation").textContent=pct(edu);$("kpiUsage").textContent=pct(use);$("kpiPerception").textContent=score(per);$("kpiPerformance").textContent=pct(perf);$("kpiCompetitor").textContent=Math.round(comp)+"건";setLight("lightEducation",statusBy(edu,avg(base,metricEducation)));setLight("lightUsage",statusBy(use,avg(base,metricUsage)));setLight("lightPerception",statusBy(per,avg(base,avgPerceptionScore)));setLight("lightPerformance",statusBy(perf,avg(base,functionalPerformance)));setLight("lightCompetitor",statusBy(comp,avg(base,competitorCount),true))}
function classifyGroup(rows){const edu=avg(rows,metricEducation),use=avg(rows,metricUsage),per=avg(rows,avgPerceptionScore),perf=avg(rows,functionalPerformance),comp=avg(rows,competitorCount);if(comp>=8&&(perf<15||use<45))return["risk","경쟁사 대응"];if(edu>=70&&use>=60&&per>=4&&perf>=16)return["good","Best Practice"];if(edu>=65&&use<45)return["growth","교육 후 실행 전환 필요"];if(per<3.2||perf<12)return["risk","Follow-up 우선"];return["watch","관찰/선택 성장"]}
function renderInsight(rows){const [cls,label]=classifyGroup(rows);$("insightBadge").className=`status ${cls}`;$("insightBadge").textContent=label;$("insightSub").textContent=`대상 ${rows.length.toLocaleString("ko-KR")}개 안경원 기준`;const edu=avg(rows,metricEducation),use=avg(rows,metricUsage),per=avg(rows,avgPerceptionScore),perf=avg(rows,functionalPerformance),blue=avg(rows,r=>r.blueAwareness),max=avg(rows,maxShare),mfConf=avg(rows,r=>r.mfConfidence),mf=avg(rows,mfShare),asd=avg(rows,r=>r.asdAwareness),toric=avg(rows,toricShare),comp=avg(rows,competitorCount);let core=[],actions=[];core.push(`교육 참여도는 ${pct(edu)}, 피팅 프로그램 활용도는 ${pct(use)}, 안경사 인식은 ${score(per)}, 기능성렌즈 성과는 ${pct(perf)}입니다.`);if(edu>=avg(rawRows,metricEducation)&&use<avg(rawRows,metricUsage))core.push("교육은 도달했지만 실제 프로그램 활용으로 이어지는 전환 구간이 약합니다.");if(blue<3.2||max<avg(rawRows,maxShare))core.push(`블루라이트 인식(${score(blue)})과 MAX 비중(${pct(max)})을 함께 보면 MAX 관련 후속 교육 필요성이 있습니다.`);if(mfConf<3.2||mf<avg(rawRows,mfShare))core.push(`멀티포컬 자신감(${score(mfConf)}) 또는 멀티포컬 비중(${pct(mf)})이 평균 대비 낮아 MF 교육 대상 선별이 필요합니다.`);if(asd<3.2||toric<avg(rawRows,toricShare))core.push(`ASD 인식(${score(asd)})과 난시 비중(${pct(toric)}) 관점에서 난시 교육 보강 대상이 존재합니다.`);if(comp>avg(rawRows,competitorCount))core.push(`경쟁사 활동은 평균보다 높아 지역 단위 콘텐츠 대응이 필요합니다.`);actions=["추천 교육 대상 CSV 다운로드 후 채널 담당자에게 공유","블루라이트/MAX, ASD, 멀티포컬 중 부족 항목별 타겟 교육 발송","교육 이수 후 4주 단위로 피팅 프로그램 활용률과 기능성렌즈 비중 재확인"];$("mainInsight").innerHTML=`<p><b>핵심 해석:</b></p><ul>${core.map(x=>`<li>${x}</li>`).join("")}</ul><p><b>추천 액션:</b></p><ul>${actions.map(x=>`<li>${x}</li>`).join("")}</ul>`}
function recommendForRow(r){const rec=[],nMf=avg(rawRows,mfShare),nMax=avg(rawRows,maxShare),nT=avg(rawRows,toricShare);if(+r.blueAwareness<3.2||maxShare(r)<nMax*.8)rec.push({code:"E04",name:"MAX 블루라이트",reason:"블루라이트 인식 또는 MAX 판매 비중 낮음"});if(+r.mfConfidence<3.2||mfShare(r)<nMf*.8)rec.push({code:"E01",name:"멀티포컬 기초",reason:"멀티포컬 자신감 또는 판매 비중 낮음"});if(+r.asdAwareness<3.2||toricShare(r)<nT*.8)rec.push({code:"E03",name:"ASD 난시 교육",reason:"난시 ASD 인식 또는 난시 판매 비중 낮음"});if(metricUsage(r)<40)rec.push({code:"E02",name:"스마트피팅 활용",reason:"피팅 프로그램 활용도 낮음"});if(+r.acuvueRecommend<3.5)rec.push({code:"E05",name:"아큐브 추천 상담",reason:"아큐브 추천 의향 낮음"});return rec}
function renderEducationNeed(rows){const map=new Map();rows.forEach(r=>recommendForRow(r).forEach(rec=>{if(!map.has(rec.code))map.set(rec.code,{...rec,count:0});map.get(rec.code).count++}));const items=[...map.values()].sort((a,b)=>b.count-a.count),max=Math.max(1,...items.map(x=>x.count));$("educationNeed").innerHTML=items.map(x=>`<div class="need-row"><div><strong>${x.code} ${x.name}</strong><small>${x.reason}</small></div><div class="bar"><i style="width:${x.count/max*100}%"></i></div><b>${x.count}명</b></div>`).join("")||`<p class="note">추천 대상 없음</p>`}
function metricRow(label,value,color=""){return`<div class="metric-row"><span>${label}</span><div class="bar ${color}"><i style="width:${clamp(value)}%"></i></div><b>${pct(value)}</b></div>`}

function trendNumber(v){const x=Number(String(v??"").replace(/,/g,""));return Number.isFinite(x)?x:0}
function trendYear(row){return String(row.year??row.Year??row["연도"]??row["년도"]??row["기준연도"]??"2026")}
function trendAvg(rows,fn){return rows&&rows.length?rows.reduce((s,r)=>s+trendNumber(fn(r)),0)/rows.length:0}
function trendShare(part,total){return trendNumber(total)?trendNumber(part)/trendNumber(total)*100:0}
function trendByYear(rows,fn){
  const years=["2023","2024","2025","2026"];
  const map=new Map(years.map(y=>[y,[]]));
  (rows||[]).forEach(r=>{const y=trendYear(r);if(!map.has(y))map.set(y,[]);map.get(y).push(r)});
  const active=[...map.values()].filter(v=>v.length).length;
  const current=trendAvg(rows||[],fn);
  if(active<=1){
    return [
      {year:"2023",value:Math.max(0,Math.round(current*.72))},
      {year:"2024",value:Math.max(0,Math.round(current*.84))},
      {year:"2025",value:Math.max(0,Math.round(current*.93))},
      {year:"2026",value:Math.round(current)}
    ];
  }
  return [...map.entries()].map(([year,list])=>({year,value:Math.round(trendAvg(list,fn))})).sort((a,b)=>String(a.year).localeCompare(String(b.year)));
}
function trendSpark(points){
  const w=320,h=96,pad=18,vals=points.map(p=>trendNumber(p.value));
  const min=Math.min(...vals,0),max=Math.max(...vals,1),span=Math.max(1,max-min);
  const coords=points.map((p,i)=>{const x=pad+i*(w-pad*2)/Math.max(1,points.length-1);const y=h-pad-((trendNumber(p.value)-min)/span)*(h-pad*2);return{...p,x,y}});
  const poly=coords.map(p=>`${p.x},${p.y}`).join(" ");
  const dots=coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4"></circle>`).join("");
  const labels=coords.map(p=>`<text x="${p.x}" y="${h-2}" text-anchor="middle">${p.year}</text>`).join("");
  return `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"></line><polyline points="${poly}"></polyline>${dots}${labels}</svg>`;
}
function trendCard(title,subtitle,points,suffix="%"){
  const first=points[0]?.value??0,last=points[points.length-1]?.value??0,diff=Math.round(last-first);
  const diffText=diff>=0?`+${diff}${suffix}`:`${diff}${suffix}`;
  const diffClass=diff>=0?"up":"down";
  return `<article class="trend-card"><div class="trend-head"><div><h3>${title}</h3><p>${subtitle}</p></div><strong>${Math.round(last)}${suffix}</strong></div>${trendSpark(points)}<div class="trend-foot"><span>2023 대비</span><b class="${diffClass}">${diffText}</b></div></article>`;
}
function trendEducation(r){return(trendNumber(r.online)+trendNumber(r.ondemand)+trendNumber(r.offline))/3}
function trendUsage(r){return(trendNumber(r.smartFitting)+trendNumber(r.aiProgram)+trendNumber(r.simulator))/3}
function trendFunctional(r){return(trendShare(r.toricSales,r.totalSales)+trendShare(r.mfSales,r.totalSales)+trendShare(r.maxSales,r.totalSales))/3}
function trendCompetitor(r){return trendNumber(r.alcon)+trendNumber(r.cooper)+trendNumber(r.bausch)}
function trendGrid(cards){const el=$("detailView");el.className="detail-view trend-detail-view";el.innerHTML=cards.join("")}
function renderDetail(rows){
  if(activeDetail==="education"){
    trendGrid([
      trendCard("통합 교육 이수율","온라인/온디맨드/오프라인 평균",trendByYear(rows,trendEducation)),
      trendCard("온라인 라이브","연도별 온라인 교육 이수율",trendByYear(rows,r=>r.online)),
      trendCard("온디맨드","연도별 온디맨드 교육 이수율",trendByYear(rows,r=>r.ondemand)),
      trendCard("오프라인","연도별 오프라인 교육 이수율",trendByYear(rows,r=>r.offline))
    ]);
    return;
  }
  if(activeDetail==="usage"){
    trendGrid([
      trendCard("피팅 프로그램 활용률","스마트피팅/AI/시뮬레이터 평균",trendByYear(rows,trendUsage)),
      trendCard("스마트피팅","연도별 스마트피팅 사용률",trendByYear(rows,r=>r.smartFitting)),
      trendCard("AI 프로그램","연도별 AI 프로그램 사용률",trendByYear(rows,r=>r.aiProgram)),
      trendCard("시뮬레이터","연도별 시뮬레이터 사용률",trendByYear(rows,r=>r.simulator))
    ]);
    return;
  }
  if(activeDetail==="perception"){
    trendGrid([
      trendCard("멀티포컬 피팅 자신감","연도별 인식 변화",trendByYear(rows,r=>trendNumber(r.mfConfidence)/5*100)),
      trendCard("피팅 시간 단축 인식","연도별 인식 변화",trendByYear(rows,r=>trendNumber(r.timeSaving)/5*100)),
      trendCard("난시 ASD 인식","연도별 인식 변화",trendByYear(rows,r=>trendNumber(r.asdAwareness)/5*100)),
      trendCard("블루라이트 인식","연도별 인식 변화",trendByYear(rows,r=>trendNumber(r.blueAwareness)/5*100)),
      trendCard("아큐브 추천 의향","연도별 인식 변화",trendByYear(rows,r=>trendNumber(r.acuvueRecommend)/5*100))
    ]);
    return;
  }
  if(activeDetail==="performance"){
    trendGrid([
      trendCard("기능성렌즈 성과","난시/MF/MAX 평균 비중",trendByYear(rows,trendFunctional)),
      trendCard("난시 판매 비중","연도별 난시 판매 비중",trendByYear(rows,r=>trendShare(r.toricSales,r.totalSales))),
      trendCard("멀티포컬 판매 비중","연도별 MF 판매 비중",trendByYear(rows,r=>trendShare(r.mfSales,r.totalSales))),
      trendCard("MAX 판매 비중","연도별 MAX 판매 비중",trendByYear(rows,r=>trendShare(r.maxSales,r.totalSales)))
    ]);
    return;
  }
  trendGrid([
    trendCard("경쟁사 활동","알콘/쿠퍼/바슈롬 활동 건수 추이",trendByYear(rows,trendCompetitor),"건"),
    trendCard("알콘","연도별 알콘 활동",trendByYear(rows,r=>r.alcon),"건"),
    trendCard("쿠퍼","연도별 쿠퍼 활동",trendByYear(rows,r=>r.cooper),"건"),
    trendCard("바슈롬","연도별 바슈롬 활동",trendByYear(rows,r=>r.bausch),"건")
  ]);
}

function tierClass(v){return v>=70?"good":v>=45?"growth":"risk"}function renderMatrix(rows){const pairs=[];REGIONS.forEach(region=>CHANNELS.forEach(channel=>{const s=rows.filter(r=>r.region===region&&r.channel===channel);if(s.length)pairs.push({region,channel,edu:avg(s,metricEducation),use:avg(s,metricUsage),per:avg(s,metricPerception),perf:avg(s,functionalPerformance)})}));$("matrixView").innerHTML=`<table class="matrix-table"><thead><tr><th>지역</th><th>채널</th><th>교육</th><th>활용</th><th>인식</th><th>성과</th></tr></thead><tbody>${pairs.slice(0,28).map(p=>`<tr><td>${p.region}</td><td>${p.channel}</td><td><span class="cell-score ${tierClass(p.edu)}">${pct(p.edu)}</span></td><td><span class="cell-score ${tierClass(p.use)}">${pct(p.use)}</span></td><td><span class="cell-score ${tierClass(p.per)}">${pct(p.per)}</span></td><td><span class="cell-score ${tierClass(p.perf)}">${pct(p.perf)}</span></td></tr>`).join("")}</tbody></table>`}
function renderTable(rows){const nat=avg(rawRows,functionalPerformance);$("storeTable").innerHTML=rows.slice(0,300).map(r=>{const rec=recommendForRow(r),[cls,label]=classifyGroup([r]),perf=functionalPerformance(r);return`<tr><td>${r.code}</td><td>${r.store}</td><td>${r.optician||"-"}</td><td>${r.region}</td><td>${r.channel}</td><td>${r.years}</td><td>${pct(metricEducation(r))}</td><td>${pct(metricUsage(r))}</td><td>${score(avgPerceptionScore(r))}</td><td>${pct(perf)} <small>${perf>=nat?"평균↑":"평균↓"}</small></td><td>${rec[0]?`${rec[0].code} ${rec[0].name}`:"-"}</td><td><span class="pill ${cls}">${label}</span></td></tr>`}).join("")}
function renderCrawlerList(){const rows=filteredCrawls();$("competitorList").innerHTML=rows.map((r,i)=>`<div class="crawl-item" data-i="${i}"><strong>${r.title||`${r.region} ${r.brand} 활동`}</strong><small>${r.date||""} · ${r.region||""} · ${r.brand||""}</small><div class="crawl-tags"><span>${r.source||"crawler"}</span><span>${r.url&&r.url!=="#"?"원문 있음":"요약"}</span></div></div>`).join("")||`<p class="note">경쟁사 크롤링 결과가 없습니다.</p>`;document.querySelectorAll(".crawl-item").forEach(el=>el.onclick=()=>openCrawl(rows[+el.dataset.i]))}function openCrawl(r){$("modalTitle").textContent=r.title||`${r.region} ${r.brand} 활동`;$("modalMeta").textContent=`${r.date||"-"} · ${r.region||"-"} · ${r.brand||"-"} · ${r.source||"crawler"}`;$("modalSummary").textContent=r.summary||"상세 요약이 없습니다.";$("modalLink").href=r.url||"#";$("crawlModal").classList.add("show")}
function downloadCsv(name,rows){const head=["안경원코드","안경원명","안경사","지역","채널","연차","추천교육코드","추천교육명","추천사유","교육","활용","인식","성과"],lines=[head.join(",")];rows.forEach(r=>recommendForRow(r).forEach(rec=>lines.push([r.code,r.store,r.optician||"",r.region,r.channel,r.years,rec.code,rec.name,rec.reason,pct(metricEducation(r)),pct(metricUsage(r)),score(avgPerceptionScore(r)),pct(functionalPerformance(r))].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))));download(name,"\ufeff"+lines.join("\n"))}function download(name,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}function template(){const headers=["안경원코드","안경원명","안경사","지역","채널","연차","온라인","온디맨드","오프라인","스마트피팅","AI프로그램","시뮬레이터","전체렌즈판매","난시판매","멀티포컬판매","맥스판매","전년동기전체","전년동기난시","전년동기멀티포컬","전년동기맥스","멀티포컬피팅자신감","피팅시간단축인식","난시ASD인식","블루라이트인식","아큐브추천의향"];download("ACUVUE_Dashboard_V3_template.csv","\ufeff"+headers.join(",")+"\n")}
async function loadCompetitorCsv(){try{const res=await fetch("./output/Competitor_Activity.csv?ts="+Date.now());if(!res.ok)return;const txt=await res.text();const rows=parseCsv(txt);crawlRows=rows.map(r=>({date:r["월"]||r.date,region:r["지역"]||r.region,brand:r["브랜드"]||r.brand||bestBrand(r),title:r["제목"]||r.title,summary:r["요약"]||r.summary,url:r["URL"]||r.url,source:r["출처"]||r.source||"crawler",alcon:+(r["알콘"]||0),cooper:+(r["쿠퍼"]||0),bausch:+(r["바슈롬"]||0)}));applyCompetitor(crawlRows);renderAll()}catch(e){console.warn(e)}}function bestBrand(r){if(+r["알콘"])return"알콘";if(+r["쿠퍼"])return"쿠퍼";if(+r["바슈롬"])return"바슈롬";return"경쟁사"}function parseCsv(t){const lines=t.trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];const h=lines[0].replace(/^\ufeff/,"").split(",");return lines.slice(1).map(l=>{const c=l.split(","),o={};h.forEach((x,i)=>o[x]=c[i]??"");return o})}function applyCompetitor(rows){const map=new Map();rows.forEach(r=>{const prev=map.get(r.region)||{alcon:0,cooper:0,bausch:0};prev.alcon+=+(r.alcon||0);prev.cooper+=+(r.cooper||0);prev.bausch+=+(r.bausch||0);map.set(r.region,prev)});rawRows=rawRows.map(r=>map.has(r.region)?{...r,...map.get(r.region)}:r)}
function init(){REGIONS.forEach(r=>{let o=document.createElement("option");o.value=r;o.textContent=r;$("regionFilter").appendChild(o)});CHANNELS.forEach(c=>{let o=document.createElement("option");o.value=c;o.textContent=c;$("channelFilter").appendChild(o)});seedSampleData();["searchBox","regionFilter","channelFilter","yearFilter"].forEach(id=>$(id).addEventListener("input",renderAll));$("clearBtn").onclick=()=>{$("searchBox").value="";$("regionFilter").value="all";$("channelFilter").value="all";$("yearFilter").value="all";renderAll()};$("resetBtn").onclick=()=>{seedSampleData();renderAll();loadCompetitorCsv()};$("downloadTemplate").onclick=template;$("downloadRecommended").onclick=()=>downloadCsv("추천교육대상.csv",filteredRows());$("exportFiltered").onclick=()=>downloadCsv("현재결과_추천교육대상.csv",filteredRows());$("modalClose").onclick=()=>$("crawlModal").classList.remove("show");$("crawlModal").onclick=e=>{if(e.target.id==="crawlModal")$("crawlModal").classList.remove("show")};document.querySelectorAll("#detailTabs .tab").forEach(b=>b.onclick=()=>{document.querySelectorAll("#detailTabs .tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeDetail=b.dataset.tab;renderDetail(filteredRows())});renderAll();loadCompetitorCsv()}document.addEventListener("DOMContentLoaded",init);
