window.App = window.App || {};
(function(NS){
  const U = NS.Utils, UI = NS.UI;

  let rowsData = []; // {text, code, caption, qty}

  function extractSix(text){
    const i=(text||'').lastIndexOf('='); if(i<0) return '';
    const m=(text||'').slice(i+1).match(/[A-Za-z]{6}/);
    return m?m[0]:'';
  }

  function init(){
    NS.Bridge.bindUI();

    const modeSel = document.getElementById('p_dataMode');
    const fileBtn = document.getElementById('p_btnFile');
    const fileInp = document.getElementById('p_file');
    const boxManual = document.getElementById('p_manualBox');
    const txtManual = document.getElementById('p_manualText');
    const rowsHint = document.getElementById('p_rowsHint');

    const p_wmm = document.getElementById('p_wmm');
    const p_hmm = document.getElementById('p_hmm');
    const p_dpi = document.getElementById('p_dpi');
    const p_mLR = document.getElementById('p_mLR');
    const p_mTB = document.getElementById('p_mTB');
    const p_qrmm= document.getElementById('p_qrmm');
    const p_gap1= document.getElementById('p_gap1');
    const p_gap2= document.getElementById('p_gap2');
    const p_codePt=document.getElementById('p_codePt');
    const p_capPt =document.getElementById('p_capPt');

    const p_borderType=document.getElementById('p_borderType');
    const p_borderStyle=document.getElementById('p_borderStyle');
    const p_borderMm=document.getElementById('p_borderMm');
    const p_radiusMm=document.getElementById('p_radiusMm');
    const p_padL=document.getElementById('p_padL');
    const p_padT=document.getElementById('p_padT');
    const p_padR=document.getElementById('p_padR');
    const p_padB=document.getElementById('p_padB');

    const p_divA_on=document.getElementById('p_divA_on');
    const p_divA_style=document.getElementById('p_divA_style');
    const p_divA_mm=document.getElementById('p_divA_mm');
    const p_divA_len=document.getElementById('p_divA_len');
    const p_divA_up=document.getElementById('p_divA_up');
    const p_divA_dn=document.getElementById('p_divA_dn');

    const p_divB_on=document.getElementById('p_divB_on');
    const p_divB_style=document.getElementById('p_divB_style');
    const p_divB_mm=document.getElementById('p_divB_mm');
    const p_divB_len=document.getElementById('p_divB_len');
    const p_divB_up=document.getElementById('p_divB_up');
    const p_divB_dn=document.getElementById('p_divB_dn');

    const prevCanvas=document.getElementById('labelPreview');
    const btnPreview=document.getElementById('btnPreview');
    const btnPrintAll=document.getElementById('btnPrintAll');
    const jobSummary=document.getElementById('jobSummary');

    p_wmm.value = UI.previewWidthMM || 100;
    p_hmm.value = UI.previewHeightMM || 80;
    p_dpi.value = UI.defaultDPI || 203;

    function refreshRowsHint(){ rowsHint.textContent = `Rows: ${rowsData.length}`; }
    modeSel.addEventListener('change', ()=>{
      const mode = modeSel.value;
      if(mode==='builder'){
        fileBtn.classList.add('hidden'); fileInp.classList.add('hidden'); boxManual.classList.add('hidden');
        rowsData = (window.__qr_readBuilderRows ? window.__qr_readBuilderRows() : []).map(r=>({text:r.text||r.link||'', code:r.code||'', caption:r.caption||'', qty:1}));
        refreshRowsHint(); drawPreview(); fillSummary();
      }else if(mode==='import'){
        fileBtn.classList.remove('hidden'); fileInp.classList.add('hidden'); boxManual.classList.add('hidden');
        rowsData=[]; refreshRowsHint(); drawPreview(); fillSummary();
      }else{
        fileBtn.classList.add('hidden'); fileInp.classList.add('hidden'); boxManual.classList.remove('hidden');
        rowsData=[]; refreshRowsHint(); drawPreview(); fillSummary();
      }
    });
    modeSel.dispatchEvent(new Event('change'));
    fileBtn.onclick=()=>fileInp.click();

    fileInp.addEventListener('change', async (e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      const buf=await f.arrayBuffer();
      if(/\.(csv)$/i.test(f.name)){
        const text = new TextDecoder().decode(new Uint8Array(buf));
        rowsData = U.parseCsv(text);
      }else{
        const wb = XLSX.read(buf, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const arr = XLSX.utils.sheet_to_json(ws, {defval:''});
        rowsData = arr.map(r=>({
          text: r.Link || r.Text || r.URL || r.url || r.text || '',
          code: r.Code || r.code || '',
          caption: r.Caption || r.caption || '',
          qty: Number(r.Qty || r.qty || 1) || 1
        }));
      }
      refreshRowsHint(); drawPreview(); fillSummary();
    });

    txtManual.addEventListener('input', ()=>{
      const lines = txtManual.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      rowsData = lines.map(line=>{
        const parts = line.split('|').map(s=>s.trim());
        return { text: parts[0]||'', code: parts[1]||extractSix(parts[0])||'', caption: parts[2]||'', qty: Number(parts[3]||1)||1 };
      });
      refreshRowsHint(); drawPreview(); fillSummary();
    });

    btnPreview.onclick = ()=>{ drawPreview(); };

    function getDots(){
      const dpi = Number(p_dpi.value||203);
      return {
        dpi,
        W: U.mm2dots(Number(p_wmm.value||100), dpi),
        H: U.mm2dots(Number(p_hmm.value||80), dpi),
        outerX: U.mm2dots(Number(p_mLR.value||3),dpi),
        outerY: U.mm2dots(Number(p_mTB.value||3),dpi),
        qrS:    U.mm2dots(Number(p_qrmm.value||60),dpi),
        gap1:   U.mm2dots(Number(p_gap1.value||5),dpi),
        gap2:   U.mm2dots(Number(p_gap2.value||5),dpi),
        codeF:  U.pt2dots(Number(p_codePt.value||28),dpi),
        capF:   U.pt2dots(Number(p_capPt.value||22),dpi),

        bType:  p_borderType.value,
        bStyle: p_borderStyle.value,
        bTh:    U.mm2dots(Number(p_borderMm.value||0), dpi),
        rad:    U.mm2dots(Number(p_radiusMm.value||0), dpi),
        padL:   U.mm2dots(Number(p_padL.value||0), dpi),
        padT:   U.mm2dots(Number(p_padT.value||0), dpi),
        padR:   U.mm2dots(Number(p_padR.value||0), dpi),
        padB:   U.mm2dots(Number(p_padB.value||0), dpi),

        divA_on: p_divA_on.value==='on',
        divA_style: p_divA_style.value,
        divA_th: U.mm2dots(Number(p_divA_mm.value||0.5), dpi),
        divA_len: Math.max(10, Math.min(100, Number(p_divA_len.value||80)))/100,
        divA_up:  U.mm2dots(Number(p_divA_up.value||0), dpi),
        divA_dn:  U.mm2dots(Number(p_divA_dn.value||0), dpi),

        divB_on: p_divB_on.value==='on',
        divB_style: p_divB_style.value,
        divB_th: U.mm2dots(Number(p_divB_mm.value||0.5), dpi),
        divB_len: Math.max(10, Math.min(100, Number(p_divB_len.value||80)))/100,
        divB_up:  U.mm2dots(Number(p_divB_up.value||0), dpi),
        divB_dn:  U.mm2dots(Number(p_divB_dn.value||0), dpi),
      };
    }
    function applyDash(ctx, style, th){
      if(style==='dashed') ctx.setLineDash([th*3, th*2]);
      else if(style==='dotted') ctx.setLineDash([0, th*2]);
      else ctx.setLineDash([]);
    }
    function roundedRect(ctx,x,y,w,h,r){
      ctx.moveTo(x+r,y);
      ctx.arcTo(x+w, y,   x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x,   y+h, r);
      ctx.arcTo(x,   y+h, x,   y,   r);
      ctx.arcTo(x,   y,   x+w, y,   r);
    }
    function drawBorder(ctx, D){
      if(D.bType==='none' || D.bTh<=0) return;
      ctx.save();
      ctx.strokeStyle='#000';
      ctx.lineWidth = D.bTh;
      applyDash(ctx, D.bStyle, D.bTh);
      const inset = D.bTh/2;
      const x0 = inset, y0 = inset, x1 = D.W - inset, y1 = D.H - inset;
      ctx.beginPath();
      if(D.bType==='rect'){
        ctx.rect(x0, y0, x1-x0, y1-y0);
      }else if(D.bType==='round'){
        const r = Math.min(D.rad, (x1-x0)/2, (y1-y0)/2);
        roundedRect(ctx, x0, y0, x1-x0, y1-y0, r);
      }else if(D.bType==='circle'){
        const r = Math.min((x1-x0),(y1-y0))/2;
        ctx.arc((x0+x1)/2, (y0+y1)/2, r, 0, Math.PI*2);
      }else if(D.bType==='ellipse'){
        ctx.ellipse((x0+x1)/2, (y0+y1)/2, (x1-x0)/2, (y1-y0)/2, 0, 0, Math.PI*2);
      }
      ctx.stroke();
      ctx.restore();
    }
    function drawDivider(ctx, D, centerX, y, which){
      const on = which==='A' ? D.divA_on : D.divB_on; if(!on) return 0;
      const th = which==='A' ? D.divA_th : D.divB_th;
      const len = which==='A' ? D.divA_len : D.divB_len;
      const style = which==='A' ? D.divA_style : D.divB_style;
      const up = which==='A' ? D.divA_up : D.divB_up;
      const dn = which==='A' ? D.divA_dn : D.divB_dn;

      const usableW = D.W - (D.outerX*2 + D.padL + D.padR);
      const L = Math.round(usableW * len);
      const x0 = Math.round(centerX - L/2);
      ctx.save();
      ctx.strokeStyle='#000';
      ctx.lineWidth = th;
      applyDash(ctx, style, th);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0+L, y); ctx.stroke();
      ctx.restore();
      return up + th + dn;
    }

    function drawPreview(){
      const r = rowsData[0] || { text:'https://example.com?x=ABCDEF', code:'ABCDEF', caption:'Sample', qty:1 };
      renderRowToCanvas(r, document.getElementById('labelPreview'));
    }
    btnPreview.onclick = drawPreview;

    function fillSummary(){
      const s = `Rows: ${rowsData.length}
Label: ${document.getElementById('p_wmm').value}×${document.getElementById('p_hmm').value} mm @ ${document.getElementById('p_dpi').value} dpi
QR: ${document.getElementById('p_qrmm').value} mm | Gaps: ${document.getElementById('p_gap1').value}/${document.getElementById('p_gap2').value} mm
Fonts: ${document.getElementById('p_codePt').value}pt / ${document.getElementById('p_capPt').value}pt
Border: ${document.getElementById('p_borderType').value}, ${document.getElementById('p_borderStyle').value}, ${document.getElementById('p_borderMm').value}mm, radius ${document.getElementById('p_radiusMm').value}mm
Padding L/T/R/B: ${document.getElementById('p_padL').value}/${document.getElementById('p_padT').value}/${document.getElementById('p_padR').value}/${document.getElementById('p_padB').value} mm
DivA: ${document.getElementById('p_divA_on').value} (${document.getElementById('p_divA_style').value}, ${document.getElementById('p_divA_mm').value}mm, ${document.getElementById('p_divA_len').value}%) up/down ${document.getElementById('p_divA_up').value}/${document.getElementById('p_divA_dn').value}mm
DivB: ${document.getElementById('p_divB_on').value} (${document.getElementById('p_divB_style').value}, ${document.getElementById('p_divB_mm').value}mm, ${document.getElementById('p_divB_len').value}%) up/down ${document.getElementById('p_divB_up').value}/${document.getElementById('p_divB_dn').value}mm`;
      document.getElementById('jobSummary').textContent = s;
    }

    document.getElementById('btnPrintAll').onclick = async ()=>{
      if(!rowsData.length){ alert('No rows to print. Select a data source first.'); return; }
      const ok = await NS.Bridge.connect({refreshList:false}); if(!ok) return;
      const listEl = document.getElementById('printerList');
      if(!listEl.value){ alert('Please select a printer'); return; }

      let printed=0;
      for(const row of rowsData){
        try{
          const png = await renderRowToPNG(row);
          await NS.Bridge.printImagePngBase64(png, Number(row.qty||1)||1);
          printed++;
        }catch(e){ console.error('print failed', e); }
      }
      if(printed>0) alert(`Sent to printer (${printed} job${printed>1?'s':''}).`);
      else alert('Nothing printed. Check QZ Tray permission / printer status.');
    };

    window.__printer_refresh = ()=>{ drawPreview(); fillSummary(); };

    async function renderRowToPNG(row){
      const D = getDots();
      const c=document.createElement('canvas'); c.width=D.W; c.height=D.H;
      await renderRowToCanvas(row, c);
      await new Promise(r=>setTimeout(r, 40));
      return c.toDataURL('image/png', 0.95);
    }

    function getDots(){
      const dpi = Number(p_dpi.value||203);
      return {
        dpi,
        W: U.mm2dots(Number(p_wmm.value||100), dpi),
        H: U.mm2dots(Number(p_hmm.value||80), dpi),
        outerX: U.mm2dots(Number(p_mLR.value||3),dpi),
        outerY: U.mm2dots(Number(p_mTB.value||3),dpi),
        qrS:    U.mm2dots(Number(p_qrmm.value||60),dpi),
        gap1:   U.mm2dots(Number(p_gap1.value||5),dpi),
        gap2:   U.mm2dots(Number(p_gap2.value||5),dpi),
        codeF:  U.pt2dots(Number(p_codePt.value||28),dpi),
        capF:   U.pt2dots(Number(p_capPt.value||22),dpi),

        bType:  p_borderType.value,
        bStyle: p_borderStyle.value,
        bTh:    U.mm2dots(Number(p_borderMm.value||0), dpi),
        rad:    U.mm2dots(Number(p_radiusMm.value||0), dpi),
        padL:   U.mm2dots(Number(p_padL.value||0), dpi),
        padT:   U.mm2dots(Number(p_padT.value||0), dpi),
        padR:   U.mm2dots(Number(p_padR.value||0), dpi),
        padB:   U.mm2dots(Number(p_padB.value||0), dpi),

        divA_on: document.getElementById('p_divA_on').value==='on',
        divA_style: document.getElementById('p_divA_style').value,
        divA_th: U.mm2dots(Number(document.getElementById('p_divA_mm').value||0.5), dpi),
        divA_len: Math.max(10, Math.min(100, Number(document.getElementById('p_divA_len').value||80)))/100,
        divA_up:  U.mm2dots(Number(document.getElementById('p_divA_up').value||0), dpi),
        divA_dn:  U.mm2dots(Number(document.getElementById('p_divA_dn').value||0), dpi),

        divB_on: document.getElementById('p_divB_on').value==='on',
        divB_style: document.getElementById('p_divB_style').value,
        divB_th: U.mm2dots(Number(document.getElementById('p_divB_mm').value||0.5), dpi),
        divB_len: Math.max(10, Math.min(100, Number(document.getElementById('p_divB_len').value||80)))/100,
        divB_up:  U.mm2dots(Number(document.getElementById('p_divB_up').value||0), dpi),
        divB_dn:  U.mm2dots(Number(document.getElementById('p_divB_dn').value||0), dpi),
      };
    }

    function renderRowToCanvas(row, canvas){
      const D = getDots();
      canvas.width=D.W; canvas.height=D.H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,D.W,D.H);

      drawBorder(ctx, D);

      const borderInset = D.bTh>0 ? D.bTh : 0;
      const startX = D.outerX + D.padL + borderInset;
      const endX   = D.W - (D.outerX + D.padR + borderInset);
      const usableW = endX - startX;
      const centerX = Math.round(startX + usableW/2);
      let y = D.outerY + D.padT + borderInset;

      // QR
      const qr = qrcode(0,'M'); qr.addData(row.text||''); qr.make();
      const svg = qr.createSvgTag({cellSize:6, margin:0});
      const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      return new Promise((resolve,reject)=>{
        const img = new Image();
        img.onload = ()=>{
          const x = Math.round(centerX - D.qrS/2);
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(img, x, y, D.qrS, D.qrS);
          y += D.qrS + D.gap1;

          // Divider A
          if(D.divA_on){
            y += D.divA_up;
            const usable = D.W - (D.outerX*2 + D.padL + D.padR);
            const L = Math.round(usable * D.divA_len);
            const x0 = Math.round(centerX - L/2);
            ctx.save();
            ctx.strokeStyle='#000'; ctx.lineWidth=D.divA_th;
            applyDash(ctx, D.divA_style, D.divA_th);
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0+L, y); ctx.stroke();
            ctx.restore();
            y += D.divA_th + D.divA_dn;
          }

          // Code
          ctx.fillStyle='#000'; ctx.textAlign='center';
          ctx.font = `${D.codeF}px Arial`;
          const codeStr = row.code || extractSix(row.text) || '';
          ctx.fillText(codeStr, centerX, y);
          y += D.codeF + D.gap2;

          // Divider B
          if(D.divB_on){
            y += D.divB_up;
            const usable = D.W - (D.outerX*2 + D.padL + D.padR);
            const L = Math.round(usable * D.divB_len);
            const x0 = Math.round(centerX - L/2);
            ctx.save();
            ctx.strokeStyle='#000'; ctx.lineWidth=D.divB_th;
            applyDash(ctx, D.divB_style, D.divB_th);
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0+L, y); ctx.stroke();
            ctx.restore();
            y += D.divB_th + D.divB_dn;
          }

          // Caption
          ctx.font = `${D.capF}px Arial`;
          ctx.fillText(row.caption || '', centerX, y);

          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror=(e)=>{URL.revokeObjectURL(url); reject(e);};
        img.src=url;
      });

      function applyDash(ctx, style, th){
        if(style==='dashed') ctx.setLineDash([th*3, th*2]);
        else if(style==='dotted') ctx.setLineDash([0, th*2]);
        else ctx.setLineDash([]);
      }
      function drawBorder(ctx, D){
        if(D.bType==='none' || D.bTh<=0) return;
        ctx.save();
        ctx.strokeStyle='#000';
        ctx.lineWidth = D.bTh;
        applyDash(ctx, D.bStyle, D.bTh);
        const inset = D.bTh/2;
        const x0 = inset, y0 = inset, x1 = D.W - inset, y1 = D.H - inset;
        ctx.beginPath();
        if(D.bType==='rect'){
          ctx.rect(x0, y0, x1-x0, y1-y0);
        }else if(D.bType==='round'){
          const r = Math.min(D.rad, (x1-x0)/2, (y1-y0)/2);
          ctx.moveTo(x0+r,y0);
          ctx.arcTo(x1, y0, x1, y1, r);
          ctx.arcTo(x1, y1, x0, y1, r);
          ctx.arcTo(x0, y1, x0, y0, r);
          ctx.arcTo(x0, y0, x1, y0, r);
        }else if(D.bType==='circle'){
          const r = Math.min((x1-x0),(y1-y0))/2;
          ctx.arc((x0+x1)/2, (y0+y1)/2, r, 0, Math.PI*2);
        }else if(D.bType==='ellipse'){
          ctx.ellipse((x0+x1)/2, (y0+y1)/2, (x1-x0)/2, (y1-y0)/2, 0, 0, Math.PI*2);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  NS.Printer = { init };
})(window.App);
