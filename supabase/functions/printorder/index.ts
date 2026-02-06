import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Interface para tipagem
interface PrintOrderRequest {
  orderId: string;
  tenantId?: string;
  force?: boolean; // Forçar impressão mesmo em modo manual
}

interface PrintNodeResponse {
  success: boolean;
  message: string;
  printJobId?: string;
  error?: string;
}

export async function handler(
  req: Request
): Promise<Response> {
  try {
    // Validar método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests allowed" }),
        { status: 405 }
      );
    }

    // Parse do request
    const body: PrintOrderRequest = await req.json();
    const { orderId, tenantId, force = false } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400 }
      );
    }

    // Inicializar cliente Supabase
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
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError }),
        { status: 404 }
      );
    }

    // 2. Buscar configuração de impressão (ID da impressora)
    // API Key vem das variáveis de ambiente (Supabase Secrets)
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("printnode_printer_id, print_mode")
      .single();

    if (settingsError || !settings?.printnode_printer_id) {
      return new Response(
        JSON.stringify({
          error: "Printer not configured",
          details: settingsError,
        }),
        { status: 400 }
      );
    }

    // Buscar API Key das variáveis de ambiente
    const printNodeApiKey = Deno.env.get("PRINTNODE_API_KEY");
    if (!printNodeApiKey) {
      console.error("PRINTNODE_API_KEY not configured in environment");
      return new Response(
        JSON.stringify({
          error: "PrintNode API key not configured",
        }),
        { status: 500 }
      );
    }

    // 3. Verificar modo de impressão
    if (settings.print_mode === "manual" && !force) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Print mode is manual. Use force=true to print anyway.",
        }),
        { status: 200 }
      );
    }

    // 4. Buscar itens do pedido para montar a comanda
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch order items", details: itemsError }),
        { status: 500 }
      );
    }

    // 5. Montar HTML da comanda
    const commandHTML = buildCommandHTML(order, orderItems);

    // 6. Enviar para PrintNode
    const printNodeResponse = await sendToPrintNode(
      printNodeApiKey,
      settings.printnode_printer_id,
      commandHTML
    );

    if (!printNodeResponse.success) {
      return new Response(
        JSON.stringify({
          error: "Failed to send to PrintNode",
          details: printNodeResponse.error,
        }),
        { status: 500 }
      );
    }

    // 7. Log de sucesso (opcional - salvar em tabela de logs)
    console.log(`Order ${orderId} printed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order sent to printer",
        printJobId: printNodeResponse.printJobId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}

/**
 * Constrói o HTML da comanda para impressão
 */
function buildCommandHTML(order: any, items: any[]): string {
  const date = new Date(order.created_at).toLocaleString("pt-BR");
  const itemsHTML = items
    .map(
      (item) =>
        `
    <div class="item">
      <div class="item-quantity">${item.quantity}x</div>
      <div class="item-details">
        <div class="item-name">${item.product_name}</div>
        ${item.size ? `<div class="item-size">Tamanho: ${item.size}</div>` : ""}
        ${
          item.custom_ingredients
            ? `<div class="item-extras">Adicionais: ${item.custom_ingredients}</div>`
            : ""
        }
      </div>
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
        body {
          font-family: Arial, sans-serif;
          width: 80mm;
          margin: 0;
          padding: 10mm;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          margin-bottom: 10mm;
          padding-bottom: 5mm;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
        }
        .order-info {
          margin-bottom: 10mm;
          font-size: 12px;
        }
        .order-date {
          font-weight: bold;
        }
        .items {
          margin-bottom: 10mm;
        }
        .item {
          display: flex;
          margin-bottom: 5mm;
          font-size: 12px;
        }
        .item-quantity {
          font-weight: bold;
          margin-right: 5mm;
          min-width: 15mm;
        }
        .item-details {
          flex: 1;
        }
        .item-name {
          font-weight: bold;
        }
        .item-size {
          font-size: 11px;
          color: #666;
        }
        .item-extras {
          font-size: 11px;
          color: #666;
          margin-top: 2mm;
        }
        .footer {
          border-top: 2px solid #000;
          text-align: center;
          padding-top: 5mm;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>COMANDA</h1>
      </div>
      <div class="order-info">
        <div class="order-date">Pedido: ${order.id}</div>
        <div>${date}</div>
        <div>Cliente: ${order.customer_name}</div>
      </div>
      <div class="items">
        ${itemsHTML}
      </div>
      <div class="footer">
        <p>Obrigado!</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envia a comanda para PrintNode via API
 */
async function sendToPrintNode(
  apiKey: string,
  printerId: string,
  htmlContent: string
): Promise<{ success: boolean; printJobId?: string; error?: string }> {
  try {
    // Converter HTML para base64
    const base64Content = btoa(htmlContent);

    // Payload para PrintNode
    const payload = {
      printerId: parseInt(printerId),
      source: "api",
      contentType: "html_base64",
      content: base64Content,
      jobType: "pdf",
    };

    // Fazer requisição para PrintNode
    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `PrintNode API error: ${response.status} - ${error}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      printJobId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
