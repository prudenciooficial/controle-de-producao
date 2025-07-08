import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TokenVerificacaoService } from '@/services/tokenVerificacaoService';

interface TokenInfoProps {
  validoAte?: string;
  tokenValidado?: boolean;
  mostrarContador?: boolean;
}

export default function TokenInfo({ 
  validoAte, 
  tokenValidado = false, 
  mostrarContador = true 
}: TokenInfoProps) {
  const [tempoRestante, setTempoRestante] = useState<{
    expirado: boolean;
    horas: number;
    minutos: number;
    texto: string;
  }>({ expirado: false, horas: 0, minutos: 0, texto: '' });

  useEffect(() => {
    if (!validoAte || !mostrarContador) return;

    const atualizarTempo = () => {
      const tempo = TokenVerificacaoService.calcularTempoRestante(validoAte);
      setTempoRestante(tempo);
    };

    // Atualizar imediatamente
    atualizarTempo();

    // Atualizar a cada minuto
    const interval = setInterval(atualizarTempo, 60000);

    return () => clearInterval(interval);
  }, [validoAte, mostrarContador]);

  if (tokenValidado) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-green-800 dark:text-green-200">
                  Token Validado com Sucesso
                </span>
                <Badge variant="default" className="bg-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Verificado
                </Badge>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Você pode agora visualizar e assinar o contrato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validoAte) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  Verificação de Token
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Digite o código de 6 dígitos enviado por email para acessar o contrato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tempoRestante.expirado) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-red-800 dark:text-red-200">
                  Token Expirado
                </span>
                <Badge variant="destructive">
                  Expirado
                </Badge>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Este token de verificação expirou. Solicite um novo token para continuar.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Expirou em: {TokenVerificacaoService.formatarDataExpiracao(validoAte)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Token ainda válido
  const isUrgente = tempoRestante.horas < 2;
  const corCard = isUrgente ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
  const corTexto = isUrgente ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200';
  const corDescricao = isUrgente ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300';
  const corIcone = isUrgente ? 'text-amber-600' : 'text-blue-600';

  return (
    <Card className={corCard}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Clock className={`h-6 w-6 ${corIcone}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-medium ${corTexto}`}>
                Token Válido
              </span>
              <Badge variant={isUrgente ? "destructive" : "default"}>
                {tempoRestante.texto}
              </Badge>
            </div>
            <p className={`text-sm ${corDescricao}`}>
              {isUrgente 
                ? 'Atenção: Token expira em breve! Complete a assinatura rapidamente.'
                : 'Digite o código de 6 dígitos para acessar o contrato.'
              }
            </p>
            <p className={`text-xs ${corDescricao} mt-1`}>
              Expira em: {TokenVerificacaoService.formatarDataExpiracao(validoAte)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
