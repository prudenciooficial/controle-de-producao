import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCertificadosDigitais } from '@/hooks/useCertificadosDigitais';

export default function TesteCertificados() {
  const {
    certificados,
    loading,
    error,
    carregarCertificados
  } = useCertificadosDigitais();

  useEffect(() => {
    console.log('TesteCertificados montado, carregando certificados...');
    carregarCertificados();
  }, [carregarCertificados]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Teste de Certificados Digitais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={carregarCertificados} disabled={loading}>
            {loading ? 'Carregando...' : 'Recarregar Certificados'}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Carregando certificados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800 font-medium">Erro:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div>
            <p className="font-medium mb-2">
              Certificados encontrados: {certificados.length}
            </p>
            
            {certificados.length === 0 ? (
              <p className="text-gray-600">Nenhum certificado encontrado</p>
            ) : (
              <div className="space-y-2">
                {certificados.map((cert) => (
                  <div key={cert.id} className="border rounded p-3">
                    <div className="font-medium">{cert.nome}</div>
                    <div className="text-sm text-gray-600">
                      CPF: {cert.cpf} | Tipo: {cert.tipo} | Emissor: {cert.emissor}
                    </div>
                    <div className="text-xs text-gray-500">
                      Válido até: {cert.validoAte}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 rounded p-4">
          <p className="text-sm font-medium mb-2">Debug Info:</p>
          <pre className="text-xs text-gray-600">
            {JSON.stringify({ 
              loading, 
              error, 
              certificadosCount: certificados.length,
              certificadosIds: certificados.map(c => c.id)
            }, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
