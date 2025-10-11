window.App = window.App || {};
(function(NS){
  function createBrowseManager({inputEl, browseLabelEl, fileListEl}){
    let files = [];
    function setFiles(list){
      files = Array.from(list||[]);
      if(fileListEl){
        fileListEl.textContent = files.length ? (files.length===1?files[0].name:`${files.length} files selected`) : 'No files selected';
      }
      const ev = new CustomEvent('browse:changed', { detail: { files }});
      inputEl.dispatchEvent(ev);
    }
    // prevent auto re-open (focus trap)
    let suppress = false;
    browseLabelEl.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); inputEl.click(); } });
    browseLabelEl.addEventListener('click', ()=>{ if(!suppress) inputEl.click(); });
    inputEl.addEventListener('click', ()=>{ suppress = true; setTimeout(()=>suppress=false, 500); }); // block rapid double open
    inputEl.addEventListener('change', e=> setFiles(e.target.files));

    function reset(){
      files = [];
      try{ inputEl.value=''; }catch(_){}
      if(fileListEl) fileListEl.textContent='No files selected';
      const ev = new CustomEvent('browse:changed', { detail: { files }});
      inputEl.dispatchEvent(ev);
    }
    return { getFiles:()=>files.slice(), reset };
  }
  NS.Browse = { createBrowseManager };
})(window.App);
