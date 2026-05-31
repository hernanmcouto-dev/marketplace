import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Filter, X } from "lucide-react";
import { ShopifyProduct } from "@/types/shopify";

interface ProductFiltersProps {
  products: ShopifyProduct[];
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
}

export const ProductFilters = ({ products, onFilterChange }: ProductFiltersProps) => {
  const [category, setCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [showFilters, setShowFilters] = useState(false);

  // Extraer categorías únicas de los productos
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.node.productType || p.node.vendor)
        .filter(Boolean)
    )
  ).sort();

  // Calcular rango de precios
  const prices = products.map((p) => 
    parseFloat(p.node.priceRange.minVariantPrice.amount)
  );
  const maxAvailablePrice = Math.max(...prices, 1000);

  useEffect(() => {
    setPriceRange([0, maxAvailablePrice]);
  }, [maxAvailablePrice]);

  useEffect(() => {
    onFilterChange({
      category,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      sortBy,
    });
  }, [category, priceRange, sortBy, onFilterChange]);

  const resetFilters = () => {
    setCategory("all");
    setPriceRange([0, maxAvailablePrice]);
    setSortBy("relevance");
  };

  const hasActiveFilters = category !== "all" || 
    priceRange[0] !== 0 || 
    priceRange[1] !== maxAvailablePrice || 
    sortBy !== "relevance";

  return (
    <div className="bg-card border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              Activos
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          {/* Categoría */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de precio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Precio: ${priceRange[0]} - ${priceRange[1]}
            </label>
            <Slider
              min={0}
              max={maxAvailablePrice}
              step={10}
              value={priceRange}
              onValueChange={setPriceRange}
              className="py-4"
            />
          </div>

          {/* Ordenar por */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ordenar por</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Relevancia" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="relevance">Relevancia</SelectItem>
                <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
                <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
                <SelectItem value="name-asc">Nombre: A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre: Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
