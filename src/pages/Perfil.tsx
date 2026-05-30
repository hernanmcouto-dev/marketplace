import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Save, Lock } from "lucide-react";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre completo es requerido").max(100, "Máximo 100 caracteres"),
  provincia: z.string().trim().min(1, "La provincia es requerida").max(100, "Máximo 100 caracteres"),
  localidad: z.string().trim().min(1, "La localidad es requerida").max(100, "Máximo 100 caracteres"),
  address: z.string().trim().min(1, "La dirección es requerida").max(500, "Máximo 500 caracteres"),
  cuit_dni: z.string()
    .trim()
    .min(1, "CUIT/DNI es requerido")
    .refine((val) => {
      // Remove hyphens and spaces for validation
      const cleanVal = val.replace(/[-\s]/g, '');
      // CUIT: 11 digits, DNI: 7-8 digits
      return /^\d{7,8}$/.test(cleanVal) || /^\d{11}$/.test(cleanVal);
    }, "Formato inválido. DNI: 7-8 dígitos, CUIT: 11 dígitos"),
  telefono: z.string().trim().min(1, "El teléfono es requerido").max(20, "Máximo 20 caracteres"),
  transporte_preferido: z.string().min(1, "Debes seleccionar un transporte"),
  valor_declarado: z.string().min(1, "Debes seleccionar un valor declarado"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const Perfil = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    full_name: "",
    provincia: "",
    localidad: "",
    address: "",
    cuit_dni: "",
    telefono: "",
    transporte_preferido: "",
    valor_declarado: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        provincia: profile.provincia || "",
        localidad: profile.localidad || "",
        address: profile.address || "",
        cuit_dni: profile.cuit_dni || "",
        telefono: profile.telefono || "",
        transporte_preferido: profile.transporte_preferido || "",
        valor_declarado: profile.valor_declarado || "",
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Usuario no autenticado");
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          provincia: data.provincia,
          localidad: data.localidad,
          address: data.address,
          cuit_dni: data.cuit_dni,
          telefono: data.telefono,
          transporte_preferido: data.transporte_preferido,
          valor_declarado: data.valor_declarado,
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success("Perfil actualizado correctamente");
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setPasswordData({ newPassword: "", confirmPassword: "" });
      toast.success("Contraseña actualizada correctamente");
    },
    onError: (error: any) => {
      console.error("Error updating password:", error);
      toast.error(error.message || "Error al actualizar la contraseña");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      profileSchema.parse(formData);
      updateProfileMutation.mutate(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error("Por favor corrige los errores en el formulario");
      }
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    try {
      passwordSchema.parse(passwordData);
      updatePasswordMutation.mutate(passwordData.newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setPasswordErrors(newErrors);
        toast.error("Por favor corrige los errores");
      }
    }
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
          <p className="text-muted-foreground mb-4">Para ver tu perfil necesitas estar autenticado</p>
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
          <UserIcon className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
        </div>

        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El email no se puede modificar
              </p>
            </div>

            <div>
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={errors.full_name ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provincia">Provincia *</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  className={errors.provincia ? "border-destructive" : ""}
                  maxLength={100}
                />
                {errors.provincia && <p className="text-sm text-destructive mt-1">{errors.provincia}</p>}
              </div>

              <div>
                <Label htmlFor="localidad">Localidad *</Label>
                <Input
                  id="localidad"
                  value={formData.localidad}
                  onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  className={errors.localidad ? "border-destructive" : ""}
                  maxLength={100}
                />
                {errors.localidad && <p className="text-sm text-destructive mt-1">{errors.localidad}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección de entrega predeterminada *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={errors.address ? "border-destructive" : ""}
                placeholder="Calle, número, piso, depto"
                maxLength={500}
              />
              {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Esta dirección se usará por defecto en tus compras
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cuit_dni">CUIT / DNI *</Label>
                <Input
                  id="cuit_dni"
                  value={formData.cuit_dni}
                  onChange={(e) => setFormData({ ...formData, cuit_dni: e.target.value })}
                  className={errors.cuit_dni ? "border-destructive" : ""}
                  placeholder="DNI: 12345678 o CUIT: 20-12345678-9"
                  maxLength={13}
                />
                {errors.cuit_dni && <p className="text-sm text-destructive mt-1">{errors.cuit_dni}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  DNI: 7-8 dígitos, CUIT: 11 dígitos (XX-XXXXXXXX-X)
                </p>
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className={errors.telefono ? "border-destructive" : ""}
                  maxLength={20}
                />
                {errors.telefono && <p className="text-sm text-destructive mt-1">{errors.telefono}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="transporte_preferido">Transporte preferido *</Label>
              <Input
                id="transporte_preferido"
                value={formData.transporte_preferido}
                onChange={(e) => setFormData({ ...formData, transporte_preferido: e.target.value })}
                className={errors.transporte_preferido ? "border-destructive" : ""}
                placeholder="Ej: Andreani, OCA, Correo Argentino"
                maxLength={100}
              />
              {errors.transporte_preferido && <p className="text-sm text-destructive mt-1">{errors.transporte_preferido}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Indica tu empresa de transporte preferida
              </p>
            </div>

            <div>
              <Label htmlFor="valor_declarado">Valor declarado habitual *</Label>
              <Select 
                value={formData.valor_declarado} 
                onValueChange={(value) => setFormData({ ...formData, valor_declarado: value })}
              >
                <SelectTrigger className={errors.valor_declarado ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecciona un valor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimo">Mínimo</SelectItem>
                  <SelectItem value="mitad">La mitad</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
              {errors.valor_declarado && <p className="text-sm text-destructive mt-1">{errors.valor_declarado}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6 max-w-2xl mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Cambiar Contraseña</h2>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nueva contraseña *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className={passwordErrors.newPassword ? "border-destructive" : ""}
                placeholder="Mínimo 6 caracteres"
              />
              {passwordErrors.newPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className={passwordErrors.confirmPassword ? "border-destructive" : ""}
                placeholder="Repite la contraseña"
              />
              {passwordErrors.confirmPassword && <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={updatePasswordMutation.isPending}
            >
              {updatePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Cambiar contraseña
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Perfil;
