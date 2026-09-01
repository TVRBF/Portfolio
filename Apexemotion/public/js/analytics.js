import { apiFetch } from './api.js';
let charts={};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function destroy(k){if(charts[k]) charts[k].destroy();}
function pct(v){return `${(Number(v||0)*100).toFixed(0)}%`;}

async function load(){
 $('error').textContent='';
 try{
  const d=await apiFetch(`/analytics/dashboard?hours=${$('hours').value}&limit=500`,{method:'GET'});
  const c=d.current_emotion;
  $('current').textContent=c.emotion ? c.emotion.toUpperCase() : 'NO DATA';
  $('currentMeta').textContent=c.emotion ? `${pct(c.confidence)} • ${c.modality||'unknown'} • ${c.provider||''}` : 'No stored observations';
  $('modalities').innerHTML=Object.entries(d.modalities).map(([k,v])=>`
   <div class="bg-slate-900 rounded-lg p-3"><div class="text-xs text-slate-500 uppercase">${esc(k)}</div>
   <div class="text-xl font-semibold mt-1">${pct(v.confidence)}</div><div class="text-xs text-slate-500">${v.observations} observations</div></div>`).join('');
  renderDistribution(d); renderTimeline(d); renderRisk(d); renderAlerts(d);
 }catch(e){$('error').textContent=e.message||'Unable to load analytics.';}
}
function baseOptions(){return {responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#cbd5e1'}}},scales:{x:{ticks:{color:'#94a3b8'},grid:{color:'rgba(148,163,184,.1)'}},y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(148,163,184,.1)'}}}}}
function renderDistribution(d){
 destroy('distribution'); const labels=Object.keys(d.emotion_distribution), vals=Object.values(d.emotion_distribution);
 charts.distribution=new Chart($('distribution'),{type:'bar',data:{labels,datasets:[{label:'Observations',data:vals}]},options:baseOptions()});
}
function renderTimeline(d){
 destroy('timeline'); const points=d.timeline||[];
 charts.timeline=new Chart($('timeline'),{type:'line',data:{labels:points.map(p=>new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})),datasets:[{label:'Confidence',data:points.map(p=>p.confidence),tension:.25}]},options:{...baseOptions(),scales:{...baseOptions().scales,y:{min:0,max:1,ticks:{color:'#94a3b8'}}}}});
}
function renderRisk(d){
 destroy('risk'); const points=d.risk_trend||[];
 charts.risk=new Chart($('risk'),{type:'line',data:{labels:points.map(p=>new Date(p.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})),datasets:[{label:'Risk score',data:points.map(p=>p.risk_score),tension:.25}]},options:{...baseOptions(),scales:{...baseOptions().scales,y:{min:0,max:100,ticks:{color:'#94a3b8'}}}}});
}
function renderAlerts(d){
 const items=d.alert_history||[];
 $('alerts').innerHTML=items.length?items.map(a=>`<div class="border border-slate-700 rounded-lg p-3">
 <div class="flex justify-between"><span class="font-semibold">${esc(a.risk_level)} — ${Number(a.risk_score).toFixed(1)}</span><span class="text-sm">${esc(a.status)}</span></div>
 <div class="text-xs text-slate-500 mt-1">${new Date(a.timestamp).toLocaleString()} • ${esc(a.contact_email)}</div></div>`).join(''):'<p class="text-slate-400">No alerts in this window.</p>';
}
$('refresh').addEventListener('click',load); $('hours').addEventListener('change',load); load();
