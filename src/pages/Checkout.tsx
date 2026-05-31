import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/stores/cartStore";
import { Loader2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255, "Máximo 255 caracteres"),
  phone: z.string().trim().min(1, "El teléfono es requerido").max(20, "Máximo 20 caracteres"),
  address: z.string().trim().min(1, "La dirección es requerida").max(500, "Máximo 500 caracteres"),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { sellerId } = useReferralCode();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash">("transfer");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user profile to prefill data
  const { data: userProfile } = useQuery({
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

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);

  // Prefill form with user profile data
  useEffect(() => {
    if (userProfile && user) {
      setFormData({
        name: userProfile.full_name || "",
        email: user.email || "",
        phone: userProfile.telefono || "",
        address: userProfile.address || "",
      });
    }
  }, [userProfile, user]);

  // Fetch minimum purchase amount (global)
  const { data: minPurchaseConfig } = useQuery({
    queryKey: ['minPurchaseAmount'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'minimum_purchase_amount')
        .maybeSingle();
      
      if (error) throw error;
      return data ? parseFloat(data.value) : 150;
    },
  });

  // Fetch suppliers with minimum purchase amounts
  const { data: suppliers } = useQuery({
    queryKey: ['suppliersWithMinimum'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('suppliers_public')
        .select('code, name, minimum_purchase_amount, color')
        .not('minimum_purchase_amount', 'is', null);
      
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const minimumAmount = minPurchaseConfig || 150;

  // Calculate totals per vendor (normalized to lowercase for comparison)
  const vendorTotals = items.reduce((acc, item) => {
    const vendor = (item.vendor || item.product.node.vendor || 'Sin proveedor').toLowerCase().trim();
    const itemTotal = parseFloat(item.price.amount) * item.quantity;
    acc[vendor] = (acc[vendor] || 0) + itemTotal;
    return acc;
  }, {} as Record<string, number>);

  // Check vendor minimums (compare case-insensitive)
  const vendorMinimumErrors = suppliers?.filter(supplier => {
    const codeKey = supplier.code.toLowerCase();
    const nameKey = supplier.name.toLowerCase();
    const vendorTotal = vendorTotals[codeKey] || vendorTotals[nameKey] || 0;
    return supplier.minimum_purchase_amount && vendorTotal > 0 && vendorTotal < supplier.minimum_purchase_amount;
  }).map(supplier => {
    const codeKey = supplier.code.toLowerCase();
    const nameKey = supplier.name.toLowerCase();
    const vendorTotal = vendorTotals[codeKey] || vendorTotals[nameKey] || 0;
    return {
      vendor: supplier.name,
      color: supplier.color,
      current: vendorTotal,
      minimum: supplier.minimum_purchase_amount!,
      missing: supplier.minimum_purchase_amount! - vendorTotal
    };
  }) || [];

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Debes iniciar sesión</h2>
          <p className="text-muted-foreground mb-4">Por favor inicia sesión para realizar tu compra</p>
          <Button onClick={() => navigate("/auth")}>Iniciar sesión</Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Tu carrito está vacío</h2>
          <Button onClick={() => navigate("/")}>Volver a la tienda</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate global minimum purchase amount
    if (totalAmount < minimumAmount) {
      toast.error(`Compra mínima requerida: $${minimumAmount.toFixed(2)} USD`, {
        description: `Tu carrito tiene $${totalAmount.toFixed(2)}. Agrega más productos.`
      });
      return;
    }

    // Validate vendor-specific minimums
    if (vendorMinimumErrors.length > 0) {
      const firstError = vendorMinimumErrors[0];
      const colorIndicator = firstError.color ? `productos marcados con color` : `productos de ${firstError.vendor}`;
      toast.error(`Mínimo no alcanzado`, {
        description: (
          <div className="flex items-center gap-2">
            {firstError.color && (
              <span 
                className="inline-block w-4 h-4 rounded-full border border-white/50"
                style={{ backgroundColor: firstError.color }}
              />
            )}
            <span>
              Necesitas ${firstError.minimum.toFixed(2)} en {colorIndicator}. Tienes ${firstError.current.toFixed(2)}. Faltan ${firstError.missing.toFixed(2)}.
            </span>
          </div>
        )
      });
      return;
    }

    // Validar formulario
    try {
      checkoutSchema.parse(formData);
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
        return;
      }
    }

    setIsLoading(true);

    try {
      // Generate a temporary order ID for organizing images
      const tempOrderId = crypto.randomUUID();

      // Process images: save to Supabase Storage
      const orderItemsWithImages = await Promise.all(
        items.map(async (item) => {
          let savedImageUrl = null;
          const originalImageUrl = item.product.node.images.edges[0]?.node.url;

          if (originalImageUrl) {
            try {
              // Call edge function to save image
              const { data: imageData, error: imageError } = await supabase.functions.invoke(
                'save-order-image',
                {
                  body: {
                    imageUrl: originalImageUrl,
                    orderId: tempOrderId,
                    productId: item.product.node.id.split('/').pop(),
                  },
                }
              );

              if (imageError) {
                console.error('Error saving image:', imageError);
              } else if (imageData?.publicUrl) {
                savedImageUrl = imageData.publicUrl;
              }
            } catch (err) {
              console.error('Error calling save-order-image function:', err);
            }
          }

          return {
            productId: item.product.node.id,
            productTitle: item.product.node.title,
            variantId: item.variantId,
            variantTitle: item.variantTitle,
            sku: item.variantSku?.split('/').pop() || item.variantId.split('/').pop(),
            vendor: item.vendor || item.product.node.vendor || 'Sin proveedor',
            price: item.price.amount,
            currency: item.price.currencyCode,
            quantity: item.quantity,
            image: savedImageUrl || originalImageUrl, // Use saved image or fallback to original
          };
        })
      );

      const { data, error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: formData.address,
          payment_method: paymentMethod,
          order_items: orderItemsWithImages,
          total_amount: totalAmount,
          status: 'pending',
          seller_id: sellerId,
        })
        .select()
        .single();

      if (error) throw error;

      clearCart();
      navigate(`/confirmacion/${data.id}`);
      toast.success("¡Pedido realizado con éxito!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Error al procesar tu pedido. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulario */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Datos de entrega</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? "border-red-500" : ""}
                  maxLength={100}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={errors.email ? "border-red-500" : ""}
                  maxLength={255}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={errors.phone ? "border-red-500" : ""}
                  maxLength={20}
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="address">Dirección de entrega</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={errors.address ? "border-red-500" : ""}
                  rows={3}
                  maxLength={500}
                />
                {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <Label className="mb-3 block">Método de pago</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: "transfer" | "cash") => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5" />
                      <span>Transferencia bancaria</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Banknote className="h-5 w-5" />
                      <span>Efectivo contra entrega</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-marketplace-blue hover:bg-marketplace-blue/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  `Confirmar Pedido - $${totalAmount.toFixed(2)}`
                )}
              </Button>
            </form>
          </Card>

          {/* Resumen del pedido */}
          <div>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Resumen del pedido</h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-4">
                    <div className="w-16 h-16 bg-secondary/20 rounded overflow-hidden flex-shrink-0">
                      {item.product.node.images.edges[0]?.node && (
                        <img
                          src={item.product.node.images.edges[0].node.url}
                          alt={item.product.node.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{item.product.node.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Cantidad: {item.quantity}
                      </p>
                      <p className="font-semibold">
                        ${(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                {totalAmount < minimumAmount && (
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
                    Falta ${(minimumAmount - totalAmount).toFixed(2)} para alcanzar el mínimo global de ${minimumAmount.toFixed(2)}
                  </div>
                )}
                {vendorMinimumErrors.map((error, idx) => (
                  <div key={idx} className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm">
                    <strong>{error.vendor}:</strong> Falta ${error.missing.toFixed(2)} para alcanzar mínimo de ${error.minimum.toFixed(2)}
                  </div>
                ))}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Compra mínima global</span>
                  <span>${minimumAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
