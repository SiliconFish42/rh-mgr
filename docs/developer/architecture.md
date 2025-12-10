# Architecture

**rh-mgr** is a hybrid application built with:

- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (bootstrapped with Vite).
- **Backend / Host**: [Tauri](https://tauri.app/) (Rust).
- **Database**: SQLite (local storage for library metadata).

## Core Components

### Frontend (`/src`)
- **React Components**: The UI is built with functional components and hooks.
- **Tailwind CSS**: Used for styling.
- **Radix UI**: Provides accessible UI primitives (dialogs, tooltips, etc.).

### Backend (`/src-tauri`)
- **Tauri Commands**: Functions exposed from Rust to the frontend (e.g., `patch_rom`, `launch_emulator`).
- **Patching Logic**: Rust implementation of IPS/BPS/UPS patching (using existing crates or custom logic).
- **Database**: `rusqlite` handles interactions with the local SQLite DB.

## Data Flow

1. **User Action**: User clicks "Patch" in UI.
2. **IPC**: Frontend invokes a Tauri command (`invoke('patch_hack', ...)`).
3. **Rust Backend**:
   - Downloads file.
   - Reads clean ROM.
   - Applies patch.
   - Writes new file.
   - Updates SQLite database.
4. **Response**: Backend returns success/failure to UI.
