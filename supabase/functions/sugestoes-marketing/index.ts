import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sugestões de IA via n8n: a função monta o payload do mês, envia para o webhook e retorna as sugestões
// Espera que o n8n retorne um array de sugestões no formato usado pela UI

interface RequestBody {
  mes?: number; // 1-12
  ano?: number;
  canais?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;

    const now = new Date();
    const mes = body.mes ?? (now.getMonth() + 1);
    const ano = body.ano ?? now.getFullYear();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_MARKETING_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      throw new Error("Defina o segredo N8N_MARKETING_WEBHOOK_URL na função.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const startDate = new Date(ano, mes - 1, 1);
    const endDate = new Date(ano, mes, 0);
    const startStr = formatISODate(startDate);
    const endStr = formatISODate(endDate);

    // Buscar postagens do mês
    const { data: posts, error: postsErr } = await supabase
      .from("cronograma_postagens")
      .select("*")
      .gte("data_postagem", startStr)
      .lte("data_postagem", endStr)
      .order("data_postagem", { ascending: true });
    if (postsErr) throw postsErr;

    // Buscar datas especiais no mês
    const { data: datasEsp, error: datasErr } = await supabase
      .from("datas_especiais")
      .select("*")
      .gte("data_evento", startStr)
      .lte("data_evento", endStr)
      .order("data_evento", { ascending: true });
    if (datasErr) throw datasErr;

    // Montar string de "postagens" (resumo com intervalos sem publicação)
    const totalDias = daysInMonth(ano, mes);
    const postsByDay = new Map<number, any[]>();
    (posts || []).forEach(p => {
      const day = new Date(p.data_postagem).getDate();
      const arr = postsByDay.get(day) || [];
      arr.push(p);
      postsByDay.set(day, arr);
    });

    const linhas: string[] = [];
    let d = 1;
    while (d <= totalDias) {
      const dayPosts = postsByDay.get(d);
      if (dayPosts && dayPosts.length > 0) {
        const tema = (dayPosts[0]?.tema || "").trim() || "Sem tema";
        linhas.push(`${d} - ${tema}`);
        d += 1;
      } else {
        let j = d + 1;
        while (j <= totalDias && (!postsByDay.get(j) || (postsByDay.get(j)?.length ?? 0) === 0)) {
          j += 1;
        }
        // intervalo [d, j-1]
        if (j - 1 === d) {
          linhas.push(`${d} - Sem publicações`);
        } else {
          linhas.push(`${d} à ${j - 1} - Sem publicações`);
        }
        d = j;
      }
    }

    const resumoPostagens = linhas.join(" ; ");

    // Normalizar campos conforme exemplo
    const postagens_existentes = (posts || []).map(p => ({
      id: p.id,
      data_postagem: new Date(p.data_postagem).toISOString(),
      tema: p.tema,
      descricao: p.descricao || "",
      rede_social: p.rede_social || "instagram",
      status: p.status || "planejada",
      eh_sugestao_ia: !!p.eh_sugestao_ia,
      observacoes: p.observacoes ?? null,
      data_criacao: p.data_criacao ? new Date(p.data_criacao).toISOString() : null,
      data_atualizacao: p.data_atualizacao ? new Date(p.data_atualizacao).toISOString() : null,
      criado_por: p.criado_por ?? null,
      atualizado_por: null,
    }));

    const datas_especiais = (datasEsp || []).map(d => ({
      id: d.id,
      nome: d.nome,
      data_evento: new Date(d.data_evento).toISOString(),
      tipo: d.tipo,
      descricao: d.descricao || null,
      sugestao_tema: d.sugestao_tema || null,
      recorrente: !!d.recorrente,
      ativo: !!d.ativo,
      created_at: d.created_at ? new Date(d.created_at).toISOString() : null,
    }));

    const payload = {
      IdRequisicao: `${Date.now()}${mes}${ano}`,
      ano: String(ano),
      mes: MESES_PT[mes - 1],
      postagens: resumoPostagens,
      postagens_existentes,
      datas_especiais,
    };

    const n8nResp = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!n8nResp.ok) {
      const txt = await n8nResp.text();
      throw new Error(`n8n webhook error: ${n8nResp.status} - ${txt}`);
    }

    const result = await n8nResp.json().catch(() => null);

    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "erro" }), {
      headers: { "content-type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});

