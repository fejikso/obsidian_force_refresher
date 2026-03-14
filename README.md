# Force Refresh

[Source Code](https://github.com/fejikso/obsidian_force_refresher)

This plugin forces a manual refresh of the filesystem and vault index in Obsidian. It is specifically designed for vaults hosted on network mounts (SMB/CIFS) or any environment where automatic file system events are not reliably propagated.

## Features

- **Ribbon Icon**: Quick access to trigger a filesystem refresh.
- **Focused Refresh Command**:
    1. Forces a low-level disk scan (`scanRecursive`).
    2. Notifies the Obsidian indexer of every file (`onExternalModify`).
    3. Refreshes the File Explorer UI sidebar.
- **Settings**: Toggle completion notifications.

## Manual Installation

Since this plugin is not yet on the community store, you can install it manually:

1.  Open your Obsidian vault.
2.  Navigate to your vault's plugin folder: `<VaultName>/.obsidian/plugins/`.
3.  Create a new folder named `obsidian-force-refresh` inside it.
4.  Copy the following files into that folder:
    - `main.js`
    - `manifest.json`
5.  In Obsidian, go to **Settings > Community Plugins**.
6.  Click the **Refresh** button (or restart Obsidian).
7.  Find **Force Refresh** in the list and toggle it to **Enabled**.

## How to Use

### Quick Refresh
Click the **Refresh (circular arrow)** icon in the left-hand ribbon. This will scan your vault for changes and update the sidebar.

### Command Palette
Open the Command Palette (`Ctrl+P` or `Cmd+P`) and search for:
- `Force Refresh`: Performs the focused background scan.

## Troubleshooting

If you encounter an error (e.g., "Error during filesystem refresh"), you can check the logs for detailed information:

1.  Press `Ctrl + Shift + I` (on Windows/Linux) or `Cmd + Option + I` (on macOS) to open the **Developer Tools**.
2.  Click on the **Console** tab.
3.  Look for messages starting with `Force Refresh:`. Any crimson-colored error messages will contain a stack trace that helps in identifying the exact cause.

## Development

If you want to build the plugin from source:

```bash
npm install --no-bin-links
node esbuild.js production
```

*(Note: `--no-bin-links` is recommended if your development environment is also on an SMB share to avoid symlink errors).*

## License
MIT
