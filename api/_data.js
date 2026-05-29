// Cache compartilhado entre funções (persiste enquanto a instância está quente)
let concursosCache = null;
let carregandoPromise = null;

const https = require('https');
const http = require('http');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Erro ao parsear JSON')); }
      });
    }).on('error', reject);
  });
}

async function carregarConcursos() {
  if (concursosCache) return concursosCache;
  if (carregandoPromise) return carregandoPromise;

  carregandoPromise = (async () => {
    try {
      const data = await fetchJSON('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil');
      const ultimo = data.numero || data.concurso;
      const concursos = [];

      // Carregar em batches menores para serverless (timeout de 30s)
      // Pegar últimos 500 concursos para performance
      const inicio = Math.max(1, ultimo - 499);

      for (let i = inicio; i <= ultimo; i += 50) {
        const promises = [];
        for (let j = i; j < Math.min(i + 50, ultimo + 1); j++) {
          promises.push(
            fetchJSON(`https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${j}`)
              .then(d => ({
                concurso: d.numero || d.concurso,
                data: d.dataApuracao || d.data,
                dezenas: (d.listaDezenas || d.dezenas || d.dezenasSorteadasOrdemSorteio || []).map(Number).sort((a, b) => a - b)
              }))
              .catch(() => null)
          );
        }
        const results = await Promise.all(promises);
        results.filter(r => r && r.dezenas.length === 15).forEach(r => concursos.push(r));
      }

      concursos.sort((a, b) => a.concurso - b.concurso);
      concursosCache = concursos;
      carregandoPromise = null;
      return concursos;
    } catch (e) {
      carregandoPromise = null;
      // Fallback: dados demo
      const concursos = [];
      for (let i = 1; i <= 500; i++) {
        const dezenas = [];
        while (dezenas.length < 15) {
          const n = Math.floor(Math.random() * 25) + 1;
          if (!dezenas.includes(n)) dezenas.push(n);
        }
        dezenas.sort((a, b) => a - b);
        concursos.push({ concurso: i, data: '2003-01-01', dezenas });
      }
      concursosCache = concursos;
      return concursos;
    }
  })();

  return carregandoPromise;
}

module.exports = { carregarConcursos };
