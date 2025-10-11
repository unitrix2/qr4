window.App = window.App || {};
(function(NS){
  const U = NS.Utils;

  function extract6(s){ const i=(s||'').lastIndexOf('='); if(i<0) return ''; const m=(s||'').slice(i+1).match(/[A-Za-z]{6}/); return m?m[0]:''; }
  function scaleInner(innerSvg, target){
    const inner=innerSvg.replace(/^<svg[^>]*>/i,'').replace(/<\/svg>\s*$/i,'');
    const vb = innerSvg.match(/viewBox="([^"]+)"/i); let nat=100;
    if(vb){ const p=vb[1].split(/\s+|,/).map(Number); nat=Math.max(p[2],p[3]); }
    const s=target/nat; return `<g transform="scale(${s})">${inner}</g>`;
  }
  function dashArray(style, th){
    if(style==='dashed') return `${th*3},${th*2}`;
    if(style==='dotted') return `0,${th*2}`;
    return '';
  }
  async function raster(svg,w,h,mime){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
        ctx.imageSmoothingEnabled=false; ctx.drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url); resolve(c.toDataURL(mime,0.95));
      };
      img.onerror=e=>{ URL.revokeObjectURL(url); reject(e); };
      img.src=url;
    });
  }

  function init(){
    const fileInput   = document.getElementById('fileInput');
    const browseLabel = document.getElementById('browseLabel');
    const fileListEl  = document.getElementById('fileList');
    const processBtn  = document.getElementById('processBtn');
    const resetBtn    = document.getElementById('resetBtn');
    const captionEl   = document.getElementById('captionInput');
    const manualEl    = document.getElementById('manualInput');
    const addManual   = document.getElementById('addManualBtn');
    const outSizeEl   = document.getElementById('outSize');
    const origRow     = document.getElementById('origRow');
    const enhRow      = document.getElementById('enhRow');
    const dataPanel   = document.getElementById('dataPanel');
    const dataBody    = document.getElementById('dataBody');
    const zipBtn      = document.getElementById('zipBtn');
    const zipTypeSel  = document.getElementById('zipType');
    const exportType  = document.getElementById('exportType');
    const exportBtn   = document.getElementById('exportBtn');

    // Controls
    const b_codePx=document.getElementById('b_codePx');
    const b_capPx=document.getElementById('b_capPx');
    const b_gapQtoL=document.getElementById('b_gapQtoL');
    const b_gapLtoC=document.getElementById('b_gapLtoC');
    const b_gapCtoL=document.getElementById('b_gapCtoL');
    const b_gapLtoCap=document.getElementById('b_gapLtoCap');
    const b_font=document.getElementById('b_font');
    const b_outer=document.getElementById('b_outerMm');
    const b_divTop_type=document.getElementById('b_divTop_type');
    const b_divTop_th=document.getElementById('b_divTop_th');
    const b_divTop_len=document.getElementById('b_divTop_len');
    const b_divBot_type=document.getElementById('b_divBot_type');
    const b_divBot_th=document.getElementById('b_divBot_th');
    const b_divBot_len=document.getElementById('b_divBot_len');

    const browseMgr = NS.Browse.createBrowseManager({ inputEl:fileInput, browseLabelEl:browseLabel, fileListEl });

    let outputs=[];

    function updateButtons(){
      processBtn.disabled = browseMgr.getFiles().length===0;
      resetBtn.disabled = browseMgr.getFiles().length===0 && outputs.length===0;
      zipBtn.disabled = outputs.length===0;
      exportBtn.disabled = outputs.length===0;
    }
    fileInput.addEventListener('browse:changed', updateButtons);
    updateButtons();

    resetBtn.addEventListener('click', ()=>{
      browseMgr.reset(); outputs=[];
      origRow.innerHTML=''; enhRow.innerHTML='';
      dataPanel.style.display='none'; dataBody.innerHTML='';
      manualEl.value=''; captionEl.value='';
      updateButtons();
    });

    processBtn.addEventListener('click', async ()=>{
      const files = browseMgr.getFiles();
      if(!files.length) return;
      const size = Math.max(256, parseInt(outSizeEl.value||'1024',10));
      const caption = captionEl.value||'';
      for(const f of files){
        const t=document.createElement('div'); t.className='tile';
        t.innerHTML=`<div class="thumb"><span style="color:#9aa3af">Loading…</span></div><div class="name">${U.esc(f.name)}</div>`;
        origRow.appendChild(t);
        try{
          const text = await NS.QR.readQRFromFile(f);
          if(!text){ const s=document.createElement('div'); s.className='status err'; s.textContent='No QR found'; t.appendChild(s); continue; }
          const r = await buildEnhancedFromText(text,size,caption);
          if(r){ outputs.push(r); addRow(r); }
        }catch(e){ const s=document.createElement('div'); s.className='status err'; s.textContent='Error'; t.appendChild(s); }
      }
      if(outputs.length){ dataPanel.style.display='block'; }
      updateButtons();
    });

    addManual.addEventListener('click', async ()=>{
      const text=(manualEl.value||'').trim(); if(!text) return;
      const size = Math.max(256, parseInt(outSizeEl.value||'1024',10));
      const caption = captionEl.value||'';
      const r = await buildEnhancedFromText(text,size,caption);
      if(r){ outputs.push(r); addRow(r); dataPanel.style.display='block'; updateButtons(); }
      manualEl.select();
    });

    exportBtn.addEventListener('click', ()=>{
      if(!outputs.length) return;
      const mode=exportType.value;
      if(mode==='xlsx'){
        const rows=outputs.map((o,i)=>({"#":i+1,Link:o.link,Code:o.code,Caption:o.caption}));
        const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'QR Data'); XLSX.writeFile(wb,'qr_data.xlsx');
      }else if(mode==='csv'){
        const lines=['#,Link,Code,Caption']; outputs.forEach((o,i)=>lines.push([i+1, U.csvEscape(o.link), o.code, U.csvEscape(o.caption)].join(',')));
        U.triggerDownload(new Blob([lines.join('\n')],{type:'text/csv'}),'qr_data.csv');
      }else{
        const { jsPDF } = window.jspdf;
        const pdf=new jsPDF({unit:'mm',format:'a4'}); let x=10,y=10,cell=60,gap=6;
        outputs.forEach((o,idx)=>{ pdf.addImage(o.jpgDataUrl,'JPEG',x,y,cell,cell); x+=cell+gap; if(x+cell>190){ x=10; y+=cell+gap; if(y+cell>277){ pdf.addPage(); x=10; y=10; } }});
        pdf.save('qr_labels.pdf');
      }
    });

    document.getElementById('zipBtn').addEventListener('click', async ()=>{
      if(!outputs.length) return;
      const t = zipTypeSel.value; const zip = new JSZip();
      outputs.forEach((it,i)=>{
        const base = it.code || `NO-CODE-${i+1}`;
        if(t==='png') zip.file(`${base}.png`, U.dataUrlToBlob(it.pngDataUrl));
        else if(t==='jpg') zip.file(`${base}.jpg`, U.dataUrlToBlob(it.jpgDataUrl));
        else if(t==='svg') zip.file(`${base}.svg`, it.svgText);
      });
      const blob = await zip.generateAsync({type:'blob'});
      U.triggerDownload(blob, `qr_${t}.zip`);
    });

    function addRow(o){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${dataBody.children.length+1}</td><td>${U.esc(o.link)}</td><td>${U.esc(o.code)}</td><td>${U.esc(o.caption)}</td>`;
      dataBody.appendChild(tr);
    }

    async function buildEnhancedFromText(text, size, caption){
      const code = extract6(text) || 'NO-CODE';

      const mm = (v)=>U.mm2px(v);
      const outerPad = mm(Number(b_outer.value||3));
      const userCodePx = Math.max(0, parseInt(b_codePx.value||'0',10));
      const userCapPx  = Math.max(0, parseInt(b_capPx.value||'0',10));
      const fontFam    = b_font.value || 'Inter,Arial,Helvetica,sans-serif';

      const topType=b_divTop_type.value, topTh=mm(Number(b_divTop_th.value||0.5)), topLen=Number(b_divTop_len.value||80)/100;
      const botType=b_divBot_type.value, botTh=mm(Number(b_divBot_th.value||0.5)), botLen=Number(b_divBot_len.value||80)/100;

      const gapQtoL = mm(Number(b_gapQtoL.value||0));
      const gapLtoC = mm(Number(b_gapLtoC.value||5));
      const gapCtoL = mm(Number(b_gapCtoL.value||0));
      const gapLtoCap = mm(Number(b_gapLtoCap.value||5));

      const codePx    = userCodePx>0 ? userCodePx : Math.max(18, Math.round(size*0.22));
      const capPx     = userCapPx>0  ? userCapPx  : Math.max(16, Math.round(size*0.16));

      const qrSvgOnly = NS.QR.makeQrSvg(text);
      let blockH = size;
      if(topType!=='none'){ blockH += gapQtoL + topTh; }
      blockH += gapLtoC + codePx;
      if(botType!=='none'){ blockH += gapCtoL + botTh; }
      blockH += gapLtoCap + (caption?capPx:0);

      const W = size + 2*outerPad;
      const H = blockH + 2*outerPad;
      const cx = outerPad + size/2;
      let y = outerPad;

      const parts=[`<rect width="100%" height="100%" fill="#fff"/>`];
      parts.push(`<g transform="translate(${outerPad},${outerPad})">${scaleInner(qrSvgOnly,size)}</g>`);
      y += size;

      if(topType!=='none'){
        y += gapQtoL;
        const usableW = W - 2*outerPad, L = Math.round(usableW*topLen), x0 = Math.round(cx - L/2);
        parts.push(`<line x1="${x0}" y1="${y}" x2="${x0+L}" y2="${y}" stroke="#000" stroke-width="${topTh}" stroke-dasharray="${dashArray(topType, topTh)}"/>`);
        y += topTh;
      }

      y += gapLtoC;
      parts.push(`<text x="${cx}" y="${y+codePx*.82}" text-anchor="middle" font-family="${fontFam}" font-size="${codePx}" font-weight="700" fill="#000">${U.escXml(code)}</text>`);
      y += codePx;

      if(botType!=='none'){
        y += gapCtoL;
        const usableW = W - 2*outerPad, L = Math.round(usableW*botLen), x0 = Math.round(cx - L/2);
        parts.push(`<line x1="${x0}" y1="${y}" x2="${x0+L}" y2="${y}" stroke="#000" stroke-width="${botTh}" stroke-dasharray="${dashArray(botType, botTh)}"/>`);
        y += botTh;
      }

      y += gapLtoCap;
      if(caption){
        parts.push(`<text x="${cx}" y="${y+capPx*.85}" text-anchor="middle" font-family="${fontFam}" font-size="${capPx}" font-weight="700" fill="#000">${U.escXml(caption)}</text>`);
        y += capPx;
      }

      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
      const png=await raster(svg,W,H,'image/png'); const jpg=await raster(svg,W,H,'image/jpeg');

      const tile=document.createElement('div'); tile.className='tile';
      const th=document.createElement('div'); th.className='thumb';
      const o=new Image(); o.src=png; th.appendChild(o);
      const nm=document.createElement('div'); nm.className='name'; nm.textContent=`Code: ${code}`;
      const links=document.createElement('div'); links.className='row';
      const a1=document.createElement('a'); a1.href=png; a1.download=`${code}.png`; a1.className='btn secondary'; a1.textContent='PNG';
      const a2=document.createElement('a'); a2.href=jpg; a2.download=`${code}.jpg`; a2.className='btn secondary'; a2.textContent='JPG';
      const a3=document.createElement('a'); const blob=new Blob([svg],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob); a3.href=url; a3.download=`${code}.svg`; a3.className='btn secondary'; a3.textContent='SVG';
      links.appendChild(a1);links.appendChild(a2);links.appendChild(a3);
      tile.appendChild(th); tile.appendChild(nm); tile.appendChild(links); document.getElementById('enhRow').appendChild(tile);

      return { link:text, code, caption, pngDataUrl:png, jpgDataUrl:jpg, svgText:svg };
    }

    // expose for Printer
    window.__qr_readBuilderRows = function(){
      const rows=[]; dataBody.querySelectorAll('tr').forEach(tr=>{
        const tds = tr.querySelectorAll('td');
        if(tds.length>=4) rows.push({ text: tds[1].innerText || '', code: tds[2].innerText || '', caption: tds[3].innerText || '', qty: 1 });
      });
      return rows;
    };
  }

  NS.Builder = { init };
})(window.App);
