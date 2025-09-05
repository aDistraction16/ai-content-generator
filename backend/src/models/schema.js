import { pgTable, serial, varchar, text, timestamp, integer, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  sessionToken: varchar('session_token', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content table
export const content = pgTable('content', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  topic: varchar('topic', { length: 255 }).notNull(),
  keyword: varchar('keyword', { length: 255 }),
  generatedText: text('generated_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  scheduledAt: timestamp('scheduled_at'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'scheduled', 'posted_simulated'
  potentialReachMetric: integer('potential_reach_metric').default(0),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'blog_post', 'social_caption'
  platformTarget: varchar('platform_target', { length: 50 }), // 'Twitter', 'LinkedIn', 'Facebook', etc.
  wordCount: integer('word_count').default(0),
  characterCount: integer('character_count').default(0),
  userEdited: boolean('user_edited').default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reports table
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  reportDate: timestamp('report_date').defaultNow().notNull(),
  totalContentGenerated: integer('total_content_generated').default(0),
  totalPotentialReach: integer('total_potential_reach').default(0),
  pdfReportPath: varchar('pdf_report_path', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Usage Tracking (for rate limiting and analytics)
export const userUsage = pgTable('user_usage', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  date: timestamp('date').defaultNow().notNull(),
  contentGenerationsCount: integer('content_generations_count').default(0),
  apiCallsCount: integer('api_calls_count').default(0),
});

// Content Templates table
export const contentTemplates = pgTable('content_templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  contentType: varchar('content_type', { length: 50 }).notNull(), // 'blog_post', 'social_caption', etc.
  platformTarget: varchar('platform_target', { length: 50 }).notNull(), // 'twitter', 'linkedin', etc.
  template: text('template').notNull(), // The template content with variables like {{name}}, {{topic}}
  variables: text('variables').default('[]'), // JSON array of variable definitions
  isPublic: boolean('is_public').default(false), // Whether other users can use this template
  useCount: integer('use_count').default(0), // How many times this template has been used
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  content: many(content),
  reports: many(reports),
  usage: many(userUsage),
  templates: many(contentTemplates),
}));

export const contentRelations = relations(content, ({ one }) => ({
  user: one(users, {
    fields: [content.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
}));

export const userUsageRelations = relations(userUsage, ({ one }) => ({
  user: one(users, {
    fields: [userUsage.userId],
    references: [users.id],
  }),
}));

export const contentTemplatesRelations = relations(contentTemplates, ({ one }) => ({
  user: one(users, {
    fields: [contentTemplates.userId],
    references: [users.id],
  }),
}));
