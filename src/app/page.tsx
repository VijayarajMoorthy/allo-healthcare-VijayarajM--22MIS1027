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
  Minus,
  Sparkles,
  MapPin
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
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] gap-4 bg-gradient-to-br from-indigo-50/30 via-background to-violet-50/30 dark:from-indigo-950/20 dark:via-background dark:to-violet-950/20">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Loader2 className="h-8 w-8 animate-pulse text-indigo-500" />
        </div>
        <p className="text-indigo-600/80 dark:text-indigo-400 text-sm font-semibold animate-pulse tracking-wide mt-2">
          Syncing Live Inventories...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gradient-to-br from-indigo-50/40 via-background to-violet-50/40 dark:from-zinc-950 dark:via-indigo-950/10 dark:to-zinc-950">
      {/* Header Banner */}
      <header className="border-b border-indigo-100 dark:border-indigo-950/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 shadow-sm shadow-indigo-100/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Reservation System
              </h1>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-indigo-500/5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 py-1.5 px-3.5 shadow-sm font-semibold rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse inline-block" />
            Live Sync: Supabase DB
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Banner Card Header */}
        <div className="relative border border-indigo-100/80 dark:border-indigo-950/40 rounded-2xl p-6 md:p-8 mb-10 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="absolute -right-8 -top-8 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-wide">
                <Sparkles className="h-4.5 w-4.5" />
                <span>Modern Real-time Inventory System</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300 bg-clip-text text-transparent">
                Product Inventory Listing
              </h2>
              <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                Temorary holds expire automatically after <strong className="text-indigo-600 dark:text-indigo-400">10 minutes</strong> if checkout is not finalized. Concurrency-safe pessimistic locking blocks race conditions to guarantee absolute stock integrity.
              </p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="border border-dashed border-indigo-200 dark:border-indigo-950/60 rounded-2xl p-16 text-center max-w-md mx-auto mt-12 bg-card/60 backdrop-blur-sm shadow-md">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold mb-1 text-foreground">No Catalog Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please seed your database tables to populate mock products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col border border-indigo-100/80 dark:border-zinc-800/80 hover:border-indigo-400 hover:shadow-xl dark:hover:border-indigo-900 transition-all duration-300 group overflow-hidden bg-card/60 backdrop-blur-md shadow-sm">
                
                {/* Visual Accent Header Strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <CardHeader className="pb-4 relative">
                  {/* Glowing Price Tag */}
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold rounded-full px-3.5 py-1 text-sm shadow-md shadow-indigo-600/20">
                    ₹{product.price.toLocaleString("en-IN")}
                  </div>
                  
                  <CardTitle className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 pr-16 line-clamp-1">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground min-h-[32px] line-clamp-2 mt-1 leading-relaxed">
                    {product.description || "Premium high-quality inventory product."}
                  </CardDescription>
                  <div className="text-[10px] text-indigo-500/80 dark:text-indigo-400 font-mono font-bold tracking-wider mt-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10 w-fit">
                    SKU: {product.sku}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4 border-t border-indigo-100/30 dark:border-zinc-800/40 pt-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    Warehouse Inventories
                  </div>

                  <div className="flex flex-col gap-4">
                    {product.inventory.map((inv) => {
                      const qtyKey = `${product.id}-${inv.warehouseId}`;
                      const isReserving = reservingId === qtyKey;
                      const selectedQty = quantities[qtyKey] || 1;
                      const isOutOfStock = inv.availableQuantity <= 0;

                      return (
                        <div 
                          key={inv.id} 
                          className="border border-indigo-100/50 dark:border-zinc-800/60 rounded-xl p-3.5 flex flex-col gap-3 bg-indigo-50/15 dark:bg-zinc-900/30 hover:bg-indigo-50/30 dark:hover:bg-zinc-900/50 border-l-4 border-l-indigo-500 transition-all shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-extrabold text-foreground">{inv.warehouse.name}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-3 w-3 text-pink-500" />
                                {inv.warehouse.location}
                              </span>
                            </div>
                            
                            <div>
                              {isOutOfStock ? (
                                <Badge className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-rose-500 dark:bg-rose-600 text-white rounded-full">
                                  Out of Stock
                                </Badge>
                              ) : inv.availableQuantity < 5 ? (
                                <Badge className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full">
                                  Low Stock: {inv.availableQuantity}
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full">
                                  {inv.availableQuantity} Available
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!isOutOfStock && (
                            <div className="flex items-center gap-2.5 mt-0.5">
                              {/* Quantity Selector */}
                              <div className="flex items-center border border-indigo-200 dark:border-zinc-800 rounded-lg bg-background overflow-hidden shadow-inner">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, inv.warehouseId, selectedQty - 1, inv.availableQuantity)}
                                  disabled={selectedQty <= 1 || isReserving}
                                  className="h-8 w-8 flex items-center justify-center text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border-r border-indigo-100 dark:border-zinc-800"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-8 text-center text-xs font-extrabold">{selectedQty}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, inv.warehouseId, selectedQty + 1, inv.availableQuantity)}
                                  disabled={selectedQty >= inv.availableQuantity || isReserving}
                                  className="h-8 w-8 flex items-center justify-center text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border-l border-indigo-100 dark:border-zinc-800"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <Button
                                size="sm"
                                className="flex-1 h-8 text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-md shadow-indigo-600/10 border-0 transition-all duration-300"
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
                                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
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
      <footer className="border-t border-indigo-100/30 dark:border-zinc-900 bg-indigo-50/20 dark:bg-zinc-950/30 py-8 mt-20 text-center text-xs text-muted-foreground/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
          <p className="font-medium">© {new Date().getFullYear()} Reservation System. Optimized for high-throughput locking operations.</p>
          <p className="text-[10px] text-muted-foreground/60">Built using Next.js 16, Prisma v7 Client, & Supabase PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
