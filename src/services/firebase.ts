import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get, Database } from 'firebase/database';
import type { FirebaseScreen } from '../types';
import config from '../../config.json';

let database: Database | null = null;

export function initializeFirebase() {
  try {
    const app = initializeApp(config.firebaseConfig);
    database = getDatabase(app);
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
}

export function createScreenInFirebase(screenCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) {
      reject(new Error('Firebase not initialized'));
      return;
    }

    const remoteAccessId = generateRemoteAccessId();
    const now = Date.now();
    const screenData: FirebaseScreen = {
      connected: false,
      hasPlaylist: false,
      clearCache: false,
      lastActive: now,
      lastUpdated: now,
      location: '',
      name: '',
      online: true,
      playlistIds: '',
      remote_access_id: remoteAccessId,
      screen_code: screenCode,
      status: 'inActive',
    };

    const screenRef = ref(database, `screens/${screenCode}`);
    set(screenRef, screenData)
      .then(() => {
        console.log('Screen created in Firebase:', screenCode);
        resolve();
      })
      .catch((error) => {
        console.error('Error creating screen in Firebase:', error);
        reject(error);
      });
  });
}

export function isScreenDataComplete(data: FirebaseScreen | null): boolean {
  if (!data) return false;

  return (
    typeof data.screen_code === 'string' &&
    data.screen_code.length > 0 &&
    typeof data.remote_access_id === 'string' &&
    data.remote_access_id.length > 0 &&
    typeof data.connected === 'boolean' &&
    typeof data.hasPlaylist === 'boolean' &&
    typeof data.lastUpdated === 'number' &&
    typeof data.status === 'string' &&
    typeof data.name === 'string' &&
    typeof data.location === 'string' &&
    typeof data.playlistIds === 'string'
  );
}

export type ScreenListenEvent = 'value' | 'removed' | 'listen_error';

export function listenToScreenChanges(
  screenCode: string,
  callback: (data: FirebaseScreen | null, event: ScreenListenEvent) => void
): () => void {
  if (!database) {
    console.error('Firebase not initialized');
    return () => {};
  }

  const screenRef = ref(database, `screens/${screenCode}`);

  const unsubscribe = onValue(screenRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null, 'removed');
      return;
    }
    callback(snapshot.val() as FirebaseScreen, 'value');
  }, (error) => {
    console.error('Firebase listener error:', error);
    callback(null, 'listen_error');
  });

  return unsubscribe;
}

/** Sync CMS pairing state when the screen no longer exists on the API. */
export function updateScreenConnected(screenCode: string, connected: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) {
      reject(new Error('Firebase not initialized'));
      return;
    }

    const connectedRef = ref(database, `screens/${screenCode}/connected`);
    set(connectedRef, connected)
      .then(() => resolve())
      .catch((error) => {
        console.error('Error updating connected status:', error);
        reject(error);
      });
  });
}

/** Single-field write for activity tracking (CMS active / inactive). */
export function updateScreenClearCache(screenCode: string, clearCache: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) {
      resolve();
      return;
    }

    const refPath = ref(database, `screens/${screenCode}/clearCache`);
    set(refPath, clearCache)
      .then(() => resolve())
      .catch((error) => {
        console.error('Error updating clearCache flag:', error);
        reject(error);
      });
  });
}

export function updateScreenLastActive(screenCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) {
      resolve();
      return;
    }

    const screenRef = ref(database, `screens/${screenCode}`);
    get(screenRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          // Avoid creating partial screen records from heartbeat writes.
          resolve();
          return;
        }

        const lastActiveRef = ref(database, `screens/${screenCode}/lastActive`);
        set(lastActiveRef, Date.now()).then(() => resolve()).catch((error) => {
          console.warn('lastActive update skipped:', error);
          resolve();
        });
      })
      .catch((error) => {
        console.warn('lastActive existence check skipped:', error);
        resolve();
      });
  });
}

export function updateScreenOnlineStatus(screenCode: string, online: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!database) {
      reject(new Error('Firebase not initialized'));
      return;
    }

    const screenRef = ref(database, `screens/${screenCode}`);
    get(screenRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          // Do not create incomplete records by writing a child field first.
          resolve();
          return;
        }

        const onlineRef = ref(database, `screens/${screenCode}/online`);
        set(onlineRef, online)
          .then(() => resolve())
          .catch((error) => {
            console.error('Error updating online status:', error);
            reject(error);
          });
      })
      .catch((error) => {
        console.error('Error checking screen before online update:', error);
        reject(error);
      });
  });
}

export function getScreenData(screenCode: string): Promise<FirebaseScreen | null> {
  return new Promise((resolve, reject) => {
    if (!database) {
      reject(new Error('Firebase not initialized'));
      return;
    }

    const screenRef = ref(database, `screens/${screenCode}`);
    get(screenRef)
      .then((snapshot) => {
        resolve(snapshot.val());
      })
      .catch((error) => {
        console.error('Error getting screen data:', error);
        reject(error);
      });
  });
}

function generateRemoteAccessId(): string {
  const chars = 'ABCDEF0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

