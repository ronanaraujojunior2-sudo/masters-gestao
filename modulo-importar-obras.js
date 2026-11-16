/* MASTERS GESTÃO - Módulo 3B-10: Importar Obras do Sienge.
   Antes de usar, rode no Supabase o SQL 10_obras_sienge.
   Botão "Importar Obras do Sienge" na tela Obras (somente administrador).
   O código da obra no Sienge é a chave. Obras já cadastradas só recebem os campos mostrados na prévia e confirmados.
   Nada é apagado; campo vazio no arquivo nunca apaga o que já existe. */
try{(function(){
if(!window.XLSX&&!document.querySelector('script[data-xls]')){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.setAttribute('data-xls','1');document.head.appendChild(s)}

const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').toLowerCase().replace(/\s+/g,' ').trim();
const vz=v=>String(v==null?'':v).trim()==='';
const fd=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'';
const adm=()=>!!me&&me.perfil==='MASTERS';

/* campos do cadastro e os nomes de coluna que o Sienge (ou planilhas parecidas) costuma usar */
const CAMPOS=[
 {k:'codigo',r:'Código da obra no Sienge',s:['codigo','cod','cod obra','codigo obra','codigo da obra','codigo sienge','cod sienge','codigo da obra no sienge','numero da obra','numero obra','n obra','id obra','id da obra']},
 {k:'nome',r:'Nome da obra',s:['nome','nome da obra','nome obra','obra','descricao','descricao da obra','nome do empreendimento','empreendimento']},
 {k:'razao_social',r:'Razão social / cliente',s:['razao social','razao social cliente','cliente','nome do cliente','empresa','contratante','proprietario','razao social da empresa','nome da empresa']},
 {k:'endereco',r:'Endereço',s:['endereco','logradouro','endereco da obra','local','local da obra']},
 {k:'_numero',r:'Número (junta ao endereço)',s:['numero','n','no','num']},
 {k:'_bairro',r:'Bairro (junta ao endereço)',s:['bairro']},
 {k:'cidade',r:'Cidade',s:['cidade','municipio']},
 {k:'estado',r:'Estado',s:['estado','uf']},
 {k:'cnpj',r:'CNPJ',s:['cnpj','cnpj da obra','cnpj cpf','cpf cnpj','cnpj do cliente','cnpj cliente','cnpj da empresa']},
 {k:'situacao_sienge',r:'Situação da obra',s:['situacao','situacao da obra','situacao obra','status','status da obra']},
 {k:'data_inicio',r:'Data de início',s:['data inicio','data de inicio','inicio','dt inicio','inicio da obra','data de inicio da obra','data inicial','data do inicio']},
 {k:'data_termino',r:'Data de término',s:['data termino','data de termino','termino','dt termino','termino previsto','previsao de termino','data prevista de termino','data fim','fim','data final','data do termino','data de termino prevista']}];
const ROT=Object.fromEntries(CAMPOS.map(c=>[c.k,c.r]));
ROT.status='Status no sistema';ROT.dados_sienge='Outras informações do arquivo';
const UFS={acre:'AC',alagoas:'AL',amapa:'AP',amazonas:'AM',bahia:'BA',ceara:'CE','distrito federal':'DF','espirito santo':'ES',goias:'GO',maranhao:'MA','mato grosso':'MT','mato grosso do sul':'MS','minas gerais':'MG',para:'PA',paraiba:'PB',parana:'PR',pernambuco:'PE',piaui:'PI','rio de janeiro':'RJ','rio grande do norte':'RN','rio grande do sul':'RS',rondonia:'RO',roraima:'RR','santa catarina':'SC','sao paulo':'SP',sergipe:'SE',tocantins:'TO'};
const SIGLAS=new Set(Object.values(UFS));

/* ---------- leitura do arquivo ---------- */
function csv(t){const L=t.replace(/^﻿/,'').split(/\r?\n/);const f=L[0]||'';const d=f.split(';').length>=f.split(',').length?';':',';
 return L.filter(x=>x.trim()!=='').map(l=>{const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const h=l[i];if(q){if(h==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===d){o.push(c);c=''}else c+=h}o.push(c);return o})}
async function matriz(f){const n=f.name.toLowerCase();
 if(n.endsWith('.csv')){const b=await f.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}return csv(t)}
 if(n.endsWith('.xlsx')||n.endsWith('.xls')){if(!window.XLSX)throw new Error('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});let best=null;
  wb.SheetNames.forEach(nm=>{const a=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:true,defval:''});if(!best||a.length>best.length)best=a});
  return best||[]}
 throw new Error('Use o arquivo exportado pelo Sienge em .xlsx, .xls ou .csv.')}

/* acha a linha de cabeçalho: a que mais reconhece nomes de coluna, com código e nome (ou "Obra" com código junto do nome) */
function cabecalho(arr){let melhor=null;
 for(let i=0;i<Math.min(arr.length,60);i++){const H=(arr[i]||[]).map(nz),pos={},usados=new Set();
  CAMPOS.forEach(c=>{const j=H.findIndex((h,x)=>!usados.has(x)&&h&&c.s.includes(h));if(j>=0){pos[c.k]=j;usados.add(j)}});
  const sc=Object.keys(pos).length;
  if((pos.codigo!=null&&pos.nome!=null)||(pos.nome!=null&&H[pos.nome]==='obra'&&sc>=2)){if(!melhor||sc>melhor.sc)melhor={i,pos,sc,H}}}
 return melhor}

const tx=v=>v instanceof Date?'':String(v==null?'':v).trim().replace(/\s+/g,' ');
const cod=v=>{if(typeof v==='number')return Number.isInteger(v)?String(v):String(v);return tx(v)};
function parseData(v){let y,m,d;
 if(v instanceof Date){y=v.getUTCFullYear();m=v.getUTCMonth()+1;d=v.getUTCDate()}
 else if(typeof v==='number'){const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const s=String(v||'').trim();let k=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);if(k){d=+k[1];m=+k[2];y=+k[3]}else{k=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!k)return null;y=+k[1];m=+k[2];d=+k[3]}}
 const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d||y<1990||y>2100)return null;
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function cnpjOk(s){const d=String(s).replace(/\D/g,'');if(d.length!==14||/^(\d)\1+$/.test(d))return null;
 const dv=n=>{let p=n-7,t=0;for(let i=0;i<n;i++){t+=+d[i]*p--;if(p<2)p=9}const r=t%11;return r<2?0:11-r};
 if(dv(12)!==+d[12]||dv(13)!==+d[13])return null;return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5')}
function mapStatus(s){const k=nz(s);if(!k)return null;
 if(/conclu|encerr|finaliz|entregue|terminad|fechad/.test(k))return'Concluída';
 if(/paralis|suspens|pausad/.test(k))return'Pausada';
 if(/^inativ/.test(k))return null;
 if(/ativ|andamento|execu|aberta|em obra/.test(k))return'Ativa';return null}

/* ---------- análise do arquivo ---------- */
function analisar(arr,existentes){
 const h=cabecalho(arr);
 if(!h)throw new Error('Não reconheci as colunas do arquivo. Preciso de ao menos “Código” e “Nome da obra”. Envie este arquivo ao suporte do Masters Gestão para adaptarmos a leitura. Nada foi gravado.');
 const{i:hi,pos,H}=h,cab=(arr[hi]||[]).map(tx),usados=new Set(Object.values(pos));
 /* colunas "Obra" no formato "55 - ESTORIL": separa código e nome */
 const junto=pos.codigo==null;let rows=[];
 for(let r=hi+1;r<arr.length;r++){const a=arr[r]||[];if(a.every(vz))continue;rows.push({linha:r+1,a})}
 rows=rows.filter(x=>!vz(x.a[pos.nome])||(pos.codigo!=null&&!vz(x.a[pos.codigo])));
 if(!rows.length)throw new Error('O arquivo não tem obras abaixo do cabeçalho.');
 if(rows.length>3000)throw new Error('O arquivo tem mais de 3000 linhas.');
 const extrasCols=cab.map((t,j)=>({t,j})).filter(c=>c.t&&!usados.has(c.j)&&c.j<60).slice(0,40);
 const ex=new Map(existentes.map(o=>[String(o.codigo).trim().toUpperCase(),o]));
 const nomes=new Map(existentes.map(o=>[nz(o.nome),o.codigo]));
 const vistos=new Map(),nomesNovos=new Map(),res=[],avisosGerais=[];
 if(junto)avisosGerais.push('Não há coluna separada de código: usei o início de “'+cab[pos.nome]+'” (antes do hífen) como código do Sienge.');
 rows.forEach(({linha,a})=>{
  let c,nome;
  if(junto){const m=tx(a[pos.nome]).match(/^(\S+)\s*[-–—]\s*(.+)$/);c=m?m[1]:'';nome=m?m[2]:tx(a[pos.nome])}
  else{c=cod(a[pos.codigo]);nome=tx(a[pos.nome])}
  const o={linha,codigo:c,nome,avisos:[]},rej=m=>({...o,estado:'rej',motivo:m});
  if(!c)return res.push(rej('Código da obra no Sienge não informado.'));
  const K=c.toUpperCase();
  if(vistos.has(K))return res.push({...o,estado:'ign',motivo:'Código repetido no arquivo (já lido na linha '+vistos.get(K)+').'});vistos.set(K,linha);
  const v={};
  v.nome=nome;
  v.razao_social=pos.razao_social!=null?tx(a[pos.razao_social]):'';
  let end=pos.endereco!=null?tx(a[pos.endereco]):'';
  if(end){const nu=pos._numero!=null?tx(a[pos._numero]):'',ba=pos._bairro!=null?tx(a[pos._bairro]):'';end=end+(nu&&!end.includes(nu)?', '+nu:'')+(ba?' - '+ba:'')}
  v.endereco=end;
  v.cidade=pos.cidade!=null?tx(a[pos.cidade]):'';
  let uf=pos.estado!=null?tx(a[pos.estado]):'';
  if(uf){const u=uf.toUpperCase();if(SIGLAS.has(u))uf=u;else if(UFS[nz(uf)])uf=UFS[nz(uf)];else{o.avisos.push('Estado “'+uf+'” não reconhecido: não será gravado.');uf=''}}
  v.estado=uf;
  let cn=pos.cnpj!=null?tx(a[pos.cnpj]):'';
  if(cn){const f=cnpjOk(cn);if(f)cn=f;else{o.avisos.push('CNPJ “'+cn+'” inválido: não será gravado.');cn=''}}
  v.cnpj=cn;
  const sit=pos.situacao_sienge!=null?tx(a[pos.situacao_sienge]):'';v.situacao_sienge=sit;
  const st=mapStatus(sit);v.status=st||'';
  if(sit&&!st)o.avisos.push('Situação “'+sit+'” sem equivalente no sistema: o status não será alterado (a nova obra entra como Ativa). A situação original fica guardada.');
  ['data_inicio','data_termino'].forEach(k=>{const raw=pos[k]!=null?a[pos[k]]:'';if(vz(raw)){v[k]='';return}const d=parseData(raw);if(!d)o.avisos.push(ROT[k]+' “'+tx(raw)+'” inválida: não será gravada.');v[k]=d||''});
  const extras={};extrasCols.forEach(({t,j})=>{const x=a[j];if(vz(x))return;extras[t]=x instanceof Date?(parseData(x)||''):String(x).trim().slice(0,300)});
  v.extras=extras;o.v=v;
  const e=ex.get(K);
  if(!e){
   if(!nome)return res.push(rej('Nome da obra não informado.'));
   const nk=nz(nome);
   if(nomes.has(nk))return res.push(rej('Já existe uma obra com este nome e outro código ('+nomes.get(nk)+'). Confira o código no cadastro de Obras para não duplicar.'));
   if(nomesNovos.has(nk))return res.push(rej('Outra obra deste arquivo tem o mesmo nome (código '+nomesNovos.get(nk)+').'));
   nomesNovos.set(nk,c);
   return res.push({...o,estado:'novo'})}
  /* obra existente: só o que é novo e diferente */
  const dif=[];
  ['nome','razao_social','endereco','cidade','estado','cnpj','situacao_sienge','status','data_inicio','data_termino'].forEach(k=>{
   const n=v[k];if(!n)return;const velho=e[k]==null?'':String(e[k]);if(velho.trim().toLowerCase()===String(n).trim().toLowerCase())return;
   dif.push({k,de:velho,para:n})});
  const ed=e.dados_sienge||{},ch=Object.keys(extras).filter(t=>String(ed[t]==null?'':ed[t])!==String(extras[t]));
  if(ch.length)dif.push({k:'dados_sienge',de:'',para:ch.length+' informação(ões) do arquivo (guardadas, sem apagar as existentes)'});
  if(!dif.length)return res.push({...o,estado:'ign',motivo:'Já cadastrada, sem diferenças.',existente:e});
  res.push({...o,estado:'atu',dif,existente:e})});
 const mapa=[];CAMPOS.forEach(c=>{if(pos[c.k]!=null&&!c.k.startsWith('_'))mapa.push(c.r+' ← “'+cab[pos[c.k]]+'”')});
 if(junto)mapa.unshift(ROT.codigo+' ← início de “'+cab[pos.nome]+'”');
 if(pos._numero!=null&&pos.endereco!=null)mapa.push('Número ← “'+cab[pos._numero]+'” (junto do endereço)');
 if(pos._bairro!=null&&pos.endereco!=null)mapa.push('Bairro ← “'+cab[pos._bairro]+'” (junto do endereço)');
 return{res,mapa,extras:extrasCols.map(c=>c.t),avisosGerais,linhaCab:hi+1}}

/* ---------- tela ---------- */
const lb={novo:'Nova',atu:'Será atualizada',ign:'Ignorada',rej:'Rejeitada'},cl={novo:'blue',atu:'blue',ign:'',rej:'red'};
function dlg(){return `<div class="card" id="obr_box"><h3 style="margin-top:0">Importar Obras do Sienge</h3>
 <p>Escolha o arquivo de obras exportado pelo Sienge (.xlsx, .xls ou .csv), do jeito que ele saiu. O sistema reconhece as colunas sozinho e mostra uma prévia <b>antes de gravar</b>.</p>
 <ul class="hint" style="margin:0 0 10px 18px"><li>O <b>código da obra no Sienge</b> identifica cada obra: obra com o mesmo código não é duplicada.</li><li>Em obra já cadastrada, a prévia mostra cada campo que será mudado, de → para. Campo vazio no arquivo <b>nunca apaga</b> o que já existe.</li><li>Nada é apagado. Vínculos com solicitações, pedidos, funcionários, materiais e ferramentas continuam como estão.</li></ul>
 <div class="acts" style="justify-content:flex-start"><button class="btn" id="obr_esc">Escolher arquivo</button><button class="sec" id="obr_x">Fechar</button></div>
 <input type="file" id="obr_f" accept=".xlsx,.xls,.csv" class="hide"><div id="obr_p" style="margin-top:14px"></div></div>`}

function abrir(){const v=$('#view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Obras')return;let b=document.getElementById('obr_box');if(b){b.scrollIntoView({block:'nearest'});return}
 const c=v.querySelector('.card.wrap');if(!c)return;c.insertAdjacentHTML('beforebegin',dlg());
 $('#obr_esc').onclick=()=>$('#obr_f').click();$('#obr_x').onclick=()=>$('#obr_box').remove();
 $('#obr_f').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)ler(f)}}

async function existentes(){let a=[],i=0;for(;;){const{data,error}=await sb.from('obras').select('*').order('id').range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}

async function ler(f){const P=$('#obr_p');P.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{const[arr,ex]=await Promise.all([matriz(f),existentes()]);const R=analisar(arr,ex);prever(f,R)}
 catch(e){P.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}

function difTxt(d){return d.map(x=>'<b>'+esc(ROT[x.k]||x.k)+'</b>: '+(x.k==='dados_sienge'?esc(x.para):(x.de?esc(x.k.startsWith('data')?fd(x.de):x.de):'<i>(vazio)</i>')+' → '+esc(x.k.startsWith('data')?fd(x.para):x.para))).join('<br>')}

function prever(f,R){const P=$('#obr_p'),res=R.res,N=res.filter(a=>a.estado==='novo'),A=res.filter(a=>a.estado==='atu'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej');
 const ord={rej:0,atu:1,novo:2,ign:3},L=res.slice().sort((a,b)=>ord[a.estado]-ord[b.estado]||a.linha-b.linha);
 const linhaTxt=a=>a.estado==='atu'?difTxt(a.dif):a.estado==='novo'?esc([a.v.cidade&&a.v.estado?a.v.cidade+'/'+a.v.estado:a.v.cidade||a.v.estado,a.v.situacao_sienge].filter(Boolean).join(' · ')||'Nova obra')+(a.v.razao_social?'<br><small>'+esc(a.v.razao_social)+'</small>':''):esc(a.motivo||'');
 P.innerHTML=`<h3 style="margin:0 0 6px">Prévia — nada foi gravado ainda</h3>
 <p class="hint">Arquivo: <b>${esc(f.name)}</b>. Cabeçalho na linha ${R.linhaCab}. Colunas reconhecidas: ${R.mapa.map(esc).join('; ')}.${R.extras.length?' Outras colunas guardadas como informação extra da obra: '+R.extras.map(esc).join(', ')+'.':''}</p>
 ${R.avisosGerais.map(t=>'<p class="hint">'+esc(t)+'</p>').join('')}
 <div class="kpis"><div class="card kpi"><b>${N.length}</b>A cadastrar</div><div class="card kpi"><b>${A.length}</b>A atualizar</div><div class="card kpi"><b>${I.length}</b>Ignoradas</div><div class="card kpi al"><b>${J.length}</b>Rejeitadas</div></div>
 <div class="wrap" style="max-height:420px;overflow:auto"><table style="min-width:640px"><thead><tr><th>Linha</th><th>Código Sienge</th><th>Obra</th><th>Situação</th><th>O que acontece</th></tr></thead><tbody>${L.slice(0,500).map(a=>`<tr><td>${a.linha}</td><td>${esc(a.codigo)}</td><td>${esc(a.nome||(a.existente&&a.existente.nome)||'')}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${linhaTxt(a)}${a.avisos&&a.avisos.length?'<br><small class="redt">'+a.avisos.map(esc).join('<br>')+'</small>':''}</td></tr>`).join('')}</tbody></table></div>
 ${L.length>500?'<p class="hint">Mostrando 500 de '+L.length+' (rejeitadas e atualizações aparecem primeiro).</p>':''}
 ${A.length?`<label style="display:block;padding:12px 0"><input type="checkbox" id="obr_ok" style="width:22px;min-height:22px;vertical-align:middle"> <b>Conferi os campos que serão atualizados nas ${A.length} obra(s) já cadastrada(s)</b></label>`:''}
 <div class="err hide" id="obr_e"></div>
 <div class="acts"><button class="sec" id="obr_c">Cancelar</button><button class="btn" id="obr_g" ${N.length+A.length?'':'disabled'}>Confirmar: cadastrar ${N.length} e atualizar ${A.length}</button></div>`;
 $('#obr_c').onclick=()=>{P.innerHTML=''};
 $('#obr_g').onclick=async()=>{const e=$('#obr_e');e.classList.add('hide');
  if(A.length&&!$('#obr_ok').checked){e.textContent='Marque a confirmação de que você conferiu as atualizações.';e.classList.remove('hide');return}
  const b=$('#obr_g');b.disabled=true;
  const linhas=N.concat(A).map(a=>{const v=a.v,p={linha:a.linha,codigo:a.codigo,nome:v.nome||null,razao_social:v.razao_social||null,endereco:v.endereco||null,cidade:v.cidade||null,estado:v.estado||null,cnpj:v.cnpj||null,situacao_sienge:v.situacao_sienge||null,status:v.status||null,data_inicio:v.data_inicio||null,data_termino:v.data_termino||null,extras:Object.keys(v.extras).length?v.extras:null};
   if(a.estado==='atu')p.campos=a.dif.map(d=>d.k);return p});
  const env=a=>({linha:a.linha,codigo:a.codigo,motivo:a.motivo});
  const{data,error}=await sb.rpc('importar_obras',{p_arquivo:f.name,p_linhas:linhas,p_rejeitados:J.map(env),p_ignorados:I.map(env)});
  if(error){b.disabled=false;e.textContent=/Could not find the function|schema cache/i.test(error.message||'')?'Falta executar o SQL 10 (10_obras_sienge) no Supabase.':msg(error);e.classList.remove('hide');return}
  resultado(data)}}

function resultado(d){const P=$('#obr_p'),al=(d.detalhes&&d.detalhes.alteradas)||[];
 P.innerHTML=`<h3 style="margin:0 0 6px">Importação concluída</h3>
 <div class="kpis"><div class="card kpi"><b>${d.cadastradas||0}</b>Cadastradas</div><div class="card kpi"><b>${d.atualizadas||0}</b>Atualizadas</div><div class="card kpi"><b>${d.ignoradas||0}</b>Ignoradas</div><div class="card kpi al"><b>${d.rejeitadas||0}</b>Rejeitadas</div></div>
 <p class="hint">Registrado em <b>Histórico de importações</b> com seu nome, a data e a hora.</p>
 ${al.length?'<div class="wrap" style="max-height:260px;overflow:auto"><table style="min-width:520px"><thead><tr><th>Código</th><th>Campos atualizados</th></tr></thead><tbody>'+al.map(a=>'<tr><td>'+esc(a.codigo)+'</td><td>'+Object.keys(a.campos).map(k=>esc(ROT[k]||k)).join(', ')+'</td></tr>').join('')+'</tbody></table></div>':''}
 <div class="acts"><button class="btn" id="obr_fim">Ver lista de obras</button></div>`;
 $('#obr_fim').onclick=()=>{const n=document.querySelector('#menu [data-v="obras"]');if(n)n.click();else location.reload()}}

/* ---------- botão na tela Obras ---------- */
function poeBotao(){if(!adm())return;const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Obras')return;const bar=v.querySelector('.bar');if(!bar||bar.querySelector('#obr_btn'))return;
 const b=document.createElement('button');b.id='obr_btn';b.type='button';b.className='sec';b.textContent='Importar Obras do Sienge';bar.appendChild(b)}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#obr_btn');if(!t)return;e.stopPropagation();e.preventDefault();
 /* o importador oficial (leitor do arquivo real do Sienge + prévia + conciliação) fica em modulo-importacoes.js; este abre-o aqui na tela Obras. Se ele não carregou, usa o importador genérico antigo. */
 if(window.__hubObras&&window.__hubObras.abrir())return;abrir()},true);
new MutationObserver(poeBotao).observe(document.getElementById('view'),{childList:true,subtree:true});poeBotao();
window.__obrTeste={analisar,cabecalho,cnpjOk,mapStatus,parseData};
})()}catch(e){window.__obrErro=e;console.error('Importar obras não carregou:',e);try{toast('Importar obras não carregou: '+e.message)}catch(x){}}
