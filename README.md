# Lotofácil — Análise Avançada

Sistema de análise estatística avançada da Lotofácil com modelos matemáticos.

## Funcionalidades

- **EMA (Média Móvel Exponencial)** — Detecta tendências de alta/baixa
- **Z-Score** — Identifica desvios estatísticos
- **Entropia de Shannon** — Mede previsibilidade
- **Cadeia de Markov** — Probabilidade de transição
- **Chi-Quadrado** — Significância estatística
- **Co-ocorrência** — Pares correlacionados
- **Padrões Geométricos** — Volante, diagonais, primos, Fibonacci
- **Anti-padrões** — Repulsão, trios, ciclos
- **Auto-calibração** — Ajuste automático de pesos
- **Backtest** — Validação com dados reais
- **3 Modos** — Econômico (6), Normal (10), Agressivo (20 jogos)

## Como usar localmente

```bash
cd server && npm install && node index.js
cd client && npm install && npm run dev
```

Acesse: http://localhost:5173

## Deploy

Veja o arquivo [DEPLOY.md](./DEPLOY.md) para instruções de como colocar online.

## Tecnologias

- Backend: Node.js + Express
- Frontend: React + Vite
- Deploy: Vercel (serverless)
- PWA: Instalável no celular
