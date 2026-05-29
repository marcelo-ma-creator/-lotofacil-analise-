const express = require('express');
const cors = require('cors');
const path = require('path');
const engine = require('./engine');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Cache de dados em memória
let concursos = [];
let carregando = false;
let progresso = { atual: 0, total: 0 };

// Carregar dados na inicialização
async function inicializar() {
  carregando = true;
  console.log('Carregando histórico da Lotofácil...');
  concursos = await engine.carregarHistorico((atual, total) => {
    progresso = { atual, total };
  });
  carregando = false;
  console.log(`✓ ${concursos.length} concursos carregados.`);
}

// ============================================================
// ENDPOINTS
// ============================================================

// Status geral
app.get('/api/status', (req, res) => {
  if (carregando) return res.json({ status: 'carregando', progresso });
  const n = concursos.length;
  const ultimo = concursos[n - 1];
  res.json({
    status: 'pronto',
    totalConcursos: n,
    ultimoConcurso: ultimo ? { numero: ultimo.concurso, data: ultimo.data, dezenas: ultimo.dezenas } : null,
  });
});

// Análise de frequência por janela
app.get('/api/analise', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const n = concursos.length;
  const freq = new Array(26).fill(0);
  const ultimaAparicao = new Array(26).fill(-1);
  concursos.forEach((c, idx) => { c.dezenas.forEach(d => { freq[d]++; ultimaAparicao[d] = idx; }); });

  const dezenas = [];
  for (let i = 1; i <= 25; i++) {
    dezenas.push({ num: i, freq: freq[i], pct: (freq[i] / n * 100), atraso: n - 1 - ultimaAparicao[i] });
  }
  dezenas.sort((a, b) => b.freq - a.freq);

  const somas = concursos.map(c => engine.calcularSoma(c.dezenas));
  const { media: somaMedia, std: somaStd } = engine.stdDev(somas);

  res.json({ dezenas, soma: { media: somaMedia, std: somaStd, min: Math.min(...somas), max: Math.max(...somas) } });
});

// Tendências (EMA + Z-Score)
app.get('/api/tendencias', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const ema10 = engine.calcularEMA(concursos, 10);
  const ema20 = engine.calcularEMA(concursos, 20);
  const ema50 = engine.calcularEMA(concursos, 50);
  const tendencia = engine.detectarTendencia(ema10, ema50);
  const zscores = engine.calcularZScore(concursos, 50);

  const dados = [];
  for (let i = 1; i <= 25; i++) {
    dados.push({ num: i, ema10: ema10[i], ema20: ema20[i], ema50: ema50[i], tendencia: tendencia[i], zscore: zscores[i] });
  }
  dados.sort((a, b) => b.tendencia - a.tendencia);
  res.json(dados);
});

// Pontuação (ranking)
app.get('/api/pontuacao', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const pontuacao = engine.calcularPontuacaoAvancada(concursos);
  res.json(pontuacao);
});

// Padrões geométricos
app.get('/api/geometria', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const padGeo = engine.analisarPadroesGeometricos(concursos);
  const ultimo = concursos[concursos.length - 1].dezenas;
  const ultGeo = {
    primos: engine.contarPrimos(ultimo),
    fibonacci: engine.contarFibonacci(ultimo),
    ...engine.contarBordaMiolo(ultimo),
    gaps: engine.calcularGaps(ultimo),
  };
  res.json({ historico: padGeo, ultimoConcurso: ultGeo });
});

// Ciclos
app.get('/api/ciclos', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  res.json(engine.detectarCiclos(concursos));
});

// Anti-padrões
app.get('/api/antipadroes', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const repulsoes = engine.calcularRepulsao(concursos).slice(0, 15);
  const trios = engine.calcularTrios(concursos).slice(0, 15);
  res.json({ repulsoes, trios });
});

// Markov
app.get('/api/markov', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const markov = engine.calcularMarkov(concursos);
  const ultimo = concursos[concursos.length - 1].dezenas;
  const dados = [];
  for (let i = 1; i <= 25; i++) {
    const estado = ultimo.includes(i) ? 1 : 0;
    dados.push({ num: i, prob: markov[i][estado], estado: estado ? 'repetir' : 'entrar' });
  }
  dados.sort((a, b) => b.prob - a.prob);
  res.json(dados);
});

// Co-ocorrência
app.get('/api/coocorrencia', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const { matriz, probCond } = engine.calcularCoOcorrencia(concursos);
  const pares = [];
  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      pares.push({ a: i, b: j, co: matriz[i][j], prob: probCond[i][j] });
    }
  }
  pares.sort((a, b) => b.co - a.co);
  res.json(pares.slice(0, 20));
});

// Gerar jogos
app.get('/api/gerar', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const modo = req.query.modo || 'normal';
  const jogos = engine.gerarJogos(concursos, modo);
  res.json({ modo, jogos });
});

// Backtest
app.get('/api/backtest', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const resultado = engine.executarBacktest(concursos, 50);
  res.json(resultado);
});

// Auto-calibração
app.get('/api/calibrar', (req, res) => {
  if (concursos.length === 0) return res.status(503).json({ error: 'Dados não carregados' });
  const resultado = engine.autoCalibracao(concursos);
  res.json(resultado);
});

// Recarregar dados
app.post('/api/recarregar', async (req, res) => {
  await inicializar();
  res.json({ status: 'ok', total: concursos.length });
});

// Servir frontend em produção
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Iniciar
inicializar().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 API rodando em http://localhost:${PORT}`);
    console.log(`   Acesso na rede: http://<SEU-IP>:${PORT}`);
    console.log(`   Endpoints disponíveis:`);
    console.log(`   GET /api/status`);
    console.log(`   GET /api/analise`);
    console.log(`   GET /api/tendencias`);
    console.log(`   GET /api/pontuacao`);
    console.log(`   GET /api/geometria`);
    console.log(`   GET /api/ciclos`);
    console.log(`   GET /api/antipadroes`);
    console.log(`   GET /api/markov`);
    console.log(`   GET /api/coocorrencia`);
    console.log(`   GET /api/gerar?modo=normal`);
    console.log(`   GET /api/backtest`);
    console.log(`   GET /api/calibrar`);
    console.log(`   POST /api/recarregar\n`);
  });
});
