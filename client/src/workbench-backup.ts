export interface WorkbenchBackup {
  format: string; owner: string; at: string; runIds: string[]; resultIds: string[]; templateKeys: string[]; noteKeys: string[];
  iv: string; tag: string; encrypted: string;
}
// IndexedDB handles workbook/photo sizes without localStorage's small limit.
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('api-uat-private-backups', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('archives');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser backup storage is unavailable.'));
  });
}
export async function readBackup(owner: string): Promise<WorkbenchBackup | null> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('archives').objectStore('archives').get(owner);
    request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(new Error('Could not read the browser backup.'));
  }); } finally { db.close(); }
}
export async function writeBackup(archive: WorkbenchBackup): Promise<void> {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('archives', 'readwrite');
    transaction.objectStore('archives').put(archive, archive.owner);
    transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(new Error('Could not save the browser backup. Check browser storage space.'));
  }); } finally { db.close(); }
}
