import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DataProvider } from "@/context/DataContext";
import { Navigation } from "@/components/ui/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Controle de Produção",
  description: "Sistema para controle de produção, vendas e estoque",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DataProvider>
            <div className="flex min-h-screen bg-background">
              <Navigation />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 