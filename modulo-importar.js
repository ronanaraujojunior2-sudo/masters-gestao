/* MASTERS GESTÃO - Módulo 3B-4: importação por planilha (feriados agora; solicitações e pedidos nas próximas partes) */
(function(){if(window.XLSX)return;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';document.head.appendChild(s)})();

const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\*/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const TIPOS={nacional:'Nacional',estadual:'Estadual',municipal:'Municipal',empresa:'Empresa'};
const fdh=d=>new Date(d).toLocaleString('pt-BR');
const fdt=d=>new Date(d+'T00:00').toLocaleDateString('pt-BR');

function parseData(v){let y,m,d;
 if(typeof v==='number'){const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const s=String(v||'').trim();let k=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if(k){d=+k[1];m=+k[2];y=+k[3]}else{k=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!k)return null;y=+k[1];m=+k[2];d=+k[3]}}
 const t=new Date(Date.UTC(y,m-1,d));
 if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d||y<2000||y>2100)return null;
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}

/* ===== o que cada importação contém ===== */
const IMP={
feriados:{titulo:'Importar feriados',modelo:'modelo-feriados',rpc:'importar_feriados',adm:true,
 cols:[
  {k:'data',h:'Data',req:1,como:'Data do feriado ou dia não útil, no formato dia/mês/ano.',ex:'01/01/2027'},
  {k:'descricao',h:'Descrição',req:1,como:'Nome do feriado ou do dia não útil.',ex:'Confraternização Universal'},
  {k:'tipo',h:'Tipo',req:1,como:'Nacional, Estadual, Municipal ou Empresa.',ex:'Nacional'},
  {k:'obra',h:'Obra',req:0,como:'Nome ou código de uma obra já cadastrada. Preencha só se o feriado vale para uma obra específica. Vazio vale para todas.',ex:'(opcional)'}],
 notas:['Preencha somente a aba “Modelo”, a partir da linha 2. Não altere os nomes das colunas.','Datas no formato dia/mês/ano, por exemplo 01/01/2027.','Feriados já cadastrados são ignorados. Nada é sobrescrito nem apagado.','Até 2000 linhas por arquivo.'],
 async ctx(){const[{data:ob},{data:ex}]=await Promise.all([sb.from('obras').select('id,nome,codigo'),sb.from('feriados').select('data,obra_id')]);
  return{obras:ob||[],existentes:new Set((ex||[]).map(e=>e.data+'|'+(e.obra_id||'')))}},
 validar(rows,x){const vis=new Map();return rows.map(r=>{const v=r.v,d=parseData(v.data),desc=String(v.descricao||'').trim(),tp=TIPOS[nz(v.tipo)],ob=String(v.obra||'').trim();
  const o={linha:r.linha,resumo:(d?fdt(d):String(v.data))+' — '+desc+' ('+(tp||String(v.tipo))+(ob?', '+ob:'')+')'};
  const rej=m=>({...o,estado:'rej',motivo:m});
  if(!d)return rej('Data inválida. Use dia/mês/ano.');
  if(!desc)return rej('Descrição não informada.');
  if(!tp)return rej('Tipo inválido. Use Nacional, Estadual, Municipal ou Empresa.');
  let oid=null;if(ob){const f=x.obras.find(a=>nz(a.nome)===nz(ob)||nz(a.codigo)===nz(ob));if(!f)return rej('Obra não encontrada no sistema.');oid=f.id}
  const k=d+'|'+(oid||'');
  if(x.existentes.has(k))return{...o,estado:'ign',motivo:'Já cadastrado no sistema.'};
  if(vis.has(k))return{...o,estado:'ign',motivo:'Repetido no arquivo (já aparece na linha '+vis.get(k)+').'};
  vis.set(k,r.linha);return{...o,estado:'novo',payload:{linha:r.linha,data:d,descricao:desc,escopo:tp,obra_id:oid}}})}}
};

/* ===== leitura de arquivo ===== */
function csv(t){const L=t.replace(/^\uFEFF/,'').split(/\r?\n/);const f=L[0]||'';const d=f.split(';').length>=f.split(',').length?';':',';
 return L.filter(x=>x.trim()!=='').map(l=>{const o=[];let c='',q=false;
  for(let i=0;i<l.length;i++){const h=l[i];if(q){if(h==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===d){o.push(c);c=''}else c+=h}
  o.push(c);return o})}
async function ler(file,c){const n=file.name.toLowerCase();let arr;
 if(n.endsWith('.csv')){const b=await file.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}arr=csv(t)}
 else if(n.endsWith('.xlsx')){const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const ws=wb.Sheets['Modelo']||wb.Sheets[wb.SheetNames[0]];arr=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''})}
 else throw new Error('Use um arquivo .xlsx ou .csv.');
 if(!arr.length)throw new Error('O arquivo está vazio.');
 const H=arr[0].map(nz),pos={};c.cols.forEach(k=>{pos[k.k]=H.indexOf(nz(k.h))});
 const falt=c.cols.filter(k=>k.req&&pos[k.k]<0).map(k=>k.h);
 if(falt.length)throw new Error('Faltam colunas obrigatórias no arquivo: '+falt.join(', ')+'. Baixe o modelo de novo e preencha a aba Modelo.');
 const rows=[];arr.slice(1).forEach((l,i)=>{const v={};c.cols.forEach(k=>v[k.k]=pos[k.k]<0?'':l[pos[k.k]]);if(Object.values(v).some(x=>String(x).trim()!==''))rows.push({linha:i+2,v})});
 if(!rows.length)throw new Error('Não há linhas preenchidas abaixo do cabeçalho.');
 if(rows.length>2000)throw new Error('O arquivo tem mais de 2000 linhas. Divida em arquivos menores.');
 return rows}

/* ===== modelo para baixar ===== */
function modelo(c,tipo){const H=c.cols.map(k=>k.h);
 if(tipo==='csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+H.join(';')+'\r\n'],{type:'text/csv;charset=utf-8'}));a.download=c.modelo+'.csv';a.click();return}
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 const wb=XLSX.utils.book_new(),w1=XLSX.utils.aoa_to_sheet([H]);w1['!cols']=H.map(()=>({wch:28}));XLSX.utils.book_append_sheet(wb,w1,'Modelo');
 const w2=XLSX.utils.aoa_to_sheet([['Coluna','Obrigatória?','Como preencher','Exemplo'],...c.cols.map(k=>[k.h,k.req?'Sim':'Não',k.como,k.ex]),[],...c.notas.map(n=>[n])]);
 w2['!cols']=[{wch:26},{wch:14},{wch:70},{wch:34}];XLSX.utils.book_append_sheet(wb,w2,'Instruções');XLSX.writeFile(wb,c.modelo+'.xlsx')}

/* ===== relatório ===== */
const lista=(t,L)=>L&&L.length?'<h3>'+t+'</h3>'+L.map(x=>`<div class="mv">Linha ${x.linha}: ${esc(x.motivo)}</div>`).join(''):'';
const relatorio=d=>`<div class="kpis"><div class="card kpi"><b>${d.importados}</b>Importados</div><div class="card kpi"><b>${d.ignorados}</b>Ignorados</div><div class="card kpi al"><b>${d.rejeitados}</b>Rejeitados</div></div>`+lista('Registros ignorados',d.detalhes.ignorados)+lista('Registros rejeitados',d.detalhes.rejeitados);

/* ===== telas ===== */
async function telaImp(key){const c=IMP[key];cur='imp_'+key;mark();const v=$('#view');
 if(c.adm&&me.perfil!=='MASTERS'){v.innerHTML='<h1>'+c.titulo+'</h1><div class="err">Somente o administrador pode usar esta importação.</div>';return}
 v.innerHTML=`<h1>${c.titulo}</h1><p class="sub">Siga os 4 passos. Nada é gravado antes da sua confirmação.</p>
 <div class="card"><h3 style="margin-top:0">Passo 1: baixe o modelo</h3><p class="hint">Abra no Excel, leia a aba “Instruções” e preencha a aba “Modelo”.</p><button class="btn" id="i_m">Baixar modelo (Excel)</button> <button class="sec" id="i_c">Baixar modelo (CSV)</button></div>
 <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Passo 2: escolha o arquivo preenchido</h3><input id="i_f" type="file" accept=".xlsx,.csv"></div><div id="i_r" style="margin-top:12px"></div>`;
 $('#i_m').onclick=()=>modelo(c);$('#i_c').onclick=()=>modelo(c,'csv');
 $('#i_f').onchange=e=>processar(c,e.target.files[0])}

async function processar(c,file){const R=$('#i_r');if(!file)return;
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 R.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{const rows=await ler(file,c),x=await c.ctx(),res=c.validar(rows,x);
  const N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej');
  const lb={novo:'Novo',ign:'Ignorado',rej:'Rejeitado'},cl={novo:'blue',ign:'',rej:'red'};
  R.innerHTML=`<div class="card"><h3 style="margin-top:0">Passo 3: confira a prévia</h3><p>Arquivo: <b>${esc(file.name)}</b> — ${res.length} linha(s) lida(s)</p>
  <div class="kpis"><div class="card kpi"><b>${N.length}</b>Novos</div><div class="card kpi"><b>${I.length}</b>Ignorados</div><div class="card kpi al"><b>${J.length}</b>Rejeitados</div></div>
  <div class="wrap" style="max-height:360px;overflow:auto"><table style="min-width:520px"><thead><tr><th>Linha</th><th>Registro</th><th>Situação</th><th>Motivo</th></tr></thead><tbody>${res.slice(0,500).map(a=>`<tr><td>${a.linha}</td><td>${esc(a.resumo)}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${esc(a.motivo||'')}</td></tr>`).join('')}</tbody></table></div>${res.length>500?'<p class="hint">Mostrando as 500 primeiras linhas. A importação considera todas.</p>':''}
  <div class="err hide" id="i_e"></div><div class="acts"><button class="sec" id="i_x">Cancelar</button><button class="btn" id="i_ok" ${N.length?'':'disabled'}>Passo 4: importar ${N.length} registro(s) novo(s)</button></div></div>`;
  $('#i_x').onclick=()=>{R.innerHTML='';$('#i_f').value=''};
  $('#i_ok').onclick=async()=>{
   if(!confirm('Importar '+N.length+' registro(s) novo(s)?\n'+I.length+' serão ignorados e '+J.length+' rejeitados.'))return;
   const b=$('#i_ok');b.disabled=true;
   const{data,error}=await sb.rpc(c.rpc,{p_arquivo:file.name,p_linhas:N.map(a=>a.payload),p_rejeitados:J.map(a=>({linha:a.linha,motivo:a.motivo})),p_ignorados:I.map(a=>({linha:a.linha,motivo:a.motivo}))});
   if(error){b.disabled=false;const e=$('#i_e');e.textContent=msg(error);e.classList.remove('hide');return}
   cache={};R.innerHTML='<div class="card"><h3 style="margin-top:0">Resultado da importação</h3>'+relatorio(data)+'<p class="hint">Este relatório fica guardado em “Histórico de importações”.</p></div>';toast('Importação concluída.')}
 }catch(e){R.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}

async function telaHist(){cur='imp_hist';mark();const v=$('#view');v.innerHTML='<h1>Histórico de importações</h1><p class="sub">Carregando…</p>';
 const{data,error}=await sb.from('importacoes').select('*').order('em',{ascending:false}).limit(200);
 if(error){v.innerHTML='<h1>Histórico de importações</h1><div class="err">'+esc(msg(error))+'</div>';return}
 const N={};if(me.perfil==='MASTERS'){const{data:p}=await sb.from('perfis').select('id,nome,login');(p||[]).forEach(x=>N[x.id]=x.nome||x.login)}
 v.innerHTML=`<h1>Histórico de importações</h1><p class="sub">${data.length} importação(ões)</p><div class="card wrap">${data.length?`<table><thead><tr><th>Data e hora</th><th>Tipo</th><th>Arquivo</th><th>Feita por</th><th>Importados</th><th>Ignorados</th><th>Rejeitados</th><th></th></tr></thead><tbody>${data.map((r,i)=>`<tr><td>${fdh(r.em)}</td><td>${esc(r.tipo)}</td><td>${esc(r.arquivo||'—')}</td><td>${esc(N[r.usuario_id]||(r.usuario_id===me.id?'Você':'—'))}</td><td>${r.importados}</td><td>${r.ignorados}</td><td>${r.rejeitados}</td><td><button class="mini" data-i="${i}">Ver relatório</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nenhuma importação feita ainda.</div>'}</div>`;
 v.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const r=data[b.dataset.i];modal('Relatório: '+esc(r.tipo)+' — '+fdh(r.em),'<p>Arquivo: <b>'+esc(r.arquivo||'—')+'</b></p>'+relatorio({importados:r.importados,ignorados:r.ignorados,rejeitados:r.rejeitados,detalhes:r.detalhes||{}}),null)})}

/* ===== menu ===== */
const TELAS={imp_feriados:()=>telaImp('feriados'),imp_hist:telaHist};
const _menu4=menu;
menu=function(){_menu4();const m=$('#menu');
 const h=[...m.querySelectorAll('h4')].find(x=>x.textContent==='Em breve');
 if(h)h.insertAdjacentHTML('beforebegin','<h4>Importações</h4><button class="nav" data-v="imp_feriados">Importar feriados</button><button class="nav" data-v="imp_hist">Histórico de importações</button>');
 m.querySelectorAll('.nav').forEach(n=>{const o=n.onclick;n.onclick=()=>{const f=TELAS[n.dataset.v];f?f():(o&&o())}})};
