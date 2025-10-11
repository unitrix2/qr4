window.App = window.App || {};
(function(NS){
  let qzReady=false, lastPrinters=[], selected='';

  function setBridgeUI({connected, printers, preserve}){
    const listEl = document.getElementById('printerList');
    const status = document.getElementById('bridgeStatus');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnPrint = document.getElementById('btnPrintAll');

    if(Array.isArray(printers)) lastPrinters = printers.slice();

    const current = listEl.value;
    if(Array.isArray(printers)){
      listEl.innerHTML = printers.length
        ? `<option value="">(Select Printer)</option>${printers.map(p=>`<option value="${p}">${p}</option>`).join('')}`
        : `<option value="">(No printers)</option>`;
    }
    if(preserve && current){
      const opt = Array.from(listEl.options).find(o=>o.value===current);
      if(opt) listEl.value = current;
    }
    if(selected){ listEl.value = selected; }

    status.textContent = connected
      ? `Status: Connected (${(Array.isArray(printers)?printers:lastPrinters).length} printers)`
      : 'Status: Not connected';

    listEl.disabled = !connected || !lastPrinters.length;
    btnRefresh.disabled = !connected;
    btnPrint.disabled = !connected || !listEl.value;
  }

  async function connect({refreshList=true}={}){
    if(!window.qz || !qz.websocket){
      alert('QZ Tray script not loaded'); return false;
    }
    try{
      if(!qzReady || !qz.websocket.isActive()){
        // Optional: if your QZ Tray is configured for signing, set promises here.
        // qz.security.setCertificatePromise(() => Promise.resolve("-----BEGIN CERTIFICATE-----\n..."));
        // qz.security.setSignaturePromise(toSign => Promise.resolve(signWithYourKey(toSign)));
        await qz.websocket.connect();
        qzReady=true;
      }
      if(refreshList){
        const list = await qz.printers.find();
        setBridgeUI({connected:true, printers:list, preserve:true});
      }else{
        setBridgeUI({connected:true, printers:null, preserve:true});
      }
      return true;
    }catch(e){
      qzReady=false;
      setBridgeUI({connected:false, printers:[], preserve:true});
      alert('Please start QZ Tray.\n'+(e?.message||e));
      return false;
    }
  }

  function bindUI(){
    const listEl = document.getElementById('printerList');
    const btnBridge = document.getElementById('btnBridge');
    const btnRefresh = document.getElementById('btnRefresh');

    listEl.addEventListener('change', ()=>{
      selected = listEl.value;
      setBridgeUI({connected:qzReady, printers:null, preserve:true});
    });
    btnBridge.addEventListener('click', ()=> connect({refreshList:true}));
    btnRefresh.addEventListener('click', async ()=>{
      if(!qzReady){ alert('Not connected'); return; }
      const list=await qz.printers.find();
      setBridgeUI({connected:true, printers:list, preserve:true});
    });
  }

  // --- FIX: send proper base64 payload for images ---
  function dataUrlToBase64(u){ return (u||'').split(',')[1] || ''; }

  async function printImagePngBase64(dataUrl, copies=1){
    const listEl = document.getElementById('printerList');
    const name = listEl.value || selected;
    if(!name){ alert('Please select a printer'); throw new Error('No printer selected'); }
    if(!qzReady && !(await connect({refreshList:false}))) throw new Error('QZ not connected');

    const b64 = dataUrlToBase64(dataUrl);
    if(!b64){ throw new Error('Invalid PNG data'); }

    const cfg = qz.configs.create(name, {
      colorType: 'grayscale',
      copies: copies||1
    });

    // QZ expects base64 when format='base64'
    const data = [{
      type: 'image',
      format: 'base64',
      data: b64,
      options: { rasterize: true } // hint: improves compatibility
    }];

    return qz.print(cfg, data);
  }

  NS.Bridge = { connect, bindUI, printImagePngBase64 };
})(window.App);
