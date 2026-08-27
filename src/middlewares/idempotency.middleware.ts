import type { NextFunction, Response } from "express";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "./auth.middleware.js";

const MAX_KEY_LENGTH = 200;
const locks = new Map<string, Promise<void>>();

const waitForPreviousRequest = async (lockKey: string) => {
  const previous = locks.get(lockKey);
  if (previous) await previous;

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(lockKey, current);
  return () => {
    if (locks.get(lockKey) === current) locks.delete(lockKey);
    release();
  };
};

const getOwnerId = (req: AuthRequest) => req.user?.ownerId ?? req.user?.userId;

/**
 * Replays a completed mutation when the client sends the same key again.
 * The lock closes the race between concurrent retries in one API process;
 * the database unique constraint remains the cross-process safety net.
 */
export const idempotency = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();

  const rawKey = req.header("X-Idempotency-Key");
  const ownerId = getOwnerId(req);
  if (!rawKey || !ownerId) return next();

  const idempotencyKey = rawKey.trim();
  if (!idempotencyKey || idempotencyKey.length > MAX_KEY_LENGTH) {
    return res.status(400).json({ message: "Clé d’idempotence invalide" });
  }

  const lockKey = `${ownerId}:${idempotencyKey}`;
  const release = await waitForPreviousRequest(lockKey);
  let recordedBody: unknown;
  let recordedStatus = 200;
  let persisted = false;

  try {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { ownerId_idempotencyKey: { ownerId, idempotencyKey } },
    });

    if (existing) {
      if (existing.method !== req.method || existing.path !== req.path) {
        release();
        return res.status(409).json({
          code: "IDEMPOTENCY_KEY_REUSED",
          message: "Cette clé d’idempotence est déjà associée à une autre requête",
        });
      }
      release();
      return res.status(existing.statusCode).json(existing.responseBody);
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    res.json = ((body: unknown) => {
      recordedBody = body;
      recordedStatus = res.statusCode;
      return originalJson(body);
    }) as Response["json"];
    res.send = ((body: unknown) => {
      recordedBody = body;
      recordedStatus = res.statusCode;
      return originalSend(body);
    }) as Response["send"];

    res.once("finish", () => {
      void (async () => {
        try {
          if (!persisted && recordedBody !== undefined && recordedStatus < 500) {
            persisted = true;
            await prisma.idempotencyRecord.create({
              data: {
                ownerId,
                shopId: req.user?.shopId || null,
                idempotencyKey,
                method: req.method,
                path: req.path,
                statusCode: recordedStatus,
                responseBody: recordedBody as object,
              },
            });
          }
        } catch (error: unknown) {
          // A concurrent request may have won the unique race. Its replay is valid.
          if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) {
            console.error("Erreur d’enregistrement de l’idempotence", error);
          }
        } finally {
          release();
        }
      })();
    });

    next();
  } catch (error) {
    release();
    next(error);
  }
};
