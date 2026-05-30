const { carregarConcursos } = require('./_data');
const engine = require('./_engine');

module.exports = async function handler(req, res) {
  const concursos = await carregarConcursos();
  const n = concursos.length;

  if (n < 250) {
    return res.json({ error: 'Dados insuficientes para backtest' });
  }

  // Backtest leve: últimos 20 concursos apenas (cabe no timeout de 30s)
  const janela = 20;
  const inicio = n - janela;

  const acertos = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const porConcurso = [];
  let totalMelhor = 0;

  for (let c = inicio; c < n; c++) {
    const historico = concursos.slice(0, c);
    const real = concursos[c].dezenas;

    // Pegar top 18 dezenas pelo modelo
    const pontuacao = engine.calcularPontuacaoAvancada(historico);
    const topDezenas = pontuacao.slice(0, 18).map(p => p.num);

    // Simular 6 jogos rápidos
    let melhor = 0;
    for (let g = 0; g < 6; g++) {
      const pool = [...topDezenas];
      for (let i = 1; i <= 25; i++) {
        if (!pool.includes(i) && Math.random() < 0.3) pool.push(i);
      }
      const jogo = [];
      const pc = [...pool];
      while (jogo.length < 15 && pc.length > 0) {
        jogo.push(pc.splice(Math.floor(Math.random() * pc.length), 1)[0]);
      }
      if (jogo.length === 15) {
        const acerto = jogo.filter(d => real.includes(d)).length;
        if (acerto > melhor) melhor = acerto;
      }
    }

    porConcurso.push({ concurso: concursos[c].concurso, acerto: melhor });
    totalMelhor += melhor;
    if (melhor >= 11) acertos[Math.min(melhor, 15)]++;
  }

  const totalPremiados = acertos[11] + acertos[12] + acertos[13] + acertos[14] + acertos[15];

  res.json({
    totalTestes: janela,
    mediaAcertos: totalMelhor / janela,
    acertos,
    totalPremiados,
    taxaModelo: (totalPremiados / janela * 100),
    porConcurso,
  });
};
