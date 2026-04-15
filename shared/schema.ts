import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * History table — stores every AI generation result.
 * tool: sql | openapi | user-story | acceptance
 * input: JSON string with the user's input params
 * output: the generated text
 * createdAt: unix timestamp (ms)
 */
export const history = sqliteTable('history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tool: text('tool').notNull(),
  title: text('title').notNull(),
  input: text('input').notNull(),   // JSON string
  output: text('output').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const insertHistorySchema = createInsertSchema(history).omit({ id: true });
export const selectHistorySchema = createSelectSchema(history);

export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type SelectHistory = z.infer<typeof selectHistorySchema>;
