window.App = window.App || {};
(function(NS){
  async function fileToDataURL(f){
    return new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(r.error); r.readAsDataURL(f);});
  }
  function loadImage(src){
    return new Promise((res,rej)=>{const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src;});
  }
  function makeCanvas(w,h){
    const c=document.createElement('canvas'); c.width=w; c.height=h; return {canvas:c, ctx:c.getContext('2d')};
  }
  async function readQRFromFile(file){
    const dataURL = await fileToDataURL(file);
    const img=await loadImage(dataURL);
    const {canvas,ctx}=makeCanvas(img.naturalWidth||img.width,img.naturalHeight||img.height);
    ctx.drawImage(img,0,0);
    const id=ctx.getImageData(0,0,canvas.width,canvas.height);
    const q=jsQR(id.data,id.width,id.height,{inversionAttempts:'attemptBoth'});
    return (q && q.data) ? q.data : '';
  }
  function makeQrSvg(text){
    const qr=qrcode(0,'M'); qr.addData(text||''); qr.make();
    return qr.createSvgTag({cellSize:8, margin:0}); // raw inner grid
  }
  NS.QR = { readQRFromFile, makeQrSvg };
})(window.App);
