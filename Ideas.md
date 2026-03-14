The reason your SMB mount fails to trigger automatic updates is that Obsidian (and its underlying library, `chokidar`) relies on file system events like `inotify` (Linux) or `FSEvents` (macOS), which are often not propagated over network protocols like SMB/CIFS.

To build this, you can use the Obsidian API to manually trigger a re-scan. There are two primary ways to approach this depending on how "deep" you want the refresh to go.

### 1. The "Nuclear" Option: App Reload

The simplest way to force a full refresh of everything (filesystem, metadata, and UI) is to trigger a reload of the application. This is equivalent to pressing `Ctrl+R`.

```typescript
this.addCommand({
    id: 'force-reload-app',
    name: 'Force Reload App',
    callback: () => {
        // @ts-ignore - Internal command
        this.app.commands.executeCommandById('app:reload');
    }
});

```

### 2. The Focused Option: Filesystem Scan

If you want to avoid a full UI reload and only refresh the vault index, you can manually iterate through the filesystem using the `DataAdapter` and notify the `Vault` of any changes. This is more efficient for large vaults.

The logic involves using `app.vault.adapter.listRecursive('')` to get the current state of the disk and then notifying Obsidian of external modifications.

#### Implementation Logic

You can add a command to your plugin's `onload` method:

```typescript
this.addCommand({
    id: 'force-filesystem-refresh',
    name: 'Force Filesystem Refresh',
    callback: async () => {
        const { vault } = this.app;
        
        // 1. Force a recursive list from the adapter (low-level disk access)
        const entries = await vault.adapter.listRecursive('');
        
        // 2. Notify the vault to check these paths
        // This triggers Obsidian to reconcile its internal TFile map with the disk
        for (const path of entries.files) {
            // Accessing internal method to trigger external modification logic
            (vault as any).onExternalModify(path);
        }
        
        // 3. (Optional) Refresh the File Explorer view specifically
        const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
        if (fileExplorer) {
            (fileExplorer.view as any).requestPopulate();
        }
        
        new Notice('Filesystem refresh complete.');
    }
});

```

### Key API Points for SMB

* **`app.vault.adapter.listRecursive('')`**: This forces the adapter to talk to the OS/Network drive to get the actual file list, bypassing any stale caches.
* **`app.vault.onExternalModify(path)`**: This is the internal method Obsidian uses when it *actually* detects a change. By calling it manually, you force the indexer to look at that file.
* **`app.metadataCache.rebuildIndex()`**: If you find that links or search are still out of sync, you can call this internal method to rebuild the metadata cache, though it is resource-intensive for very large vaults.

### Existing Community Reference

There is a plugin called **"File Explorer Reload"** by developer *mnaoumov* (available on GitHub and via BRAT) that implements this exact logic to solve the "bulk operation/SMB" problem. You might find its source code useful as a reference for handling edge cases like folder deletions or renamed files on network shares.