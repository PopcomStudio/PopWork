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

### UI/UX Patterns
- **Responsive design** with Tailwind CSS container queries (`@container`)
- **Loading states** with skeleton components for better UX
- **Error handling** with Alert components
- **Form validation** using Zod schemas with React Hook Form
- **Icons** from Tabler Icons React

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