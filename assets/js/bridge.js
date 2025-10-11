// Single-responsibility: QZ Tray bridge (connect, list printers, print helpers)
window.App = window.App || {};
(function(NS){
  let qzReady = false;
  let selectedPrinter = '';

  function ui(){
    return {
      list: document.getElementById('printerList'),
      status: document.getElementById('bridgeStatus'),
      btnRefresh: document.getElementById('btnRefresh'),
      btnPrintAll: document.getElementById('btnPrintAll')
    };
  }

  function setStatus(msg, ok){
    const { status } = ui();
    if(status){
      status.textContent = `Status: ${msg}`;
      status.style.color = ok ? '#10b981' : '#f43f5e';
    }
  }

  function setUIConnected(connected, printers){
    const { list, btnRefresh, btnPrintAll } = ui();
    if(Array.isArray(printers)){
      list.innerHTML = printers.length
        ? `<option value="">(Select Printer)</option>${printers.map(p=>`<option value="${p}">${p}</option>`).join('')}`
        : `<option value="">(No printers)</option>`;
    }
    // keep selection if possible
    if(selectedPrinter){
      const opt = Array.from(list.options).find(o => o.value === selectedPrinter);
      if(opt) list.value = selectedPrinter;
    }
    list.disabled = !connected;
    btnRefresh && (btnRefresh.disabled = !connected);
    btnPrintAll && (btnPrintAll.disabled = !connected || !list.value);
  }

  // Optional permissive security (if signing not configured)
  function setupSecurity(){
    if(!window.qz || !qz.security) return;
    try{
      qz.security.setCertificatePromise(() => Promise.resolve(null));
      qz.security.setSignaturePromise(() => Promise.resolve(null));
    }catch(_){}
  }

  async function connect({ refreshList = true } = {}){
    if(!window.qz || !qz.websocket){
      setStatus('QZ script not loaded', false);
      alert('QZ Tray script not available (qz-tray.js).');
      return false;
    }
    try{
      setupSecurity();
      if(!qz.websocket.isActive()){
        await qz.websocket.connect();
      }
      qzReady = true;
      setStatus('Connected', true);
      if(refreshList){
        const printers = await qz.printers.find();
        setUIConnected(true, printers);
        setStatus(`Connected (${printers.length} printers)`, true);
      }else{
        setUIConnected(true);
      }
      return true;
    }catch(e){
      qzReady = false;
      setUIConnected(false, []);
      setStatus('Not connected', false);
      alert('Please start QZ Tray.\n' + (e?.message || e));
      return false;
    }
  }

  async function refreshPrinters(){
    if(!qzReady){ await connect({ refreshList:false }); }
    if(!qzReady) return;
    try{
      const printers = await qz.printers.find();
      setUIConnected(true, printers);
      setStatus(`Connected (${printers.length} printers)`, true);
    }catch(e){
      setStatus('List failed', false);
      alert('List printers error: ' + (e?.message || e));
    }
  }

  // Helpers
  function dataUrlToBase64(u){ return (u||'').split(',')[1] || ''; }
  function ensureCRLF(s){ return /(\r\n|\n)$/.test(s) ? s : (s + '\r\n'); }

  // Public print: PNG dataURL → printer (rasterized)
  async function printImagePngBase64(dataUrl, copies=1){
    const { list } = ui();
    const name = list && list.value ? list.value : selectedPrinter;
    if(!name){ alert('Please select a printer'); throw new Error('No printer selected'); }
    if(!qzReady && !(await connect({ refreshList:false }))) throw new Error('QZ not connected');

    const b64 = dataUrlToBase64(dataUrl);
    if(!b64) throw new Error('Invalid PNG data');

    const cfg = qz.configs.create(name, {
      copies: copies || 1,
      colorType: 'grayscale',
      altPrinting: true   // improves compatibility on some drivers
    });
    const data = [{
      type: 'image',
      format: 'base64',   // IMPORTANT: base64 only, no data URL prefix
      data: b64,
      options: { rasterize: true }
    }];

    return qz.print(cfg, data);
  }

  // Public print: raw ZPL/TSPL/EPL string
  async function printRaw(rawCommand){
    const { list } = ui();
    const name = list && list.value ? list.value : selectedPrinter;
    if(!name){ alert('Please select a printer'); throw new Error('No printer selected'); }
    if(!qzReady && !(await connect({ refreshList:false }))) throw new Error('QZ not connected');

    const cfg = qz.configs.create(name, {
      encoding: 'UTF-8',
      altPrinting: true
    });
    const data = [{ type:'raw', format:'command', data: ensureCRLF(rawCommand) }];

    return qz.print(cfg, data);
  }

  function bindUI(){
    const { list, btnRefresh, btnPrintAll } = ui();
    if(list){
      list.addEventListener('change', ()=>{
        selectedPrinter = list.value || '';
        // Re-enable print when selected
        if(btnPrintAll) btnPrintAll.disabled = !selectedPrinter;
      });
    }
    if(btnRefresh){
      btnRefresh.addEventListener('click', refreshPrinters);
    }
    // NOTE: btnPrintAll ka onClick aapke main/printer code me already set hoga.
  }

  // Expose
  NS.Bridge = { connect, refreshPrinters, bindUI, printImagePngBase64, printRaw };
})(window.App);
