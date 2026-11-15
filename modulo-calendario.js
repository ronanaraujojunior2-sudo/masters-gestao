/* MASTERS GESTÃO - Módulo 3B-9: Feriados e datas comemorativas (calendário de Manaus).
   Antes de usar, rode no Supabase o SQL 09_calendario.
   Só entram nos cálculos de prazo os registros ATIVOS marcados como "dia não útil". Nada é apagado: datas erradas são DESATIVADAS. */
try{(function(){
if(!window.XLSX&&!document.querySelector('script[data-xls]')){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.setAttribute('data-xls','1');document.head.appendChild(s)}

const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').toLowerCase().replace(/\s+/g,' ').trim();
const DOW=['dom','seg','ter','qua','qui','sex','sáb'];
const fd=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const dw=d=>d?DOW[new Date(d+'T00:00').getDay()]:'';
const adm=()=>!!me&&me.perfil==='MASTERS';
const CATS=['Feriado','Ponto facultativo','Data comemorativa'],ESC=['Nacional','Estadual','Municipal','Empresa'];
const ESFERAS=[['Federal','Federal','https://www.gov.br/gestao/pt-br','Ministério da Gestão: portaria anual de feriados nacionais e pontos facultativos. Costuma sair no fim do ano anterior.'],
 ['Estadual (Amazonas)','Governo do Amazonas','https://diario.imprensaoficial.am.gov.br/','Diário Oficial do Estado do Amazonas: decreto do calendário e dos pontos facultativos.'],
 ['Municipal (Manaus)','Prefeitura de Manaus','https://dom.manaus.am.gov.br/','Diário Oficial do Município de Manaus: decreto anual de feriados e pontos facultativos. Costuma sair no início do ano.']];
const padraoNaoUtil=c=>c==='Feriado';
let DADOS=[],CONF=[],NOMES={},F={ano:'',cat:'',esc:'',q:''},ERRO=null;

async function lerTudo(t,c,o){let a=[],i=0;for(;;){let q=sb.from(t).select(c);if(o)q=q.order(o);const{data,error}=await q.range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function carregar(){DADOS=await lerTudo('feriados','*','data');
 try{CONF=await lerTudo('calendario_conferencias','*','ano')}catch(e){CONF=[]}
 NOMES={};if(adm()){try{(await lerTudo('perfis','id,nome,login')).forEach(p=>NOMES[p.id]=p.nome||p.login)}catch(e){}}}

/* ---------- tela ---------- */
async function telaCal(){cur='feriados';mark();const v=$('#view');
 v.innerHTML='<h1>Feriados e datas comemorativas</h1><p class="sub">Carregando…</p>';
 try{await carregar()}catch(e){v.innerHTML='<h1>Feriados e datas comemorativas</h1><div class="err">'+esc(msg(e))+'</div><p class="hint">Se a mensagem fala em coluna ou tabela que não existe, rode no Supabase o SQL <b>09_calendario</b>.</p>';return}
 if(adm())await preparaAuto();
 const ay=new Date().getFullYear(),anos=[...new Set(DADOS.map(d=>+d.data.slice(0,4)).concat([ay,ay+1]))].sort();
 if(F.ano===''&&anos.includes(ay))F.ano=String(ay);
 v.innerHTML=`<h1>Feriados e datas comemorativas</h1>
 <p class="sub">Calendário de Manaus: nacional, Amazonas e Manaus. <b>Só os dias marcados como “dia não útil” entram no cálculo dos prazos</b> (previsão de entrega dos pedidos). Ponto facultativo e data comemorativa não contam, a menos que o administrador marque.</p>
 <div id="cal_av"></div>
 <div class="bar">
  <select id="cal_ano" aria-label="Ano" style="min-width:140px"><option value="">Todos os anos</option>${anos.map(a=>`<option value="${a}">${a}</option>`).join('')}</select>
  <select id="cal_cat" aria-label="Categoria" style="min-width:210px"><option value="">Todas as categorias</option>${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
  <select id="cal_esc" aria-label="Abrangência" style="min-width:190px"><option value="">Toda abrangência</option>${ESC.map(c=>`<option>${c}</option>`).join('')}</select>
  <input id="q" type="search" placeholder="Pesquisar pelo nome ou data" aria-label="Pesquisar">
 </div>
 <div class="bar"><button class="sec" id="cal_xl">Exportar Excel</button>${adm()?'<button class="btn" id="cal_nv">Cadastrar data</button><button class="sec" id="cal_imp">Importar calendário</button><button class="sec" id="cal_ger">Gerar calendário do ano</button>':''}</div>
 <div id="cal_res"></div>
 <div class="card wrap"><div id="cal_tab"></div></div>
 <div id="cal_pn"></div><div id="cal_ip" style="margin-top:12px"></div>
 <input type="file" id="cal_f" accept=".xlsx,.csv" class="hide">`;
 $('#cal_ano').value=F.ano;$('#cal_cat').value=F.cat;$('#cal_esc').value=F.esc;$('#q').value=F.q;
 ['cal_ano','cal_cat','cal_esc'].forEach(id=>$('#'+id).onchange=e=>{F[id.slice(4)]=e.target.value;tabela()});
 $('#q').oninput=e=>{F.q=e.target.value;tabela()};
 $('#cal_xl').onclick=exportar;
 if(adm()){$('#cal_nv').onclick=()=>cadastrar();$('#cal_imp').onclick=()=>$('#cal_f').click();$('#cal_ger').onclick=gerarAno;$('#cal_f').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importar(f)};painel(ay)}
 tabela()}

function filtrar(){const q=nz(F.q);return DADOS.filter(d=>(!F.ano||d.data.startsWith(F.ano))&&(!F.cat||d.categoria===F.cat)&&(!F.esc||d.escopo===F.esc)&&
 (!q||nz(d.descricao+' '+fd(d.data)+' '+d.data+' '+(d.fonte||'')+' '+d.escopo+' '+d.categoria).includes(q)))}

function tabela(){const L=filtrar(),adm_=adm();
 const c=k=>L.filter(d=>d.categoria===k&&d.ativo).length;
 $('#cal_res').innerHTML=`<p class="sub" style="margin:4px 0 10px">${L.length} data(s): ${c('Feriado')} feriado(s), ${c('Ponto facultativo')} ponto(s) facultativo(s), ${c('Data comemorativa')} data(s) comemorativa(s). ${L.filter(d=>d.ativo&&d.nao_util).length} dia(s) não útil(is) nos cálculos.</p>`;
 if(!L.length){$('#cal_tab').innerHTML='<p class="empty">Nenhuma data encontrada para este filtro.'+(adm_?'<br>Use “Gerar calendário do ano” para preparar o ano.':'')+'</p>';return}
 $('#cal_tab').innerHTML=`<table style="min-width:760px"><thead><tr><th>Data</th><th>Nome</th><th>Abrangência</th><th>Categoria</th><th>Dia não útil</th><th>Fonte oficial</th>${adm_?'<th></th>':''}</tr></thead><tbody>${L.map(d=>{
  const nu=!d.ativo?'<span class="chip red">Desativada</span>':d.nao_util?'<span class="chip blue">Sim</span>':'<span class="chip">Não</span>';
  const prev=d.situacao==='Prevista em lei'?' <span class="chip">confirmar no decreto anual</span>':'';
  return `<tr${d.ativo?'':' style="opacity:.55"'}><td><b>${fd(d.data)}</b><br><small>${dw(d.data)}</small></td><td>${esc(d.descricao)}${d.observacao?'<br><small>'+esc(d.observacao)+'</small>':''}</td><td>${esc(d.escopo)}</td><td>${esc(d.categoria)}</td><td>${nu}</td><td><small>${esc(d.fonte||'—')}</small>${prev}</td>${adm_?`<td><button class="mini" data-cal-ed="${d.id}">Editar</button></td>`:''}</tr>`}).join('')}</tbody></table>`;
 if(adm_)$('#cal_tab').querySelectorAll('[data-cal-ed]').forEach(b=>b.onclick=()=>editar(DADOS.find(x=>x.id===b.dataset.calEd)))}

/* ---------- atualização anual: preparo automático + conferência nas fontes oficiais ---------- */
async function preparaAuto(){const ay=new Date().getFullYear(),feitos=[];
 for(const y of [ay,ay+1]){
  if(DADOS.some(d=>d.origem==='Calendário'&&d.data.startsWith(String(y))))continue;
  let ja=false;try{ja=sessionStorage.getItem('cal_auto_'+y)==='1'}catch(e){}
  if(ja)continue;try{sessionStorage.setItem('cal_auto_'+y,'1')}catch(e){}
  const{data,error}=await sb.rpc('gerar_calendario',{p_ano:y});
  if(!error&&data&&data.novos>0)feitos.push(y+': '+data.novos+' data(s)')}
 if(feitos.length){await carregar();window.__calAuto=feitos;try{toast('Calendário preparado automaticamente — '+feitos.join('; ')+'.')}catch(e){}}}

function painel(ay){const P=$('#cal_pn');if(!P)return;
 const lin=y=>ESFERAS.map(([k,nome,url,dica])=>{const c=CONF.find(x=>x.ano===y&&x.esfera===k);
  return `<tr><td><b>${y}</b></td><td>${esc(nome)}<br><small>${esc(dica)}</small></td><td>${c?'<span class="chip blue">Conferido</span><br><small>'+fd(c.conferido_em.slice(0,10))+(NOMES[c.conferido_por]?' por '+esc(NOMES[c.conferido_por]):'')+(c.ato?'<br>'+esc(c.ato):'')+'</small>':'<span class="chip red">Pendente</span>'}</td>
   <td><a class="mini" href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;line-height:34px;text-decoration:none;color:inherit">Abrir fonte</a>${c?'':`<button class="mini" data-cal-cf="${y}|${k}">Registrar conferência</button>`}</td></tr>`}).join('');
 P.innerHTML=`<div class="card" style="margin-top:12px"><b>Atualização anual do calendário</b>
 <p class="hint">As datas fixas e as móveis previstas em lei (Carnaval, Sexta-feira Santa, Corpus Christi) são geradas pelo sistema. Os <b>pontos facultativos</b> e decretos de cada ano só existem depois de publicados: confira nas fontes oficiais, cadastre ou importe o que for publicado e registre a conferência abaixo. Nada é apagado nem sobrescrito.</p>
 <div class="wrap"><table style="min-width:640px"><thead><tr><th>Ano</th><th>Fonte</th><th>Situação</th><th></th></tr></thead><tbody>${lin(ay)}${lin(ay+1)}</tbody></table></div></div>`;
 P.querySelectorAll('[data-cal-cf]').forEach(b=>b.onclick=()=>conferir(b.dataset.calCf))}

function conferir(k){const[y,e]=k.split('|');
 modal('Registrar conferência: '+e+' — '+y,`<p>Registre que você conferiu o calendário de <b>${y}</b> na fonte oficial (${esc(e)}).</p>
 <label class="fl" for="c_a">Ato oficial consultado (portaria ou decreto)</label><input id="c_a" placeholder="Ex.: Portaria MGI nº 11.460/2025"><div class="hint">Se ainda não foi publicado para ${y}, escreva “ainda não publicado”.</div>
 <label class="fl" for="c_o">Observação (opcional)</label><input id="c_o">`,'Registrar',async()=>{
  const ato=$('#c_a').value.trim();if(!ato)return 'Informe o ato consultado ou escreva “ainda não publicado”.';
  const{error}=await sb.rpc('registrar_conferencia',{p_ano:+y,p_esfera:e,p_ato:ato,p_obs:$('#c_o').value.trim()||null});if(error)return msg(error);
  toast('Conferência registrada.');telaCal()})}

async function gerarAno(){const ay=new Date().getFullYear();
 const r=prompt('Gerar o calendário de qual ano? (apenas datas previstas em lei; nada que já existe é alterado)',String(ay+1));if(r===null)return;
 const y=parseInt(r,10);if(!(y>=2000&&y<=2100)){toast('Ano inválido.');return}
 if(!confirm('Gerar o calendário de '+y+'?\nSerão acrescentadas só as datas que ainda não existem. Nada será alterado ou apagado.'))return;
 const{data,error}=await sb.rpc('gerar_calendario',{p_ano:y});if(error){toast(msg(error));return}
 toast('Calendário de '+y+': '+data.novos+' data(s) nova(s); '+data.ja_existiam+' já existia(m).');F.ano=String(y);telaCal()}

/* ---------- cadastrar e corrigir (administrador) ---------- */
function campos(d){return `<label class="fl" for="k_n">Nome <b class="rq">*</b></label><input id="k_n" value="${esc(d.descricao||'')}">
 <label class="fl" for="k_c">Categoria <b class="rq">*</b></label><select id="k_c">${CATS.map(c=>`<option ${c===d.categoria?'selected':''}>${c}</option>`).join('')}</select>
 <div class="hint"><b>Feriado</b> e <b>ponto facultativo</b> são coisas diferentes. <b>Data comemorativa</b> não é feriado.</div>
 <label class="fl" for="k_u">Considerado dia não útil? <b class="rq">*</b></label><select id="k_u"><option value="1" ${d.nao_util?'selected':''}>Sim — não conta nos prazos</option><option value="0" ${d.nao_util?'':'selected'}>Não — conta como dia útil</option></select>
 <label class="fl" for="k_f">Fonte oficial</label><input id="k_f" value="${esc(d.fonte||'')}" placeholder="Lei, decreto ou portaria">
 <label class="fl" for="k_o">Observação</label><input id="k_o" value="${esc(d.observacao||'')}">`}

function cadastrar(){
 modal('Cadastrar data',`<label class="fl" for="k_d">Data <b class="rq">*</b></label><input id="k_d" type="date">
 <label class="fl" for="k_e">Abrangência <b class="rq">*</b></label><select id="k_e">${ESC.map(c=>`<option>${c}</option>`).join('')}</select>`+campos({categoria:'Feriado',nao_util:true}),'Salvar',async()=>{
  const data=$('#k_d').value,nome=$('#k_n').value.trim();if(!data)return 'Informe a data.';if(!nome)return 'Informe o nome.';
  const row={data,descricao:nome,escopo:$('#k_e').value,categoria:$('#k_c').value,nao_util:$('#k_u').value==='1',fonte:$('#k_f').value.trim()||null,observacao:$('#k_o').value.trim()||null,origem:'Manual',situacao:'Cadastrado pelo administrador'};
  const{error}=await sb.from('feriados').insert(row);
  if(error)return /duplicate|unique|feriados_unico/i.test(error.message||'')?'Já existe uma data com este mesmo dia, abrangência e nome.':msg(error);
  toast('Data cadastrada.');telaCal()});
 const c=$('#k_c');if(c)c.onchange=()=>{$('#k_u').value=padraoNaoUtil(c.value)?'1':'0'}}

function editar(d){if(!d)return;
 modal('Corrigir data: '+fd(d.data),`<p><b>${fd(d.data)}</b> (${dw(d.data)}) — ${esc(d.escopo)}</p><div class="hint">Para mudar a data ou a abrangência, desative esta e cadastre outra. Nada é apagado.</div>`+campos(d)+
 `<label style="display:block;padding:12px 0"><input type="checkbox" id="k_a" ${d.ativo?'checked':''} style="width:22px;min-height:22px;vertical-align:middle"> <b>Esta data vale</b></label><div class="hint">Desmarque para desativar (ela deixa de contar nos prazos, mas continua registrada).</div>`,'Salvar',async()=>{
  const novo={descricao:$('#k_n').value.trim(),categoria:$('#k_c').value,nao_util:$('#k_u').value==='1',fonte:$('#k_f').value.trim()||null,observacao:$('#k_o').value.trim()||null,ativo:$('#k_a').checked};
  if(!novo.descricao)return 'Informe o nome.';
  const rot={descricao:'Nome',categoria:'Categoria',nao_util:'Dia não útil',fonte:'Fonte',observacao:'Observação',ativo:'Vale'},fmt=(k,x)=>k==='nao_util'?(x?'Sim':'Não'):k==='ativo'?(x?'Sim':'Não (desativada)'):(x==null||x===''?'(vazio)':x);
  const dif=Object.keys(novo).filter(k=>(novo[k]??null)!==(d[k]??null)&&!(k==='fonte'&&!novo[k]&&!d[k]));
  if(!dif.length)return 'Nada foi alterado.';
  if(!confirm('Confirmar estas alterações?\n\n'+dif.map(k=>rot[k]+': '+fmt(k,d[k])+' → '+fmt(k,novo[k])).join('\n')))return 'Nada foi alterado.';
  const p={};dif.forEach(k=>p[k]=novo[k]);
  const{error}=await sb.from('feriados').update(p).eq('id',d.id);
  if(error)return /duplicate|unique/i.test(error.message||'')?'Já existe uma data com este mesmo dia, abrangência e nome.':msg(error);
  toast('Data corrigida.');telaCal()})}

/* ---------- exportar Excel ---------- */
function exportar(){
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 if(!DADOS.length){toast('Não há datas para exportar.');return}
 const H=['Data','Nome do feriado ou comemoração','Abrangência','Categoria','Indicação se é considerado dia não útil','Fonte oficial da informação','Dia da semana','Situação','Observação','Situação no sistema'];
 const rows=DADOS.map(d=>[new Date(d.data+'T00:00:00Z'),d.descricao,d.escopo,d.categoria,d.nao_util?'Sim':'Não',d.fonte||'',['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][new Date(d.data+'T00:00').getDay()],d.situacao,d.observacao||'',d.ativo?'Ativa':'Desativada']);
 const ws=XLSX.utils.aoa_to_sheet([H].concat(rows),{cellDates:true});
 ws['!cols']=[{wch:12},{wch:48},{wch:13},{wch:19},{wch:14},{wch:70},{wch:15},{wch:28},{wch:40},{wch:16}];
 rows.forEach((r,i)=>{const c=ws[XLSX.utils.encode_cell({r:i+1,c:0})];if(c){c.t='d';c.z='dd/mm/yyyy'}});
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Calendário');
 const ns=XLSX.utils.aoa_to_sheet([['Como ler este calendário'],['Só são “dia não útil” nos cálculos de prazo os registros marcados “Sim” e ativos. Ponto facultativo e data comemorativa só contam se o administrador marcar.'],['Datas fixas e móveis previstas em lei são geradas automaticamente; pontos facultativos dependem de ato oficial de cada ano (portaria federal, decreto do Governo do Amazonas e decreto da Prefeitura de Manaus).'],['Registros com situação “Prevista em lei” devem ser confirmados no decreto anual quando for publicado.']]);
 ns['!cols']=[{wch:140}];XLSX.utils.book_append_sheet(wb,ns,'Leia-me');
 const anos=DADOS.map(d=>+d.data.slice(0,4));XLSX.writeFile(wb,'Calendario_Feriados_Masters_'+Math.min(...anos)+'-'+Math.max(...anos)+'.xlsx',{cellDates:true})}

/* ---------- importar calendário (Excel/CSV no mesmo formato do exportado) ---------- */
const SIN={data:['data'],nome:['nome do feriado ou comemoracao','nome do feriado','nome','descricao','feriado','comemoracao'],escopo:['abrangencia','escopo','tipo'],categoria:['categoria'],
 nao_util:['considerado dia nao util','indicacao se e considerado dia nao util','dia nao util','nao util'],fonte:['fonte oficial da informacao','fonte oficial','fonte'],obs:['observacao','observacoes']};
function csv(t){const L=t.replace(/^﻿/,'').split(/\r?\n/);const f=L[0]||'';const d=f.split(';').length>=f.split(',').length?';':',';
 return L.filter(x=>x.trim()!=='').map(l=>{const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const h=l[i];if(q){if(h==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===d){o.push(c);c=''}else c+=h}o.push(c);return o})}
function parseData(v){let y,m,d;
 if(v instanceof Date){y=v.getUTCFullYear();m=v.getUTCMonth()+1;d=v.getUTCDate()}
 else if(typeof v==='number'){const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const s=String(v||'').trim();let k=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);if(k){d=+k[1];m=+k[2];y=+k[3]}else{k=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!k)return null;y=+k[1];m=+k[2];d=+k[3]}}
 const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d||y<2000||y>2100)return null;
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
const mapEsc=s=>({nacional:'Nacional',federal:'Nacional',estadual:'Estadual',amazonas:'Estadual',municipal:'Municipal',manaus:'Municipal',empresa:'Empresa'})[nz(s)]||null;
const mapCat=s=>({feriado:'Feriado','ponto facultativo':'Ponto facultativo','data comemorativa':'Data comemorativa',comemorativa:'Data comemorativa'})[nz(s)]||null;
const mapSN=s=>{const k=nz(s);return ['sim','s','true','1','verdadeiro'].includes(k)?true:['nao','n','false','0','falso'].includes(k)?false:null};

async function lerArquivo(f){const n=f.name.toLowerCase();let arr;
 if(n.endsWith('.csv')){const b=await f.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}arr=csv(t)}
 else if(n.endsWith('.xlsx')){if(!window.XLSX)throw new Error('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});arr=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''})}
 else throw new Error('Use um arquivo .xlsx ou .csv.');
 let hi=-1,pos={};for(let i=0;i<Math.min(arr.length,15);i++){const H=(arr[i]||[]).map(nz),p={};for(const k in SIN){const j=H.findIndex(h=>SIN[k].includes(h));if(j>=0)p[k]=j}if(p.data!=null&&p.nome!=null){hi=i;pos=p;break}}
 if(hi<0)throw new Error('Não encontrei as colunas “Data” e “Nome do feriado ou comemoração”. Use o arquivo exportado por esta tela como modelo.');
 if(pos.escopo==null||pos.categoria==null)throw new Error('Faltam as colunas “Abrangência” e “Categoria”. Use o arquivo exportado por esta tela como modelo.');
 const rows=[];arr.slice(hi+1).forEach((r,i)=>{const g=k=>pos[k]==null?'':r[pos[k]];if([g('data'),g('nome')].every(x=>String(x).trim()===''))return;
  rows.push({linha:hi+i+2,data:g('data'),nome:g('nome'),escopo:g('escopo'),categoria:g('categoria'),nao_util:g('nao_util'),fonte:g('fonte'),obs:g('obs')})});
 if(!rows.length)throw new Error('Não há linhas preenchidas.');if(rows.length>2000)throw new Error('O arquivo tem mais de 2000 linhas.');return rows}

function validar(rows){const ex=new Map(DADOS.filter(d=>!d.obra_id).map(d=>[d.data+'|'+d.escopo+'|'+nz(d.descricao),d])),vis=new Map();
 return rows.map(r=>{const d=parseData(r.data),nome=String(r.nome||'').trim(),esc_=mapEsc(r.escopo),cat=mapCat(r.categoria);
  const o={linha:r.linha,resumo:(d?fd(d):String(r.data))+' — '+nome},rej=m=>({...o,estado:'rej',motivo:m});
  if(!d)return rej('Data inválida. Use dia/mês/ano.');if(!nome)return rej('Nome não informado.');
  if(!esc_)return rej('Abrangência inválida. Use Nacional, Estadual, Municipal ou Empresa.');if(!cat)return rej('Categoria inválida. Use Feriado, Ponto facultativo ou Data comemorativa.');
  let nu=String(r.nao_util).trim()===''?null:mapSN(r.nao_util);if(String(r.nao_util).trim()!==''&&nu===null)return rej('“Dia não útil” deve ser Sim ou Não.');
  const padrao=nu===null;if(nu===null)nu=padraoNaoUtil(cat);
  const k=d+'|'+esc_+'|'+nz(nome);
  if(vis.has(k))return{...o,estado:'ign',motivo:'Repetido no arquivo (linha '+vis.get(k)+').'};vis.set(k,r.linha);
  const e=ex.get(k);
  if(e){const dif=[];if(e.categoria!==cat)dif.push('categoria '+e.categoria+' → '+cat);if(!!e.nao_util!==nu)dif.push('dia não útil '+(e.nao_util?'Sim':'Não')+' → '+(nu?'Sim':'Não'));
   return{...o,estado:'ign',motivo:dif.length?'Já cadastrada com valores diferentes ('+dif.join('; ')+'). Não foi alterada: corrija pelo botão Editar, se for o caso.':'Já cadastrada.'}}
  return{...o,estado:'novo',aviso:padrao?'Dia não útil não informado: considerado '+(nu?'Sim':'Não')+' pela categoria.':'',payload:{linha:r.linha,data:d,nome,escopo:esc_,categoria:cat,nao_util:nu,fonte:String(r.fonte||'').trim()||null,observacao:String(r.obs||'').trim()||null}}})}

async function importar(f){const R=$('#cal_ip');R.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{const rows=await lerArquivo(f),res=validar(rows),N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej'),lb={novo:'Nova',ign:'Ignorada',rej:'Rejeitada'},cl={novo:'blue',ign:'',rej:'red'};
  R.innerHTML=`<div class="card"><h3 style="margin-top:0">Prévia da importação</h3><p>${res.length} linha(s) — nada foi gravado ainda. Datas já cadastradas <b>não são alteradas</b>.</p>
  <div class="kpis"><div class="card kpi"><b>${N.length}</b>Novas</div><div class="card kpi"><b>${I.length}</b>Ignoradas</div><div class="card kpi al"><b>${J.length}</b>Rejeitadas</div></div>
  <div class="wrap" style="max-height:340px;overflow:auto"><table style="min-width:600px"><thead><tr><th>Linha</th><th>Data e nome</th><th>Situação</th><th>Motivo ou aviso</th></tr></thead><tbody>${res.slice(0,500).map(a=>`<tr><td>${a.linha}</td><td>${esc(a.resumo)}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${esc(a.motivo||a.aviso||'')}</td></tr>`).join('')}</tbody></table></div>
  <div class="err hide" id="cal_ie"></div><div class="acts"><button class="sec" id="cal_ix">Cancelar</button><button class="btn" id="cal_iok" ${N.length?'':'disabled'}>Importar ${N.length} data(s) nova(s)</button></div></div>`;
  $('#cal_ix').onclick=()=>{R.innerHTML=''};
  $('#cal_iok').onclick=async()=>{if(!confirm('Importar '+N.length+' data(s) nova(s)? '+I.length+' serão ignoradas e '+J.length+' rejeitadas.'))return;const b=$('#cal_iok');b.disabled=true;
   const env=a=>({linha:a.linha,motivo:a.motivo});
   const{data,error}=await sb.rpc('importar_calendario',{p_arquivo:f.name,p_linhas:N.map(a=>a.payload),p_rejeitados:J.map(env),p_ignorados:I.map(env)});
   if(error){b.disabled=false;const e=$('#cal_ie');e.textContent=msg(error);e.classList.remove('hide');return}
   toast('Importação concluída: '+data.importados+' nova(s), '+data.ignorados+' ignorada(s), '+data.rejeitados+' rejeitada(s).');await telaCal()}
 }catch(e){R.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}

/* ---------- liga no menu "Feriados" (substitui a lista simples; os dados são os mesmos) ---------- */
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-v="feriados"]');if(!t||!t.closest('#menu'))return;
 e.stopPropagation();e.preventDefault();document.body.classList.remove('open');telaCal()},true);
window.__calTeste={validar,parseData,mapEsc,mapCat,mapSN,telaCal};
})()}catch(e){window.__calErro=e;console.error('Calendário não carregou:',e);try{toast('Calendário não carregou: '+e.message)}catch(x){}}
