import { prisma } from "@/lib/prisma";
import { Reservation } from "@/generated/prisma/client";

// lazy expiration - check if a pending reservation has expired and auto-release it
export async function checkAndExpireReservation(
  reservation: Reservation
): Promise<boolean> {
  if (
    reservation.status === "pending" &&
    reservation.expiresAt < new Date()
  ) {
    // auto-release expired reservation
    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "released" },
      }),
      prisma.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      }),
    ]);
    return true; // was expired
  }
  return false; // still valid
}
