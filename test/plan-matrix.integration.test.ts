import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";

const enabled = process.env.JOKKO_PLAN_MATRIX === "1";
const password = process.env.JOKKO_TEST_PASSWORD;
const cases = [
  { code: "FREE", email: "qa-free@jokko.test", maxUsers: 1, maxProducts: 50, backup: false },
  { code: "BASIC", email: "qa-starter@jokko.test", maxUsers: 3, maxProducts: 600, backup: false },
  { code: "PRO", email: "qa-pro@jokko.test", maxUsers: 5, maxProducts: null, backup: false },
  { code: "PREMIUM", email: "qa-premium@jokko.test", maxUsers: null, maxProducts: null, backup: true },
] as const;
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => { if (!enabled || !password) return; await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); }); });
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

for (const item of cases) test(`${item.code}: identité du plan, limites et accès backup`, { skip: !enabled || !password }, async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: item.email, password }) });
  assert.equal(login.status, 200);
  const loginBody = await login.json() as { token?: string; data?: { token?: string } };
  const token = loginBody.token ?? loginBody.data?.token;
  assert.ok(token);
  const headers = { Authorization: `Bearer ${token}` };
  const subscription = await fetch(`${baseUrl}/api/subscription`, { headers });
  assert.equal(subscription.status, 200);
  const body = await subscription.json() as { subscription?: { plan?: { code?: string }; limits?: { users?: number | null; products?: number | null } } };
  const plan = body.subscription?.plan;
  const limits = body.subscription?.limits;
  assert.equal(plan?.code, item.code);
  assert.equal(limits?.users, item.maxUsers);
  assert.equal(limits?.products, item.maxProducts);
  const backup = await fetch(`${baseUrl}/api/backups/export`, { headers });
  assert.equal(backup.status, item.backup ? 200 : 403);
});
