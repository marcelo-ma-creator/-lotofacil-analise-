const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const repulsoes = engine.calcularRepulsao(concursos).slice(0, 15);
  const trios = engine.calcularTrios(concursos).slice(0, 15);
  res.json({ repulsoes, trios });
};
