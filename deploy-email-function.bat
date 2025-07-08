@echo off
echo Fazendo deploy da Edge Function send-email...

REM Deploy da função send-email
npx supabase functions deploy send-email

echo.
echo Deploy concluído!
echo.
echo Para testar a função, use:
echo npx supabase functions serve send-email
echo.
pause
