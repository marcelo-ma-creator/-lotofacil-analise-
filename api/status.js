const { carregarConcursos } = require('./_data');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const n = concursos.length;
  const ultimo = concursos[n - 1];
  res.json({
    status: 'pronto',
    totalConcursos: n,
    ultimoConcurso: ultimo ? { numero: ultimo.concurso, data: ultimo.data, dezenas: ultimo.dezenas } : null,
  });
};
