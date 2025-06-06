
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ControlePontoPDF } from '@/components/hr/ControlePontoPDF';
import type { ControlePontoData } from '@/types/hr';

export const generateControlePontoPDF = async (data: ControlePontoData) => {
  const pdfDoc = await pdf(<ControlePontoPDF data={data} />).toBlob();
  
  // Criar nome do arquivo
  const nomeArquivo = `controle-ponto-${data.funcionario.nome_completo.replace(/\s+/g, '-')}-${data.mes.toString().padStart(2, '0')}-${data.ano}.pdf`;
  
  // Download do arquivo
  const url = URL.createObjectURL(pdfDoc);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
};
