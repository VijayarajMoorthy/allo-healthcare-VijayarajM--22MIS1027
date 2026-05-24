"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Loader2, 
  Building2, 
  Receipt,
  ShoppingCart,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface Reservation {
  id: string;
  quantity: number;
  status: "pending" | "confirmed" | "released";
  expiresAt: string;
  createdAt: string;
  product: Product;
  warehouse: Warehouse;
}

export default function ReservationDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "release" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds

  const fetchReservation = async () => {
    try {
      const res = await fetch(`/api/reservations/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Reservation not found");
          router.push("/");
          return;
        }
        throw new Error("Failed to load reservation");
      }
      const data = await res.json();
      setReservation(data);

      if (data.status === "pending") {
        const expiry = new Date(data.expiresAt).getTime();
        const diff = Math.floor((expiry - Date.now()) / 1000);
        setTimeLeft(Math.max(0, diff));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load reservation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [params.id]);

  // Countdown timer effect
  useEffect(() => {
    if (!reservation || reservation.status !== "pending" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Lazy expiry check - reload from server to update status
          toast.warning("Hold period expired! Stock has been returned to warehouse inventory.");
          fetchReservation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation, timeLeft]);

  const handleConfirm = async () => {
    if (!reservation) return;
    setActionLoading("confirm");

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Purchase confirmed successfully!");
        setReservation(data);
      } else {
        if (res.status === 410) {
          toast.error("Checkout failed: Your reservation hold has expired!");
          fetchReservation();
        } else {
          toast.error(data.error || "Failed to confirm checkout.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to confirm checkout.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async () => {
    if (!reservation) return;
    setActionLoading("release");

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Stock hold released successfully.");
        // Redirect back to catalog
        router.push("/");
      } else {
        toast.error(data.error || "Failed to release reservation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Failed to release reservation.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] gap-4 bg-gradient-to-br from-indigo-50/30 via-background to-violet-50/30 dark:from-indigo-950/20 dark:via-background dark:to-violet-950/20">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Loader2 className="h-8 w-8 animate-pulse text-indigo-500" />
        </div>
        <p className="text-indigo-600/80 dark:text-indigo-400 text-sm font-semibold animate-pulse tracking-wide mt-2">
          Retrieving Reservation Hold...
        </p>
      </div>
    );
  }

  if (!reservation) return null;

  const orderTotal = reservation.product.price * reservation.quantity;
  const isUrgent = timeLeft < 120 && timeLeft > 0; // Less than 2 mins

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gradient-to-br from-indigo-50/40 via-background to-violet-50/40 dark:from-zinc-950 dark:via-indigo-950/10 dark:to-zinc-950">
      {/* Navigation Header */}
      <header className="border-b border-indigo-100 dark:border-indigo-950/50 bg-background/80 backdrop-blur sticky top-0 z-50 shadow-sm shadow-indigo-100/10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold" 
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4 text-indigo-500" />
            Back to Catalog
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4.5 w-4.5 text-indigo-500" />
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Page Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 flex flex-col items-center justify-center">
        
        {/* Urgent Expiry Banner */}
        {reservation.status === "pending" && isUrgent && (
          <div className="w-full mb-8 border border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400 rounded-xl p-4 flex items-center gap-3.5 shadow-sm animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <div className="text-xs font-bold leading-normal">
              Urgent Hold Expiry Alert! Your stock hold will expire in less than 2 minutes. Complete checkout to secure this items.
            </div>
          </div>
        )}

        <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left Column: Checkout Summary Card */}
          <div className="md:col-span-3 flex flex-col gap-6">
            <Card className="border border-indigo-100/80 dark:border-zinc-800/80 shadow-lg bg-card/65 backdrop-blur-md overflow-hidden">
              {/* Visual Gradient Accenting strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <CardHeader className="pb-4 border-b border-indigo-100/30 dark:border-zinc-800/40">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Checkout Summary</CardTitle>
                    <CardDescription className="text-xs mt-0.5 font-mono font-semibold text-indigo-500/80">
                      ID: {reservation.id}
                    </CardDescription>
                  </div>
                  <div>
                    {reservation.status === "pending" ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase font-bold text-[9px] px-2.5 py-0.5 rounded-full">
                        Pending Hold
                      </Badge>
                    ) : reservation.status === "confirmed" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase font-bold text-[9px] px-2.5 py-0.5 rounded-full">
                        Confirmed Sale
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30 uppercase font-bold text-[9px] px-2.5 py-0.5 rounded-full">
                        Released Hold
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5 flex flex-col gap-5">
                {/* Product Detail Info */}
                <div className="flex justify-between items-center bg-indigo-500/5 dark:bg-indigo-500/10 p-4 border border-indigo-100/40 dark:border-indigo-950/20 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-foreground">{reservation.product.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono font-semibold">SKU: {reservation.product.sku}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">₹{reservation.product.price.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Qty: {reservation.quantity}</span>
                  </div>
                </div>

                {/* Warehouse Location Info */}
                <div className="flex items-center gap-3 p-2 text-xs text-muted-foreground border border-indigo-100/40 dark:border-zinc-800/40 rounded-xl bg-background/50">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4.5 w-4.5 text-purple-500" />
                  </div>
                  <div>
                    Reserving from <strong className="text-foreground">{reservation.warehouse.name}</strong> 
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 text-pink-500" />
                      {reservation.warehouse.location}
                    </span>
                  </div>
                </div>

                {/* Order Totals Table */}
                <div className="border-t border-indigo-100/30 dark:border-zinc-800/40 pt-4 flex flex-col gap-2.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Subtotal</span>
                    <span>₹{orderTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>Tax & Processing</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-foreground border-t border-indigo-100/30 dark:border-zinc-800/40 pt-4 mt-1.5">
                    <span>Grand Total</span>
                    <span className="text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      ₹{orderTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </CardContent>

              {/* Checkout / Expiry Action Footer */}
              {reservation.status === "pending" && (
                <CardFooter className="flex gap-4 border-t border-indigo-100/30 dark:border-zinc-800/40 pt-5 bg-indigo-50/10 dark:bg-zinc-900/10">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs font-bold border-zinc-200 dark:border-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20"
                    disabled={actionLoading !== null}
                    onClick={handleRelease}
                  >
                    {actionLoading === "release" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Releasing...
                      </>
                    ) : (
                      "Cancel Release"
                    )}
                  </Button>
                  
                  <Button
                    className="flex-grow-[2] text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg shadow-indigo-600/20 border-0 transition-all duration-300"
                    disabled={actionLoading !== null}
                    onClick={handleConfirm}
                  >
                    {actionLoading === "confirm" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-1.5 h-4.5 w-4.5" />
                        Pay & Confirm Hold
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Right Column: Timer / Receipt Column */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {reservation.status === "pending" ? (
              <Card className={`border shadow-lg text-center py-8 flex flex-col items-center justify-center gap-3 bg-card/65 backdrop-blur-md relative overflow-hidden transition-all duration-300 ${
                isUrgent 
                  ? "border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" 
                  : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent"
              }`}>
                {/* Glowing alert circles */}
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-inner ${
                  isUrgent ? "bg-rose-500/10 text-rose-500 animate-bounce" : "bg-amber-500/10 text-amber-500"
                }`}>
                  <Clock className={`h-6 w-6 ${isUrgent ? "animate-pulse text-rose-600 dark:text-rose-400" : "animate-spin-slow text-amber-600 dark:text-amber-400"}`} />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hold Time Remaining</span>
                  <span className={`text-4xl font-black font-mono mt-1.5 transition-all ${
                    isUrgent ? "text-rose-600 dark:text-rose-400 scale-105 animate-pulse" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 max-w-[200px] mt-1.5 leading-relaxed px-2">
                  Items are secured. If the countdown reaches zero, the hold expires and stock returns into warehouse pools.
                </p>
              </Card>
            ) : reservation.status === "confirmed" ? (
              <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent shadow-lg text-center py-8 flex flex-col items-center justify-center gap-4 px-6 relative overflow-hidden">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Completed</span>
                  <span className="text-xl font-black text-foreground mt-1.5 leading-tight">Order Confirmed!</span>
                </div>
                <p className="text-[10px] text-muted-foreground/90 leading-relaxed border-t border-emerald-500/20 pt-4.5 max-w-[220px]">
                  Order receipt generated. Inventory hold successfully converted to permanent sale. Thank you!
                </p>
                <Button 
                  size="sm" 
                  className="mt-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md rounded-full px-4"
                  onClick={() => router.push("/")}
                >
                  Return to Catalog
                </Button>
              </Card>
            ) : (
              <Card className="border border-zinc-300 dark:border-zinc-800 bg-gradient-to-br from-zinc-500/10 via-zinc-500/5 to-transparent shadow-lg text-center py-8 flex flex-col items-center justify-center gap-4 px-6 relative overflow-hidden">
                <div className="h-12 w-12 rounded-full bg-zinc-500/20 text-zinc-500 flex items-center justify-center shadow-inner">
                  <XCircle className="h-6 w-6" />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hold Closed</span>
                  <span className="text-xl font-black text-foreground mt-1.5 leading-tight">Stock Hold Released</span>
                </div>
                <p className="text-[10px] text-muted-foreground/90 leading-relaxed border-t border-zinc-200 dark:border-zinc-800 pt-4.5 max-w-[220px]">
                  The reservation expired or was manually cancelled. Reserved stock was safely returned back into warehouse channels.
                </p>
                <Button 
                  size="sm" 
                  className="mt-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4"
                  onClick={() => router.push("/")}
                >
                  Browse Catalog
                </Button>
              </Card>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-indigo-100/30 dark:border-zinc-900 bg-indigo-50/20 dark:bg-zinc-950/30 py-8 mt-20 text-center text-xs text-muted-foreground/80">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-2">
          <p className="font-medium">© {new Date().getFullYear()} Reservation System. Optimized for high-throughput locking operations.</p>
          <p className="text-[10px] text-muted-foreground/60">Built using Next.js 16, Prisma v7 Client, & Supabase PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
