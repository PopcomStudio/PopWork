-- Add language preference to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'fr';

-- Add check constraint for language preference
ALTER TABLE public.profiles
ADD CONSTRAINT valid_language_preference CHECK (language_preference IN ('fr', 'en'));

-- Create index for language preference for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_language_preference ON public.profiles(language_preference);