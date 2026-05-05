-- Migration 3: Add DELETE policy for responses so admins can delete participant submissions

CREATE POLICY "Users can delete responses of their projects"
  ON responses FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM questionnaires q
      JOIN projects p ON q.project_id = p.id
      WHERE q.id = responses.questionnaire_id AND p.user_id = auth.uid()
    )
  );
