// Returns the timesheet entry page HTML. Submits JSON to POST /submit.
export function formHtml(defaultProducts) {
  const prodLines = (defaultProducts && defaultProducts.length ? defaultProducts : ['Reception360', 'Internal / Admin', 'Meetings']).join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tiptop Technologies — Weekly Timesheet</title>
<style>
  :root{--bg:#0f1216;--panel:#171b21;--panel-2:#1e242c;--line:#2a323c;--text:#e8ecf1;--muted:#95a1b0;--accent:#4f9df0;--accent-2:#3ad29f;--warn:#f0a04f;--danger:#ef6b6b;--hol:#a986f0;--radius:14px}
  @media(prefers-color-scheme:light){:root{--bg:#f4f6f9;--panel:#fff;--panel-2:#f0f3f7;--line:#e2e8f0;--text:#1b2430;--muted:#5a6675;--accent:#2f7fe0;--accent-2:#12b886;--hol:#7c5cd0}}
  *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;padding:24px}
  .wrap{max-width:1160px;margin:0 auto}
  header.top{display:flex;align-items:center;gap:12px;margin-bottom:20px}
  .logo{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff}
  h1{font-size:20px;margin:0}.sub{color:var(--muted);font-size:12.5px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin-bottom:18px}
  .card h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 14px}
  .grid-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
  label{display:block;font-size:12px;color:var(--muted);margin-bottom:5px;font-weight:600}
  input,textarea,select{width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:9px 11px;font-size:13.5px;font-family:inherit}
  textarea{resize:vertical;min-height:70px}
  .btn{display:inline-flex;align-items:center;gap:7px;background:var(--accent);color:#fff;border:none;border-radius:9px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer}
  .btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}.btn.small{padding:6px 11px;font-size:12.5px}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center}
  table{width:100%;border-collapse:collapse;min-width:900px}
  th,td{padding:8px 6px;text-align:center;border-bottom:1px solid var(--line);font-size:13px}
  th{color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:600}
  th .dnum{display:block;color:var(--text);font-size:12px;font-weight:700;text-transform:none}
  th.task,td.task{text-align:left;min-width:150px}th.desc,td.desc{text-align:left;min-width:170px}
  td .hr{width:50px;text-align:center;padding:6px 4px}
  td .descin{width:100%;border:none;background:transparent;padding:6px 4px}
  td select.prod{padding:6px}
  .row-total{font-weight:700;color:var(--accent)}
  tfoot td{font-weight:700;border-top:2px solid var(--line);border-bottom:none}
  .day-total{color:var(--accent-2)}.grand{font-size:16px;color:var(--accent)}
  .del{background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:16px}
  th.holcol,td.holcol{background:color-mix(in srgb,var(--hol) 15%,transparent)}
  .holbadge{display:block;font-size:9px;color:var(--hol);font-weight:700}
  .holchk input{width:16px;height:16px;accent-color:var(--hol)}
  .flag{border-radius:9px;padding:10px 12px;font-size:13px;margin-top:12px}
  .flag.err{background:color-mix(in srgb,var(--danger) 14%,transparent);border:1px solid color-mix(in srgb,var(--danger) 40%,transparent)}
  .flag.ok{background:color-mix(in srgb,var(--accent-2) 14%,transparent);border:1px solid color-mix(in srgb,var(--accent-2) 45%,transparent)}
  .hint{font-size:12px;color:var(--muted);margin-top:8px}code{background:var(--panel-2);padding:1px 5px;border-radius:5px}
</style></head><body><div class="wrap">
  <header class="top"><div class="logo">TT</div><div><h1>Weekly Timesheet</h1><div class="sub" id="weekLabel">Tiptop Technologies · log hours by product, submit for approval</div></div></header>

  <div class="card"><h2>Timesheet details</h2><div class="grid-fields">
    <div><label>Employee name</label><input id="emp" placeholder="Your name" oninput="render()"></div>
    <div><label>Your email</label><input id="empEmail" type="email" placeholder="you@tiptoptech.com"></div>
    <div><label>Week starting (Monday)</label><input id="weekStart" type="date" onchange="render()"></div>
    <div><label>Approver email(s) — comma separated</label><input id="approvers" placeholder="leader@tiptoptech.com, ceo@tiptoptech.com"></div>
  </div></div>

  <div class="card"><h2>Products / projects</h2>
    <label>One per line — these fill the task dropdown below.</label>
    <textarea id="prodList" rows="5" oninput="syncProducts()">${prodLines}</textarea></div>

  <div class="card"><h2>Import from calendar (optional)</h2>
    <label>One event per line — <code>YYYY-MM-DD, Product, Description, hours</code></label>
    <textarea id="calPaste" placeholder="2026-07-20, Reception360, Client onboarding calls, 2.5"></textarea>
    <div class="btn-row"><button class="btn ghost small" onclick="importCal()">Import → grid</button><span class="hint" id="importMsg"></span></div></div>

  <div class="card"><h2>Hours by task</h2><div style="overflow-x:auto"><table id="grid"><thead>
    <tr id="headRow"><th class="task">Product</th><th class="desc">Description</th>
      <th data-d="0">Mon<span class="dnum" id="hd0">—</span></th><th data-d="1">Tue<span class="dnum" id="hd1">—</span></th>
      <th data-d="2">Wed<span class="dnum" id="hd2">—</span></th><th data-d="3">Thu<span class="dnum" id="hd3">—</span></th>
      <th data-d="4">Fri<span class="dnum" id="hd4">—</span></th><th data-d="5">Sat<span class="dnum" id="hd5">—</span></th>
      <th data-d="6">Sun<span class="dnum" id="hd6">—</span></th><th>Total</th><th></th></tr>
    <tr class="holrow" id="holRow"><td class="task" colspan="2" style="text-align:right;color:var(--muted);font-size:11px">Public holiday →</td></tr>
    </thead><tbody id="rows"></tbody><tfoot><tr><td class="task" colspan="2">Daily total</td>
      <td class="day-total" id="dt0">0</td><td class="day-total" id="dt1">0</td><td class="day-total" id="dt2">0</td>
      <td class="day-total" id="dt3">0</td><td class="day-total" id="dt4">0</td><td class="day-total" id="dt5">0</td>
      <td class="day-total" id="dt6">0</td><td class="grand" id="grand">0</td><td></td></tr></tfoot></table></div>
    <div class="btn-row"><button class="btn ghost small" onclick="addRow()">+ Add task</button></div></div>

  <div class="card"><h2>Submit for approval</h2>
    <div class="hint">Sends the timesheet to your approver(s) with a real <b>Approve</b> button and the PDF attached. When they approve, you get an email with the approved PDF automatically.</div>
    <div class="btn-row"><button class="btn" onclick="submitTs()">✉ Submit for approval</button><span id="msg"></span></div>
    <div id="result" class="flag" style="display:none"></div></div>
</div>
<script>
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
let products=[], holidays=[false,false,false,false,false,false,false], rows=[];
function syncProducts(){products=document.getElementById("prodList").value.split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);render();}
function addRow(product="",desc="",hrs=[0,0,0,0,0,0,0]){rows.push({product,desc,hrs:hrs.slice()});render();}
function delRow(i){rows.splice(i,1);render();}
function prodOptions(sel){let o=\`<option value=""\${sel?'':' selected'}>Select…</option>\`,f=false;products.forEach(p=>{const s=(p===sel);if(s)f=true;o+=\`<option\${s?' selected':''}>\${esc(p)}</option>\`;});if(sel&&!f)o+=\`<option selected>\${esc(sel)}</option>\`;return o;}
function buildHolRow(){const hr=document.getElementById("holRow");while(hr.children.length>1)hr.removeChild(hr.lastChild);for(let d=0;d<7;d++){const td=document.createElement("td");if(holidays[d])td.className="holcol";td.innerHTML=\`<input type="checkbox" \${holidays[d]?'checked':''} onchange="holidays[\${d}]=this.checked;render()">\`;hr.appendChild(td);}hr.appendChild(document.createElement("td"));hr.appendChild(document.createElement("td"));}
function render(){syncHeaderDates();buildHolRow();const tb=document.getElementById("rows");tb.innerHTML="";rows.forEach((r,i)=>{const tr=document.createElement("tr");let c=\`<td class="task"><select class="prod" onchange="rows[\${i}].product=this.value;refresh()">\${prodOptions(r.product)}</select></td><td class="desc"><input class="descin" value="\${esc(r.desc)}" placeholder="What you worked on…" oninput="rows[\${i}].desc=this.value"></td>\`;for(let d=0;d<7;d++)c+=\`<td class="\${holidays[d]?'holcol':''}"><input class="hr" type="number" min="0" step="0.25" value="\${r.hrs[d]||''}" oninput="rows[\${i}].hrs[\${d}]=parseFloat(this.value)||0;refresh()"></td>\`;c+=\`<td class="row-total" data-rt="\${i}">\${fmt(r.hrs.reduce((a,b)=>a+(+b||0),0))}</td><td><button class="del" onclick="delRow(\${i})">✕</button></td>\`;tr.innerHTML=c;tb.appendChild(tr);});refresh();updateWeekLabel();}
function refresh(){rows.forEach((r,i)=>{const el=document.querySelector(\`[data-rt="\${i}"]\`);if(el)el.textContent=fmt(r.hrs.reduce((a,b)=>a+(+b||0),0));});let g=0;for(let d=0;d<7;d++){let s=0;rows.forEach(r=>s+=(+r.hrs[d]||0));document.getElementById("dt"+d).textContent=fmt(s);g+=s;}document.getElementById("grand").textContent=fmt(g);}
function weekStartDate(){const v=document.getElementById("weekStart").value;return v?new Date(v+"T00:00"):null;}
function dateForDay(d){const s=weekStartDate();if(!s)return null;const dt=new Date(s);dt.setDate(s.getDate()+d);return dt;}
function syncHeaderDates(){for(let d=0;d<7;d++){const dt=dateForDay(d);document.getElementById("hd"+d).innerHTML=(dt?dt.toLocaleDateString(undefined,{month:"short",day:"numeric"}):"—")+(holidays[d]?'<span class="holbadge">Holiday</span>':'');}}
function updateWeekLabel(){const s=weekStartDate(),l=document.getElementById("weekLabel");if(s){const e=new Date(s);e.setDate(s.getDate()+6);const o={month:"short",day:"numeric"};l.textContent=\`Week of \${s.toLocaleDateString(undefined,o)} – \${e.toLocaleDateString(undefined,{...o,year:"numeric"})} · Tiptop Technologies\`;}else l.textContent="Tiptop Technologies · log hours by product, submit for approval";}
function dayIndex(s){const dt=new Date(s+"T00:00");return isNaN(dt)?-1:(dt.getDay()+6)%7;}
function importCal(){const raw=document.getElementById("calPaste").value.trim(),m=document.getElementById("importMsg");if(!raw){m.textContent="Nothing to import.";return;}let added=0,first=null;raw.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean).forEach(line=>{const p=line.split(/\\s*[|,]\\s*/);if(p.length<3)return;const date=p[0].trim(),hrs=parseFloat(p[p.length-1]),di=dayIndex(date);if(di<0||isNaN(hrs))return;let product,desc="";if(p.length>=4){product=p[1].trim();desc=p.slice(2,-1).join(", ").trim();}else product=p[1].trim();if(!product)return;if(!first)first=date;if(!products.some(x=>x.toLowerCase()===product.toLowerCase())){products.push(product);document.getElementById("prodList").value=products.join("\\n");}let row=rows.find(r=>r.product.toLowerCase()===product.toLowerCase()&&r.desc.toLowerCase()===desc.toLowerCase());if(!row){row={product,desc,hrs:[0,0,0,0,0,0,0]};rows.push(row);}row.hrs[di]+=hrs;added++;});if(first&&!document.getElementById("weekStart").value){const dt=new Date(first+"T00:00"),mon=new Date(dt);mon.setDate(dt.getDate()-((dt.getDay()+6)%7));document.getElementById("weekStart").value=mon.toISOString().slice(0,10);}m.textContent=\`Imported \${added} event(s).\`;render();}
function val(id){return document.getElementById(id).value.trim();}
function fmt(n){return (Math.round(n*100)/100).toString();}
function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function submitTs(){const res=document.getElementById("result");const emp=val("emp"),empEmail=val("empEmail"),approvers=val("approvers"),weekStart=val("weekStart");const active=rows.filter(r=>r.product.trim()&&r.hrs.some(h=>+h>0));const miss=[];if(!emp)miss.push("employee name");if(!empEmail)miss.push("your email");if(!approvers)miss.push("approver email(s)");if(!weekStart)miss.push("week starting date");if(!active.length)miss.push("at least one task with hours");if(miss.length){res.style.display="block";res.className="flag err";res.textContent="Please fill in: "+miss.join(", ")+".";return;}
  res.style.display="block";res.className="flag";res.textContent="Submitting…";
  try{const r=await fetch("/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employeeName:emp,employeeEmail:empEmail,approverEmails:approvers.split(",").map(s=>s.trim()).filter(Boolean),weekStart,products,rows:active,holidays})});const j=await r.json();if(j.ok){res.className="flag ok";res.innerHTML="✓ Sent to your approver"+(j.mode==="preview"?" <b>(preview mode — email written to server outbox; configure SMTP to actually send)</b>":"")+". You'll get the approved PDF by email once they click Approve.";}else{res.className="flag err";res.textContent="Error: "+(j.error||"submit failed");}}catch(e){res.className="flag err";res.textContent="Network error: "+e.message;}}
syncProducts();addRow();addRow();addRow();
</script></body></html>`;
}
