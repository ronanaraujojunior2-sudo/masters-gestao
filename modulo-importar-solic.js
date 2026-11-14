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
const NOTAS=['Preencha somente a aba “Modelo”, a partir da linha 2. Não altere os nomes das colunas.','Uma linha por material. Repita o número da requisição e os dados da requisição (obra, solicitante, datas) em todas as linhas dela.','Requisições já cadastradas são ignoradas. Nada é sobrescrito nem apagado.','Materiais que ainda não existem são cadastrados automaticamente em Materiais. Isso não cria estoque.','Até 2000 linhas por arquivo.','Você também pode importar direto o relatório “Solicitações de Compra” do Sienge, sem usar este modelo.'];
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
const ROT=['solicitacao','data da solicitacao','data da ultima autorizacao','obra','solicitante','observacoes','insumo'];
function achaSienge(arr,arq){
 let hi=-1;for(let i=0;i<Math.min(arr.length,60);i++){if((arr[i]||[]).some(c=>nz(c)==='insumo')){hi=i;break}}
 if(hi<0)return null;
 const val=lab=>{for(let i=0;i<arr.length;i++){const r=arr[i]||[];for(let j=0;j<r.length;j++){if(nz(r[j])===lab){
   for(let k=j+1;k<r.length;k++){if(vz(r[k]))continue;return ROT.includes(nz(r[k]))?'':r[k]}return ''}}}return ''};
 const H=(arr[hi]||[]).map(nz),pos=n=>H.indexOf(n);
 const pI=pos('insumo'),pA=pos('autorizacao'),pU=pos('und.'),pQ=pos('qtd. prevista');
 if(pU<0||pQ<0)throw new Error('Relatório do Sienge sem as colunas "Und." e "Qtd. prevista".');
 const cab={requisicao:val('solicitacao'),obra:val('obra'),solicitante:val('solicitante'),data:val('data da solicitacao'),obs:val('observacoes')},ult=val('data da ultima autorizacao');
 const its=[];for(let i=hi+1;i<arr.length;i++){const r=arr[i]||[];if(vz(r[pI]))break;its.push({i,r})}
 if(!its.length)throw new Error('Não encontrei materiais abaixo da coluna "Insumo".');
 const nao=its.filter(t=>pA>=0&&nz(t.r[pA])!=='sim');
 const avisos=[];let ap='';
 if(nao.length)avisos.push('Há itens sem autorização "Sim" no Sienge (linhas '+nao.map(t=>t.i+1).join(', ')+'): a requisição entra como aguardando aprovação.');
 else if(vz(ult))avisos.push('Os itens constam como autorizados, mas não há "Data da última autorização": a requisição entra como aguardando aprovação.');
 else ap=ult;
 const rows=its.map((t,n)=>{const ins=String(t.r[pI]).trim(),m=ins.match(/^(\S+)\s+-\s+(.+)$/);
  return{linha:t.i+1,arq,avisos:n===0?avisos:[],v:{...cab,aprovacao:ap,codigo:m?m[1]:'',descricao:m?m[2]:ins,unidade:t.r[pU],quantidade:t.r[pQ]}}});
 const ob=String(cab.obra==null?'':cab.obra).trim(),m2=ob.match(/^(\S+)\s+-\s+(.+)$/);
 rows.forEach(r=>{r.v.obraCodigo=m2?m2[1]:'';r.v.obraNome=m2?m2[2]:ob});
 return rows}

async function ler(file){const n=file.name.toLowerCase();let arr,wbs=null;
 if(n.endsWith('.csv')){const b=await file.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}arr=csv(t)}
 else if(n.endsWith('.xlsx')){const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});wbs=wb.SheetNames.map(k=>XLSX.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:''}));
  const mi=wb.SheetNames.indexOf('Modelo');arr=wbs[mi>=0?mi:0]}
 else throw new Error('Use um arquivo .xlsx ou .csv.');
 for(const a of (wbs||[arr])){const sg=achaSienge(a,file.name);if(sg)return sg}
 if(!arr||!arr.length)throw new Error('O arquivo está vazio.');
 const H=arr[0].map(nz),pos={};COLS.forEach(k=>{pos[k.k]=H.indexOf(nz(k.h))});
 const falt=COLS.filter(k=>k.req&&pos[k.k]<0).map(k=>k.h);
 if(falt.length)throw new Error('Arquivo não reconhecido. Use o relatório "Solicitações de Compra" do Sienge ou o modelo do sistema (faltam as colunas: '+falt.join(', ')+').');
 const rows=[];arr.slice(1).forEach((l,i)=>{const v={};COLS.forEach(k=>v[k.k]=pos[k.k]<0?'':l[pos[k.k]]);if(Object.values(v).some(x=>String(x).trim()!==''))rows.push({linha:i+2,arq:file.name,v})});
 if(!rows.length)throw new Error('Não há linhas preenchidas abaixo do cabeçalho.');
 if(rows.length>2000)throw new Error('O arquivo tem mais de 2000 linhas. Divida em arquivos menores.');
 return rows}

async function lerTudo(t,c){let a=[],i=0;for(;;){const{data,error}=await sb.from(t).select(c).order('id').range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function contexto(){const[ob,fu,ma,so]=await Promise.all([lerTudo('obras','id,nome,codigo'),lerTudo('funcionarios','id,nome,matricula,obra_id'),lerTudo('materiais','id,codigo,descricao,unidade'),lerTudo('solicitacoes','id,numero_sienge')]);
 return{obras:ob,func:fu,mat:ma,exist:new Set(so.filter(s=>s.numero_sienge).map(s=>nz(s.numero_sienge)))}}

function reqSol(g,x){const L=g.rows,n=g.n,ls=L.map(r=>r.linha).join(', '),arq=L[0].arq&&x.multi?' · '+L[0].arq:'';
 const base={linha:L[0].linha,num:n,arq:L[0].arq,resumo:'Requisição '+n+arq+' (linha'+(L.length>1?'s ':' ')+ls+')'};
 const rej=m=>({...base,estado:'rej',motivo:m});
 if(x.exist.has(nz(n)))return{...base,estado:'ign',motivo:'Requisição já cadastrada no sistema.'};
 const H={};
 for(const[c,nm] of [['obra','Obra'],['solicitante','Solicitante'],['data','Data da solicitação'],['aprovacao','Data da aprovação']]){
  const vs=L.filter(r=>!vz(r.v[c]));H[c]=vs.length?vs[0].v[c]:null;
  const val=r=>(c==='data'||c==='aprovacao')?(parseData(r.v[c])||String(r.v[c])):nz(r.v[c]);
  const d=vs.find(r=>val(r)!==val(vs[0]));
  if(d)return rej(nm+' diferente entre as linhas '+vs[0].linha+' e '+d.linha+'. Os dados da requisição devem ser iguais em todas as linhas.')}
 const ob=String(H.obra==null?'':H.obra).trim();if(!ob)return rej('Obra não informada.');
 const r0=L[0].v,tent=[ob,r0.obraNome,r0.obraCodigo].filter(t=>!vz(t)).map(nz);
 const f=x.obras.find(a=>tent.includes(nz(a.nome))||tent.includes(nz(a.codigo)));
 if(!f)return rej('Obra "'+ob+'" não encontrada no sistema. Cadastre a obra em Cadastros → Obras com o mesmo nome'+(r0.obraCodigo?' (ou código '+r0.obraCodigo+')':'')+' e importe de novo.');
 if(H.data==null)return rej('Data da solicitação não informada.');
 const d1=parseData(H.data);if(!d1)return rej('Data da solicitação inválida. Use dia/mês/ano.');
 let ap=null;if(H.aprovacao!=null){ap=parseData(H.aprovacao);if(!ap)return rej('Data da aprovação inválida. Use dia/mês/ano.');if(ap<d1)return rej('A data da aprovação é anterior à data da solicitação.')}
 const avisos=[];L.forEach(r=>(r.avisos||[]).forEach(a=>avisos.push(a)));
 let solId=null,obs=(L.find(r=>!vz(r.v.obs))||{v:{}}).v.obs;obs=vz(obs)?'':String(obs).trim();
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
  vd.set(kd,r.linha);
  let cc=cod||null;const pm=cod?x.mat.find(a=>nz(a.codigo)===nz(cod)):null;
  if(cc&&pm&&!(dsc(pm.descricao)===dsc(d)&&dsc(pm.unidade)===dsc(u))){avisos.push('Código '+cod+' já existe em Materiais como "'+pm.descricao+'" ('+pm.unidade+'): "'+d+'" ('+u+') será cadastrado como outro material, com código automático (linha '+r.linha+').');cc=null}
  else if(cc&&vc.has(nz(cc))){avisos.push('O código '+cod+' aparece em mais de um material desta requisição (linhas '+vc.get(nz(cc))+' e '+r.linha+'): o material da linha '+r.linha+' será cadastrado com código automático.');cc=null}
  if(cc)vc.set(nz(cc),r.linha);
  const m=(cc&&pm)?pm:x.mat.find(a=>dsc(a.descricao)===dsc(d)&&dsc(a.unidade)===dsc(u));
  if(!m)novos++;
  itens.push({codigo:cc,descricao:d,unidade:u,quantidade:q})}
 return{...base,resumo:'Requisição '+n+arq+' — '+f.nome+' — '+itens.length+' item(ns)'+(novos?' ('+novos+' material(is) novo(s) em Materiais)':'')+(ap?' — aprovada em '+fdt(ap):''),
  estado:'novo',motivo:avisos.length?'ATENÇÃO: '+avisos.join(' '):'',
  payload:{linha:L[0].linha,obra_id:f.id,solicitante_id:solId,data:d1,aprovacao:ap,numero:n,obs:obs||null,itens}}}

function validar(rows,x){const out=[],G=new Map();
 rows.forEach(r=>{const n=vz(r.v.requisicao)?'':String(r.v.requisicao).trim();
  if(!n){out.push({linha:r.linha,arq:r.arq,resumo:'Linha '+r.linha+(x.multi&&r.arq?' · '+r.arq:''),estado:'rej',motivo:'Número da requisição não informado.'});return}
  const k=(r.arq||'')+'|'+nz(n);if(!G.has(k))G.set(k,{n,rows:[]});G.get(k).rows.push(r)});
 const vis=new Map();
 G.forEach(g=>{const o=reqSol(g,x);
  if(o.estado==='novo'){const k=nz(g.n);if(vis.has(k)){o.estado='rej';o.motivo='O mesmo número de requisição aparece também no arquivo "'+vis.get(k)+'". Importe só uma vez.';delete o.payload}else vis.set(k,g.rows[0].arq)}
  out.push(o)});
 return out.sort((a,b)=>(a.arq||'').localeCompare(b.arq||'')||a.linha-b.linha)}

const lista=(t,L)=>L&&L.length?'<h3>'+t+'</h3>'+L.map(x=>`<div class="mv">${/^Requisição/.test(x.motivo||'')?'':'Linha '+x.linha+': '}${esc(x.motivo)}</div>`).join(''):'';
const relatorio=d=>`<div class="kpis"><div class="card kpi"><b>${d.importados}</b>Requisições importadas</div><div class="card kpi"><b>${d.itens||0}</b>Itens importados</div><div class="card kpi"><b>${d.ignorados}</b>Ignoradas</div><div class="card kpi al"><b>${d.rejeitados}</b>Rejeitadas</div></div>`+lista('Requisições ignoradas',d.detalhes.ignorados)+lista('Requisições rejeitadas',d.detalhes.rejeitados);

function tela(){cur='imp_solic';mark();const v=$('#view');
 v.innerHTML=`<h1>Importar solicitações de materiais</h1><p class="sub">Nada é gravado antes da sua confirmação.</p>
 <div class="card"><h3 style="margin-top:0">Passo 1: escolha o arquivo</h3>
 <p><b>Opção A (mais fácil):</b> o relatório <b>“Solicitações de Compra”</b> exportado do Sienge, do jeito que ele sai. Você pode escolher <b>vários arquivos de uma vez</b>, um por requisição.</p>
 <p><b>Opção B:</b> a planilha modelo do sistema, com várias requisições. <button class="mini" id="sx_m">Baixar modelo (Excel)</button> <button class="mini" id="sx_c">Baixar modelo (CSV)</button></p>
 <input id="sx_f" type="file" accept=".xlsx,.csv" multiple></div><div id="sx_r" style="margin-top:12px"></div>`;
 $('#sx_m').onclick=()=>modelo();$('#sx_c').onclick=()=>modelo('csv');$('#sx_f').onchange=e=>processar([...e.target.files])}

async function processar(files){const R=$('#sx_r');if(!files||!files.length)return;
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 R.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{let rows=[];const falhas=[];
  for(const f of files){try{rows=rows.concat(await ler(f))}catch(e){falhas.push({linha:0,arq:f.name,resumo:'Arquivo '+f.name,estado:'rej',motivo:e.message||String(e)})}}
  const x=await contexto();x.multi=files.length>1;
  const res=validar(rows,x).concat(falhas);
  const N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej'),AV=N.filter(a=>a.motivo).length;
  const lb={novo:'Nova',ign:'Ignorada',rej:'Rejeitada'},cl={novo:'blue',ign:'',rej:'red'};
  const env=a=>({linha:a.linha,motivo:(a.num&&!/^Requisição/.test(a.motivo)?'Requisição '+a.num+': ':'')+(a.arq&&files.length>1?'['+a.arq+'] ':'')+a.motivo});
  R.innerHTML=`<div class="card"><h3 style="margin-top:0">Passo 2: confira a prévia</h3><p>${files.length} arquivo(s) — ${res.length} requisição(ões) encontrada(s)</p>
  <div class="kpis"><div class="card kpi"><b>${N.length}</b>Novas</div><div class="card kpi"><b>${I.length}</b>Ignoradas</div><div class="card kpi al"><b>${J.length}</b>Rejeitadas</div></div>
  <div class="wrap" style="max-height:380px;overflow:auto"><table style="min-width:560px"><thead><tr><th>Requisição</th><th>Situação</th><th>Motivo ou aviso</th></tr></thead><tbody>${res.slice(0,500).map(a=>`<tr><td>${esc(a.resumo)}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${esc(a.motivo||'')}</td></tr>`).join('')}</tbody></table></div>${res.length>500?'<p class="hint">Mostrando as 500 primeiras. A importação considera todas.</p>':''}
  ${AV?`<label style="display:flex;gap:10px;align-items:center;margin-top:12px"><input type="checkbox" id="sx_av" style="width:24px;min-height:24px"><span><b>${AV} requisição(ões) com ATENÇÃO.</b> Li os avisos na prévia e confirmo a importação.</span></label>`:''}
  <div class="err hide" id="sx_e"></div><div class="acts"><button class="sec" id="sx_x">Cancelar</button><button class="btn" id="sx_ok" ${N.length&&!AV?'':'disabled'}>Passo 3: importar ${N.length} requisição(ões) nova(s)</button></div></div>`;
  $('#sx_x').onclick=()=>{R.innerHTML='';$('#sx_f').value=''};
  if(AV)$('#sx_av').onchange=e=>{$('#sx_ok').disabled=!e.target.checked||!N.length};
  $('#sx_ok').onclick=async()=>{
   if(!confirm('Importar '+N.length+' requisição(ões) nova(s)?\n'+I.length+' serão ignoradas e '+J.length+' rejeitadas.'))return;
   const b=$('#sx_ok');b.disabled=true;
