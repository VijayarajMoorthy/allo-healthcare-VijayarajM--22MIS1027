import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // clean up existing data
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: { name: "East Warehouse", location: "New York, NY" },
    }),
    prisma.warehouse.create({
      data: { name: "West Warehouse", location: "Los Angeles, CA" },
    }),
    prisma.warehouse.create({
      data: { name: "Central Warehouse", location: "Chicago, IL" },
    }),
  ]);

  console.log(`Created ${warehouses.length} warehouses`);

  // create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with USB receiver",
        price: 29.99,
        sku: "WM-001",
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard",
        description: "RGB mechanical keyboard with Cherry MX switches",
        price: 89.99,
        sku: "KB-002",
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Hub",
        description: "7-in-1 USB-C hub with HDMI and ethernet",
        price: 49.99,
        sku: "HUB-003",
      },
    }),
    prisma.product.create({
      data: {
        name: "Monitor Stand",
        description: "Adjustable aluminum monitor stand",
        price: 39.99,
        sku: "MS-004",
      },
    }),
    prisma.product.create({
      data: {
        name: "Webcam HD",
        description: "1080p webcam with built-in microphone",
        price: 59.99,
        sku: "CAM-005",
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // create inventory - each product in 2-3 warehouses with varying stock
  const inventoryData = [
    { productIdx: 0, warehouseIdx: 0, total: 25 },
    { productIdx: 0, warehouseIdx: 1, total: 15 },
    { productIdx: 0, warehouseIdx: 2, total: 30 },

    { productIdx: 1, warehouseIdx: 0, total: 10 },
    { productIdx: 1, warehouseIdx: 2, total: 20 },

    { productIdx: 2, warehouseIdx: 0, total: 40 },
    { productIdx: 2, warehouseIdx: 1, total: 8 },
    { productIdx: 2, warehouseIdx: 2, total: 15 },

    { productIdx: 3, warehouseIdx: 1, total: 12 },
    { productIdx: 3, warehouseIdx: 2, total: 5 },

    { productIdx: 4, warehouseIdx: 0, total: 18 },
    { productIdx: 4, warehouseIdx: 1, total: 22 },
  ];

  for (const item of inventoryData) {
    await prisma.inventory.create({
      data: {
        productId: products[item.productIdx].id,
        warehouseId: warehouses[item.warehouseIdx].id,
        totalQuantity: item.total,
        reservedQuantity: 0,
      },
    });
  }

  console.log(`Created ${inventoryData.length} inventory records`);
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
