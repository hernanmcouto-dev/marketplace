import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, User, LogOut, Package, Menu, Settings, Users, Image, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "./CartDrawer";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export const Navbar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [skuSearch, setSkuSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/");
    }
  };

  const handleMobileNavigation = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleMobileSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 bg-primary shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary-foreground">
              PlanetaOnce
            </h1>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-3xl">
            <div className="relative">
              <Input
                type="search"
                placeholder="Buscar productos, marcas y más..."
                className="w-full bg-background pr-10 rounded-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full hover:bg-transparent"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/perfil">
                  <Button size="sm" variant="ghost" className="text-primary-foreground">
                    <User className="h-4 w-4 mr-1" />
                    Perfil
                  </Button>
                </Link>
                <Link to="/mis-ordenes">
                  <Button size="sm" variant="ghost" className="text-primary-foreground">
                    <Package className="h-4 w-4 mr-1" />
                    Órdenes
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={signOut}
                  className="text-primary-foreground hover:text-primary-foreground/80"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" variant="ghost" className="text-primary-foreground">
                  <User className="h-4 w-4 mr-1" />
                  Ingresar
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="md:hidden text-primary-foreground"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-background">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {user ? (
                  <>
                    <div className="px-2 py-2 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Conectado como:</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <Separator />

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/perfil")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Mi Perfil
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/mis-ordenes")}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mis Órdenes
                    </Button>

                    {isAdmin && (
                      <>
                        <Separator />
                        <div className="px-2 py-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Admin</p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/ordenes")}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Órdenes
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/vendedores")}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Vendedores
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/usuarios")}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Usuarios
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/proveedores")}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Proveedores
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/importar")}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Importar Productos
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/imagenes")}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          Gestión de Imágenes
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/estadisticas")}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Estadísticas
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleMobileNavigation("/admin/configuracion")}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configuración
                        </Button>
                      </>
                    )}

                    <Separator />

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/ofertas")}
                    >
                      Ofertas del día
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/ayuda")}
                    >
                      Ayuda
                    </Button>

                    <Separator />

                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={handleMobileSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleMobileNavigation("/auth")}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Iniciar Sesión
                    </Button>

                    <Separator />

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/ofertas")}
                    >
                      Ofertas del día
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMobileNavigation("/ayuda")}
                    >
                      Ayuda
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Cart */}
          <CartDrawer />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="bg-background border-t">
        <div className="container mx-auto px-4 py-2">
          <div className="flex gap-3 text-sm overflow-x-auto items-center">
            {isAdmin && (
              <div className="flex gap-2 items-center border-r pr-3">
                <Input
                  type="text"
                  placeholder="SKU"
                  value={skuSearch}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 4).toUpperCase();
                    setSkuSearch(value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && skuSearch) {
                      navigate(`/?q=${skuSearch}`);
                    }
                  }}
                  onBlur={() => {
                    if (skuSearch) {
                      navigate(`/?q=${skuSearch}`);
                    }
                  }}
                  maxLength={4}
                  className="h-7 w-20 px-2 text-xs uppercase z-50"
                />
              </div>
            )}
            <Link to="/ofertas" className="text-foreground hover:text-accent whitespace-nowrap">
              Ofertas del día
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin/ordenes" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Órdenes
                </Link>
                <Link to="/admin/vendedores" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Vendedores
                </Link>
                <Link to="/admin/usuarios" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Usuarios
                </Link>
                <Link to="/admin/proveedores" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Proveedores
                </Link>
                <Link to="/admin/importar" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Importar Productos
                </Link>
                <Link to="/admin/imagenes" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Gestión de Imágenes
                </Link>
                <Link to="/admin/estadisticas" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Estadísticas
                </Link>
                <Link to="/admin/configuracion" className="text-foreground hover:text-primary font-semibold bg-primary/10 px-3 py-1 rounded whitespace-nowrap">
                  Configuración
                </Link>
              </>
            )}
            <Link to="/ayuda" className="text-foreground hover:text-accent whitespace-nowrap">
              Ayuda
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
