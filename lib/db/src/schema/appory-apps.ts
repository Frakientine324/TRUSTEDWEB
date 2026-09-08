import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apporyAppsTable = pgTable("appory_apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  publisher: text("publisher").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  detail: text("detail").notNull(),
  price: text("price").notNull(),
  size: text("size").notNull(),
  version: text("version").notNull(),
  initials: text("initials").notNull(),
  iconBg: text("icon_bg").notNull(),
  iconFg: text("icon_fg"),
  imageDataUrl: text("image_data_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ApporyAppRow = typeof apporyAppsTable.$inferSelect;