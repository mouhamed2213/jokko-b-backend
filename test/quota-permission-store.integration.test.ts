import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const enabled = process.env.JOKKO_QUOTA_MATRIX === "1";
const password = process.env.JOKKO_TEST_PASSWORD;
const accounts = [
  { code: "FREE", slug: "free", maxUsers: 1 },
  { code: "BASIC", slug: "starter", maxUsers: 3 },
  { code: "PRO", slug: "pro", maxUsers: 5 },
  { code: "PREMIUM", slug: "premium", maxUsers: null },
] as const;
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => { if (!enabled || !password) return; await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); }); });
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await prisma.$disconnect(); });

const login = async (slug: string) => { const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `qa-${slug}@jokko.test`, password }) }); assert.equal(response.status, 200); const body = await response.json() as { token?: string; data?: { token?: string } }; const token = body.token ?? body.data?.token; assert.ok(token); return token; };
const json = (token: string, body: unknown) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

for (const item of accounts) test(`${item.code}: quota utilisateurs et sécurité Admin/Employé`, { skip: !enabled || !password }, async () => {
  const token = await login(item.slug);
  const createdIds: number[] = [];
  let firstEmployeeEmail = "";
  try {
    const employeesToCreate = item.maxUsers === null ? 1 : Math.max(item.maxUsers - 1, 0);
    for (let index = 0; index < employeesToCreate; index += 1) {
      const employeeEmail = `qa-matrix-${item.slug}-${Date.now()}-${index}@jokko.test`;
      const response = await fetch(`${baseUrl}/api/users`, { method: "POST", headers: json(token, {}), body: JSON.stringify({ name: `QA Employee ${item.slug} ${index}`, email: employeeEmail, password: "Jokko-Employee-2026!", role: "EMPLOYEE" }) });
      assert.equal(response.status, 201);
      if (!firstEmployeeEmail) firstEmployeeEmail = employeeEmail;
      const body = await response.json() as { user?: { id?: number; email?: string } };
      assert.ok(body.user?.id);
      createdIds.push(body.user.id);
    }
    const quotaResponse = await fetch(`${baseUrl}/api/users`, { method: "POST", headers: json(token, {}), body: JSON.stringify({ name: "QA quota overflow", email: `qa-overflow-${item.slug}-${Date.now()}@jokko.test`, password: "Jokko-Employee-2026!", role: "EMPLOYEE" }) });
    assert.equal(quotaResponse.status, item.maxUsers === null ? 201 : 403);
    if (item.maxUsers === null && quotaResponse.ok) { const body = await quotaResponse.json() as { user?: { id?: number } }; if (body.user?.id) createdIds.push(body.user.id); }
    if (createdIds[0]) {
      const permissionResponse = await fetch(`${baseUrl}/api/users/${createdIds[0]}/permissions`, { method: "PUT", headers: json(token, {}), body: JSON.stringify({ permissions: [{ code: "PRODUCTS_READ", allowed: false }] }) });
      assert.equal(permissionResponse.status, 200);
      const employeeLogin = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: firstEmployeeEmail, password: "Jokko-Employee-2026!" }) });
      assert.equal(employeeLogin.status, 200);
      const employeeBody = await employeeLogin.json() as { token?: string; data?: { token?: string } };
      const employeeToken = employeeBody.token ?? employeeBody.data?.token;
      assert.ok(employeeToken);
      assert.equal((await fetch(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${employeeToken}` } })).status, 403);
    }
    assert.equal((await fetch(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${token}` } })).status, 200);
  } finally { if (createdIds.length) await prisma.user.deleteMany({ where: { id: { in: createdIds } } }); }
});

for (const item of accounts) test(`${item.code}: création de boutique secondaire`, { skip: !enabled || !password }, async () => {
  const token = await login(item.slug);
  const primary = await prisma.shop.findUniqueOrThrow({ where: { email: `qa-${item.slug}@jokko.test` } });
  await prisma.shop.deleteMany({ where: { primaryShopId: primary.id } });
  const response = await fetch(`${baseUrl}/api/shop/create-second-shop`, { method: "POST", headers: json(token, {}), body: JSON.stringify({ shopName: `QA Secondary ${item.slug}`, ownerName: `QA Secondary ${item.slug}`, phone: `771${String(Date.now()).slice(-7)}`, email: `qa-secondary-${item.slug}-${Date.now()}@jokko.test`, password: "Jokko-Secondary-2026!" }) });
  assert.equal(response.status, item.code === "PRO" || item.code === "PREMIUM" ? 201 : 403);
  if (response.ok) { const shops = await fetch(`${baseUrl}/api/shop`, { headers: { Authorization: `Bearer ${token}` } }); assert.equal(shops.status, 200); const body = await shops.json() as { shops?: unknown[] }; assert.equal(body.shops?.length, 2); }
  await prisma.shop.deleteMany({ where: { primaryShopId: primary.id } });
});
