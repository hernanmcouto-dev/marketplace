import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function extractProductsFromPdfBase64(pdfBase64: string, supplierCode: string, lovableApiKey: string) {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Analiza este PDF que contiene un catalogo de productos en formato de tabla.

Extrae TODOS los productos de todas las paginas. Columnas posibles:
- CODIGO (codigo del producto)
- DESCRIPCION (puede ser multilinea, combinarla)
- UNID./B o CANTIDAD (unidades por bulto)
- PRECIO/U o PRECIO (precio unitario)

Para cada producto indica "imageRowIndex": el indice ordinal (0-based) de la imagen de producto
que le corresponde visualmente en la tabla. Si no tiene imagen visible, usa -1.
Si no hay codigo, genera uno secuencial como PROD-001.
Prefija todos los codigos con "${supplierCode.toUpperCase()}-" si no lo tienen ya.`
          },
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
          }
        ]
      }],
      tools: [{
        type: "function",
        function: {
          name: "extract_products",
          description: "Extrae todos los productos del catalogo PDF",
          parameters: {
            type: "object",
            properties: {
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    codigo: { type: "string" },
                    descripcion: { type: "string" },
                    cantidad: { type: "number" },
                    precio: { type: "number" },
                    imageRowIndex: { type: "number" }
                  },
                  required: ["codigo", "descripcion", "cantidad", "precio", "imageRowIndex"],
                  additionalProperties: false
                }
              }
            },
            required: ["products"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_products" } }
    })
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    if (aiResponse.status === 402) throw new Error("CREDITS_DEPLETED");
    throw new Error(`AI error ${aiResponse.status}: ${errText}`);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  const extracted = JSON.parse(toolCall.function.arguments);
  return (extracted.products || []).map((p: any, index: number) => ({
    codigo: p.codigo.startsWith(supplierCode.toUpperCase())
      ? p.codigo
      : `${supplierCode.toUpperCase()}-${p.codigo}`,
    nombre: p.descripcion,
    descripcion: p.descripcion,
    cantidad_bulto: p.cantidad || 1,
    precio: p.precio || 0,
    rowIndex: index,
    imageRowIndex: typeof p.imageRowIndex === "number" ? p.imageRowIndex : index
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const contentType = req.headers.get("content-type") || "";
    let supplierCode = "";
    let pdfBase64: string | null = null;
    let csvText: string | null = null;
    let fileName = "";

    // ── Modo 1: JSON con pdfUrl ───────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await req.json();
      supplierCode = body.supplierCode || "";
      const pdfUrl: string = body.pdfUrl || "";

      if (!pdfUrl) throw new Error("pdfUrl requerido en modo JSON");

      console.log("Descargando PDF desde URL:", pdfUrl);

      // Convertir URL de Google Drive si es necesario
      let fetchUrl = pdfUrl;
      const driveMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      }

      const pdfRes = await fetch(fetchUrl);
      if (!pdfRes.ok) throw new Error(`Error descargando PDF: ${pdfRes.status}`);

      const pdfBuffer = await pdfRes.arrayBuffer();
      pdfBase64 = arrayBufferToBase64(pdfBuffer);
      fileName = "document.pdf";
      console.log("PDF descargado:", pdfBuffer.byteLength, "bytes");
    }
    // ── Modo 2: FormData con archivo ─────────────────────────────────────────
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      supplierCode = (formData.get("supplierCode") as string) || "";

      if (!file) throw new Error("No file provided");
      fileName = file.name.toLowerCase();
      console.log("Procesando archivo:", file.name, "proveedor:", supplierCode);

      // CSV
      if (fileName.endsWith(".csv")) {
        csvText = await file.text();
      }
      // PDF
      else if (fileName.endsWith(".pdf")) {
        const pdfBuffer = await file.arrayBuffer();
        pdfBase64 = arrayBufferToBase64(pdfBuffer);
      }
    } else {
      throw new Error("Content-Type no soportado: " + contentType);
    }

    // ── Procesar PDF ──────────────────────────────────────────────────────────
    if (pdfBase64) {
      console.log("Enviando PDF a Gemini...");
      try {
        const products = await extractProductsFromPdfBase64(pdfBase64, supplierCode, LOVABLE_API_KEY);
        console.log("Productos extraidos:", products.length);
        return new Response(
          JSON.stringify({ success: true, products, totalProducts: products.length, source: "pdf-server" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        if (err.message === "CREDITS_DEPLETED") {
          return new Response(
            JSON.stringify({ success: false, error: "CREDITS_DEPLETED" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw err;
      }
    }

    // ── Procesar CSV ──────────────────────────────────────────────────────────
    if (csvText) {
      const lines = csvText.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const products = lines.slice(1).map((line, index) => {
        const values = line.split(",");
        const p: any = { rowIndex: index };
        headers.forEach((h, i) => {
          if (h.includes("nombre") || h.includes("name") || h.includes("title")) p.nombre = values[i]?.trim();
          else if (h.includes("codigo") || h.includes("code") || h.includes("sku")) p.codigo = values[i]?.trim();
          else if (h.includes("precio") || h.includes("price")) p.precio = parseFloat(values[i]?.trim() || "0");
          else if (h.includes("cantidad") || h.includes("bulto") || h.includes("qty")) p.cantidad_bulto = parseInt(values[i]?.trim() || "1");
          else if (h.includes("descripcion") || h.includes("description")) p.descripcion = values[i]?.trim();
          else if (h.includes("imagen") || h.includes("image")) p.imagen_url = values[i]?.trim();
        });
        return p;
      }).filter((p: any) => p.nombre);
      return new Response(
        JSON.stringify({ success: true, products, totalProducts: products.length, source: "csv-server" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Excel u otros → cliente
    return new Response(
      JSON.stringify({ success: false, needsClientProcessing: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
