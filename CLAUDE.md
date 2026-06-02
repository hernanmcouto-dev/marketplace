# Planeta Once - Marketplace Multi-Depósito

## 📋 Descripción General
Sistema completo de marketplace con panel administrativo para gestionar múltiples depósitos y una interfaz de tienda para clientes. El proyecto integra scraping automático, gestión de inventario, y un carrito de compras interactivo.

## 🛠️ Stack Tecnológico
- **Framework**: Next.js 16.2.6
- **Lenguaje**: TypeScript + React 19.2.4
- **Base de datos**: Supabase (PostgreSQL)
- **UI Components**: Radix UI (accesible)
- **Estilos**: TailwindCSS 4 + PostCSS
- **Formularios**: React Hook Form + Zod
- **Estado Global**: Zustand
- **Queries**: TanStack React Query v5
- **PDF Export**: jsPDF + jsPDF-Autotable
- **Web Scraping**: Puppeteer, Cheerio, Got
- **Storage**: AWS S3
- **Utilidades**: date-fns, axios, papaparse

## 📁 Estructura del Proyecto
```
src/
├── app/                      # Rutas principales (Next.js App Router)
│   ├── admin/               # 🔴 Panel Administrativo
│   │   └── page.tsx        # Dashboard con 4 depósitos
│   ├── cliente/             # 🛍️ Tienda de Clientes
│   │   └── page.tsx        # Catálogo y compra
│   ├── login/              # Autenticación
│   ├── shop/               # Rutas de tienda
│   ├── categorias/         # Gestión de categorías
│   ├── api/                # Rutas API
│   └── layout.tsx          # Layout global
├── components/             # Componentes reutilizables
│   ├── ui/                # Componentes Radix UI estilizados
│   ├── Navbar.tsx         # Barra de navegación
│   ├── ProductCard.tsx    # Tarjeta de producto
│   ├── CartDrawer.tsx     # Panel del carrito
│   └── ...
├── lib/                   # Lógica compartida
│   ├── supabase/         # Cliente y funciones Supabase
│   ├── utils.ts          # Utilidades generales
│   ├── product-categorizer.ts
│   └── ...
├── hooks/                # Hooks personalizados
│   ├── useAuth.tsx       # Autenticación
│   ├── useDbProducts.ts  # Productos de BD
│   └── ...
├── stores/              # Estado global (Zustand)
│   └── cartStore.ts    # Carrito de compras
├── types/              # TypeScript types
└── utils/              # Utilidades varias
```

## 🎨 Paleta de Colores
| Depósito | Color | Hex | RGB |
|----------|-------|-----|-----|
| Azul (Impotekno) | 🔵 | #3b82f6 | rgb(59, 130, 246) |
| Verde (Sanjulian) | 🟢 | #10b981 | rgb(16, 185, 129) |
| Rojo (NextCell) | 🔴 | #ef4444 | rgb(239, 68, 68) |
| Amarillo (Nodo) | 🟡 | #fbbf24 | rgb(251, 191, 36) |
| Fondo Oscuro | - | #0f172a | rgb(15, 23, 42) |
| Fondo Secundario | - | #1e293b | rgb(30, 41, 59) |
| Texto Principal | - | #ffffff | rgb(255, 255, 255) |

## 🌍 Rutas Principales

### Panel Admin (`/admin`)
- **URL**: `http://localhost:3000/admin`
- **Descripción**: Dashboard con acceso a 4 depósitos
- **Funcionalidades**:
  - 📋 Reportes de scraping
  - 🔵 Panel Azul (Impotekno)
  - 🟢 Panel Verde (Sanjulian)
  - 🔴 Panel Rojo (NextCell)
  - 🟡 Panel Amarillo (Nodo)

### Tienda Cliente (`/cliente`)
- **URL**: `http://localhost:3000/cliente`
- **Descripción**: Interfaz de compra para clientes
- **Funcionalidades**:
  - 🔍 Búsqueda de productos
  - 📂 Filtrado por categorías
  - 🛒 Carrito de compras
  - 💳 Checkout
  - 📊 Historial de compras

### Login (`/login`)
- **URL**: `http://localhost:3000/login`
- **Autenticación**: Supabase Auth

## 🚀 Características Principales

### 1. Gestión de Múltiples Depósitos
- 4 depósitos independientes con identidad visual única
- Cada depósito tiene su propio inventario
- Sincronización automática con sistemas de terceros

### 2. Scraping Automático
- Extracción de productos desde múltiples fuentes
- Categorización automática de productos
- Actualización periódica de precios
- Validación de datos

### 3. Tienda de Clientes
- Catálogo dinámico de productos
- Sistema de categorías
- Búsqueda avanzada
- Carrito persistente (Zustand)
- Checkout integrado

### 4. Panel Administrativo
- Dashboard con estadísticas
- Gestión de inventario
- Reportes de scraping
- Análisis de productos

### 5. Integración con Supabase
- Autenticación de usuarios
- Base de datos PostgreSQL
- Almacenamiento de imágenes (S3)
- Row Level Security (RLS)

## ⚙️ Setup e Instalación

### Requisitos Previos
- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- AWS S3 (opcional)

### Instalación
```bash
# Clonar el proyecto
git clone https://github.com/hernanmcouto-dev/marketplace.git
cd marketplace

# Instalar dependencias
npm install

# Crear archivo .env.local con tus credenciales
cp .env.example .env.local

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm build
npm start
```

### Variables de Entorno (`.env.local`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# AWS S3 (opcional)
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=tu_bucket

# API Keys
SHOPIFY_API_KEY=tu_shopify_key
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Desarrollo en hot-reload
npm run build        # Build para producción
npm start           # Inicia el servidor built
npm run lint        # Ejecuta ESLint
npm run type-check  # Verifica tipos TypeScript
```

## 🎯 Funcionalidades por Módulo

### Admin Dashboard
- ✅ Selector visual de depósitos (4 opciones)
- ✅ Links a paneles individuales
- ✅ Acceso a reportes
- ✅ Diseño responsivo

### Producto Card
- ✅ Imagen del producto
- ✅ Nombre y descripción
- ✅ Precio (con oferta)
- ✅ Stock disponible
- ✅ Botón agregar al carrito
- ✅ Proveedor

### Carrito de Compras
- ✅ Visualización de items
- ✅ Cantidad ajustable
- ✅ Cálculo de totales
- ✅ Persistencia con localStorage
- ✅ Eliminación de items

### Sistema de Búsqueda
- ✅ Búsqueda por texto
- ✅ Filtrado por categoría
- ✅ Filtrado por rango de precio
- ✅ Resultados en tiempo real

## 🔐 Seguridad

- ✅ Variables de entorno para secretos
- ✅ Row Level Security en Supabase
- ✅ Validación con Zod
- ✅ Autenticación segura con Supabase
- ✅ CORS configurado
- ✅ Sanitización de inputs

## 📊 Base de Datos (Supabase)

### Tablas Principales
- `products` - Catálogo de productos
- `categories` - Categorías de productos
- `suppliers` - Proveedores/Depósitos
- `orders` - Órdenes de compra
- `users` - Usuarios del sistema
- `cart_items` - Items temporales del carrito

## 🌐 Endpoints API

```
GET    /api/products           - Listar productos
POST   /api/products           - Crear producto
GET    /api/categories         - Listar categorías
GET    /api/suppliers          - Listar depósitos
POST   /api/orders             - Crear orden
GET    /api/orders/:id         - Obtener orden
```

## 📱 Responsive Design
- Mobile First
- Breakpoints de TailwindCSS
- Componentes adaptables
- Navbar colapsible

## 🔄 Integración Continua
- Build automático en Vercel
- Linting pre-commit
- Type checking
- Tests unitarios (configurable)

## 📝 Notas Importantes
- El proyecto usa Next.js App Router (no Pages Router)
- Supabase es la fuente única de verdad para datos
- Los colores de depósitos son hard-coded pero pueden parametrizarse
- El carrito se persiste en localStorage en el cliente
- Las imágenes de productos se almacenan en S3

## 🤝 Contribuir
1. Crear una rama (`git checkout -b feature/nombre`)
2. Commit cambios (`git commit -m 'Add feature'`)
3. Push a la rama (`git push origin feature/nombre`)
4. Abrir Pull Request

## 📄 Licencia
MIT

## 👨‍💻 Autor
Hernan Couto - hernanmcouto@gmail.com

---

**Última actualización**: 2026-06-02
