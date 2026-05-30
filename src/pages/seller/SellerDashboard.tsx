import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Package, DollarSign, ShoppingBag, Edit, FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditOrderDialog } from "@/components/EditOrderDialog";
import { ConsolidatedPurchasePreview } from "@/components/ConsolidatedPurchasePreview";
import { exportOrderToPDF, exportMultipleOrdersToPDF } from "@/utils/pdfExport";
import { toast } from "sonner";

interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  total_amount: number;
  status: string;
  order_items: any[];
}

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showConsolidatedPreview, setShowConsolidatedPreview] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  // Fetch seller info based on logged-in user
  useEffect(() => {
    const fetchSellerInfo = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("No tienes una cuenta de vendedor asociada");
          navigate("/auth");
          return;
        }

        setSeller(data);
      } catch (error) {
        console.error("Error fetching seller:", error);
        toast.error("Error al cargar información del vendedor");
      }
    };

    fetchSellerInfo();
  }, [user, navigate]);

  // Fetch orders for this seller
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders', seller?.id],
    queryFn: async () => {
      if (!seller?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!seller?.id,
  });

  // Subscribe to real-time changes for seller's orders
  useEffect(() => {
    if (!seller?.id) return;

    const channel = supabase
      .channel('seller-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${seller.id}`,
        },
        (payload) => {
          console.log('Order change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            toast.success('¡Nuevo pedido recibido!', {
              description: `Pedido #${payload.new.id.substring(0, 8).toUpperCase()}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = (payload.old as any)?.status;
            const newStatus = (payload.new as any)?.status;
            
            if (oldStatus !== newStatus) {
              const statusLabels: Record<string, string> = {
                pending: 'Pedido Nuevo',
                preparing: 'Armar Pedido',
                in_process: 'En Proceso',
                ready: 'Pedido Armado',
                to_dispatch: 'Despachar Pedido',
                dispatched: 'Despachado',
                delivered: 'Entregado',
              };
              
              toast.info('Estado de pedido actualizado', {
                description: `Pedido #${payload.new.id.substring(0, 8).toUpperCase()}: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
              });
            }
          }
          
          // Refetch orders to update the list
          queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seller?.id, queryClient]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    
    // Date from filter
    if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) {
      return false;
    }
    
    // Date to filter
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(order.created_at) > toDate) {
        return false;
      }
    }
    
    // Price min filter
    if (priceMin && Number(order.total_amount) < Number(priceMin)) {
      return false;
    }
    
    // Price max filter
    if (priceMax && Number(order.total_amount) > Number(priceMax)) {
      return false;
    }
    
    return true;
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('seller_id', seller?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      toast.success('Estado del pedido actualizado');
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
    },
  });

  // Update order items mutation
  const updateOrderItems = useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: any[] }) => {
      const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_items: items,
          total_amount: total
        })
        .eq('id', orderId)
        .eq('seller_id', seller?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      toast.success('Pedido actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Error al actualizar el pedido');
    },
  });

  // Calculate stats
  const stats = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
    pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
    totalItems: filteredOrders.reduce((sum, order) => sum + order.order_items.length, 0),
  };

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pedido Nuevo" },
      preparing: { variant: "default", label: "Armar Pedido" },
      in_process: { variant: "outline", label: "En Proceso" },
      ready: { variant: "default", label: "Pedido Armado" },
      to_dispatch: { variant: "outline", label: "Despachar Pedido" },
      dispatched: { variant: "default", label: "Despachado" },
      delivered: { variant: "default", label: "Entregado" },
    };
    const config = statusLabels[status] || statusLabels.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === 'transfer' ? 'Transferencia' : 'Efectivo';
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatus.mutate({ orderId, newStatus });
  };

  const canChangeStatus = (currentStatus: string) => {
    // Vendedor solo puede cambiar de "pending" a "preparing" o de "ready" a "to_dispatch"
    return currentStatus === 'pending' || currentStatus === 'ready';
  };

  const getAvailableStatuses = (currentStatus: string) => {
    if (currentStatus === 'pending') {
      return [
        { value: 'pending', label: 'Pedido Nuevo' },
        { value: 'preparing', label: 'Armar Pedido' },
      ];
    }
    if (currentStatus === 'ready') {
      return [
        { value: 'ready', label: 'Pedido Armado' },
        { value: 'to_dispatch', label: 'Despachar Pedido' },
      ];
    }
    // Para otros estados, solo mostrar el actual (no editable)
    const labels: Record<string, string> = {
      preparing: 'Armar Pedido',
      in_process: 'En Proceso',
      to_dispatch: 'Despachar Pedido',
      dispatched: 'Despachado',
      delivered: 'Entregado',
    };
    return [{ value: currentStatus, label: labels[currentStatus] || currentStatus }];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Panel de Vendedor</h1>
          <p className="text-muted-foreground">
            {seller ? `Bienvenido, ${seller.name}` : 'Cargando...'}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pedido Nuevo</SelectItem>
                    <SelectItem value="preparing">Armar Pedido</SelectItem>
                    <SelectItem value="in_process">En Proceso</SelectItem>
                    <SelectItem value="ready">Pedido Armado</SelectItem>
                    <SelectItem value="to_dispatch">Despachar Pedido</SelectItem>
                    <SelectItem value="dispatched">Despachado</SelectItem>
                    <SelectItem value="delivered">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-from" className="text-sm font-medium mb-2 block">Desde</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="date-to" className="text-sm font-medium mb-2 block">Hasta</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="price-min" className="text-sm font-medium mb-2 block">Precio Mín</Label>
                <Input
                  id="price-min"
                  type="number"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="price-max" className="text-sm font-medium mb-2 block">Precio Máx</Label>
                <Input
                  id="price-max"
                  type="number"
                  placeholder="Sin límite"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setPriceMin("");
                  setPriceMax("");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pedidos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingresos Totales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pedidos Pendientes
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Items Vendidos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mis Pedidos</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (filteredOrders.length === 0) {
                      toast.error('No hay pedidos para consolidar');
                      return;
                    }
                    setShowConsolidatedPreview(true);
                  }}
                  disabled={filteredOrders.length === 0}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Resumen por Proveedor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (filteredOrders.length === 0) {
                      toast.error('No hay pedidos para exportar');
                      return;
                    }
                    exportMultipleOrdersToPDF(filteredOrders as any);
                    toast.success('PDF generado correctamente');
                  }}
                  disabled={filteredOrders.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar Todos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {orders.length === 0 ? "No tienes pedidos aún" : "No se encontraron pedidos con los filtros aplicados"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.customer_phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(order.payment_method)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={!canChangeStatus(order.status)}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableStatuses(order.status).map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingOrder(order)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              exportOrderToPDF(order as any);
                              toast.success('PDF generado correctamente');
                            }}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(
                              `https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hola ${order.customer_name}! Soy ${seller?.name || 'tu vendedor'}.\n\n` +
                                `Te escribo sobre tu pedido #${order.id.substring(0, 8).toUpperCase()}\n\n` +
                                `Total: $${order.total_amount.toFixed(2)}\n` +
                                `Productos: ${order.order_items.length} item(s)\n\n` +
                                `¿Tienes alguna consulta?`
                              )}`,
                              '_blank'
                            )}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-2xl font-semibold">Detalles de Pedidos</h2>
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Pedido #{order.id.substring(0, 8).toUpperCase()}</span>
                    {getStatusBadge(order.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2">Información del Cliente</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Nombre:</span> {order.customer_name}</p>
                        <p><span className="font-medium">Email:</span> {order.customer_email}</p>
                        <p><span className="font-medium">Teléfono:</span> {order.customer_phone}</p>
                        <p><span className="font-medium">Dirección:</span> {order.customer_address}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Información del Pedido</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Fecha:</span> {new Date(order.created_at).toLocaleString('es-AR')}</p>
                        <p><span className="font-medium">Pago:</span> {getPaymentMethodLabel(order.payment_method)}</p>
                        <p><span className="font-medium">Total:</span> ${order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Productos</h4>
                    <div className="space-y-2">
                      {order.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productTitle}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.productTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              Cantidad: {item.quantity} × ${item.price}
                            </p>
                          </div>
                          <p className="font-semibold">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingOrder && (
        <EditOrderDialog
          open={!!editingOrder}
          onOpenChange={(open) => !open && setEditingOrder(null)}
          orderItems={editingOrder.order_items}
          onSave={(items) => updateOrderItems.mutate({ orderId: editingOrder.id, items })}
        />
      )}

      <ConsolidatedPurchasePreview
        open={showConsolidatedPreview}
        onOpenChange={setShowConsolidatedPreview}
        orders={filteredOrders as any}
      />
    </div>
  );
};

export default SellerDashboard;
