import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndExpireReservation } from "@/lib/expiry";

// GET /api/reservations/:id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    // lazy expiry check - if expired, this updates database and sets it to released
    await checkAndExpireReservation(reservation);

    // fetch the latest state in case status was updated during lazy expiry
    const latestReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return NextResponse.json(latestReservation);
  } catch (error) {
    console.error("Failed to fetch reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}
