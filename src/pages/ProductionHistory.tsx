import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { CalendarDate, Loader, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/components/helpers/dateUtils";

const ProductionHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof any>("productionDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [productions, setProductions] = useState([]);
  const navigate = useNavigate();
  const { productionBatches, deleteProductionBatch, refetchProductionBatches, isLoading } = useData();
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (productionBatches) {
      setProductions([...productionBatches]);
    }
  }, [productionBatches]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = productionBatches.filter((production) =>
        production.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (production.productName && production.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setProductions(filtered);
    } else {
      setProductions([...productionBatches]);
    }
  }, [searchTerm, productionBatches]);

  const handleDeleteProduction = async (productionId: string) => {
    if (!hasPermission('production', 'module')) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para excluir produções",
      });
      return;
    }

    try {
      await deleteProductionBatch(productionId);
      toast({ title: "Produção Excluída", description: "Produção excluída com sucesso." });
      await refetchProductionBatches();
    } catch (error) {
      console.error("Erro ao excluir produção:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Excluir",
        description: "Falha ao excluir produção. Verifique o console para mais detalhes.",
      });
    }
  };

  const handleSort = (column: keyof any) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedProductions = React.useMemo(() => {
    const sortableProductions = [...productions];
    sortableProductions.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortColumn === 'productionDate') {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return 0;
    });
    return sortableProductions;
  }, [productions, sortColumn, sortDirection]);

  const canDelete = hasPermission('production', 'module');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Histórico de Produção</h1>
        <Input
          type="search"
          placeholder="Buscar por lote ou produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {isLoading.productionBatches ? (
        <div className="flex justify-center items-center p-8">
          <Loader className="w-8 h-8 animate-spin" />
          <span className="ml-2">Carregando histórico de produção...</span>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head className="w-[100px]">
                  <Button variant="ghost" onClick={() => handleSort("productionDate")}>
                    Data
                    {sortColumn === "productionDate" && (sortDirection === "asc" ? " ▲" : " ▼")}
                  </Button>
                </Table.Head>
                <Table.Head>
                  <Button variant="ghost" onClick={() => handleSort("batchNumber")}>
                    Lote
                    {sortColumn === "batchNumber" && (sortDirection === "asc" ? " ▲" : " ▼")}
                  </Button>
                </Table.Head>
                <Table.Head>
                  <Button variant="ghost" onClick={() => handleSort("productName")}>
                    Produto
                    {sortColumn === "productName" && (sortDirection === "asc" ? " ▲" : " ▼")}
                  </Button>
                </Table.Head>
                <Table.Head className="text-right">Ações</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedProductions.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} className="h-24 text-center">
                    Nenhum registro de produção encontrado.
                  </Table.Cell>
                </Table.Row>
              ) : (
                sortedProductions.map((production) => (
                  <Table.Row key={production.id}>
                    <Table.Cell className="font-medium">{formatDate(production.productionDate)}</Table.Cell>
                    <Table.Cell>{production.batchNumber}</Table.Cell>
                    <Table.Cell>{production.productName || "N/A"}</Table.Cell>
                    <Table.Cell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/producao/${production.id}`)}
                      >
                        <CalendarDate className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                      {canDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduction(production.id)}
                          className="ml-2"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProductionHistory;
