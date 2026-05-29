const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const padGeo = engine.analisarPadroesGeometricos(concursos);
  const ultimo = concursos[concursos.length - 1].dezenas;
  const ultGeo = {
    primos: engine.contarPrimos(ultimo),
    fibonacci: engine.contarFibonacci(ultimo),
    ...engine.contarBordaMiolo(ultimo),
    gaps: engine.calcularGaps(ultimo),
  };
  res.json({ historico: padGeo, ultimoConcurso: ultGeo });
};
