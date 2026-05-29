const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// MÓDULO 1: BUSCAR DADOS DA LOTOFÁCIL
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

async function carregarHistorico() {
  console.log('Buscando histórico da Lotofácil...');
  try {
    const data = await fetchJSON('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil');
    const ultimo = data.numero || data.concurso;
    console.log(`Último concurso disponível: ${ultimo}`);

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
      process.stdout.write(`\r  Carregados: ${concursos.length} concursos...`);
    }
    console.log(`\nTotal carregado: ${concursos.length} concursos`);
    concursos.sort((a, b) => a.concurso - b.concurso);
    return concursos;
  } catch (e) {
    console.log('Erro na API, usando dados gerados localmente para demonstração...');
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
// MÓDULO 2: FUNÇÕES ESTATÍSTICAS BÁSICAS
// ============================================================

function calcularSoma(dezenas) {
  return dezenas.reduce((s, d) => s + d, 0);
}

function contarPares(dezenas) {
  return dezenas.filter(d => d % 2 === 0).length;
}

function contarImpares(dezenas) {
  return dezenas.filter(d => d % 2 !== 0).length;
}

function contarBaixas(dezenas) {
  return dezenas.filter(d => d <= 13).length;
}

function contarAltas(dezenas) {
  return dezenas.filter(d => d > 13).length;
}

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

// ============================================================
// MÓDULO 3: MODELOS MATEMÁTICOS AVANÇADOS
// ============================================================

/**
 * Média Móvel Exponencial (EMA)
 * Calcula a EMA da frequência de aparição de cada dezena
 */
function calcularEMA(concursos, periodo) {
  const ema = new Array(26).fill(0);
  const k = 2 / (periodo + 1); // fator de suavização

  for (let i = 1; i <= 25; i++) {
    let valor = 0;
    for (let c = 0; c < concursos.length; c++) {
      const apareceu = concursos[c].dezenas.includes(i) ? 1 : 0;
      if (c === 0) {
        valor = apareceu;
      } else {
        valor = apareceu * k + valor * (1 - k);
      }
    }
    ema[i] = valor;
  }
  return ema;
}

/**
 * Detecta tendência comparando EMA curta vs EMA longa
 * Retorna valor entre -1 (tendência de baixa forte) e +1 (tendência de alta forte)
 */
function detectarTendencia(emaCurta, emaLonga) {
  const tendencia = new Array(26).fill(0);
  for (let i = 1; i <= 25; i++) {
    if (emaLonga[i] > 0) {
      tendencia[i] = (emaCurta[i] - emaLonga[i]) / emaLonga[i];
    }
  }
  return tendencia;
}

/**
 * Entropia de Shannon por dezena
 * Mede a previsibilidade de cada número em janelas deslizantes
 */
function calcularEntropia(concursos, janela = 50) {
  const entropia = new Array(26).fill(0);
  const ultimos = concursos.slice(-janela);
  const n = ultimos.length;

  for (let i = 1; i <= 25; i++) {
    const aparicoes = ultimos.filter(c => c.dezenas.includes(i)).length;
    const p = aparicoes / n;
    const q = 1 - p;

    if (p > 0 && p < 1) {
      entropia[i] = -(p * Math.log2(p) + q * Math.log2(q));
    } else {
      entropia[i] = 0; // certeza total (sempre aparece ou nunca)
    }
  }
  return entropia;
}

/**
 * Z-Score de cada dezena na janela recente
 * Quão acima/abaixo da média histórica está a frequência recente
 */
function calcularZScore(concursos, janela = 50) {
  const n = concursos.length;
  const zscores = new Array(26).fill(0);

  // Frequência histórica (proporção esperada)
  const freqHist = new Array(26).fill(0);
  concursos.forEach(c => c.dezenas.forEach(d => freqHist[d]++));

  // Frequência recente
  const recentes = concursos.slice(-janela);
  const freqRecente = new Array(26).fill(0);
  recentes.forEach(c => c.dezenas.forEach(d => freqRecente[d]++));

  for (let i = 1; i <= 25; i++) {
    const pHist = freqHist[i] / n; // proporção esperada
    const observado = freqRecente[i];
    const esperado = pHist * janela;
    const stdDev = Math.sqrt(janela * pHist * (1 - pHist));

    if (stdDev > 0) {
      zscores[i] = (observado - esperado) / stdDev;
    }
  }
  return zscores;
}

/**
 * Teste Chi-Quadrado para cada dezena
 * Testa se a frequência observada desvia significativamente do esperado
 */
function calcularChiQuadrado(concursos) {
  const n = concursos.length;
  const esperado = n * 15 / 25; // cada dezena deveria aparecer 60% das vezes
  const chi2 = new Array(26).fill(0);
  const significancia = new Array(26).fill(false);

  const freq = new Array(26).fill(0);
  concursos.forEach(c => c.dezenas.forEach(d => freq[d]++));

  for (let i = 1; i <= 25; i++) {
    chi2[i] = Math.pow(freq[i] - esperado, 2) / esperado;
    // Valor crítico para 1 grau de liberdade, α=0.05 é 3.841
    significancia[i] = chi2[i] > 3.841;
  }

  return { chi2, significancia, freq, esperado };
}

/**
 * Matriz de Co-ocorrência
 * P(dezena X aparece | dezena Y aparece no mesmo jogo)
 */
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

  // Converter para probabilidade condicional
  const probCond = Array.from({ length: 26 }, () => new Array(26).fill(0));
  for (let i = 1; i <= 25; i++) {
    for (let j = 1; j <= 25; j++) {
      if (i !== j && freq[i] > 0) {
        probCond[i][j] = matriz[i][j] / freq[i];
      }
    }
  }

  return { matriz, probCond, freq };
}

/**
 * Cadeia de Markov — Transição entre concursos consecutivos
 * P(dezena X aparece no próximo | apareceu/não apareceu no atual)
 */
function calcularMarkov(concursos) {
  // transicao[i][0] = P(i aparece | não apareceu no anterior)
  // transicao[i][1] = P(i aparece | apareceu no anterior)
  const transicao = Array.from({ length: 26 }, () => [0, 0]);
  const contagem = Array.from({ length: 26 }, () => [0, 0]); // [não apareceu, apareceu]
  const acertos = Array.from({ length: 26 }, () => [0, 0]);

  for (let c = 1; c < concursos.length; c++) {
    const anterior = concursos[c - 1].dezenas;
    const atual = concursos[c].dezenas;

    for (let i = 1; i <= 25; i++) {
      const estavaNoanterior = anterior.includes(i) ? 1 : 0;
      const apareceNoAtual = atual.includes(i) ? 1 : 0;

      contagem[i][estavaNoanterior]++;
      if (apareceNoAtual) acertos[i][estavaNoanterior]++;
    }
  }

  for (let i = 1; i <= 25; i++) {
    transicao[i][0] = contagem[i][0] > 0 ? acertos[i][0] / contagem[i][0] : 0;
    transicao[i][1] = contagem[i][1] > 0 ? acertos[i][1] / contagem[i][1] : 0;
  }

  return transicao;
}

/**
 * Desvio padrão de um array de valores
 */
function stdDev(arr) {
  const media = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variancia = arr.reduce((s, v) => s + Math.pow(v - media, 2), 0) / arr.length;
  return { media, std: Math.sqrt(variancia) };
}

// ============================================================
// MÓDULO 3B: PADRÕES GEOMÉTRICOS DO VOLANTE
// ============================================================

// Volante Lotofácil (5x5):
// 01 02 03 04 05
// 06 07 08 09 10
// 11 12 13 14 15
// 16 17 18 19 20
// 21 22 23 24 25

const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

// Diagonais do volante
const DIAGONAL_PRINCIPAL = [1, 7, 13, 19, 25]; // ↘
const DIAGONAL_SECUNDARIA = [5, 9, 13, 17, 21]; // ↙
const DIAGONAL_SUP_DIR = [2, 8, 14, 20]; // paralela ↘
const DIAGONAL_SUP_ESQ = [4, 8, 12, 16]; // paralela ↙
const DIAGONAL_INF_DIR = [6, 12, 18, 24]; // paralela ↘
const DIAGONAL_INF_ESQ = [10, 14, 18, 22]; // paralela ↙

// Quadrantes do volante
const QUADRANTE_SUP_ESQ = [1, 2, 3, 6, 7, 8, 11, 12, 13];
const QUADRANTE_SUP_DIR = [3, 4, 5, 8, 9, 10, 13, 14, 15];
const QUADRANTE_INF_ESQ = [11, 12, 13, 16, 17, 18, 21, 22, 23];
const QUADRANTE_INF_DIR = [13, 14, 15, 18, 19, 20, 23, 24, 25];

// Bordas do volante
const BORDA = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
const MIOLO = [7, 8, 9, 12, 13, 14, 17, 18, 19];

/**
 * Conta números primos no jogo
 */
function contarPrimos(dezenas) {
  return dezenas.filter(d => PRIMOS.includes(d)).length;
}

/**
 * Conta números de Fibonacci no jogo
 */
function contarFibonacci(dezenas) {
  return dezenas.filter(d => FIBONACCI.includes(d)).length;
}

/**
 * Calcula gaps (lacunas) entre dezenas consecutivas
 */
function calcularGaps(dezenas) {
  const gaps = [];
  for (let i = 1; i < dezenas.length; i++) {
    gaps.push(dezenas[i] - dezenas[i - 1]);
  }
  return gaps;
}

/**
 * Conta dezenas na borda vs miolo do volante
 */
function contarBordaMiolo(dezenas) {
  const borda = dezenas.filter(d => BORDA.includes(d)).length;
  const miolo = dezenas.filter(d => MIOLO.includes(d)).length;
  return { borda, miolo };
}

/**
 * Conta dezenas em cada diagonal
 */
function contarDiagonais(dezenas) {
  return {
    principal: dezenas.filter(d => DIAGONAL_PRINCIPAL.includes(d)).length,
    secundaria: dezenas.filter(d => DIAGONAL_SECUNDARIA.includes(d)).length,
    supDir: dezenas.filter(d => DIAGONAL_SUP_DIR.includes(d)).length,
    supEsq: dezenas.filter(d => DIAGONAL_SUP_ESQ.includes(d)).length,
    infDir: dezenas.filter(d => DIAGONAL_INF_DIR.includes(d)).length,
    infEsq: dezenas.filter(d => DIAGONAL_INF_ESQ.includes(d)).length,
  };
}

/**
 * Conta dezenas em cada quadrante
 */
function contarQuadrantes(dezenas) {
  return {
    supEsq: dezenas.filter(d => QUADRANTE_SUP_ESQ.includes(d)).length,
    supDir: dezenas.filter(d => QUADRANTE_SUP_DIR.includes(d)).length,
    infEsq: dezenas.filter(d => QUADRANTE_INF_ESQ.includes(d)).length,
    infDir: dezenas.filter(d => QUADRANTE_INF_DIR.includes(d)).length,
  };
}

/**
 * Verifica simetria horizontal (espelhamento linha 1↔5, 2↔4)
 */
function calcularSimetria(dezenas) {
  let simetricos = 0;
  for (const d of dezenas) {
    const linha = getLinha(d);
    const col = getColuna(d);
    // Espelho vertical: linha espelhada = 6 - linha
    const espelhoV = (6 - linha - 1) * 5 + col;
    if (dezenas.includes(espelhoV)) simetricos++;
    // Espelho horizontal: coluna espelhada = 6 - col
    const espelhoH = (linha - 1) * 5 + (6 - col);
    if (dezenas.includes(espelhoH)) simetricos++;
  }
  return simetricos / 2; // cada par conta 2x
}

/**
 * Análise completa de padrões geométricos do histórico
 */
function analisarPadroesGeometricos(concursos) {
  const n = concursos.length;

  const stats = {
    primos: [], fibonacci: [], borda: [], miolo: [],
    gapMedia: [], gapMax: [], simetria: [],
    diagPrincipal: [], diagSecundaria: []
  };

  concursos.forEach(c => {
    stats.primos.push(contarPrimos(c.dezenas));
    stats.fibonacci.push(contarFibonacci(c.dezenas));
    const bm = contarBordaMiolo(c.dezenas);
    stats.borda.push(bm.borda);
    stats.miolo.push(bm.miolo);
    const gaps = calcularGaps(c.dezenas);
    stats.gapMedia.push(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    stats.gapMax.push(Math.max(...gaps));
    stats.simetria.push(calcularSimetria(c.dezenas));
    const diag = contarDiagonais(c.dezenas);
    stats.diagPrincipal.push(diag.principal);
    stats.diagSecundaria.push(diag.secundaria);
  });

  return {
    primos: stdDev(stats.primos),
    fibonacci: stdDev(stats.fibonacci),
    borda: stdDev(stats.borda),
    miolo: stdDev(stats.miolo),
    gapMedia: stdDev(stats.gapMedia),
    gapMax: stdDev(stats.gapMax),
    simetria: stdDev(stats.simetria),
    diagPrincipal: stdDev(stats.diagPrincipal),
    diagSecundaria: stdDev(stats.diagSecundaria),
  };
}

// ============================================================
// MÓDULO 3C: ANTI-PADRÕES, TRIOS E CICLOS
// ============================================================

/**
 * Identifica pares que RARAMENTE saem juntos (repulsão)
 */
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

  // Esperado: cada par deveria co-ocorrer em ~C(13,23)/C(15,25) * n ≈ 42% dos concursos
  const esperado = n * (13 * 14) / (24 * 25) * 15 / 25; // simplificado
  const esperadoReal = n * 0.42;

  const repulsoes = [];
  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      const obs = coOcorrencia[i][j];
      const ratio = obs / esperadoReal;
      if (ratio < 0.75) { // 25% abaixo do esperado
        repulsoes.push({ a: i, b: j, obs, esperado: esperadoReal, ratio });
      }
    }
  }

  repulsoes.sort((a, b) => a.ratio - b.ratio);
  return repulsoes;
}

/**
 * Identifica trios mais frequentes
 */
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

  // Ordenar por frequência
  const triosArr = Object.entries(trios)
    .map(([key, freq]) => ({ dezenas: key.split('-').map(Number), freq }))
    .sort((a, b) => b.freq - a.freq);

  return triosArr;
}

/**
 * Detecta ciclos — dezenas que aparecem em intervalos regulares
 */
function detectarCiclos(concursos) {
  const n = concursos.length;
  const ciclos = [];

  for (let num = 1; num <= 25; num++) {
    // Encontrar todas as aparições
    const aparicoes = [];
    concursos.forEach((c, idx) => {
      if (c.dezenas.includes(num)) aparicoes.push(idx);
    });

    if (aparicoes.length < 10) continue;

    // Calcular intervalos entre aparições
    const intervalos = [];
    for (let i = 1; i < aparicoes.length; i++) {
      intervalos.push(aparicoes[i] - aparicoes[i - 1]);
    }

    const { media: intMedia, std: intStd } = stdDev(intervalos);

    // Coeficiente de variação — quanto menor, mais regular (cíclico)
    const cv = intStd / intMedia;

    // Último intervalo atual (atraso)
    const atrasoAtual = n - 1 - aparicoes[aparicoes.length - 1];

    // Previsão: se o atraso atual está próximo da média de intervalo
    const proximidade = Math.abs(atrasoAtual - intMedia) / intStd;

    ciclos.push({
      num, intMedia, intStd, cv, atrasoAtual, proximidade,
      previsao: atrasoAtual >= intMedia ? 'IMINENTE' : 'AGUARDANDO'
    });
  }

  ciclos.sort((a, b) => a.cv - b.cv); // mais regulares primeiro
  return ciclos;
}

/**
 * Detecta sequências que se repetem (padrões de saída)
 */
function detectarPadroesRepetidos(concursos) {
  const n = concursos.length;
  const padroes = {};

  // Analisar padrões de 3 concursos consecutivos
  for (let i = 0; i < n - 2; i++) {
    // Padrão: quais dezenas repetiram entre concursos consecutivos
    const rep1 = concursos[i + 1].dezenas.filter(d => concursos[i].dezenas.includes(d));
    const rep2 = concursos[i + 2].dezenas.filter(d => concursos[i + 1].dezenas.includes(d));
    const key = `${rep1.length}-${rep2.length}`;
    padroes[key] = (padroes[key] || 0) + 1;
  }

  return padroes;
}

// ============================================================
// MÓDULO 3D: MODOS DE JOGO (ECONÔMICO / AGRESSIVO)
// ============================================================

const MODOS = {
  economico: {
    nome: 'ECONÔMICO',
    descricao: '6 jogos ultra-filtrados, máxima qualidade',
    quantidade: 6,
    tentativas: 100000,
    filtroSigma: 1.0, // filtros mais apertados
  },
  normal: {
    nome: 'NORMAL',
    descricao: '10 jogos balanceados',
    quantidade: 10,
    tentativas: 80000,
    filtroSigma: 1.5,
  },
  agressivo: {
    nome: 'AGRESSIVO',
    descricao: '20 jogos com máxima cobertura',
    quantidade: 20,
    tentativas: 50000,
    filtroSigma: 2.0, // filtros mais relaxados para diversidade
  }
};

// ============================================================
// MÓDULO 4: ANÁLISE POR JANELAS (mantido + melhorado)
// ============================================================

function analisarJanela(concursos, label) {
  const n = concursos.length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  JANELA: ${label} (${n} concursos)`);
  console.log(`${'='.repeat(60)}`);

  const freq = new Array(26).fill(0);
  const atrasoAtual = new Array(26).fill(0);
  const ultimaAparicao = new Array(26).fill(-1);

  concursos.forEach((c, idx) => {
    c.dezenas.forEach(d => {
      freq[d]++;
      ultimaAparicao[d] = idx;
    });
  });

  for (let i = 1; i <= 25; i++) {
    atrasoAtual[i] = n - 1 - ultimaAparicao[i];
  }

  const somas = concursos.map(c => calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = stdDev(somas);

  const paridades = {};
  concursos.forEach(c => {
    const p = contarPares(c.dezenas);
    const imp = contarImpares(c.dezenas);
    const key = `${p}P/${imp}I`;
    paridades[key] = (paridades[key] || 0) + 1;
  });

  const seqs = concursos.map(c => contarSequencias(c.dezenas));
  const { media: seqMedia } = stdDev(seqs);

  const reps = [];
  for (let i = 1; i < concursos.length; i++) {
    reps.push(contarRepeticoes(concursos[i].dezenas, concursos[i - 1].dezenas));
  }
  const repMedia = reps.length > 0 ? reps.reduce((a, b) => a + b, 0) / reps.length : 0;

  console.log(`\n--- FREQUÊNCIA DAS DEZENAS ---`);
  const freqOrdenada = [];
  for (let i = 1; i <= 25; i++) freqOrdenada.push({ num: i, freq: freq[i], atraso: atrasoAtual[i] });
  freqOrdenada.sort((a, b) => b.freq - a.freq);
  freqOrdenada.forEach(f => {
    const bar = '█'.repeat(Math.round(f.freq / n * 50));
    console.log(`  ${String(f.num).padStart(2)}: ${String(f.freq).padStart(4)}x (${(f.freq / n * 100).toFixed(1)}%) atraso:${f.atraso} ${bar}`);
  });

  console.log(`\n--- SOMA ---`);
  console.log(`  Mín: ${Math.min(...somas)} | Máx: ${Math.max(...somas)} | Média: ${somaMedia.toFixed(1)} | σ: ${somaStd.toFixed(1)}`);
  console.log(`  Banda 1σ: [${(somaMedia - somaStd).toFixed(0)}, ${(somaMedia + somaStd).toFixed(0)}]`);
  console.log(`  Banda 1.5σ: [${(somaMedia - 1.5 * somaStd).toFixed(0)}, ${(somaMedia + 1.5 * somaStd).toFixed(0)}]`);

  console.log(`\n--- PARIDADE ---`);
  Object.entries(paridades).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}x (${(v / n * 100).toFixed(1)}%)`);
  });

  console.log(`\n--- SEQUÊNCIAS: Média ${seqMedia.toFixed(2)} ---`);
  console.log(`--- REPETIÇÃO DO ANTERIOR: Média ${repMedia.toFixed(2)} ---`);

  return { freq, atrasoAtual, somaMedia, somaStd };
}

// ============================================================
// MÓDULO 5: MODELO DE PONTUAÇÃO AVANÇADO
// ============================================================

function calcularPontuacaoAvancada(concursos) {
  const n = concursos.length;

  // Frequência histórica
  const freq = new Array(26).fill(0);
  const ultimaAparicao = new Array(26).fill(-1);
  concursos.forEach((c, idx) => {
    c.dezenas.forEach(d => { freq[d]++; ultimaAparicao[d] = idx; });
  });

  // EMA com 3 períodos
  const ema10 = calcularEMA(concursos, 10);
  const ema20 = calcularEMA(concursos, 20);
  const ema50 = calcularEMA(concursos, 50);
  const tendencia = detectarTendencia(ema10, ema50);

  // Z-Score
  const zscores = calcularZScore(concursos, 50);

  // Entropia
  const entropia = calcularEntropia(concursos, 50);

  // Chi-Quadrado
  const { chi2, significancia } = calcularChiQuadrado(concursos);

  // Markov
  const markov = calcularMarkov(concursos);
  const ultimoConcurso = concursos[n - 1].dezenas;

  // Co-ocorrência
  const { probCond } = calcularCoOcorrencia(concursos);

  // Calcular score composto para cada dezena
  const pontuacao = [];

  for (let i = 1; i <= 25; i++) {
    const atraso = n - 1 - ultimaAparicao[i];
    const freqPct = freq[i] / n;

    // 1. Frequência histórica normalizada (10%)
    const pFreqHist = freqPct * 100 * 0.10;

    // 2. EMA/Tendência (20%) — bonus para tendência de alta
    const pTendencia = (0.5 + Math.min(Math.max(tendencia[i], -0.5), 0.5)) * 100 * 0.20;

    // 3. Z-Score recente (15%) — dezenas acima da média recente
    const zNorm = (Math.min(Math.max(zscores[i], -3), 3) + 3) / 6; // normaliza 0-1
    const pZScore = zNorm * 100 * 0.15;

    // 4. Probabilidade condicional / co-ocorrência (20%)
    // Média da prob condicional com as dezenas do último concurso
    let pCondMedia = 0;
    ultimoConcurso.forEach(d => { pCondMedia += probCond[d][i]; });
    pCondMedia /= ultimoConcurso.length;
    const pCond = pCondMedia * 100 * 0.20;

    // 5. Markov (15%) — prob de aparecer dado estado anterior
    const estavanoUltimo = ultimoConcurso.includes(i) ? 1 : 0;
    const pMarkov = markov[i][estavanoUltimo] * 100 * 0.15;

    // 6. Atraso ponderado por entropia (10%)
    // Quanto maior o atraso E menor a entropia (mais previsível), mais pontos
    const atrasoNorm = Math.min(atraso / 10, 1);
    const entropiaPeso = 1 - entropia[i]; // entropia baixa = mais previsível
    const pAtraso = atrasoNorm * (0.5 + entropiaPeso * 0.5) * 100 * 0.10;

    // 7. Chi-quadrado (10%) — dezenas com desvio significativo
    const chiNorm = Math.min(chi2[i] / 10, 1);
    // Se está abaixo do esperado E é significativo, bonus (está "devida")
    const abaixoEsperado = freq[i] < (n * 15 / 25);
    const pChi = (significancia[i] && abaixoEsperado ? chiNorm : chiNorm * 0.3) * 100 * 0.10;

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
// MÓDULO 6: GERAÇÃO DE JOGOS DIVERSIFICADA
// ============================================================

function gerarJogos(concursos, quantidade = 6) {
  const n = concursos.length;
  const pontuacao = calcularPontuacaoAvancada(concursos);

  // Parâmetros estatísticos para filtros
  const somas = concursos.map(c => calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = stdDev(somas);

  const seqs = concursos.map(c => contarSequencias(c.dezenas));
  const { media: seqMedia, std: seqStd } = stdDev(seqs);

  const reps = [];
  for (let i = 1; i < n; i++) {
    reps.push(contarRepeticoes(concursos[i].dezenas, concursos[i - 1].dezenas));
  }
  const { media: repMedia, std: repStd } = stdDev(reps);

  const ultimoConcurso = concursos[n - 1].dezenas;
  const { probCond } = calcularCoOcorrencia(concursos);

  // Padrões geométricos para filtros
  const padGeo = analisarPadroesGeometricos(concursos);

  // Estratégias de geração
  const estrategias = [
    { nome: 'TENDÊNCIA (EMA Alta)', peso: 'tendencia', topN: 18 },
    { nome: 'TENDÊNCIA + Z-SCORE', peso: 'zscore', topN: 18 },
    { nome: 'MARKOV + CO-OCORRÊNCIA', peso: 'markov', topN: 20 },
    { nome: 'MARKOV + ENTROPIA', peso: 'entropia_inv', topN: 20 },
    { nome: 'ATRASO + CHI² (Devidas)', peso: 'atraso', topN: 20 },
    { nome: 'MODELO COMPLETO (Balanceado)', peso: 'score', topN: 20 },
  ];

  const jogos = [];
  const tentativasMax = 80000;

  for (let g = 0; g < quantidade; g++) {
    const estrategia = estrategias[g % estrategias.length];
    let melhorJogo = null;
    let melhorScore = -Infinity;

    // Ordenar pool pela estratégia
    let poolOrdenado;
    switch (estrategia.peso) {
      case 'tendencia':
        poolOrdenado = [...pontuacao].sort((a, b) => b.tendencia - a.tendencia);
        break;
      case 'zscore':
        poolOrdenado = [...pontuacao].sort((a, b) => b.zscore - a.zscore);
        break;
      case 'markov':
        poolOrdenado = [...pontuacao].sort((a, b) => b.markov - a.markov);
        break;
      case 'entropia_inv':
        poolOrdenado = [...pontuacao].sort((a, b) => a.entropia - b.entropia);
        break;
      case 'atraso':
        poolOrdenado = [...pontuacao].sort((a, b) => b.atraso - a.atraso);
        break;
      default:
        poolOrdenado = [...pontuacao];
    }

    const topDezenas = poolOrdenado.slice(0, estrategia.topN).map(p => p.num);

    for (let t = 0; t < tentativasMax; t++) {
      const pool = [...topDezenas];
      // Adicionar dezenas extras para diversidade
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

      // --- FILTROS BASEADOS EM DESVIO PADRÃO ---

      // Soma dentro de 1.5σ
      const soma = calcularSoma(jogo);
      if (soma < somaMedia - 1.5 * somaStd || soma > somaMedia + 1.5 * somaStd) continue;

      // Paridade: 5 a 10 pares
      const pares = contarPares(jogo);
      if (pares < 5 || pares > 10) continue;

      // Faixas: todas representadas, nenhuma > 5
      const faixas = distribuicaoFaixas(jogo);
      if (faixas.some(f => f === 0) || faixas.some(f => f > 5)) continue;

      // Linhas: todas representadas, nenhuma > 5
      const linhas = distribuicaoLinhas(jogo);
      if (linhas.some(l => l === 0) || linhas.some(l => l > 5)) continue;

      // Sequências dentro de média + 1.5σ
      const seqJogo = contarSequencias(jogo);
      if (seqJogo > seqMedia + 1.5 * seqStd) continue;

      // Repetições dentro de média ± 1.5σ
      const repJogo = contarRepeticoes(jogo, ultimoConcurso);
      if (repJogo < repMedia - 1.5 * repStd || repJogo > repMedia + 1.5 * repStd) continue;

      // Filtros geométricos (dentro de ±1.5σ da média histórica)
      const primosJogo = contarPrimos(jogo);
      if (primosJogo < padGeo.primos.media - 1.5 * padGeo.primos.std || primosJogo > padGeo.primos.media + 1.5 * padGeo.primos.std) continue;

      const bmJogo = contarBordaMiolo(jogo);
      if (bmJogo.borda < padGeo.borda.media - 1.5 * padGeo.borda.std || bmJogo.borda > padGeo.borda.media + 1.5 * padGeo.borda.std) continue;

      const gapsJogo = calcularGaps(jogo);
      const gapMaxJogo = Math.max(...gapsJogo);
      if (gapMaxJogo > padGeo.gapMax.media + 1.5 * padGeo.gapMax.std) continue;

      // Não duplicar jogos
      const jogoStr = jogo.join(',');
      if (jogos.some(j => j.join(',') === jogoStr)) continue;

      // --- SCORE DO JOGO ---
      let scoreJogo = jogo.reduce((s, d) => {
        const p = pontuacao.find(x => x.num === d);
        return s + (p ? p.score : 0);
      }, 0);

      // Bonus co-ocorrência: pares com alta correlação
      let bonusCo = 0;
      for (let i = 0; i < jogo.length; i++) {
        for (let j = i + 1; j < jogo.length; j++) {
          bonusCo += probCond[jogo[i]][jogo[j]];
        }
      }
      bonusCo = bonusCo / (15 * 14 / 2) * 10; // normalizar

      // Bonus equilíbrio de soma
      const bonusSoma = (1 - Math.abs(soma - somaMedia) / somaStd) * 5;

      const scoreFinal = scoreJogo + bonusCo + bonusSoma;

      if (scoreFinal > melhorScore) {
        melhorScore = scoreFinal;
        melhorJogo = jogo;
      }
    }

    if (melhorJogo) {
      jogos.push(melhorJogo);
      jogos[jogos.length - 1].estrategia = estrategia.nome;
      jogos[jogos.length - 1].scoreFinal = melhorScore;
    }
  }

  return jogos;
}

// ============================================================
// MÓDULO 7: EXECUÇÃO PRINCIPAL
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  LOTOFÁCIL — ANÁLISE AVANÇADA COM MODELOS MATEMÁTICOS       ║');
  console.log('║  EMA | Entropia | Markov | Chi² | Co-ocorrência | Z-Score   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const concursos = await carregarHistorico();

  if (concursos.length === 0) {
    console.log('Nenhum dado carregado. Abortando.');
    return;
  }

  const n = concursos.length;

  // --- Análise por janelas ---
  analisarJanela(concursos, 'HISTÓRICO COMPLETO');
  if (n >= 200) analisarJanela(concursos.slice(-200), 'ÚLTIMOS 200');
  if (n >= 100) analisarJanela(concursos.slice(-100), 'ÚLTIMOS 100');
  if (n >= 50) analisarJanela(concursos.slice(-50), 'ÚLTIMOS 50');
  if (n >= 20) analisarJanela(concursos.slice(-20), 'ÚLTIMOS 20');

  // --- Modelos Avançados ---
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  MODELOS MATEMÁTICOS AVANÇADOS`);
  console.log(`${'═'.repeat(60)}`);

  // EMA e Tendência
  const ema10 = calcularEMA(concursos, 10);
  const ema50 = calcularEMA(concursos, 50);
  const tendencia = detectarTendencia(ema10, ema50);

  console.log(`\n--- TENDÊNCIA (EMA 10 vs EMA 50) ---`);
  const tendOrdenada = [];
  for (let i = 1; i <= 25; i++) tendOrdenada.push({ num: i, tend: tendencia[i], ema10: ema10[i], ema50: ema50[i] });
  tendOrdenada.sort((a, b) => b.tend - a.tend);
  console.log('  EM ALTA:');
  tendOrdenada.filter(t => t.tend > 0).slice(0, 10).forEach(t => {
    console.log(`    Dezena ${String(t.num).padStart(2)}: +${(t.tend * 100).toFixed(1)}% (EMA10=${t.ema10.toFixed(3)} EMA50=${t.ema50.toFixed(3)})`);
  });
  console.log('  EM BAIXA:');
  tendOrdenada.filter(t => t.tend < 0).slice(-5).reverse().forEach(t => {
    console.log(`    Dezena ${String(t.num).padStart(2)}: ${(t.tend * 100).toFixed(1)}% (EMA10=${t.ema10.toFixed(3)} EMA50=${t.ema50.toFixed(3)})`);
  });

  // Z-Score
  const zscores = calcularZScore(concursos, 50);
  console.log(`\n--- Z-SCORE (Últimos 50 concursos vs Histórico) ---`);
  const zOrdenado = [];
  for (let i = 1; i <= 25; i++) zOrdenado.push({ num: i, z: zscores[i] });
  zOrdenado.sort((a, b) => b.z - a.z);
  zOrdenado.forEach(z => {
    const sinal = z.z >= 0 ? '+' : '';
    const barra = z.z >= 0 ? '▲'.repeat(Math.min(Math.round(z.z * 2), 10)) : '▼'.repeat(Math.min(Math.round(-z.z * 2), 10));
    console.log(`  Dezena ${String(z.num).padStart(2)}: Z=${sinal}${z.z.toFixed(2)} ${barra}`);
  });

  // Chi-Quadrado
  const { chi2, significancia, freq, esperado } = calcularChiQuadrado(concursos);
  console.log(`\n--- TESTE CHI-QUADRADO (α=0.05, crítico=3.841) ---`);
  console.log(`  Esperado por dezena: ${esperado.toFixed(1)} aparições`);
  for (let i = 1; i <= 25; i++) {
    if (significancia[i]) {
      const status = freq[i] > esperado ? 'QUENTE ↑' : 'FRIA ↓ (devida)';
      console.log(`  ★ Dezena ${String(i).padStart(2)}: χ²=${chi2[i].toFixed(2)} — ${status} (obs=${freq[i]} esp=${esperado.toFixed(0)})`);
    }
  }

  // Markov
  const markov = calcularMarkov(concursos);
  const ultimoConcurso = concursos[n - 1].dezenas;
  console.log(`\n--- CADEIA DE MARKOV (Prob. próximo concurso) ---`);
  console.log(`  Último concurso: [${ultimoConcurso.join(', ')}]`);
  const markovRank = [];
  for (let i = 1; i <= 25; i++) {
    const estado = ultimoConcurso.includes(i) ? 1 : 0;
    markovRank.push({ num: i, prob: markov[i][estado], estado });
  }
  markovRank.sort((a, b) => b.prob - a.prob);
  console.log('  Top 15 por probabilidade de transição:');
  markovRank.slice(0, 15).forEach((m, idx) => {
    const tag = m.estado ? '[repetir]' : '[entrar]';
    console.log(`    ${idx + 1}. Dezena ${String(m.num).padStart(2)}: ${(m.prob * 100).toFixed(1)}% ${tag}`);
  });

  // Co-ocorrência — Top pares
  const { probCond, matriz } = calcularCoOcorrencia(concursos);
  console.log(`\n--- TOP 15 PARES MAIS CORRELACIONADOS ---`);
  const pares = [];
  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      pares.push({ a: i, b: j, co: matriz[i][j], prob: probCond[i][j] });
    }
  }
  pares.sort((a, b) => b.co - a.co);
  pares.slice(0, 15).forEach((p, idx) => {
    console.log(`    ${idx + 1}. [${String(p.a).padStart(2)}, ${String(p.b).padStart(2)}]: ${p.co}x juntos (P=${(p.prob * 100).toFixed(1)}%)`);
  });

  // Entropia
  const entropia = calcularEntropia(concursos, 50);
  console.log(`\n--- ENTROPIA DE SHANNON (Últimos 50) ---`);
  const entOrdenada = [];
  for (let i = 1; i <= 25; i++) entOrdenada.push({ num: i, ent: entropia[i] });
  entOrdenada.sort((a, b) => a.ent - b.ent);
  console.log('  Mais previsíveis (entropia baixa):');
  entOrdenada.slice(0, 5).forEach(e => {
    console.log(`    Dezena ${String(e.num).padStart(2)}: H=${e.ent.toFixed(4)}`);
  });
  console.log('  Mais imprevisíveis (entropia alta):');
  entOrdenada.slice(-5).reverse().forEach(e => {
    console.log(`    Dezena ${String(e.num).padStart(2)}: H=${e.ent.toFixed(4)}`);
  });

  // --- Padrões Geométricos ---
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  PADRÕES GEOMÉTRICOS DO VOLANTE`);
  console.log(`${'═'.repeat(60)}`);

  const padGeo = analisarPadroesGeometricos(concursos);

  console.log(`\n  Volante 5x5:`);
  console.log(`  ┌────┬────┬────┬────┬────┐`);
  console.log(`  │ 01 │ 02 │ 03 │ 04 │ 05 │`);
  console.log(`  ├────┼────┼────┼────┼────┤`);
  console.log(`  │ 06 │ 07 │ 08 │ 09 │ 10 │`);
  console.log(`  ├────┼────┼────┼────┼────┤`);
  console.log(`  │ 11 │ 12 │ 13 │ 14 │ 15 │`);
  console.log(`  ├────┼────┼────┼────┼────┤`);
  console.log(`  │ 16 │ 17 │ 18 │ 19 │ 20 │`);
  console.log(`  ├────┼────┼────┼────┼────┤`);
  console.log(`  │ 21 │ 22 │ 23 │ 24 │ 25 │`);
  console.log(`  └────┴────┴────┴────┴────┘`);

  console.log(`\n  Médias históricas por concurso:`);
  console.log(`    Primos (2,3,5,7,11,13,17,19,23): ${padGeo.primos.media.toFixed(2)} ±${padGeo.primos.std.toFixed(2)}`);
  console.log(`    Fibonacci (1,2,3,5,8,13,21):     ${padGeo.fibonacci.media.toFixed(2)} ±${padGeo.fibonacci.std.toFixed(2)}`);
  console.log(`    Borda do volante:                 ${padGeo.borda.media.toFixed(2)} ±${padGeo.borda.std.toFixed(2)}`);
  console.log(`    Miolo do volante:                 ${padGeo.miolo.media.toFixed(2)} ±${padGeo.miolo.std.toFixed(2)}`);
  console.log(`    Gap médio entre dezenas:          ${padGeo.gapMedia.media.toFixed(2)} ±${padGeo.gapMedia.std.toFixed(2)}`);
  console.log(`    Gap máximo:                       ${padGeo.gapMax.media.toFixed(2)} ±${padGeo.gapMax.std.toFixed(2)}`);
  console.log(`    Simetria (pares espelhados):      ${padGeo.simetria.media.toFixed(2)} ±${padGeo.simetria.std.toFixed(2)}`);
  console.log(`    Diagonal principal (↘):           ${padGeo.diagPrincipal.media.toFixed(2)} ±${padGeo.diagPrincipal.std.toFixed(2)}`);
  console.log(`    Diagonal secundária (↙):          ${padGeo.diagSecundaria.media.toFixed(2)} ±${padGeo.diagSecundaria.std.toFixed(2)}`);

  // Último concurso vs padrões
  const ultGeo = {
    primos: contarPrimos(ultimoConcurso),
    fibonacci: contarFibonacci(ultimoConcurso),
    ...contarBordaMiolo(ultimoConcurso),
    simetria: calcularSimetria(ultimoConcurso),
  };
  console.log(`\n  Último concurso [${ultimoConcurso.join(',')}]:`);
  console.log(`    Primos: ${ultGeo.primos} | Fibonacci: ${ultGeo.fibonacci} | Borda: ${ultGeo.borda} | Miolo: ${ultGeo.miolo} | Simetria: ${ultGeo.simetria}`);

  // --- Anti-Padrões e Ciclos ---
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ANTI-PADRÕES, TRIOS E CICLOS`);
  console.log(`${'═'.repeat(60)}`);

  // Repulsão
  const repulsoes = calcularRepulsao(concursos);
  console.log(`\n--- TOP 10 PARES COM REPULSÃO (raramente saem juntos) ---`);
  repulsoes.slice(0, 10).forEach((r, idx) => {
    console.log(`    ${idx + 1}. [${String(r.a).padStart(2)}, ${String(r.b).padStart(2)}]: ${r.obs}x (esperado ~${r.esperado.toFixed(0)}, ratio=${r.ratio.toFixed(2)})`);
  });

  // Trios
  const trios = calcularTrios(concursos);
  console.log(`\n--- TOP 10 TRIOS MAIS FREQUENTES ---`);
  trios.slice(0, 10).forEach((t, idx) => {
    console.log(`    ${idx + 1}. [${t.dezenas.map(d => String(d).padStart(2)).join(', ')}]: ${t.freq}x`);
  });

  // Ciclos
  const ciclos = detectarCiclos(concursos);
  console.log(`\n--- CICLOS — Dezenas com intervalo mais regular ---`);
  console.log('  (CV baixo = mais previsível)');
  ciclos.slice(0, 10).forEach((c, idx) => {
    const status = c.previsao === 'IMINENTE' ? '🔴 IMINENTE' : '⚪ aguardando';
    console.log(`    ${idx + 1}. Dezena ${String(c.num).padStart(2)}: intervalo médio=${c.intMedia.toFixed(1)} ±${c.intStd.toFixed(1)} | CV=${c.cv.toFixed(3)} | atraso=${c.atrasoAtual} ${status}`);
  });

  // Padrões de repetição
  const padRep = detectarPadroesRepetidos(concursos);
  console.log(`\n--- PADRÕES DE REPETIÇÃO (rep. concurso A→B, B→C) ---`);
  Object.entries(padRep).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => {
    console.log(`    Padrão ${k} repetições: ${v}x (${(v / (n - 2) * 100).toFixed(1)}%)`);
  });


  // --- Pontuação Final ---
  const pontuacao = calcularPontuacaoAvancada(concursos);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RANKING FINAL — MODELO COMPOSTO`);
  console.log(`${'═'.repeat(60)}`);
  console.log('  Pesos: FreqHist=10% | Tendência=20% | Z-Score=15% | Co-ocorr=20% | Markov=15% | Atraso×Entropia=10% | Chi²=10%');
  console.log('');
  pontuacao.forEach((p, idx) => {
    const trend = p.tendencia >= 0 ? `+${(p.tendencia * 100).toFixed(1)}%` : `${(p.tendencia * 100).toFixed(1)}%`;
    const chi = p.significativo ? '★' : ' ';
    console.log(`  ${String(idx + 1).padStart(2)}. Dezena ${String(p.num).padStart(2)}: Score=${p.score.toFixed(2)} | Tend=${trend} | Z=${p.zscore.toFixed(2)} | Markov=${(p.markov * 100).toFixed(1)}% | Atraso=${p.atraso} ${chi}`);
  });

  // --- Gerar Jogos ---
  // Detectar modo via argumento: node lotofacil.js [economico|normal|agressivo]
  const argModo = process.argv[2] || 'normal';
  const modo = MODOS[argModo] || MODOS.normal;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  JOGOS GERADOS — MODO ${modo.nome} (${modo.quantidade} jogos)`);
  console.log(`  ${modo.descricao}`);
  console.log(`${'═'.repeat(60)}`);

  // Auto-calibração: encontrar melhores pesos
  const pesosOtimizados = autoCalibraçao(concursos);

  // Gerar jogos com pesos otimizados (se disponíveis) ou padrão
  let jogos;
  if (pesosOtimizados) {
    console.log(`\n  Gerando ${modo.quantidade} jogos com pesos otimizados...`);
    jogos = gerarJogosComPesos(concursos, modo.quantidade, pesosOtimizados);
    const nomes = ['TENDÊNCIA', 'Z-SCORE', 'MARKOV', 'ENTROPIA', 'ATRASO+CHI²', 'BALANCEADO'];
    jogos.forEach((j, i) => { j.estrategia = nomes[i % nomes.length] + ' (calibrado)'; j.scoreFinal = 0; });
  } else {
    jogos = gerarJogos(concursos, modo.quantidade);
  }

  jogos.forEach((jogo, idx) => {
    const soma = calcularSoma(jogo);
    const pares2 = contarPares(jogo);
    const impares = contarImpares(jogo);
    const rep = contarRepeticoes(jogo, ultimoConcurso);
    const seq = contarSequencias(jogo);

    console.log(`\n  ┌─── JOGO ${idx + 1}: ${jogo.estrategia || 'MODELO COMPLETO'} ───┐`);
    console.log(`  │ Dezenas: [${jogo.map(d => String(d).padStart(2, '0')).join(', ')}]`);
    console.log(`  │ Soma: ${soma} | Par/Ímpar: ${pares2}/${impares} | Seq: ${seq} | Rep: ${rep}`);
    console.log(`  │ Score: ${(jogo.scoreFinal || 0).toFixed(2)}`);
    console.log(`  └${'─'.repeat(50)}┘`);
  });

  // Resumo final
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESUMO`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Concursos analisados: ${n}`);
  console.log(`  Último concurso: #${concursos[n - 1].concurso} — [${ultimoConcurso.join(', ')}]`);
  console.log(`  Modelos aplicados: EMA, Z-Score, Entropia, Chi², Markov, Co-ocorrência`);
  console.log(`  Jogos gerados: ${jogos.length}`);
  // --- CONFERIR JOGOS ANTERIORES ---
  await conferirJogos(concursos);

  // --- GERAR RELATÓRIO HTML ---
  const ciclosData = detectarCiclos(concursos);
  const repulsoesData = calcularRepulsao(concursos);
  const triosData = calcularTrios(concursos);
  gerarRelatorioHTML(concursos, jogos, pontuacao, padGeo, ciclosData, repulsoesData, triosData, modo);

  // --- BACKTESTING ---
  await executarBacktest(concursos);

  // --- SALVAR JOGOS GERADOS ---
  salvarJogos(jogos, ultimoConcurso, concursos[n - 1].concurso);

  console.log(`\n  ⚠ Loteria é aleatória. Este sistema usa estatística para informar,`);
  console.log(`    não para garantir resultados. Jogue com responsabilidade.`);
  console.log('');
}

// ============================================================
// MÓDULO 8: BACKTESTING — VALIDAÇÃO DO MODELO
// ============================================================

/**
 * Simula o modelo nos últimos N concursos para medir taxa de acerto.
 * Para cada concurso C, usa todos os concursos anteriores a C como base,
 * gera 6 jogos e verifica quantos números acertou no concurso real.
 */
async function executarBacktest(concursos, janelaTeste = 100) {
  const n = concursos.length;
  const inicio = Math.max(200, n - janelaTeste); // precisa de pelo menos 200 concursos de histórico

  if (n < 250) {
    console.log(`\n  [Backtest] Dados insuficientes (mínimo 250 concursos, tem ${n}). Pulando...`);
    return;
  }

  const totalTestes = n - inicio;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BACKTESTING — VALIDAÇÃO DO MODELO`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Simulando ${totalTestes} concursos (do #${concursos[inicio].concurso} ao #${concursos[n - 1].concurso})`);
  console.log(`  Para cada concurso, gera 6 jogos usando apenas dados anteriores.\n`);

  // Contadores de acertos
  const acertos = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const melhorAcertoPorConcurso = [];
  let totalMelhorAcerto = 0;

  for (let c = inicio; c < n; c++) {
    const historico = concursos.slice(0, c); // só dados anteriores
    const real = concursos[c].dezenas;

    // Gerar jogos com o modelo (usando histórico até antes do concurso)
    const jogos = gerarJogosBacktest(historico, 6);

    // Verificar melhor acerto entre os 6 jogos
    let melhor = 0;
    jogos.forEach(jogo => {
      const acerto = jogo.filter(d => real.includes(d)).length;
      if (acerto > melhor) melhor = acerto;
    });

    melhorAcertoPorConcurso.push(melhor);
    totalMelhorAcerto += melhor;

    if (melhor >= 11) acertos[Math.min(melhor, 15)]++;

    // Progresso
    if ((c - inicio) % 20 === 0 || c === n - 1) {
      process.stdout.write(`\r  Progresso: ${c - inicio + 1}/${totalTestes} concursos testados...`);
    }
  }

  console.log('\n');

  // Resultados
  const mediaAcertos = totalMelhorAcerto / totalTestes;

  console.log('  ┌────────────────────────────────────────────────┐');
  console.log('  │         RESULTADO DO BACKTESTING                │');
  console.log('  ├────────────────────────────────────────────────┤');
  console.log(`  │  Concursos testados: ${totalTestes}`);
  console.log(`  │  Média de acertos (melhor jogo): ${mediaAcertos.toFixed(2)} de 15`);
  console.log('  │');
  console.log('  │  Distribuição de acertos (melhor jogo dos 6):');
  console.log(`  │    15 acertos (1º prêmio):  ${acertos[15]}x (${(acertos[15] / totalTestes * 100).toFixed(2)}%)`);
  console.log(`  │    14 acertos (2º prêmio):  ${acertos[14]}x (${(acertos[14] / totalTestes * 100).toFixed(2)}%)`);
  console.log(`  │    13 acertos (3º prêmio):  ${acertos[13]}x (${(acertos[13] / totalTestes * 100).toFixed(2)}%)`);
  console.log(`  │    12 acertos (4º prêmio):  ${acertos[12]}x (${(acertos[12] / totalTestes * 100).toFixed(2)}%)`);
  console.log(`  │    11 acertos (5º prêmio):  ${acertos[11]}x (${(acertos[11] / totalTestes * 100).toFixed(2)}%)`);
  console.log('  │');

  const totalPremiados = acertos[11] + acertos[12] + acertos[13] + acertos[14] + acertos[15];
  console.log(`  │  Total de concursos com prêmio: ${totalPremiados}/${totalTestes} (${(totalPremiados / totalTestes * 100).toFixed(1)}%)`);
  console.log('  │');

  // Comparar com probabilidade aleatória
  // Prob de acertar 11+ com 6 jogos de 15 números em 25
  // P(11 acertos em 1 jogo) ≈ 3.27%, com 6 jogos ≈ 18.3%
  const probAleatoria11 = 18.3;
  const taxaModelo = (totalPremiados / totalTestes * 100);
  const vantagem = taxaModelo - probAleatoria11;

  console.log(`  │  Comparação com aleatório:`);
  console.log(`  │    Prob. aleatória (11+ com 6 jogos): ~${probAleatoria11}%`);
  console.log(`  │    Taxa do modelo: ${taxaModelo.toFixed(1)}%`);
  console.log(`  │    Vantagem: ${vantagem >= 0 ? '+' : ''}${vantagem.toFixed(1)} pontos percentuais`);
  console.log('  │');

  // Histograma de acertos
  console.log('  │  Histograma (melhor acerto por concurso):');
  const histograma = new Array(16).fill(0);
  melhorAcertoPorConcurso.forEach(a => histograma[a]++);
  for (let i = 15; i >= 8; i--) {
    const barra = '█'.repeat(Math.round(histograma[i] / totalTestes * 100));
    console.log(`  │    ${String(i).padStart(2)} acertos: ${String(histograma[i]).padStart(4)}x (${(histograma[i] / totalTestes * 100).toFixed(1)}%) ${barra}`);
  }

  console.log('  └────────────────────────────────────────────────┘');
}

/**
 * Versão simplificada da geração para backtest (mais rápida)
 * Usa menos tentativas para não demorar demais
 */
function gerarJogosBacktest(concursos, quantidade = 6) {
  const n = concursos.length;
  const pontuacao = calcularPontuacaoAvancada(concursos);

  const somas = concursos.map(c => calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = stdDev(somas);

  const ultimoConcurso = concursos[n - 1].dezenas;

  const estrategias = [
    { peso: 'tendencia', topN: 18 },
    { peso: 'zscore', topN: 18 },
    { peso: 'markov', topN: 20 },
    { peso: 'entropia_inv', topN: 20 },
    { peso: 'atraso', topN: 20 },
    { peso: 'score', topN: 20 },
  ];

  const jogos = [];
  const tentativasMax = 5000; // menos tentativas para velocidade

  for (let g = 0; g < quantidade; g++) {
    const estrategia = estrategias[g % estrategias.length];
    let melhorJogo = null;
    let melhorScore = -Infinity;

    let poolOrdenado;
    switch (estrategia.peso) {
      case 'tendencia':
        poolOrdenado = [...pontuacao].sort((a, b) => b.tendencia - a.tendencia);
        break;
      case 'zscore':
        poolOrdenado = [...pontuacao].sort((a, b) => b.zscore - a.zscore);
        break;
      case 'markov':
        poolOrdenado = [...pontuacao].sort((a, b) => b.markov - a.markov);
        break;
      case 'entropia_inv':
        poolOrdenado = [...pontuacao].sort((a, b) => a.entropia - b.entropia);
        break;
      case 'atraso':
        poolOrdenado = [...pontuacao].sort((a, b) => b.atraso - a.atraso);
        break;
      default:
        poolOrdenado = [...pontuacao];
    }

    const topDezenas = poolOrdenado.slice(0, estrategia.topN).map(p => p.num);

    for (let t = 0; t < tentativasMax; t++) {
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

      // Filtros básicos (relaxados para velocidade)
      const soma = calcularSoma(jogo);
      if (soma < somaMedia - 2 * somaStd || soma > somaMedia + 2 * somaStd) continue;

      const pares = contarPares(jogo);
      if (pares < 4 || pares > 11) continue;

      const faixas = distribuicaoFaixas(jogo);
      if (faixas.some(f => f === 0)) continue;

      // Não duplicar
      const jogoStr = jogo.join(',');
      if (jogos.some(j => j.join(',') === jogoStr)) continue;

      const scoreJogo = jogo.reduce((s, d) => {
        const p = pontuacao.find(x => x.num === d);
        return s + (p ? p.score : 0);
      }, 0);

      if (scoreJogo > melhorScore) {
        melhorScore = scoreJogo;
        melhorJogo = jogo;
      }
    }

    if (melhorJogo) jogos.push(melhorJogo);
  }

  return jogos;
}

// ============================================================
// MÓDULO 9: AUTO-CALIBRAÇÃO DE PESOS (Machine Learning Leve)
// ============================================================

/**
 * Testa diferentes combinações de pesos e retorna a melhor.
 * Usa os últimos 50 concursos como validação.
 */
function autoCalibraçao(concursos) {
  const n = concursos.length;
  if (n < 300) return null; // precisa de dados suficientes

  const inicio = n - 50; // últimos 50 para validação
  const treino = concursos.slice(0, inicio);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  AUTO-CALIBRAÇÃO DE PESOS`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Testando combinações de pesos nos últimos 50 concursos...\n`);

  // Combinações de pesos para testar
  // [freqHist, tendencia, zscore, coOcorr, markov, atrasoEntropia, chi2]
  const combinacoes = [
    { nome: 'Padrão',           pesos: [0.10, 0.20, 0.15, 0.20, 0.15, 0.10, 0.10] },
    { nome: 'Tendência forte',  pesos: [0.05, 0.35, 0.15, 0.15, 0.15, 0.05, 0.10] },
    { nome: 'Markov forte',     pesos: [0.05, 0.15, 0.10, 0.20, 0.30, 0.10, 0.10] },
    { nome: 'Co-ocorrência',    pesos: [0.05, 0.15, 0.10, 0.35, 0.15, 0.10, 0.10] },
    { nome: 'Z-Score forte',    pesos: [0.05, 0.15, 0.30, 0.15, 0.15, 0.10, 0.10] },
    { nome: 'Atraso forte',     pesos: [0.05, 0.10, 0.10, 0.15, 0.15, 0.30, 0.15] },
    { nome: 'Chi² forte',       pesos: [0.05, 0.10, 0.10, 0.15, 0.15, 0.15, 0.30] },
    { nome: 'Equilibrado v2',   pesos: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.10] },
    { nome: 'Recência total',   pesos: [0.05, 0.30, 0.25, 0.15, 0.15, 0.05, 0.05] },
    { nome: 'Histórico+Markov', pesos: [0.20, 0.10, 0.10, 0.15, 0.25, 0.10, 0.10] },
  ];

  let melhorConfig = null;
  let melhorAcertos = 0;

  for (const config of combinacoes) {
    let totalAcertos = 0;

    for (let c = inicio; c < n; c++) {
      const hist = concursos.slice(0, c);
      const real = concursos[c].dezenas;

      // Gerar 6 jogos com esses pesos
      const jogos = gerarJogosComPesos(hist, 6, config.pesos);

      let melhor = 0;
      jogos.forEach(jogo => {
        const acerto = jogo.filter(d => real.includes(d)).length;
        if (acerto > melhor) melhor = acerto;
      });
      totalAcertos += melhor;
    }

    const media = totalAcertos / 50;
    console.log(`  ${config.nome.padEnd(20)}: média ${media.toFixed(2)} acertos`);

    if (totalAcertos > melhorAcertos) {
      melhorAcertos = totalAcertos;
      melhorConfig = config;
    }
  }

  console.log(`\n  ★ MELHOR CONFIGURAÇÃO: "${melhorConfig.nome}" (média ${(melhorAcertos / 50).toFixed(2)} acertos)`);
  console.log(`    Pesos: FreqHist=${melhorConfig.pesos[0]} | Tend=${melhorConfig.pesos[1]} | Z=${melhorConfig.pesos[2]} | Co=${melhorConfig.pesos[3]} | Markov=${melhorConfig.pesos[4]} | Atraso=${melhorConfig.pesos[5]} | Chi²=${melhorConfig.pesos[6]}`);

  return melhorConfig.pesos;
}

/**
 * Gera jogos usando pesos customizados
 */
function calcularPontuacaoComPesos(concursos, pesos) {
  const n = concursos.length;
  const [wFreq, wTend, wZ, wCo, wMarkov, wAtraso, wChi] = pesos;

  const freq = new Array(26).fill(0);
  const ultimaAparicao = new Array(26).fill(-1);
  concursos.forEach((c, idx) => {
    c.dezenas.forEach(d => { freq[d]++; ultimaAparicao[d] = idx; });
  });

  const ema10 = calcularEMA(concursos, 10);
  const ema50 = calcularEMA(concursos, 50);
  const tendencia = detectarTendencia(ema10, ema50);
  const zscores = calcularZScore(concursos, 50);
  const entropiaArr = calcularEntropia(concursos, 50);
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
    const entropiaPeso = 1 - entropiaArr[i];
    const pAtraso = atrasoNorm * (0.5 + entropiaPeso * 0.5) * 100 * wAtraso;

    const chiNorm = Math.min(chi2[i] / 10, 1);
    const abaixoEsperado = freq[i] < (n * 15 / 25);
    const pChi = (significancia[i] && abaixoEsperado ? chiNorm : chiNorm * 0.3) * 100 * wChi;

    const total = pFreqHist + pTendencia + pZScore + pCond + pMarkov + pAtraso + pChi;

    pontuacao.push({
      num: i, score: total, atraso,
      tendencia: tendencia[i], zscore: zscores[i],
      markov: markov[i][estavanoUltimo], entropia: entropiaArr[i]
    });
  }

  pontuacao.sort((a, b) => b.score - a.score);
  return pontuacao;
}

function gerarJogosComPesos(concursos, quantidade, pesos) {
  const n = concursos.length;
  const pontuacao = calcularPontuacaoComPesos(concursos, pesos);

  const somas = concursos.map(c => calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = stdDev(somas);
  const ultimoConcurso = concursos[n - 1].dezenas;

  const estrategias = [
    { peso: 'tendencia', topN: 18 },
    { peso: 'zscore', topN: 18 },
    { peso: 'markov', topN: 20 },
    { peso: 'entropia_inv', topN: 20 },
    { peso: 'atraso', topN: 20 },
    { peso: 'score', topN: 20 },
  ];

  const jogos = [];

  for (let g = 0; g < quantidade; g++) {
    const estrategia = estrategias[g % estrategias.length];
    let melhorJogo = null;
    let melhorScore = -Infinity;

    let poolOrdenado;
    switch (estrategia.peso) {
      case 'tendencia':
        poolOrdenado = [...pontuacao].sort((a, b) => b.tendencia - a.tendencia); break;
      case 'zscore':
        poolOrdenado = [...pontuacao].sort((a, b) => b.zscore - a.zscore); break;
      case 'markov':
        poolOrdenado = [...pontuacao].sort((a, b) => b.markov - a.markov); break;
      case 'entropia_inv':
        poolOrdenado = [...pontuacao].sort((a, b) => a.entropia - b.entropia); break;
      case 'atraso':
        poolOrdenado = [...pontuacao].sort((a, b) => b.atraso - a.atraso); break;
      default:
        poolOrdenado = [...pontuacao];
    }

    const topDezenas = poolOrdenado.slice(0, estrategia.topN).map(p => p.num);

    for (let t = 0; t < 3000; t++) {
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
      if (soma < somaMedia - 2 * somaStd || soma > somaMedia + 2 * somaStd) continue;

      const pares = contarPares(jogo);
      if (pares < 4 || pares > 11) continue;

      const faixas = distribuicaoFaixas(jogo);
      if (faixas.some(f => f === 0)) continue;

      const jogoStr = jogo.join(',');
      if (jogos.some(j => j.join(',') === jogoStr)) continue;

      const scoreJogo = jogo.reduce((s, d) => {
        const p = pontuacao.find(x => x.num === d);
        return s + (p ? p.score : 0);
      }, 0);

      if (scoreJogo > melhorScore) {
        melhorScore = scoreJogo;
        melhorJogo = jogo;
      }
    }

    if (melhorJogo) jogos.push(melhorJogo);
  }

  return jogos;
}

// ============================================================
// MÓDULO 11: RELATÓRIO HTML + DASHBOARD DE PERFORMANCE
// ============================================================

const ARQUIVO_HTML = path.join(__dirname, 'relatorio_lotofacil.html');

function gerarRelatorioHTML(concursos, jogos, pontuacao, padGeo, ciclos, repulsoes, trios, modo) {
  const n = concursos.length;
  const ultimoConcurso = concursos[n - 1].dezenas;
  const ema10 = calcularEMA(concursos, 10);
  const ema50 = calcularEMA(concursos, 50);
  const tendencia = detectarTendencia(ema10, ema50);

  // Carregar histórico de jogos para dashboard
  let historico = [];
  if (fs.existsSync(ARQUIVO_JOGOS)) {
    try { historico = JSON.parse(fs.readFileSync(ARQUIVO_JOGOS, 'utf8')); } catch (e) {}
  }
  const conferidos = historico.filter(h => h.conferido);

  // Volante visual com último concurso marcado
  let volanteHTML = '<div class="volante">';
  for (let i = 1; i <= 25; i++) {
    const marcado = ultimoConcurso.includes(i) ? 'marcado' : '';
    const tendClass = tendencia[i] > 0.05 ? 'alta' : tendencia[i] < -0.05 ? 'baixa' : '';
    volanteHTML += `<div class="num ${marcado} ${tendClass}">${String(i).padStart(2, '0')}</div>`;
    if (i % 5 === 0) volanteHTML += '<br>';
  }
  volanteHTML += '</div>';

  // Gráfico de barras de pontuação (CSS puro)
  let barrasHTML = '';
  pontuacao.forEach(p => {
    const width = (p.score / pontuacao[0].score * 100).toFixed(0);
    const tendIcon = p.tendencia > 0 ? '↑' : p.tendencia < 0 ? '↓' : '→';
    barrasHTML += `<div class="barra-row"><span class="barra-label">${String(p.num).padStart(2, '0')} ${tendIcon}</span><div class="barra" style="width:${width}%">${p.score.toFixed(1)}</div></div>`;
  });

  // Jogos gerados
  let jogosHTML = '';
  jogos.forEach((jogo, idx) => {
    const dezenas = Array.from(jogo).filter(d => typeof d === 'number');
    const soma = calcularSoma(dezenas);
    const pares = contarPares(dezenas);
    jogosHTML += `<div class="jogo-card"><h3>Jogo ${idx + 1}: ${jogo.estrategia || 'N/A'}</h3><div class="jogo-dezenas">`;
    dezenas.forEach(d => {
      jogosHTML += `<span class="jogo-num">${String(d).padStart(2, '0')}</span>`;
    });
    jogosHTML += `</div><p>Soma: ${soma} | Par/Ímpar: ${pares}/${15 - pares}</p></div>`;
  });

  // Dashboard de performance
  let dashboardHTML = '<p>Nenhum jogo conferido ainda. Execute novamente após o sorteio.</p>';
  if (conferidos.length > 0) {
    let totalJogos = 0, totalAcertos = 0;
    const premios = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
    const mediaPorRodada = [];

    conferidos.forEach(reg => {
      let melhor = 0;
      reg.acertos.forEach(a => {
        totalJogos++;
        totalAcertos += a;
        if (a >= 11) premios[Math.min(a, 15)]++;
        if (a > melhor) melhor = a;
      });
      mediaPorRodada.push({ concurso: reg.proximoConcurso, melhor, media: reg.acertos.reduce((a, b) => a + b, 0) / reg.acertos.length });
    });

    const mediaGeral = (totalAcertos / totalJogos).toFixed(2);
    const taxaPremio = ((premios[11] + premios[12] + premios[13] + premios[14] + premios[15]) / totalJogos * 100).toFixed(1);

    dashboardHTML = `
      <div class="stats-grid">
        <div class="stat-card"><h4>${conferidos.length}</h4><p>Concursos conferidos</p></div>
        <div class="stat-card"><h4>${mediaGeral}</h4><p>Média de acertos</p></div>
        <div class="stat-card"><h4>${taxaPremio}%</h4><p>Taxa de premiação</p></div>
        <div class="stat-card"><h4>${premios[15]}/${premios[14]}/${premios[13]}</h4><p>15/14/13 acertos</p></div>
      </div>
      <div class="evolucao"><h4>Evolução por rodada:</h4>`;
    mediaPorRodada.slice(-20).forEach(r => {
      const barW = (r.melhor / 15 * 100).toFixed(0);
      const cor = r.melhor >= 11 ? '#4caf50' : r.melhor >= 9 ? '#ff9800' : '#f44336';
      dashboardHTML += `<div class="evo-row"><span>#${r.concurso}</span><div class="evo-bar" style="width:${barW}%;background:${cor}">${r.melhor}</div></div>`;
    });
    dashboardHTML += '</div>';
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Lotofácil - Relatório Avançado</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
h1 { text-align: center; color: #00d4ff; margin-bottom: 5px; }
h2 { color: #00d4ff; margin: 30px 0 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
h3 { color: #ffd700; margin-bottom: 8px; }
.subtitle { text-align: center; color: #888; margin-bottom: 30px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: #16213e; border-radius: 10px; padding: 20px; border: 1px solid #333; }
.volante { display: inline-grid; grid-template-columns: repeat(5, 50px); gap: 5px; margin: 10px 0; }
.volante br { display: none; }
.num { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #0f3460; font-weight: bold; font-size: 14px; }
.num.marcado { background: #e94560; color: #fff; }
.num.alta { box-shadow: 0 0 8px #4caf50; }
.num.baixa { box-shadow: 0 0 8px #f44336; }
.barra-row { display: flex; align-items: center; margin: 3px 0; }
.barra-label { width: 50px; font-size: 12px; color: #aaa; }
.barra { background: linear-gradient(90deg, #00d4ff, #e94560); height: 20px; border-radius: 3px; color: #fff; font-size: 11px; display: flex; align-items: center; padding-left: 5px; min-width: 30px; }
.jogo-card { background: #0f3460; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #e94560; }
.jogo-dezenas { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0; }
.jogo-num { background: #e94560; color: #fff; padding: 5px 10px; border-radius: 5px; font-weight: bold; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
.stat-card { background: #0f3460; padding: 15px; border-radius: 8px; text-align: center; }
.stat-card h4 { color: #ffd700; font-size: 24px; }
.stat-card p { color: #aaa; font-size: 12px; margin-top: 5px; }
.evo-row { display: flex; align-items: center; margin: 3px 0; }
.evo-row span { width: 60px; font-size: 11px; color: #aaa; }
.evo-bar { height: 18px; border-radius: 3px; color: #fff; font-size: 11px; display: flex; align-items: center; padding-left: 5px; min-width: 20px; }
.modo-badge { display: inline-block; background: #e94560; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin: 5px; }
.info { color: #888; font-size: 12px; margin-top: 20px; text-align: center; }
</style>
</head>
<body>
<h1>🎯 Lotofácil — Relatório Avançado</h1>
<p class="subtitle">Concurso #${concursos[n - 1].concurso} | ${n} concursos analisados | Modo: <span class="modo-badge">${modo.nome}</span></p>

<div class="grid">
<div class="card">
<h2>🎰 Volante — Último Concurso</h2>
<p style="color:#888;font-size:12px">Vermelho = sorteado | Borda verde = tendência alta | Borda vermelha = tendência baixa</p>
${volanteHTML}
<p style="margin-top:10px">Dezenas: [${ultimoConcurso.join(', ')}]</p>
</div>
<div class="card">
<h2>📊 Ranking de Pontuação</h2>
${barrasHTML}
</div>
</div>

<h2>🎲 Jogos Gerados (${jogos.length})</h2>
${jogosHTML}

<h2>📈 Dashboard de Performance</h2>
<div class="card">
${dashboardHTML}
</div>

<h2>🔄 Ciclos Detectados</h2>
<div class="card">
<table style="width:100%;font-size:13px">
<tr style="color:#00d4ff"><th>Dezena</th><th>Intervalo Médio</th><th>CV</th><th>Atraso Atual</th><th>Status</th></tr>
${ciclos.slice(0, 10).map(c => `<tr><td>${String(c.num).padStart(2, '0')}</td><td>${c.intMedia.toFixed(1)} ±${c.intStd.toFixed(1)}</td><td>${c.cv.toFixed(3)}</td><td>${c.atrasoAtual}</td><td style="color:${c.previsao === 'IMINENTE' ? '#f44336' : '#888'}">${c.previsao}</td></tr>`).join('')}
</table>
</div>

<p class="info">⚠ Loteria é aleatória. Este sistema usa estatística para informar, não para garantir resultados. Jogue com responsabilidade.</p>
<p class="info">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
</body>
</html>`;

  fs.writeFileSync(ARQUIVO_HTML, html, 'utf8');
  console.log(`\n  ✓ Relatório HTML gerado: ${ARQUIVO_HTML}`);
}

// ============================================================
// MÓDULO 10: SALVAR JOGOS E CONFERIR RESULTADOS
// ============================================================

const ARQUIVO_JOGOS = path.join(__dirname, 'jogos_gerados.json');

/**
 * Salva os jogos gerados com data e metadados
 */
function salvarJogos(jogos, ultimoConcurso, concursoNum) {
  let historico = [];

  // Carregar histórico existente
  if (fs.existsSync(ARQUIVO_JOGOS)) {
    try {
      historico = JSON.parse(fs.readFileSync(ARQUIVO_JOGOS, 'utf8'));
    } catch (e) {
      historico = [];
    }
  }

  const registro = {
    dataGeracao: new Date().toISOString(),
    concursoBase: concursoNum,
    proximoConcurso: concursoNum + 1,
    jogos: jogos.map((j, idx) => ({
      numero: idx + 1,
      dezenas: Array.from(j).filter(d => typeof d === 'number'),
      estrategia: j.estrategia || 'N/A',
    })),
    conferido: false,
    resultado: null,
    acertos: null,
  };

  historico.push(registro);
  fs.writeFileSync(ARQUIVO_JOGOS, JSON.stringify(historico, null, 2), 'utf8');
  console.log(`\n  ✓ Jogos salvos em: ${ARQUIVO_JOGOS}`);
  console.log(`    Apostando para o concurso #${concursoNum + 1}`);
}

/**
 * Confere jogos salvos com resultados reais
 */
async function conferirJogos(concursos) {
  if (!fs.existsSync(ARQUIVO_JOGOS)) {
    console.log('\n  Nenhum jogo salvo para conferir.');
    return;
  }

  let historico;
  try {
    historico = JSON.parse(fs.readFileSync(ARQUIVO_JOGOS, 'utf8'));
  } catch (e) {
    console.log('\n  Erro ao ler arquivo de jogos.');
    return;
  }

  const naoConferidos = historico.filter(h => !h.conferido);
  if (naoConferidos.length === 0) {
    console.log('\n  Todos os jogos já foram conferidos.');
    return;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  CONFERÊNCIA DE JOGOS ANTERIORES`);
  console.log(`${'═'.repeat(60)}`);

  let atualizou = false;

  for (const registro of naoConferidos) {
    const concursoAlvo = registro.proximoConcurso;
    const resultado = concursos.find(c => c.concurso === concursoAlvo);

    if (!resultado) {
      console.log(`\n  Concurso #${concursoAlvo}: Ainda não sorteado. Aguardando...`);
      continue;
    }

    atualizou = true;
    registro.conferido = true;
    registro.resultado = resultado.dezenas;
    registro.acertos = [];

    console.log(`\n  ┌─── CONCURSO #${concursoAlvo} — Resultado: [${resultado.dezenas.join(', ')}] ───┐`);
    console.log(`  │ Gerado em: ${registro.dataGeracao.split('T')[0]}`);

    let melhorAcerto = 0;
    let melhorJogo = 0;

    registro.jogos.forEach((jogo, idx) => {
      const acerto = jogo.dezenas.filter(d => resultado.dezenas.includes(d)).length;
      registro.acertos.push(acerto);

      const premio = acerto >= 15 ? '🏆 1º PRÊMIO!' :
                     acerto >= 14 ? '🥈 2º PRÊMIO!' :
                     acerto >= 13 ? '🥉 3º PRÊMIO!' :
                     acerto >= 12 ? '💰 4º PRÊMIO!' :
                     acerto >= 11 ? '💵 5º PRÊMIO!' : '';

      console.log(`  │ Jogo ${idx + 1} (${jogo.estrategia}): ${acerto}/15 acertos ${premio}`);

      if (acerto > melhorAcerto) {
        melhorAcerto = acerto;
        melhorJogo = idx + 1;
      }
    });

    console.log(`  │`);
    console.log(`  │ ★ Melhor: Jogo ${melhorJogo} com ${melhorAcerto} acertos`);
    console.log(`  └${'─'.repeat(55)}┘`);
  }

  if (atualizou) {
    fs.writeFileSync(ARQUIVO_JOGOS, JSON.stringify(historico, null, 2), 'utf8');
    console.log(`\n  ✓ Resultados atualizados no arquivo.`);
  }

  // Estatísticas gerais
  const conferidos = historico.filter(h => h.conferido);
  if (conferidos.length > 0) {
    console.log(`\n  --- ESTATÍSTICAS ACUMULADAS ---`);
    let totalJogos = 0;
    let totalAcertos = 0;
    let premios = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

    conferidos.forEach(reg => {
      reg.acertos.forEach(a => {
        totalJogos++;
        totalAcertos += a;
        if (a >= 11) premios[Math.min(a, 15)]++;
      });
    });

    console.log(`  Concursos conferidos: ${conferidos.length}`);
    console.log(`  Total de jogos: ${totalJogos}`);
    console.log(`  Média de acertos: ${(totalAcertos / totalJogos).toFixed(2)}`);
    console.log(`  Prêmios conquistados:`);
    console.log(`    15 acertos: ${premios[15]}x | 14: ${premios[14]}x | 13: ${premios[13]}x | 12: ${premios[12]}x | 11: ${premios[11]}x`);
    console.log(`  Taxa de premiação: ${((premios[11] + premios[12] + premios[13] + premios[14] + premios[15]) / totalJogos * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
