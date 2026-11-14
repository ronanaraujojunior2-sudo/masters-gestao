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
 const
