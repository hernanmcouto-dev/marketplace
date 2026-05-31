import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const { images, supplierCode } = JSON.parse(body);

    if (!images || !supplierCode) {
      throw new Error('Images and supplier code are required');
    }

    console.log('Processing', images.length, 'PDF pages as images');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI to extract table...');

    // Build content array with text and all images
    const content: any[] = [
      {
        type: 'text',
        text: `Analiza estas imágenes de un catálogo de productos en formato de tabla.

Extrae TODOS los productos. Columnas posibles:
- CODIGO (o código del producto)
- DESCRIPCION (puede estar en múltiples líneas)
- UNID./B o CANTIDAD (unidades por bulto)
- PRECIO/U o PRECIO (precio unitario)

IMPORTANTE:
- Asigna a cada producto un campo "imageRowIndex" que indica la posición ordinal de la imagen 
  de producto que le corresponde en la página (empezando en 0).
  Por ejemplo: si la página tiene 3 imágenes de productos (foto_producto_1, foto_producto_2, foto_producto_3),
  el primer producto tiene imageRowIndex=0, el segundo imageRowIndex=1, el tercero imageRowIndex=2.
  Si un producto no tiene imagen visible en la tabla, deja imageRowIndex como -1.
- Si un producto tiene descripción multilínea, combínala en un solo texto
- Si no hay código visible, genera uno secuencial como "PROD-001", "PROD-002"
- Si no hay cantidad, usa 1
- Si no hay precio, usa 0
- Extrae TODOS los productos de todas las páginas`
      }
    ];

    // Add all page images to content
    images.forEach((imageData: string) => {
      content.push({
        type: 'image_url',
        image_url: { url: imageData }
      });
    });

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_products',
              description: 'Extrae todos los productos de la tabla del PDF',
              parameters: {
                type: 'object',
                properties: {
                  products: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        codigo: { type: 'string', description: 'Código del producto' },
                        descripcion: { type: 'string', description: 'Descripción completa del producto' },
                        cantidad: { type: 'number', description: 'Unidades por bulto' },
                        precio: { type: 'number', description: 'Precio unitario' },
                        imageRowIndex: { 
                          type: 'number', 
                          description: 'Índice ordinal (0-based) de la imagen de producto en la página. -1 si no tiene imagen.' 
                        }
                      },
                      required: ['codigo', 'descripcion', 'cantidad', 'precio', 'imageRowIndex'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['products'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_products' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "CREDITS_DEPLETED",
            message: "Los créditos de IA se han agotado. Usa archivos CSV/Excel."
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received, extracting products...');

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const products = extractedData.products || [];

    console.log('Extracted products:', products.length);

    const formattedProducts = products.map((p: any, index: number) => ({
      codigo: p.codigo.startsWith(supplierCode.toUpperCase()) 
        ? p.codigo 
        : `${supplierCode.toUpperCase()}-${p.codigo}`,
      nombre: p.descripcion,
      descripcion: p.descripcion,
      cantidad_bulto: p.cantidad || 1,
      precio: p.precio || 0,
      rowIndex: index,
      // imageRowIndex: posición ordinal de la imagen en la página (-1 = sin imagen)
      imageRowIndex: typeof p.imageRowIndex === 'number' ? p.imageRowIndex : index
    }));

    return new Response(
      JSON.stringify({
        success: true,
        products: formattedProducts,
        totalProducts: formattedProducts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-pdf-table-ai:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
