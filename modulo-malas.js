/* MASTERS GESTÃO - Módulo 3B-2: Malões, Malas individuais e Consulta por profissional.
   Este arquivo se acopla ao index.html existente, sem substituí-lo. */

/* ===== cadastros (usam a mesma tela dos demais cadastros) ===== */
E.maloes={p:'Malões',btn:'Cadastrar malão',vazio:'Nenhum malão cadastrado ainda.',cols:['codigo','identificacao','obra_id','responsavel_id'],f:[
 {k:'codigo',l:'Código do malão',r:1,h:'Não pode repetir.'},{k:'identificacao',l:'Nome ou identificação',r:1},
 {k:'obra_id',l:'Obra',r:1,t:'ref',ref:'obras',lab:'nome'},
 {k:'responsavel_id',l:'Responsável',t:'ref',ref:'funcionarios',lab:'nome'},
 {k:'disciplina_id',l:'Disciplina',t:'ref',ref:'disciplinas',lab:'nome'},
 {k:'ativo',l:'Em uso',t:'bool',d:true}]};
E.malas={p:'Malas individuais',btn:'Cadastrar mala',vazio:'Nenhuma mala cadastrada ainda.',cols:['identificacao','funcionario_id','obra_id','data_entrega'],f:[
 {k:'identificacao',l:'Identificação da mala',r:1,h:'Não pode repetir.'},
 {k:'funcionario_id',l:'Profissional',r:1,t:'ref',ref:'funcionarios',lab:'nome'},
 {k:'obra_id',l:'Obra',r:1,t:'ref',ref:'obras',lab:'nome'},
 {k:'responsavel_id',l:'Responsável pela entrega',t:'ref',ref:'funcionarios',lab:'nome'},
 {k:'data_entrega',l:'Data de entrega',t:'date'},{k:'ativo',l:'Em uso',t:'bool',d:true}]};

/* ===== botão Conteúdo nas listas ===== */
const _acts=acts;
acts=function(n,r){let h=_acts(n,r);
 if(n==='maloes'||n==='malas')h='<button class="mini" data-c="'+n+'" data-id="'+r.id+'">Conteúdo</button>'+h;return h};
document.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b)conteudo(b.dataset.c,b.dataset.id)});

/* ===== menu ===== */
const _menu=menu;
menu=function(){_menu();const m=$('#menu');
 const h=[...m.querySelectorAll('h4')].find(x=>x.textContent==='Em breve');
 const s=[...m.querySelectorAll('.soon')].find(x=>x.textContent==='Malões e malas');if(s)s.remove();
 if(h)h.insertAdjacentHTML('beforebegin','<h4>Malões e malas</h4><button class="nav" data-v="maloes">Malões</button><button class="nav" data-v="malas">Malas individuais</button><button class="nav" data-v="consulta">Consulta por profissional</button>');
 m.querySelectorAll('.nav').forEach(n=>n.onclick=()=>n.dataset.v==='painel'?painel():n.dataset.v==='consulta'?consulta():show(n.dataset.v))};

/* ===== conteúdo de um malão ou mala ===== */
const MSG_DUP='Este item já está dentro de um malão ou mala. Retire-o de lá antes.';
async function conteudo(name,id){
 const col=name==='maloes'?'malao_id':'mala_id';
 const[{data:c,error:e1},{data:it,error:e2}]=await Promise.all([
  sb.from(name).select('*').eq('id',id).single(),
  sb.from('itens_recipiente').select('*, ferramentas(nome,codigo_patrimonial,situacao), materiais(descricao,unidade)').eq(col,id).order('criado_em')]);
 if(e1||e2){toast(msg(e1||e2));return}
 const dentro=it.filter(i=>!i.retirado_em),fora=it.filter(i=>i.retirado_em),pode=canW(E[name]);
 const nome=n=>i=>i.ferramentas?`<b>${esc(i.ferramentas.nome)}</b> (${esc(i.ferramentas.codigo_patrimonial)})`+(/Extraviada|Baixada|manuten/.test(i.ferramentas.situacao)?` <span class="chip red">${esc(i.ferramentas.situacao)}</span>`:''):`<b>${esc(i.materiais.descricao)}</b> — ${i.quantidade} ${esc(i.materiais.unidade)}`;
 const linha=i=>`<div class="mv">${nome()(i)}${pode&&!i.retirado_em?` <button class="mini" style="float:right" data-rm="${i.id}">Retirar</button>`:''}${i.retirado_em?`<br><span class="hint">Retirado em ${new Date(i.retirado_em).toLocaleString('pt-BR')}</span>`:''}</div>`;
 modal(name==='maloes'?'Malão '+esc(c.codigo)+' — '+esc(c.identificacao):'Mala '+esc(c.identificacao),
  (pode?'<div class="bar"><button class="btn" id="at">Adicionar ferramenta</button><button class="btn" id="am">Adicionar material</button></div>':'')+
  '<h3>Itens dentro agora ('+dentro.length+')</h3>'+(dentro.length?dentro.map(linha).join(''):'<p class="empty">Nada cadastrado neste item ainda.</p>')+
  (fora.length?'<h3>Itens retirados (histórico)</h3>'+fora.map(linha).join(''):''));
 const reabrir=()=>setTimeout(()=>conteudo(name,id),60);
 if($('#at'))$('#at').onclick=()=>addFerr(name,col,c,reabrir);
 if($('#am'))$('#am').onclick=()=>addMat(col,c.id,reabrir);
 document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{
  if(!confirm('Retirar este item? O registro continua no histórico.'))return;
  const{error}=await sb.from('itens_recipiente').update({retirado_em:new Date().toISOString(),retirado_por:me.id}).eq('id',b.dataset.rm);
  if(error)toast(msg(error));else{toast('Item retirado.');conteudo(name,id)}})}

async function addFerr(name,col,c,reabrir){
 const[{data:fs},{data:usados}]=await Promise.all([
  sb.from('ferramentas').select('id,nome,codigo_patrimonial').eq('obra_id',c.obra_id).not('situacao','in','("Baixada","Extraviada")').order('nome'),
  sb.from('itens_recipiente').select('ferramenta_id').not('ferramenta_id','is',null).is('retirado_em',null)]);
 const livres=(fs||[]).filter(f=>!(usados||[]).some(u=>u.ferramenta_id===f.id));
 if(!livres.length){toast('Não há ferramentas livres nesta obra. Cadastre antes em Ferramentas.');return}
 modal('Adicionar ferramenta',`<label class="fl" for="af">Ferramenta <b class="rq">*</b></label><select id="af"><option value="">Selecione…</option>${livres.map(f=>`<option value="${f.id}">${esc(f.nome)} (${esc(f.codigo_patrimonial)})</option>`).join('')}</select><div class="hint">Aparecem só as ferramentas desta obra que não estão em outro malão ou mala.</div>`,'Adicionar',async()=>{
  const v=$('#af').value;if(!v)return 'Escolha a ferramenta.';
  const{error}=await sb.from('itens_recipiente').insert({[col]:c.id,ferramenta_id:v,quantidade:1});
  if(error)return error.code==='23505'?MSG_DUP:msg(error);
  toast('Ferramenta adicionada.');reabrir()})}

async function addMat(col,id,reabrir){
 const{data:ms}=await sb.from('materiais').select('id,codigo,descricao,unidade').eq('ativo',true).order('descricao');
 if(!ms||!ms.length){toast('Cadastre antes os materiais em Materiais.');return}
 modal('Adicionar material',`<label class="fl" for="am1">Material <b class="rq">*</b></label><select id="am1"><option value="">Selecione…</option>${ms.map(m=>`<option value="${m.id}">${esc(m.descricao)} (${esc(m.codigo)}) — ${esc(m.unidade)}</option>`).join('')}</select><label class="fl" for="am2">Quantidade <b class="rq">*</b></label><input id="am2" type="number" step="any" min="0" inputmode="decimal">`,'Adicionar',async()=>{
  const m=$('#am1').value,q=Number($('#am2').value);
  if(!m)return 'Escolha o material.';if(!(q>0))return 'Informe uma quantidade maior que zero.';
  const{error}=await sb.from('itens_recipiente').insert({[col]:id,material_id:m,quantidade:q});
  if(error)return error.code==='23505'?'Este material já está aqui. Retire-o e adicione de novo com a quantidade correta.':msg(error);
  toast('Material adicionado.');reabrir()})}

/* ===== consulta por profissional ===== */
async function consulta(){cur='consulta';mark();const v=$('#view');
 v.innerHTML='<h1>Consulta por profissional</h1><p class="sub">Carregando…</p>';
 const[{data:ob},{data:di},{data:fu}]=await Promise.all([sb.from('obras').select('id,nome').order('nome'),sb.from('disciplinas').select('id,nome').order('nome'),sb.from('funcionarios').select('id,nome,matricula,obra_id,disciplina_id').order('nome')]);
 const op=(L,k)=>L.map(x=>`<option value="${x.id}">${esc(x[k])}</option>`).join('');
 v.innerHTML=`<h1>Consulta por profissional</h1><p class="sub">Escolha a pessoa para ver tudo o que está sob a responsabilidade dela.</p>
 <div class="card"><label class="fl" for="c_o" style="margin-top:0">Obra</label><select id="c_o"><option value="">Todas</option>${op(ob||[],'nome')}</select>
 <label class="fl" for="c_d">Disciplina</label><select id="c_d"><option value="">Todas</option>${op(di||[],'nome')}</select>
 <label class="fl" for="c_p">Profissional</label><select id="c_p"></select></div><div id="res" style="margin-top:12px"></div>`;
 const lista=()=>{const o=$('#c_o').value,d=$('#c_d').value;const L=(fu||[]).filter(f=>(!o||f.obra_id===o)&&(!d||f.disciplina_id===d));
  $('#c_p').innerHTML=(L.length?'<option value="">Selecione…</option>'+L.map(f=>`<option value="${f.id}">${esc(f.nome)} (${esc(f.matricula)})</option>`).join(''):'<option value="">Nenhum funcionário encontrado</option>');$('#res').innerHTML=''};
 $('#c_o').onchange=lista;$('#c_d').onchange=lista;$('#c_p').onchange=()=>mostrar($('#c_p').value);lista()}

async function mostrar(fid){const r=$('#res');if(!fid){r.innerHTML='';return}r.innerHTML='<p class="sub">Carregando…</p>';
 const[{data:fer,error:e1},{data:mal},{data:mlo}]=await Promise.all([
  sb.from('ferramentas').select('codigo_patrimonial,nome').eq('responsavel_id',fid).eq('situacao','Em uso'),
  sb.from('malas').select('*').eq('funcionario_id',fid),sb.from('maloes').select('*').eq('responsavel_id',fid)]);
 if(e1){r.innerHTML=`<div class="err">${esc(msg(e1))}</div>`;return}
 const ids=[...(mal||[]).map(x=>'mala_id.eq.'+x.id),...(mlo||[]).map(x=>'malao_id.eq.'+x.id)];
 let it=[];if(ids.length){const q=await sb.from('itens_recipiente').select('*, ferramentas(nome,codigo_patrimonial,situacao), materiais(descricao,unidade)').or(ids.join(','));it=q.data||[]}
 const lin=i=>(i.ferramentas?`<b>${esc(i.ferramentas.nome)}</b> (${esc(i.ferramentas.codigo_patrimonial)})`+(/Extraviada|Baixada|manuten/.test(i.ferramentas.situacao)?` <span class="chip red">${esc(i.ferramentas.situacao)}</span>`:''):`<b>${esc(i.materiais.descricao)}</b> — ${i.quantidade} ${esc(i.materiais.unidade)}`);
 const bloco=(t,c,id,col)=>{const mine=it.filter(i=>i[col]===id),d=mine.filter(i=>!i.retirado_em),f=mine.filter(i=>i.retirado_em);
  return `<div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">${t}</h3>`+(d.length?d.map(i=>`<div class="mv">${lin(i)}</div>`).join(''):'<p class="empty">Sem itens agora.</p>')+
  (f.length?'<p class="hint" style="margin-top:12px">Já retirados:</p>'+f.map(i=>`<div class="mv">${lin(i)}<br><span class="hint">Retirado em ${new Date(i.retirado_em).toLocaleDateString('pt-BR')}</span></div>`).join(''):'')+'</div>'};
 r.innerHTML=`<div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">Ferramentas retiradas e ainda em uso (${(fer||[]).length})</h3>`+((fer||[]).length?fer.map(f=>`<div class="mv"><b>${esc(f.nome)}</b> (${esc(f.codigo_patrimonial)})</div>`).join(''):'<p class="empty">Nenhuma ferramenta retirada no momento.</p>')+'</div>'+
  (mal||[]).map(m=>bloco('Mala '+esc(m.identificacao)+(m.data_entrega?' — entregue em '+new Date(m.data_entrega+'T00:00').toLocaleDateString('pt-BR'):''),m,m.id,'mala_id')).join('')+
  (mlo||[]).map(m=>bloco('Malão '+esc(m.codigo)+' — '+esc(m.identificacao),m,m.id,'malao_id')).join('')+
  (!(mal||[]).length&&!(mlo||[]).length?'<p class="sub">Esta pessoa não tem mala nem malão cadastrados.</p>':'')}
