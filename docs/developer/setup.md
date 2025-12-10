# Developer Setup

## Prerequisites

- **Node.js**: v18 or newer.
- **Rust**: Latest stable release (install via [rustup](https://rustup.rs/)).
- **OS Dependencies**:
  - **macOS**: Xcode Command Line Tools.
  - **Linux**: Build essentials, webkit2gtk, etc. (Check Tauri docs).
  - **Windows**: C++ Build Tools.

## Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rh-mgr.git
   cd rh-mgr
   ```

2. Install NPM packages:
   ```bash
   npm install
   ```

3. Run the dev server:
   ```bash
   npm run tauri dev
   ```
   This will start the Vite server and the Tauri application window.

## VS Code Recommended

We recommend VS Code with the following extensions:
- **Rust-analyzer**
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier**
