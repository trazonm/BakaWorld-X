# BakaWorld χ - Project Structure

This document outlines the organized structure of the BakaWorld χ SvelteKit application, following industry standards and best practices.

## 📁 Directory Structure

```
src/
├── lib/                          # Reusable library code
│   ├── components/              # UI Components
│   │   ├── DownloadRow.svelte
│   │   ├── DownloadsTable.svelte
│   │   ├── SearchModal.svelte
│   │   ├── SearchTable.svelte
│   │   ├── TorrentActionButton.svelte
│   │   └── TorrentRow.svelte
│   ├── composables/             # Reusable logic hooks
│   │   ├── useDownloadManager.ts
│   │   └── useTorrentManager.ts
│   ├── constants/               # Application constants
│   │   └── index.ts
│   ├── config/                  # Configuration settings
│   │   └── index.ts
│   ├── errors/                  # Error handling utilities
│   │   └── index.ts
│   ├── server/                  # Server-side utilities
│   │   ├── db.ts
│   │   ├── jwt.ts
│   │   ├── session.ts
│   │   └── userModel.ts
│   ├── services/                # API service layer
│   │   ├── downloadService.ts
│   │   └── torrentService.ts
│   ├── stores/                  # Svelte stores
│   │   ├── auth.ts
│   │   └── ui.ts
│   ├── utils/                   # Utility functions
│   │   ├── data.ts
│   │   ├── dom.ts
│   │   └── format.ts
│   ├── validators/              # Input validation
│   │   └── index.ts
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Re-exports for backward compatibility
├── routes/                      # SvelteKit routes
│   ├── api/                     # API endpoints
│   │   ├── auth/
│   │   ├── downloads/
│   │   ├── realdebrid/
│   │   ├── search/
│   │   └── torrents/
│   ├── brain/
│   ├── downloads/
│   ├── home/
│   ├── hosterizer/
│   ├── +layout.svelte
│   └── +page.svelte
├── app.css
├── app.d.ts
└── app.html
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **Components**: Pure UI components with minimal logic
- **Composables**: Reusable business logic
- **Services**: API communication and data handling
- **Stores**: Global state management
- **Utils**: Pure utility functions

### 2. **Modular Design**
- Each module has a single responsibility
- Components are small and focused
- Logic is extracted into composables
- Services abstract API calls

### 3. **Type Safety**
- Comprehensive TypeScript types in `types.ts`
- Proper typing for all functions and components
- Validation schemas for data integrity

### 4. **Error Handling**
- Custom error classes with specific error types
- Centralized error handling utilities
- Proper error boundaries in components

## 📋 Component Guidelines

### Component Structure
```typescript
<script lang="ts">
	// 1. Imports (external libraries, then internal)
	// 2. Props/exports
	// 3. Local state
	// 4. Reactive statements
	// 5. Functions
	// 6. Lifecycle hooks
</script>

<!-- HTML Template -->

<style>
	/* Component-specific styles */
</style>
```

### Composable Pattern
```typescript
export function useFeatureName() {
	// State management
	// Business logic
	// Side effects
	// Return public API
	return {
		// ... exposed state and methods
	};
}
```

## 🔄 Data Flow

1. **User Interaction** → Component
2. **Component** → Composable
3. **Composable** → Service
4. **Service** → API/Backend
5. **Response** → Service → Composable → Store/State
6. **State Change** → Component Re-render

## 📦 Dependencies

### Core
- **SvelteKit**: Full-stack framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling

### UI Components
- **Flowbite Svelte**: Component library
- **Flowbite Icons**: Icon set

### Backend
- **PostgreSQL**: Database
- **JWT**: Authentication
- **bcrypt**: Password hashing

## 🚀 Development Guidelines

### Adding New Features
1. Define types in `types.ts`
2. Create service methods in appropriate service file
3. Build composable for business logic
4. Create UI components
5. Wire up in routes/pages

### Best Practices
- Use TypeScript everywhere
- Implement proper error handling
- Add validation for user inputs
- Keep components small and focused
- Use semantic HTML
- Follow accessibility guidelines
- Write self-documenting code

## 🧪 Testing Strategy
- Unit tests for utilities and services
- Component testing for UI components
- Integration tests for API endpoints
- E2E tests for critical user flows

## 📈 Performance Considerations
- Lazy load components when possible
- Use Svelte's reactive features efficiently
- Implement proper caching in services
- Optimize bundle size
- Use proper loading states
