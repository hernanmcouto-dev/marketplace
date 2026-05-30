import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2 } from "lucide-react";

interface OrderItem {
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  image?: string;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItems: OrderItem[];
  onSave: (items: OrderItem[]) => void;
}

export function EditOrderDialog({ open, onOpenChange, orderItems, onSave }: EditOrderDialogProps) {
  const [items, setItems] = useState<OrderItem[]>(orderItems);

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const newQuantity = newItems[index].quantity + delta;
    if (newQuantity > 0) {
      newItems[index].quantity = newQuantity;
      setItems(newItems);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (items.length === 0) {
      return;
    }
    onSave(items);
    onOpenChange(false);
  };

  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.productTitle}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.productTitle}</p>
                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                  <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                )}
                <p className="text-sm font-semibold text-primary">${item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(index, -1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateQuantity(index, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="font-semibold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={items.length === 0}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}