const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, supplierCode } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No images provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing ${images.length} pages for supplier: ${supplierCode}`);

    // Construct the prompt for AI to extract product data
    const prompt = `Extrae la información de productos de esta tabla de catálogo. 
    
    Para cada fila de la tabla, extrae:
    - SKU (código del producto, generalmente en la primera columna)
    - Descripción (nombre o descripción del producto)
    - Precio (valor numérico del precio, generalmente en la última columna)
    
    IMPORTANTE:
    - Ignora filas de encabezado
    - Ignora SKUs que sean palabras genéricas como "PCS", "SIN", "US", "USD"
    - Si un SKU tiene espacios o caracteres extraños, limpia el formato
    - El precio debe ser solo el número, sin símbolos de moneda
    - Si no encuentras un precio válido, usa 0
    
    Devuelve SOLO un array JSON con este formato exacto:
    [
      {
        "sku": "ABC123",
        "description": "Descripción del producto",
        "price": "1234.56"
      }
    ]
    
    Si no hay productos en la imagen, devuelve un array vacío: []`;

    // Call Lovable AI API
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_AI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...images.map((img: string) => ({
                type: 'image_url',
                image_url: { url: img }
              }))
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AI credits depleted. Please check your Lovable AI usage.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', aiContent);

    // Extract JSON from the response
    let products = [];
    try {
      // Try to extract JSON from markdown code blocks or plain text
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      } else {
        products = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI Content:', aiContent);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Transform and validate products
    const transformedProducts = products
      .filter((p: any) => {
        // Filter out invalid SKUs
        const sku = p.sku?.toString().trim().toUpperCase();
        return sku && 
               sku.length >= 2 && 
               !['PCS', 'SIN', 'US', 'USD'].includes(sku);
      })
      .map((p: any) => {
        const sku = p.sku?.toString().trim();
        const description = p.description?.toString().trim() || '';
        const priceStr = p.price?.toString().replace(/[^0-9.]/g, '') || '0';
        const price = parseFloat(priceStr) || 0;

        // Prepend supplier code to SKU if provided
        const finalSku = supplierCode ? `${supplierCode}-${sku}` : sku;

        return {
          sku: finalSku,
          name: description,
          price: price.toString(),
          code: sku, // Original SKU without supplier prefix
        };
      });

    console.log(`Extracted ${transformedProducts.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        products: transformedProducts,
        totalFound: transformedProducts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in extract-supplier-catalog:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
