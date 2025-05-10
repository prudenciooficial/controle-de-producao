
import React from "react";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const location = useLocation();
  
  const getPageTitle = () => {
    if (title) return title;
    
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/producao":
        return "Produção";
      case "/producao/historico":
        return "Histórico de Produção";
      case "/vendas":
        return "Vendas";
      case "/vendas/historico":
        return "Histórico de Vendas";
      case "/pedidos":
        return "Pedidos";
      case "/pedidos/historico":
        return "Histórico de Pedidos";
      case "/estoque":
        return "Estoque";
      case "/perdas":
        return "Perdas";
      case "/perdas/historico":
        return "Histórico de Perdas";
      case "/cadastro":
        return "Cadastro";
      default:
        return "Sistema de Controle de Produção";
    }
  };
  
  return (
    <header className="flex h-16 items-center border-b bg-background px-6">
      <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
    </header>
  );
}
