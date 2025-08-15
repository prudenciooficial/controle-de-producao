import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MessageSquare, Plus, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SugestaoIA {
  data_postagem: string;
  tema: string;
  descricao: string;
  rede_social: string;
  status: string;
  eh_sugestao_ia: boolean;
  observacoes?: string;
}

interface SugestoesIAModalProps {
  isOpen: boolean;
  onClose: () => void;
  sugestoes: SugestaoIA[];
  onAdicionarSugestao: (sugestao: SugestaoIA) => void;
  isLoading?: boolean;
}

const getRedeIcon = (rede: string) => {
  switch (rede.toLowerCase()) {
    case 'instagram':
      return '📸';
    case 'facebook':
      return '👥';
    case 'whatsapp':
      return '💬';
    case 'twitter':
      return '🐦';
    default:
      return '📱';
  }
};

const getRedeCor = (rede: string) => {
  switch (rede.toLowerCase()) {
    case 'instagram':
      return 'bg-gradient-to-r from-purple-500 to-pink-500';
    case 'facebook':
      return 'bg-blue-600';
    case 'whatsapp':
      return 'bg-green-600';
    case 'twitter':
      return 'bg-blue-400';
    default:
      return 'bg-gray-600';
  }
};

export const SugestoesIAModal: React.FC<SugestoesIAModalProps> = ({ isOpen, onClose, sugestoes, onAdicionarSugestao, isLoading = false }) => {
  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return format(data, "dd 'de' MMMM", { locale: ptBR });
    } catch {
      return dataString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Sugestões de IA para Marketing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="text-lg">Processando sugestões com IA...</span>
              </div>
            </div>
          ) : sugestoes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma sugestão disponível no momento.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Clock className="h-4 w-4" />
                <span>{sugestoes.length} sugestão(ões) gerada(s) pela IA</span>
              </div>

              <div className="grid gap-4">
                {sugestoes.map((sugestao, index) => (
                  <Card key={index} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>{sugestao.tema}</span>
                            <Badge variant="secondary" className="text-xs">🤖 IA</Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatarData(sugestao.data_postagem)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{getRedeIcon(sugestao.rede_social)}</span>
                              <span className="capitalize">{sugestao.rede_social}</span>
                            </div>
                          </CardDescription>
                        </div>
                        <Button onClick={() => onAdicionarSugestao(sugestao)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </CardHeader>
                    {sugestao.descricao && (
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 leading-relaxed">{sugestao.descricao}</p>
                        </div>
                        {sugestao.observacoes && (
                          <div className="mt-3 text-xs text-gray-500 italic">💡 {sugestao.observacoes}</div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">💡 Dica: As sugestões são baseadas nos intervalos sem postagens detectados</div>
                <Button variant="outline" onClick={onClose}>Fechar</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

