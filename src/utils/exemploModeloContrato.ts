/**
 * Exemplo de modelo de contrato com variáveis
 * Use este exemplo para criar modelos de contrato no sistema
 */

export const EXEMPLO_MODELO_CONTRATO = {
  nome: "Contrato de Prestação de Serviços",
  descricao: "Modelo padrão para contratos de prestação de serviços",
  conteudo: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">

<h1 style="text-align: center; color: #2563eb; margin-bottom: 30px;">
  CONTRATO DE PRESTAÇÃO DE SERVIÇOS
</h1>

<div style="text-align: center; margin-bottom: 30px; font-size: 14px; color: #666;">
  <strong>Contrato Nº:</strong> [ID_CONTRATO]<br>
  <strong>Data:</strong> [DATA_ATUAL]
</div>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  1. PARTES CONTRATANTES
</h2>

<p><strong>CONTRATANTE:</strong></p>
<div style="margin-left: 20px; margin-bottom: 20px;">
  <strong>Razão Social:</strong> [EMPRESA_NOME]<br>
  <strong>CNPJ:</strong> [EMPRESA_CNPJ]<br>
  <strong>Endereço:</strong> [EMPRESA_ENDERECO]<br>
  <strong>Cidade:</strong> [EMPRESA_CIDADE]<br>
  <strong>CEP:</strong> [EMPRESA_CEP]<br>
  <strong>Telefone:</strong> [EMPRESA_TELEFONE]<br>
  <strong>E-mail:</strong> [EMPRESA_EMAIL]
</div>

<p><strong>CONTRATADO:</strong></p>
<div style="margin-left: 20px; margin-bottom: 20px;">
  <strong>Nome/Razão Social:</strong> [ASSINANTE_NOME]<br>
  <strong>CPF/CNPJ:</strong> [ASSINANTE_DOCUMENTO]<br>
  <strong>E-mail:</strong> [ASSINANTE_EMAIL]<br>
  <strong>Endereço:</strong> [ENDERECO_CONTRATADO]<br>
  <strong>Telefone:</strong> [TELEFONE_CONTRATADO]
</div>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  2. OBJETO DO CONTRATO
</h2>

<p style="text-align: justify;">
  O presente contrato tem por objeto a prestação de serviços de <strong>[TIPO_SERVICO]</strong>, 
  conforme especificações detalhadas abaixo:
</p>

<div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb;">
  <strong>Descrição dos Serviços:</strong><br>
  [DESCRICAO_SERVICOS]
</div>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  3. VALOR E FORMA DE PAGAMENTO
</h2>

<p>
  <strong>Valor Total:</strong> [VALOR_TOTAL] ([VALOR_EXTENSO])<br>
  <strong>Forma de Pagamento:</strong> [FORMA_PAGAMENTO]<br>
  <strong>Vencimento:</strong> [DATA_VENCIMENTO]
</p>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  4. PRAZO DE EXECUÇÃO
</h2>

<p>
  Os serviços deverão ser executados no prazo de <strong>[PRAZO_DIAS] dias</strong>, 
  contados a partir da data de assinatura deste contrato.
</p>

<p>
  <strong>Data de Início:</strong> [DATA_INICIO]<br>
  <strong>Data de Conclusão:</strong> [DATA_CONCLUSAO]
</p>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  5. OBRIGAÇÕES DAS PARTES
</h2>

<h3 style="color: #374151;">5.1 Obrigações do CONTRATANTE:</h3>
<ul>
  <li>Fornecer todas as informações necessárias para a execução dos serviços;</li>
  <li>Efetuar o pagamento nas datas acordadas;</li>
  <li>Disponibilizar acesso aos recursos necessários;</li>
  <li>[OBRIGACOES_CONTRATANTE]</li>
</ul>

<h3 style="color: #374151;">5.2 Obrigações do CONTRATADO:</h3>
<ul>
  <li>Executar os serviços com qualidade e dentro do prazo estabelecido;</li>
  <li>Manter sigilo sobre informações confidenciais;</li>
  <li>Comunicar imediatamente qualquer impedimento na execução;</li>
  <li>[OBRIGACOES_CONTRATADO]</li>
</ul>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  6. RESCISÃO
</h2>

<p style="text-align: justify;">
  Este contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio 
  de <strong>[PRAZO_RESCISAO] dias</strong>, sem prejuízo das obrigações já assumidas.
</p>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  7. DISPOSIÇÕES GERAIS
</h2>

<p style="text-align: justify;">
  Este contrato é regido pelas leis brasileiras e qualquer divergência será 
  resolvida no foro da comarca de [FORO_COMARCA].
</p>

<p style="text-align: justify;">
  As partes elegem o foro da comarca de [FORO_COMARCA] para dirimir 
  quaisquer questões oriundas do presente contrato.
</p>

<h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
  8. ASSINATURAS
</h2>

<p>
  E por estarem assim justas e contratadas, as partes assinam o presente 
  contrato em duas vias de igual teor e forma.
</p>

<div style="margin-top: 50px;">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; text-align: center; padding: 20px; vertical-align: top;">
        <div style="border-top: 1px solid #000; margin-top: 60px; padding-top: 10px;">
          <strong>[EMPRESA_NOME]</strong><br>
          CNPJ: [EMPRESA_CNPJ]<br>
          <small>CONTRATANTE</small>
        </div>
      </td>
      <td style="width: 50%; text-align: center; padding: 20px; vertical-align: top;">
        <div style="border-top: 1px solid #000; margin-top: 60px; padding-top: 10px;">
          <strong>[ASSINANTE_NOME]</strong><br>
          CPF/CNPJ: [ASSINANTE_DOCUMENTO]<br>
          <small>CONTRATADO</small>
        </div>
      </td>
    </tr>
  </table>
</div>

<div style="margin-top: 30px; padding: 15px; background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 5px;">
  <h3 style="color: #0369a1; margin-top: 0;">📋 Informações de Assinatura Digital</h3>
  <p style="margin-bottom: 0; font-size: 12px; color: #0369a1;">
    <strong>Total de Assinaturas:</strong> [TOTAL_ASSINATURAS]<br>
    <strong>Status:</strong> [STATUS]<br>
    <strong>Data de Finalização:</strong> [DATA_FINALIZACAO] às [HORA_FINALIZACAO]<br>
    <strong>Documento gerado em:</strong> [DATA_HORA_ATUAL]
  </p>
</div>

</div>
  `.trim(),
  
  variaveis: [
    {
      nome: "TIPO_SERVICO",
      rotulo: "Tipo de Serviço",
      tipo: "text",
      obrigatorio: true,
      placeholder: "Ex: Desenvolvimento de Software"
    },
    {
      nome: "DESCRICAO_SERVICOS",
      rotulo: "Descrição Detalhada dos Serviços",
      tipo: "textarea",
      obrigatorio: true,
      placeholder: "Descreva detalhadamente os serviços a serem prestados..."
    },
    {
      nome: "VALOR_TOTAL",
      rotulo: "Valor Total",
      tipo: "currency",
      obrigatorio: true,
      placeholder: "R$ 0,00"
    },
    {
      nome: "VALOR_EXTENSO",
      rotulo: "Valor por Extenso",
      tipo: "text",
      obrigatorio: true,
      placeholder: "Ex: cinco mil reais"
    },
    {
      nome: "FORMA_PAGAMENTO",
      rotulo: "Forma de Pagamento",
      tipo: "select",
      obrigatorio: true,
      opcoes: [
        "À vista",
        "Parcelado em 2x",
        "Parcelado em 3x",
        "Mensal",
        "Por etapa"
      ]
    },
    {
      nome: "DATA_INICIO",
      rotulo: "Data de Início",
      tipo: "date",
      obrigatorio: true
    },
    {
      nome: "DATA_CONCLUSAO",
      rotulo: "Data de Conclusão",
      tipo: "date",
      obrigatorio: true
    },
    {
      nome: "ENDERECO_CONTRATADO",
      rotulo: "Endereço do Contratado",
      tipo: "text",
      obrigatorio: false,
      placeholder: "Rua, número, bairro, cidade - UF"
    },
    {
      nome: "TELEFONE_CONTRATADO",
      rotulo: "Telefone do Contratado",
      tipo: "text",
      obrigatorio: false,
      placeholder: "(11) 99999-9999"
    },
    {
      nome: "OBRIGACOES_CONTRATANTE",
      rotulo: "Obrigações Específicas do Contratante",
      tipo: "textarea",
      obrigatorio: false,
      placeholder: "Obrigações adicionais do contratante..."
    },
    {
      nome: "OBRIGACOES_CONTRATADO",
      rotulo: "Obrigações Específicas do Contratado",
      tipo: "textarea",
      obrigatorio: false,
      placeholder: "Obrigações adicionais do contratado..."
    },
    {
      nome: "PRAZO_RESCISAO",
      rotulo: "Prazo para Rescisão (dias)",
      tipo: "number",
      obrigatorio: false,
      placeholder: "30"
    },
    {
      nome: "FORO_COMARCA",
      rotulo: "Foro/Comarca",
      tipo: "text",
      obrigatorio: false,
      placeholder: "Ex: São Paulo/SP"
    }
  ]
};

/**
 * Função para inserir o modelo de exemplo no banco
 */
export async function inserirModeloExemplo() {
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('modelos_contratos')
      .insert([{
        nome: EXEMPLO_MODELO_CONTRATO.nome,
        descricao: EXEMPLO_MODELO_CONTRATO.descricao,
        conteudo: EXEMPLO_MODELO_CONTRATO.conteudo,
        variaveis: EXEMPLO_MODELO_CONTRATO.variaveis,
        ativo: true,
        criado_por: user.data.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Modelo de exemplo inserido com sucesso:', data);
    return data;

  } catch (error) {
    console.error('❌ Erro ao inserir modelo de exemplo:', error);
    throw error;
  }
}
