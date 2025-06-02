import { useState, useEffect } from 'react';
import { useQuery, QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSystemLogs, fetchLogUsers, fetchLogEntityTypes, LogFilters, FetchLogsResponse } from '@/services/logsService';
import { SystemLog } from '@/types/logs';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
// import { Input } from '@/components/ui/input'; // Não usado diretamente, mas pode ser útil para paginação numérica futura
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 20;

export default function SystemLogsPage() {
  const { canViewSystemLogs, user, loading: authLoading } = useAuth();
  const [filters, setFilters] = useState<LogFilters>({ page: 1, pageSize: ITEMS_PER_PAGE });
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | undefined>(undefined);

  const logUsersQueryKey: QueryKey = ['logUsers'];
  const { data: logUsers, isLoading: isLoadingUsers } = useQuery<
    { id: string; description: string }[], 
    Error
    // { id: string; description: string }[], 
    // QueryKey // Não é necessário especificar os 2 últimos tipos genéricos se o queryFn for simples
  >(
    {
      queryKey: logUsersQueryKey,
      queryFn: fetchLogUsers,
      enabled: !!user, 
    }
  );

  const logEntityTypesQueryKey: QueryKey = ['logEntityTypes'];
  const { data: logEntityTypes, isLoading: isLoadingEntityTypes } = useQuery<
    string[], 
    Error
    // string[], 
    // QueryKey
  >(
    {
      queryKey: logEntityTypesQueryKey,
      queryFn: fetchLogEntityTypes,
      enabled: !!user,
    }
  );

  const systemLogsQueryKey: QueryKey = ['systemLogs', filters];
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    isFetching: isFetchingLogs,
    error: errorLogs,
  } = useQuery<FetchLogsResponse, Error>(
    {
      queryKey: systemLogsQueryKey,
      queryFn: () => fetchSystemLogs(filters),
      enabled: !!user && canViewSystemLogs(),
      // placeholderData: (previousData) => previousData, // Removido - não é a forma correta para manter dados durante refetch
      // O comportamento padrão do TanStack Query v5+ é manter os dados antigos enquanto busca novos (isFetching=true)
    }
  );

  if (authLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verificando autenticação...</p>
      </div>
    );
  }

  if (!user || !canViewSystemLogs()) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para visualizar os logs do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const handleFilterChange = (filterName: keyof LogFilters, value: any) => {
    setFilters(prev => ({ 
      ...prev, 
      [filterName]: value === 'all' ? undefined : value, 
      page: 1 
    }));
  };

  const handleDateRangeChange = (dateRangeValue: DateRange | undefined) => {
    setCurrentDateRange(dateRangeValue);
    setFilters(prev => ({
      ...prev,
      startDate: dateRangeValue?.from ? format(dateRangeValue.from, 'yyyy-MM-dd') : undefined,
      endDate: dateRangeValue?.to ? format(dateRangeValue.to, 'yyyy-MM-dd') : undefined,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    const currentTotalPages = logsData?.count ? Math.ceil(logsData.count / ITEMS_PER_PAGE) : 1;
    if (newPage > currentTotalPages && currentTotalPages > 0) return; // Não ir além da última página calculada
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatLogDetails = (log: SystemLog): string => {
    let details = '';
    const oldData = log.details?.old_data;
    const newData = log.details?.new_data;

    if (log.action_type === 'INSERT' && newData) {
      const entries = Object.entries(newData).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
      details = `Dados: {${entries}}.`;
    }
    else if (log.action_type === 'DELETE' && oldData) {
      const entries = Object.entries(oldData).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ');
      details = `Removido: {${entries}}.`;
    }
    else if (log.action_type === 'UPDATE' && oldData && newData) {
      const changes = Object.entries(newData).map(([key, newValue]) => {
        const oldValue = oldData[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          return `'${key}': '${JSON.stringify(oldValue)}' -> '${JSON.stringify(newValue)}'`;
        }
        return null;
      }).filter(Boolean).join('; ');
      details = changes ? `Alterações: ${changes}.` : 'Nenhuma alteração de dados registrada.';
    }
    return details;
  };

  const logs = logsData?.logs || [];
  const totalCount = logsData?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const isLoadingFilters = isLoadingUsers || isLoadingEntityTypes;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as alterações realizadas no sistema.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine a busca por logs específicos. {isLoadingFilters && <span className="text-xs animate-pulse">Carregando filtros...</span>}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            onValueChange={(value) => handleFilterChange('userId', value)}
            disabled={isLoadingUsers || isFetchingLogs}
            value={filters.userId || 'all'}
          >
            <SelectTrigger className={isLoadingUsers ? 'animate-pulse' : ''}>
              <SelectValue placeholder="Filtrar por usuário..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Usuários</SelectItem>
              {logUsers?.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => handleFilterChange('entityType', value)}
            disabled={isLoadingEntityTypes || isFetchingLogs}
            value={filters.entityType || 'all'}
          >
            <SelectTrigger className={isLoadingEntityTypes ? 'animate-pulse' : ''}>
              <SelectValue placeholder="Filtrar por módulo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Módulos</SelectItem>
              {logEntityTypes?.map(et => (
                <SelectItem key={et} value={et}>{et}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker 
            dateRange={currentDateRange}
            onDateRangeChange={handleDateRangeChange}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({totalCount})</CardTitle>
          <CardDescription>Lista de logs conforme os filtros aplicados.</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoadingLogs || (isFetchingLogs && logs.length === 0)) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Carregando logs...</p>
            </div>
          )}
          {errorLogs && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Logs</AlertTitle>
              <AlertDescription>{errorLogs.message}</AlertDescription>
            </Alert>
          )}
          {!isFetchingLogs && !isLoadingLogs && logs.length === 0 && !errorLogs && (
            <div className="text-center py-8">Nenhum log encontrado para os filtros aplicados.</div>
          )}
          {logs.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>ID da Entidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}</TableCell>
                      <TableCell>{log.user_description || 'N/A'}</TableCell>
                      <TableCell>{log.action_type}</TableCell>
                      <TableCell>{log.entity_type}</TableCell>
                      <TableCell>{log.entity_id || 'N/A'}</TableCell>
                      <TableCell className="text-xs max-w-sm break-words whitespace-pre-wrap" title={formatLogDetails(log)}>
                        {formatLogDetails(log)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <Button 
                    onClick={() => handlePageChange(filters.page! - 1)} 
                    disabled={filters.page === 1 || isFetchingLogs}
                    variant="outline"
                  >
                    Anterior
                  </Button>
                  <span className="text-sm">
                    Página {filters.page} de {totalPages}
                  </span>
                  <Button 
                    onClick={() => handlePageChange(filters.page! + 1)} 
                    disabled={filters.page === totalPages || isFetchingLogs}
                    variant="outline"
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 