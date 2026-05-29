import React from 'react';

function Ciclos({ ciclos }) {
  if (!ciclos || ciclos.length === 0) return null;

  return (
    <div className="card">
      <h2>🔄 Ciclos Detectados</h2>
      <p className="card-subtitle">Dezenas com intervalo mais regular (CV baixo = mais previsível)</p>
      <table className="table">
        <thead>
          <tr>
            <th>Dezena</th>
            <th>Intervalo Médio</th>
            <th>±Desvio</th>
            <th>CV</th>
            <th>Atraso Atual</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {ciclos.slice(0, 15).map((c, idx) => (
            <tr key={c.num} className={c.previsao === 'IMINENTE' ? 'row-highlight' : ''}>
              <td className="cell-num">{String(c.num).padStart(2, '0')}</td>
              <td>{c.intMedia.toFixed(1)}</td>
              <td>±{c.intStd.toFixed(1)}</td>
              <td>{c.cv.toFixed(3)}</td>
              <td>{c.atrasoAtual}</td>
              <td>
                <span className={`status-badge ${c.previsao === 'IMINENTE' ? 'iminente' : 'aguardando'}`}>
                  {c.previsao === 'IMINENTE' ? '🔴 IMINENTE' : '⚪ Aguardando'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Ciclos;
