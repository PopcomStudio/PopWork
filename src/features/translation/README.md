# Translation Feature

## Overview

The translation feature provides multi-language support for the PopWork application with manual translations for all interface elements.

## Features

- 🌍 **Multi-language Support**: Currently supports French (default) and English
- 💾 **Persistent Settings**: Language preference saved to user profile
- 🎨 **Easy Integration**: Simple hook-based API for components
- ⚡ **Instant Switching**: Change language without page reload

## Usage

### In Components

```tsx
import { useTranslation } from "@/features/translation/hooks/use-translation"

export function MyComponent() {
  const { t, language, setLanguage } = useTranslation()
  
  return (
    <div>
      <h1>{t("dashboard.welcome", { name: "John" })}</h1>
      <p>{t("common.save")}</p>
    </div>
  )
}
```

### Translation Keys

Translation files are organized by feature/domain:
- `common.*` - Common UI elements (save, cancel, delete, etc.)
- `navigation.*` - Navigation items
- `settings.*` - Settings page
- `auth.*` - Authentication flows
- `dashboard.*` - Dashboard content
- `projects.*` - Project management
- `clients.*` - Client management
- `calendar.*` - Calendar functionality
- `tasks.*` - Task management
- `messages.*` - User messages/notifications

### Adding New Languages

1. Create a new translation file: `src/features/translation/translations/[lang].json`
2. Import the file in `translation-context.tsx`
3. Add the language to `availableLanguages` array
4. Update the Language type to include the new language code
5. Update the database constraint to allow the new language

### Translation Files Structure

Each translation file follows a nested JSON structure:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "projects": "Projects"
  }
}
```

## Database Schema

```sql
-- profiles table extension
language_preference TEXT DEFAULT 'fr'
```

## Best Practices

1. **Use semantic keys**: `settings.sections.account.title` instead of `account_settings_title`
2. **Group related translations**: Keep translations organized by feature
3. **Provide context**: Use descriptive keys that indicate usage
4. **Support parameters**: Use `{{param}}` syntax for dynamic content
5. **Fallback to English**: Missing translations automatically fall back to English, then to the key itself
6. **Keep translations complete**: Ensure all keys exist in all language files

## Performance

- Translation files are loaded once and cached
- Language switching is instant (no page reload required)
- Settings persist to localStorage for immediate loading
- Database sync happens asynchronously

## File Organization

```
src/features/translation/
├── translations/
│   ├── fr.json          # French translations
│   └── en.json          # English translations
├── contexts/
│   └── translation-context.tsx  # Translation provider and logic
├── hooks/
│   └── use-translation.ts      # Hook export
└── README.md                    # This file
```