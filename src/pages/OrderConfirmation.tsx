import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, CreditCard, Banknote, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
  order_items: any[];
  seller_id: string | null;
}

interface Seller {
  phone: string;
  name: string;
}

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data as Order);

        // Fetch seller if seller_id exists
        if (data?.seller_id) {
          const { data: sellerData, error: sellerError } = await supabase
            .from('sellers')
            .select('phone, name')
            .eq('id', data.seller_id)
            .single();

          if (!sellerError && sellerData) {
            setSeller(sellerData);
          }
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Pedido no encontrado</h2>
          <Link to="/">
            <Button>Volver a la tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <CheckCircle2 className="h-16 w-16 text-marketplace-green mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">¡Pedido Confirmado!</h1>
          <p className="text-muted-foreground">
            Pedido #{order.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        {seller && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Contacta a tu vendedor</h3>
                  <p className="text-sm text-muted-foreground">
                    {seller.name} - {seller.phone}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.open(
                  `https://wa.me/${seller.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hola ${seller.name}! Te escribo por mi pedido #${order.id.substring(0, 8).toUpperCase()}.\n\n` +
                    `✅ Pedido confirmado - Total: $${order.total_amount.toFixed(2)}\n\n` +
                    `Datos del pedido:\n` +
                    `• Cliente: ${order.customer_name}\n` +
                    `• Productos: ${order.order_items.length} item(s)\n` +
                    `• Método de pago: ${order.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo'}\n\n` +
                    `¿Puedes confirmarme los próximos pasos?`
                  )}`,
                  '_blank'
                )}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          </Card>
        )}


        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Instrucciones de pago</h2>
          
          {order.payment_method === 'transfer' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <CreditCard className="h-6 w-6 text-marketplace-blue flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Transferencia Bancaria</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Por favor realiza la transferencia a la siguiente cuenta:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Banco:</span> Banco Ejemplo
                    </div>
                    <div>
                      <span className="font-medium">CBU:</span> 0000003100010000000000
                    </div>
                    <div>
                      <span className="font-medium">Alias:</span> MERCADOSHOP.MP
                    </div>
                    <div>
                      <span className="font-medium">Titular:</span> PlanetaOnce S.A.
                    </div>
                    <div className="mt-3 p-3 bg-background rounded">
                      <span className="font-medium">Monto a transferir:</span>
                      <span className="text-xl font-bold ml-2">${order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Una vez realizada la transferencia, envía el comprobante a nuestro WhatsApp:{' '}
                    {seller ? (
                      <a 
                        href={`https://wa.me/${seller.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hola ${seller.name}! Te escribo por mi pedido #${order.id.substring(0, 8).toUpperCase()}.\n\n` +
                          `✅ Ya realicé la transferencia de $${order.total_amount.toFixed(2)}\n\n` +
                          `Datos del pedido:\n` +
                          `• Cliente: ${order.customer_name}\n` +
                          `• Total: $${order.total_amount.toFixed(2)}\n` +
                          `• Productos: ${order.order_items.length} item(s)\n\n` +
                          `Adjunto el comprobante de transferencia.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {seller.phone} ({seller.name})
                      </a>
                    ) : (
                      '+54 11 1234-5678'
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                <Banknote className="h-6 w-6 text-marketplace-green flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Pago en Efectivo</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    El pago se realizará en efectivo al momento de la entrega.
                  </p>
                  <div className="p-3 bg-background rounded">
                    <span className="font-medium">Monto a pagar:</span>
                    <span className="text-xl font-bold ml-2">${order.total_amount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Ten el monto exacto disponible para facilitar la entrega.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Datos de entrega</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Nombre:</span> {order.customer_name}
            </div>
            <div>
              <span className="font-medium">Email:</span> {order.customer_email}
            </div>
            <div>
              <span className="font-medium">Teléfono:</span> {order.customer_phone}
            </div>
            <div>
              <span className="font-medium">Dirección:</span> {order.customer_address}
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Productos</h2>
          <div className="space-y-4">
            {order.order_items.map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="w-16 h-16 bg-secondary/20 rounded overflow-hidden flex-shrink-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.productTitle}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.productTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    Cantidad: {item.quantity}
                  </p>
                  <p className="font-semibold">
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Recibirás un email de confirmación en {order.customer_email}
          </p>
          <Link to="/">
            <Button className="bg-marketplace-blue hover:bg-marketplace-blue/90">
              Volver a la tienda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
