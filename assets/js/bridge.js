// assets/js/bridge.js
// QZ Tray bridge: connect, list printers, print helpers (PNG base64 + RAW)
// Works with buttons/elems having ids: btnBridge, btnRefresh, printerList, btnPrintAll, bridgeStatus
window.App = window.App || {};
(function(NS){
  let qzReady = false;
  let selectedPrinter = '';

  // ---- UI helpers ----
  const $ = (id) => document.getElementById(id);
  const el = {
    connectBtn: $('btnBridge'),
    refreshBtn: $('btnRefresh'),
    list:       $('printerList'),
    printAll:   $('btnPrintAll'),
    status:     $('bridgeStatus'),
  };

  function setStatus(msg, ok){
    if(!el.status) return;
    el.status.textContent = `Status: ${msg}`;
    el.status.style.color = ok ? '#10b981' : '#f43f5e';
  }
  function applyUI(connected, printers){
    if (Array.isArray(printers)) {
      el.list.innerHTML = printers.length
        ? `<option value="">(Select Printer)</option>${printers.map(p=>`<option value="${p}">${p}</option>`).join('')}`
        : `<option value="">(No printers)</option>`;
    }
    if (selectedPrinter) {
      const opt = Array.from(el.list.options).find(o=>o.value===selectedPrinter);
      if (opt) el.list.value = selectedPrinter;
    }
    el.list.disabled = !connected;
    if (el.refreshBtn) el.refreshBtn.disabled = !connected;
    if (el.printAll)  el.printAll.disabled  = !connected || !el.list.value;
  }

  // ---- Security (permissive; safe if signing disabled) ----
  function setupSecurity(){
    if(!window.qz || !qz.security) return;
    try {
      qz.security.setCertificatePromise(() => Promise.resolve(null));
      qz.security.setSignaturePromise(() => Promise.resolve(null));
    } catch(_) {}
  }

  // ---- Connect & list ----
  async function connect({ refreshList = true } = {}){
    if(!window.qz || !qz.websocket){
      setStatus('QZ script not loaded', false);
      alert('qz-tray.js not found/loaded.');
      return false;
    }
    try{
      setupSecurity();
      if (!qz.websocket.isActive()){
        await qz.websocket.connect();
      }
      qzReady = true;
      setStatus('Connected', true);
      if (refreshList){
        const printers = await qz.printers.find();
        applyUI(true, printers);
        setStatus(`Connected (${printers.length} printers)`, true);
      } else {
        applyUI(true);
      }
      return true;
    }catch(e){
      qzReady = false;
      applyUI(false, []);
      setStatus('Not connected', false);
      // Tip: QZ Tray app चालू रखें; पहली बार पर permission popup आता है—Allow करें
      console.error('QZ connect error:', e);
      alert('Please start QZ Tray and Allow this site in its popup.\n' + (e?.message || e));
      return false;
    }
  }

  async function refreshPrinters(){
    if(!qzReady){ const ok = await connect({ refreshList:false }); if(!ok) return; }
    try{
      const list = await qz.printers.find();
      applyUI(true, list);
      setStatus(`Connected (${list.length} printers)`, true);
    }catch(e){
      setStatus('List failed', false);
      console.error('QZ list error:', e);
      alert('List printers error: ' + (e?.message || e));
    }
  }

  // ---- Public print helpers ----
  function dataUrlToBase64(u){ return (u||'').split(',')[1] || ''; }
  function ensureCRLF(s){ return /(\r\n|\n)$/.test(s) ? s : (s + '\r\n'); }

  async function printImagePngBase64(dataUrl, copies=1){
    const name = el.list && el.list.value ? el.list.value : selectedPrinter;
    if(!name){ alert('Please select a printer'); throw new Error('No printer selected'); }
    if(!qzReady && !(await connect({ refreshList:false }))) throw new Error('QZ not connected');

    const b64 = dataUrlToBase64(dataUrl);
    if(!b64) throw new Error('Invalid PNG data');

    const cfg = qz.configs.create(name, { copies: copies||1, colorType:'grayscale', altPrinting:true });
    const data = [{ type:'image', format:'base64', data:b64, options:{ rasterize:true } }];
    return qz.print(cfg, data);
  }

  async function printRaw(rawCommand){
    const name = el.list && el.list.value ? el.list.value : selectedPrinter;
    if(!name){ alert('Please select a printer'); throw new Error('No printer selected'); }
    if(!qzReady && !(await connect({ refreshList:false }))) throw new Error('QZ not connected');

    const cfg = qz.configs.create(name, { encoding:'UTF-8', altPrinting:true });
    const data = [{ type:'raw', format:'command', data: ensureCRLF(rawCommand) }];
    return qz.print(cfg, data);
  }

  // ---- Bind UI (this is likely what was missing) ----
  function bindUI(){
    // Connect button
    if (el.connectBtn){
      el.connectBtn.addEventListener('click', ()=>{ connect({ refreshList:true }); });
    }
    // Refresh list button
    if (el.refreshBtn){
      el.refreshBtn.addEventListener('click', refreshPrinters);
    }
    // Printer select
    if (el.list){
      el.list.addEventListener('change', ()=>{
        selectedPrinter = el.list.value || '';
        if(el.printAll) el.printAll.disabled = !selectedPrinter;
      });
    }
    // Initial UI
    setStatus('Not connected', false);
    applyUI(false, []);
  }

  // Expose & init
  NS.Bridge = { connect, refreshPrinters, bindUI, printImagePngBase64, printRaw };

  // Auto-bind once script loads (since this file is included after DOM)
  try { bindUI(); } catch(e){ console.warn('Bridge bind failed', e); }
})(window.App);
