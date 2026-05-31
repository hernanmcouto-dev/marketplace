# 🟣 PRÓXIMAS TAREAS: Categorizar NextCell

**Fecha creado:** 2026-05-31  
**Estado:** PENDIENTE  
**Prioridad:** CRÍTICA (83% del marketplace)

---

## 📊 Situación Actual

```
🔴 Impotekno:    447 productos ✅ CATEGORIZADOS
🔵 San Julián:   486 productos ✅ CATEGORIZADOS
🟣 NextCell:   4,668 productos ❌ SIN CATEGORIZAR

TOTAL: 5,601 productos
NextCell = 83.3% del marketplace
```

---

## 🎯 TAREAS A EJECUTAR

### 1. **Categorizar todos los productos de NextCell**

```bash
# Opción A: Usar el endpoint que ya existe
curl -X POST http://localhost:3000/api/recategorize-full \
  -H "Content-Type: application/json" \
  -d '{"supplier":"nextcell"}'

# Esto usará categorizeProduct() del algoritmo v7
# con todos los 500+ keywords correctamente distribuidos
```

### 2. **Agregar NextCell al selector de proveedor**

**Archivos a editar:**

#### a) `src/app/shop/page.tsx` (línea ~50)
```typescript
// Cambiar de:
<select
  value={supplier}
  onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian")}
  ...
>
  <option value="impotekno">Impotekno</option>
  <option value="sanjulian">San Julián</option>
</select>

// A:
<select
  value={supplier}
  onChange={(e) => setSupplier(e.target.value as "impotekno" | "sanjulian" | "nextcell")}
  ...
>
  <option value="impotekno">Impotekno</option>
  <option value="sanjulian">San Julián</option>
  <option value="nextcell">NextCell</option>
</select>
```

#### b) `src/app/categorias/page.tsx` (si aún existe)
Aplicar el mismo cambio

#### c) `src/app/cliente/page.tsx` (si tiene selector)
Aplicar el mismo cambio

### 3. **Actualizar interfaz de carga de productos**

En `src/app/shop/page.tsx` función `loadProducts()`:
```typescript
const loadProducts = async () => {
  setLoading(true);
  try {
    // Cambiar de:
    const filename = supplier === "impotekno" ? "products.json" : "products-sanjulian.json";
    
    // A:
    const filename = 
      supplier === "impotekno" ? "products.json" : 
      supplier === "sanjulian" ? "products-sanjulian.json" :
      "products-nextcell.json";
    
    const response = await fetch(`/${filename}`);
    // ... resto del código
  }
}
```

### 4. **Verificar categorización**

Después de ejecutar el endpoint, validar:
```bash
# Contar total de productos categorizados
# Verificar que TODAS las 17 categorías tienen productos de NextCell
# Validar que no hay categorías vacías
```

---

## ✅ CHECKLIST DE TAREAS

- [ ] **PASO 1:** Categorizar 4,668 productos de NextCell
  - Ejecutar: `curl -X POST http://localhost:3000/api/recategorize-full -H "Content-Type: application/json" -d '{"supplier":"nextcell"}'`
  - Esperado: JSON con stats de todas las categorías

- [ ] **PASO 2:** Agregar NextCell al selector en `shop/page.tsx`
  - Archivo: `src/app/shop/page.tsx` línea ~50
  - Cambio: `"impotekno" | "sanjulian"` → `"impotekno" | "sanjulian" | "nextcell"`

- [ ] **PASO 3:** Actualizar logic de carga de archivos
  - Archivo: `src/app/shop/page.tsx` función `loadProducts()`
  - Agregar condición para "nextcell"

- [ ] **PASO 4:** Aplicar mismos cambios en otras páginas
  - `src/app/categorias/page.tsx` (si existe)
  - `src/app/cliente/page.tsx`
  - Admin panel si tiene selector

- [ ] **PASO 5:** Validar en navegador
  - Abrir `/shop`
  - Seleccionar "NextCell" en dropdown
  - Verificar que carga 4,668 productos
  - Probar filtros funcionan correctamente

- [ ] **PASO 6:** Verificar categorización
  - Revisar cada categoría tiene productos NextCell
  - Verificar conteos son realistas
  - Validar no hay categorías vacías

- [ ] **PASO 7:** Documentar resultados
  - Crear CHECKPOINT-nextcell-done.md
  - Actualizar este archivo con resultados

---

## 📋 ESTADÍSTICAS ESPERADAS

Después de categorizar NextCell, el marketplace tendrá:

```
Total de productos por proveedor:
- Impotekno:   447
- San Julián:  486  
- NextCell:  4,668
- TOTAL:     5,601

Distribución aproximada por categoría:
(Basada en los patrones de los otros 933 productos)
```

---

## 🔧 ENDPOINT A USAR

**URL:** `POST http://localhost:3000/api/recategorize-full`  
**Body:** `{"supplier":"nextcell"}`  
**Responsable:** Ya existe en `src/app/api/recategorize-full/route.ts`

El endpoint automáticamente:
1. Lee `public/products-nextcell.json`
2. Itera todos los 4,668 productos
3. Ejecuta `categorizeProduct(name)` para cada uno
4. Guarda los productos categorizados
5. Retorna estadísticas por categoría

---

## 📝 NOTAS IMPORTANTES

- **4,668 productos es MUCHO** - la categorización puede tardar 30-60 segundos
- NextCell es el 83% del marketplace - ES CRÍTICO categorizar esto bien
- El algoritmo v7 tiene todos los keywords necesarios
- No necesita entrenamiento adicional, está listo para usar
- Después de esto, el marketplace será COMPLETO

---

## 🚀 DESPUÉS DE COMPLETAR

1. Actualizar el checkpoint a "nextcell-done"
2. Documentar nuevas estadísticas totales
3. Validar toda la tienda funciona correctamente
4. Preparar para producción

---

**Creado por:** Claude Haiku 4.5  
**Para retomar en:** Próxima sesión de trabajo
