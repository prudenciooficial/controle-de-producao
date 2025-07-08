@echo off
echo Testando Edge Function send-email localmente...

REM Servir a função localmente
echo Iniciando servidor local da Edge Function...
npx supabase functions serve send-email --no-verify-jwt

echo.
echo A função está rodando em: http://localhost:54321/functions/v1/send-email
echo.
echo Para testar, use o componente EmailTester na interface ou faça uma requisição POST para:
echo http://localhost:54321/functions/v1/send-email
echo.
pause
