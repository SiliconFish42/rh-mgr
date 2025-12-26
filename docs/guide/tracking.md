# Automatic Playtime & Progress Tracking

The Manager includes a powerful feature to automatically track your play sessions and level progress when playing Super Mario World ROM hacks.

## How It Works

The application connects to your SNES emulator using the **usb2snes** protocol (WebSocket). It monitors the game's memory in real-time to detect:

-   **Playtime**: Tracks how long you are actively playing (excluding title screens).
-   **Level Progress**: Detects which level you are in and if you clear it.
-   **Game Identification**: Automatically identifies the running hack.

## Requirements

1.  **Supported Emulator**: You must use an emulator that supports the `usb2snes` protocol.
    -   **RetroArch**: Use the specific standard core or enable Network Control if available.
    -   **snes9x-rr** / **snes9x-nzu**: Supported via Lua scripts or native integration (QUsb2snes).
    -   **Hardware**: sd2snes / FxPak Pro is fully supported.
2.  **Bridge Software**: You likely need [QUsb2snes](https://github.com/Skarsnik/QUsb2snes) or [SNI](https://github.com/alttpo/sni) running to provide the WebSocket interface.

## Configuration

Enable the feature in **Settings**:

1.  Go to **Settings**.
2.  Scroll to **Troubleshooting & Features**.
3.  Check **Enable Automatic Playtime Tracking**.

### Troubleshooting

If tracking is not working:
-   Ensure QUsb2snes is running.
-   Ensure your emulator is connected to QUsb2snes.
-   Check "Enable Debug Logging" in Settings and restart the app to see detailed connection logs in `rh-mgr.log`.

### Supported Games
Currently, this feature is optimized for **Super Mario World** ROM hacks. It uses specific RAM addresses ($7E0100 for Game Mode, etc.) that are standard in SMW.
