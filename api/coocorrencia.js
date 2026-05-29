const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const { matriz, probCond } = engine.calcularCoOcorrencia(concursos);
  const pares = [];
  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      pares.push({ a: i, b: j, co: matriz[i][j], prob: probCond[i][j] });
    }
  }
  pares.sort((a, b) => b.co - a.co);
  res.json(pares.slice(0, 20));
};
