# Project Roadmap

This document outlines the planned features and improvements for the ROM Hack Manager.

## Upcoming Features

### Automatic Play Time & Game State Tracking

We are investigating the integration of automatic tracking for gameplay metrics using the **`usb2snes`** protocol. This feature aims to provide rich stats without requiring manual user input.

**Planned Capabilities:**
-   **Play Time Tracking:** Automatically record how long you play each hack. Timers will pause when the game is not active (e.g., in title screen or paused, depending on feasibility).
-   **Level Clear Detection:** Automatically detect when a level is cleared by monitoring Super Mario World's RAM for event flags.
-   **Exit Counting:** Track your progress towards automatically.

**Technical Approach:**
-   The app will communicate with a local WebSocket server (provided by tools like QUsb2snes) to read the SNES console/emulator memory.
-   Initial support will target standard Super Mario World RAM addresses.
-   Future updates may allow for custom memory maps for total conversion hacks.

## Future Ideas

### Cloud Synchronization
Sync your library metadata, save files, and play history across multiple devices using a cloud provider (e.g., Google Drive, Dropbox).

### RetroAchievements Integration
View your RetroAchievements progress directly within the manager for supported hacks.
