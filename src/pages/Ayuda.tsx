import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Ayuda = () => {
  const { sellerId } = useReferralCode();
  
  const { data: seller } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: async () => {
      if (!sellerId) return null;
      
      const { data, error } = await supabase
        .from('sellers')
        .select('phone, name')
        .eq('id', sellerId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  const whatsappNumber = seller?.phone || "5491112345678";
  const whatsappMessage = seller 
    ? `Hola ${seller.name}! Necesito ayuda con la tienda online.`
    : 'Hola! Necesito ayuda con la tienda online.';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
  
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Centro de Ayuda</h1>
            <p className="text-muted-foreground mt-1">
              ¿En qué podemos ayudarte?
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Contáctanos por WhatsApp de Lunes a Viernes de 9:00 a 18:00
                {seller && <span className="block mt-1 font-medium">Vendedor: {seller.name}</span>}
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(whatsappLink, '_blank')}
              >
                Abrir WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>


        <Card>
          <CardHeader>
            <CardTitle>Preguntas Frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>¿Cómo puedo realizar un pedido?</AccordionTrigger>
                <AccordionContent>
                  Para realizar un pedido, simplemente busca el producto que deseas, agrégalo al carrito y procede al checkout. Antes de realizar el pago, se te informará vía WhatsApp si hay faltantes y si hay que modificar algo en tu pedido. Una vez confirmado, podrás pagar con efectivo, depósito o transferencia bancaria.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>¿Cuánto tarda el envío y quién lo paga?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">El pedido se despacha dentro de las 24 horas de confirmar el pedido final y haber recibido el pago.</p>
                  <p className="mb-2"><strong>Costos de envío:</strong> El envío hasta el transporte es a nuestro cargo. El cliente pagará el costo de envío del transporte hasta su ciudad, el cual dependerá del transporte que elija.</p>
                  <p>Nosotros no cotizamos ese valor, pero podemos sugerirle transportes según su localidad.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>¿Puedo devolver un producto?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2"><strong>Bultos cerrados:</strong> Si falla más del 10% de los productos del bulto cerrado, se cambiará el bulto completo y se hará nota de crédito.</p>
                  <p className="mb-2"><strong>Productos de menos de $10:</strong> Los productos comprados por unidad con precio menor a $10 no tienen cambio.</p>
                  <p><strong>Productos mayores a $10:</strong> Tienen 30 días de garantía por mal funcionamiento de fábrica. También ofrecemos la posibilidad de garantía extendida en todos los productos por un costo adicional.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>¿Qué métodos de pago aceptan?</AccordionTrigger>
                <AccordionContent>
                  Aceptamos efectivo, depósito o transferencia bancaria (que puede realizarse también a través de código QR).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>¿Cómo puedo rastrear mi pedido?</AccordionTrigger>
                <AccordionContent>
                  Una vez despachado el pedido, se te enviará el número de guía por WhatsApp para que puedas rastrear tu envío.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>¿Los productos vendidos por bulto se pueden comprar por unidad?</AccordionTrigger>
                <AccordionContent>
                  Los productos marcados como "Venta por bulto" se venden únicamente en la cantidad indicada en el bulto. Sin embargo, mostramos el precio unitario para que puedas calcular el costo por unidad. Si necesitas cantidades menores, contáctanos y buscaremos una solución.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ayuda;
