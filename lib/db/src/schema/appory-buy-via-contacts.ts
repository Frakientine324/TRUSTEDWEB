import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apporyBuyViaContactsTable = pgTable("appory_buy_via_contacts", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ApporyBuyViaContactRow = typeof apporyBuyViaContactsTable.$inferSelect;