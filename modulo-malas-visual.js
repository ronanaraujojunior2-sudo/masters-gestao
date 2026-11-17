/* MASTERS GESTÃO - Malas e Malões: listagem por funcionário com "+" para ver as ferramentas na própria linha.
   Substitui só a APARÊNCIA das telas "Malões" e "Malas individuais": os cadastros, o botão "Conteúdo" (adicionar/retirar itens),
   o histórico de retiradas e a "Consulta por profissional" continuam os mesmos. Nada é gravado por este arquivo ao consultar.
   Cada linha mostra: funcionário · mala/malão · "+" ao lado do nome. O "+" abre a área logo abaixo da linha (o "−" recolhe);
   cada linha abre e fecha sozinha. A área mostra só os itens VINCULADOS agora: nome, código patrimonial, quantidade, conservação e disponibilidade.
   Ferramenta baixada, extraviada, em manutenção, em transferência ou em outra obra aparece como INDISPONÍVEL (nunca como disponível).
   Carregar DEPOIS de modulo-malas.js (e dos demais módulos). Não precisa de SQL novo. */
try{(function(){
if(typeof E==='undefined'||!E.malas||!E.maloes)throw new Error('modulo-malas.js precisa ser carregado antes deste arquivo.');
const nf=n=>Number(n==null?0:n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const fd=d=>d?new Date(String(d).slice(0,10)+'T00:00').toLocaleDateString('pt-BR'):'—';
const fdh=d=>d?new Date(d).toLocaleString('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const IND=['Em manutenção','Extraviada','Baixada','Em transferência'];
const ABERTOS=new Set();              /* linhas abertas (continuam abertas depois de editar/atualizar) */
let DADOS=null,FILTRO={tipo:'',obra:'',q:''};

function estilo(){if(document.getElementById('mm_css'))return;const s=document.createElement('style');s.id='mm_css';
 s.textContent='.mm-l{list-style:none;margin:10px 0 0;padding:0}.mm-it{background:var(--surf,#fff);border:1px solid var(--line,#C9D0E8);border-radius:12px;margin:0 0 8px;overflow:hidden}'+
 '.mm-hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 12px;cursor:pointer;min-height:56px}.mm-hd:hover{background:var(--soft,#E3E8F6)}'+
 '.mm-b{min-width:44px;min-height:44px;font-size:22px;font-weight:700;line-height:1;flex:none}'+
 '.mm-nm{flex:2 1 170px;min-width:0}.mm-nm b{display:block;font-size:16px;overflow-wrap:anywhere}.mm-nm .hint,.mm-id .hint{display:block;font-size:13px}'+
 '.mm-id{flex:1 1 150px;min-width:0;overflow-wrap:anywhere}.mm-id b{font-size:15px}.mm-sm{flex:0 1 auto;font-size:13px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}'+
 '.mm-dt{padding:4px 12px 12px;border-top:1px solid var(--line,#C9D0E8);background:var(--soft,#E3E8F6)}.mm-dt.hide,.mm-it.hide{display:none}'+
 '.mm-ac{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.mm-dt table{width:100%;min-width:0}.mm-dt th{text-align:left;font-size:13px}.mm-dt td{vertical-align:top}'+
 '.mm-x td:first-child{box-shadow:inset 4px 0 0 var(--red,#FC0A0B)}.mm-dt .hint{display:block;font-size:13px}.mm-dt details summary{cursor:pointer;font-weight:600;font-size:14px;padding:8px 0;min-height:40px}'+
 '.mm-fb{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:8px 0}.mm-fb>div{flex:1 1 180px;min-width:0}.mm-fb select,.mm-fb input{width:100%;box-sizing:border-box}'+
 '@media(max-width:640px){.mm-dt table,.mm-dt thead,.mm-dt tbody,.mm-dt tr,.mm-dt td{display:block;width:100%;box-sizing:border-box}.mm-dt thead{display:none}'+
 '.mm-dt tr{background:var(--surf,#fff);border:1px solid var(--line,#C9D0E8);border-radius:10px;margin:8px 0;padding:6px 10px}.mm-dt td{padding:3px 0;border:0}.mm-dt td[data-l]::before{content:attr(data-l)": ";font-weight:600;font-size:13px}'+
 '.mm-x{border-left:4px solid var(--red,#FC0A0B)!important}.mm-x td:first-child{box-shadow:none}}';
 document.head.appendChild(s)}

/* ---------- regra de disponibilidade (nunca mostra como disponível o que não está) ---------- */
function disp(i,obraRec,fu){
 const f=i.ferramentas;
 if(!f&&i.ferramenta_id)return{txt:'Em outra obra (sem acesso) · indisponível',cls:'red',ind:true};
 if(!f)return{txt:'Material de consumo',cls:'',ind:false};
 if(IND.includes(f.situacao))return{txt:f.situacao+' · indisponível',cls:'red',ind:true};
 if(f.obra_id&&obraRec&&f.obra_id!==obraRec)return{txt:'Em outra obra · indisponível',cls:'red',ind:true};
 if(f.situacao==='Em uso'){const r=f.responsavel_id&&fu[f.responsavel_id];return{txt:'Em uso'+(r?' com '+r.nome:''),cls:'',ind:false}}
 return{txt:'Disponível',cls:'blue',ind:false}}

/* ---------- leitura ---------- */
async function paginar(montar){let a=[],i=0;for(;;){const{data,error}=await montar().range(i,i+999);if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function carregar(){
 const[mal,mlo,fu,ob,it]=await Promise.all([
  paginar(()=>sb.from('malas').select('*').order('identificacao')),
  paginar(()=>sb.from('maloes').select('*').order('codigo')),
  paginar(()=>sb.from('funcionarios').select('id,nome,matricula,obra_id').order('nome')),
  paginar(()=>sb.from('obras').select('id,nome').order('nome')),
  paginar(()=>sb.from('itens_recipiente').select('id,malao_id,mala_id,ferramenta_id,quantidade,ferramentas(situacao,obra_id)').is('retirado_em',null).order('id'))]);
 const FU={},OB={};fu.forEach(x=>FU[x.id]=x);ob.forEach(x=>OB[x.id]=x);
 const linhas=[];
 mal.forEach(m=>{const f=FU[m.funcionario_id];linhas.push({k:'mala:'+m.id,tipo:'malas',tn:'Mala',id:m.id,raw:m,nome:f?f.nome:'(funcionário não encontrado)',mat:f?f.matricula:'',ident:m.identificacao,obra_id:m.obra_id,ativo:m.ativo,col:'mala_id'})});
 mlo.forEach(m=>{const f=m.responsavel_id&&FU[m.responsavel_id];linhas.push({k:'malao:'+m.id,tipo:'maloes',tn:'Malão',id:m.id,raw:m,nome:f?f.nome:'Sem responsável',mat:f?f.matricula:'',ident:m.codigo+' — '+m.identificacao,obra_id:m.obra_id,ativo:m.ativo,col:'malao_id',semResp:!f})});
 /* resumo por recipiente: ferramentas contadas uma vez só (sem duplicar) */
 const R={};linhas.forEach(l=>R[l.k]={n:0,ind:0,vistos:new Set()});
 it.forEach(x=>{const k=x.malao_id?'malao:'+x.malao_id:'mala:'+x.mala_id,r=R[k];if(!r)return;
  if(x.ferramenta_id){if(r.vistos.has(x.ferramenta_id))return;r.vistos.add(x.ferramenta_id)}
  const l=linhas.find(y=>y.k===k),f=x.ferramentas;r.n++;if((!f&&x.ferramenta_id)||(f&&(IND.includes(f.situacao)||(f.obra_id&&l&&f.obra_id!==l.obra_id))))r.ind++});
 linhas.forEach(l=>{l.n=R[l.k].n;l.ind=R[l.k].ind});
 linhas.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR')||String(a.ident).localeCompare(String(b.ident),'pt-BR',{numeric:true}));
 return{linhas,FU,OB,obras:ob}}

async function lerItens(l){
 const{data,error}=await sb.from('itens_recipiente').select('*, ferramentas(nome,codigo_patrimonial,situacao,conservacao,obra_id,responsavel_id), materiais(codigo,descricao,unidade)').eq(l.col,l.id).order('criado_em');
 if(error)throw error;return data||[]}

/* ---------- desenho ---------- */
function detalheHtml(l,itens){
 const pode=canW(E[l.tipo]);
 const vivos=[],vistos=new Set();
 itens.filter(i=>!i.retirado_em).forEach(i=>{if(i.ferramenta_id){if(vistos.has(i.ferramenta_id))return;vistos.add(i.ferramenta_id)}vivos.push(i)});
 const hist=itens.filter(i=>i.retirado_em);
 vivos.sort((a,b)=>(!!b.ferramentas-!!a.ferramentas)||String((a.ferramentas||a.materiais||{}).nome||(a.materiais||{}).descricao||'').localeCompare(String((b.ferramentas||b.materiais||{}).nome||(b.materiais||{}).descricao||''),'pt-BR'));
 const FU=DADOS.FU;
 const lin=vivos.map(i=>{const f=i.ferramentas,m=i.materiais,d=disp(i,l.obra_id,FU);
  return '<tr class="'+(d.ind?'mm-x':'')+'"><td data-l="Item"><b>'+esc(f?f.nome:(m?m.descricao:(i.ferramenta_id?'Ferramenta de outra obra':'—')))+'</b></td>'+
   '<td data-l="Código / identificação">'+esc(f?f.codigo_patrimonial:(m&&m.codigo)||'—')+'</td>'+
   '<td data-l="Quantidade">'+((f||i.ferramenta_id)?'1':nf(i.quantidade)+' '+esc(m?m.unidade:''))+'</td>'+
   '<td data-l="Conservação">'+(f?esc(f.conservacao||'—'):'—')+'</td>'+
   '<td data-l="Disponibilidade"><span class="chip '+d.cls+'">'+esc(d.txt)+'</span></td></tr>'}).join('');
 const tabela=vivos.length?'<div class="wrap"><table><thead><tr><th>Item</th><th>Código / identificação</th><th>Qtd.</th><th>Conservação</th><th>Disponibilidade</th></tr></thead><tbody>'+lin+'</tbody></table></div>':
  '<p class="empty" style="margin:10px 0">Nenhum item vinculado agora.</p>';
 const h=hist.length?'<details><summary>Histórico de itens retirados ('+hist.length+')</summary>'+hist.map(i=>{const f=i.ferramentas,m=i.materiais;
  return '<div class="mv"><b>'+esc(f?f.nome:(m?m.descricao:'—'))+'</b> '+(f?'('+esc(f.codigo_patrimonial)+')':'— '+nf(i.quantidade)+' '+esc(m?m.unidade:''))+'<span class="hint">Entregue em '+fd(i.data_entrega)+' · retirado em '+fdh(i.retirado_em)+'</span></div>'}).join('')+'</details>':'';
 return '<div class="mm-ac"><button type="button" class="mini" data-c="'+l.tipo+'" data-id="'+l.id+'">Conteúdo: adicionar ou retirar</button>'+(pode?'<button type="button" class="mini" data-mm-ed="'+l.k+'">Editar cadastro</button>':'')+'</div>'+
  '<div class="hint" style="margin:0 0 4px">Itens vinculados agora ('+vivos.length+'). Ferramenta baixada, em manutenção, em transferência ou em outra obra aparece como indisponível.</div>'+tabela+h}
  
function linhaHtml(l){
 const ob=DADOS.OB[l.obra_id];
 return '<li class="mm-it" data-k="'+esc(l.k)+'"><div class="mm-hd" role="presentation">'+
  '<button type="button" class="mini mm-b" aria-expanded="false" aria-label="Ver ferramentas de '+esc(l.nome)+'" title="Ver ferramentas">+</button>'+
  '<div class="mm-nm"><b>'+esc(l.nome)+'</b><span class="hint">'+(l.mat?'Matrícula '+esc(l.mat)+' · ':'')+esc(ob?ob.nome:'—')+(l.ativo===false?' · inativo':'')+'</span></div>'+
  '<div class="mm-id"><span class="chip">'+l.tn+'</span> <b>'+esc(l.ident)+'</b></div>'+
  '<div class="mm-sm"><span>'+l.n+' '+(l.n===1?'item':'itens')+'</span>'+(l.ind?'<span class="chip red">'+l.ind+' '+(l.ind===1?'indisponível':'indisponíveis')+'</span>':'')+'</div></div>'+
  '<div class="mm-dt hide"></div></li>'}

function filtrar(){
 const q=FILTRO.q.trim().toLowerCase();
 document.querySelectorAll('#view .mm-it').forEach(li=>{const l=DADOS.linhas.find(x=>x.k===li.dataset.k);if(!l)return;
  const txt=(l.nome+' '+l.mat+' '+l.ident+' '+l.tn).toLowerCase();
  const off=(FILTRO.tipo&&l.tipo!==FILTRO.tipo)||(FILTRO.obra&&l.obra_id!==FILTRO.obra)||(q&&!txt.includes(q));li.classList.toggle('hide',!!off)});
 const n=[...document.querySelectorAll('#view .mm-it')].filter(li=>!li.classList.contains('hide')).length,s=document.getElementById('mm_n');if(s)s.textContent=n+' de '+DADOS.linhas.length+' exibido(s)'}

async function abrir(li,forcar){
 const l=DADOS.linhas.find(x=>x.k===li.dataset.k),dt=li.querySelector('.mm-dt'),b=li.querySelector('.mm-b');if(!l)return;
 dt.classList.remove('hide');b.textContent='−';b.setAttribute('aria-expanded','true');ABERTOS.add(l.k);
 if(!dt.innerHTML)dt.innerHTML='<p class="hint" style="margin:10px 0">Carregando itens…</p>';
 try{const it=await lerItens(l);if(!document.body.contains(li)||li.querySelector('.mm-b').getAttribute('aria-expanded')!=='true')return;dt.innerHTML=detalheHtml(l,it);window.__mmAbertas=(window.__mmAbertas||0)+1}
 catch(e){dt.innerHTML='<p class="hint" style="color:var(--red,#FC0A0B)">Não foi possível carregar os itens: '+esc(msg(e))+'</p>'}}
function fechar(li){const dt=li.querySelector('.mm-dt'),b=li.querySelector('.mm-b');dt.classList.add('hide');b.textContent='+';b.setAttribute('aria-expanded','false');ABERTOS.delete(li.dataset.k)}

async function tela(nome){
 cur=nome;mark();estilo();const v=$('#view');
 v.innerHTML='<h1>Malas e malões</h1><p class="sub">Carregando…</p>';
 try{DADOS=await carregar()}catch(e){v.innerHTML='<h1>Malas e malões</h1><div class="err">'+esc(msg(e))+'</div>';return}
 FILTRO={tipo:nome==='maloes'?'maloes':nome==='malas'?'malas':'',obra:'',q:''};
 const pM=canW(E.malas),pL=canW(E.maloes);
 const obras=DADOS.obras;
 v.innerHTML='<h1>Malas e malões</h1><p class="sub">Toque no <b>+</b> ao lado do nome para ver as ferramentas e os materiais de cada mala ou malão, sem sair da tela.</p>'+
  '<div class="bar">'+(pM?'<button class="btn" id="mm_nm">'+E.malas.btn+'</button>':'')+(pL?'<button class="btn" id="mm_nl">'+E.maloes.btn+'</button>':'')+'</div>'+
  '<div class="mm-fb"><div><label class="fl" for="mm_q" style="margin-top:0">Pesquisar</label><input id="mm_q" type="search" placeholder="Nome, matrícula, mala ou malão" aria-label="Pesquisar"></div>'+
  '<div><label class="fl" for="mm_t" style="margin-top:0">Mostrar</label><select id="mm_t"><option value="">Malas e malões</option><option value="malas">Só malas individuais</option><option value="maloes">Só malões</option></select></div>'+
  (obras.length>1?'<div><label class="fl" for="mm_o" style="margin-top:0">Obra</label><select id="mm_o"><option value="">Todas as obras</option>'+obras.map(o=>'<option value="'+o.id+'">'+esc(o.nome)+'</option>').join('')+'</select></div>':'')+'</div>'+
  '<p class="hint" id="mm_n"></p>'+
  (DADOS.linhas.length?'<ul class="mm-l">'+DADOS.linhas.map(linhaHtml).join('')+'</ul>':'<div class="card"><p class="empty">Nenhuma mala ou malão cadastrado ainda.</p></div>');
 $('#mm_t').value=FILTRO.tipo;
 if($('#mm_nm'))$('#mm_nm').onclick=()=>form('malas');if($('#mm_nl'))$('#mm_nl').onclick=()=>form('maloes');
 $('#mm_q').oninput=e=>{FILTRO.q=e.target.value;filtrar()};$('#mm_t').onchange=e=>{FILTRO.tipo=e.target.value;filtrar()};if($('#mm_o'))$('#mm_o').onchange=e=>{FILTRO.obra=e.target.value;filtrar()};
 v.querySelector('.mm-l')&&v.querySelector('.mm-l').addEventListener('click',e=>{
  const ed=e.target.closest('[data-mm-ed]');if(ed){const l=DADOS.linhas.find(x=>x.k===ed.dataset.mmEd);if(l)form(l.tipo,l.raw);return}
  if(e.target.closest('[data-c]'))return;                       /* o botão "Conteúdo" é tratado pelo modulo-malas.js */
  const hd=e.target.closest('.mm-hd');if(!hd)return;const li=hd.closest('.mm-it'),b=li.querySelector('.mm-b');
  if(b.getAttribute('aria-expanded')==='true')fechar(li);else abrir(li)});
 filtrar();
 [...ABERTOS].forEach(k=>{const li=v.querySelector('.mm-it[data-k="'+k+'"]');if(li)abrir(li,true);else ABERTOS.delete(k)});
 window.__mmOk=(window.__mmOk||0)+1}

/* as telas "Malões" e "Malas individuais" passam a usar a nova listagem */
const _show=show;
show=function(name){if(name==='maloes'||name==='malas')return tela(name);return _show.apply(this,arguments)};
/* depois de mexer no conteúdo (janela "Conteúdo") ou em um cadastro, a listagem se atualiza sem fechar as linhas abertas */
const dlg=document.getElementById('dlg');
if(dlg)dlg.addEventListener('close',()=>{if((cur==='malas'||cur==='maloes')&&DADOS&&document.querySelector('#view .mm-l'))atualizar()});
async function atualizar(){
 try{const novo=await carregar();DADOS=novo;
  document.querySelectorAll('#view .mm-it').forEach(li=>{const l=DADOS.linhas.find(x=>x.k===li.dataset.k);if(!l)return;
   const sm=li.querySelector('.mm-sm');if(sm)sm.innerHTML='<span>'+l.n+' '+(l.n===1?'item':'itens')+'</span>'+(l.ind?'<span class="chip red">'+l.ind+' '+(l.ind===1?'indisponível':'indisponíveis')+'</span>':'');
   if(li.querySelector('.mm-b').getAttribute('aria-expanded')==='true')abrir(li,true)})}
 catch(e){window.__mmErro=e}}
window.__mmTeste={disp,detalheHtml,tela,atualizar};
})()}catch(e){window.__mmErro0=e;console.error('Malas e malões (visual) não carregou:',e)}
