import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, Database, ShoppingBag, Search, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'bright-hola-app-5s8xv.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/count.json`;
const SHOPIFY_STOREFRONT_TOKEN = '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';

interface Stats {
  totalShopify: number;
  totalSupplierProducts: number;
  synced: number;
  unsynced: number;
  loading: boolean;
}

const ProductStats = () => {
  const [skuFilter, setSkuFilter] = useState("");
  const [stats, setStats] = useState<Stats>({
    totalShopify: 0,
    totalSupplierProducts: 0,
    synced: 0,
    unsynced: 0,
    loading: true,
  });

  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      // Fetch total products from Shopify
      const shopifyResponse = await fetch(SHOPIFY_STOREFRONT_URL, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        }
      });
      
      const shopifyData = await shopifyResponse.json();
      const totalShopify = shopifyData.count || 0;

      // Fetch supplier products with optional SKU filter
      let query = supabase
        .from('supplier_products')
        .select('shopify_product_id, product_sku');

      if (skuFilter.trim()) {
        query = query.ilike('product_sku', `${skuFilter.trim().toUpperCase()}%`);
      }

      const { data: supplierProducts, error } = await query;

      if (error) throw error;

      const totalSupplierProducts = supplierProducts?.length || 0;
      const synced = totalSupplierProducts;
      const unsynced = totalShopify - synced;

      setStats({
        totalShopify,
        totalSupplierProducts,
        synced,
        unsynced,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [skuFilter]); // Re-fetch when SKU filter changes

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for supplier_products changes
    const channel = supabase
      .channel('supplier-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_products'
        },
        () => {
          console.log('Supplier products changed, refreshing stats...');
          fetchStats();
        }
      )
      .subscribe();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const chartData = [
    { name: 'Sincronizados', value: stats.synced, color: '#22c55e' },
    { name: 'Desincronizados', value: stats.unsynced, color: '#ef4444' },
  ];

  const syncPercentage = stats.totalShopify > 0 
    ? (stats.synced / stats.totalShopify) * 100 
    : 0;

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Estadísticas de Productos</h1>
          <p className="text-muted-foreground">
            Monitoreo en tiempo real de la sincronización de productos
          </p>
        </div>

        {/* Buscador mejorado */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtrar por SKU</CardTitle>
            <CardDescription>
              Busca productos por los primeros caracteres del SKU o usa los filtros rápidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Botones de filtro rápido */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={skuFilter === "DCH" ? "default" : "outline"}
                  onClick={() => setSkuFilter(skuFilter === "DCH" ? "" : "DCH")}
                  className="h-9 px-4"
                >
                  DCH
                </Button>
                <Button
                  size="sm"
                  variant={skuFilter === "IBK" ? "default" : "outline"}
                  onClick={() => setSkuFilter(skuFilter === "IBK" ? "" : "IBK")}
                  className="h-9 px-4"
                >
                  IBK
                </Button>
                <Button
                  size="sm"
                  variant={skuFilter === "IBEK" ? "default" : "outline"}
                  onClick={() => setSkuFilter(skuFilter === "IBEK" ? "" : "IBEK")}
                  className="h-9 px-4"
                >
                  IBEK
                </Button>
              </div>

              {/* Buscador de texto */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por SKU (máx. 4 caracteres)..."
                  value={skuFilter}
                  onChange={(e) => setSkuFilter(e.target.value.slice(0, 4).toUpperCase())}
                  maxLength={4}
                  className="pl-9 pr-9 uppercase"
                />
                {skuFilter && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSkuFilter("")}
                    className="absolute right-1 top-1 h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {skuFilter && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Filtrando por: {skuFilter}*
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSkuFilter("")}
                  className="h-6 text-xs"
                >
                  Limpiar filtro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {stats.loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total en Shopify
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalShopify}</div>
                <p className="text-xs text-muted-foreground">
                  Productos en la tienda
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sincronizados
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {stats.synced}
                </div>
                <p className="text-xs text-muted-foreground">
                  Con datos de bulto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Desincronizados
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {stats.unsynced}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sin datos de bulto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  % Sincronización
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {syncPercentage.toFixed(1)}%
                </div>
                <Progress value={syncPercentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Productos</CardTitle>
              <CardDescription>
                Visualización de productos sincronizados vs desincronizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.totalShopify > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No hay productos para mostrar
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Sincronización</CardTitle>
              <CardDescription>
                Información detallada sobre el estado actual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado General</span>
                <Badge variant={syncPercentage === 100 ? "default" : "destructive"}>
                  {syncPercentage === 100 ? "Completo" : "Incompleto"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Productos en Shopify:</span>
                  <span className="font-medium">{stats.totalShopify}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Con datos en DB:</span>
                  <span className="font-medium text-green-500">{stats.synced}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sin datos en DB:</span>
                  <span className="font-medium text-destructive">{stats.unsynced}</span>
                </div>
              </div>

              {stats.unsynced > 0 && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-semibold mb-1">
                    ⚠️ Productos desincronizados detectados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hay {stats.unsynced} producto(s) en Shopify que no tienen datos
                    de bulto en la base de datos. Considera eliminarlos o importar
                    sus datos.
                  </p>
                </div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                <p>🔄 Actualización automática cada 30 segundos</p>
                <p>📊 Estadísticas en tiempo real mediante Supabase Realtime</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ProductStats;
