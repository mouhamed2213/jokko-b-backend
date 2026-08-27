import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";

const enabled = process.env.JOKKO_INTEGRATION === "1";
const email = process.env.JOKKO_TEST_PREMIUM_EMAIL;
const password = process.env.JOKKO_TEST_PREMIUM_PASSWORD;
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => { if (!enabled || !email || !password) return; await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); }); });
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

test("restauration authentifiée : login → export → aperçu → restauration", { skip: !enabled || !email || !password }, async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json() as { token?: string; data?: { token?: string } };
  const token = loginBody.token ?? loginBody.data?.token;
  assert.ok(token, "Le login doit retourner un JWT");
  const headers = { Authorization: `Bearer ${token}` };
  const exportResponse = await fetch(`${baseUrl}/api/backups/export`, { headers });
  assert.equal(exportResponse.status, 200);
  const snapshot = await exportResponse.json() as { format: string; version: number; shops: unknown[] };
  assert.equal(snapshot.format, "jokko-business-backup");
  assert.equal(snapshot.version, 1);
  assert.ok(Array.isArray(snapshot.shops));
  const previewResponse = await fetch(`${baseUrl}/api/backups/restore-preview`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json() as { valid: boolean; counts: Record<string, number> };
  assert.equal(preview.valid, true);
  assert.equal(preview.counts.shops, snapshot.shops.length);
  const restoreResponse = await fetch(`${baseUrl}/api/backups/restore`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ snapshot, confirm: true }) });
  assert.equal(restoreResponse.status, 200);
  const restored = await restoreResponse.json() as { restored: boolean };
  assert.equal(restored.restored, true);
});

test("restauration sans authentification refusée", { skip: !enabled }, async () => { const response = await fetch(`${baseUrl}/api/backups/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snapshot: {}, confirm: true }) }); assert.equal(response.status, 401); });
