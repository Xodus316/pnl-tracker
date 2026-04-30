import { Router } from "express";
import { prisma } from "../lib/db";

export const importsRouter = Router();

importsRouter.get("/", async (_req, res, next) => {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { id: "desc" },
      take: 50,
    });
    const counts = await prisma.trade.groupBy({
      by: ["batchId"],
      _count: { _all: true },
    });
    const countMap = new Map(
      counts.map((c) => [c.batchId, c._count._all] as const),
    );
    res.json(
      batches.map((b) => ({
        id: b.id,
        filename: b.filename,
        mode: b.mode,
        source: b.source,
        rowsInserted: b.rowsInserted,
        rowsRemaining: countMap.get(b.id) ?? 0,
        importedAt: b.importedAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

importsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid id" });
    }
    // cascade deletes trades belonging to this batch
    await prisma.importBatch.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
