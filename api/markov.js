const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const markov = engine.calcularMarkov(concursos);
  const ultimo = concursos[concursos.length - 1].dezenas;
  const dados = [];
  for (let i = 1; i <= 25; i++) {
    const estado = ultimo.includes(i) ? 1 : 0;
    dados.push({ num: i, prob: markov[i][estado], estado: estado ? 'repetir' : 'entrar' });
  }
  dados.sort((a, b) => b.prob - a.prob);
  res.json(dados);
};
