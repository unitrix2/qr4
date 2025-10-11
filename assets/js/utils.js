window.App = window.App || {};
(function(NS){
  function mm2px(mm){ return Math.round(mm * 96 / 25.4); }
  function mm2dots(mm, dpi){ return Math.round((mm/25.4) * dpi); }
  function pt2dots(pt, dpi){ return Math.round((pt/72) * dpi); }
  function esc(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escXml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[m])); }
  function csvEscape(s){ if(s==null) return ''; const t=String(s).replace(/"/g,'""'); return /[",\n]/.test(t)?`"${t}"`:t; }
  function dataUrlToBlob(u){
    const parts=u.split(','), mime=(parts[0].match(/:(.*?);/)||[])[1]||'application/octet-stream';
    const b=atob(parts[1]); const a=new Uint8Array(b.length); for(let i=0;i<b.length;i++) a[i]=b.charCodeAt(i);
    return new Blob([a],{type:mime});
  }
  function triggerDownload(blob, name){
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function splitCsvLine(s){
    const r=[]; let cur='', q=false;
    for(let i=0;i<s.length;i++){
      const ch=s[i];
      if(ch==='"'){ if(q&&s[i+1]==='"'){cur+='"'; i++;} else q=!q; }
      else if(ch===',' && !q){ r.push(cur); cur=''; }
      else cur+=ch;
    }
    r.push(cur); return r.map(x=>x.trim());
  }
  function parseCsv(csv){
    const out=[]; const lines=csv.split(/\r?\n/); if(!lines.length) return out;
    const header = lines[0].split(',').map(s=>s.trim());
    const idx = {
      text: header.findIndex(h=>/^(link|text|url)$/i.test(h)),
      code: header.findIndex(h=>/^code$/i.test(h)),
      caption: header.findIndex(h=>/^caption$/i.test(h)),
      qty: header.findIndex(h=>/^(qty|quantity)$/i.test(h)),
    };
    for(let i=1;i<lines.length;i++){
      if(!lines[i].trim()) continue;
      const cols = splitCsvLine(lines[i]);
      out.push({
        text: idx.text>=0 ? cols[idx.text] : cols[0] || '',
        code: idx.code>=0 ? cols[idx.code] : '',
        caption: idx.caption>=0 ? cols[idx.caption] : '',
        qty: Number(idx.qty>=0 ? cols[idx.qty] : 1) || 1
      });
    }
    return out;
  }
  NS.Utils = { mm2px, mm2dots, pt2dots, esc, escXml, csvEscape, dataUrlToBlob, triggerDownload, splitCsvLine, parseCsv };
})(window.App);
