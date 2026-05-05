-- Migration script to add 'order_index' to prompts table for drag and drop sorting

-- 1. Add order_index to prompts
ALTER TABLE prompts ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
