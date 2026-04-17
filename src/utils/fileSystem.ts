const FS_DB_NAME = 'exercise-tracker-fs';
const FS_DB_VERSION = 1;
const FS_STORE = 'handles';
const FS_KEY = 'csv-export-handle';

export function openFSDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, FS_DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(FS_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openFSDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const req = tx.objectStore(FS_STORE).get(FS_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openFSDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FS_STORE, 'readwrite');
      const req = tx.objectStore(FS_STORE).put(handle, FS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // IndexedDB unavailable (e.g. private browsing)
  }
}

export function generateExportJSON(
  exercises: Record<string, string[]>,
  completions: Record<string, boolean>,
  goalSettings: Record<string, { enabled: boolean; required: number }>,
  exerciseDescriptions: Record<string, string>,
): string {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), exercises, goalSettings, completions, exerciseDescriptions },
    null,
    2,
  );
}

export function getLastExportInfo(): string {
  const lastExport = localStorage.getItem('lastExportDate');
  if (!lastExport) return 'Never';
  const date = new Date(lastExport);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return `Today at ${time}`;
  if (daysAgo === 1) return `Yesterday at ${time}`;
  return `${daysAgo} days ago at ${time}`;
}
