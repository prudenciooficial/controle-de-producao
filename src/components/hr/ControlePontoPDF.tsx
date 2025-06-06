
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ControlePontoData } from '@/types/hr';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  employeeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  employeeField: {
    fontSize: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 25,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 9,
    textAlign: 'center',
  },
  dayColumn: { width: '6%' },
  dateColumn: { width: '8%' },
  timeColumn: { width: '12%' },
  signColumn: { width: '15%' },
  obsColumn: { width: '35%' },
  scheduleInfo: {
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signature: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    textAlign: 'center',
    fontSize: 9,
  },
});

interface ControlePontoPDFProps {
  data: ControlePontoData;
}

export function ControlePontoPDF({ data }: ControlePontoPDFProps) {
  const { funcionario, mes, ano, feriados, configuracao_empresa } = data;

  // Obter dias do mês
  const getDaysInMonth = () => {
    const daysInMonth = new Date(ano, mes, 0).getDate();
    const days = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(ano, mes - 1, day);
      const dayOfWeek = date.getDay();
      const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
      
      // Verificar se é feriado
      const isFeriado = feriados.some(feriado => {
        const feriadoDate = new Date(feriado.data);
        return feriadoDate.getDate() === day && 
               feriadoDate.getMonth() === mes - 1 && 
               feriadoDate.getFullYear() === ano;
      });
      
      days.push({
        day,
        dayName: dayNames[dayOfWeek],
        date: date.toLocaleDateString('pt-BR'),
        isFeriado,
        isDomingo: dayOfWeek === 0,
      });
    }
    
    return days;
  };

  const days = getDaysInMonth();
  const monthNames = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{configuracao_empresa.nome_empresa}</Text>
          <Text style={styles.companyInfo}>CNPJ: {configuracao_empresa.cnpj}</Text>
          <Text style={styles.companyInfo}>{configuracao_empresa.endereco}</Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>
          CONTROLE DE FREQUÊNCIA - {monthNames[mes - 1]} / {ano}
        </Text>

        {/* Informações do funcionário */}
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeField}>FUNCIONÁRIO: {funcionario.nome_completo}</Text>
          <Text style={styles.employeeField}>CARGO: {funcionario.cargo}</Text>
        </View>

        {/* Horário de trabalho */}
        {funcionario.jornada && (
          <Text style={styles.scheduleInfo}>
            {funcionario.jornada.descricao_impressao}
          </Text>
        )}

        {/* Tabela */}
        <View style={styles.table}>
          {/* Cabeçalho da tabela */}
          <View style={styles.tableHeader}>
            <View style={[styles.tableCell, styles.dayColumn]}>
              <Text style={styles.tableCellText}>DIA</Text>
            </View>
            <View style={[styles.tableCell, styles.dateColumn]}>
              <Text style={styles.tableCellText}>DATA</Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
              <Text style={styles.tableCellText}>ENTRADA</Text>
            </View>
            <View style={[styles.tableCell, styles.signColumn]}>
              <Text style={styles.tableCellText}>ASSINATURA</Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
              <Text style={styles.tableCellText}>SAÍDA</Text>
            </View>
            <View style={[styles.tableCell, styles.signColumn]}>
              <Text style={styles.tableCellText}>ASSINATURA</Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
              <Text style={styles.tableCellText}>ENTRADA</Text>
            </View>
            <View style={[styles.tableCell, styles.signColumn]}>
              <Text style={styles.tableCellText}>ASSINATURA</Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
              <Text style={styles.tableCellText}>SAÍDA</Text>
            </View>
            <View style={[styles.tableCell, styles.signColumn]}>
              <Text style={styles.tableCellText}>ASSINATURA</Text>
            </View>
            <View style={[styles.tableCell, styles.obsColumn, { borderRightWidth: 0 }]}>
              <Text style={styles.tableCellText}>OBSERVAÇÕES</Text>
            </View>
          </View>

          {/* Linhas da tabela */}
          {days.map((dayInfo) => (
            <View key={dayInfo.day} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.dayColumn]}>
                <Text style={styles.tableCellText}>{dayInfo.dayName}</Text>
              </View>
              <View style={[styles.tableCell, styles.dateColumn]}>
                <Text style={styles.tableCellText}>{dayInfo.day.toString().padStart(2, '0')}</Text>
              </View>
              <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.signColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.signColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.signColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.signColumn]}>
                <Text style={styles.tableCellText}></Text>
              </View>
              <View style={[styles.tableCell, styles.obsColumn, { borderRightWidth: 0 }]}>
                <Text style={styles.tableCellText}>
                  {dayInfo.isFeriado ? 'FERIADO' : (dayInfo.isDomingo ? 'DOMINGO' : '')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Rodapé com assinaturas */}
        <View style={styles.footer}>
          <View style={styles.signature}>
            <Text>FUNCIONÁRIO</Text>
          </View>
          <View style={styles.signature}>
            <Text>EMPREGADOR</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
