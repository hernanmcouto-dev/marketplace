import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image, Upload, Loader2, Search, FileArchive, Trash2, Link, Download, PackagePlus, ShieldCheck } from "lucide-react";

interface ProductImage {
  id: string;
  sku: string;
  storage_path: string;
  public_url: string;
  created_at: string;
  supplier_id: string;
}

const ProductImages = () => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);
  const [isLinkingImages, setIsLinkingImages] = useState(false);
  const [isTestingAccess, setIsTestingAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error("Error al cargar imágenes");
    } finally {
      setIsLoading(false);
    }
  };

  const linkImagesToProducts = async () => {
    setIsLinkingImages(true);

    try {
      toast.info("Iniciando vinculación de imágenes...");

      const { data, error } = await supabase.functions.invoke('reassociate-product-images', {
        body: { supplierCode: 'IBEK' }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Vinculación iniciada en segundo plano", {
          description: `Procesando ${data.totalImages} imágenes. Recarga la página en unos minutos para ver los resultados.`
        });
        
        // Recargar después de 10 segundos para mostrar progreso inicial
        setTimeout(() => {
          loadImages();
        }, 10000);
      } else {
        throw new Error('Error iniciando la vinculación');
      }
    } catch (error) {
      console.error('Error linking images:', error);
      toast.error("Error al iniciar vinculación", {
        description: "Verifica la consola para más detalles"
      });
    } finally {
      setIsLinkingImages(false);
    }
  };

  const testShopifyAccess = async () => {
    setIsTestingAccess(true);
    try {
      toast.info("Verificando acceso a Shopify...");

      const { data, error } = await supabase.functions.invoke('test-shopify-access');

      if (error) throw error;

      if (data.success) {
        toast.success(data.message, {
          description: `Token válido. Productos en catálogo: ${data.productCount}`
        });
      } else {
        toast.error(data.error, {
          description: data.suggestion || 'Revisa la configuración del token'
        });
        console.error('Detalles del error:', data);
      }
    } catch (error) {
      console.error('Error testing access:', error);
      toast.error("Error al verificar acceso a Shopify");
    } finally {
      setIsTestingAccess(false);
    }
  };

  const deleteProductsWithoutImages = async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los productos sin imagen directamente de Shopify? Esta acción NO se puede deshacer.')) {
      return;
    }

    setIsLinkingImages(true);
    try {
      toast.info("Buscando y eliminando productos sin imagen de Shopify...", {
        duration: 10000
      });

      const { data, error } = await supabase.functions.invoke('delete-shopify-products-without-images', {
        body: { supplierCode: 'IBEK' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`✓ ${data.deleted} productos eliminados de Shopify`, {
          description: `De ${data.totalFound} productos totales, ${data.withoutImages} sin imagen`
        });
        if (data.errors && data.errors.length > 0) {
          console.error('Errores durante eliminación:', data.errors);
          toast.warning(`${data.errors.length} productos tuvieron errores`);
        }
        loadImages();
      } else {
        throw new Error('Error eliminando productos');
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      toast.error("Error al eliminar productos sin imagen");
    } finally {
      setIsLinkingImages(false);
    }
  };

  const cleanDuplicateImages = async () => {
    setIsLinkingImages(true);
    try {
      toast.info("Limpiando imágenes duplicadas que ya están en Shopify...");

      // Obtener imágenes que ya tienen shopify_product_id o están marcadas como uploaded_to_shopify
      const { data: duplicates, error: fetchError } = await supabase
        .from('product_images')
        .select('id, sku, storage_path, shopify_product_id, uploaded_to_shopify')
        .or('shopify_product_id.not.is.null,uploaded_to_shopify.eq.true');

      if (fetchError) throw fetchError;

      if (!duplicates || duplicates.length === 0) {
        toast.info("No se encontraron imágenes duplicadas");
        return;
      }

      console.log(`Encontradas ${duplicates.length} imágenes duplicadas para eliminar`);

      // Eliminar archivos del storage
      const filesToDelete = duplicates.map(img => img.storage_path);
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove(filesToDelete);

      if (storageError) {
        console.error('Error eliminando archivos del storage:', storageError);
      }

      // Eliminar registros de la base de datos
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .or('shopify_product_id.not.is.null,uploaded_to_shopify.eq.true');

      if (deleteError) throw deleteError;

      toast.success(`✓ ${duplicates.length} imágenes duplicadas eliminadas`, {
        description: 'Las imágenes permanecen en Shopify'
      });
      
      await loadImages();
    } catch (error) {
      console.error('Error limpiando imágenes duplicadas:', error);
      toast.error("Error al limpiar imágenes duplicadas");
    } finally {
      setIsLinkingImages(false);
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) {
      toast.error("Selecciona al menos una imagen");
      return;
    }

    if (!confirm(`¿Eliminar ${selectedImages.size} imagen(es)? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const imagesToDelete = images.filter(img => selectedImages.has(img.id));
      
      // Primero eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .in('id', Array.from(selectedImages));

      if (dbError) throw dbError;

      // Luego eliminar archivos de storage
      const filesToDelete = imagesToDelete.map(img => img.storage_path);
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove(filesToDelete);

        if (storageError) {
          console.error('Error deleting storage files:', storageError);
        }
      }

      toast.success(`${selectedImages.size} imagen(es) eliminada(s)`);
      loadImages();
    } catch (error) {
      console.error('Error deleting images:', error);
      toast.error("Error al eliminar imágenes");
    }
  };

  const exportUnlinkedImagesToCSV = async () => {
    try {
      // Obtener imágenes sin shopify_product_id
      const { data: unlinkedImages, error } = await supabase
        .from('product_images')
        .select('sku, public_url, created_at')
        .is('shopify_product_id', null)
        .order('sku');

      if (error) throw error;

      if (!unlinkedImages || unlinkedImages.length === 0) {
        toast.info("No hay imágenes sin vincular");
        return;
      }

      // Crear CSV
      const headers = ['SKU Imagen', 'SKU Producto Sugerido', 'URL Imagen', 'Fecha Creación'];
      const rows = unlinkedImages.map(img => {
        // Normalizar el SKU para sugerir el producto
        let suggestedSku = img.sku;
        
        // Casos especiales
        if (img.sku.includes('MARKER') && !img.sku.includes(' ')) {
          suggestedSku = img.sku.replace(/MARKER(\d+)/, 'MARKER $1');
        } else if (img.sku.includes('SMART7-1')) {
          suggestedSku = img.sku.replace('SMART7-1', 'SMART7+1');
        }
        
        suggestedSku = `${suggestedSku}-BULTO-[cantidad]`;
        
        return [
          img.sku,
          suggestedSku,
          img.public_url,
          new Date(img.created_at).toLocaleDateString('es-AR')
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `productos_faltantes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${unlinkedImages.length} productos exportados a CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error("Error al exportar CSV");
    }
  };

  const createProductsFromList = async () => {
    const productList = [
      { handle: "ibek-556-3", title: "Veladores portátiles con diseño LABUBU", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-556-3", variant_price: 5.50, status: "active" },
      { handle: "ibek-b001", title: "Mouse con cable", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-B001", variant_price: 1.65, status: "active" },
      { handle: "ibek-blfs-01", title: "Soplador de pistola de aire inalámbrico", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-BLFS-01", variant_price: 11.50, status: "active" },
      { handle: "ibek-c66", title: "Soporte escritorio tablet 360°", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-C66", variant_price: 3.80, status: "active" },
      { handle: "ibek-cqb-003", title: "Air compresor mini power", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-CQB-003", variant_price: 12.00, status: "active" },
      { handle: "ibek-cs-0407", title: "Parlante Bluetooth con micrófono", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-CS-0407", variant_price: 17.00, status: "active" },
      { handle: "ibek-cs-4301", title: "Parlante Bluetooth 4\"", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-CS-4301", variant_price: 25.00, status: "active" },
      { handle: "ibek-cs-4411", title: "Parlante Bluetooth 4\"", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-CS-4411", variant_price: 25.00, status: "active" },
      { handle: "ibek-cz-6901", title: "Soporte para auto", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-CZ-6901", variant_price: 2.20, status: "active" },
      { handle: "ibek-d0920", title: "Cargador 5V 2A", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-D0920", variant_price: 1.30, status: "active" },
      { handle: "ibek-dx211", title: "Cargador portátil 10000mAh", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-DX211", variant_price: 9.00, status: "active" },
      { handle: "ibek-dy01", title: "Soporte universal con pistón a gas", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-DY01", variant_price: 21.00, status: "active" },
      { handle: "ibek-ear-5dai", title: "Auricular tipo AirPod ficha iPhone", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-EAR-5DAI", variant_price: 4.50, status: "active" },
      { handle: "ibek-ear-6dai", title: "Auricular tipo AirPod ficha C", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-EAR-6DAI", variant_price: 4.50, status: "active" },
      { handle: "ibek-exo2657", title: "Cable USB A Type-C 6A", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-EXO2657", variant_price: 0.25, status: "active" },
      { handle: "ibek-gts1348", title: "Parlante Bluetooth 3 pulgadas", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-GTS1348", variant_price: 4.00, status: "active" },
      { handle: "ibek-hz-5015u", title: "Zapatilla electrónica forma fútbol", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-HZ-5015U", variant_price: 5.50, status: "active" },
      { handle: "ibek-hz-bn24", title: "Zapatilla electrónica", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-HZ-BN24", variant_price: 3.50, status: "active" },
      { handle: "ibek-j06", title: "Zapatilla electrónica sandía", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-j06", variant_price: 4.00, status: "active" },
      { handle: "ibek-k-105", title: "Marcadores pintura acrílica 48 unidades", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-K-105", variant_price: 4.20, status: "active" },
      { handle: "ibek-kk-18", title: "Sombrero gorro con orejas", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-KK-18", variant_price: 4.50, status: "active" },
      { handle: "ibek-kts1057", title: "Parlante Bluetooth 3 pulgadas", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-KTS1057", variant_price: 4.50, status: "active" },
      { handle: "ibek-ls-c91", title: "Cerradura inteligente biométrica", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-LS-C91", variant_price: 75.00, status: "active" },
      { handle: "ibek-lt-910", title: "Luces de discoteca con bocina integrada", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-LT-910", variant_price: 4.80, status: "active" },
      { handle: "ibek-marker40", title: "Marcador 40 colores", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-MARKER40", variant_price: 5.20, status: "active" },
      { handle: "ibek-marker48", title: "Marcador 48 colores", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-MARKER48", variant_price: 5.60, status: "active" },
      { handle: "ibek-mq-101", title: "TV Box 8K con Magis", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-MQ-101", variant_price: 12.50, status: "active" },
      { handle: "ibek-mq-2", title: "TV Stick con Magic", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-MQ-2", variant_price: 14.00, status: "active" },
      { handle: "ibek-mxq-073", title: "TV Box 8K con Magis", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-MXQ-073", variant_price: 13.00, status: "active" },
      { handle: "ibek-n04", title: "Soporte escritorio tablet negro", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-N04", variant_price: 4.50, status: "active" },
      { handle: "ibek-rl-900", title: "Lámpara LED regulable 21x16cm", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-RL-900", variant_price: 12.00, status: "active" },
      { handle: "ibek-s61", title: "Cerradura inteligente biométrica", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-S61", variant_price: 160.00, status: "active" },
      { handle: "ibek-sg-006", title: "Soporte escritorio tablet 360°", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-SG-006", variant_price: 5.50, status: "active" },
      { handle: "ibek-sin-28", title: "Auriculares Bluetooth para gatitos", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-SIN-28", variant_price: 6.00, status: "active" },
      { handle: "ibek-smart7-1", title: "Smartwatch con 7 mallas", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-SMART7-1", variant_price: 11.00, status: "active" },
      { handle: "ibek-t-9201", title: "Soporte auto magnético", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-T-9201", variant_price: 2.50, status: "active" },
      { handle: "ibek-t-9203", title: "Soporte celular auto magnético", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-T-9203", variant_price: 2.50, status: "active" },
      { handle: "ibek-tg679", title: "Parlante Bluetooth", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-TG679", variant_price: 4.00, status: "active" },
      { handle: "ibek-tw333-4", title: "Zapatero multifuncional acero inoxidable", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-TW333-4", variant_price: 5.50, status: "active" },
      { handle: "ibek-tw5-80", title: "Mueble organizador zapatero compacto", vendor: "IBEK", type: "Accesorios", variant_sku: "IBEK-TW5-80", variant_price: 7.50, status: "active" },
      { handle: "ibek-w24-84-2", title: "Humidificador lámpara nube de lluvia", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-W24-84-2", variant_price: 8.50, status: "active" },
      { handle: "ibek-wr6070", title: "Contadora de billetes", vendor: "IBEK", type: "Electrónica", variant_sku: "IBEK-WR6070", variant_price: 800.00, status: "active" }
    ];

    setIsCreatingProducts(true);
    
    toast.info(`Iniciando creación de ${productList.length} productos...`, {
      duration: 5000
    });

    try {
      const { data, error } = await supabase.functions.invoke('create-products-from-list', {
        body: { products: productList }
      });

      if (error) throw error;

      if (data) {
        toast.success(`✅ ${data.created} productos creados exitosamente`);
        if (data.failed > 0) {
          toast.warning(`⚠️ ${data.failed} productos fallaron`, {
            description: data.errors.slice(0, 3).join('\n')
          });
        }
        
        // Recargar imágenes para ver los cambios
        loadImages();
      }
    } catch (error) {
      console.error('Error creating products:', error);
      toast.error("Error al crear productos");
    } finally {
      setIsCreatingProducts(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id)));
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error("Solo se permiten archivos ZIP");
      return;
    }

    setIsProcessingZip(true);
    const initialCount = images.length;
    
    toast.info(`Procesando ${file.name}... Esto puede tomar varios minutos.`, {
      duration: 10000
    });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          // Iniciar el procesamiento
          supabase.functions.invoke('upload-product-images-zip', {
            body: { zipFile: base64Data }
          }).catch(err => {
            console.log('Edge function timeout (expected):', err);
          });

          const pollInterval = setInterval(async () => {
            await loadImages();
            const newCount = images.length;
            const added = newCount - initialCount;
            
            if (added > 0) {
              console.log(`✅ ${added} imágenes procesadas hasta ahora...`);
            }
          }, 3000);

          setTimeout(() => {
            clearInterval(pollInterval);
            loadImages().then(() => {
              const finalCount = images.length;
              const totalAdded = finalCount - initialCount;
              
              console.log('==========================================');
              console.log(`✅ PROCESAMIENTO COMPLETO`);
              console.log(`📊 Total de imágenes subidas: ${totalAdded}`);
              console.log(`📁 Archivo: ${file.name}`);
              console.log('==========================================');
              
              if (totalAdded > 0) {
                toast.success(`✅ ${totalAdded} IMÁGENES SUBIDAS EXITOSAMENTE`, {
                  description: `Archivo: ${file.name}`,
                  duration: 15000,
                });
              } else {
                toast.warning("⚠️ PROCESAMIENTO COMPLETADO - 0 IMÁGENES NUEVAS", {
                  description: "Revisa los logs de consola para más detalles",
                  duration: 15000,
                });
              }
              
              setIsProcessingZip(false);
            });
          }, 120000);

        } catch (error) {
          console.error('Error processing ZIP:', error);
          toast.error("Error al procesar el archivo ZIP");
          setIsProcessingZip(false);
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      reader.onerror = () => {
        toast.error("Error al leer el archivo");
        setIsProcessingZip(false);
      };
    } catch (error) {
      console.error('Error uploading ZIP:', error);
      toast.error("Error al subir el archivo ZIP");
      setIsProcessingZip(false);
    }
  };

  const filteredImages = images.filter(img =>
    img.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Gestión de Imágenes de Productos</h1>
            <p className="text-muted-foreground">
              Sube imágenes de productos desde archivos ZIP. Las imágenes deben estar nombradas con el SKU.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Image className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{images.length}</p>
                  <p className="text-sm text-muted-foreground">Total Imágenes</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Trash2 className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{selectedImages.size}</p>
                  <p className="text-sm text-muted-foreground">Seleccionadas</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                onClick={testShopifyAccess}
                disabled={isTestingAccess}
                variant="outline"
                className="gap-2"
              >
                {isTestingAccess ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verificar Acceso
                  </>
                )}
              </Button>
              
              {images.length > 0 && (
                <Button
                  onClick={linkImagesToProducts}
                  disabled={isLinkingImages}
                  variant="default"
                  className="gap-2"
                >
                  {isLinkingImages ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Vincular a Productos
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={deleteProductsWithoutImages}
                disabled={isLinkingImages}
                variant="destructive"
                className="gap-2"
              >
                {isLinkingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar Sin Imagen
                  </>
                )}
              </Button>

              <Button
                onClick={cleanDuplicateImages}
                disabled={isLinkingImages}
                variant="outline"
                className="gap-2"
              >
                {isLinkingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Limpiando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Limpiar Duplicadas
                  </>
                )}
              </Button>


              <Button
                onClick={exportUnlinkedImagesToCSV}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Faltantes
              </Button>
              
              
              {filteredImages.length > 0 && (
                <>
                  <Button
                    onClick={selectAll}
                    variant="outline"
                    className="gap-2"
                  >
                    {selectedImages.size === filteredImages.length ? 'Deseleccionar' : 'Seleccionar Todo'}
                  </Button>
                  
                  <Button
                    onClick={deleteSelectedImages}
                    disabled={selectedImages.size === 0}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar ({selectedImages.size})
                  </Button>
                </>
              )}
            </div>

            <Card className="p-4 border-dashed">
              <div className="flex items-center gap-4">
                <FileArchive className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Subir ZIP con Imágenes</h3>
                  <p className="text-sm text-muted-foreground">
                    Las imágenes deben estar nombradas: CODIGO-SKU.jpg (ej: LAMBO-12345.jpg). El sistema detecta automáticamente el proveedor.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipUpload}
                  className="hidden"
                  disabled={isProcessingZip}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingZip}
                  variant="outline"
                  className="gap-2"
                >
                  {isProcessingZip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Seleccionar ZIP
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Images Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredImages.length === 0 ? (
            <Card className="p-12 text-center">
              <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay imágenes</h3>
              <p className="text-muted-foreground">
                Sube un archivo ZIP con imágenes para comenzar
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <Card 
                  key={img.id} 
                  className={`overflow-hidden cursor-pointer transition-all ${
                    selectedImages.has(img.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleImageSelection(img.id)}
                >
                  <div className="aspect-square bg-muted relative">
                    <img
                      src={img.public_url}
                      alt={img.sku}
                      className="w-full h-full object-contain"
                    />
                    {selectedImages.has(img.id) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Trash2 className="h-6 w-6" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-mono text-sm font-semibold mb-2">{img.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(img.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImages;
