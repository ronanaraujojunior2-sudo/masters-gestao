/* MASTERS GESTÃO - Módulo 3B-5: importar solicitações de materiais.
   Arquivo independente: não depende de outros módulos de importação. Carregar POR ÚLTIMO (abaixo dos outros scripts). */
(function(){
if(!window.XLSX&&!document.querySelector('script[data-xls]')){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.setAttribute('data-xls','1');document.head.appendChild(s)}

const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\*/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const dsc=s=>String(s==null?'':s).toLowerCase().trim().replace(/\s+/g,' ');
const vz=v=>String(v==null?'':v).trim()==='';
const fdt=d=>new Date(d+'T00:00').toLocaleDateString('pt-BR');
const num=v=>{if(typeof v==='number')return v;const s=String(v==null?'':v).trim().replace(/\s/g,'');if(!s)return NaN;
 const t=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;return /^\d+(\.\d+)?$/.test(t)?Number(t):NaN};

function parseData(v){let y,m,d;
 if(typeof v==='number'){const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const s=String(v||'').trim();let k=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if(k){d=+k[1];m=+k[2];y=+k[3]}else{k=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!k)return null;y=+k[1];m=+k[2];d=+k[3]}}
 const t=new Date(Date.UTC(y,m-1,d));
 if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d||y<2000||y>2100)return null;
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}

const COLS=[
 {k:'requisicao',h:'Requisição Sienge',req:1,como:'Número da requisição gerado pelo Sienge. Repita o mesmo número em todas as linhas dos materiais dessa requisição.',ex:'(número do Sienge)'},
 {k:'obra',h:'Obra',req:1,como:'Nome ou código de uma obra já cadastrada no sistema.',ex:'(obra cadastrada)'},
 {k:'solicitante',h:'Solicitante',req:0,como:'Nome ou matrícula de um funcionário da obra. Se não for encontrado, a requisição entra sem solicitante e o nome vai para a observação.',ex:'(nome ou matrícula)'},
 {k:'data',h:'Data da solicitação',req:1,como:'Data da solicitação, no formato dia/mês/ano.',ex:'09/11/2026'},
 {k:'aprovacao',h:'Data da aprovação',req:0,como:'Dia/mês/ano. Preencha se o gestor já aprovou a requisição no Sienge. Em branco, entra como “Aguardando aprovação”.',ex:'10/11/2026'},
 {k:'codigo',h:'Código do material',req:0,como:'Código do material, se houver. Se já existir no sistema, o material existente é usado.',ex:'(opcional)'},
 {k:'descricao',h:'Descrição do material',req:1,como:'Descrição do material como está na requisição. Não precisa estar cadastrado antes.',ex:'(descrição do material)'},
 {k:'unidade',h:'Unidade',req:1,como:'Como o material é contado: m, un, cx, kg...',ex:'m'},
 {k:'quantidade',h:'Quantidade',req:1,como:'Número maior que zero. Pode usar vírgula nos decimais.',ex:'10,5'},
 {k:'obs',h:'Observação',req:0,como:'Observação da requisição. Basta preencher em uma das linhas.',ex:'(opcional)'}];
const NOTAS=['Preencha somente a aba “Modelo”, a partir da linha 2. Não altere os nomes das colunas.','Uma linha por material. Repita o número da requisição e os dados da requisição (obra, solicitante, datas) em todas as linhas dela.','Requisições já cadastradas são ignoradas. Nada é sobrescrito nem apagado.','Materiais que ainda não existem são cadastrados automaticamente em Materiais. Isso não cria estoque.','Até 2000 linhas por arquivo.'];
const ARQ='modelo-solicitacoes';

function modelo(tipo){const H=COLS.map(k=>k.h);
 if(tipo==='csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+H.join(';')+'\r\n'],{type:'text/csv;charset=utf-8'}));a.download=ARQ+'.csv';a.click();return}
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 const wb=XLSX.utils.book_new(),w1=XLSX.utils.aoa_to_sheet([H]);w1['!cols']=H.map(()=>({wch:26}));XLSX.utils.book_append_sheet(wb,w1,'Modelo');
 const w2=XLSX.utils.aoa_to_sheet([['Coluna','Obrigatória?','Como preencher','Exemplo'],...COLS.map(k=>[k.h,k.req?'Sim':'Não',k.como,k.ex]),[],...NOTAS.map(n=>[n])]);
 w2['!cols']=[{wch:26},{wch:14},{wch:80},{wch:28}];XLSX.utils.book_append_sheet(wb,w2,'Instruções');XLSX.writeFile(wb,ARQ+'.xlsx')}

function csv(t){const L=t.replace(/^\uFEFF/,'').split(/\r?\n/);const f=L[0]||'';const d=f.split(';').length>=f.split(',').length?';':',';
 return L.filter(x=>x.trim()!=='').map(l=>{const o=[];let c='',q=false;
  for(let i=0;i<l.length;i++){const h=l[i];if(q){if(h==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===d){o.push(c);c=''}else c+=h}
  o.push(c);return o})}
async function ler(file){const n=file.name.toLowerCase();let arr;
 if(n.endsWith('.csv')){const b=await file.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}arr=csv(t)}
 else if(n.endsWith('.xlsx')){const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const ws=wb.Sheets['Modelo']||wb.Sheets[wb.SheetNames[0]];arr=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''})}
 else throw new Error('Use um arquivo .xlsx ou .csv.');
 if(!arr.length)throw new Error('O arquivo está vazio.');
 const H=arr[0].map(nz),pos={};COLS.forEach(k=>{pos[k.k]=H.indexOf(nz(k.h))});
 const falt=COLS.filter(k=>k.req&&pos[k.k]<0).map(k=>k.h);
 if(falt.length)throw new Error('Faltam colunas obrigatórias no arquivo: '+falt.join(', ')+'. Baixe o modelo de novo e preencha a aba Modelo.');
 const rows=[];arr.slice(1).forEach((l,i)=>{const v={};COLS.forEach(k=>v[k.k]=pos[k.k]<0?'':l[pos[k.k]]);if(Object.values(v).some(x=>String(x).trim()!==''))rows.push({linha:i+2,v})});
 if(!rows.length)throw new Error('Não há linhas preenchidas abaixo do cabeçalho.');
 if(rows.length>2000)throw new Error('O arquivo tem mais de 2000 linhas. Divida em arquivos menores.');
 return rows}

async function lerTudo(t,c){let a=[],i=0;for(;;){const{data,error}=await sb.from(t).select(c).order('id').range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function contexto(){const[ob,fu,ma,so]=await Promise.all([lerTudo('obras','id,nome,codigo'),lerTudo('funcionarios','id,nome,matricula,obra_id'),lerTudo('materiais','id,codigo,descricao,unidade'),lerTudo('solicitacoes','id,numero_sienge')]);
 return{obras:ob,func:fu,mat:ma,exist:new Set(so.filter(s=>s.numero_sienge).map(s=>nz(s.numero_sienge)))}}

function reqSol(g,x){const L=g.rows,n=g.n,ls=L.map(r=>r.linha).join(', ');
 const base={linha:L[0].linha,resumo:'Requisição '+n+' (linha'+(L.length>1?'s ':' ')+ls+')'};
 const rej=m=>({...base,estado:'rej',motivo:m});
 if(x.exist.has(nz(n)))return{...base,estado:'ign',motivo:'Requisição já cadastrada no sistema.'};
 const H={};
 for(const[c,nm] of [['obra','Obra'],['solicitante','Solicitante'],['data','Data da solicitação'],['aprovacao','Data da aprovação']]){
  const vs=L.filter(r=>!vz(r.v[c]));H[c]=vs.length?vs[0].v[c]:null;
  const val=r=>(c==='data'||c==='aprovacao')?(parseData(r.v[c])||String(r.v[c])):nz(r.v[c]);
  const d=vs.find(r=>val(r)!==val(vs[0]));
  if(d)return rej(nm+' diferente entre as linhas '+vs[0].linha+' e '+d.linha+'. Os dados da requisição devem ser iguais em todas as linhas.')}
 const ob=String(H.obra==null?'':H.obra).trim();if(!ob)return rej('Obra não informada.');
 const f=x.obras.find(a=>nz(a.nome)===nz(ob)||nz(a.codigo)===nz(ob));if(!f)return rej('Obra "'+ob+'" não encontrada no sistema.');
 if(H.data==null)return rej('Data da solicitação não informada.');
 const d1=parseData(H.data);if(!d1)return rej('Data da solicitação inválida. Use dia/mês/ano.');
 let ap=null;if(H.aprovacao!=null){ap=parseData(H.aprovacao);if(!ap)return rej('Data da aprovação inválida. Use dia/mês/ano.');if(ap<d1)return rej('A data da aprovação é anterior à data da solicitação.')}
 const avisos=[];let solId=null,obs=(L.find(r=>!vz(r.v.obs))||{v:{}}).v.obs;obs=vz(obs)?'':String(obs).trim();
 const sn=String(H.solicitante==null?'':H.solicitante).trim();
 if(sn){const s=x.func.find(a=>a.obra_id===f.id&&(nz(a.matricula)===nz(sn)||nz(a.nome)===nz(sn)));
  if(s)solId=s.id;else{avisos.push('Solicitante "'+sn+'" não encontrado nesta obra: a requisição entra sem solicitante e o nome vai para a observação.');obs=(obs?obs+' — ':'')+'Solicitante informado na importação: '+sn}}
 const itens=[],vd=new Map(),vc=new Map();let novos=0;
 for(const r of L){const v=r.v,d=String(v.descricao==null?'':v.descricao).trim().replace(/\s+/g,' '),u=String(v.unidade==null?'':v.unidade).trim(),q=num(v.quantidade),cod=String(v.codigo==null?'':v.codigo).trim();
  if(!d)return rej('Linha '+r.linha+': descrição do material não informada.');
  if(!u)return rej('Linha '+r.linha+': unidade não informada.');
  if(!(q>0))return rej('Linha '+r.linha+': quantidade inválida (use um número maior que zero).');
  const kd=dsc(d)+'|'+dsc(u);
  if(vd.has(kd))return rej('Material repetido nas linhas '+vd.get(kd)+' e '+r.linha+'. Some as quantidades em uma linha ou corrija a descrição.');
  if(cod&&vc.has(nz(cod)))return rej('Código de material repetido nas linhas '+vc.get(nz(cod))+' e '+r.linha+'.');
  vd.set(kd,r.linha);if(cod)vc.set(nz(cod),r.linha);
  let m=cod?x.mat.find(a=>nz(a.codigo)===nz(cod)):null;
  if(!m)m=x.mat.find(a=>dsc(a.descricao)===dsc(d)&&dsc(a.unidade)===dsc(u));
  if(m){if(cod&&(dsc(m.descricao)!==dsc(d)||dsc(m.unidade)!==dsc(u)))avisos.push('Código '+cod+' já existe como "'+m.descricao+'" ('+m.unidade+'): será usado esse material (linha '+r.linha+').')}
  else novos++;
  itens.push({codigo:cod||null,descricao:d,unidade:u,quantidade:q})}
 return{...base,resumo:'Requisição '+n+' — '+f.nome+' — '+itens.length+' item(ns)'+(novos?' ('+novos+' material(is) novo(s) em Materiais)':'')+(ap?' — aprovada em '+fdt(ap):''),
  estado:'novo',motivo:avisos.length?'ATENÇÃO: '+avisos.join(' '):'',
  payload:{linha:L[0].linha,obra_id:f.id,solicitante_id:solId,data:d1,aprovacao:ap,numero:n,obs:obs||null,itens}}}

function validar(rows,x){const out=[],G=new Map();
 rows.forEach(r=>{const n=vz(r.v.requisicao)?'':String(r.v.requisicao).trim();
  if(!n){out.push({linha:r.linha,resumo:'Linha '+r.linha,estado:'rej',motivo:'Número da requisição não informado.'});return}
  const k=nz(n);if(!G.has(k))G.set(k,{n,rows:[]});G.get(k).rows.push(r)});
 G.forEach(g=>out.push(reqSol(g,x)));
 return out.sort((a,b)=>a.linha-b.linha)}

const lista=(t,L)=>L&&L.length?'<h3>'+t+'</h3>'+L.map(x=>`<div class="mv">Linha ${x.linha}: ${esc(x.motivo)}</div>`).join(''):'';
const relatorio=d=>`<div class="kpis"><div class="card kpi"><b>${d.importados}</b>Requisições importadas</div><div class="card kpi"><b>${d.itens||0}</b>Itens importados</div><div class="card kpi"><b>${d.ignorados}</b>Ignoradas</div><div class="card kpi al"><b>${d.rejeitados}</b>Rejeitadas</div></div>`+lista('Requisições ignoradas',d.detalhes.ignorados)+lista('Requisições rejeitadas',d.detalhes.rejeitados);

function tela(){cur='imp_solic';mark();const v=$('#view');
 v.innerHTML=`<h1>Importar solicitações de materiais</h1><p class="sub">Siga os 4 passos. Nada é gravado antes da sua confirmação.</p>
 <div class="card"><h3 style="margin-top:0">Passo 1: baixe o modelo</h3><p class="hint">Abra no Excel, leia a aba “Instruções” e preencha a aba “Modelo”. Uma linha para cada material.</p><button class="btn" id="sx_m">Baixar modelo (Excel)</button> <button class="sec" id="sx_c">Baixar modelo (CSV)</button></div>
 <div class="card" style="margin-top:12px"><h3 style="margin-top:0">Passo 2: escolha o arquivo preenchido</h3><input id="sx_f" type="file" accept=".xlsx,.csv"></div><div id="sx_r" style="margin-top:12px"></div>`;
 $('#sx_m').onclick=()=>modelo();$('#sx_c').onclick=()=>modelo('csv');$('#sx_f').onchange=e=>processar(e.target.files[0])}

async function processar(file){const R=$('#sx_r');if(!file)return;
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 R.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{const rows=await ler(file),x=await contexto(),res=validar(rows,x);
  const N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej'),AV=N.filter(a=>a.motivo).length;
  const lb={novo:'Nova',ign:'Ignorada',rej:'Rejeitada'},cl={novo:'blue',ign:'',rej:'red'};
  R.innerHTML=`<div class="card"><h3 style="margin-top:0">Passo 3: confira a prévia</h3><p>Arquivo: <b>${esc(file.name)}</b> — ${rows.length} linha(s) lida(s), ${res.length} requisição(ões)</p>
  <div class="kpis"><div class="card kpi"><b>${N.length}</b>Novas</div><div class="card kpi"><b>${I.length}</b>Ignoradas</div><div class="card kpi al"><b>${J.length}</b>Rejeitadas</div></div>
  <div class="wrap" style="max-height:380px;overflow:auto"><table style="min-width:560px"><thead><tr><th>Linha</th><th>Requisição</th><th>Situação</th><th>Motivo ou aviso</th></tr></thead><tbody>${res.slice(0,500).map(a=>`<tr><td>${a.linha}</td><td>${esc(a.resumo)}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${esc(a.motivo||'')}</td></tr>`).join('')}</tbody></table></div>${res.length>500?'<p class="hint">Mostrando as 500 primeiras. A importação considera todas.</p>':''}
  ${AV?`<label style="display:flex;gap:10px;align-items:center;margin-top:12px"><input type="checkbox" id="sx_av" style="width:24px;min-height:24px"><span><b>${AV} requisição(ões) com ATENÇÃO.</b> Li os avisos na prévia e confirmo a importação.</span></label>`:''}
  <div class="err hide" id="sx_e"></div><div class="acts"><button class="sec" id="sx_x">Cancelar</button><button class="btn" id="sx_ok" ${N.length&&!AV?'':'disabled'}>Passo 4: importar ${N.length} requisição(ões) nova(s)</button></div></div>`;
  $('#sx_x').onclick=()=>{R.innerHTML='';$('#sx_f').value=''};
  if(AV)$('#sx_av').onchange=e=>{$('#sx_ok').disabled=!e.target.checked||!N.length};
  $('#sx_ok').onclick=async()=>{
   if(!confirm('Importar '+N.length+' requisição(ões) nova(s)?\n'+I.length+' serão ignoradas e '+J.length+' rejeitadas.'))return;
   const b=$('#sx_ok');b.disabled=true;
   const{data,error}=await sb.rpc('importar_solicitacoes',{p_arquivo:file.name,p_dados:N.map(a=>a.payload),p_rejeitados:J.map(a=>({linha:a.linha,motivo:a.motivo})),p_ignorados:I.map(a=>({linha:a.linha,motivo:a.motivo}))});
   if(error){b.disabled=false;const e=$('#sx_e');e.textContent=msg(error);e.classList.remove('hide');return}
   cache={};R.innerHTML='<div class="card"><h3 style="margin-top:0">Resultado da importação</h3>'+relatorio(data)+'<p class="hint">Confira em “Solicitações e pedidos”. Os materiais novos estão em “Materiais”, marcados para conferência.</p></div>';toast('Importação concluída.')}
 }catch(e){R.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}

const _m=menu;
menu=function(){_m();if(me&&me.perfil==='FUNCIONARIO')return;const m=$('#menu');if(!m||m.querySelector('[data-v="imp_solic"]'))return;
 const btn='<button class="nav" data-v="imp_solic">Importar solicitações</button>';
 const hs=[...m.querySelectorAll('h4')],imp=hs.find(x=>x.textContent==='Importações');
 if(imp){let n=imp.nextElementSibling;while(n&&n.tagName!=='H4')n=n.nextElementSibling;
  if(n)n.insertAdjacentHTML('beforebegin',btn);else m.insertAdjacentHTML('beforeend',btn)}
 else{const h=hs.find(x=>x.textContent==='Em breve');
  if(h)h.insertAdjacentHTML('beforebegin','<h4>Importações</h4>'+btn);else m.insertAdjacentHTML('beforeend','<h4>Importações</h4>'+btn)}
 m.querySelector('[data-v="imp_solic"]').onclick=tela};

window.__impSolicTeste={ler,validar,parseData,num};
})();
