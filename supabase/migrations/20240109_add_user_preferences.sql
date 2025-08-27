-- Add calendar preferences and theme preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS week_start_day TEXT DEFAULT 'monday' 
CHECK (week_start_day IN ('monday', 'sunday', 'saturday')),
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 5 
CHECK (working_days IN (5, 6, 7)),
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' 
CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Add comments for documentation
COMMENT ON COLUMN profiles.week_start_day IS 'User preferred first day of week: monday, sunday, or saturday';
COMMENT ON COLUMN profiles.working_days IS 'Number of working days in the week: 5, 6, or 7';
COMMENT ON COLUMN profiles.theme_preference IS 'User preferred theme: light, dark, or system';