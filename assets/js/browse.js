// Single-responsibility: file browsing UX (no double dialog, safe reselect)
window.App = window.App || {};
(function(NS){
  /**
   * createBrowseManager
   * @param {Object} cfg
   * @param {HTMLInputElement} cfg.inputEl   - <input type="file">
   * @param {HTMLElement}      cfg.browseLabelEl - label/button which opens dialog
   * @param {HTMLElement}      cfg.fileListEl - where selected names count shown
   * @returns {{getFiles:()=>File[], reset:()=>void}}
   */
  function createBrowseManager({inputEl, browseLabelEl, fileListEl}){
    let files = [];

    function emitChanged(){
      const ev = new CustomEvent('browse:changed', { detail: { files }});
      inputEl.dispatchEvent(ev);
    }
    function renderList(){
      if(!fileListEl) return;
      fileListEl.textContent = files.length
        ? (files.length === 1 ? files[0].name : `${files.length} files selected`)
        : 'No files selected';
    }
    function setFiles(list){
      files = Array.from(list || []);
      renderList();
      emitChanged();
    }

    // ---- FIX: prevent double-open across browsers/labels ----
    // We fully intercept label clicks and open the dialog with a debounce.
    let lastOpenTs = 0;
    function safeOpenDialog(){
      const now = Date.now();
      if (now - lastOpenTs < 650) return; // debounce ~0.65s
      lastOpenTs = now;
      // allow same file reselect to fire "change"
      try { inputEl.value = ''; } catch(e) {}
      inputEl.click();
    }

    // Intercept label default (for="...") behavior
    ['mousedown','click'].forEach(evt=>{
      browseLabelEl.addEventListener(evt, (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if (evt === 'click') safeOpenDialog();
      }, true); // capture to beat native
    });
    // Keyboard on label
    browseLabelEl.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        safeOpenDialog();
      }
    });
    // Some UAs bubble input's own click—block it
    inputEl.addEventListener('click', (e)=>{ e.stopPropagation(); }, true);

    // Standard handlers
    inputEl.addEventListener('change', (e)=>{
      setFiles(e.target.files);
    });

    function reset(){
      files = [];
      try { inputEl.value = ''; } catch(e) {}
      renderList();
      emitChanged();
    }

    // Initial render
    renderList();

    return {
      getFiles: ()=> files.slice(),
      reset
    };
  }

  NS.Browse = { createBrowseManager };
})(window.App);
