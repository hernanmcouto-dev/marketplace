import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const MisOrdenes = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['userOrders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      processing: { label: 'En proceso', variant: 'default' as const },
      shipped: { label: 'Enviado', variant: 'default' as const },
      delivered: { label: 'Entregado', variant: 'default' as const },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === 'transfer' ? 'Transferencia' : 'Efectivo';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Debes iniciar sesión</h2>
          <p className="text-muted-foreground mb-4">
            Para ver tus órdenes necesitas estar autenticado
          </p>
          <Button onClick={() => navigate("/auth")}>Iniciar sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Mis Órdenes</h1>
        </div>

        {!orders || orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No tienes órdenes aún</h2>
            <p className="text-muted-foreground mb-6">
              Cuando realices tu primera compra, aparecerá aquí
            </p>
            <Button onClick={() => navigate("/")}>Explorar productos</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Orden #{order.id.slice(0, 8)}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ${Number(order.total_amount).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      {getPaymentMethodLabel(order.payment_method)}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Productos</h4>
                  <div className="space-y-3">
                    {Array.isArray(order.order_items) && order.order_items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4">
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
                          <h5 className="font-medium text-sm">{item.productTitle}</h5>
                          {item.variantTitle && item.variantTitle !== 'Default Title' && (
                            <p className="text-xs text-muted-foreground">
                              {item.variantTitle}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded inline-block mt-1">
                              SKU: {item.sku}
                            </p>
                          )}
                          <div className="flex justify-between mt-1">
                            <span className="text-sm text-muted-foreground">
                              Cantidad: {item.quantity}
                            </span>
                            <span className="font-semibold text-sm">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t mt-4 pt-4">
                  <h4 className="font-medium mb-2">Información de entrega</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Nombre:</strong> {order.customer_name}</p>
                    <p><strong>Email:</strong> {order.customer_email}</p>
                    <p><strong>Teléfono:</strong> {order.customer_phone}</p>
                    <p><strong>Dirección:</strong> {order.customer_address}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/confirmacion/${order.id}`)}
                    className="w-full sm:w-auto"
                  >
                    Ver detalles
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisOrdenes;
