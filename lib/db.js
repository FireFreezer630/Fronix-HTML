const DB_NAME = 'FronixDB';
const DB_VERSION = 1;

let db;

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('chatId', 'chat_id', { unique: false });
      }
    };
  });
};

const getStore = (storeName, mode) => {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

const dbGet = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    await openDB();
    const store = getStore(storeName, 'readonly');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const dbGetAll = (storeName) => {
    return new Promise(async (resolve, reject) => {
        await openDB();
        const store = getStore(storeName, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};


const dbPut = (storeName, value) => {
  return new Promise(async (resolve, reject) => {
    await openDB();
    const store = getStore(storeName, 'readwrite');
    const request = store.put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const dbDelete = (storeName, key) => {
  return new Promise(async (resolve, reject) => {
    await openDB();
    const store = getStore(storeName, 'readwrite');
    const request = store.delete(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const getMessagesForChat = (chatId) => {
    return new Promise(async (resolve, reject) => {
        await openDB();
        const store = getStore('messages', 'readonly');
        const index = store.index('chatId');
        const request = index.getAll(chatId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

window.db = {
  openDB,
  get: dbGet,
  getAll: dbGetAll,
  put: dbPut,
  delete: dbDelete,
  getMessagesForChat,
};