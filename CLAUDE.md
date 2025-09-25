# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PopWork is a French web agency management application built with Next.js 15, TypeScript, and Supabase. The project follows a feature-based architecture and is currently in Phase 1 development, focusing on foundational components and authentication setup.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

### Environment Setup
Required environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
RESEND_API_KEY=your_resend_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Architecture & Code Organization

### Feature-Based Structure
The codebase follows a feature-based architecture where related functionality is grouped together:

```
src/
├── app/                    # Next.js App Router pages
├── components/             # Shared UI components (ShadCN-based)
├── features/              # Feature-specific code
│   ├── auth/              # Authentication logic
│   ├── clients/           # Client management (companies, contacts, services)
│   ├── projects/          # Project management
│   ├── dashboard/         # Dashboard functionality
│   └── admin/             # Admin features
├── lib/                   # Utilities and configurations
├── shared/                # Shared types and utilities
└── hooks/                 # Global custom hooks
```

### Key Architectural Patterns

**Component Structure**: Each feature contains:
- `components/` - React components specific to the feature
- `hooks/` - Custom hooks for data fetching and state management
- Feature components are prefixed with the feature name (e.g., `project-management-final.tsx`)

**UI Framework**: Built on ShadCN UI components with Radix UI primitives and Tailwind CSS v4. All UI components are in `src/components/ui/` and follow ShadCN conventions.

**Data Layer**: 
- Supabase client configuration in `src/lib/supabase.ts`
- Database types defined in `src/shared/types/database.ts`
- Custom hooks handle data fetching (e.g., `use-dashboard-data.ts`, `use-projects.ts`)

**Authentication**: Uses Supabase Auth with custom hooks in `src/features/auth/hooks/use-auth.ts`

### Navigation & Layout
- App uses a sidebar layout with `AppSidebar` component
- Main navigation defined in `src/components/app-sidebar.tsx` with static menu structure
- Dashboard layout uses ShadCN sidebar components with responsive design

## Development Standards

### Code Conventions
- **TypeScript strict mode enabled**
- **Feature-based organization** - keep related code together
- **Component naming**: Use descriptive names with feature prefixes
- **Custom hooks** for data fetching and business logic
- **Maximum function length**: 30 lines
- **Maximum file length**: 300 lines

### Page Creation Template
**CRITICAL**: Every new page MUST use the PageLayout component to integrate properly with the app layout.

**PREFERRED METHOD** - Use the PageLayout wrapper:
```tsx
import { PageLayout } from "@/components/PageLayout"
import { YourPageComponent } from "@/features/your-feature/components/YourPageComponent"

export default function YourPage() {
  return (
    <PageLayout>
      <YourPageComponent />
    </PageLayout>
  )
}
```

**ALTERNATIVE METHOD** - Manual layout (only if you need custom layout logic):
```tsx
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { YourPageComponent } from "@/features/your-feature/components/YourPageComponent"

export default function YourPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <YourPageComponent />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**NEVER create pages that replace the entire layout** - always use PageLayout or the manual template to maintain:
- Main navigation sidebar (AppSidebar)
- Site header (SiteHeader)  
- Consistent spacing and responsive design
- Container queries (@container/main)

This pattern ensures pages integrate seamlessly with the existing app layout rather than opening in "full-screen" mode.

### UI/UX Patterns
- **Responsive design** with Tailwind CSS container queries (`@container`)
- **Loading states** with skeleton components for better UX
- **Error handling** with Alert components
- **Form validation** using Zod schemas with React Hook Form
- **Icons** from Lucide React - ALWAYS use lucide-react icons, NEVER use @tabler/icons-react

### Database Integration
- All database types are centrally defined in `src/shared/types/database.ts`
- Supabase client creation follows SSR patterns
- Authentication state managed through `useAuth` hook
- Custom hooks for each data domain (projects, companies, etc.)

## Current Development Phase

**Phase 1 Status**: Basic foundation complete, working on authentication and database setup
- ✅ Next.js 15 setup with TypeScript
- ✅ ShadCN UI configuration
- ✅ Feature-based architecture
- ✅ Dashboard layout and navigation
- 🔄 Supabase authentication implementation
- 🔄 Database schema and RLS setup

## Cursor Rules Integration

The project includes Cursor IDE rules:
- Todo validation workflow in `.cursor/rules/todo.mdc` - always ask for user validation before completing todos
- Meta generator rules for creating new cursor rules in `.cursor/rules/meta-generator.mdc`

## Testing & Quality

Currently no testing framework is configured. When implementing tests:
- Check existing project structure first
- Follow the feature-based organization
- Look for existing test patterns before adding new ones

## Workflow modification

**Critical Rule**  
Always read **at least 3 relevant sources** (files/docs/schemas) before using MCP.  
This ensures consistency, patterns, and prevents breaking changes.  

### Workflow
1. **Read ≥3 sources** (similar files + docs/schema)  
2. **Pick server**:  
   - **shadcn** → UI/components  
   - **supabase** → DB/policies  
   - **context7** → context lookup/examples  
3. **Draft a short plan** (purpose, files, side effects, rollback)  
4. **Preview first** (dry-run/diff)  
5. **Small changes only**, commit atomically  
6. **Verify**: build/tests pass, no secrets exposed, tokens/a11y respected  
7. **Document**: add note + list files read in PR  

### Safeguards
- Never expose `service_role` on client  
- No overwriting existing components without review  
- If context unclear → stop and read more sources  
