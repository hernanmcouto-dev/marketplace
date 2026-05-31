import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle2, DollarSign, Trash2, AlertTriangle, Pause, Play, Square, Link, Eye, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from "@/integrations/supabase/client";

interface ProductRow {
  nombre: string;
  codigo?: string;
  precio: number;
  cantidad_bulto?: number;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  imagen_url?: string;
  rowIndex?: number;
}

interface ExtractedImage {
  originalName: string;
  publicUrl: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  discount_percentage: number;
  markup_percentage: number;
  sale_type: 'unitario' | 'bulto';
}

const ImportProducts = () => {
  const [file, setFile] = useState<File | null>(null);
  const pdfBufferRef = useRef<ArrayBuffer | null>(null); // PDF leído como buffer antes de que Lovable lo intercepte
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFixingPrices, setIsFixingPrices] = useState(false);
  const [priceChanges, setPriceChanges] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
  const [isReassociating, setIsReassociating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState(0);
  const [lastImportedIndex, setLastImportedIndex] = useState(0);
  const [skipAiImageGeneration, setSkipAiImageGeneration] = useState(true);
  const [maxProductsToImport, setMaxProductsToImport] = useState<number | undefined>(10);
  const [maxPdfPages, setMaxPdfPages] = useState<number>(1);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading suppliers:', error);
      toast.error("Error al cargar proveedores");
    } else {
      setSuppliers(data || []);
    }
  };

  const calculateSalePrice = (costPrice: number, supplierId: string): number => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return costPrice;

    const priceAfterDiscount = costPrice * (1 - supplier.discount_percentage / 100);
    const salePrice = priceAfterDiscount * (1 + supplier.markup_percentage / 100);
    
    return parseFloat(salePrice.toFixed(2));
  };

  const processFile = async () => {
    console.log('[IMPORT] processFile called', { 
      hasFile: !!file, 
      fileName: file?.name,
      supplierId: selectedSupplierId 
    });
    
    if (!file || !selectedSupplierId) {
      console.error('[IMPORT] Missing file or supplier');
      toast.error("Selecciona un proveedor y un archivo");
      return;
    }

    setIsProcessing(true);
    setProducts([]);
    setExtractedImages([]);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      console.log('[IMPORT] File extension:', fileExtension);
      
      if (fileExtension === 'csv') {
        console.log('[IMPORT] Processing CSV file...');
        await processCsvFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        console.log('[IMPORT] Processing Excel file...');
        await processExcelFile(file);
      } else if (fileExtension === 'pdf') {
        console.log('[IMPORT] Processing PDF file...');
        await processPdfFile(file);
      } else {
        console.error('[IMPORT] Unsupported file format:', fileExtension);
        toast.error("Formato de archivo no soportado. Solo se aceptan CSV, Excel y PDF.");
      }
    } catch (error) {
      console.error("[IMPORT] Error processing file:", error);
      toast.error("Error al procesar el archivo");
    } finally {
      setIsProcessing(false);
    }
  };

  const processCsvFile = async (file: File) => {
    console.log('[CSV] Starting CSV parse...');
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('[CSV] Parse complete, rows:', results.data.length);
          console.log('[CSV] First 3 rows:', results.data.slice(0, 3));
          try {
            const extractedProducts = parseProductData(results.data);
            console.log('[CSV] Extracted products:', extractedProducts.length);
            setProducts(extractedProducts);
            toast.success(`${extractedProducts.length} productos procesados del CSV`);
            resolve();
          } catch (error) {
            console.error('[CSV] Error parsing data:', error);
            reject(error);
          }
        },
        error: (error) => {
          console.error('[CSV] Papa parse error:', error);
          reject(error);
        }
      });
    });
  };

  const processExcelFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    
    const extractedProducts = parseProductData(jsonData);
    setProducts(extractedProducts);
    toast.success(`${extractedProducts.length} productos procesados del Excel`);
  };

  const parseProductData = (data: any[]): ProductRow[] => {
    console.log('[PARSE] Parsing product data, total rows:', data.length);
    const products: ProductRow[] = [];
    let skipped = 0;
    
    data.forEach((row: any, index) => {
      // Check if row is valid (not nan or empty)
      const nombre = row.nombre || row.producto || row.name || row.Nombre || row.Producto || row.Title || row.title;
      const precioRaw = row.precio || row.price || row.Precio || row.Price || row['Variant Price'] || row['variant price'];
      
      // Skip if nombre or precio are missing, 'nan', or empty
      if (!nombre || !precioRaw || 
          nombre.toString().toLowerCase() === 'nan' || 
          precioRaw.toString().toLowerCase() === 'nan' ||
          nombre.toString().trim() === '') {
        skipped++;
        if (index < 3) console.log('[PARSE] Skipping row', index, '- invalid nombre or precio:', { nombre, precioRaw });
        return;
      }
      
      // Clean price: remove "US$", spaces, and extract first number (before discount like "-20%")
      let precio = 0;
      if (typeof precioRaw === 'string') {
        const cleanPrice = precioRaw.replace(/US\$/gi, '').replace(/\s/g, '').split('-')[0];
        precio = parseFloat(cleanPrice);
      } else {
        precio = parseFloat(precioRaw);
      }
      
      if (isNaN(precio)) {
        skipped++;
        if (index < 3) console.log('[PARSE] Skipping row', index, '- invalid precio:', precioRaw);
        return;
      }
      
      // Clean cantidad_bulto: handle formats like "1000<br/>50" or "1000/50"
      const cantidadBultoRaw = row.cantidad_bulto || row.bulto || row.cantidad || row.Cantidad_Bulto || row.Unidades_por_bulto || row['Unidades por bulto'];
      let cantidad_bulto: number | undefined = undefined;
      if (cantidadBultoRaw) {
        const cantidadStr = cantidadBultoRaw.toString().trim();
        if (cantidadStr && cantidadStr.toLowerCase() !== 'nan') {
          // Take first number from formats like "1000<br/>50"
          const firstNumber = cantidadStr.split(/[\s\/<>br]/)[0];
          cantidad_bulto = parseInt(firstNumber);
        }
      }
      
      const product = {
        nombre: String(nombre).trim(),
        codigo: row.codigo || row.code || row.sku || row.Codigo || row['Variant SKU'] || row.SKU,
        precio,
        cantidad_bulto,
        descripcion: row.descripcion || row.description || row.Descripcion || row['Body HTML'],
        categoria: row.categoria || row.category || row.Categoria || row.Type || row.type,
        marca: row.marca || row.vendor || row.brand || row.Marca || row.Vendor,
        imagen_url: row.imagen_url || row.image || row.imagen || row.Imagen_URL || row['Image Src'] || row['image src'],
        rowIndex: index
      };
      
      if (index < 3) console.log('[PARSE] Added product', index, ':', product);
      products.push(product);
    });
    
    console.log('[PARSE] Parsing complete - Valid:', products.length, 'Skipped:', skipped);
    return products;
  };

  const processPdfUrl = async () => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) { toast.error("Proveedor no encontrado"); return; }
    if (!pdfUrl.trim()) { toast.error("Pega una URL de PDF"); return; }

    setIsProcessing(true);
    setProducts([]);
    setExtractedImages([]);

    try {
      toast.info("Procesando PDF desde URL...");

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseKey = (supabase as any).supabaseKey as string;

      const response = await fetch(`${supabaseUrl}/functions/v1/process-product-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl: pdfUrl.trim(), supplierCode: supplier.code }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[PDF URL] Error:", response.status, errText);
        if (response.status === 402) {
          toast.error("Creditos de IA agotados.");
        } else {
          toast.error("Error al procesar el PDF.");
        }
        return;
      }

      const data = await response.json();
      if (!data?.success || !data?.products) {
        toast.error(data?.error || "No se pudieron extraer productos del PDF");
        return;
      }

      let extractedProducts = data.products.map((p: any) => ({
        nombre: p.nombre,
        codigo: p.codigo,
        precio: p.precio,
        cantidad_bulto: p.cantidad_bulto,
        descripcion: p.descripcion,
        rowIndex: p.rowIndex,
        imageRowIndex: p.imageRowIndex,
      }));

      if (maxProductsToImport && extractedProducts.length > maxProductsToImport) {
        toast.info(`Limitando a ${maxProductsToImport} productos de ${extractedProducts.length} total`);
        extractedProducts = extractedProducts.slice(0, maxProductsToImport);
      }

      setProducts(extractedProducts);
      toast.success(`${extractedProducts.length} productos extraidos del PDF`);
    } catch (error) {
      console.error("[PDF URL] Error:", error);
      toast.error("Error al procesar el PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processPdfFile = async (file: File) => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      toast.error("Proveedor no encontrado");
      return;
    }

    toast.info("Enviando PDF al servidor para procesar...");

    try {
      // El PDF se manda directamente a la edge function como FormData.
      // Esto evita por completo el interceptor de Pyodide de Lovable,
      // que se activa cuando el browser intenta leer/procesar el archivo.
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseKey = (supabase as any).supabaseKey as string;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplierCode", supplier.code);

      toast.info("Analizando con IA... esto puede tomar unos segundos");

      const response = await fetch(`${supabaseUrl}/functions/v1/process-product-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || supabaseKey}`,
          apikey: supabaseKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[PDF] Edge function error:', response.status, errText);
        if (response.status === 402) {
          toast.error("Créditos de IA agotados. Por favor, usa archivos CSV/Excel.");
        } else {
          toast.error("Error al procesar el PDF en el servidor.");
        }
        return;
      }

      const data = await response.json();

      if (!data?.success || !data?.products) {
        toast.error("No se pudieron extraer productos del PDF");
        return;
      }

      let extractedProducts = data.products.map((p: any) => ({
        nombre: p.nombre,
        codigo: p.codigo,
        precio: p.precio,
        cantidad_bulto: p.cantidad_bulto,
        descripcion: p.descripcion,
        rowIndex: p.rowIndex,
        imageRowIndex: p.imageRowIndex,
      }));

      if (maxProductsToImport && extractedProducts.length > maxProductsToImport) {
        toast.info(`Limitando a ${maxProductsToImport} productos de ${extractedProducts.length} total`);
        extractedProducts = extractedProducts.slice(0, maxProductsToImport);
      }

      setProducts(extractedProducts);
      toast.success(`${extractedProducts.length} productos extraídos del PDF`);

    } catch (error) {
      console.error('[PDF] Error:', error);
      toast.error("Error al procesar el PDF.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Detener propagación para evitar que Lovable intercepte el archivo con Pyodide
    e.stopPropagation();

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'xlsx', 'xls', 'pdf'].includes(fileExtension || '')) {
      toast.error("Solo se aceptan archivos CSV, Excel y PDF (.csv, .xlsx, .xls, .pdf)");
      return;
    }

    // Para PDFs: leer el ArrayBuffer INMEDIATAMENTE antes de que cualquier sistema
    // externo (Lovable/Pyodide) pueda procesar el archivo. Lo guardamos en un ref
    // para que processPdfFile lo use en lugar de volver a leer el File object.
    if (fileExtension === 'pdf') {
      try {
        pdfBufferRef.current = await selectedFile.arrayBuffer();
        console.log('[PDF] ArrayBuffer leído preventivamente:', pdfBufferRef.current.byteLength, 'bytes');
      } catch (err) {
        console.error('[PDF] Error leyendo ArrayBuffer:', err);
        pdfBufferRef.current = null;
      }
    } else {
      pdfBufferRef.current = null;
    }

    setFile(selectedFile);
    setProducts([]);
    setExtractedImages([]);
  };

  const importToShopify = async () => {
    if (products.length === 0) {
      toast.error("No hay productos para importar");
      return;
    }

    if (!selectedSupplierId) {
      toast.error("Debes seleccionar un proveedor");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      toast.error("Proveedor no encontrado");
      return;
    }


    setIsImporting(true);
    setProgress(0);
    setImported(0);

    // PRIMERO: Eliminar productos del proveedor de Shopify
    toast.info(`Eliminando productos anteriores de ${supplier.name} de Shopify...`);
    try {
      const { data: deleteData, error: shopifyDeleteError } = await supabase.functions.invoke('delete-supplier-products', {
        body: {
          supplierCode: supplier.code,
          supplierName: supplier.name
        }
      });

      if (shopifyDeleteError) {
        console.error('Error deleting from Shopify:', shopifyDeleteError);
        toast.error("Error al limpiar productos de Shopify");
        setIsImporting(false);
        return;
      }

      if (deleteData?.deletedCount > 0) {
        toast.success(`${deleteData.deletedCount} productos eliminados de Shopify`);
      }
    } catch (error) {
      console.error('Error calling delete function:', error);
      toast.error("Error al limpiar productos de Shopify");
      setIsImporting(false);
      return;
    }

    // SEGUNDO: Limpiar tabla local supplier_products
    const { error: deleteError } = await supabase
      .from('supplier_products')
      .delete()
      .eq('supplier_id', selectedSupplierId);

    if (deleteError) {
      console.error('Error deleting old products:', deleteError);
      toast.error("Error al limpiar productos anteriores de la BD local");
      setIsImporting(false);
      return;
    }

    let successCount = 0;
    const newSupplierProducts: any[] = [];

    // Determinar desde dónde empezar y hasta dónde importar
    const startIndex = lastImportedIndex;
    let endIndex: number;
    
    // Si ya importamos los primeros 10 (prueba), importar todos los restantes
    if (startIndex > 0) {
      endIndex = products.length; // Importar TODOS los restantes
      toast.info(`Importando todos los productos restantes (${products.length - startIndex} productos)`, {
        description: "Esto puede tomar varios minutos"
      });
    } else {
      // Primera vez: solo importar los primeros 10 para prueba
      endIndex = maxProductsToImport ? Math.min(startIndex + maxProductsToImport, products.length) : products.length;
      if (maxProductsToImport && products.length > maxProductsToImport) {
        toast.info(`Importando ${maxProductsToImport} productos de prueba de ${products.length} total`);
      }
    }
    
    const productsToImport = products.slice(startIndex, endIndex);

    for (let i = 0; i < productsToImport.length; i++) {
      // Verificar si está pausado
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const product = productsToImport[i];
      
      // Precio unitario del CSV
      let costPrice = product.precio;
      let title = product.nombre;
      
      // Construir SKU base: si el código NO tiene el prefijo del proveedor, agregarlo
      let baseSKU = product.codigo || `${supplier.code}-${Date.now()}-${i}`;
      if (product.codigo && !product.codigo.startsWith(supplier.code)) {
        baseSKU = `${supplier.code}-${product.codigo}`;
      }
      
      let productSKU = baseSKU;

      // Si es venta por bulto, calcular el costo del bulto PRIMERO (precio unitario * cantidad)
      if (supplier.sale_type === 'bulto' && product.cantidad_bulto) {
        const bultoQuantity = product.cantidad_bulto;
        costPrice = costPrice * bultoQuantity; // Precio del bulto completo
        title = `${product.nombre} - Bulto x ${bultoQuantity}`;
        productSKU = `${baseSKU}-BULTO-${bultoQuantity}`;
      }
      
      // AHORA aplicar markup/descuento sobre el precio del bulto (o unitario)
      const salePrice = calculateSalePrice(costPrice, selectedSupplierId);

      let imageUrl = product.imagen_url;

      // Buscar imagen usando el SKU base (con prefijo de proveedor)
      if (!imageUrl && baseSKU) {
        let { data: savedImage } = await supabase
          .from('product_images')
          .select('public_url, id')
          .eq('sku', baseSKU)
          .eq('supplier_id', selectedSupplierId)
          .single();

        if (savedImage?.public_url) {
          imageUrl = savedImage.public_url;
          console.log(`Imagen encontrada con SKU ${baseSKU}`);
        }
      }

      // Solo generar con IA si no hay imagen embebida y no está desactivado
      if (!imageUrl && !skipAiImageGeneration) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-product-image", {
            body: { productName: product.nombre }
          });

          if (!error && data?.imageUrl) {
            imageUrl = data.imageUrl;
          }
        } catch (error) {
          console.error("Error generating image:", error);
        }
      }

      try {
        // Crear producto en Shopify con SKU usando edge function
        const { data: shopifyData, error: shopifyError } = await supabase.functions.invoke('create-shopify-product', {
          body: {
            title,
            body: product.descripcion || `${title} - Importado desde ${supplier.name}`,
            vendor: product.marca || supplier.name,
            product_type: product.categoria || 'General',
            tags: `proveedor:${supplier.name},codigo:${supplier.code}`,
            imageUrl,
            variants: [{
              price: salePrice.toFixed(2),
              sku: productSKU,
              inventory_management: null,
              inventory_quantity: 1
            }],
            options: [{
              name: "Title",
              values: ["Default Title"]
            }]
          }
        });

        if (shopifyError) {
          console.error(`Error importing ${product.nombre}:`, shopifyError);
        } else if (shopifyData?.product) {
          newSupplierProducts.push({
            supplier_id: selectedSupplierId,
            product_name: product.nombre,
            shopify_product_id: shopifyData.product.id.toString(),
            cost_price: costPrice,
            sale_price: salePrice,
            product_sku: productSKU,
            units_per_package: product.cantidad_bulto || 1
          });
          
          // Marcar imagen como subida a Shopify usando el SKU base
          if (imageUrl && baseSKU) {
            await supabase
              .from('product_images')
              .update({ 
                uploaded_to_shopify: true,
                shopify_product_id: shopifyData.product.id.toString()
              })
              .eq('sku', baseSKU)
              .eq('supplier_id', selectedSupplierId);
          }
          
          successCount++;
        }
      } catch (error) {
        console.error(`Error importing ${product.nombre}:`, error);
      }

      setImported(i + 1);
      setProgress(((i + 1) / productsToImport.length) * 100);
    }

    if (newSupplierProducts.length > 0) {
      const { error } = await supabase
        .from('supplier_products')
        .insert(newSupplierProducts);
      
      if (error) {
        console.error('Error saving supplier products:', error);
      }
    }

    // Actualizar el índice de la última importación
    const newLastIndex = startIndex + productsToImport.length;
    setLastImportedIndex(newLastIndex);

    setIsImporting(false);
    
    // Si completamos la importación total
    if (newLastIndex >= products.length) {
      toast.success(`¡Importación completa! ${successCount} productos importados de ${supplier.name}`);
      setLastImportedIndex(0); // Reset para la próxima vez
    } else if (startIndex === 0) {
      // Acabamos de importar los primeros 10 de prueba
      toast.success(`${successCount} productos de prueba importados`, {
        description: `Revisa los productos y confirma para importar los ${products.length - newLastIndex} productos restantes`
      });
    } else {
      // Importamos todos los restantes
      toast.success(`${successCount} productos importados de ${supplier.name}`);
      setLastImportedIndex(0); // Reset
    }
    
    // Mensaje informativo si quedan más productos
    if (newLastIndex < products.length) {
      const remaining = products.length - newLastIndex;
      toast.info(`Quedan ${remaining} productos por importar. Haz clic en "Continuar Importación" para seguir.`, {
        duration: 5000
      });
    } else {
      setLastImportedIndex(0); // Reset para próxima importación
    }
  };

  const handleDeleteAllProducts = async () => {
    setIsDeleting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-all-shopify-products');
      
      if (error) {
        console.error('Error deleting products:', error);
        toast.error("Error al eliminar productos");
      } else if (data) {
        toast.success(`${data.deletedCount} productos eliminados de Shopify`);
        if (data.errorCount > 0) {
          toast.warning(`${data.errorCount} productos no pudieron ser eliminados`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al eliminar productos");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSupplierProducts = async () => {
    if (!selectedSupplierId) {
      toast.error("Selecciona un proveedor primero");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      toast.error("Proveedor no encontrado");
      return;
    }

    setIsDeletingSupplier(true);
    toast.info(`Eliminando productos de ${supplier.name} de Shopify...`, {
      description: "Esto puede tomar varios minutos"
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-supplier-products', {
        body: {
          supplierCode: supplier.code,
          supplierName: supplier.name
        }
      });
      
      if (error) {
        console.error('Error deleting supplier products:', error);
        toast.error("Error al eliminar productos del proveedor de Shopify");
      } else if (data) {
        toast.success(`${data.deletedCount} productos de ${supplier.name} eliminados de Shopify`);
        if (data.errorCount > 0) {
          toast.warning(`${data.errorCount} productos no pudieron ser eliminados`);
        }
        
        // También limpiar de la base de datos local
        await supabase
          .from('supplier_products')
          .delete()
          .eq('supplier_id', selectedSupplierId);
          
        await supabase
          .from('product_images')
          .delete()
          .eq('supplier_id', selectedSupplierId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al eliminar productos del proveedor");
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  const syncShopifyToDb = async () => {
    if (!selectedSupplierId) {
      toast.error("Selecciona un proveedor primero");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      toast.error("Proveedor no encontrado");
      return;
    }

    setIsReassociating(true);
    toast.info("Sincronizando productos de Shopify a base de datos...");
    
    try {
      const { syncShopifyToDatabase } = await import('@/utils/shopifyOperations');
      const result = await syncShopifyToDatabase(supplier.code);
      
      if (result.success) {
        toast.success(result.message || "Productos sincronizados exitosamente");
      } else {
        console.error('Error sincronizando:', result.error);
        toast.error(result.error || "Error al sincronizar productos");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al sincronizar productos");
    } finally {
      setIsReassociating(false);
    }
  };

  const handleReassociateImages = async () => {
    if (!selectedSupplierId) {
      toast.error("Selecciona un proveedor primero");
      return;
    }

    setIsReassociating(true);
    toast.info("Re-asociando imágenes con productos...");
    
    try {
      const { reassociateProductImages } = await import('@/utils/shopifyOperations');
      const result = await reassociateProductImages(selectedSupplierId);
      
      if (result.success) {
        if (result.updated && result.updated > 0) {
          toast.success(`${result.updated} productos actualizados`, {
            description: result.skipped ? `${result.skipped} productos omitidos` : undefined
          });
        } else {
          toast.info("No había imágenes pendientes de asociar");
        }
      } else {
        console.error('Error re-asociando:', result.error);
        toast.error(result.error || "Error al re-asociar imágenes");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al re-asociar imágenes");
    } finally {
      setIsReassociating(false);
    }
  };

  const fixBulkPricing = async (applyChanges = false) => {
    if (!selectedSupplierId) {
      toast.error("Selecciona un proveedor primero");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    setIsFixingPrices(true);
    
    try {
      if (!applyChanges) {
        // Preview mode
        toast.info("Cargando previsualización...");
        
        const { previewBulkPricingChanges } = await import('@/utils/bulkPricingFixer');
        const changes = await previewBulkPricingChanges(supplier.code);
        
        setPriceChanges(changes);
        toast.success(`${changes.length} productos listos para actualizar`, {
          description: "Revisa los cambios y confirma"
        });
      } else {
        // Apply changes
        toast.info("Aplicando cambios de precios...", {
          description: "Esto puede tomar varios minutos"
        });

        const { applyBulkPricingChanges } = await import('@/utils/bulkPricingFixer');
        const { updated, failed } = await applyBulkPricingChanges(
          priceChanges, 
          selectedSupplierId,
          (current, total) => {
            console.log(`Progreso: ${current}/${total}`);
          }
        );
        
        toast.success(`${updated} productos actualizados`, {
          description: failed > 0 ? `${failed} productos fallaron` : undefined
        });
        setPriceChanges([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al corregir precios de bulto");
    } finally {
      setIsFixingPrices(false);
    }
  };

  const getProductImageStatus = (product: ProductRow, index: number) => {
    if (product.imagen_url) {
      return (
        <Badge variant="outline" className="bg-green-500/10">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          URL
        </Badge>
      );
    } else if (extractedImages[product.rowIndex || index]) {
      return (
        <Badge variant="outline" className="bg-blue-500/10">
          <ImageIcon className="h-3 w-3 mr-1" />
          Extraída
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-purple-500/10">
          <ImageIcon className="h-3 w-3 mr-1" />
          Generará IA
        </Badge>
      );
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Importar Productos por Proveedor</h1>
              <p className="text-muted-foreground">
                Selecciona un proveedor y sube su catálogo en formato CSV o Excel. Los precios se calcularán automáticamente.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fixBulkPricing(false)}
                disabled={isFixingPrices || !selectedSupplierId}
              >
                {isFixingPrices ? (
                  <>
                    <DollarSign className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Previsualizar Cambios
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncShopifyToDb}
                disabled={isReassociating || !selectedSupplierId}
              >
                {isReassociating ? (
                  <>
                    <Link className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Sincronizar con Shopify
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isDeletingSupplier || !selectedSupplierId}
                  >
                    {isDeletingSupplier ? (
                      <>
                        <DollarSign className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpiar Proveedor
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <AlertDialogTitle>¿Eliminar productos del proveedor?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                      Esta acción eliminará todos los productos del proveedor <strong>{selectedSupplier?.name}</strong> de Shopify. 
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSupplierProducts}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar productos del proveedor
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    {isDeleting ? (
                      <>
                        <DollarSign className="mr-2 h-4 w-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpiar Todo Shopify
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <AlertDialogTitle>¿Eliminar todos los productos?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                      Esta acción eliminará TODOS los productos de Shopify. No se puede deshacer.
                      Los registros de la base de datos local no se verán afectados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAllProducts} 
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Sí, eliminar todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Formato esperado */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Formato del archivo
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Tu archivo debe tener estas columnas:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li><strong>nombre</strong> o <strong>producto</strong>: Nombre del producto (requerido)</li>
                <li><strong>precio</strong> o <strong>price</strong>: <span className="text-orange-600 font-semibold">Precio UNITARIO de costo</span> (requerido)</li>
                <li><strong>cantidad_bulto</strong> o <strong>bulto</strong>: Cantidad de unidades por bulto (solo para proveedores de bulto)</li>
                <li><strong>descripcion</strong> o <strong>description</strong>: Descripción (opcional)</li>
                <li><strong>categoria</strong> o <strong>category</strong>: Categoría (opcional)</li>
                <li><strong>marca</strong> o <strong>vendor</strong>: Marca/Vendedor (opcional)</li>
                <li><strong>imagen_url</strong> o <strong>image</strong>: URL de la imagen (opcional)</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Formatos soportados: <strong>.csv, .xlsx, .xls, .pdf</strong>
              </p>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  📄 Archivos PDF
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Los PDFs se procesan con IA para extraer tablas de productos automáticamente.
                  El PDF debe contener una tabla con columnas: CODIGO, DESCRIPCION, UNID./B (cantidad), PRECIO/U
                </p>
              </div>
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                  📦 Proveedores de Bulto
                </p>
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Si el proveedor vende por bulto, incluye la columna <strong>cantidad_bulto</strong>.
                  <br />Ejemplo: Cargador | precio: $10 | bulto: 100 → Se publicará "Cargador - Bulto x 100" a $1000
                </p>
              </div>
            </div>
          </Card>

          {/* Selección de proveedor */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Seleccionar Proveedor
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="supplier-select">Proveedor</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger id="supplier-select">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.sale_type === 'bulto' ? 'Venta por Bulto' : 'Venta Unitaria'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplier && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-medium">{selectedSupplier.code}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-medium text-green-600">{selectedSupplier.discount_percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Markup:</span>
                    <span className="font-medium text-blue-600">{selectedSupplier.markup_percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipo de venta:</span>
                    <span className="font-medium capitalize">{selectedSupplier.sale_type}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="max-products">Límite de productos (para pruebas)</Label>
                  <Input
                    id="max-products"
                    type="number"
                    min="1"
                    value={maxProductsToImport || ''}
                    onChange={(e) => setMaxProductsToImport(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deja vacío para importar todos. Útil para pruebas rápidas.
                  </p>
                </div>

                <div>
                  <Label htmlFor="max-pdf-pages">Páginas del PDF a procesar (solo PDFs)</Label>
                  <Input
                    id="max-pdf-pages"
                    type="number"
                    min="1"
                    value={maxPdfPages}
                    onChange={(e) => setMaxPdfPages(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Procesar solo las primeras páginas del PDF para pruebas más rápidas.
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    ⚠️ Al importar, se eliminarán los productos antiguos de este proveedor
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Subir archivo */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Subir archivo</h2>
            
            <div className="space-y-6">
              {/* CSV / Excel */}
              <div>
                <Label className="text-sm font-medium mb-2 block">CSV o Excel</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="text-base font-medium">
                          {file ? file.name : 'Seleccionar CSV o Excel'}
                        </p>
                        <p className="text-sm text-muted-foreground">.csv, .xlsx, .xls</p>
                      </div>
                    </div>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* PDF via URL publica - evita el interceptor de Pyodide de Lovable */}
              <div>
                <Label className="text-sm font-medium mb-2 block">PDF - pegar URL publica</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="https://drive.google.com/... o cualquier URL publica del PDF"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Subí el PDF a Google Drive (compartir con cualquiera) y pegá la URL acá.
                </p>
              </div>

              {(file || pdfUrl.trim()) && !isProcessing && products.length === 0 && (
                <Button
                  onClick={pdfUrl.trim() ? processPdfUrl : processFile}
                  className="w-full"
                  disabled={!selectedSupplierId}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Procesar {pdfUrl.trim() ? "PDF" : "Archivo"}
                </Button>
              )}

              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span>Procesando archivo...</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Vista previa de productos */}
          {products.length > 0 && (
            <Card className="p-6 mb-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">
                  Vista Previa de Productos
                </h2>
                <p className="text-muted-foreground">
                  Se detectaron <strong>{products.length} productos</strong>. Revisa los primeros para verificar que la información sea correcta.
                </p>
              </div>

              {/* Summary Stats */}
              {selectedSupplier && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">Total Productos</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{products.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 mb-1">Descuento</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{selectedSupplier.discount_percentage}%</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">Markup</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{selectedSupplier.markup_percentage}%</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-1">Tipo Venta</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100 capitalize">{selectedSupplier.sale_type}</p>
                  </div>
                </div>
              )}

              {/* Sample Products Table */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Primeros {Math.min(10, products.length)} productos
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Producto</th>
                          <th className="text-left p-3 font-medium">Código</th>
                          <th className="text-right p-3 font-medium">Precio Costo</th>
                          {selectedSupplier?.sale_type === 'bulto' && (
                            <th className="text-right p-3 font-medium">Cantidad Bulto</th>
                          )}
                          <th className="text-right p-3 font-medium">Precio Venta</th>
                          <th className="text-center p-3 font-medium">Imagen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {products.slice(0, 10).map((product, index) => {
                          const quantity = selectedSupplier?.sale_type === 'bulto' ? (product.cantidad_bulto || 1) : 1;
                          const salePrice = calculateSalePrice(product.precio * quantity, selectedSupplierId);
                          
                          return (
                            <tr key={index} className="hover:bg-muted/50">
                              <td className="p-3 text-muted-foreground">{index + 1}</td>
                              <td className="p-3 font-medium max-w-xs truncate" title={product.nombre}>
                                {product.nombre}
                              </td>
                              <td className="p-3">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {product.codigo || '-'}
                                </code>
                              </td>
                              <td className="p-3 text-right font-mono">${product.precio.toFixed(2)}</td>
                              {selectedSupplier?.sale_type === 'bulto' && (
                                <td className="p-3 text-right">
                                  <Badge variant="outline">{product.cantidad_bulto || 1}</Badge>
                                </td>
                              )}
                              <td className="p-3 text-right font-mono font-semibold text-green-600">
                                ${salePrice.toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                {getProductImageStatus(product, index)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {products.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-3 p-2 bg-muted/50 rounded">
                    + {products.length - 10} productos más que se importarán
                  </p>
                )}
              </div>

              {/* Price Changes Preview */}
              {priceChanges.length > 0 && (
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Previsualización de Cambios</h3>
                      <p className="text-sm text-muted-foreground">
                        {priceChanges.length} productos serán actualizados
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPriceChanges([])}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => fixBulkPricing(true)}
                        disabled={isFixingPrices}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Aplicar Cambios
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr className="text-left border-b">
                          <th className="p-3 font-medium">Producto</th>
                          <th className="p-3 font-medium">SKU</th>
                          <th className="text-right p-3 font-medium">Unidades/Bulto</th>
                          <th className="text-right p-3 font-medium">Precio Anterior</th>
                          <th className="text-right p-3 font-medium">Precio Nuevo</th>
                          <th className="text-right p-3 font-medium">Precio Unit.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {priceChanges.map((change, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="p-3">
                              <div className="max-w-xs">
                                <div className="font-medium truncate text-muted-foreground text-xs">
                                  {change.oldTitle}
                                </div>
                                {change.oldTitle !== change.newTitle && (
                                  <div className="font-medium truncate text-green-600">
                                    {change.newTitle}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {change.sku}
                              </code>
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="outline">{change.unitsPerPackage}</Badge>
                            </td>
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              ${change.oldPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-green-600">
                              ${change.newPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-sm text-blue-600">
                              ${change.unitPrice.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Import Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <input
                    id="skip-ai"
                    type="checkbox"
                    checked={skipAiImageGeneration}
                    onChange={(e) => setSkipAiImageGeneration(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="skip-ai" className="text-sm cursor-pointer flex-1">
                    Omitir generación de imágenes con IA (recomendado para importaciones grandes)
                  </Label>
                </div>

                {/* Warning */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    ⚠️ Advertencia
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Al confirmar la importación, se eliminarán todos los productos anteriores de <strong>{selectedSupplier?.name}</strong> y se reemplazarán con estos {products.length} nuevos productos.
                  </p>
                </div>

                {/* Import Buttons */}
                {lastImportedIndex < products.length && (
                  <Button 
                    onClick={importToShopify} 
                    disabled={isImporting || products.length === 0 || !selectedSupplierId}
                    className="w-full"
                    size="lg"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Importando {imported} de {lastImportedIndex > 0 ? products.length - lastImportedIndex : maxProductsToImport}...
                      </>
                    ) : lastImportedIndex > 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirmar e Importar TODOS los Restantes ({products.length - lastImportedIndex} productos)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Importar {maxProductsToImport} Productos de Prueba
                      </>
                    )}
                  </Button>
                )}
                
                {lastImportedIndex >= products.length && lastImportedIndex > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      ✅ Importación Completa
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Todos los {products.length} productos han sido importados exitosamente.
                    </p>
                  </div>
                )}
                
                {/* Controles de pausa/reanudación */}
                {isImporting && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => setIsPaused(!isPaused)}
                      variant="outline"
                      className="flex-1"
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Reanudar
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsImporting(false);
                        setIsPaused(false);
                        toast.info("Importación cancelada");
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Progreso de importación */}
          {isImporting && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isPaused ? "⏸️ Importación pausada" : "Importando productos..."}
              </h2>
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {imported} de {maxProductsToImport || products.length} productos importados ({Math.round(progress)}%)
                </p>
                {isPaused && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center font-medium">
                    La importación está pausada. Presiona "Reanudar" para continuar.
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Resultado de importación */}
          {!isImporting && imported > 0 && (
            <Card className="p-6 border-green-200 bg-green-50 dark:bg-green-950">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    ¡Importación completada!
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {imported} productos fueron importados exitosamente con sus imágenes y precios calculados
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProducts;
