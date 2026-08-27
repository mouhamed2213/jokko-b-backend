import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const enabled = process.env.JOKKO_INTEGRATION === "1";
const email = process.env.JOKKO_TEST_PREMIUM_EMAIL;
const password = process.env.JOKKO_TEST_PREMIUM_PASSWORD;
const key = `integration-idempotency-${Date.now()}`;
let server: ReturnType<typeof app.listen>;
let baseUrl = "";
let ownerId: number | undefined;

before(async () => {
  if (!enabled || !email || !password) return;
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

after(async () => {
  if (ownerId) await prisma.idempotencyRecord.deleteMany({ where: { ownerId, idempotencyKey: key } });
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const login = async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { token?: string; data?: { token?: string } };
  assert.ok(body.token ?? body.data?.token);
  return body.token ?? body.data?.token as string;
};

test("idempotence Prisma : une clé rejoue exactement la réponse enregistrée", { skip: !enabled || !email || !password }, async () => {
  const token = await login();
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { ownerId: number };
  ownerId = payload.ownerId;
  await prisma.idempotencyRecord.deleteMany({ where: { ownerId, idempotencyKey: key } });
  await prisma.idempotencyRecord.create({
    data: {
      ownerId,
      shopId: payload.ownerId,
      idempotencyKey: key,
      method: "POST",
      path: "/",
      statusCode: 201,
      responseBody: { replayed: true, source: "prisma-test" },
    },
  });

  const replay = await fetch(`${baseUrl}/api/expenses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": key },
    body: JSON.stringify({}),
  });
  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), { replayed: true, source: "prisma-test" });
});

test("idempotence Prisma : réutiliser une clé sur une autre route retourne 409", { skip: !enabled || !email || !password }, async () => {
  const token = await login();
  const response = await fetch(`${baseUrl}/api/cash/transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": key },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 409);
  const body = await response.json() as { code?: string };
  assert.equal(body.code, "IDEMPOTENCY_KEY_REUSED");
});

test("Prisma : la contrainte propriétaire + clé empêche les doublons", { skip: !enabled || !ownerId }, async () => {
  await assert.rejects(
    prisma.idempotencyRecord.create({
      data: { ownerId: ownerId!, shopId: null, idempotencyKey: key, method: "POST", path: "/", statusCode: 200, responseBody: {} },
    }),
    (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
  );
});
