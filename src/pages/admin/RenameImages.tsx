import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileImage, Download, X } from "lucide-react";
import { toast } from "sonner";

interface ImageFile {
  file: File;
  originalName: string;
  newName: string;
}

export default function RenameImages() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pattern, setPattern] = useState("{supplierCode}-{name}");
  const [supplierCode, setSupplierCode] = useState("IBEK");
  const [startIndex, setStartIndex] = useState(1);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    
    if (imageFiles.length === 0) {
      toast.error("No se encontraron imágenes válidas");
      return;
    }

    const newImages: ImageFile[] = imageFiles.map((file, idx) => ({
      file,
      originalName: file.name,
      newName: generateNewName(file.name, idx)
    }));

    setImages(newImages);
    toast.success(`${imageFiles.length} imágenes cargadas`);
  };

  const generateNewName = (originalName: string, index: number): string => {
    const extension = originalName.substring(originalName.lastIndexOf("."));
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf("."));
    
    return pattern
      .replace("{supplierCode}", supplierCode)
      .replace("{name}", nameWithoutExt)
      .replace("{index}", String(startIndex + index).padStart(3, "0"))
      .replace("{originalName}", nameWithoutExt) + extension;
  };

  const applyPattern = () => {
    setImages(prev => prev.map((img, idx) => ({
      ...img,
      newName: generateNewName(img.originalName, idx)
    })));
    toast.success("Patrón aplicado a todas las imágenes");
  };

  const updateSingleName = (index: number, newName: string) => {
    setImages(prev => prev.map((img, idx) => 
      idx === index ? { ...img, newName } : img
    ));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const downloadRenamed = async () => {
    if (images.length === 0) {
      toast.error("No hay imágenes para descargar");
      return;
    }

    for (const img of images) {
      const url = URL.createObjectURL(img.file);
      const a = document.createElement("a");
      a.href = url;
      a.download = img.newName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast.success("Imágenes descargadas con nuevos nombres");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Renombrar Imágenes</h1>
        <p className="text-muted-foreground">Renombra masivamente imágenes antes de subirlas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Cargar Imágenes</CardTitle>
            <CardDescription>Selecciona las imágenes que deseas renombrar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Click para seleccionar imágenes
                  </p>
                </label>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileImage className="h-4 w-4" />
                <span>{images.length} imágenes cargadas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Definir Patrón</CardTitle>
            <CardDescription>Configura cómo se renombrarán las imágenes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código de Proveedor</label>
              <Input
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value.toUpperCase())}
                placeholder="Ej: IBEK"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Patrón de Renombrado</label>
              <Select value={pattern} onValueChange={setPattern}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="{supplierCode}-{name}">{supplierCode}-[nombre original]</SelectItem>
                  <SelectItem value="{supplierCode}-{index}">{supplierCode}-001</SelectItem>
                  <SelectItem value="{supplierCode}-PROD-{index}">{supplierCode}-PROD-001</SelectItem>
                  <SelectItem value="{name}-{supplierCode}">[nombre original]-{supplierCode}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Variables: {"{supplierCode}"}, {"{name}"}, {"{index}"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Índice Inicial</label>
              <Input
                type="number"
                value={startIndex}
                onChange={(e) => setStartIndex(parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>

            <Button onClick={applyPattern} className="w-full" disabled={images.length === 0}>
              Aplicar Patrón
            </Button>
          </CardContent>
        </Card>
      </div>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>3. Vista Previa</CardTitle>
                <CardDescription>Revisa y ajusta los nombres antes de descargar</CardDescription>
              </div>
              <Button onClick={downloadRenamed} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Descargar Renombradas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Nombre Original</TableHead>
                    <TableHead className="w-[40%]">Nuevo Nombre</TableHead>
                    <TableHead className="w-[10%]">Tamaño</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((img, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{img.originalName}</TableCell>
                      <TableCell>
                        <Input
                          value={img.newName}
                          onChange={(e) => updateSingleName(idx, e.target.value)}
                          className="font-mono text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(img.file.size / 1024).toFixed(1)} KB
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImage(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
