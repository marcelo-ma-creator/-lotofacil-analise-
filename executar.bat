@echo off
echo ============================================
echo   LOTOFACIL - Analise Avancada
echo ============================================
echo.
echo Escolha o modo de jogo:
echo   1 - Economico (6 jogos ultra-filtrados)
echo   2 - Normal (10 jogos balanceados)
echo   3 - Agressivo (20 jogos, maxima cobertura)
echo.
set /p opcao="Opcao (1/2/3): "

if "%opcao%"=="1" (
  node "%~dp0lotofacil.js" economico
) else if "%opcao%"=="3" (
  node "%~dp0lotofacil.js" agressivo
) else (
  node "%~dp0lotofacil.js" normal
)

echo.
echo Relatorio HTML gerado! Abrindo no navegador...
start "" "%~dp0relatorio_lotofacil.html"
pause
