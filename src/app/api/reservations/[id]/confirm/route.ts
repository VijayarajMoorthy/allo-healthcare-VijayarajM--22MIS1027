import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndExpireReservation } from "@/lib/expiry";

// POST /api/reservations/:id/confirm
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // lazy expiry check
    const wasExpired = await checkAndExpireReservation(reservation);
    if (wasExpired) {
      return NextResponse.json(
        { error: "Reservation has expired" },
        { status: 410 }
      );
    }

    if (reservation.status !== "pending") {
      return NextResponse.json(
        { error: `Reservation is already ${reservation.status}` },
        { status: 400 }
      );
    }

    // confirm: update status and decrement reservedQuantity (stock is now sold)
    const confirmed = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: "confirmed" },
        include: { product: true, warehouse: true },
      });

      // stock is now permanently sold - reduce reservedQuantity
      // (totalQuantity should also decrease since items are sold, but 
      // for this assignment we just clear the reservation hold)
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          reservedQuantity: { decrement: reservation.quantity },
          totalQuantity: { decrement: reservation.quantity },
        },
      });

      return updated;
    });

    return NextResponse.json(confirmed);
  } catch (error) {
    console.error("Failed to confirm reservation:", error);
    return NextResponse.json(
      { error: "Failed to confirm reservation" },
      { status: 500 }
    );
  }
}
