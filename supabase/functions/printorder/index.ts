import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const { orderId, force = false } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar dados do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order error:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 2. Buscar configuração de impressora
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("printnode_printer_id, print_mode")
      .eq("id", "store-settings")
      .single();

    if (settingsError || !settings?.printnode_printer_id) {
      console.error("Settings error:", settingsError);
      return new Response(
        JSON.stringify({
          error: "Printer not configured",
          details: settingsError?.message,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Verificar modo de impressão
    if (settings.print_mode === "manual" && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Print mode is manual. Use force=true to print.",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 4. Buscar items do pedido
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    // 5. Montar HTML
    const html = buildHTML(order, orderItems || []);

    // 6. Enviar para PrintNode
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const printNodeResult = await sendToPrintNode(
      apiKey,
      settings.printnode_printer_id,
      html
    );

    if (!printNodeResult.success) {
      return new Response(
        JSON.stringify({
          error: "Failed to send to PrintNode",
          details: printNodeResult.error,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order sent to printer",
        printJobId: printNodeResult.printJobId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

function buildHTML(order: any, items: any[]): string {
  const itemsHTML = items
    .map(
      (item) => `
    <div style="margin-bottom: 10px;">
      <strong>${item.quantity}x ${item.product_name}</strong>
      ${item.size ? `<div style="font-size: 12px;">Tamanho: ${item.size}</div>` : ""}
      ${item.custom_ingredients ? `<div style="font-size: 12px;">Adicionais: ${item.custom_ingredients}</div>` : ""}
    </div>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: center; border-top: 2px solid #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h2>COMANDA</h2>
      <div>Pedido: ${order.id}</div>
      <div>Data: ${new Date(order.created_at).toLocaleString("pt-BR")}</div>
      <div>Cliente: ${order.customer_name || "S/N"}</div>
      <hr>
      <div>${itemsHTML}</div>
      <div class="total">Total: R$ ${(order.total || 0).toFixed(2)}</div>
    </body>
    </html>
  `;
}

async function sendToPrintNode(
  apiKey: string,
  printerId: string,
  htmlContent: string
): Promise<{ success: boolean; printJobId?: string; error?: string }> {
  try {
    const base64HTML = btoa(htmlContent);

    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Comanda - Forneiro Éden",
        contentType: "raw_base64",
        content: base64HTML,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PrintNode error ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `PrintNode API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`Print job created: ${data.id}`);
    return {
      success: true,
      printJobId: data.id,
    };
  } catch (error) {
    console.error("PrintNode error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
