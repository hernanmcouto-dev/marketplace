"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  sku: string;
  name: string;
  unit_price: number;
  quantity: number;
  image_url?: string;
  units_per_package?: number;
  supplier?: string;
}

interface SupplierMinimum {
  name: string;
  minimum: number;
  current: number;
  met: boolean;
}

interface CartValidation {
  isValid: boolean;
  totalMet: boolean;
  suppliersMet: SupplierMinimum[];
  totalMinimum: number;
  totalCurrent: number;
  errors: string[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartItem, quantity: number) => void;
  removeFromCart: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  validateCart: () => CartValidation;
  getSupplierTotal: (supplier: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Cargar del localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    }
    setMounted(true);
  }, []);

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, mounted]);

  const addToCart = (product: CartItem, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.sku === product.sku);
      if (existing) {
        return prev.map((item) =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (sku: string) => {
    setItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const updateQuantity = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(sku);
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.sku === sku ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Minimums por depósito
  const minimums = {
    impotekno: 150000,
    sanjulian: 100000,
    nodo: 50000,
    nextcell: 150000,
  };

  const totalMinimum = 200000;

  // Función para obtener proveedor del SKU
  const getSupplierFromSku = (sku: string): string => {
    if (sku.startsWith("NDO-")) return "nodo";
    if (sku.startsWith("PAZ-") || sku.startsWith("PAS-")) return "sanjulian";
    if (sku.startsWith("IMP-")) return "impotekno";
    // Default: NextCell
    return "nextcell";
  };

  // Función para obtener total por proveedor
  const getSupplierTotal = (supplier: string): number => {
    return items
      .filter((item) => getSupplierFromSku(item.sku) === supplier)
      .reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  };

  // Función para validar el carrito
  const validateCart = (): CartValidation => {
    const errors: string[] = [];
    const suppliersMet: SupplierMinimum[] = [];
    let isValid = true;

    // Validar total mínimo
    const totalMet = total >= totalMinimum;
    if (!totalMet) {
      errors.push(`Compra mínima total: $${totalMinimum.toLocaleString("es-AR")} (tienes $${total.toLocaleString("es-AR")})`);
      isValid = false;
    }

    // Validar mínimo por proveedor
    Object.entries(minimums).forEach(([supplier, minimum]) => {
      const current = getSupplierTotal(supplier);
      const met = current === 0 || current >= minimum; // Si no hay productos, está ok

      suppliersMet.push({
        name: supplier,
        minimum,
        current,
        met,
      });

      if (current > 0 && !met) {
        const supplierName = {
          impotekno: "Depósito Azul",
          sanjulian: "Depósito Verde",
          nodo: "Depósito Amarillo",
          nextcell: "Depósito Rojo",
        }[supplier] || supplier;

        errors.push(
          `${supplierName}: $${minimum.toLocaleString("es-AR")} mínimo (tienes $${current.toLocaleString("es-AR")})`
        );
        isValid = false;
      }
    });

    return {
      isValid,
      totalMet,
      suppliersMet,
      totalMinimum,
      totalCurrent: total,
      errors,
    };
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        validateCart,
        getSupplierTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
