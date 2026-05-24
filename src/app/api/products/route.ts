import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // add computed available quantity to each inventory entry
    const productsWithAvailability = products.map((product) => ({
      ...product,
      inventory: product.inventory.map((inv) => ({
        ...inv,
        availableQuantity: inv.totalQuantity - inv.reservedQuantity,
      })),
    }));

    return NextResponse.json(productsWithAvailability);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
