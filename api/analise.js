const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
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
};
