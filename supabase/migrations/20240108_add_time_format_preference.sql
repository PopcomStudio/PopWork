-- Add time format preference column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS time_format_preference TEXT DEFAULT '24h' 
CHECK (time_format_preference IN ('12h', '24h'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.time_format_preference IS 'User preferred time format: 12h (AM/PM) or 24h';