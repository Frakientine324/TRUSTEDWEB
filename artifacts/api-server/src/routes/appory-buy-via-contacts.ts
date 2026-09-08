import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { db, apporyBuyViaContactsTable, type ApporyBuyViaContactRow } from "@workspace/db";

const router: IRouter = Router();
const adminAccessCode = process.env.APPORY_ADMIN_PIN ?? "831615";
const ownerRemovalCode = process.env.APPORY_BUY_VIA_OWNER_CODE ?? "151683";
const seedMarkerId = "__appory_defaults_initialized__";
const defaultContacts = [
  { id: "remigio-messenger", label: "Remigio Somera", url: "https://m.me/gioroames" },
  { id: "whatsapp", label: "WhatsApp", url: "https://wa.me/qr/PA4EG37IP4TQB1" },
  { id: "joshua-bartolome", label: "Joshua Bartolome", url: "https://m.me/joshua.bartolome.1614460" },
];

function hasAdminAccess(request: Request) {
  return request.header("x-appory-admin-pin") === adminAccessCode;
}

function hasOwnerRemovalAccess(request: Request) {
  return request.header("x-appory-buy-via-owner-code") === ownerRemovalCode;
}

function toContact(row: ApporyBuyViaContactRow) {
  return { id: row.id, label: row.label, url: row.url };
}

function readContact(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const url = typeof value.url === "string" ? value.url.trim() : "";
  if (!label || !url || label.length > 80 || url.length > 500) return null;
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
  } catch {
    return null;
  }
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id || id === seedMarkerId) return null;
  return { id, label, url };
}

async function listContacts() {
  let rows = await db.select().from(apporyBuyViaContactsTable).orderBy(desc(apporyBuyViaContactsTable.createdAt));
  if (rows.some((row) => row.id === seedMarkerId)) return rows.filter((row) => row.id !== seedMarkerId);

  await db.insert(apporyBuyViaContactsTable).values([
    ...defaultContacts,
    { id: seedMarkerId, label: "system", url: "https://appory.local/system" },
  ]).onConflictDoNothing();
  rows = await db.select().from(apporyBuyViaContactsTable).orderBy(desc(apporyBuyViaContactsTable.createdAt));
  return rows.filter((row) => row.id !== seedMarkerId);
}

router.get("/buy-via-contacts", async (_request, response): Promise<void> => {
  try {
    response.json((await listContacts()).map(toContact));
  } catch {
    response.status(503).json({ message: "Shared Buy via contacts are unavailable." });
  }
});

router.post("/buy-via-contacts", async (request, response): Promise<void> => {
  if (!hasAdminAccess(request)) {
    response.status(401).json({ message: "Admin access required." });
    return;
  }
  const contact = readContact(request.body);
  if (!contact) {
    response.status(400).json({ message: "Invalid Buy via contact." });
    return;
  }

  try {
    const [created] = await db.insert(apporyBuyViaContactsTable).values(contact).returning();
    response.status(201).json(toContact(created));
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      response.status(409).json({ message: "A Buy via contact with this id already exists." });
      return;
    }
    response.status(500).json({ message: "The Buy via contact could not be saved." });
  }
});

router.delete("/buy-via-contacts/:id", async (request, response): Promise<void> => {
  if (!hasOwnerRemovalAccess(request)) {
    response.status(401).json({ message: "Owner removal code required." });
    return;
  }
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  if (!id || id === seedMarkerId) {
    response.status(400).json({ message: "Invalid Buy via contact." });
    return;
  }

  try {
    const [deleted] = await db.delete(apporyBuyViaContactsTable).where(eq(apporyBuyViaContactsTable.id, id)).returning();
    if (!deleted) {
      response.status(404).json({ message: "Buy via contact not found." });
      return;
    }
    response.sendStatus(204);
  } catch {
    response.status(500).json({ message: "The Buy via contact could not be removed." });
  }
});

export default router;