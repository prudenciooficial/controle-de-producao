import React, { useState } from 'react';
import { HelpCircle, Monitor, Chrome, Shield, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function InstrucoesCertificados() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Como usar certificados reais?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Como Usar Certificados Digitais Reais
          </DialogTitle>
          <DialogDescription>
            Instruções para configurar e usar seus certificados ICP-Brasil no sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipos de Certificados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Certificados A1 Suportados (Arquivo PFX)</CardTitle>
              <CardDescription>
                Este sistema suporta apenas certificados A1 instalados via arquivo PFX/P12
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium">Certificado A1 (PFX/P12)</h4>
                  <Badge variant="default">Suportado</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Certificado armazenado em arquivo .pfx ou .p12 e instalado no Windows
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• ✅ Instalado no Windows Certificate Store</li>
                  <li>• ✅ Selecionado diretamente como arquivo .pfx/.p12</li>
                  <li>• ✅ Válido por 1 ano (renovável)</li>
                  <li>• ✅ Funciona em navegadores modernos</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/20">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-5 w-5 text-gray-500" />
                  <h4 className="font-medium">Certificado A3 (Token/Cartão)</h4>
                  <Badge variant="outline">Não Suportado</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Certificados em tokens USB ou cartões não são suportados nesta versão
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• ❌ Tokens USB não detectados</li>
                  <li>• ❌ Cartões inteligentes não suportados</li>
                  <li>• 💡 Use certificado A1 como alternativa</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Configuração Windows */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como Instalar Certificado PFX no Windows</CardTitle>
              <CardDescription>
                Passo a passo para instalar seu certificado A1 no Windows Certificate Store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                  📋 Instalação do Certificado PFX
                </h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <li><strong>1.</strong> Localize seu arquivo .pfx ou .p12 no computador</li>
                  <li><strong>2.</strong> Clique duplo no arquivo para abrir o assistente</li>
                  <li><strong>3.</strong> Selecione "Usuário Atual" e clique "Avançar"</li>
                  <li><strong>4.</strong> Confirme o caminho do arquivo e clique "Avançar"</li>
                  <li><strong>5.</strong> Digite a senha do certificado</li>
                  <li><strong>6.</strong> ✅ Marque "Tornar esta chave exportável" (importante!)</li>
                  <li><strong>7.</strong> ✅ Marque "Incluir todas as propriedades estendidas"</li>
                  <li><strong>8.</strong> Selecione "Colocar todos os certificados no repositório a seguir"</li>
                  <li><strong>9.</strong> Clique "Procurar" e escolha "Pessoal"</li>
                  <li><strong>10.</strong> Clique "Avançar" e depois "Concluir"</li>
                </ol>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  ✅ Verificar se foi instalado corretamente
                </h4>
                <ol className="text-sm text-green-700 dark:text-green-300 space-y-2">
                  <li><strong>1.</strong> Pressione Windows + R e digite "certmgr.msc"</li>
                  <li><strong>2.</strong> Vá em "Pessoal" → "Certificados"</li>
                  <li><strong>3.</strong> Procure seu certificado na lista</li>
                  <li><strong>4.</strong> Deve aparecer com um ícone de chave 🔑 (indica chave privada)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Configuração Navegador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração do Navegador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Chrome className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    Navegadores Modernos (Chrome, Firefox, Edge)
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Por questões de segurança, navegadores modernos têm acesso limitado aos certificados do sistema.
                    Use a opção "Selecionar Arquivo" para certificados A1 ou configure conforme abaixo:
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                    <li>• <strong>Chrome:</strong> Configurações → Privacidade e segurança → Segurança → Gerenciar certificados</li>
                    <li>• <strong>Firefox:</strong> Configurações → Privacidade e segurança → Certificados → Ver certificados</li>
                    <li>• <strong>Edge:</strong> Configurações → Privacidade, pesquisa e serviços → Segurança → Gerenciar certificados</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solução de Problemas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solução de Problemas - Certificados PFX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    "Nenhum certificado PFX encontrado"
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                    <li>• ✅ Verifique se o certificado está instalado no Windows (certmgr.msc)</li>
                    <li>• ✅ Use "Adicionar Arquivo" para selecionar o .pfx diretamente</li>
                    <li>• ✅ Certifique-se que foi instalado no repositório "Pessoal"</li>
                    <li>• ✅ Verifique se tem o ícone de chave 🔑 (chave privada)</li>
                    <li>• ✅ Teste em Edge ou Chrome (melhor suporte)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-amber-500 pl-4">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">
                    "Erro de senha do certificado"
                  </h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                    <li>• ✅ Use a mesma senha que usou para instalar o .pfx</li>
                    <li>• ✅ Verifique se não há Caps Lock ativado</li>
                    <li>• ✅ Teste a senha reinstalando o certificado</li>
                    <li>• ✅ Confirme a senha com quem emitiu o certificado</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    "Certificado expirado ou inválido"
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>• ✅ Verifique a validade em certmgr.msc</li>
                    <li>• ✅ Renove o certificado com sua AC (Serasa, Certisign, etc.)</li>
                    <li>• ✅ Remova certificados expirados do Windows</li>
                    <li>• ✅ Instale o novo certificado seguindo o passo a passo</li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200">
                    "Navegador não detecta certificado"
                  </h4>
                  <ul className="text-sm text-purple-700 dark:text-purple-300 mt-1 space-y-1">
                    <li>• ✅ Use "Adicionar Arquivo" como alternativa</li>
                    <li>• ✅ Teste em navegador Edge (melhor integração Windows)</li>
                    <li>• ✅ Verifique se o certificado tem chave privada</li>
                    <li>• ✅ Reinicie o navegador após instalar certificado</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Links Úteis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Links Úteis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Autoridades Certificadoras</h4>
                  <div className="space-y-1 text-sm">
                    <a href="https://www.serasa.com.br/certificado-digital" target="_blank" rel="noopener noreferrer" 
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-3 w-3" />
                      Serasa Experian
                    </a>
                    <a href="https://www.certisign.com.br" target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-3 w-3" />
                      Certisign
                    </a>
                    <a href="https://www.soluti.com.br" target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-3 w-3" />
                      Soluti
                    </a>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Documentação Técnica</h4>
                  <div className="space-y-1 text-sm">
                    <a href="https://www.iti.gov.br" target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-3 w-3" />
                      ITI - Instituto Nacional de Tecnologia da Informação
                    </a>
                    <a href="https://certificadodigital.gov.br" target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      <ExternalLink className="h-3 w-3" />
                      Portal do Certificado Digital
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(false)}>
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
