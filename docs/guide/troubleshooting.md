# Troubleshooting

Common issues and solutions.

## ROM Validation Failed

**Error**: "Invalid MD5 hash" or "ROM Validation Failed".

**Solution**:
The application requires a specific version of the Super Mario World ROM (US, Headerless).
- Check your ROM's MD5 hash online or using a tool. It must be `cdd3c8c37322978ca8669b34bc89c804`.
- If your ROM has a header, you might need to remove it using a tool like TUSH.

## Emulator Not Launching

**Error**: Nothing happens when clicking "Play".

**Solution**:
1. Go to **Settings**.
2. Check the **Emulator Path**.
3. Ensure the path points to the actual executable (e.g., `snes9x.exe` or `Snes9x.app`), not a shortcut or folder.

## Database Sync Issues

**Error**: "Failed to fetch hacks" or "Sync failed".

**Solution**:
- Check your internet connection.
- The SMW Central API might be down or rate-limiting requests. Wait a few minutes and try again.
