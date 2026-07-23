(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const state={rows:[],filtered:[]};
  const aliases={sales:['06_피팅판매','피팅판매','Sheet2']};
  const growthAliases={
    ast:['난시 성장률','난시성장률','난시제품 성장률','난시 제품 성장률'],
    mf:['멀티포컬 성장률','멀티포컬성장률','MF 성장률','MF성장률'],
    max:['맥스 성장률','맥스성장률','MAX 성장률','MAX성장률','MAX제품군 성장률','맥스제품군 성장률']
  };
  const clean=v=>v==null?'':String(v).trim();
  const norm=s=>clean(s).replace(/[\s_\-()\/]/g,'').toLowerCase();
  const esc=s=>clean(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>{if(v==null||v==='')return null;const s=String(v).replace(/,/g,'');const m=s.match(/[-+]?\d+(?:\.\d+)?/);return m?Number(m[0]):null};
  const avg=(arr,fn=x=>x)=>{const v=arr.map(fn).filter(x=>x!=null&&Number.isFinite(Number(x))).map(Number);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const rate=v=>v==null?'데이터 없음':`${v>=0?'+':''}${Number(v).toFixed(1)}%`;
  const pp=v=>v==null?'데이터 없음':`${v>=0?'+':''}${Number(v).toFixed(1)}%p`;
  const cls=v=>v==null?'':v<0?'negative':'positive';

  function get(row,names){const map={};Object.keys(row||{}).forEach(k=>map[norm(k)]=row[k]);for(const n of names){const v=map[norm(n)];if(v!==undefined&&clean(v)!=='')return v}return''}
  function sheet(wb,names){const name=wb.SheetNames.find(s=>names.some(a=>norm(s).includes(norm(a))));return name?XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:'',raw:true}):[]}
  function growth(row,key){return num(get(row,growthAliases[key]));}
  function label(row){return clean(get(row,['안경사ID','ID','안경원명','매장명','거래처명','Outletnumber','매장코드','안경원코드']))||'-'}
  function region(row){return clean(get(row,['지역','시도','Region']))}
  function years(row){return clean(get(row,['연차','Years','경력']))}
  function channel(row){return clean(get(row,['채널','Channel','전략구분','유형']))}

  function kpi(title,key,rows){
    const cur=avg(rows,r=>growth(r,key));
    const all=avg(state.rows,r=>growth(r,key));
    const diff=cur!=null&&all!=null?cur-all:null;
    return `<div class="kpi-card"><span>${title}</span><strong>${rate(cur)} <span class="kpi-sub">(vs PY)</span></strong><small><span class="${cls(diff)}">${pp(diff)} <span class="kpi-sub">(vs 전체)</span></span></small></div>`;
  }

  function buildFilters(){
    const filterDefs=[['regionFilter',region],['yearsFilter',years],['channelFilter',channel]];
    filterDefs.forEach(([id,fn])=>{
      const el=$(id); const vals=[...new Set(state.rows.map(fn).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}));
      el.innerHTML='<option value="">전체</option>'+vals.map(v=>`<option>${esc(v)}</option>`).join('');
      el.onchange=render;
    });
  }

  function selectedRows(){
    let rows=[...state.rows];
    const rf=$('regionFilter').value, yf=$('yearsFilter').value, cf=$('channelFilter').value;
    if(rf)rows=rows.filter(r=>region(r)===rf);
    if(yf)rows=rows.filter(r=>years(r)===yf);
    if(cf)rows=rows.filter(r=>channel(r)===cf);
    return rows;
  }

  function metricList(rows){
    return `<div class="metric-list">
      <div class="metric-row"><span>난시 성장률</span><b>${rate(avg(rows,r=>growth(r,'ast')))}</b></div>
      <div class="metric-row"><span>멀티포컬 성장률</span><b>${rate(avg(rows,r=>growth(r,'mf')))}</b></div>
      <div class="metric-row"><span>맥스 성장률</span><b>${rate(avg(rows,r=>growth(r,'max')))}</b></div>
    </div>`;
  }

  function render(){
    const rows=selectedRows(); state.filtered=rows;
    $('selectedCount').textContent=`${rows.length.toLocaleString('ko-KR')}건`;
    $('allCount').textContent=`${state.rows.length.toLocaleString('ko-KR')}건`;
    $('kpiGrid').innerHTML=[kpi('난시 성장률','ast',rows),kpi('멀티포컬 성장률','mf',rows),kpi('맥스 성장률','max',rows)].join('');
    $('selectedSummary').innerHTML=metricList(rows);
    $('overallSummary').innerHTML=metricList(state.rows);
    $('dataPreview').innerHTML=rows.slice(0,50).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(label(r))}</td><td>${esc(region(r))}</td><td>${esc(years(r))}</td><td>${rate(growth(r,'ast'))}</td><td>${rate(growth(r,'mf'))}</td><td>${rate(growth(r,'max'))}</td></tr>`).join('')||'<tr><td colspan="7">데이터가 없습니다.</td></tr>';
  }

  function generateInsights(){
    const rows=state.rows; const overall={ast:avg(rows,r=>growth(r,'ast')),mf:avg(rows,r=>growth(r,'mf')),max:avg(rows,r=>growth(r,'max'))};
    const cards=[]; const dims=[['지역',region],['연차',years],['채널',channel]];
    dims.forEach(([dim,fn])=>{
      const groups={}; rows.forEach(r=>{const v=fn(r)||'미분류';(groups[v]||(groups[v]=[])).push(r)});
      Object.entries(groups).forEach(([name,rs])=>{
        if(rs.length<3)return;
        [['ast','난시'],['mf','멀티포컬'],['max','MAX/맥스']].forEach(([key,label])=>{
          const g=avg(rs,r=>growth(r,key)); if(g==null||overall[key]==null)return;
          const d=g-overall[key]; if(d<=-5){
            cards.push({score:Math.abs(d)*5+rs.length,dim,name,key,label,size:rs.length,g,d});
          }
        });
      });
    });
    const top=cards.sort((a,b)=>b.score-a.score).slice(0,5);
    $('insightCards').innerHTML=top.length?top.map((c,i)=>`<div class="insight-card"><div class="type">판매 저하 우선 탐지</div><h3>${i+1}. ${esc(c.name)} ${esc(c.label)} 성장률 저하</h3><div class="insight-steps"><div class="insight-step"><small>1. 증상</small>${esc(c.label)} 성장률이 전체 대비 ${pp(c.d)} 낮습니다.</div><div class="insight-step"><small>2. 원인 확인 필요</small>해당 그룹의 관련 인식 문항과 교육 미완료율을 추가 확인합니다.</div><div class="insight-step"><small>3. 교육 제안</small>${c.key==='max'?'블루라이트/MAX 기술 교육':c.key==='mf'?'멀티포컬 상담·피팅 교육':'난시 피팅·조기교정 교육'}</div></div><div class="metric-row"><span>대상 규모</span><b>${c.size}건</b></div></div>`).join(''):'<div class="empty-state">전체 대비 -5%p 이하로 낮은 그룹이 없습니다.</div>';
  }

  async function upload(file){
    if(!window.XLSX)throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    state.rows=sheet(wb,aliases.sales);
    if(!state.rows.length)throw new Error('06_피팅판매 시트를 찾지 못했습니다.');
    $('uploadStatus').textContent=file.name;
    buildFilters(); render();
    toast(`업로드 완료: 판매행 ${state.rows.length.toLocaleString('ko-KR')}건`);
  }

  function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
  function view(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));$(id).classList.add('active');document.querySelector(`.tab[data-view="${id}"]`).classList.add('active')}
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>view(t.dataset.view));
    $('workbookInput').onchange=e=>e.target.files[0]&&upload(e.target.files[0]).catch(err=>{console.error(err);alert('업로드 실패\n\n'+(err.message||err))});
    $('resetFilters').onclick=()=>{['regionFilter','yearsFilter','channelFilter'].forEach(id=>$(id).value='');render()};
    $('generateInsight').onclick=generateInsights;
    render();
  });
})();
