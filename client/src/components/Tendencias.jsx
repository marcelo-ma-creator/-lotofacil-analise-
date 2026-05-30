import React, { useState, useEffect } from 'react';

function Tendencias() {
  const [tendencias, setTendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    fetch('/api/tendencias')
      .then(r => r.json())
      .then(data => {
        setTendencias(data);
        setLoading(false);
      })
      .catch(e => {
        setErro('Erro ao carregar tendências');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="card"><h2>📈 Tendências</h2><p>Carregando...</p></div>;
  if (erro) return <div className="card"><h2>📈 Tendências</h2><p>{erro}</p></div>;
  if (!tendencias.length) return <div className="card"><h2>📈 Tendências</h2><p>Sem dados disponíveis.</p></div>;

  const emAlta = tendencias.filter(t => t.tendencia > 0);
  const emBaixa = tendencias.filter(t => t.tendencia < 0).sort((a, b) => a.tendencia - b.tendencia);

  return (
    <div className="card">
      <h2>📈 Tendências (EMA 10 vs EMA 50)</h2>
      <div className="grid-2">
        <div>
          <h3 className="text-green">Em Alta ↑</h3>
          <div className="tendencia-list">
            {emAlta.map(t => (
              <div key={t.num} className="tendencia-row alta">
                <span className="tendencia-num">{String(t.num).padStart(2, '0')}</span>
                <div className="tendencia-bar-container">
                  <div className="tendencia-bar alta" style={{ width: `${Math.min(t.tendencia * 500, 100)}%` }}></div>
                </div>
                <span className="tendencia-valor">+{(t.tendencia * 100).toFixed(1)}%</span>
                <span className="tendencia-zscore">Z: {t.zscore > 0 ? '+' : ''}{t.zscore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-red">Em Baixa ↓</h3>
          <div className="tendencia-list">
            {emBaixa.map(t => (
              <div key={t.num} className="tendencia-row baixa">
                <span className="tendencia-num">{String(t.num).padStart(2, '0')}</span>
                <div className="tendencia-bar-container">
                  <div className="tendencia-bar baixa" style={{ width: `${Math.min(-t.tendencia * 500, 100)}%` }}></div>
                </div>
                <span className="tendencia-valor">{(t.tendencia * 100).toFixed(1)}%</span>
                <span className="tendencia-zscore">Z: {t.zscore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tendencias;
