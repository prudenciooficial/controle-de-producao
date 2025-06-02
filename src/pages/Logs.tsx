import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Filter, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSystemLogs, getEntityTypes, getUsersFromLogs, type LogFilters } from '@/services/logsService';
import type { LogEntry } from '@/types';
import { LogDetailsDialog } from '@/components/logs/LogDetailsDialog';
import { cn } from '@/lib/utils';

const ACTION_TYPE_LABELS = {
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  OTHER: 'Outro'
};

const ACTION_TYPE_COLORS = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-yellow-100 text-yellow-800'
};

const ENTITY_TYPE_LABELS = {
  products: 'Produtos',
  materials: 'Materiais',
  suppliers: 'Fornecedores',
  production_batches: 'Lotes de Produção',
  sales: 'Vendas',
  orders: 'Pedidos',
  losses: 'Perdas'
};

export default function Logs() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{id: string, description: string}>>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [filters, setFilters] = useState<LogFilters>({});
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Verificar permissão
  if (!hasPermission('logs', 'read')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Você não tem permissão para visualizar os logs do sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters, currentPage]);

  const loadInitialData = async () => {
    try {
      const [typesResult, usersResult] = await Promise.all([
        getEntityTypes(),
        getUsersFromLogs()
      ]);
      setEntityTypes(typesResult);
      setUsers(usersResult);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await fetchSystemLogs(filters, currentPage, pageSize);
      setLogs(result.logs);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os logs do sistema.",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const newFilters: LogFilters = {};
    
    if (searchText) {
      newFilters.searchText = searchText;
    }
    if (startDate) {
      newFilters.startDate = startDate;
    }
    if (endDate) {
      newFilters.endDate = endDate;
    }

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchText('');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof LogFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value && value !== 'all') {
      if (key === 'userId' || key === 'entityType' || key === 'actionType') {
        newFilters[key] = value;
      }
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const formatLogDescription = (log: LogEntry): string => {
    const details = log.details;
    const entityLabel = ENTITY_TYPE_LABELS[log.entity_type as keyof typeof ENTITY_TYPE_LABELS] || log.entity_type;
    const user = log.user_description || 'Sistema';
    
    if (typeof details === 'string') {
      return details;
    }

    if (typeof details === 'object' && details.message) {
      return details.message;
    }

    // Gerar descrição baseada no tipo de ação
    switch (log.action_type) {
      case 'CREATE':
        return `${user} criou um novo registro em ${entityLabel}`;
      case 'UPDATE':
        return `${user} editou um registro em ${entityLabel}`;
      case 'DELETE':
        return `${user} excluiu um registro de ${entityLabel}`;
      default:
        return `${user} realizou uma operação em ${entityLabel}`;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Histórico de todas as alterações realizadas no sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Usuário</label>
              <Select value={filters.userId || 'all'} onValueChange={(value) => handleFilterChange('userId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Módulo</label>
              <Select value={filters.entityType || 'all'} onValueChange={(value) => handleFilterChange('entityType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os módulos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {ENTITY_TYPE_LABELS[type as keyof typeof ENTITY_TYPE_LABELS] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Ação</label>
              <Select value={filters.actionType || 'all'} onValueChange={(value) => handleFilterChange('actionType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
                <Button onClick={applyFilters} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date > new Date() || (endDate && date > endDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date > new Date() || (startDate && date < startDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={applyFilters}>
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>
                {totalCount} registro(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {log.user_description || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_TYPE_COLORS[log.action_type]}>
                          {ACTION_TYPE_LABELS[log.action_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ENTITY_TYPE_LABELS[log.entity_type as keyof typeof ENTITY_TYPE_LABELS] || log.entity_type}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {formatLogDescription(log)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({totalCount} registros)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <LogDetailsDialog
        log={selectedLog}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </div>
  );
}
