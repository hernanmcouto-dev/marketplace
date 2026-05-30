import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

const SiteConfig = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [minAmount, setMinAmount] = useState("");

  const { data: currentMinAmount, isLoading } = useQuery({
    queryKey: ['minPurchaseAmount'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'minimum_purchase_amount')
        .single();
      
      if (error) throw error;
      setMinAmount(data.value);
      return data.value;
    },
  });

  const updateMinAmountMutation = useMutation({
    mutationFn: async (newAmount: string) => {
      const { error } = await supabase
        .from('site_config')
        .update({ value: newAmount })
        .eq('key', 'minimum_purchase_amount');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minPurchaseAmount'] });
      toast.success("Monto mínimo actualizado correctamente");
    },
    onError: (error) => {
      console.error("Error updating minimum amount:", error);
      toast.error("Error al actualizar el monto mínimo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(minAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Por favor ingresa un monto válido");
      return;
    }

    updateMinAmountMutation.mutate(minAmount);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Acceso denegado</h2>
          <p className="text-muted-foreground mb-4">No tienes permisos para acceder a esta página</p>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Configuración del Sitio</h1>
        </div>

        <Card className="p-6 max-w-2xl">
          <h2 className="text-xl font-semibold mb-6">Monto Mínimo de Compra</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="minAmount">Monto mínimo (USD)</Label>
              <Input
                id="minAmount"
                type="number"
                step="0.01"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="150.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Los clientes deberán alcanzar este monto para poder finalizar su compra
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={updateMinAmountMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateMinAmountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Monto actual: ${currentMinAmount} USD</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SiteConfig;
