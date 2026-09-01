import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const input=document.getElementById('videoFile'), preview=document.getElementById('videoPreview');
  const analyze=document.getElementById('analyzeBtn'), reset=document.getElementById('cancelBtn');
  const status=document.getElementById('status'), results=document.getElementById('results');
  const icons={joy:'😊',sadness:'😔',anger:'😠',fear:'😨',disgust:'🤢',surprise:'😲',neutral:'😐'};
  let selected=null, objectUrl=null;

  const setStatus=m=>status.textContent=m;
  input.addEventListener('change',()=>{
    selected=input.files?.[0]||null; results.classList.add('hidden');
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    if(!selected){analyze.disabled=true; preview.classList.add('hidden'); setStatus('Select a video to begin.'); return;}
    objectUrl=URL.createObjectURL(selected); preview.src=objectUrl; preview.classList.remove('hidden');
    analyze.disabled=false; reset.classList.remove('hidden'); setStatus(`Video selected: ${selected.name}`);
  });
  reset.addEventListener('click',()=>{input.value=''; selected=null; results.classList.add('hidden'); preview.classList.add('hidden'); if(objectUrl) URL.revokeObjectURL(objectUrl); objectUrl=null; analyze.disabled=true; reset.classList.add('hidden'); setStatus('Select a video to begin.');});
  analyze.addEventListener('click',async()=>{
    if(!selected)return;
    analyze.disabled=true; setStatus('Uploading and validating video...'); results.classList.add('hidden');
    try{
      const fd=new FormData(); fd.append('file',selected);
      setStatus('Extracting frames and analyzing facial emotions...');
      const r=await apiFetch('/emotion/video',{method:'POST',headers:{},body:fd});
      const pct=Math.round(r.confidence*100);
      document.getElementById('dominant').textContent=`${icons[r.dominant_emotion]||'🙂'} ${r.dominant_emotion[0].toUpperCase()+r.dominant_emotion.slice(1)}`;
      document.getElementById('overallConfidence').textContent=`Overall confidence: ${pct}% • Provider: ${r.provider}`;
      document.getElementById('duration').textContent=`${r.duration}s`;
      document.getElementById('sampled').textContent=r.frames_sampled;
      document.getElementById('analyzed').textContent=r.frames_analyzed;
      document.getElementById('skipped').textContent=r.frames_skipped;
      const tl=document.getElementById('timeline'); tl.innerHTML='';
      r.timeline.forEach(p=>{const row=document.createElement('div'); row.className='flex items-center justify-between p-3 rounded bg-slate-800'; row.innerHTML=`<span>${p.timestamp.toFixed(2)}s</span><span>${icons[p.emotion]||'🙂'} ${p.emotion}</span><span>${Math.round(p.confidence*100)}%</span>`; tl.appendChild(row);});
      results.classList.remove('hidden'); setStatus('Analysis complete.');
    }catch(e){setStatus(e.message||'Unable to analyze this video.');}
    finally{analyze.disabled=false;}
  });
});
