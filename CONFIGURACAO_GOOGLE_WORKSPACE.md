# 📧 Configuração Google Workspace para Envio de Emails

## 🎯 Objetivo
Configurar o sistema para enviar emails usando seu domínio do Google Workspace via SMTP.

## 📋 Pré-requisitos
- ✅ Conta Google Workspace ativa
- ✅ Domínio configurado no Google Workspace
- ✅ Acesso de administrador (ou permissões para gerar senhas de aplicativo)

## 🔧 Passo a Passo

### 1. Gerar Senha de Aplicativo

#### Opção A: Como Usuário
1. **Acesse:** https://myaccount.google.com
2. **Vá em:** Segurança > Verificação em duas etapas
3. **Ative** a verificação em duas etapas (se não estiver ativa)
4. **Vá em:** Senhas de aplicativo
5. **Selecione:** App = Email, Dispositivo = Outro
6. **Digite:** "Sistema de Contratos"
7. **Copie** a senha gerada (16 caracteres)

#### Opção B: Como Admin (se necessário)
1. **Acesse:** https://admin.google.com
2. **Vá em:** Segurança > Configurações de acesso
3. **Verifique:** Se SMTP está habilitado
4. **Configure:** Políticas de senha de aplicativo

### 2. Configurar no Sistema

Edite o arquivo `src/config/emailConfig.ts`:

```typescript
gmail: {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: 'seu-email@seudominio.com.br', // SEU EMAIL DO WORKSPACE
      pass: 'abcd efgh ijkl mnop' // SENHA DE APLICATIVO GERADA
    }
  },
  from: {
    name: 'Sistema de Contratos - Sua Empresa',
    email: 'seu-email@seudominio.com.br' // SEU EMAIL DO WORKSPACE
  },
  provider: 'gmail',
  enabled: true // IMPORTANTE: Mudar para true
},
```

### 3. Deploy da Configuração

Execute os comandos:
```bash
# Deploy da Edge Function atualizada
npx supabase functions deploy send-email

# Ou use o arquivo batch
deploy-email-function.bat
```

### 4. Testar a Configuração

1. **Acesse** qualquer contrato comercial
2. **Role até** "Teste de Email"
3. **Digite** seu email pessoal
4. **Clique** "Enviar Email de Teste"
5. **Verifique** se o email chegou

## 🔍 Verificação de Logs

### Logs de Sucesso:
```
📧 Enviando email via SMTP para: teste@exemplo.com
🔧 Configuração SMTP: {host: "smtp.gmail.com", port: 587, ...}
🔗 Conectando ao servidor SMTP...
📤 Enviando email...
✅ Email enviado com sucesso via SMTP: smtp-1234567890-abc123
```

### Logs de Erro Comum:
```
❌ Erro ao enviar email via SMTP: Authentication failed
```
**Solução:** Verificar senha de aplicativo

## 🛠️ Solução de Problemas

### Erro: "Authentication failed"
- ✅ Verificar se a senha de aplicativo está correta
- ✅ Confirmar que a verificação em duas etapas está ativa
- ✅ Gerar nova senha de aplicativo

### Erro: "Connection timeout"
- ✅ Verificar configurações de firewall
- ✅ Confirmar que SMTP está habilitado no Workspace
- ✅ Testar com porta 465 (SSL) em vez de 587 (STARTTLS)

### Email não chega
- ✅ Verificar pasta de spam
- ✅ Confirmar que o domínio está configurado corretamente
- ✅ Verificar logs do Google Workspace Admin

## 📊 Configurações Alternativas

### Para Porta 465 (SSL):
```typescript
smtp: {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: { ... }
}
```

### Para Múltiplos Remetentes:
```typescript
// Criar configurações separadas para diferentes departamentos
comercial: {
  from: {
    name: 'Comercial - Sua Empresa',
    email: 'comercial@seudominio.com.br'
  }
},
contratos: {
  from: {
    name: 'Contratos - Sua Empresa', 
    email: 'contratos@seudominio.com.br'
  }
}
```

## ✅ Checklist Final

- [ ] Senha de aplicativo gerada
- [ ] Arquivo `emailConfig.ts` configurado
- [ ] `enabled: true` definido
- [ ] Edge Function deployada
- [ ] Teste de email realizado
- [ ] Email recebido com sucesso

## 🎉 Resultado Esperado

Após a configuração:
- ✅ Emails enviados do seu domínio
- ✅ Maior confiabilidade de entrega
- ✅ Melhor reputação do remetente
- ✅ Controle total sobre o envio

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs no console do navegador
2. Teste a configuração SMTP com um cliente de email
3. Consulte a documentação do Google Workspace
4. Verifique as configurações de segurança do domínio
