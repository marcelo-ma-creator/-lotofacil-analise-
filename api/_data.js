// Cache compartilhado entre funções (persiste enquanto a instância está quente)
let concursosCache = null;
let carregandoPromise = null;

const https = require('https');
const http = require('http');

function fetchJSON(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Erro ao parsear JSON')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function carregarConcursos() {
  if (concursosCache && concursosCache.length > 0 && concursosCache[0].data !== '2003-01-01') {
    return concursosCache;
  }
  if (carregandoPromise) return carregandoPromise;

  carregandoPromise = (async () => {
    try {
      // Buscar último concurso
      const data = await fetchJSON('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil', 15000);
      const ultimo = data.numero || data.concurso;

      if (!ultimo) throw new Error('Sem dados');

      const concursos = [];
      // Pegar últimos 300 concursos para ter dados suficientes
      const inicio = Math.max(1, ultimo - 299);

      for (let i = inicio; i <= ultimo; i += 30) {
        const promises = [];
        for (let j = i; j < Math.min(i + 30, ultimo + 1); j++) {
          promises.push(
            fetchJSON(`https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${j}`, 10000)
              .then(d => ({
                concurso: d.numero || d.concurso,
                data: d.dataApuracao || d.data || 'N/A',
                dezenas: (d.listaDezenas || d.dezenas || d.dezenasSorteadasOrdemSorteio || []).map(Number).sort((a, b) => a - b)
              }))
              .catch(() => null)
          );
        }
        const results = await Promise.all(promises);
        results.filter(r => r && r.dezenas.length === 15).forEach(r => concursos.push(r));
      }

      concursos.sort((a, b) => a.concurso - b.concurso);

      if (concursos.length > 0) {
        concursosCache = concursos;
      }
      carregandoPromise = null;
      return concursos;
    } catch (e) {
      carregandoPromise = null;

      // Se já tem cache (mesmo antigo), usa ele
      if (concursosCache && concursosCache.length > 0) {
        return concursosCache;
      }

      // Último recurso: buscar só o último concurso para ter algo
      try {
        const data = await fetchJSON('http://loteriascaixa-api.herokuapp.com/api/lotofacil/latest', 10000);
        if (data && data.dezenas) {
          const concurso = {
            concurso: data.concurso,
            data: data.data || 'N/A',
            dezenas: data.dezenas.map(Number).sort((a, b) => a - b)
          };
          concursosCache = [concurso];
          return [concurso];
        }
      } catch (e2) {}

      // Fallback final: retornar array vazio (melhor que dados fake)
      return [];
    }
  })();

  return carregandoPromise;
}

module.exports = { carregarConcursos };
