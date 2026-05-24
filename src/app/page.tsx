"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Building2, 
  Layers, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Package,
  Plus,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  warehouse: Warehouse;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  createdAt: string;
  inventory: InventoryItem[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState<string | null>(null); // compound key like "productId-warehouseId"
  const [quantities, setQuantities] = useState<Record<string, number>>({}); // key like "productId-warehouseId"
  const router = useRouter();

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
      
      // Initialize quantities to 1
      const initialQuantities: Record<string, number> = {};
      data.forEach((product: Product) => {
        product.inventory.forEach((inv) => {
          initialQuantities[`${product.id}-${inv.warehouseId}`] = 1;
        });
      });
      setQuantities(initialQuantities);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load inventory products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleQuantityChange = (productId: string, warehouseId: string, val: number, max: number) => {
    const key = `${productId}-${warehouseId}`;
    const newQty = Math.max(1, Math.min(max, val));
    setQuantities(prev => ({ ...prev, [key]: newQty }));
  };

  const handleReserve = async (productId: string, warehouseId: string, available: number) => {
    const key = `${productId}-${warehouseId}`;
    const quantity = quantities[key] || 1;

    if (quantity > available) {
      toast.error("Requested quantity exceeds available stock!");
      return;
    }

    setReservingId(key);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Successfully reserved ${quantity} unit(s)!`);
        router.push(`/reservations/${data.id}`);
      } else {
        if (res.status === 409) {
          toast.error("Insufficient stock! The inventory was just updated. Please try a smaller quantity.", {
            duration: 5000
          });
          // Refresh data to show latest stock levels
          fetchProducts();
        } else {
          toast.error(data.error || "Failed to reserve inventory.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to connect to server.");
    } finally {
      setReservingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          Fetching live warehouse inventories...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Header Banner */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent">
                Allo Reserve
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium -mt-1 uppercase tracking-wider">
                Inventory Concurrency Control
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary py-1 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-ping" />
            Live Sync: Supabase
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-2 mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Product Catalog</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Select a product and specify the quantity to reserve. Temporary holds will expire after <strong>10 minutes</strong> if checkout is not completed. Concurrency-safe locking prevents overselling under heavy load.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-16 text-center max-w-md mx-auto mt-12 bg-card">
            <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-4" />
            <h3 className="text-base font-semibold mb-1">No products found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please seed your database tables to begin testing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col border border-border/80 hover:shadow-lg transition-all duration-300 group overflow-hidden bg-card/40 backdrop-blur-sm">
                <CardHeader className="pb-4 relative">
                  <div className="absolute top-4 right-4 bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1 text-xs font-semibold">
                    ${product.price.toFixed(2)}
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors pr-12 line-clamp-1">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground min-h-[32px] line-clamp-2 mt-1">
                    {product.description || "No description available."}
                  </CardDescription>
                  <div className="text-[10px] text-muted-foreground/80 font-mono tracking-tight mt-2">
                    SKU: {product.sku}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4 border-t border-border/20 pt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Warehouse Inventories
                  </div>

                  <div className="flex flex-col gap-3.5">
                    {product.inventory.map((inv) => {
                      const qtyKey = `${product.id}-${inv.warehouseId}`;
                      const isReserving = reservingId === qtyKey;
                      const selectedQty = quantities[qtyKey] || 1;
                      const isOutOfStock = inv.availableQuantity <= 0;

                      return (
                        <div 
                          key={inv.id} 
                          className="border border-border/50 rounded-lg p-3 flex flex-col gap-2.5 bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{inv.warehouse.name}</span>
                              <span className="text-[10px] text-muted-foreground">{inv.warehouse.location}</span>
                            </div>
                            
                            <div>
                              {isOutOfStock ? (
                                <Badge variant="destructive" className="text-[10px] uppercase font-bold px-1.5 py-0">
                                  Out of Stock
                                </Badge>
                              ) : inv.availableQuantity < 5 ? (
                                <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 px-1.5 py-0">
                                  Only {inv.availableQuantity} left
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1.5 py-0">
                                  {inv.availableQuantity} Available
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!isOutOfStock && (
                            <div className="flex items-center gap-2 mt-1">
                              {/* Quantity Selector */}
                              <div className="flex items-center border border-border/80 rounded-md bg-background">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, inv.warehouseId, selectedQty - 1, inv.availableQuantity)}
                                  disabled={selectedQty <= 1 || isReserving}
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-border/80"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-xs font-semibold">{selectedQty}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, inv.warehouseId, selectedQty + 1, inv.availableQuantity)}
                                  disabled={selectedQty >= inv.availableQuantity || isReserving}
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors border-l border-border/80"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs font-semibold shadow-sm"
                                disabled={isReserving}
                                onClick={() => handleReserve(product.id, inv.warehouseId, inv.availableQuantity)}
                              >
                                {isReserving ? (
                                  <>
                                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                    Reserving...
                                  </>
                                ) : (
                                  <>
                                    Reserve Hold
                                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/50 py-6 mt-16 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Allo Healthcare Assignment. Built using Next.js, Prisma, and Supabase PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
