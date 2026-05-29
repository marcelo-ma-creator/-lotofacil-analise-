const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const pontuacao = engine.calcularPontuacaoAvancada(concursos);
  res.json(pontuacao);
};
