/**
 * Clears media/assets caches only.
 * It intentionally preserves registration identity (screen code, Firebase linkage, config).
 */
export async function clearApplicationCaches(): Promise<void> {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        (dbs || []).map((d) => {
          if (d.name) return new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(d.name!);
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve();
            req.onsuccess = () => resolve();
          });
          return Promise.resolve();
        })
      );
    }
  } catch (e) {
    console.warn('IndexedDB cleanup failed:', e);
  }

  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (e) {
    console.warn('CacheStorage cleanup failed:', e);
  }

  try {
    if (window.electronAPI?.clearMediaCacheDir) {
      await window.electronAPI.clearMediaCacheDir();
    }
  } catch (e) {
    console.warn('Media cache dir clear failed:', e);
  }
}
