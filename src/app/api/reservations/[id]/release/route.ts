import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndExpireReservation } from "@/lib/expiry";

// POST /api/reservations/:id/release
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

    // lazy expiry check - if already expired, it gets auto-released
    const wasExpired = await checkAndExpireReservation(reservation);
    if (wasExpired) {
      return NextResponse.json({
        message: "Reservation was already expired and has been released",
        status: "released",
      });
    }

    if (reservation.status !== "pending") {
      return NextResponse.json(
        { error: `Reservation is already ${reservation.status}` },
        { status: 400 }
      );
    }

    // release: update status and free up reserved stock
    const released = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: "released" },
        include: { product: true, warehouse: true },
      });

      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });

      return updated;
    });

    return NextResponse.json(released);
  } catch (error) {
    console.error("Failed to release reservation:", error);
    return NextResponse.json(
      { error: "Failed to release reservation" },
      { status: 500 }
    );
  }
}
