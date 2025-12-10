# Building & Release

## Building for Production

To create an optimized build of the application:

```bash
npm run tauri build
```

This command:
1. Builds the React frontend (`npm run build`).
2. Compiles the Rust backend in release mode.
3. Bundles the application into an installer or executable (DMG, MSI, Deb, AppImage) based on your OS.

The output artifacts will be in `src-tauri/target/release/bundle/`.