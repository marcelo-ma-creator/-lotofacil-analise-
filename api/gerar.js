const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const modo = req.query.modo || 'normal';
  const jogos = engine.gerarJogos(concursos, modo);
  res.json({ modo, jogos });
};
