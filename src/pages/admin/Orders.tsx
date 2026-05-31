import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart, DollarSign, Package, TrendingUp, User, FileDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ConsolidatedPurchasePreview } from "@/components/ConsolidatedPurchasePreview";
import { exportOrderToPDF, exportMultipleOrdersToPDF } from "@/utils/pdfExport";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  order_items: any[];
  seller_id: string | null;
  seller?: {
    id: string;
    code: string;
    name: string;
  };
}

interface Seller {
  id: string;
  code: string;
  name: string;
}

const Orders = () => {
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const queryClient = useQueryClient();
  const [showConsolidatedPreview, setShowConsolidatedPreview] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  // Fetch sellers
  const { data: sellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Seller[];
    },
  });

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedSeller],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          seller:sellers(id, code, name)
        `)
        .order('created_at', { ascending: false });

      if (selectedSeller !== "all") {
        query = query.eq('seller_id', selectedSeller);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Order[];
    },
  });

  // Subscribe to real-time changes for all orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            toast.success('¡Nuevo pedido en el sistema!', {
              description: `Pedido #${payload.new.id.substring(0, 8).toUpperCase()} - ${payload.new.customer_name}`,
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
              
              toast.info('Cambio de estado detectado', {
                description: `Pedido #${payload.new.id.substring(0, 8).toUpperCase()}: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
              });
            }
          }
          
          // Refetch orders to update the list
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filter orders
  const filteredOrders = orders?.filter(order => {
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
  }) || [];

  // Update order status mutation (admin)
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Estado del pedido actualizado');
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
    },
  });

  // Calculate statistics
  const stats = {
    totalOrders: filteredOrders?.length || 0,
    totalRevenue: filteredOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0,
    averageOrder: filteredOrders?.length ? (filteredOrders.reduce((sum, order) => sum + Number(order.total_amount), 0) / filteredOrders.length) : 0,
    totalItems: filteredOrders?.reduce((sum, order) => sum + order.order_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pedido Nuevo" },
      preparing: { variant: "default", label: "Armar Pedido" },
      in_process: { variant: "outline", label: "En Proceso" },
      ready: { variant: "default", label: "Pedido Armado" },
      to_dispatch: { variant: "outline", label: "Despachar Pedido" },
      dispatched: { variant: "default", label: "Despachado" },
      delivered: { variant: "default", label: "Entregado" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === "transfer" ? "Transferencia" : "Efectivo";
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatus.mutate({ orderId, newStatus });
  };

  const getAdminAvailableStatuses = (currentStatus: string) => {
    // Admin puede cambiar entre ciertos estados específicos
    if (currentStatus === 'preparing') {
      return [
        { value: 'preparing', label: 'Armar Pedido' },
        { value: 'in_process', label: 'En Proceso' },
      ];
    }
    if (currentStatus === 'in_process') {
      return [
        { value: 'in_process', label: 'En Proceso' },
        { value: 'ready', label: 'Pedido Armado' },
      ];
    }
    if (currentStatus === 'to_dispatch') {
      return [
        { value: 'to_dispatch', label: 'Despachar Pedido' },
        { value: 'dispatched', label: 'Despachado' },
      ];
    }
    if (currentStatus === 'dispatched') {
      return [
        { value: 'dispatched', label: 'Despachado' },
        { value: 'delivered', label: 'Entregado' },
      ];
    }
    
    // Para otros estados, mostrar todos para flexibilidad del admin
    return [
      { value: 'pending', label: 'Pedido Nuevo' },
      { value: 'preparing', label: 'Armar Pedido' },
      { value: 'in_process', label: 'En Proceso' },
      { value: 'ready', label: 'Pedido Armado' },
      { value: 'to_dispatch', label: 'Despachar Pedido' },
      { value: 'dispatched', label: 'Despachado' },
      { value: 'delivered', label: 'Entregado' },
    ];
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestión de Órdenes</h1>
          <p className="text-muted-foreground">Vista completa de todas las órdenes y estadísticas de ventas</p>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Filtrar por vendedor</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los vendedores</SelectItem>
                    <SelectItem value="none">Sin vendedor asignado</SelectItem>
                    {sellers?.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.code} - {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros Avanzados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="admin-status-filter" className="text-sm font-medium mb-2 block">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="admin-status-filter">
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
                <Label htmlFor="admin-date-from" className="text-sm font-medium mb-2 block">Desde</Label>
                <Input
                  id="admin-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="admin-date-to" className="text-sm font-medium mb-2 block">Hasta</Label>
                <Input
                  id="admin-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="admin-price-min" className="text-sm font-medium mb-2 block">Precio Mín</Label>
                <Input
                  id="admin-price-min"
                  type="number"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="admin-price-max" className="text-sm font-medium mb-2 block">Precio Máx</Label>
                <Input
                  id="admin-price-max"
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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Orden</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.averageOrder.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Listado de Órdenes</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => {
                    if (!filteredOrders || filteredOrders.length === 0) {
                      toast.error('No hay órdenes para consolidar');
                      return;
                    }
                    setShowConsolidatedPreview(true);
                  }}
                  disabled={!filteredOrders || filteredOrders.length === 0}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Resumen por Proveedor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!filteredOrders || filteredOrders.length === 0) {
                      toast.error('No hay órdenes para exportar');
                      return;
                    }
                    exportMultipleOrdersToPDF(filteredOrders as any);
                    toast.success('PDF generado correctamente');
                  }}
                  disabled={!filteredOrders || filteredOrders.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar Todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !filteredOrders || filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {!orders || orders.length === 0 ? "No hay órdenes para mostrar" : "No se encontraron órdenes con los filtros aplicados"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                          <p className="font-semibold">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Vendedor</p>
                          {order.seller ? (
                            <Badge variant="outline" className="mb-1">
                              {order.seller.code} - {order.seller.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Sin asignar</Badge>
                          )}
                          <p className="text-sm text-muted-foreground mt-2">Fecha</p>
                          <p className="text-sm">{format(new Date(order.created_at), "PPP", { locale: es })}</p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pago</p>
                          <p className="font-medium">{getPaymentMethodLabel(order.payment_method)}</p>
                          <p className="text-sm text-muted-foreground mt-2">Estado</p>
                          <div className="mt-1">
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getAdminAvailableStatuses(order.status).map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total</p>
                          <p className="text-2xl font-bold text-primary">${Number(order.total_amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {order.order_items.length} producto{order.order_items.length !== 1 ? 's' : ''}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              exportOrderToPDF(order as any);
                              toast.success('PDF generado correctamente');
                            }}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            Exportar PDF
                          </Button>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Productos:</p>
                        <div className="space-y-2">
                          {order.order_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              {item.image && (
                                <img src={item.image} alt={item.productTitle} className="w-12 h-12 object-cover rounded" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{item.productTitle}</p>
                                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                  <p className="text-muted-foreground text-xs">{item.variantTitle}</p>
                                )}
                                {item.sku && (
                                  <p className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded inline-block mt-1">
                                    SKU: {item.sku}
                                  </p>
                                )}
                              </div>
                              <p className="text-muted-foreground">x{item.quantity}</p>
                              <p className="font-semibold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Dirección de entrega:</p>
                        <p className="text-sm">{order.customer_address}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConsolidatedPurchasePreview
        open={showConsolidatedPreview}
        onOpenChange={setShowConsolidatedPreview}
        orders={filteredOrders || []}
      />
    </div>
  );
};

export default Orders;
