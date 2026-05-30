import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Package } from "lucide-react";
import { exportConsolidatedPurchaseOrder } from "@/utils/pdfExport";
import { toast } from "sonner";

interface OrderItem {
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  sku?: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
  status: string;
}

interface ConsolidatedItem {
  sku: string;
  productTitle: string;
  totalQuantity: number;
  price: string;
  totalAmount: number;
  orderIds: string[];
}

interface ConsolidatedPurchasePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

const getSupplierPrefix = (sku?: string): string => {
  if (!sku) return 'SIN-SKU';
  const parts = sku.split('-');
  return parts[0] || 'SIN-SKU';
};

const consolidateOrders = (orders: Order[]) => {
  const consolidatedBySupplier: Record<string, Record<string, ConsolidatedItem>> = {};
  
  orders.forEach(order => {
    order.order_items.forEach(item => {
      const supplierPrefix = getSupplierPrefix(item.sku);
      const sku = item.sku || 'N/A';
      
      if (!consolidatedBySupplier[supplierPrefix]) {
        consolidatedBySupplier[supplierPrefix] = {};
      }
      
      if (!consolidatedBySupplier[supplierPrefix][sku]) {
        consolidatedBySupplier[supplierPrefix][sku] = {
          sku,
          productTitle: item.productTitle,
          totalQuantity: 0,
          price: item.price,
          totalAmount: 0,
          orderIds: []
        };
      }
      
      consolidatedBySupplier[supplierPrefix][sku].totalQuantity += item.quantity;
      consolidatedBySupplier[supplierPrefix][sku].totalAmount += parseFloat(item.price) * item.quantity;
      
      const orderId = order.id.substring(0, 8).toUpperCase();
      if (!consolidatedBySupplier[supplierPrefix][sku].orderIds.includes(orderId)) {
        consolidatedBySupplier[supplierPrefix][sku].orderIds.push(orderId);
      }
    });
  });
  
  return consolidatedBySupplier;
};

export function ConsolidatedPurchasePreview({ open, onOpenChange, orders }: ConsolidatedPurchasePreviewProps) {
  if (orders.length === 0) return null;

  const consolidatedData = consolidateOrders(orders);
  const allSuppliers = Object.keys(consolidatedData).sort();
  
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(allSuppliers);

  // Update selected suppliers when orders change
  useEffect(() => {
    setSelectedSuppliers(allSuppliers);
  }, [orders.length]);
  
  const toggleSupplier = (supplier: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplier) 
        ? prev.filter(s => s !== supplier)
        : [...prev, supplier]
    );
  };

  const toggleAll = () => {
    if (selectedSuppliers.length === allSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(allSuppliers);
    }
  };
  
  let grandTotal = 0;
  allSuppliers.forEach(supplier => {
    if (selectedSuppliers.includes(supplier)) {
      const items = Object.values(consolidatedData[supplier]);
      grandTotal += items.reduce((sum, item) => sum + item.totalAmount, 0);
    }
  });

  const handleExportPDF = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error('Debes seleccionar al menos un proveedor');
      return;
    }
    toast.info('Generando PDF con imágenes...');
    await exportConsolidatedPurchaseOrder(orders, selectedSuppliers);
    toast.success(`Orden de compra generada con ${selectedSuppliers.length} proveedor(es)`);
    onOpenChange(false);
  };

  // Calculate date range
  const dates = orders.map(o => new Date(o.created_at));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vista Previa - Orden de Compra Consolidada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proveedores</p>
                  <p className="text-2xl font-bold">{selectedSuppliers.length} / {allSuppliers.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-semibold">
                    {minDate.toLocaleDateString('es-AR')} - {maxDate.toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Seleccionado</p>
                  <p className="text-2xl font-bold text-primary">${grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Select/Deselect All */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              id="select-all"
              checked={selectedSuppliers.length === allSuppliers.length}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              {selectedSuppliers.length === allSuppliers.length 
                ? 'Deseleccionar todos los proveedores' 
                : 'Seleccionar todos los proveedores'}
            </label>
            <Badge variant="outline" className="ml-auto">
              {selectedSuppliers.length} seleccionado{selectedSuppliers.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Consolidated Items by Supplier */}
          <div className="space-y-4">
            {allSuppliers.map((supplierPrefix) => {
              const items = Object.values(consolidatedData[supplierPrefix]).sort((a, b) => 
                a.sku.localeCompare(b.sku)
              );
              const supplierTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
              const isSelected = selectedSuppliers.includes(supplierPrefix);

              return (
                <Card 
                  key={supplierPrefix} 
                  className={`border-l-4 transition-opacity ${
                    isSelected 
                      ? 'border-l-primary opacity-100' 
                      : 'border-l-muted opacity-50'
                  }`}
                >
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`supplier-${supplierPrefix}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSupplier(supplierPrefix)}
                        />
                        <label
                          htmlFor={`supplier-${supplierPrefix}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Package className="h-4 w-4" />
                          <span>PROVEEDOR: {supplierPrefix}</span>
                        </label>
                      </div>
                      <Badge variant="outline" className="text-base">
                        ${supplierTotal.toFixed(2)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 text-sm font-semibold">SKU</th>
                            <th className="text-left py-2 px-2 text-sm font-semibold">Producto</th>
                            <th className="text-center py-2 px-2 text-sm font-semibold">Cantidad</th>
                            <th className="text-right py-2 px-2 text-sm font-semibold">P. Unitario</th>
                            <th className="text-right py-2 px-2 text-sm font-semibold">Total</th>
                            <th className="text-left py-2 px-2 text-sm font-semibold">Pedidos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.sku} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-2 text-sm font-mono">{item.sku}</td>
                              <td className="py-2 px-2 text-sm">{item.productTitle}</td>
                              <td className="py-2 px-2 text-sm text-center font-bold">
                                {item.totalQuantity}
                              </td>
                              <td className="py-2 px-2 text-sm text-right">${item.price}</td>
                              <td className="py-2 px-2 text-sm text-right font-semibold text-primary">
                                ${item.totalAmount.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-xs text-muted-foreground">
                                {item.orderIds.join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/50">
                            <td colSpan={4} className="py-2 px-2 text-sm font-semibold text-right">
                              Subtotal {supplierPrefix}:
                            </td>
                            <td className="py-2 px-2 text-sm font-bold text-right text-primary">
                              ${supplierTotal.toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Grand Total */}
          <Card className={`border-primary ${selectedSuppliers.length === 0 ? 'opacity-50' : ''}`}>
            <CardContent className="pt-6 bg-primary/10">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL DE PROVEEDORES SELECCIONADOS:</span>
                <span className="text-3xl font-bold text-primary">${grandTotal.toFixed(2)}</span>
              </div>
              {selectedSuppliers.length < allSuppliers.length && (
                <p className="text-sm text-muted-foreground mt-2">
                  {allSuppliers.length - selectedSuppliers.length} proveedor(es) no seleccionado(s)
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExportPDF}
            disabled={selectedSuppliers.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Generar PDF ({selectedSuppliers.length} {selectedSuppliers.length === 1 ? 'proveedor' : 'proveedores'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}