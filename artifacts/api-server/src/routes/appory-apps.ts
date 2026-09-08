import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { db, apporyAppsTable, type ApporyAppRow } from "@workspace/db";

const router: IRouter = Router();
const adminAccessCode = process.env.APPORY_ADMIN_PIN ?? "831615";

function hasAdminAccess(request: Request) {
  return request.header("x-appory-admin-pin") === adminAccessCode;
}

function toProduct(row: ApporyAppRow) {
  return {
    id: row.id,
    name: row.name,
    publisher: row.publisher,
    category: row.category,
    description: row.description,
    detail: row.detail,
    price: Number(row.price),
    size: row.size,
    version: row.version,
    initials: row.initials,
    iconBg: row.iconBg,
    iconFg: row.iconFg,
    imageDataUrl: row.imageDataUrl,
  };
}

function readProduct(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const requiredText = [
    "id",
    "name",
    "publisher",
    "category",
    "description",
    "detail",
    "size",
    "version",
    "initials",
    "iconBg",
  ];
  if (requiredText.some((key) => typeof value[key] !== "string" || !value[key])) return null;
  if (typeof value.price !== "number" || !Number.isFinite(value.price) || value.price < 0) return null;
  if (!["Productivity", "Entertainment", "Utilities", "Creative"].includes(value.category as string)) return null;

  return {
    id: value.id as string,
    name: value.name as string,
    publisher: value.publisher as string,
    category: value.category as string,
    description: value.description as string,
    detail: value.detail as string,
    price: String(value.price),
    size: value.size as string,
    version: value.version as string,
    initials: value.initials as string,
    iconBg: value.iconBg as string,
    iconFg: typeof value.iconFg === "string" ? value.iconFg : null,
    imageDataUrl: typeof value.imageDataUrl === "string" ? value.imageDataUrl : null,
  };
}

router.get("/apps", async (_request, response) => {
  try {
    const rows = await db.select().from(apporyAppsTable).orderBy(desc(apporyAppsTable.createdAt));
    response.json(rows.map(toProduct));
  } catch {
    response.status(503).json({ message: "Shared app storage is unavailable." });
  }
});

router.post("/apps", async (request, response) => {
  if (!hasAdminAccess(request)) {
    response.status(401).json({ message: "Admin access required." });
    return;
  }
  const product = readProduct(request.body);
  if (!product) {
    response.status(400).json({ message: "Invalid app listing." });
    return;
  }

  try {
    const [created] = await db.insert(apporyAppsTable).values(product).returning();
    response.status(201).json(toProduct(created));
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      response.status(409).json({ message: "An app with this id already exists." });
      return;
    }
    response.status(500).json({ message: "The app listing could not be saved." });
  }
});

router.patch("/apps/:id", async (request, response) => {
  if (!hasAdminAccess(request)) {
    response.status(401).json({ message: "Admin access required." });
    return;
  }
  const product = readProduct(request.body);
  if (!product || product.id !== request.params.id) {
    response.status(400).json({ message: "Invalid app listing." });
    return;
  }

  try {
    const [updated] = await db
      .update(apporyAppsTable)
      .set(product)
      .where(eq(apporyAppsTable.id, request.params.id))
      .returning();
    if (!updated) {
      response.status(404).json({ message: "App listing not found." });
      return;
    }
    response.json(toProduct(updated));
  } catch {
    response.status(500).json({ message: "The app listing could not be updated." });
  }
});

router.delete("/apps/:id", async (request, response) => {
  if (!hasAdminAccess(request)) {
    response.status(401).json({ message: "Admin access required." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(apporyAppsTable)
      .where(eq(apporyAppsTable.id, request.params.id))
      .returning({ id: apporyAppsTable.id });
    if (!deleted) {
      response.status(404).json({ message: "App listing not found." });
      return;
    }
    response.status(204).send();
  } catch {
    response.status(500).json({ message: "The app listing could not be deleted." });
  }
});

export default router;