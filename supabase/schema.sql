-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  criteria_settings JSONB NOT NULL DEFAULT '["Audio Fidelity", "Prompt Adherence", "Musicality", "Overall"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Questionnaires Table
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'audio', -- 'audio', 'text', 'single_choice'
  order_index INTEGER NOT NULL DEFAULT 0,
  options JSONB, -- For single_choice
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Audio Variants Table
CREATE TABLE IF NOT EXISTS audio_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Responses Table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES audio_variants(id) ON DELETE CASCADE, -- Nullable for text/choice blocks
  criteria_scores JSONB NOT NULL, -- e.g., {"Audio Fidelity": 4, "Prompt Adherence": 5}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Policies for Admins (Authenticated Users)
-- We assume any logged-in user can manage their own projects and the nested entities
CREATE POLICY "Users can manage their own projects"
  ON projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage questionnaires of their projects"
  ON questionnaires FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE id = questionnaires.project_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can manage prompts of their questionnaires"
  ON prompts FOR ALL USING (
    EXISTS (
      SELECT 1 FROM questionnaires q 
      JOIN projects p ON q.project_id = p.id 
      WHERE q.id = prompts.questionnaire_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage audio variants of their prompts"
  ON audio_variants FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prompts pr 
      JOIN questionnaires q ON pr.questionnaire_id = q.id 
      JOIN projects p ON q.project_id = p.id 
      WHERE pr.id = audio_variants.prompt_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view responses to their projects"
  ON responses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questionnaires q 
      JOIN projects p ON q.project_id = p.id 
      WHERE q.id = responses.questionnaire_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete responses of their projects"
  ON responses FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM questionnaires q
      JOIN projects p ON q.project_id = p.id
      WHERE q.id = responses.questionnaire_id AND p.user_id = auth.uid()
    )
  );

-- Policies for Public Users (Participants)
-- Public can read projects, questionnaires, prompts, audio variants IF the project is published.
CREATE POLICY "Public can view published projects"
  ON projects FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public can view questionnaires of published projects"
  ON questionnaires FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = questionnaires.project_id AND is_published = TRUE)
  );

CREATE POLICY "Public can view prompts of published projects"
  ON prompts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questionnaires q 
      JOIN projects p ON q.project_id = p.id 
      WHERE q.id = prompts.questionnaire_id AND p.is_published = TRUE
    )
  );

CREATE POLICY "Public can view audio variants of published projects"
  ON audio_variants FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prompts pr 
      JOIN questionnaires q ON pr.questionnaire_id = q.id 
      JOIN projects p ON q.project_id = p.id 
      WHERE pr.id = audio_variants.prompt_id AND p.is_published = TRUE
    )
  );

-- Public can insert responses (no reading others' responses)
CREATE POLICY "Public can insert responses"
  ON responses FOR INSERT WITH CHECK (TRUE);

-- Storage bucket for audio files
-- Insert this bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Authenticated users can upload audio files"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio-files');

CREATE POLICY "Public can read audio files"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'audio-files');

CREATE POLICY "Authenticated users can delete their uploaded audio files"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'audio-files');
