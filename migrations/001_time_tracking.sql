-- Create time_entries table for tracking time on tasks
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- Duration in seconds
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);

-- Add RLS (Row Level Security) policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view all time entries for tasks they have access to
CREATE POLICY "Users can view time entries" ON time_entries
  FOR SELECT
  USING (true);

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries" ON time_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own time entries
CREATE POLICY "Users can delete own time entries" ON time_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view to get aggregated time per task
CREATE VIEW task_time_summary AS
SELECT 
  task_id,
  COUNT(DISTINCT user_id) as unique_contributors,
  SUM(duration) as total_duration,
  MIN(start_time) as first_entry,
  MAX(COALESCE(end_time, start_time)) as last_entry
FROM time_entries
WHERE duration IS NOT NULL
GROUP BY task_id;

-- Create a view to get user time summary per task
CREATE VIEW user_task_time_summary AS
SELECT 
  task_id,
  user_id,
  COUNT(*) as entry_count,
  SUM(duration) as total_duration,
  AVG(duration) as avg_duration,
  MIN(start_time) as first_entry,
  MAX(COALESCE(end_time, start_time)) as last_entry
FROM time_entries
WHERE duration IS NOT NULL
GROUP BY task_id, user_id;