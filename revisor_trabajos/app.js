const $ = id => document.getElementById(id);
const fileInput = $("fileInput");
const dropzone = $("dropzone");

fileInput.addEventListener("change", e => {
  if (e.target.files[0]) analyzeFile(e.target.files[0]);
});

["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, e => {
  e.preventDefault(); dropzone.style.background = "#f8faff";
}));
["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, e => {
  e.preventDefault(); dropzone.style.background = "";
}));
dropzone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) analyzeFile(file);
});

$("newFileBtn").addEventListener("click", reset);

async function extractText(file) {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "txt") return await file.text();

  if (ext === "docx") {
    if (!window.mammoth) throw new Error("No se pudo cargar el lector DOCX.");
    const buffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({arrayBuffer: buffer});
    return result.value;
  }

  if (ext === "pdf") {
    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({data: await file.arrayBuffer()}).promise;
    let text = "";
    for (let i=1; i<=pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(x => x.str).join(" ") + "\n\n";
      updateProgress(Math.min(65, 20 + i/pdf.numPages*45), `Extrayendo página ${i} de ${pdf.numPages}`);
    }
    return text;
  }
  throw new Error("Formato no compatible.");
}

function sentences(text) {
  return text.replace(/\s+/g," ").split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>20);
}
function paragraphs(text) {
  return text.split(/\n\s*\n/).map(p=>p.trim()).filter(p=>p.length>30);
}
function words(text) { return text.toLowerCase().match(/[a-záéíóúüñ]{3,}/gi) || []; }

const genericPatterns = [
  /es importante destacar que/i,
  /cabe resaltar que/i,
  /en este sentido/i,
  /por otro lado/i,
  /de manera significativa/i,
  /en la actualidad/i,
  /resulta fundamental/i,
  /juega un papel fundamental/i,
  /es importante mencionar/i,
  /a través de la implementación/i,
  /con el fin de lograr/i,
  /en conclusión/i
];

function analyze(text) {
  const sents = sentences(text);
  const paras = paragraphs(text);
  const ws = words(text);

  const freq = {};
  ws.forEach(w => freq[w]=(freq[w]||0)+1);
  const repeatedWords = Object.entries(freq).filter(([w,n])=>n>=8 && n/ws.length>0.012).length;
  const generic = sents.filter(s=>genericPatterns.some(r=>r.test(s)));
  const longSents = sents.filter(s=>s.split(/\s+/).length>38).length;
  const veryShort = sents.filter(s=>s.split(/\s+/).length<6).length;

  let score = 100;
  score -= Math.min(25, generic.length*3);
  score -= Math.min(18, repeatedWords*4);
  score -= Math.min(15, longSents*2);
  score -= Math.min(8, veryShort*1);
  score = Math.max(20, Math.round(score));

  const recs = [];
  if (generic.length) recs.push(["Usa ejemplos concretos", "Cuando una frase sea muy general, explica qué significa en tu caso y añade un ejemplo relacionado con el tema de tu trabajo."]);
  if (repeatedWords) recs.push(["Revisa palabras repetidas", "Busca términos que aparecen muchas veces seguidas y reemplaza algunos por expresiones adecuadas o reformula las oraciones."]);
  if (longSents) recs.push(["Divide algunas oraciones", "Las oraciones demasiado extensas pueden perder claridad. Separa las ideas cuando realmente sean independientes."]);
  recs.push(["Incorpora tu análisis", "Explica con tus propias palabras qué entendiste, qué relación encuentras con el tema y por qué consideras importante la información."]);
  recs.push(["Verifica las fuentes", "Comprueba que las afirmaciones importantes tengan fuentes y que las referencias correspondan realmente con lo que escribiste."]);

  return {score,sents,paras,generic,repeatedWords,recs,longSents};
}

async function analyzeFile(file) {
  if (file.size > 15*1024*1024) return alert("El archivo supera el límite de 15 MB.");
  $("uploadView").classList.add("hidden");
  $("resultView").classList.add("hidden");
  $("loadingView").classList.remove("hidden");
  try {
    updateProgress(8,"Preparando el análisis"); step(1);
    await wait(450);
    const text = await extractText(file);
    if (!text.trim() || text.trim().length < 80) throw new Error("No se encontró suficiente texto. Si es un PDF escaneado como imagen, necesitaría OCR.");
    updateProgress(72,"Analizando estructura"); step(2); await wait(500);
    updateProgress(84,"Revisando repeticiones"); step(3); await wait(500);
    const result = analyze(text);
    updateProgress(100,"Análisis completado"); step(4); await wait(500);
    render(file,result);
  } catch(e) {
    alert(e.message || "No fue posible analizar el archivo.");
    reset();
  }
}

function render(file,r){
  $("loadingView").classList.add("hidden");
  $("resultView").classList.remove("hidden");
  $("fileName").textContent = file.name;
  $("score").textContent = r.score;
  $("sentences").textContent = r.sents.length;
  $("paragraphs").textContent = r.paras.length;
  $("repeated").textContent = r.repeatedWords;
  $("generic").textContent = r.generic.length;

  $("scoreLabel").textContent = r.score >= 85 ? "Escritura bastante natural" : r.score >= 65 ? "Conviene revisar algunos puntos" : "Se recomienda una revisión más profunda";
  $("summary").textContent = "Este índice resume señales de estilo encontradas en el documento. No representa un porcentaje de uso de inteligencia artificial.";

  $("recommendations").innerHTML = r.recs.map(([t,d])=>`<div class="recommendation"><strong>${t}</strong>${d}</div>`).join("");

  const fragments = r.generic.slice(0,10);
  $("fragments").innerHTML = fragments.length
    ? fragments.map(x=>`<div class="fragment"><b>${escapeHtml(x)}</b><div class="reason">💡 Revisa si puedes explicar esta idea con un ejemplo concreto o con tu propia interpretación.</div></div>`).join("")
    : `<p class="muted">No se encontraron frases de la lista de patrones generales. Aun así, revisa el documento para asegurarte de que las ideas reflejen tu comprensión.</p>`;
}

function updateProgress(n,msg){$("progressBar").style.width=n+"%";$("progressText").textContent=msg}
function step(n){for(let i=1;i<=4;i++){const el=$("s"+i); if(i<n) {el.className="done";el.textContent="✓ "+el.textContent.slice(2)} else if(i===n){el.className="active";el.textContent="● "+el.textContent.slice(2)}}}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function reset(){location.reload()}
