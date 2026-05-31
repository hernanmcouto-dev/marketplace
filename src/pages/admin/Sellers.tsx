import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Copy, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Seller {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
}

const Sellers = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
  });

  const { data: sellers, isLoading } = useQuery({
    queryKey: ['sellers-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Seller[];
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('sellers')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers-admin'] });
      toast.success("Vendedor creado exitosamente");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear vendedor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('sellers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers-admin'] });
      toast.success("Vendedor actualizado exitosamente");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar vendedor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sellers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers-admin'] });
      toast.success("Vendedor eliminado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar vendedor");
    },
  });

  const resetForm = () => {
    setFormData({ code: "", name: "", email: "", phone: "" });
    setEditingSeller(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeller) {
      updateMutation.mutate({ id: editingSeller.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({
      code: seller.code,
      name: seller.name,
      email: seller.email || "",
      phone: seller.phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este vendedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado al portapapeles");
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Vendedores</h1>
            <p className="text-muted-foreground">Administra los vendedores y sus códigos de referencia</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSeller ? "Editar Vendedor" : "Nuevo Vendedor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VEND01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendedor@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSeller ? "Actualizar" : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Cargando vendedores...</div>
            ) : sellers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay vendedores registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Link de Referencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers?.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.code}</TableCell>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell>{seller.email || "-"}</TableCell>
                      <TableCell>{seller.phone || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyReferralLink(seller.code)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(seller)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(seller.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sellers;