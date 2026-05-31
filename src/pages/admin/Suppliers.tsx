import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Supplier {
  id: string;
  name: string;
  code: string;
  discount_percentage: number;
  markup_percentage: number;
  sale_type: 'unitario' | 'bulto';
  minimum_purchase_amount: number | null;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isUpdatingVendors, setIsUpdatingVendors] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount_percentage: 0,
    markup_percentage: 0,
    sale_type: 'unitario' as 'unitario' | 'bulto',
    minimum_purchase_amount: null as number | null
  });

  const handleUpdateDCHVendors = async () => {
    setIsUpdatingVendors(true);
    try {
      toast.info("Actualizando vendors de productos DCH...");
      
      const { data, error } = await supabase.functions.invoke('update-dch-vendors');
      
      if (error) throw error;
      
      const results = data as {
        total: number;
        updated: number;
        alreadyCorrect: number;
        errors: string[];
      };
      
      toast.success(`Actualización completa: ${results.updated} productos actualizados, ${results.alreadyCorrect} ya estaban correctos`);
      
      if (results.errors.length > 0) {
        console.error('Errores durante actualización:', results.errors);
        toast.warning(`${results.errors.length} productos tuvieron errores. Ver consola para detalles.`);
      }
    } catch (error) {
      console.error('Error updating vendors:', error);
      toast.error("Error al actualizar vendors");
    } finally {
      setIsUpdatingVendors(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading suppliers:', error);
      toast.error("Error al cargar proveedores");
    } else {
      setSuppliers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error("Nombre y código son requeridos");
      return;
    }

    if (editingSupplier) {
      // Update
      const { error } = await supabase
        .from('suppliers')
        .update(formData)
        .eq('id', editingSupplier.id);
      
      if (error) {
        console.error('Error updating supplier:', error);
        toast.error("Error al actualizar proveedor");
      } else {
        toast.success("Proveedor actualizado");
        resetForm();
        loadSuppliers();
      }
    } else {
      // Create
      const { error } = await supabase
        .from('suppliers')
        .insert([formData]);
      
      if (error) {
        console.error('Error creating supplier:', error);
        toast.error("Error al crear proveedor");
      } else {
        toast.success("Proveedor creado");
        resetForm();
        loadSuppliers();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting supplier:', error);
      toast.error("Error al eliminar proveedor");
    } else {
      toast.success("Proveedor eliminado");
      loadSuppliers();
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      code: supplier.code,
      discount_percentage: supplier.discount_percentage,
      markup_percentage: supplier.markup_percentage,
      sale_type: supplier.sale_type,
      minimum_purchase_amount: supplier.minimum_purchase_amount
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      discount_percentage: 0,
      markup_percentage: 0,
      sale_type: 'unitario',
      minimum_purchase_amount: null
    });
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Proveedores</h1>
              <p className="text-muted-foreground">
                Administra los proveedores y sus configuraciones de precios
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateDCHVendors}
                disabled={isUpdatingVendors}
                variant="outline"
              >
                {isUpdatingVendors ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar Vendors DCH
                  </>
                )}
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Proveedor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre del Proveedor *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Distribuidora XYZ"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ej: XYZ"
                      maxLength={10}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se usará como prefijo en los SKUs de productos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sale_type">Tipo de Venta</Label>
                    <Select 
                      value={formData.sale_type} 
                      onValueChange={(value: 'unitario' | 'bulto') => 
                        setFormData({ ...formData, sale_type: value })
                      }
                    >
                      <SelectTrigger id="sale_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unitario">Unitario</SelectItem>
                        <SelectItem value="bulto">Por Bulto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="discount">Descuento (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        discount_percentage: parseFloat(e.target.value) || 0 
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Descuento sobre el precio de costo
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="markup">Markup (%)</Label>
                    <Input
                      id="markup"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.markup_percentage}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        markup_percentage: parseFloat(e.target.value) || 0 
                      })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Margen de ganancia sobre el precio con descuento
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="minimum_purchase">Mínimo de Compra ($)</Label>
                    <Input
                      id="minimum_purchase"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minimum_purchase_amount ?? ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        minimum_purchase_amount: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                      placeholder="Sin mínimo"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Dejar vacío para no requerir mínimo de compra
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Cálculo de Precio Final:</p>
                    <p className="text-xs text-muted-foreground">
                      Precio Costo → Aplicar Descuento ({formData.discount_percentage}%) 
                      → Aplicar Markup ({formData.markup_percentage}%) → Precio Venta
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ejemplo: $100 → ${(100 * (1 - formData.discount_percentage/100)).toFixed(2)} 
                      → ${(100 * (1 - formData.discount_percentage/100) * (1 + formData.markup_percentage/100)).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingSupplier ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="p-6">
            {suppliers.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No hay proveedores</p>
                <p className="text-muted-foreground mb-4">
                  Crea tu primer proveedor para empezar a importar productos
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead className="text-right">Markup</TableHead>
                    <TableHead className="text-right">Mín. Compra</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {supplier.code}
                        </code>
                      </TableCell>
                      <TableCell className="capitalize">{supplier.sale_type}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {supplier.discount_percentage}%
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {supplier.markup_percentage}%
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {supplier.minimum_purchase_amount 
                          ? `$${supplier.minimum_purchase_amount}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
