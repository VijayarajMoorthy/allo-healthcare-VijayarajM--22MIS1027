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
  AlertTriangle
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
      <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          Retrieving reservation checkout session...
        </p>
      </div>
    );
  }

  if (!reservation) return null;

  const orderTotal = reservation.product.price * reservation.quantity;
  const isUrgent = timeLeft < 120 && timeLeft > 0; // Less than 2 mins

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Navigation Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5" 
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Button>
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Page Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center justify-center">
        
        {/* Urgent Expiry Banner */}
        {reservation.status === "pending" && isUrgent && (
          <div className="w-full mb-6 border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 rounded-lg p-3.5 flex items-center gap-3 animate-pulse">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-xs font-semibold">
              Hurry! Your stock hold will expire in less than 2 minutes. Complete checkout to secure this items.
            </div>
          </div>
        )}

        <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Left Column: Checkout Summary Card */}
          <div className="md:col-span-3 flex flex-col gap-6">
            <Card className="border border-border/80 shadow-md bg-card/55 backdrop-blur-sm">
              <CardHeader className="pb-4 border-b border-border/30">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold">Checkout Summary</CardTitle>
                    <CardDescription className="text-xs mt-0.5 font-mono">
                      Reservation ID: {reservation.id}
                    </CardDescription>
                  </div>
                  <div>
                    {reservation.status === "pending" ? (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 uppercase font-bold text-[10px]">
                        Pending Hold
                      </Badge>
                    ) : reservation.status === "confirmed" ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 uppercase font-bold text-[10px]">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-500/30 text-zinc-500 bg-zinc-500/5 uppercase font-bold text-[10px]">
                        Released
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5 flex flex-col gap-4">
                {/* Product Detail Info */}
                <div className="flex justify-between items-center bg-background/50 p-4 border border-border/40 rounded-lg">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{reservation.product.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">SKU: {reservation.product.sku}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold">${reservation.product.price.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">Qty: {reservation.quantity}</span>
                  </div>
                </div>

                {/* Warehouse Location Info */}
                <div className="flex items-center gap-3 p-1.5 text-xs text-muted-foreground mt-1">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    Reserving from <strong className="text-foreground">{reservation.warehouse.name}</strong> ({reservation.warehouse.location})
                  </div>
                </div>

                {/* Order Totals Table */}
                <div className="border-t border-border/20 pt-4 flex flex-col gap-2 mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tax & Processing</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground border-t border-border/20 pt-3.5">
                    <span>Order Total</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>

              {/* Checkout / Expiry Action Footer */}
              {reservation.status === "pending" && (
                <CardFooter className="flex gap-3.5 border-t border-border/20 pt-5">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs font-semibold"
                    disabled={actionLoading !== null}
                    onClick={handleRelease}
                  >
                    {actionLoading === "release" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Cancel & Release"
                    )}
                  </Button>
                  
                  <Button
                    className="flex-grow-[2] text-xs font-semibold shadow-md"
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
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                        Confirm & Pay
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
              <Card className="border border-border/80 shadow-md text-center py-8 bg-card/55 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                  <Clock className="h-6 w-6 animate-pulse" />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining Hold Time</span>
                  <span className={`text-4xl font-extrabold font-mono mt-1 transition-all ${
                    isUrgent ? "text-red-500 scale-105" : "text-amber-500"
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/80 max-w-[200px] mt-1 leading-normal">
                  Items are secured. If countdown reaches zero, the hold expires and stock is released back into circulation.
                </p>
              </Card>
            ) : reservation.status === "confirmed" ? (
              <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-md text-center py-8 flex flex-col items-center justify-center gap-4.5 px-6">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Success</span>
                  <span className="text-lg font-extrabold text-foreground mt-1 leading-tight">Purchase Confirmed!</span>
                </div>
                <p className="text-[10px] text-muted-foreground/90 leading-normal border-t border-emerald-500/10 pt-4.5">
                  Receipt was generated. Stock hold converted to permanent sale. Thank you for choosing Allo!
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 text-xs border-emerald-500/20 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10"
                  onClick={() => router.push("/")}
                >
                  Return to Catalog
                </Button>
              </Card>
            ) : (
              <Card className="border border-zinc-500/20 bg-zinc-500/5 shadow-md text-center py-8 flex flex-col items-center justify-center gap-4.5 px-6">
                <div className="h-12 w-12 rounded-full bg-zinc-500/10 text-zinc-500 flex items-center justify-center">
                  <XCircle className="h-6 w-6" />
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hold Expired</span>
                  <span className="text-lg font-extrabold text-foreground mt-1 leading-tight">Stock Released</span>
                </div>
                <p className="text-[10px] text-muted-foreground/90 leading-normal border-t border-zinc-500/10 pt-4.5">
                  The reservation hold expired or was manually released. The reserved inventory has been returned to the warehouse stock.
                </p>
                <Button 
                  size="sm" 
                  className="mt-2 text-xs font-semibold"
                  onClick={() => router.push("/")}
                >
                  Browse Catalog
                </Button>
              </Card>
            )}

            {/* Security Notice Badge Card */}
            <Card className="border border-border/50 p-4 bg-zinc-50/50 dark:bg-zinc-900/30 flex gap-3 items-start">
              <Receipt className="h-4.5 w-4.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">Pessimistic Locking Active</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  All reservation operations use PostgreSQL row-level locks to prevent double-booking and ensure inventory integrity.
                </p>
              </div>
            </Card>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/50 py-6 mt-16 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Allo Healthcare Assignment. Built using Next.js, Prisma, and Supabase PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
