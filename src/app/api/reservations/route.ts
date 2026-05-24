import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReservationSchema } from "@/lib/validators";

// POST /api/reservations - create a new reservation with concurrency-safe stock check
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // validate input
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // use a transaction with raw SQL for row-level locking
    // this is the critical concurrency-safe part
    const reservation = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE locks the inventory row so concurrent requests block here
      const inventory = await tx.$queryRaw<
        Array<{
          id: string;
          totalQuantity: number;
          reservedQuantity: number;
        }>
      >`
        SELECT id, "totalQuantity", "reservedQuantity"
        FROM "Inventory"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (!inventory || inventory.length === 0) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      const inv = inventory[0];
      const available = inv.totalQuantity - inv.reservedQuantity;

      if (available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // increment reservedQuantity
      await tx.inventory.update({
        where: { id: inv.id },
        data: { reservedQuantity: { increment: quantity } },
      });

      // create reservation with 10 minute expiry
      const newReservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "pending",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return newReservation;
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message === "INVENTORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Inventory not found for this product/warehouse combination" },
        { status: 404 }
      );
    }

    if (message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "Insufficient stock available" },
        { status: 409 }
      );
    }

    console.error("Failed to create reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
