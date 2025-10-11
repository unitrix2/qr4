window.App = window.App || {};
(function(NS){
  function createBrowseManager({inputEl, browseLabelEl, fileListEl}){
    let files = [];

    function setFiles(list){
      files = Array.from(list||[]);
      if(fileListEl){
        fileListEl.textContent = files.length
          ? (files.length===1 ? files[0].name : `${files.length} files selected`)
          : 'No files selected';
      }
      const ev = new CustomEvent('browse:changed', { detail: { files }});
      inputEl.dispatchEvent(ev);
    }

    // --- FIX: double-open prevention (label triggers + programmatic click debounce) ---
    // Some browsers fire both: label's default (for="fileInput") + our manual click.
    // We fully intercept label clicks and trigger exactly one click with debounce.
    let lastOpenTs = 0;
    function safeOpenDialog(){
      const now = Date.now();
      if (now - lastOpenTs < 700) return;      // debounce ~0.7s
      lastOpenTs = now;
      // Allow selecting same file again by clearing value before opening
      try { inputEl.value = ''; } catch(_) {}
      inputEl.click();
    }

    // Intercept label events: stop default "for" behavior and do our controlled open
    ['mousedown','click'].forEach(evt=>{
      browseLabelEl.addEventListener(evt, (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if (evt === 'click') safeOpenDialog();
      }, true);
    });
    // Keyboard support on label
    browseLabelEl.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        safeOpenDialog();
      }
    });

    // Some UAs still bubble a click from the input; don’t re-trigger anything there.
    inputEl.addEventListener('click', (e)=>{ e.stopPropagation(); }, true);

    // Standard change -> update list
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
