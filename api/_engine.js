// Cópia do engine para serverless (importável pelas API routes)
function calcularSoma(dezenas) { return dezenas.reduce((s, d) => s + d, 0); }
function contarPares(dezenas) { return dezenas.filter(d => d % 2 === 0).length; }
function contarImpares(dezenas) { return dezenas.filter(d => d % 2 !== 0).length; }
function getLinha(n) { return Math.ceil(n / 5); }
function getColuna(n) { return ((n - 1) % 5) + 1; }
function distribuicaoLinhas(dezenas) { const l = [0,0,0,0,0]; dezenas.forEach(d => l[getLinha(d)-1]++); return l; }
function distribuicaoColunas(dezenas) { const c = [0,0,0,0,0]; dezenas.forEach(d => c[getColuna(d)-1]++); return c; }
function contarSequencias(dezenas) { let s=0; for(let i=1;i<dezenas.length;i++) if(dezenas[i]===dezenas[i-1]+1) s++; return s; }
function distribuicaoFaixas(dezenas) { const f=[0,0,0,0,0]; dezenas.forEach(d => f[Math.ceil(d/5)-1]++); return f; }
function contarRepeticoes(atual, anterior) { return atual.filter(d => anterior.includes(d)).length; }
function stdDev(arr) { const m=arr.reduce((a,b)=>a+b,0)/arr.length; const v=arr.reduce((s,x)=>s+Math.pow(x-m,2),0)/arr.length; return {media:m,std:Math.sqrt(v)}; }

const PRIMOS = [2,3,5,7,11,13,17,19,23];
const FIBONACCI = [1,2,3,5,8,13,21];
const BORDA = [1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25];
const MIOLO = [7,8,9,12,13,14,17,18,19];

function contarPrimos(dezenas) { return dezenas.filter(d => PRIMOS.includes(d)).length; }
function contarFibonacci(dezenas) { return dezenas.filter(d => FIBONACCI.includes(d)).length; }
function contarBordaMiolo(dezenas) { return { borda: dezenas.filter(d=>BORDA.includes(d)).length, miolo: dezenas.filter(d=>MIOLO.includes(d)).length }; }
function calcularGaps(dezenas) { const g=[]; for(let i=1;i<dezenas.length;i++) g.push(dezenas[i]-dezenas[i-1]); return g; }

function calcularEMA(concursos, periodo) {
  const ema = new Array(26).fill(0);
  const k = 2/(periodo+1);
  for(let i=1;i<=25;i++) { let v=0; for(let c=0;c<concursos.length;c++) { const a=concursos[c].dezenas.includes(i)?1:0; v=c===0?a:a*k+v*(1-k); } ema[i]=v; }
  return ema;
}
function detectarTendencia(emaCurta, emaLonga) { const t=new Array(26).fill(0); for(let i=1;i<=25;i++) if(emaLonga[i]>0) t[i]=(emaCurta[i]-emaLonga[i])/emaLonga[i]; return t; }

function calcularEntropia(concursos, janela=50) {
  const e=new Array(26).fill(0); const u=concursos.slice(-janela); const n=u.length;
  for(let i=1;i<=25;i++) { const a=u.filter(c=>c.dezenas.includes(i)).length; const p=a/n; const q=1-p; if(p>0&&p<1) e[i]=-(p*Math.log2(p)+q*Math.log2(q)); }
  return e;
}
function calcularZScore(concursos, janela=50) {
  const n=concursos.length; const z=new Array(26).fill(0); const fH=new Array(26).fill(0);
  concursos.forEach(c=>c.dezenas.forEach(d=>fH[d]++)); const rec=concursos.slice(-janela); const fR=new Array(26).fill(0);
  rec.forEach(c=>c.dezenas.forEach(d=>fR[d]++));
  for(let i=1;i<=25;i++){const p=fH[i]/n;const o=fR[i];const e=p*janela;const s=Math.sqrt(janela*p*(1-p));if(s>0)z[i]=(o-e)/s;}
  return z;
}
function calcularChiQuadrado(concursos) {
  const n=concursos.length; const esp=n*15/25; const chi2=new Array(26).fill(0); const sig=new Array(26).fill(false); const freq=new Array(26).fill(0);
  concursos.forEach(c=>c.dezenas.forEach(d=>freq[d]++));
  for(let i=1;i<=25;i++){chi2[i]=Math.pow(freq[i]-esp,2)/esp;sig[i]=chi2[i]>3.841;}
  return {chi2,significancia:sig,freq,esperado:esp};
}
function calcularCoOcorrencia(concursos) {
  const m=Array.from({length:26},()=>new Array(26).fill(0)); const freq=new Array(26).fill(0);
  concursos.forEach(c=>{c.dezenas.forEach(d=>freq[d]++);for(let i=0;i<c.dezenas.length;i++)for(let j=i+1;j<c.dezenas.length;j++){m[c.dezenas[i]][c.dezenas[j]]++;m[c.dezenas[j]][c.dezenas[i]]++;}});
  const p=Array.from({length:26},()=>new Array(26).fill(0));
  for(let i=1;i<=25;i++)for(let j=1;j<=25;j++)if(i!==j&&freq[i]>0)p[i][j]=m[i][j]/freq[i];
  return {matriz:m,probCond:p,freq};
}
function calcularMarkov(concursos) {
  const t=Array.from({length:26},()=>[0,0]);const cnt=Array.from({length:26},()=>[0,0]);const ac=Array.from({length:26},()=>[0,0]);
  for(let c=1;c<concursos.length;c++){const ant=concursos[c-1].dezenas;const at=concursos[c].dezenas;for(let i=1;i<=25;i++){const e=ant.includes(i)?1:0;cnt[i][e]++;if(at.includes(i))ac[i][e]++;}}
  for(let i=1;i<=25;i++){t[i][0]=cnt[i][0]>0?ac[i][0]/cnt[i][0]:0;t[i][1]=cnt[i][1]>0?ac[i][1]/cnt[i][1]:0;}
  return t;
}

function calcularPontuacaoAvancada(concursos, pesos=null) {
  const [wF,wT,wZ,wC,wM,wA,wX]=pesos||[0.10,0.20,0.15,0.20,0.15,0.10,0.10];
  const n=concursos.length; const freq=new Array(26).fill(0); const ult=new Array(26).fill(-1);
  concursos.forEach((c,idx)=>c.dezenas.forEach(d=>{freq[d]++;ult[d]=idx;}));
  const ema10=calcularEMA(concursos,10);const ema50=calcularEMA(concursos,50);const tend=detectarTendencia(ema10,ema50);
  const zs=calcularZScore(concursos,50);const ent=calcularEntropia(concursos,50);
  const{chi2,significancia}=calcularChiQuadrado(concursos);const markov=calcularMarkov(concursos);
  const{probCond}=calcularCoOcorrencia(concursos);const ultimo=concursos[n-1].dezenas;
  const pont=[];
  for(let i=1;i<=25;i++){
    const atraso=n-1-ult[i];const fP=freq[i]/n;
    const pF=fP*100*wF;const pT=(0.5+Math.min(Math.max(tend[i],-0.5),0.5))*100*wT;
    const zN=(Math.min(Math.max(zs[i],-3),3)+3)/6;const pZ=zN*100*wZ;
    let pCM=0;ultimo.forEach(d=>{pCM+=probCond[d][i];});pCM/=ultimo.length;const pC=pCM*100*wC;
    const est=ultimo.includes(i)?1:0;const pM=markov[i][est]*100*wM;
    const aN=Math.min(atraso/10,1);const eP=1-ent[i];const pA=aN*(0.5+eP*0.5)*100*wA;
    const cN=Math.min(chi2[i]/10,1);const ab=freq[i]<(n*15/25);const pX=(significancia[i]&&ab?cN:cN*0.3)*100*wX;
    const total=pF+pT+pZ+pC+pM+pA+pX;
    pont.push({num:i,score:total,freq:freq[i],atraso,tendencia:tend[i],zscore:zs[i],markov:markov[i][est],entropia:ent[i],chi2:chi2[i],significativo:significancia[i],ema10:ema10[i],ema50:ema50[i]});
  }
  pont.sort((a,b)=>b.score-a.score);return pont;
}

function analisarPadroesGeometricos(concursos) {
  const s={primos:[],fibonacci:[],borda:[],miolo:[],gapMedia:[],gapMax:[]};
  concursos.forEach(c=>{s.primos.push(contarPrimos(c.dezenas));s.fibonacci.push(contarFibonacci(c.dezenas));const bm=contarBordaMiolo(c.dezenas);s.borda.push(bm.borda);s.miolo.push(bm.miolo);const g=calcularGaps(c.dezenas);s.gapMedia.push(g.reduce((a,b)=>a+b,0)/g.length);s.gapMax.push(Math.max(...g));});
  return{primos:stdDev(s.primos),fibonacci:stdDev(s.fibonacci),borda:stdDev(s.borda),miolo:stdDev(s.miolo),gapMedia:stdDev(s.gapMedia),gapMax:stdDev(s.gapMax)};
}

function detectarCiclos(concursos) {
  const n=concursos.length;const ciclos=[];
  for(let num=1;num<=25;num++){const ap=[];concursos.forEach((c,idx)=>{if(c.dezenas.includes(num))ap.push(idx);});if(ap.length<10)continue;
  const int=[];for(let i=1;i<ap.length;i++)int.push(ap[i]-ap[i-1]);const{media:m,std:s}=stdDev(int);const cv=s/m;const at=n-1-ap[ap.length-1];
  ciclos.push({num,intMedia:m,intStd:s,cv,atrasoAtual:at,previsao:at>=m?'IMINENTE':'AGUARDANDO'});}
  ciclos.sort((a,b)=>a.cv-b.cv);return ciclos;
}

function calcularRepulsao(concursos) {
  const n=concursos.length;const co=Array.from({length:26},()=>new Array(26).fill(0));
  concursos.forEach(c=>{for(let i=0;i<c.dezenas.length;i++)for(let j=i+1;j<c.dezenas.length;j++){co[c.dezenas[i]][c.dezenas[j]]++;co[c.dezenas[j]][c.dezenas[i]]++;}});
  const esp=n*0.42;const r=[];
  for(let i=1;i<=25;i++)for(let j=i+1;j<=25;j++){const obs=co[i][j];const ratio=obs/esp;if(ratio<0.75)r.push({a:i,b:j,obs,esperado:esp,ratio});}
  r.sort((a,b)=>a.ratio-b.ratio);return r;
}

function calcularTrios(concursos) {
  const t={};concursos.forEach(c=>{for(let i=0;i<c.dezenas.length;i++)for(let j=i+1;j<c.dezenas.length;j++)for(let k=j+1;k<c.dezenas.length;k++){const key=`${c.dezenas[i]}-${c.dezenas[j]}-${c.dezenas[k]}`;t[key]=(t[key]||0)+1;}});
  return Object.entries(t).map(([k,f])=>({dezenas:k.split('-').map(Number),freq:f})).sort((a,b)=>b.freq-a.freq);
}

const MODOS={economico:{nome:'ECONÔMICO',quantidade:6,tentativas:5000,filtroSigma:1.0},normal:{nome:'NORMAL',quantidade:10,tentativas:3000,filtroSigma:1.5},agressivo:{nome:'AGRESSIVO',quantidade:20,tentativas:2000,filtroSigma:2.0}};

function gerarJogos(concursos, modo='normal', pesos=null) {
  const config=MODOS[modo]||MODOS.normal;const n=concursos.length;const pont=calcularPontuacaoAvancada(concursos,pesos);
  const somas=concursos.map(c=>calcularSoma(c.dezenas));const{media:sM,std:sS}=stdDev(somas);
  const seqs=concursos.map(c=>contarSequencias(c.dezenas));const{media:seqM,std:seqS}=stdDev(seqs);
  const reps=[];for(let i=1;i<n;i++)reps.push(contarRepeticoes(concursos[i].dezenas,concursos[i-1].dezenas));
  const{media:rM,std:rS}=stdDev(reps);const padGeo=analisarPadroesGeometricos(concursos);
  const ultimo=concursos[n-1].dezenas;const{probCond}=calcularCoOcorrencia(concursos);const sigma=config.filtroSigma;
  const estrategias=[{nome:'TENDÊNCIA',peso:'tendencia',topN:18},{nome:'Z-SCORE',peso:'zscore',topN:18},{nome:'MARKOV',peso:'markov',topN:20},{nome:'ENTROPIA',peso:'entropia_inv',topN:20},{nome:'ATRASO+CHI²',peso:'atraso',topN:20},{nome:'BALANCEADO',peso:'score',topN:20}];
  const jogos=[];
  for(let g=0;g<config.quantidade;g++){
    const est=estrategias[g%estrategias.length];let mJ=null;let mS=-Infinity;
    let pool;switch(est.peso){case'tendencia':pool=[...pont].sort((a,b)=>b.tendencia-a.tendencia);break;case'zscore':pool=[...pont].sort((a,b)=>b.zscore-a.zscore);break;case'markov':pool=[...pont].sort((a,b)=>b.markov-a.markov);break;case'entropia_inv':pool=[...pont].sort((a,b)=>a.entropia-b.entropia);break;case'atraso':pool=[...pont].sort((a,b)=>b.atraso-a.atraso);break;default:pool=[...pont];}
    const topD=pool.slice(0,est.topN).map(p=>p.num);
    for(let t=0;t<config.tentativas;t++){
      const pl=[...topD];for(let i=1;i<=25;i++)if(!pl.includes(i)&&Math.random()<0.25)pl.push(i);
      const j=[];const pc=[...pl];while(j.length<15&&pc.length>0)j.push(pc.splice(Math.floor(Math.random()*pc.length),1)[0]);
      if(j.length<15)continue;j.sort((a,b)=>a-b);
      const soma=calcularSoma(j);if(soma<sM-sigma*sS||soma>sM+sigma*sS)continue;
      const pares=contarPares(j);if(pares<5||pares>10)continue;
      const faixas=distribuicaoFaixas(j);if(faixas.some(f=>f===0)||faixas.some(f=>f>5))continue;
      const linhas=distribuicaoLinhas(j);if(linhas.some(l=>l===0)||linhas.some(l=>l>5))continue;
      const sq=contarSequencias(j);if(sq>seqM+sigma*seqS)continue;
      const rp=contarRepeticoes(j,ultimo);if(rp<rM-sigma*rS||rp>rM+sigma*rS)continue;
      const pr=contarPrimos(j);if(pr<padGeo.primos.media-sigma*padGeo.primos.std||pr>padGeo.primos.media+sigma*padGeo.primos.std)continue;
      const js=j.join(',');if(jogos.some(x=>x.dezenas.join(',')===js))continue;
      let sc=j.reduce((s,d)=>{const p=pont.find(x=>x.num===d);return s+(p?p.score:0);},0);
      let bc=0;for(let i=0;i<j.length;i++)for(let k=i+1;k<j.length;k++)bc+=probCond[j[i]][j[k]];
      sc+=(bc/105)*10;sc+=(1-Math.abs(soma-sM)/sS)*5;
      if(sc>mS){mS=sc;mJ=j;}
    }
    if(mJ)jogos.push({numero:g+1,dezenas:mJ,estrategia:est.nome,score:mS,soma:calcularSoma(mJ),pares:contarPares(mJ),impares:contarImpares(mJ),sequencias:contarSequencias(mJ),repeticoes:contarRepeticoes(mJ,ultimo)});
  }
  return jogos;
}

module.exports = {
  calcularSoma,contarPares,contarImpares,calcularEMA,detectarTendencia,
  calcularEntropia,calcularZScore,calcularChiQuadrado,calcularCoOcorrencia,
  calcularMarkov,calcularPontuacaoAvancada,gerarJogos,analisarPadroesGeometricos,
  detectarCiclos,calcularRepulsao,calcularTrios,contarPrimos,contarFibonacci,
  contarBordaMiolo,calcularGaps,stdDev,MODOS,
};
