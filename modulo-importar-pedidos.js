/* MASTERS GESTÃO - Módulo 3B-6: importar Pedidos de Compra (relatório do Sienge).
   Antes de usar, rode no Supabase o SQL 08_importar_pedidos.
   A LEITURA do arquivo reconhece o relatório REAL "Pedido de Compra" do Sienge (função "achaPedidoSienge": blocos
   Dados do fornecedor / Dados da obra, tabela de insumos com Preço unit., Desc(R$) e Preço final) e, como reserva,
   tabelas simples com os nomes de coluna mais comuns (função "achaPedidos").
   Versão 4: a tela de importação agora fica dentro de "Solicitações e pedidos" (modulo-importacoes.js);
   este arquivo continua responsável por LER e CONFERIR o pedido. */
try{(function(){
if(!window.XLSX&&!document.querySelector('script[data-xls]')){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.setAttribute('data-xls','1');document.head.appendChild(s)}

/* ---------- utilidades ---------- */
const nz=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[º°]/g,'o').replace(/\*/g,'').toLowerCase().replace(/[^a-z0-9. ]/g,' ').replace(/\s+/g,' ').trim();
const nk=s=>nz(s).replace(/\./g,'');                       /* sem pontos: "Und." = "und" */
const dsc=s=>String(s==null?'':s).toLowerCase().trim().replace(/\s+/g,' ');
const vz=v=>String(v==null?'':v).trim()==='';
const fdt=d=>d?new Date(d+'T00:00').toLocaleDateString('pt-BR'):'—';
const mo=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const nf=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const num=v=>{if(typeof v==='number')return v;const s=String(v==null?'':v).replace(/R\$/gi,'').replace(/\s/g,'');if(!s)return NaN;
 const t=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;return /^-?\d+(\.\d+)?$/.test(t)?Number(t):NaN};
function parseData(v){let y,m,d;
 if(typeof v==='number'){const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate()}
 else{const s=String(v||'').trim();let k=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if(k){d=+k[1];m=+k[2];y=+k[3]}else{k=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!k)return null;y=+k[1];m=+k[2];d=+k[3]}}
 const t=new Date(Date.UTC(y,m-1,d));
 if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d||y<2000||y>2100)return null;
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}

/* ---------- LEITURA DO ARQUIVO DO SIENGE ---------- */
/* nomes que o Sienge usa nos campos do cabeçalho do pedido */
const CAB={
 numero:['pedido de compra','pedido','n pedido','n do pedido','numero do pedido','numero pedido','no pedido','ordem de compra','n ordem de compra'],
 requisicao:['solicitacao','solicitacao de compra','requisicao','n solicitacao','n da solicitacao','numero da solicitacao','n requisicao','n da requisicao','requisicao sienge','sc'],
 fornecedor:['fornecedor','nome do fornecedor','credor','razao social','nome fantasia'],
 cnpj:['cnpj','cnpj cpf','cpf cnpj','cnpj do fornecedor','cnpj fornecedor'],
 obra:['obra','nome da obra'],
 data:['data do pedido','data pedido','data de emissao','data emissao','emissao','data'],
 previsao:['previsao de entrega','previsao entrega','data de entrega','data prevista de entrega','entrega prevista','prazo de entrega','data de entrega prevista'],
 obs:['observacao','observacoes','obs']};
/* nomes das colunas da tabela de materiais */
const COL={
 insumo:['insumo','material','produto','descricao do insumo','descricao do material','descricao','item','insumo/servico','codigo e descricao'],
 codigo:['codigo','cod','codigo do insumo','codigo do material'],
 unidade:['und','un','unid','unidade','unidade de medida'],
 quantidade:['qtd','qtde','quantidade','qtd pedida','qtde pedida','quantidade pedida','qtd comprada','qtde comprada','qtd prevista'],
 unitario:['preco unitario','valor unitario','vlr unitario','vl unitario','preco unit','valor unit','vlr unit','custo unitario','preco'],
 total:['valor total','vlr total','vl total','preco total','total','valor do item','valor liquido','total do item'],
 numero:CAB.numero,requisicao:CAB.requisicao,fornecedor:CAB.fornecedor,cnpj:CAB.cnpj,data:CAB.data,previsao:CAB.previsao};
const ehRotulo=s=>{const k=nk(s);return !!k&&Object.values(CAB).some(L=>L.includes(k))};

function csv(t){const L=t.replace(/^﻿/,'').split(/\r?\n/);const f=L[0]||'';const d=f.split(';').length>=f.split(',').length?';':',';
 return L.filter(x=>x.trim()!=='').map(l=>{const o=[];let c='',q=false;
  for(let i=0;i<l.length;i++){const h=l[i];if(q){if(h==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===d){o.push(c);c=''}else c+=h}
  o.push(c);return o})}

function achaPedidos(arr,arq){
 /* 1) linha de títulos da tabela de materiais: tem uma coluna de material e uma de quantidade */
 let hi=-1,pos=null;
 for(let i=0;i<Math.min(arr.length,120);i++){const H=(arr[i]||[]).map(nk),p={};
  for(const c of ['insumo','quantidade','unidade','codigo','unitario','total','numero','requisicao','fornecedor','cnpj','data','previsao']){const j=H.findIndex(h=>h&&COL[c].includes(h));if(j>=0)p[c]=j}
  if(p.insumo!=null&&p.quantidade!=null&&p.insumo!==p.quantidade){hi=i;pos=p;break}}
 if(hi<0)return null;
 if(pos.unidade==null)throw new Error('Não encontrei a coluna da unidade ("Und.") na tabela de materiais do pedido.');
 /* 2) campos do cabeçalho do pedido: rótulo seguido do valor (acima da tabela) */
 const campo=c=>{const L=CAB[c];for(let i=0;i<hi;i++){const r=arr[i]||[];for(let j=0;j<r.length;j++){
   if(!vz(r[j])&&L.includes(nk(r[j]))){for(let k=j+1;k<r.length;k++){if(vz(r[k]))continue;if(ehRotulo(r[k]))break;return r[k]}}}}return ''};   /* título sem valor ao lado (ex.: "Pedido de Compra") é ignorado: continua procurando */
 const cab={};for(const c of Object.keys(CAB))cab[c]=campo(c);
 /* 3) linhas de materiais */
 const its=[];
 for(let i=hi+1;i<arr.length;i++){const r=arr[i]||[];
  if(vz(r[pos.insumo])&&vz(r[pos.quantidade])){if(pos.numero!=null||pos.requisicao!=null)continue;break}      /* tabela simples termina na linha em branco */
  if(/^total/.test(nk(r[pos.insumo]))||/^subtotal/.test(nk(r[pos.insumo])))break;
  its.push({i,r})}
 if(!its.length)throw new Error('Não encontrei materiais abaixo dos títulos da tabela.');
 const ob=String(cab.obra==null?'':cab.obra).trim(),mo2=ob.match(/^(\S+)\s+-\s+(.+)$/);
 return its.map(t=>{const r=t.r,g=c=>pos[c]==null?'':r[pos[c]];
  const ins=String(g('insumo')).trim(),m=pos.codigo==null?ins.match(/^(\S+)\s+-\s+(.+)$/):null;
  const pick=c=>vz(g(c))?cab[c]:g(c);
  return{linha:t.i+1,arq,v:{numero:pick('numero'),requisicao:pick('requisicao'),fornecedor:pick('fornecedor'),cnpj:pick('cnpj'),data:pick('data'),previsao:pick('previsao'),obs:cab.obs,
   obraNome:mo2?mo2[2]:ob,obraCodigo:mo2?mo2[1]:'',codigo:pos.codigo!=null?String(g('codigo')).trim():(m?m[1]:''),descricao:m?m[2]:ins,unidade:g('unidade'),quantidade:g('quantidade'),unitario:g('unitario'),total:g('total')}}})}

/* ---------- LEITURA DO RELATÓRIO REAL "PEDIDO DE COMPRA" DO SIENGE ---------- */
const tx=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const ROTPC=['no pedido','n pedido','data pedido','cotacoes','solicitacoes','solicitacao','nome','endereco','cnpj','telefone','ie','fax','e mail','end de cobranca','vendedor','home page','obra','local entrega','ponto referencia','cond pagamento','frete'];
function achaPedidoSienge(arr,arq){
 const A=arr||[];let hi=-1,pos={};
 for(let i=0;i<Math.min(A.length,150);i++){const H=(A[i]||[]).map(nk),f=(...n)=>H.findIndex(h=>h&&n.includes(h));
  const p={insumo:f('insumo'),qtd:f('quantidade'),un:f('unid','und','unidade'),unit:f('preco unit','preco unitario'),fin:f('preco final'),ent:f('data entrega'),desc:f('desc r'),pdesc:f('desc'),ipi:f('ipi'),acr:f('acr')};
  if(p.insumo>=0&&p.qtd>=0&&p.un>=0&&p.fin>=0){hi=i;pos=p;break}}
 if(hi<0)return null;
 const sec=k=>A.findIndex(r=>(r||[]).some(c=>nk(c)===k));
 const sFat=sec('dados do faturamento'),sFor=sec('dados do fornecedor'),sObra=sec('dados da obra');
 if(sFor<0||sObra<0)return null;                                  /* sem os blocos do relatório real: usa a leitura simples */
 const topo=sFat>=0?sFat:sFor;
 const valor=(rot,ini,fim)=>{for(let i=ini;i<fim;i++){const r=A[i]||[];for(let j=0;j<r.length;j++){
   if(!vz(r[j])&&rot.includes(nk(r[j]))){for(let k=j+1;k<r.length;k++){if(vz(r[k]))continue;if(ROTPC.includes(nk(r[k])))break;return r[k]}return ''}}}return ''};
 const numero=valor(['no pedido','n pedido','numero do pedido'],0,topo),data=valor(['data pedido'],0,topo),solic=valor(['solicitacoes','solicitacao','requisicao','requisicoes'],0,topo);
 if(vz(numero)&&vz(data))return null;
 const nomeF=tx(valor(['nome'],sFor,sObra)),mf=nomeF.match(/^(\d+)\s*-\s*(.+)$/),cnpj=valor(['cnpj'],sFor,sObra);
 const obra=tx(valor(['obra'],sObra,hi)),mo2=obra.match(/^(\d+)\s*-\s*(.+)$/);
 let obs='';const io=A.findIndex((r,i)=>i>hi&&(r||[]).some(c=>nk(c)==='observacoes'));
 if(io>=0){const L=[];for(let i=io+1;i<A.length;i++){const c=(A[i]||[]).find(x=>!vz(x));if(c===undefined)break;L.push(tx(c))}obs=L.join(' ')}
 const totalMerc=valor(['total das mercadorias'],hi,A.length);
 const nm=v=>{const n=num(v);return Number.isFinite(n)?n:0};
 const its=[];for(let i=hi+1;i<A.length;i++){const r=A[i]||[];if(vz(r[pos.insumo])||/^total/.test(nk(r[pos.insumo])))break;its.push({i,r})}
 if(!its.length)throw new Error('Não encontrei materiais abaixo dos títulos da tabela.');
 const datas=its.map(t=>pos.ent>=0?parseData(t.r[pos.ent]):null).filter(Boolean).sort(),previsao=datas.length?datas[datas.length-1]:'';
 const reqNums=[...new Set(String(solic).match(/\d+/g)||[])],requisicao=reqNums.length===1?reqNums[0]:tx(solic);
 return its.map(t=>{const r=t.r,ins=tx(r[pos.insumo]),m=ins.match(/^(\S+)\s+-\s+(.+)$/);
  return{linha:t.i+1,arq,v:{numero:tx(numero),requisicao,fornecedor:mf?mf[2]:nomeF,fornecedorCodigo:mf?mf[1]:'',cnpj:tx(cnpj),data:tx(data),previsao,obs,
   obraNome:mo2?mo2[2]:obra,obraCodigo:mo2?mo2[1]:'',codigo:m?m[1]:'',descricao:m?m[2]:ins,unidade:tx(r[pos.un]),quantidade:r[pos.qtd],
   unitario:pos.unit>=0?r[pos.unit]:'',total:r[pos.fin],ajustes:[pos.desc,pos.pdesc,pos.ipi,pos.acr].some(c=>c>=0&&nm(r[c])!==0),totalMerc}}})}

async function ler(file){const n=file.name.toLowerCase();let planilhas;
 if(n.endsWith('.csv')){const b=await file.arrayBuffer();let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch(e){t=new TextDecoder('windows-1252').decode(b)}planilhas=[csv(t)]}
 else if(n.endsWith('.xlsx')||n.endsWith('.xls')){const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});planilhas=wb.SheetNames.map(k=>XLSX.utils.sheet_to_json(wb.Sheets[k],{header:1,raw:true,defval:''}))}
 else throw new Error('Use o arquivo do Sienge em formato .xlsx ou .csv (se ele saiu em PDF, exporte em Excel).');
 for(const a of planilhas){const r=achaPedidoSienge(a,file.name)||achaPedidos(a,file.name);if(r){if(r.length>3000)throw new Error('O arquivo tem mais de 3000 linhas de material. Divida em arquivos menores.');return r}}
 throw new Error('Não reconheci este arquivo como Pedido de Compra do Sienge: não achei a tabela com as colunas de material e quantidade.')}

/* ---------- dados do sistema para conferir a prévia ---------- */
async function lerTudo(t,c,f){let a=[],i=0;for(;;){let q=sb.from(t).select(c).order('id').range(i,i+999);if(f)q=f(q);const{data,error}=await q;if(error)throw error;a=a.concat(data||[]);if(!data||data.length<1000)break;i+=1000}return a}
async function contexto(){
 const[ob,so,pc,fo,fe]=await Promise.all([lerTudo('obras','id,nome,codigo'),lerTudo('solicitacoes','id,numero_sienge,obra_id,status,data_aprovacao'),
  lerTudo('pedidos_compra','id,numero_pedido,solicitacao_id'),lerTudo('fornecedores','id,nome,cnpj'),lerTudo('feriados','id,data,obra_id,nao_util,ativo')]);
 const ids=so.map(s=>s.id),itens=[];
 for(let i=0;i<ids.length;i+=200){const d=await lerTudo('solicitacao_itens','id,solicitacao_id,quantidade,materiais(codigo,descricao,unidade)',q=>q.in('solicitacao_id',ids.slice(i,i+200)));itens.push(...d)}
 const pi=await lerTudo('pedido_itens','*');   /* '*' funciona com ou sem o SQL 15; qtd_atendimento: item de unidade divergente não regularizado não conta */
 const comprado={};pi.forEach(p=>comprado[p.solicitacao_item_id]=(comprado[p.solicitacao_item_id]||0)+Number(p.qtd_atendimento!=null?p.qtd_atendimento:p.quantidade));
 const solPorId=new Map(so.map(s=>[s.id,s]));
 return{obras:ob,sol:new Map(so.filter(s=>s.numero_sienge).map(s=>[nk(s.numero_sienge),s])),ped:new Set(pc.map(p=>p.solicitacao_id+'|'+nk(p.numero_pedido))),pedNum:new Map(pc.map(p=>[nk(p.numero_pedido),(solPorId.get(p.solicitacao_id)||{}).numero_sienge||'?'])),forn:fo,fer:fe,itens,comprado}}

/* previsão do sistema: 5 dias úteis (sem sábado, domingo e dias não úteis do calendário: só registros ativos marcados como dia não útil), igual à regra do banco */
function previsao(dataISO,obraId,fer){let d=new Date(dataISO+'T00:00:00Z'),c=0;
 while(c<5){d=new Date(d.getTime()+86400000);const w=d.getUTCDay(),s=d.toISOString().slice(0,10);
  if(w!==0&&w!==6&&!fer.some(f=>f.nao_util!==false&&f.ativo!==false&&f.data===s&&(!f.obra_id||f.obra_id===obraId)))c++}
 return d.toISOString().slice(0,10)}

/* ---------- validação (um pedido por vez) ---------- */
function validarPedido(g,x){const L=g.rows,ls=L.map(r=>r.linha).join(', '),arq=L[0].arq&&x.multi?' · '+L[0].arq:'';
 const base={linha:L[0].linha,arq:L[0].arq,num:g.n,resumo:'Pedido '+g.n+' (requisição '+g.req+')'+arq};
 const rej=m=>({...base,estado:'rej',motivo:m});
 const campo=c=>{const r=L.find(a=>!vz(a.v[c]));return r?r.v[c]:null};
 for(const[c,nm] of [['fornecedor','Fornecedor'],['data','Data do pedido']]){
  const vs=L.filter(r=>!vz(r.v[c])),val=r=>c==='data'?(parseData(r.v[c])||String(r.v[c])):nz(r.v[c]);
  const d=vs.find(r=>val(r)!==val(vs[0]));if(d)return rej(nm+' diferente entre as linhas '+vs[0].linha+' e '+d.linha+'.')}
 if(String(g.req).match(/\d+/g)&&new Set(String(g.req).match(/\d+/g)).size>1)return rej('Este pedido atende mais de uma solicitação ('+g.req+'). O sistema liga cada pedido a uma única solicitação, então ele não foi importado. Nada foi alterado.');
 const s=x.sol.get(nk(g.req));
 if(!s)return rej('A requisição '+g.req+' não está cadastrada no sistema. Importe antes a solicitação (Importar solicitações).');
 if(x.ped.has(s.id+'|'+nk(g.n)))return{...base,estado:'ign',motivo:'Pedido já cadastrado nesta requisição.'};
 if(x.pedNum&&x.pedNum.has(nk(g.n)))return rej('O pedido '+g.n+' já está cadastrado em outra requisição ('+x.pedNum.get(nk(g.n))+'). Um pedido não pode ser ligado a duas solicitações.');
 const forn=campo('fornecedor');if(vz(forn))return rej('Fornecedor não informado no arquivo.');
 const dp=campo('data');if(vz(dp))return rej('Data do pedido não informada.');
 const d1=parseData(dp);if(!d1)return rej('Data do pedido inválida. Use dia/mês/ano.');
 const obraArq=L[0].v.obraNome||L[0].v.obraCodigo;
 if(!vz(obraArq)){const o=x.obras.find(a=>a.id===s.obra_id),t=[L[0].v.obraNome,L[0].v.obraCodigo].filter(a=>!vz(a)).map(nz);
  if(o&&!(t.includes(nz(o.nome))||t.includes(nz(o.codigo))))return rej('A obra do arquivo ("'+obraArq+'") é diferente da obra da requisição ('+o.nome+').')}
 if(s.status==='Concluída'||s.status==='Cancelada')return rej('A requisição '+g.req+' está '+s.status.toLowerCase()+'.');
 if(!s.data_aprovacao||s.status==='Aguardando aprovação')return rej('A requisição '+g.req+' ainda não tem a aprovação registrada. Registre a aprovação (ou importe a solicitação já autorizada) e importe de novo.');
 const antes=d1<s.data_aprovacao;   // compra anterior à aprovação formal: NÃO rejeita; pede a autorização emergencial na prévia
 const avisos=[],itens=[],vistos=new Set(),divs=[];let totalGeral=0,semValor=0;
 const its=x.itens.filter(i=>i.solicitacao_id===s.id);
 for(const r of L){const v=r.v,d=String(v.descricao==null?'':v.descricao).trim().replace(/\s+/g,' '),u=String(v.unidade==null?'':v.unidade).trim(),q=num(v.quantidade),cod=String(v.codigo==null?'':v.codigo).trim();
  if(!d)return rej('Linha '+r.linha+': material não informado.');
  if(!u)return rej('Linha '+r.linha+': unidade não informada.');
  if(!(q>0))return rej('Linha '+r.linha+': quantidade inválida (use um número maior que zero).');
  const dn=s=>nz(String(s).replace(/[\/\\]+/g,' ')).replace(/\s+/g,' ');
  let it=its.find(i=>dsc(i.materiais.descricao)===dsc(d)&&dsc(i.materiais.unidade)===dsc(u));
  if(!it&&cod){let c2=its.filter(i=>nz(i.materiais.codigo)===nz(cod));if(c2.length>1)c2=c2.filter(i=>dn(i.materiais.descricao)===dn(d));if(c2.length===1)it=c2[0]}
  if(!it)it=its.find(i=>dn(i.materiais.descricao)===dn(d)&&dsc(i.materiais.unidade)===dsc(u));
  if(!it)it=its.find(i=>dn(i.materiais.descricao)===dn(d)&&!vistos.has(i.id))||its.find(i=>dn(i.materiais.descricao)===dn(d));   /* mesmo material com outra unidade */
  if(!it)return rej('Linha '+r.linha+': o material "'+d+'" não consta na requisição '+g.req+'.');
  const div=dsc(it.materiais.unidade)!==dsc(u);   /* unidade diferente NÃO rejeita: as duas ficam guardadas e o item vira "Unidade divergente" (sem conversão e sem soma) */
  if(vistos.has(it.id))return rej('Linha '+r.linha+': o material "'+d+'" aparece mais de uma vez no pedido.');
  vistos.add(it.id);
  const falta=Number(it.quantidade)-(x.comprado[it.id]||0)-(x.usado[it.id]||0);
  if(div)divs.push('"'+d+'": pedido '+nf(q)+' '+u+' · requisição '+nf(it.quantidade)+' '+it.materiais.unidade);
  else if(q>Math.max(falta,0)){const ex=q-Math.max(falta,0);avisos.push('"'+d+'": quantidade comprada acima do solicitado (excedente de '+ex+' '+u+'). O pedido será importado e o excedente ficará registrado, sem passar de 100% no atendimento.')}
  let vu=vz(v.unitario)?null:num(v.unitario),vt=vz(v.total)?null:num(v.total);
  if((vu!==null&&!(vu>=0))||(vt!==null&&!(vt>=0)))return rej('Linha '+r.linha+': valor inválido.');
  if(vu===null&&vt===null)semValor++;
  else if(vu!==null&&vt!==null&&!v.ajustes&&Math.abs(vu*q-vt)>0.05)avisos.push('Linha '+r.linha+': valor total ('+mo(vt)+') não confere com quantidade × valor unitário ('+mo(vu*q)+').');
  totalGeral+=vt!==null?vt:(vu!==null?vu*q:0);
  itens.push({sid:it.id,q,codigo:it.materiais.codigo,descricao:it.materiais.descricao,unidade:it.materiais.unidade,unidade_pedido:u,divergente:div,valor_unitario:vu,valor_total:vt})}
 if(semValor)avisos.push(semValor+' item(ns) sem valor no arquivo.');
 const tm=campo('totalMerc'),tmn=vz(tm)?NaN:num(tm);
 if(Number.isFinite(tmn)&&semValor===0&&Math.abs(tmn-totalGeral)>0.05)avisos.push('A soma dos itens ('+mo(totalGeral)+') não confere com o "Total das mercadorias" do arquivo ('+mo(tmn)+').');
 const fn=x.forn.find(f=>nz(f.nome)===nz(forn)||(!vz(campo('cnpj'))&&String(f.cnpj||'').replace(/\D/g,'')===String(campo('cnpj')).replace(/\D/g,'')));
 if(!fn)avisos.push('Fornecedor "'+forn+'" será cadastrado em Fornecedores.');
 const pa=campo('previsao'),pa1=vz(pa)?null:parseData(pa),calc=previsao(d1,s.obra_id,x.fer);
 const info=[];
 if(pa1&&pa1!==calc)info.push('O arquivo informa entrega até '+fdt(pa1)+'; o sistema calcula '+fdt(calc)+' (5 dias úteis). Vale a data do sistema; a do arquivo fica guardada para consulta.');
 itens.forEach(i=>{if(!i.divergente)x.usado[i.sid]=(x.usado[i.sid]||0)+i.q});
 if(divs.length)info.push('Unidade divergente (o pedido é importado normalmente; as duas unidades ficam guardadas, sem conversão): '+divs.join('; ')+'. Esses itens não entram no % de atendimento até o administrador MASTERS regularizar.');
 return{...base,estado:'novo',total:totalGeral,nitens:itens.length,fornecedorNovo:!fn,obraArquivo:obraArq,antes:antes?{d:d1,ap:s.data_aprovacao}:null,info:info.join(' '),motivo:avisos.length?'ATENÇÃO: '+avisos.join(' '):'',
  payload:{linha:L[0].linha,numero:String(g.n),requisicao:String(g.req),fornecedor:String(forn).trim(),cnpj:vz(campo('cnpj'))?null:String(campo('cnpj')).trim(),data:d1,previsao:pa1,obs:vz(campo('obs'))?null:String(campo('obs')).trim(),
   itens:itens.map(i=>({codigo:i.codigo,descricao:i.descricao,unidade:i.unidade,unidade_pedido:i.unidade_pedido,divergente:i.divergente,quantidade:i.q,valor_unitario:i.valor_unitario,valor_total:i.valor_total}))}}}

function validar(rows,x){const out=[],G=new Map();x.usado={};
 rows.forEach(r=>{const n=vz(r.v.numero)?'':String(r.v.numero).trim(),q=vz(r.v.requisicao)?'':String(r.v.requisicao).trim();
  const lin='Linha '+r.linha+(x.multi&&r.arq?' · '+r.arq:'');
  if(!n){out.push({linha:r.linha,arq:r.arq,resumo:lin,estado:'rej',motivo:'Número do pedido não informado.'});return}
  if(!q){out.push({linha:r.linha,arq:r.arq,num:n,resumo:'Pedido '+n,estado:'rej',motivo:'Requisição vinculada ao pedido não informada.'});return}
  const k=(r.arq||'')+'|'+nk(n)+'|'+nk(q);if(!G.has(k))G.set(k,{n,req:q,rows:[]});G.get(k).rows.push(r)});
 const vis=new Map();
 G.forEach(g=>{const o=validarPedido(g,x),k=nk(g.n)+'|'+nk(g.req);
  if(o.estado==='novo'){if(vis.has(k)){o.estado='rej';o.motivo='O mesmo pedido aparece também no arquivo "'+vis.get(k)+'". Importe só uma vez.';delete o.payload;g.rows.forEach(r=>{})}else vis.set(k,g.rows[0].arq)}
  out.push(o)});
 return out.sort((a,b)=>(a.arq||'').localeCompare(b.arq||'')||a.linha-b.linha)}

/* ---------- autorização emergencial (pedido com data anterior à aprovação formal) ---------- */
(function(){
 if(!document.getElementById('pc_em_css')){const c=document.createElement('style');c.id='pc_em_css';
  c.textContent='.hub-t:has(.em-box){max-height:none}.em-box{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0}.em-av{color:var(--ink);font-weight:700;margin-bottom:6px;border-left:4px solid var(--red);padding-left:8px}.em-box .rq{color:var(--ink)}'+
  '.em-box label.em-o{display:flex;gap:10px;align-items:flex-start;margin:8px 0;cursor:pointer;font-weight:400}.em-box input[type=radio]{width:22px;height:22px;min-height:22px;flex:0 0 22px;margin-top:2px}'+
  '.em-f{margin:4px 0 8px 32px}.em-f label{display:block;margin-top:6px;font-weight:600}.em-f input,.em-f textarea{width:100%}.em-box .hint{display:block}.em-cp{margin-top:6px}';
  document.head.appendChild(c)}
})();
const emK=a=>a&&a.payload?String(a.payload.numero)+'|'+String(a.payload.requisicao):'';
const emHoje=()=>new Date(Date.now()-4*3600e3).toISOString().slice(0,10);   // data de hoje em Manaus
function emCaixa(a,st){const k=emK(a),v=st[k]||{},c=v.c||{},n='emr_'+k.replace(/\W/g,'_');
 return '<div class="em-box" data-emk="'+esc(k)+'"><div class="em-av">Compra anterior à aprovação formal: pedido de '+fdt(a.antes.d)+'; requisição aprovada em '+fdt(a.antes.ap)+'.</div>'+
  '<div class="hint">O pedido será importado e ligado à requisição normalmente, e as duas datas serão mantidas como estão. A autorização emergencial é um registro à parte: ela não substitui nem altera a aprovação formal da requisição.</div>'+
  '<label class="em-o"><input type="radio" name="'+n+'" value="sim"'+(v.sel==='sim'?' checked':'')+'><span><b>Houve autorização emergencial.</b> Informe quem autorizou e por quê.</span></label>'+
  '<div class="em-f'+(v.sel==='sim'?'':' hide')+'"><label>Responsável pela autorização <b class="rq">*</b><input data-emf="responsavel" maxlength="120" value="'+esc(c.responsavel||'')+'"></label>'+
   '<label>Data da autorização <b class="rq">*</b><input type="date" data-emf="data" max="'+emHoje()+'" value="'+esc(c.data||'')+'"></label>'+
   '<label>Justificativa (motivo da compra ou retirada imediata) <b class="rq">*</b><textarea rows="2" maxlength="500" data-emf="justificativa">'+esc(c.justificativa||'')+'</textarea></label></div>'+
  '<label class="em-o"><input type="radio" name="'+n+'" value="nao"'+(v.sel==='nao'?' checked':'')+'><span><b>Não há autorização emergencial registrada.</b> O pedido entra como “Pendente de regularização” (não é tratado como aprovado nem como irregular) e o administrador MASTERS pode regularizar depois.</span></label></div>'}
function emErro(v){if(!v||!v.sel)return 'Escolha uma opção de autorização emergencial.';if(v.sel==='nao')return '';const c=v.c||{};
 if(String(c.responsavel||'').trim().length<3)return 'Informe o responsável pela autorização.';if(!c.data)return 'Informe a data da autorização.';if(c.data>emHoje())return 'A data da autorização não pode estar no futuro.';
 if(String(c.justificativa||'').trim().length<5)return 'Escreva a justificativa (mínimo 5 letras).';return ''}
function emPend(N,st){return N.filter(a=>a.estado==='novo'&&a.antes).map(a=>({a,e:emErro(st[emK(a)])})).filter(x=>x.e)}
function emDados(a,st){if(!a.antes)return undefined;const v=st[emK(a)]||{},c=v.c||{};
 return v.sel==='sim'?{autorizada:true,responsavel:String(c.responsavel||'').trim(),data:c.data,justificativa:String(c.justificativa||'').trim()}:{autorizada:false}}
function emLigar(raiz,st,onChange){if(!raiz)return;
 raiz.querySelectorAll('.em-box').forEach(bx=>{const k=bx.dataset.emk;st[k]=st[k]||{c:{}};st[k].c=st[k].c||{};
  bx.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>{st[k].sel=r.value;bx.querySelector('.em-f').classList.toggle('hide',r.value!=='sim');onChange&&onChange()});
  bx.querySelectorAll('[data-emf]').forEach(i=>i.oninput=()=>{st[k].c[i.dataset.emf]=i.value;onChange&&onChange()})});
 const todas=raiz.querySelectorAll('.em-box');
 if(todas.length>1&&!raiz.querySelector('.em-cp')){const b=document.createElement('button');b.type='button';b.className='sec em-cp';b.textContent='Usar a escolha do primeiro pedido em todos os pedidos anteriores à aprovação';
  b.onclick=()=>{const k0=todas[0].dataset.emk,v0=st[k0];if(!v0||!v0.sel)return;todas.forEach(bx=>{const k=bx.dataset.emk;st[k]={sel:v0.sel,c:{...(v0.c||{})}};
    bx.querySelectorAll('input[type=radio]').forEach(r=>r.checked=r.value===v0.sel);bx.querySelector('.em-f').classList.toggle('hide',v0.sel!=='sim');
    bx.querySelectorAll('[data-emf]').forEach(i=>i.value=st[k].c[i.dataset.emf]||'')});onChange&&onChange()};
  todas[todas.length-1].insertAdjacentElement('afterend',b)}}
const emLista=d=>((d&&d.anteriores_aprovacao)||[]).map(x=>'Pedido '+x.pedido+' (requisição '+x.requisicao+'): pedido em '+fdt(x.data_pedido)+', aprovação em '+fdt(x.data_aprovacao)+' — '+x.situacao);
const EM={caixa:emCaixa,erro:emErro,pend:emPend,dados:emDados,ligar:emLigar,lista:emLista,chave:emK};

/* ---------- tela ---------- */
const lista=(t,L)=>L&&L.length?'<h3>'+t+'</h3>'+L.map(x=>`<div class="mv">${/^Pedido/.test(x.motivo||'')?'':'Linha '+x.linha+': '}${esc(x.motivo)}</div>`).join(''):'';
const relatorio=d=>`<div class="kpis"><div class="card kpi"><b>${d.importados}</b>Pedidos importados</div><div class="card kpi"><b>${d.itens||0}</b>Itens importados</div><div class="card kpi"><b>${d.ignorados}</b>Ignorados</div><div class="card kpi al"><b>${d.rejeitados}</b>Rejeitados</div></div>`+(emLista(d).length?'<h3>Pedidos anteriores à aprovação formal</h3>'+emLista(d).map(x=>'<div class="mv">'+esc(x)+'</div>').join('')+'<p class="hint">A aprovação formal das requisições não foi alterada.</p>':'')+lista('Pedidos ignorados',d.detalhes.ignorados)+lista('Pedidos rejeitados',d.detalhes.rejeitados);

function tela(){cur='imp_ped';mark();const v=$('#view');
 v.innerHTML=`<h1>Importar Pedido de Compra</h1><p class="sub">Nada é gravado antes da sua confirmação. A importação não dá entrada no estoque: o estoque só muda quando o almoxarife confirma o recebimento.</p>
 <div class="card"><h3 style="margin-top:0">Passo 1: escolha o arquivo</h3>
 <p>Use o relatório de <b>Pedido de Compra</b> exportado do Sienge (Excel ou CSV), do jeito que ele sai. Você pode escolher <b>vários arquivos de uma vez</b>.</p>
 <p class="hint">A requisição do pedido precisa estar cadastrada e aprovada (use antes “Importar solicitações”).</p>
 <input id="pc_f" type="file" accept=".xlsx,.xls,.csv" multiple></div><div id="pc_r" style="margin-top:12px"></div>`;
 $('#pc_f').onchange=e=>processar([...e.target.files])}

async function processar(files){const R=$('#pc_r');if(!files||!files.length)return;
 if(!window.XLSX){toast('A biblioteca de planilhas ainda está carregando. Tente de novo em instantes.');return}
 R.innerHTML='<p class="sub">Lendo o arquivo…</p>';
 try{let rows=[];const falhas=[];
  for(const f of files){try{rows=rows.concat(await ler(f))}catch(e){falhas.push({linha:0,arq:f.name,resumo:'Arquivo '+f.name,estado:'rej',motivo:e.message||String(e)})}}
  const x=await contexto();x.multi=files.length>1;
  const res=validar(rows,x).concat(falhas);const EMST={};
  const N=res.filter(a=>a.estado==='novo'),I=res.filter(a=>a.estado==='ign'),J=res.filter(a=>a.estado==='rej'),AV=N.filter(a=>a.motivo).length;
  const lb={novo:'Novo',ign:'Ignorado',rej:'Rejeitado'},cl={novo:'blue',ign:'',rej:'red'};
  const env=a=>({linha:a.linha,motivo:(a.num&&!/^Pedido/.test(a.motivo)?'Pedido '+a.num+': ':'')+(a.arq&&files.length>1?'['+a.arq+'] ':'')+a.motivo});
  R.innerHTML=`<div class="card"><h3 style="margin-top:0">Passo 2: confira a prévia</h3><p>${files.length} arquivo(s) — ${res.length} pedido(s) encontrado(s)</p>
  <div class="kpis"><div class="card kpi"><b>${N.length}</b>Novos</div><div class="card kpi"><b>${I.length}</b>Ignorados</div><div class="card kpi al"><b>${J.length}</b>Rejeitados</div></div>
  <div class="wrap" style="max-height:380px;overflow:auto"><table style="min-width:640px"><thead><tr><th>Pedido</th><th>Itens</th><th>Valor</th><th>Situação</th><th>Motivo ou aviso</th></tr></thead><tbody>${res.slice(0,500).map(a=>`<tr><td>${esc(a.resumo)}</td><td>${a.nitens||'—'}</td><td>${a.estado==='novo'&&a.total?mo(a.total):'—'}</td><td><span class="chip ${cl[a.estado]}">${lb[a.estado]}</span></td><td>${esc(a.motivo||'')}</td></tr>`).join('')}</tbody></table></div>${res.length>500?'<p class="hint">Mostrando os 500 primeiros. A importação considera todos.</p>':''}
  ${N.some(a=>a.antes)?'<h3>Pedidos anteriores à aprovação formal</h3><div id="pc_em">'+N.filter(a=>a.antes).map(a=>'<div class="mv"><b>'+esc(a.resumo)+'</b>'+emCaixa(a,EMST)+'</div>').join('')+'</div>':''}
  ${AV?`<label style="display:flex;gap:10px;align-items:center;margin-top:12px"><input type="checkbox" id="pc_av" style="width:24px;min-height:24px"><span><b>${AV} pedido(s) com ATENÇÃO.</b> Li os avisos na prévia e confirmo a importação.</span></label>`:''}
  <div class="hub-w" id="pc_em_m" style="color:var(--redt);font-weight:600"></div><div class="err hide" id="pc_e"></div><div class="acts"><button class="sec" id="pc_x">Cancelar</button><button class="btn" id="pc_ok" ${N.length&&!AV&&!emPend(N,EMST).length?'':'disabled'}>Passo 3: importar ${N.length} pedido(s) novo(s)</button></div></div>`;
  $('#pc_x').onclick=()=>{R.innerHTML='';$('#pc_f').value=''};
  const libera=()=>{const pe=emPend(N,EMST),m=$('#pc_em_m');$('#pc_ok').disabled=!N.length||(AV&&!$('#pc_av').checked)||pe.length>0;if(m)m.textContent=pe.length?pe.length+' pedido(s) anterior(es) à aprovação aguardam a sua escolha sobre a autorização emergencial.':''};
  if(AV)$('#pc_av').onchange=libera;
  emLigar($('#pc_em'),EMST,libera);
  $('#pc_ok').onclick=async()=>{
   if(!confirm('Importar '+N.length+' pedido(s) novo(s)?\n'+I.length+' serão ignorados e '+J.length+' rejeitados.'))return;
   const b=$('#pc_ok');b.disabled=true;
   const{data,error}=await sb.rpc('importar_pedidos',{p_arquivo:files.length>1?files.length+' arquivos ('+files[0].name+', ...)':files[0].name,p_dados:N.map(a=>a.antes?{...a.payload,emergencia:emDados(a,EMST)}:a.payload),p_rejeitados:J.map(env),p_ignorados:I.map(env)});
   if(error){b.disabled=false;const e=$('#pc_e');e.textContent=msg(error);e.classList.remove('hide');return}
   cache={};R.innerHTML='<div class="card"><h3 style="margin-top:0">Resultado da importação</h3>'+relatorio(data)+'<p class="hint">Confira em “Solicitações e pedidos”. O material comprado ainda não é material recebido: o recebimento é confirmado em “Receber materiais”.</p></div>';toast('Importação concluída.')}
 }catch(e){R.innerHTML='<div class="err">'+esc(e.message||msg(e))+'</div>'}}

function abrir(){tela();const f=document.getElementById('pc_f');if(f)f.click()}

/* ---------- botões: menu lateral e tela Solicitações e pedidos ---------- */
function poeMenu(){const m=document.getElementById('menu');if(!m||!me||me.perfil==='FUNCIONARIO'||m.querySelector('[data-v="imp_ped"]'))return;
 const b=document.createElement('button');b.className='nav';b.setAttribute('data-v','imp_ped');b.textContent='Importar pedido de compra';
 const alvo=m.querySelector('[data-v="imp_solic"]')||[...m.querySelectorAll('button.nav')].find(x=>x.textContent.trim()==='Solicitações e pedidos')||m.querySelector('.nav[data-v="painel"]');
 if(alvo)alvo.insertAdjacentElement('afterend',b);else m.insertBefore(b,m.firstChild);
 if(cur==='imp_ped')b.classList.add('on')}
function poeBarra(){const v=document.getElementById('view'),h=v&&v.querySelector('h1');
 if(!h||h.textContent.trim()!=='Solicitações e pedidos'||!me||me.perfil==='FUNCIONARIO')return;
 const bar=v.querySelector('.bar');if(!bar||bar.querySelector('#imp_ped_btn'))return;
 const b=document.createElement('button');b.id='imp_ped_btn';b.type='button';b.className='sec';b.setAttribute('data-imp2','abrir');b.textContent='Importar Pedido de Compra';bar.appendChild(b)}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-v="imp_ped"],[data-imp2="abrir"]');
 if(!t)return;e.stopPropagation();e.preventDefault();
 if(t.getAttribute('data-imp2')==='abrir')abrir();else tela()},true);
const _m6=menu;menu=function(){_m6();poeMenu()};
new MutationObserver(poeMenu).observe(document.getElementById('menu'),{childList:true});
new MutationObserver(poeBarra).observe(document.getElementById('view'),{childList:true,subtree:true});
poeMenu();poeBarra();
window.__impPedTeste={em:EM,ler,validar,achaPedidos,achaPedidoSienge,previsao,parseData,num,contexto,nz,nk,mo,fdt};
})()}catch(e){window.__impPedErro=e;console.error('Importação de pedidos não carregou:',e);
 const av=()=>{const t=document.getElementById('toast');if(t){t.textContent='Importação de pedidos não carregou: '+e.message;t.classList.add('on')}};
 if(document.readyState==='complete')av();else window.addEventListener('load',av)}
