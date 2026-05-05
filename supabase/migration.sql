-- Migration script to add 'type' and 'options' to prompts, and make variant_id nullable in responses

-- 1. Add type to prompts
ALTER TABLE prompts ADD COLUMN type TEXT NOT NULL DEFAULT 'audio';

-- 2. Add options to prompts (for single choice blocks)
ALTER TABLE prompts ADD COLUMN options JSONB;

-- 3. Make variant_id in responses nullable
ALTER TABLE responses ALTER COLUMN variant_id DROP NOT NULL;
