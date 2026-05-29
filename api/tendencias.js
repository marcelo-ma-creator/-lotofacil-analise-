const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
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
};
