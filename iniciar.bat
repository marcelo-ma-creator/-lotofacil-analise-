@echo off
echo ============================================
echo   LOTOFACIL - API + Painel Web
echo ============================================
echo.

:: Verificar se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ERRO: Node.js nao encontrado!
  echo Instale em: https://nodejs.org
  pause
  exit /b 1
)

:: Instalar dependências do backend
echo [1/3] Instalando dependencias do backend...
cd /d "%~dp0server"
if not exist node_modules (
  call npm install
)

:: Instalar dependências do frontend
echo [2/3] Instalando dependencias do frontend...
cd /d "%~dp0client"
if not exist node_modules (
  call npm install
)

:: Iniciar backend e frontend
echo [3/3] Iniciando servidores...
echo.
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:5173
echo.

cd /d "%~dp0server"
start "Lotofacil API" cmd /c "node index.js"

cd /d "%~dp0client"
start "Lotofacil Frontend" cmd /c "npx vite"

:: Aguardar um pouco e abrir navegador
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo Pronto! O painel abriu no navegador.
echo Feche esta janela para encerrar tudo.
echo.
pause
