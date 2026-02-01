# React Patterns

## React 19 with Compiler

The React Compiler is enabled via `babel-plugin-react-compiler`. Prefer compiler-optimized patterns over manual memoization (`useMemo`, `useCallback`, `React.memo`). The compiler handles these optimizations automatically.

## Minimal useEffect

Only use `useEffect` when absolutely necessary. Prefer:

- **TanStack Query hooks** (`useQuery`, `useMutation`) for server state
- **Convex hooks** (`useQuery`, `useMutation` from `convex/react`) for real-time data
- **React 19 features** like `useActionState`, `useOptimistic`, and `useFormStatus` for form handling
- **TanStack Router loaders** for route-level data fetching

If you find yourself reaching for `useEffect`, consider if the problem can be solved with:
- Event handlers (user interactions)
- TanStack Query/Convex hooks (data synchronization)
- Router loaders (initial data loading)
- React 19 built-in hooks (forms, optimistic updates)

## Component Patterns

- Use function components exclusively
- Leverage React Compiler optimizations (no manual memoization needed)
- Prefer composition over complex prop drilling
- Use TanStack Router's file-based routing in `src/routes/`
- Prefer single file components unless it makes a lot of sense to keep in same file and is very small, once a .tsx file starts to get more than ~500 loc consider if we should start to split it up but only do so if it makes sense to

## State Management

- **Server state**: TanStack Query + Convex hooks
- **Form state**: TanStack React Form
- **Local UI state**: `useState` (React Compiler will optimize)
- **Route state**: TanStack Router's built-in state management
