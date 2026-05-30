import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, ShoppingBag } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

const registerSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  confirmPassword: z.string(),
  full_name: z.string().trim().min(1, { message: "Nombre completo es obligatorio" }),
  provincia: z.string().min(1, { message: "Provincia es obligatoria" }),
  localidad: z.string().trim().min(1, { message: "Localidad es obligatoria" }),
  address: z.string().trim().min(1, { message: "Dirección es obligatoria" }),
  cuit_dni: z.string()
    .trim()
    .min(1, { message: "CUIT/DNI es obligatorio" })
    .refine((val) => {
      const cleanVal = val.replace(/[-\s]/g, '');
      return /^\d{7,8}$/.test(cleanVal) || /^\d{11}$/.test(cleanVal);
    }, { message: "Formato inválido. DNI: 7-8 dígitos, CUIT: 11 dígitos" }),
  telefono: z.string().trim().min(10, { message: "Teléfono inválido" }),
  transporte_preferido: z.string().min(1, { message: "Seleccione un transporte" }),
  valor_declarado: z.enum(['minimo', 'mitad', 'total'], { message: "Seleccione un valor" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    provincia: "",
    localidad: "",
    address: "",
    cuit_dni: "",
    telefono: "",
    transporte_preferido: "",
    valor_declarado: "",
  });

  // Check if user came from password reset email
  useEffect(() => {
    const isReset = searchParams.get('reset') === 'true';
    
    if (isReset) {
      // Check if user is authenticated (came from reset email)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setShowNewPasswordForm(true);
        }
      });
    }
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Contraseña actualizada correctamente");
      setShowNewPasswordForm(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Error al actualizar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = loginSchema.parse(loginData);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email o contraseña incorrectos");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("¡Bienvenido!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = registerSchema.parse(registerData);
      
      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.full_name,
            provincia: validated.provincia,
            localidad: validated.localidad,
            address: validated.address,
            cuit_dni: validated.cuit_dni,
            telefono: validated.telefono,
            transporte_preferido: validated.transporte_preferido,
            valor_declarado: validated.valor_declarado,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email ya está registrado");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("¡Cuenta creada! Ya puedes iniciar sesión");
      setRegisterData({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        provincia: "",
        localidad: "",
        address: "",
        cuit_dni: "",
        telefono: "",
        transporte_preferido: "",
        valor_declarado: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!resetEmail || !z.string().email().safeParse(resetEmail).success) {
        toast.error("Por favor ingresa un email válido");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success("Email enviado", {
        description: "Revisa tu correo para restablecer tu contraseña",
      });
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Error al enviar el email");
    } finally {
      setIsLoading(false);
    }
  };

  // Show new password form if user came from reset email
  if (showNewPasswordForm) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShoppingBag className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Nueva Contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="confirm-new-password">Confirmar Contraseña</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar Contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingBag className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Tienda Online</CardTitle>
          <CardDescription>
            Inicia sesión o crea tu cuenta para comenzar a comprar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {showResetPassword ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Recuperar Contraseña</h3>
                    <p className="text-sm text-muted-foreground">
                      Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isLoading}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowResetPassword(false);
                          setResetEmail("");
                        }}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Email
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm"
                      onClick={() => setShowResetPassword(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nombre Completo *</Label>
                    <Input
                      id="full_name"
                      value={registerData.full_name}
                      onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="cuit_dni">CUIT / DNI *</Label>
                    <Input
                      id="cuit_dni"
                      value={registerData.cuit_dni}
                      onChange={(e) => setRegisterData({ ...registerData, cuit_dni: e.target.value })}
                      disabled={isLoading}
                      placeholder="DNI: 12345678 o CUIT: 20-12345678-9"
                      maxLength={13}
                      required
                    />
                    {errors.cuit_dni && <p className="text-sm text-destructive mt-1">{errors.cuit_dni}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      DNI: 7-8 dígitos, CUIT: 11 dígitos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="provincia">Provincia *</Label>
                    <Input
                      id="provincia"
                      value={registerData.provincia}
                      onChange={(e) => setRegisterData({ ...registerData, provincia: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.provincia && <p className="text-sm text-destructive mt-1">{errors.provincia}</p>}
                  </div>

                  <div>
                    <Label htmlFor="localidad">Localidad *</Label>
                    <Input
                      id="localidad"
                      value={registerData.localidad}
                      onChange={(e) => setRegisterData({ ...registerData, localidad: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.localidad && <p className="text-sm text-destructive mt-1">{errors.localidad}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Dirección de Entrega *</Label>
                    <Input
                      id="address"
                      value={registerData.address}
                      onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                      disabled={isLoading}
                      placeholder="Calle, número, piso, depto"
                      maxLength={500}
                      required
                    />
                    {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
                  </div>

                  <div>
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={registerData.telefono}
                      onChange={(e) => setRegisterData({ ...registerData, telefono: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.telefono && <p className="text-sm text-destructive mt-1">{errors.telefono}</p>}
                  </div>

                  <div>
                    <Label htmlFor="transporte_preferido">Transporte Preferido *</Label>
                    <Input
                      id="transporte_preferido"
                      value={registerData.transporte_preferido}
                      onChange={(e) => setRegisterData({ ...registerData, transporte_preferido: e.target.value })}
                      disabled={isLoading}
                      placeholder="Ej: Andreani, OCA, Correo Argentino"
                      maxLength={100}
                      required
                    />
                    {errors.transporte_preferido && <p className="text-sm text-destructive mt-1">{errors.transporte_preferido}</p>}
                  </div>

                  <div>
                    <Label htmlFor="valor_declarado">Valor Declarado Habitual *</Label>
                    <Select
                      value={registerData.valor_declarado}
                      onValueChange={(value) => setRegisterData({ ...registerData, valor_declarado: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="valor_declarado">
                        <SelectValue placeholder="Seleccione valor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimo">Mínimo</SelectItem>
                        <SelectItem value="mitad">La Mitad</SelectItem>
                        <SelectItem value="total">Total</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.valor_declarado && <p className="text-sm text-destructive mt-1">{errors.valor_declarado}</p>}
                  </div>

                  <div>
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="register-password">Contraseña *</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate("/")}>
              Volver a la tienda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;