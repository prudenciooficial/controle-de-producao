# Configuração de Email para Envio Real

## 📧 Status Atual
- ✅ Modo desenvolvimento desabilitado
- ✅ Edge Function criada (`send-email`) com Resend
- ✅ Fallback para desenvolvimento funcionando
- ⚠️ Necessário configurar RESEND_API_KEY para envio real

## 🚀 Passos para Ativar o Envio Real

### 1. Opção A: Deploy da Edge Function (Recomendado)
Execute o comando no terminal:
```bash
npx supabase functions deploy send-email
```

Ou use o arquivo batch:
```bash
deploy-email-function.bat
```

### 2. Opção B: Teste Local da Edge Function
Para testar localmente:
```bash
test-email-function.bat
```

### 3. Configurar Resend API (Para Envio Real)
Para envio real de emails, configure uma conta no Resend:

1. **Criar conta:** https://resend.com
2. **Obter API Key:** Dashboard > API Keys
3. **Configurar no Supabase:**
   - Vá para Project Settings > Edge Functions
   - Adicione variável: `RESEND_API_KEY=re_xxxxxxxxx`

### 4. Verificar Configuração Atual
O sistema está configurado com fallback para desenvolvimento:
- **Modo:** Simulação de envio
- **Logs:** Console do navegador
- **Status:** Funcionando sem envio real

### 5. Testar o Sistema
1. Acesse qualquer contrato comercial
2. Role até a seção "Teste de Email"
3. Digite seu email e clique em "Enviar Email de Teste"
4. Verifique os logs no console

### 6. Verificar Logs
Monitore o console do navegador para ver:
- ✅ `Email simulado com sucesso` (modo desenvolvimento)
- ✅ `Email enviado com sucesso via Resend` (com API configurada)
- ❌ Erros de configuração ou envio

## 🔧 Configurações Disponíveis

### Gmail (Atual)
- **Host:** smtp.gmail.com
- **Porta:** 587
- **Segurança:** STARTTLS
- **Status:** ✅ Configurado

### Outlook (Alternativa)
- **Host:** smtp-mail.outlook.com
- **Porta:** 587
- **Status:** ⚠️ Não configurado

### Servidor Personalizado
- **Host:** Configurável
- **Porta:** Configurável
- **Status:** ⚠️ Não configurado

## 📋 Checklist de Verificação

- [ ] Edge Function deployada
- [ ] Configuração de email válida
- [ ] Teste de envio realizado
- [ ] Email recebido com sucesso
- [ ] Logs sem erros

## 🐛 Solução de Problemas

### Erro: "Edge Function não encontrada"
```bash
npx supabase functions deploy send-email
```

### Erro: "Configuração de email inválida"
1. Verifique as credenciais em `src/config/emailConfig.ts`
2. Confirme que `enabled: true`
3. Confirme que `DEV_EMAIL_CONFIG.logOnly: false`

### Erro: "SMTP Authentication failed"
1. Verifique se a senha de aplicativo está correta
2. Confirme que a verificação em duas etapas está ativa
3. Gere uma nova senha de aplicativo se necessário

### Email não chega
1. Verifique a pasta de spam
2. Confirme o endereço de destino
3. Verifique os logs da Edge Function no Supabase

## 📞 Suporte
Se os problemas persistirem:
1. Verifique os logs no console do Supabase
2. Teste com um email diferente
3. Considere usar um provedor SMTP alternativo
