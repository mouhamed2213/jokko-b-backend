import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const enabled = process.env.JOKKO_QUOTA_LOAD === "1";
const password = process.env.JOKKO_TEST_PASSWORD;
const rounds = Number(process.env.JOKKO_QUOTA_LOAD_REQUESTS || 10);
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => { if (!enabled || !password) return; await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); }); });
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await prisma.$disconnect(); });

const login = async (slug: "pro" | "premium") => { const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `qa-${slug}@jokko.test`, password }) }); assert.equal(response.status, 200); const body = await response.json() as { token?: string; data?: { token?: string } }; const token = body.token ?? body.data?.token; assert.ok(token); return token; };
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

for (const item of [{ slug: "pro", maxExtraUsers: 4, maxExtraShops: 1 }, { slug: "premium", maxExtraUsers: Number.POSITIVE_INFINITY, maxExtraShops: 4 }] as const) {
  test(`${item.slug}: charge concurrentielle des quotas utilisateurs`, { skip: !enabled || !password }, async () => {
    const token = await login(item.slug);
    const responses = await Promise.all(Array.from({ length: rounds }, (_, index) => fetch(`${baseUrl}/api/users`, { method: "POST", headers: headers(token), body: JSON.stringify({ name: `QA Load ${item.slug} ${index}`, email: `qa-load-${item.slug}-${Date.now()}-${index}@jokko.test`, password: "Jokko-Load-2026!", role: "EMPLOYEE" }) })));
    const created: number[] = [];
    for (const response of responses) { if (response.status === 201) { const body = await response.json() as { user?: { id?: number } }; if (body.user?.id) created.push(body.user.id); } else await response.text(); }
    assert.ok(item.maxExtraUsers === Number.POSITIVE_INFINITY ? created.length === rounds : created.length <= item.maxExtraUsers, `${item.slug}: ${created.length} utilisateurs supplémentaires créés, limite attendue ${item.maxExtraUsers}`);
    if (created.length) await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  test(`${item.slug}: charge concurrentielle des boutiques secondaires`, { skip: !enabled || !password }, async () => {
    const token = await login(item.slug);
    const primary = await prisma.shop.findUniqueOrThrow({ where: { email: `qa-${item.slug}@jokko.test` } });
    await prisma.shop.deleteMany({ where: { primaryShopId: primary.id } });
    const responses = await Promise.all(Array.from({ length: rounds }, (_, index) => fetch(`${baseUrl}/api/shop/create-second-shop`, { method: "POST", headers: headers(token), body: JSON.stringify({ shopName: `QA Load Secondary ${item.slug} ${index}`, ownerName: `QA Load ${item.slug}`, phone: `772${String(Date.now()).slice(-7)}${index}`, email: `qa-load-secondary-${item.slug}-${Date.now()}-${index}@jokko.test`, password: "Jokko-Secondary-2026!" }) })));
    const successCount = responses.filter((response) => response.status === 201).length;
    for (const response of responses) await response.text();
    assert.ok(successCount <= item.maxExtraShops, `${item.slug}: ${successCount} boutiques secondaires créées, limite attendue ${item.maxExtraShops}`);
    await prisma.shop.deleteMany({ where: { primaryShopId: primary.id } });
  });
}
