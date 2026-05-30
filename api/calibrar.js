const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const n = concursos.length;

  if (n < 300) {
    return res.json({ error: 'Dados insuficientes para calibração' });
  }

  // Calibração leve: testar últimos 15 concursos apenas
  const inicio = n - 15;

  const combinacoes = [
    { nome: 'Padrão', pesos: [0.10, 0.20, 0.15, 0.20, 0.15, 0.10, 0.10] },
    { nome: 'Tendência forte', pesos: [0.05, 0.35, 0.15, 0.15, 0.15, 0.05, 0.10] },
    { nome: 'Markov forte', pesos: [0.05, 0.15, 0.10, 0.20, 0.30, 0.10, 0.10] },
    { nome: 'Co-ocorrência', pesos: [0.05, 0.15, 0.10, 0.35, 0.15, 0.10, 0.10] },
    { nome: 'Z-Score forte', pesos: [0.05, 0.15, 0.30, 0.15, 0.15, 0.10, 0.10] },
    { nome: 'Atraso forte', pesos: [0.05, 0.10, 0.10, 0.15, 0.15, 0.30, 0.15] },
    { nome: 'Equilibrado v2', pesos: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.10] },
    { nome: 'Recência total', pesos: [0.05, 0.30, 0.25, 0.15, 0.15, 0.05, 0.05] },
  ];

  let melhorConfig = combinacoes[0];
  let melhorAcertos = 0;
  const resultados = [];

  for (const config of combinacoes) {
    let totalAcertos = 0;

    for (let c = inicio; c < n; c++) {
      const hist = concursos.slice(0, c);
      const real = concursos[c].dezenas;
      const pontuacao = engine.calcularPontuacaoAvancada(hist, config.pesos);
      const topDezenas = pontuacao.slice(0, 18).map(p => p.num);
      const melhor = topDezenas.filter(d => real.includes(d)).length;
      totalAcertos += melhor;
    }

    const media = totalAcertos / 15;
    resultados.push({ nome: config.nome, pesos: config.pesos, media });

    if (totalAcertos > melhorAcertos) {
      melhorAcertos = totalAcertos;
      melhorConfig = config;
    }
  }

  res.json({
    melhor: melhorConfig,
    resultados,
    mediaGeral: melhorAcertos / 15,
  });
};
