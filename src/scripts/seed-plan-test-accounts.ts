import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

if (process.env.NODE_ENV === "production") throw new Error("Les comptes de test sont interdits en production");
const password = process.env.JOKKO_TEST_PASSWORD;
if (!password || password.length < 12) throw new Error("Définissez JOKKO_TEST_PASSWORD avec au moins 12 caractères");

const plans = [
  { code: "FREE", slug: "free", price: 0, maxUsers: 1, maxProducts: 50, maxSalesPerMonth: 100, maxStores: null },
  { code: "BASIC", slug: "starter", price: 6500, maxUsers: 3, maxProducts: 600, maxSalesPerMonth: null, maxStores: null },
  { code: "PRO", slug: "pro", price: 14000, maxUsers: 5, maxProducts: null, maxSalesPerMonth: null, maxStores: 2 },
  { code: "PREMIUM", slug: "premium", price: 22000, maxUsers: null, maxProducts: null, maxSalesPerMonth: null, maxStores: 5 },
] as const;
const passwordHash = await bcrypt.hash(password, 12);

try {
  for (const { code, slug } of plans) {
    const email = `qa-${slug}@jokko.test`;
    const shop = await prisma.shop.upsert({
      where: { email },
      update: { name: `QA ${slug.toUpperCase()}`, ownerName: `QA ${slug}`, phone: `770000${slug.length}` },
      create: { name: `QA ${slug.toUpperCase()}`, ownerName: `QA ${slug}`, email, phone: `770000${slug.length}`, address: "Environnement de test" },
    });
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `QA ${slug}`, password: passwordHash, shopId: shop.id, role: "ADMIN", isActive: true },
      create: { name: `QA ${slug}`, email, password: passwordHash, shopId: shop.id, role: "ADMIN", isActive: true },
    });
    const owner = await prisma.shopOwner.upsert({
      where: { userId_shopId: { userId: user.id, shopId: shop.id } },
      update: { phone: shop.phone },
      create: { userId: user.id, shopId: shop.id, phone: shop.phone },
    });
    const plan = await prisma.plan.upsert({ where: { code }, update: { price: plans.find((item) => item.code === code)!.price, maxUsers: plans.find((item) => item.code === code)!.maxUsers, maxProducts: plans.find((item) => item.code === code)!.maxProducts, maxSalesPerMonth: plans.find((item) => item.code === code)!.maxSalesPerMonth, maxStores: plans.find((item) => item.code === code)!.maxStores }, create: { code, name: code === "BASIC" ? "Basic" : code[0] + code.slice(1).toLowerCase(), price: plans.find((item) => item.code === code)!.price, maxUsers: plans.find((item) => item.code === code)!.maxUsers, maxProducts: plans.find((item) => item.code === code)!.maxProducts, maxSalesPerMonth: plans.find((item) => item.code === code)!.maxSalesPerMonth, maxStores: plans.find((item) => item.code === code)!.maxStores } });
    const current = await prisma.subscription.findFirst({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" } });
    if (current) await prisma.subscription.update({ where: { id: current.id }, data: { planId: plan.id, shopOwnerId: owner.id, status: "ACTIVE", endDate: new Date("2099-12-31T00:00:00.000Z") } });
    else await prisma.subscription.create({ data: { shopId: shop.id, shopOwnerId: owner.id, planId: plan.id, status: "ACTIVE", endDate: new Date("2099-12-31T00:00:00.000Z") } });
    console.log(`${code}: ${email}`);
  }
} finally { await prisma.$disconnect(); }
