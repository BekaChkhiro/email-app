import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================
// USERS TABLE
// =====================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================
// CLIENTS TABLE
// =====================
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 500 }),
    category: varchar("category", { length: 300 }),
    city: varchar("city", { length: 100 }),
    address: text("address"),
    identificationCode: varchar("identification_code", { length: 50 }),
    phonePrimary: varchar("phone_primary", { length: 50 }),
    phoneSecondary: varchar("phone_secondary", { length: 50 }),
    phoneTertiary: varchar("phone_tertiary", { length: 50 }),
    email: varchar("email", { length: 255 }),
    emailSecondary: varchar("email_secondary", { length: 255 }),
    website: varchar("website", { length: 500 }),
    facebook: varchar("facebook", { length: 500 }),
    directorName: varchar("director_name", { length: 255 }),
    legalForm: varchar("legal_form", { length: 100 }),
    companyNameAlt: varchar("company_name_alt", { length: 500 }),
    link08: varchar("link_08", { length: 500 }),
    status: varchar("status", { length: 20 }).default("active"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_clients_email_unique").on(table.email),
    index("idx_clients_company").on(table.companyName),
    index("idx_clients_category").on(table.category),
    index("idx_clients_city").on(table.city),
    index("idx_clients_status").on(table.status),
  ]
);

// =====================
// EMAIL TEMPLATES TABLE
// =====================
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("html_content").notNull(),
  plainContent: text("plain_content"),
  variables: text("variables").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================
// CAMPAIGNS TABLE
// =====================
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id),
  status: varchar("status", { length: 20 }).default("draft"),
  dailyLimit: integer("daily_limit").default(10),
  sendStartHour: integer("send_start_hour").default(9),
  sendEndHour: integer("send_end_hour").default(18),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// =====================
// CAMPAIGN RECIPIENTS TABLE
// =====================
export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 20 }).default("pending"),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("idx_campaign_recipient_unique").on(
      table.campaignId,
      table.clientId
    ),
    index("idx_campaign_recipients_status").on(table.campaignId, table.status),
  ]
);

// =====================
// EMAIL HISTORY TABLE
// =====================
export const emailHistory = pgTable(
  "email_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    templateId: uuid("template_id").references(() => emailTemplates.id),
    subject: varchar("subject", { length: 500 }),
    contentPreview: text("content_preview"),
    resendMessageId: varchar("resend_message_id", { length: 100 }),
    status: varchar("status", { length: 20 }).default("sent"),
    sentAt: timestamp("sent_at").defaultNow(),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
  },
  (table) => [
    index("idx_email_history_client").on(table.clientId),
    index("idx_email_history_campaign").on(table.campaignId),
  ]
);

// =====================
// CLIENT NOTES TABLE
// =====================
export const clientNotes = pgTable("client_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  note: text("note").notNull(),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================
// RELATIONS
// =====================
export const clientsRelations = relations(clients, ({ many }) => ({
  emailHistory: many(emailHistory),
  notes: many(clientNotes),
  campaignRecipients: many(campaignRecipients),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  campaigns: many(campaigns),
  emailHistory: many(emailHistory),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  template: one(emailTemplates, {
    fields: [campaigns.templateId],
    references: [emailTemplates.id],
  }),
  recipients: many(campaignRecipients),
  emailHistory: many(emailHistory),
}));

export const campaignRecipientsRelations = relations(
  campaignRecipients,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignRecipients.campaignId],
      references: [campaigns.id],
    }),
    client: one(clients, {
      fields: [campaignRecipients.clientId],
      references: [clients.id],
    }),
  })
);

export const emailHistoryRelations = relations(emailHistory, ({ one }) => ({
  client: one(clients, {
    fields: [emailHistory.clientId],
    references: [clients.id],
  }),
  campaign: one(campaigns, {
    fields: [emailHistory.campaignId],
    references: [campaigns.id],
  }),
  template: one(emailTemplates, {
    fields: [emailHistory.templateId],
    references: [emailTemplates.id],
  }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
}));

// =====================
// TYPE EXPORTS
// =====================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type NewCampaignRecipient = typeof campaignRecipients.$inferInsert;

export type EmailHistoryRecord = typeof emailHistory.$inferSelect;
export type NewEmailHistoryRecord = typeof emailHistory.$inferInsert;

export type ClientNote = typeof clientNotes.$inferSelect;
export type NewClientNote = typeof clientNotes.$inferInsert;
