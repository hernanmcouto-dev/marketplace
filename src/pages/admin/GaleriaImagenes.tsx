import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageOff } from "lucide-react";

interface ImageRow {
  id: string;
  sku: string;
  public_url: string;
  created_at: string | null;
  supplier_code?: string;
}

const GaleriaImagenes = () => {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("id, sku, public_url, created_at, suppliers(code)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching images:", error);
      } else {
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          sku: row.sku,
          public_url: row.public_url,
          created_at: row.created_at,
          supplier_code: row.suppliers?.code,
        }));
        setImages(mapped);
      }
      setLoading(false);
    };

    fetchImages();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter(
      (img) =>
        img.sku.toLowerCase().includes(q) ||
        (img.supplier_code || "").toLowerCase().includes(q)
    );
  }, [images, search]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Galería de Imágenes</h1>
        <p className="text-muted-foreground">
          {loading
            ? "Cargando..."
            : `${filtered.length} de ${images.length} imágenes`}
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <Input
          placeholder="Buscar por SKU o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ImageOff className="h-12 w-12 mb-2" />
          <p>No se encontraron imágenes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((img) => (
            <Card key={img.id} className="overflow-hidden group">
              <a
                href={img.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={img.public_url}
                    alt={img.sku}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-mono truncate" title={img.sku}>
                    {img.sku}
                  </p>
                  {img.supplier_code && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {img.supplier_code}
                    </Badge>
                  )}
                </div>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GaleriaImagenes;
