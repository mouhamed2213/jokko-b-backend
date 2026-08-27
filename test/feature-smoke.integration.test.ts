import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";

const enabled = process.env.JOKKO_FEATURE_SMOKE === "1";
const password = process.env.JOKKO_TEST_PASSWORD;
const accounts = ["free", "starter", "pro", "premium"] as const;
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => { if (!enabled || !password) return; await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); }); });
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

for (const slug of accounts) test(`${slug}: smoke des modules authentifiés`, { skip: !enabled || !password }, async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `qa-${slug}@jokko.test`, password }) });
  assert.equal(login.status, 200);
  const loginBody = await login.json() as { token?: string; data?: { token?: string } };
  const token = loginBody.token ?? loginBody.data?.token;
  assert.ok(token);
  const headers = { Authorization: `Bearer ${token}` };
  const endpoints = ["/api/products", "/api/clients", "/api/cash/current", "/api/dashboard/stats", "/api/advanced-reports/summary", "/api/margins/summary", "/api/backups/export"];
  const statuses: Record<string, number> = {};
  for (const endpoint of endpoints) statuses[endpoint] = (await fetch(`${baseUrl}${endpoint}`, { headers })).status;
  assert.notEqual(statuses["/api/products"], 401);
  assert.notEqual(statuses["/api/clients"], 401);
  for (const endpoint of endpoints) assert.notEqual(statuses[endpoint], 404, `${slug}: route absente ${endpoint}`);
  assert.equal(statuses["/api/backups/export"], slug === "premium" ? 200 : 403);
  console.log(`${slug}: ${JSON.stringify(statuses)}`);
});
