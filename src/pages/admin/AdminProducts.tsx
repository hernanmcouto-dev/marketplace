import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Search, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Supplier { id: string; name: string; code: string; color: string | null; }

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  supplier_code: string | null;
  supplier_id: string | null;
  unit_price: number;
  bulk_price: number | null;
  units_per_package: number | null;
  sale_type: string;
  image_url: string | null;
  stock: number | null;
  is_active: boolean;
  tags: string[] | null;
}

const emptyProduct: Partial<Product> = {
  name: "", description: "", sku: "", supplier_code: "", supplier_id: null,
  unit_price: 0, bulk_price: null, units_per_package: 1, sale_type: "unitario",
  image_url: "", stock: null, is_active: true, tags: [],
};

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name, code, color").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.supplier_code || "").toLowerCase().includes(search.toLowerCase());
      const matchSupplier = filterSupplier === "all" || p.supplier_id === filterSupplier;
      return matchSearch && matchSupplier;
    });
  }, [products, search, filterSupplier]);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );

  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const payload = {
        name: product.name!,
        description: product.description || null,
        sku: product.sku!,
        supplier_code: product.supplier_code || null,
        supplier_id: product.supplier_id || null,
        unit_price: Number(product.unit_price) || 0,
        bulk_price: product.bulk_price ? Number(product.bulk_price) : null,
        units_per_package: Number(product.units_per_package) || 1,
        sale_type: product.sale_type || "unitario",
        image_url: product.image_url || null,
        stock: product.stock !== null && product.stock !== undefined ? Number(product.stock) : null,
        is_active: product.is_active ?? true,
        tags: product.tags || [],
      };
      if (product.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Producto actualizado" : "Producto creado");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleImageUpload = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máximo 10 MB por imagen");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const supplierFolder = editing.supplier_id ? supplierMap[editing.supplier_id]?.code || "general" : "general";
      const path = `${supplierFolder}/products/${editing.sku || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setEditing({ ...editing, image_url: publicUrl });
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Productos</h1>
            <p className="text-muted-foreground">Gestiona tu catálogo</p>
          </div>
          <Button onClick={() => setEditing(emptyProduct)}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo producto
          </Button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, SKU o código..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-background rounded-lg border">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay productos. Cargá el primero con el botón "Nuevo producto".
                  </TableCell></TableRow>
                )}
                {filtered.map((p) => {
                  const supplier = p.supplier_id ? supplierMap[p.supplier_id] : null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>
                        {supplier && (
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: supplier.color || "#999" }} />
                            <span className="text-xs">{supplier.code}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>USD {Number(p.unit_price).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{p.sale_type}</Badge></TableCell>
                      <TableCell>
                        {p.is_active ? <Badge>Sí</Badge> : <Badge variant="secondary">No</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => { if (confirm("¿Eliminar este producto?")) deleteMutation.mutate(p.id); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Total: {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <Label>SKU *</Label>
                  <Input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Proveedor</Label>
                  <Select value={editing.supplier_id || "none"}
                    onValueChange={(v) => setEditing({ ...editing, supplier_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proveedor</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Código del proveedor</Label>
                  <Input value={editing.supplier_code || ""} onChange={(e) => setEditing({ ...editing, supplier_code: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Precio unitario (USD) *</Label>
                  <Input type="number" step="0.01" value={editing.unit_price ?? 0}
                    onChange={(e) => setEditing({ ...editing, unit_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Precio por bulto</Label>
                  <Input type="number" step="0.01" value={editing.bulk_price ?? ""}
                    onChange={(e) => setEditing({ ...editing, bulk_price: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div>
                  <Label>Unidades por bulto</Label>
                  <Input type="number" value={editing.units_per_package ?? 1}
                    onChange={(e) => setEditing({ ...editing, units_per_package: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de venta</Label>
                  <Select value={editing.sale_type || "unitario"}
                    onValueChange={(v) => setEditing({ ...editing, sale_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unitario">Unitario</SelectItem>
                      <SelectItem value="bulto">Por bulto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stock (vacío = sin control)</Label>
                  <Input type="number" value={editing.stock ?? ""}
                    onChange={(e) => setEditing({ ...editing, stock: e.target.value ? parseInt(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <Label>Imagen del producto</Label>
                {editing.image_url ? (
                  <div className="relative inline-block mt-1">
                    <img src={editing.image_url} alt="" className="w-40 h-40 object-cover rounded-lg border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                      onClick={() => setEditing({ ...editing, image_url: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/50"
                    } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Subiendo...</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ImageIcon className="w-6 h-6" />
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium">Arrastrá una imagen acá o hacé click para elegir</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · máx. 10 MB</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <Label htmlFor="active">Activo (visible en la tienda)</Label>
                <Switch id="active" checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)}
              disabled={saveMutation.isPending || !editing?.name || !editing?.sku}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
