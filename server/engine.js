const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// BUSCAR DADOS DA LOTOFÁCIL
// ============================================================

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Erro ao parsear JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

async function carregarHistorico(onProgress) {
  try {
    const data = await fetchJSON('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil');
    const ultimo = data.numero || data.concurso;

    const concursos = [];
    const batchSize = 100;

    for (let i = 1; i <= ultimo; i += batchSize) {
      const promises = [];
      for (let j = i; j < Math.min(i + batchSize, ultimo + 1); j++) {
        promises.push(
          fetchJSON(`https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${j}`)
            .then(d => ({
              concurso: d.numero || d.concurso,
              data: d.dataApuracao || d.data,
              dezenas: (d.listaDezenas || d.dezenas || d.dezenasSorteadasOrdemSorteio || []).map(Number).sort((a, b) => a - b)
            }))
            .catch(() => null)
        );
      }
      const results = await Promise.all(promises);
      results.filter(r => r && r.dezenas.length === 15).forEach(r => concursos.push(r));
      if (onProgress) onProgress(concursos.length, ultimo);
    }
    concursos.sort((a, b) => a.concurso - b.concurso);
    return concursos;
  } catch (e) {
    return gerarDadosDemo();
  }
}

function gerarDadosDemo() {
  const concursos = [];
  for (let i = 1; i <= 3200; i++) {
    const dezenas = [];
    while (dezenas.length < 15) {
      const n = Math.floor(Math.random() * 25) + 1;
      if (!dezenas.includes(n)) dezenas.push(n);
    }
    dezenas.sort((a, b) => a - b);
    concursos.push({ concurso: i, data: '2003-01-01', dezenas });
  }
  return concursos;
}

// ============================================================
// FUNÇÕES ESTATÍSTICAS BÁSICAS
// ============================================================

function calcularSoma(dezenas) { return dezenas.reduce((s, d) => s + d, 0); }
function contarPares(dezenas) { return dezenas.filter(d => d % 2 === 0).length; }
function contarImpares(dezenas) { return dezenas.filter(d => d % 2 !== 0).length; }
function getLinha(n) { return Math.ceil(n / 5); }
function getColuna(n) { return ((n - 1) % 5) + 1; }

function distribuicaoLinhas(dezenas) {
  const linhas = [0, 0, 0, 0, 0];
  dezenas.forEach(d => linhas[getLinha(d) - 1]++);
  return linhas;
}

function distribuicaoColunas(dezenas) {
  const colunas = [0, 0, 0, 0, 0];
  dezenas.forEach(d => colunas[getColuna(d) - 1]++);
  return colunas;
}

function contarSequencias(dezenas) {
  let seq = 0;
  for (let i = 1; i < dezenas.length; i++) {
    if (dezenas[i] === dezenas[i - 1] + 1) seq++;
  }
  return seq;
}

function distribuicaoFaixas(dezenas) {
  const faixas = [0, 0, 0, 0, 0];
  dezenas.forEach(d => faixas[Math.ceil(d / 5) - 1]++);
  return faixas;
}

function contarRepeticoes(atual, anterior) {
  return atual.filter(d => anterior.includes(d)).length;
}

function stdDev(arr) {
  const media = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variancia = arr.reduce((s, v) => s + Math.pow(v - media, 2), 0) / arr.length;
  return { media, std: Math.sqrt(variancia) };
}

// ============================================================
// MODELOS MATEMÁTICOS AVANÇADOS
// ============================================================

function calcularEMA(concursos, periodo) {
  const ema = new Array(26).fill(0);
  const k = 2 / (periodo + 1);
  for (let i = 1; i <= 25; i++) {
    let valor = 0;
    for (let c = 0; c < concursos.length; c++) {
      const apareceu = concursos[c].dezenas.includes(i) ? 1 : 0;
      if (c === 0) valor = apareceu;
      else valor = apareceu * k + valor * (1 - k);
    }
    ema[i] = valor;
  }
  return ema;
}

function detectarTendencia(emaCurta, emaLonga) {
  const tendencia = new Array(26).fill(0);
  for (let i = 1; i <= 25; i++) {
    if (emaLonga[i] > 0) tendencia[i] = (emaCurta[i] - emaLonga[i]) / emaLonga[i];
  }
  return tendencia;
}

function calcularEntropia(concursos, janela = 50) {
  const entropia = new Array(26).fill(0);
  const ultimos = concursos.slice(-janela);
  const n = ultimos.length;
  for (let i = 1; i <= 25; i++) {
    const aparicoes = ultimos.filter(c => c.dezenas.includes(i)).length;
    const p = aparicoes / n;
    const q = 1 - p;
    if (p > 0 && p < 1) entropia[i] = -(p * Math.log2(p) + q * Math.log2(q));
    else entropia[i] = 0;
  }
  return entropia;
}

function calcularZScore(concursos, janela = 50) {
  const n = concursos.length;
  const zscores = new Array(26).fill(0);
  const freqHist = new Array(26).fill(0);
  concursos.forEach(c => c.dezenas.forEach(d => freqHist[d]++));
  const recentes = concursos.slice(-janela);
  const freqRecente = new Array(26).fill(0);
  recentes.forEach(c => c.dezenas.forEach(d => freqRecente[d]++));
  for (let i = 1; i <= 25; i++) {
    const pHist = freqHist[i] / n;
    const observado = freqRecente[i];
    const esperado = pHist * janela;
    const sd = Math.sqrt(janela * pHist * (1 - pHist));
    if (sd > 0) zscores[i] = (observado - esperado) / sd;
  }
  return zscores;
}

function calcularChiQuadrado(concursos) {
  const n = concursos.length;
  const esperado = n * 15 / 25;
  const chi2 = new Array(26).fill(0);
  const significancia = new Array(26).fill(false);
  const freq = new Array(26).fill(0);
  concursos.forEach(c => c.dezenas.forEach(d => freq[d]++));
  for (let i = 1; i <= 25; i++) {
    chi2[i] = Math.pow(freq[i] - esperado, 2) / esperado;
    significancia[i] = chi2[i] > 3.841;
  }
  return { chi2, significancia, freq, esperado };
}

function calcularCoOcorrencia(concursos) {
  const matriz = Array.from({ length: 26 }, () => new Array(26).fill(0));
  const freq = new Array(26).fill(0);
  concursos.forEach(c => {
    c.dezenas.forEach(d => freq[d]++);
    for (let i = 0; i < c.dezenas.length; i++) {
      for (let j = i + 1; j < c.dezenas.length; j++) {
        matriz[c.dezenas[i]][c.dezenas[j]]++;
        matriz[c.dezenas[j]][c.dezenas[i]]++;
      }
    }
  });
  const probCond = Array.from({ length: 26 }, () => new Array(26).fill(0));
  for (let i = 1; i <= 25; i++) {
    for (let j = 1; j <= 25; j++) {
      if (i !== j && freq[i] > 0) probCond[i][j] = matriz[i][j] / freq[i];
    }
  }
  return { matriz, probCond, freq };
}

function calcularMarkov(concursos) {
  const transicao = Array.from({ length: 26 }, () => [0, 0]);
  const contagem = Array.from({ length: 26 }, () => [0, 0]);
  const acertos = Array.from({ length: 26 }, () => [0, 0]);
  for (let c = 1; c < concursos.length; c++) {
    const anterior = concursos[c - 1].dezenas;
    const atual = concursos[c].dezenas;
    for (let i = 1; i <= 25; i++) {
      const estado = anterior.includes(i) ? 1 : 0;
      contagem[i][estado]++;
      if (atual.includes(i)) acertos[i][estado]++;
    }
  }
  for (let i = 1; i <= 25; i++) {
    transicao[i][0] = contagem[i][0] > 0 ? acertos[i][0] / contagem[i][0] : 0;
    transicao[i][1] = contagem[i][1] > 0 ? acertos[i][1] / contagem[i][1] : 0;
  }
  return transicao;
}

// ============================================================
// PADRÕES GEOMÉTRICOS
// ============================================================

const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
const BORDA = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
const MIOLO = [7, 8, 9, 12, 13, 14, 17, 18, 19];
const DIAGONAL_PRINCIPAL = [1, 7, 13, 19, 25];
const DIAGONAL_SECUNDARIA = [5, 9, 13, 17, 21];

function contarPrimos(dezenas) { return dezenas.filter(d => PRIMOS.includes(d)).length; }
function contarFibonacci(dezenas) { return dezenas.filter(d => FIBONACCI.includes(d)).length; }
function contarBordaMiolo(dezenas) {
  return { borda: dezenas.filter(d => BORDA.includes(d)).length, miolo: dezenas.filter(d => MIOLO.includes(d)).length };
}
function calcularGaps(dezenas) {
  const gaps = [];
  for (let i = 1; i < dezenas.length; i++) gaps.push(dezenas[i] - dezenas[i - 1]);
  return gaps;
}

function analisarPadroesGeometricos(concursos) {
  const stats = { primos: [], fibonacci: [], borda: [], miolo: [], gapMedia: [], gapMax: [] };
  concursos.forEach(c => {
    stats.primos.push(contarPrimos(c.dezenas));
    stats.fibonacci.push(contarFibonacci(c.dezenas));
    const bm = contarBordaMiolo(c.dezenas);
    stats.borda.push(bm.borda);
    stats.miolo.push(bm.miolo);
    const gaps = calcularGaps(c.dezenas);
    stats.gapMedia.push(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    stats.gapMax.push(Math.max(...gaps));
  });
  return {
    primos: stdDev(stats.primos), fibonacci: stdDev(stats.fibonacci),
    borda: stdDev(stats.borda), miolo: stdDev(stats.miolo),
    gapMedia: stdDev(stats.gapMedia), gapMax: stdDev(stats.gapMax),
  };
}

// ============================================================
// ANTI-PADRÕES E CICLOS
// ============================================================

function calcularRepulsao(concursos) {
  const n = concursos.length;
  const coOcorrencia = Array.from({ length: 26 }, () => new Array(26).fill(0));
  concursos.forEach(c => {
    for (let i = 0; i < c.dezenas.length; i++) {
      for (let j = i + 1; j < c.dezenas.length; j++) {
        coOcorrencia[c.dezenas[i]][c.dezenas[j]]++;
        coOcorrencia[c.dezenas[j]][c.dezenas[i]]++;
      }
    }
  });
  const esperadoReal = n * 0.42;
  const repulsoes = [];
  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      const obs = coOcorrencia[i][j];
      const ratio = obs / esperadoReal;
      if (ratio < 0.75) repulsoes.push({ a: i, b: j, obs, esperado: esperadoReal, ratio });
    }
  }
  repulsoes.sort((a, b) => a.ratio - b.ratio);
  return repulsoes;
}

function calcularTrios(concursos) {
  const trios = {};
  concursos.forEach(c => {
    for (let i = 0; i < c.dezenas.length; i++) {
      for (let j = i + 1; j < c.dezenas.length; j++) {
        for (let k = j + 1; k < c.dezenas.length; k++) {
          const key = `${c.dezenas[i]}-${c.dezenas[j]}-${c.dezenas[k]}`;
          trios[key] = (trios[key] || 0) + 1;
        }
      }
    }
  });
  return Object.entries(trios)
    .map(([key, freq]) => ({ dezenas: key.split('-').map(Number), freq }))
    .sort((a, b) => b.freq - a.freq);
}

function detectarCiclos(concursos) {
  const n = concursos.length;
  const ciclos = [];
  for (let num = 1; num <= 25; num++) {
    const aparicoes = [];
    concursos.forEach((c, idx) => { if (c.dezenas.includes(num)) aparicoes.push(idx); });
    if (aparicoes.length < 10) continue;
    const intervalos = [];
    for (let i = 1; i < aparicoes.length; i++) intervalos.push(aparicoes[i] - aparicoes[i - 1]);
    const { media: intMedia, std: intStd } = stdDev(intervalos);
    const cv = intStd / intMedia;
    const atrasoAtual = n - 1 - aparicoes[aparicoes.length - 1];
    ciclos.push({ num, intMedia, intStd, cv, atrasoAtual, previsao: atrasoAtual >= intMedia ? 'IMINENTE' : 'AGUARDANDO' });
  }
  ciclos.sort((a, b) => a.cv - b.cv);
  return ciclos;
}

// ============================================================
// MODELO DE PONTUAÇÃO
// ============================================================

function calcularPontuacaoAvancada(concursos, pesos = null) {
  const [wFreq, wTend, wZ, wCo, wMarkov, wAtraso, wChi] = pesos || [0.10, 0.20, 0.15, 0.20, 0.15, 0.10, 0.10];
  const n = concursos.length;
  const freq = new Array(26).fill(0);
  const ultimaAparicao = new Array(26).fill(-1);
  concursos.forEach((c, idx) => { c.dezenas.forEach(d => { freq[d]++; ultimaAparicao[d] = idx; }); });

  const ema10 = calcularEMA(concursos, 10);
  const ema50 = calcularEMA(concursos, 50);
  const tendencia = detectarTendencia(ema10, ema50);
  const zscores = calcularZScore(concursos, 50);
  const entropia = calcularEntropia(concursos, 50);
  const { chi2, significancia } = calcularChiQuadrado(concursos);
  const markov = calcularMarkov(concursos);
  const { probCond } = calcularCoOcorrencia(concursos);
  const ultimoConcurso = concursos[n - 1].dezenas;

  const pontuacao = [];
  for (let i = 1; i <= 25; i++) {
    const atraso = n - 1 - ultimaAparicao[i];
    const freqPct = freq[i] / n;
    const pFreqHist = freqPct * 100 * wFreq;
    const pTendencia = (0.5 + Math.min(Math.max(tendencia[i], -0.5), 0.5)) * 100 * wTend;
    const zNorm = (Math.min(Math.max(zscores[i], -3), 3) + 3) / 6;
    const pZScore = zNorm * 100 * wZ;
    let pCondMedia = 0;
    ultimoConcurso.forEach(d => { pCondMedia += probCond[d][i]; });
    pCondMedia /= ultimoConcurso.length;
    const pCond = pCondMedia * 100 * wCo;
    const estavanoUltimo = ultimoConcurso.includes(i) ? 1 : 0;
    const pMarkov = markov[i][estavanoUltimo] * 100 * wMarkov;
    const atrasoNorm = Math.min(atraso / 10, 1);
    const entropiaPeso = 1 - entropia[i];
    const pAtraso = atrasoNorm * (0.5 + entropiaPeso * 0.5) * 100 * wAtraso;
    const chiNorm = Math.min(chi2[i] / 10, 1);
    const abaixoEsperado = freq[i] < (n * 15 / 25);
    const pChi = (significancia[i] && abaixoEsperado ? chiNorm : chiNorm * 0.3) * 100 * wChi;
    const total = pFreqHist + pTendencia + pZScore + pCond + pMarkov + pAtraso + pChi;

    pontuacao.push({
      num: i, score: total, freq: freq[i], atraso,
      tendencia: tendencia[i], zscore: zscores[i],
      markov: markov[i][estavanoUltimo], entropia: entropia[i],
      chi2: chi2[i], significativo: significancia[i],
      ema10: ema10[i], ema50: ema50[i]
    });
  }
  pontuacao.sort((a, b) => b.score - a.score);
  return pontuacao;
}

// ============================================================
// GERAÇÃO DE JOGOS
// ============================================================

const MODOS = {
  economico: { nome: 'ECONÔMICO', quantidade: 6, tentativas: 100000, filtroSigma: 1.0 },
  normal: { nome: 'NORMAL', quantidade: 10, tentativas: 80000, filtroSigma: 1.5 },
  agressivo: { nome: 'AGRESSIVO', quantidade: 20, tentativas: 50000, filtroSigma: 2.0 },
};

function gerarJogos(concursos, modo = 'normal', pesos = null) {
  const config = MODOS[modo] || MODOS.normal;
  const n = concursos.length;
  const pontuacao = calcularPontuacaoAvancada(concursos, pesos);

  const somas = concursos.map(c => calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = stdDev(somas);
  const seqs = concursos.map(c => contarSequencias(c.dezenas));
  const { media: seqMedia, std: seqStd } = stdDev(seqs);
  const reps = [];
  for (let i = 1; i < n; i++) reps.push(contarRepeticoes(concursos[i].dezenas, concursos[i - 1].dezenas));
  const { media: repMedia, std: repStd } = stdDev(reps);
  const padGeo = analisarPadroesGeometricos(concursos);
  const ultimoConcurso = concursos[n - 1].dezenas;
  const { probCond } = calcularCoOcorrencia(concursos);
  const sigma = config.filtroSigma;

  const estrategias = [
    { nome: 'TENDÊNCIA', peso: 'tendencia', topN: 18 },
    { nome: 'Z-SCORE', peso: 'zscore', topN: 18 },
    { nome: 'MARKOV', peso: 'markov', topN: 20 },
    { nome: 'ENTROPIA', peso: 'entropia_inv', topN: 20 },
    { nome: 'ATRASO+CHI²', peso: 'atraso', topN: 20 },
    { nome: 'BALANCEADO', peso: 'score', topN: 20 },
  ];

  const jogos = [];

  for (let g = 0; g < config.quantidade; g++) {
    const estrategia = estrategias[g % estrategias.length];
    let melhorJogo = null;
    let melhorScore = -Infinity;

    let poolOrdenado;
    switch (estrategia.peso) {
      case 'tendencia': poolOrdenado = [...pontuacao].sort((a, b) => b.tendencia - a.tendencia); break;
      case 'zscore': poolOrdenado = [...pontuacao].sort((a, b) => b.zscore - a.zscore); break;
      case 'markov': poolOrdenado = [...pontuacao].sort((a, b) => b.markov - a.markov); break;
      case 'entropia_inv': poolOrdenado = [...pontuacao].sort((a, b) => a.entropia - b.entropia); break;
      case 'atraso': poolOrdenado = [...pontuacao].sort((a, b) => b.atraso - a.atraso); break;
      default: poolOrdenado = [...pontuacao];
    }

    const topDezenas = poolOrdenado.slice(0, estrategia.topN).map(p => p.num);

    for (let t = 0; t < config.tentativas; t++) {
      const pool = [...topDezenas];
      for (let i = 1; i <= 25; i++) {
        if (!pool.includes(i) && Math.random() < 0.25) pool.push(i);
      }
      const jogo = [];
      const poolCopy = [...pool];
      while (jogo.length < 15 && poolCopy.length > 0) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        jogo.push(poolCopy.splice(idx, 1)[0]);
      }
      if (jogo.length < 15) continue;
      jogo.sort((a, b) => a - b);

      const soma = calcularSoma(jogo);
      if (soma < somaMedia - sigma * somaStd || soma > somaMedia + sigma * somaStd) continue;
      const pares = contarPares(jogo);
      if (pares < 5 || pares > 10) continue;
      const faixas = distribuicaoFaixas(jogo);
      if (faixas.some(f => f === 0) || faixas.some(f => f > 5)) continue;
      const linhas = distribuicaoLinhas(jogo);
      if (linhas.some(l => l === 0) || linhas.some(l => l > 5)) continue;
      const seqJogo = contarSequencias(jogo);
      if (seqJogo > seqMedia + sigma * seqStd) continue;
      const repJogo = contarRepeticoes(jogo, ultimoConcurso);
      if (repJogo < repMedia - sigma * repStd || repJogo > repMedia + sigma * repStd) continue;
      const primosJogo = contarPrimos(jogo);
      if (primosJogo < padGeo.primos.media - sigma * padGeo.primos.std || primosJogo > padGeo.primos.media + sigma * padGeo.primos.std) continue;

      const jogoStr = jogo.join(',');
      if (jogos.some(j => j.dezenas.join(',') === jogoStr)) continue;

      let scoreJogo = jogo.reduce((s, d) => {
        const p = pontuacao.find(x => x.num === d);
        return s + (p ? p.score : 0);
      }, 0);

      let bonusCo = 0;
      for (let i = 0; i < jogo.length; i++) {
        for (let j = i + 1; j < jogo.length; j++) bonusCo += probCond[jogo[i]][jogo[j]];
      }
      scoreJogo += (bonusCo / 105) * 10;
      scoreJogo += (1 - Math.abs(soma - somaMedia) / somaStd) * 5;

      if (scoreJogo > melhorScore) {
        melhorScore = scoreJogo;
        melhorJogo = jogo;
      }
    }

    if (melhorJogo) {
      jogos.push({
        numero: g + 1,
        dezenas: melhorJogo,
        estrategia: estrategia.nome,
        score: melhorScore,
        soma: calcularSoma(melhorJogo),
        pares: contarPares(melhorJogo),
        impares: contarImpares(melhorJogo),
        sequencias: contarSequencias(melhorJogo),
        repeticoes: contarRepeticoes(melhorJogo, ultimoConcurso),
      });
    }
  }

  return jogos;
}

// ============================================================
// AUTO-CALIBRAÇÃO
// ============================================================

function autoCalibracao(concursos) {
  const n = concursos.length;
  if (n < 300) return null;

  const inicio = n - 50;
  const combinacoes = [
    { nome: 'Padrão', pesos: [0.10, 0.20, 0.15, 0.20, 0.15, 0.10, 0.10] },
    { nome: 'Tendência forte', pesos: [0.05, 0.35, 0.15, 0.15, 0.15, 0.05, 0.10] },
    { nome: 'Markov forte', pesos: [0.05, 0.15, 0.10, 0.20, 0.30, 0.10, 0.10] },
    { nome: 'Co-ocorrência', pesos: [0.05, 0.15, 0.10, 0.35, 0.15, 0.10, 0.10] },
    { nome: 'Z-Score forte', pesos: [0.05, 0.15, 0.30, 0.15, 0.15, 0.10, 0.10] },
    { nome: 'Atraso forte', pesos: [0.05, 0.10, 0.10, 0.15, 0.15, 0.30, 0.15] },
    { nome: 'Equilibrado v2', pesos: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.10] },
    { nome: 'Recência total', pesos: [0.05, 0.30, 0.25, 0.15, 0.15, 0.05, 0.05] },
  ];

  let melhorConfig = combinacoes[0];
  let melhorAcertos = 0;
  const resultados = [];

  for (const config of combinacoes) {
    let totalAcertos = 0;
    for (let c = inicio; c < n; c++) {
      const hist = concursos.slice(0, c);
      const real = concursos[c].dezenas;
      const pontuacao = calcularPontuacaoAvancada(hist, config.pesos);
      const topDezenas = pontuacao.slice(0, 18).map(p => p.num);
      // Simular melhor jogo simples
      let melhor = topDezenas.filter(d => real.includes(d)).length;
      totalAcertos += melhor;
    }
    const media = totalAcertos / 50;
    resultados.push({ nome: config.nome, pesos: config.pesos, media });
    if (totalAcertos > melhorAcertos) { melhorAcertos = totalAcertos; melhorConfig = config; }
  }

  return { melhor: melhorConfig, resultados, mediaGeral: melhorAcertos / 50 };
}

// ============================================================
// BACKTEST
// ============================================================

function executarBacktest(concursos, janelaTeste = 50) {
  const n = concursos.length;
  const inicio = Math.max(200, n - janelaTeste);
  if (n < 250) return null;

  const totalTestes = n - inicio;
  const acertos = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const melhorAcertoPorConcurso = [];

  for (let c = inicio; c < n; c++) {
    const historico = concursos.slice(0, c);
    const real = concursos[c].dezenas;
    const pontuacao = calcularPontuacaoAvancada(historico);
    const topDezenas = pontuacao.slice(0, 18).map(p => p.num);

    // Simular 6 jogos rápidos
    let melhor = 0;
    for (let g = 0; g < 6; g++) {
      const pool = [...topDezenas];
      for (let i = 1; i <= 25; i++) { if (!pool.includes(i) && Math.random() < 0.3) pool.push(i); }
      const jogo = [];
      const pc = [...pool];
      while (jogo.length < 15 && pc.length > 0) { jogo.push(pc.splice(Math.floor(Math.random() * pc.length), 1)[0]); }
      if (jogo.length === 15) {
        const acerto = jogo.filter(d => real.includes(d)).length;
        if (acerto > melhor) melhor = acerto;
      }
    }
    melhorAcertoPorConcurso.push({ concurso: concursos[c].concurso, acerto: melhor });
    if (melhor >= 11) acertos[Math.min(melhor, 15)]++;
  }

  const totalMelhor = melhorAcertoPorConcurso.reduce((s, m) => s + m.acerto, 0);
  const totalPremiados = acertos[11] + acertos[12] + acertos[13] + acertos[14] + acertos[15];

  return {
    totalTestes,
    mediaAcertos: totalMelhor / totalTestes,
    acertos,
    totalPremiados,
    taxaModelo: (totalPremiados / totalTestes * 100),
    porConcurso: melhorAcertoPorConcurso,
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  carregarHistorico, calcularSoma, contarPares, contarImpares,
  calcularEMA, detectarTendencia, calcularEntropia, calcularZScore,
  calcularChiQuadrado, calcularCoOcorrencia, calcularMarkov,
  calcularPontuacaoAvancada, gerarJogos, autoCalibracao, executarBacktest,
  analisarPadroesGeometricos, calcularRepulsao, calcularTrios, detectarCiclos,
  contarPrimos, contarFibonacci, contarBordaMiolo, calcularGaps,
  distribuicaoLinhas, distribuicaoColunas, contarSequencias, contarRepeticoes,
  stdDev, MODOS, PRIMOS, FIBONACCI, BORDA, MIOLO,
};
