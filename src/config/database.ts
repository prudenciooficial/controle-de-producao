// Configuração do IndexedDB para cache local
export interface LocalDBConfig {
  name: string;
  version: number;
  stores: {
    materials: string;
    sync_queue: string;
    sync_status: string;
  };
}

export const LOCAL_DB_CONFIG: LocalDBConfig = {
  name: 'controle_producao_db',
  version: 1,
  stores: {
    materials: 'materials',
    sync_queue: 'sync_queue', 
    sync_status: 'sync_status'
  }
};

// Interface para operações do IndexedDB
export class LocalDatabase {
  private db: IDBDatabase | null = null;
  private dbName = LOCAL_DB_CONFIG.name;
  private dbVersion = LOCAL_DB_CONFIG.version;

  async initialize(): Promise<boolean> {
    try {
      // Inicializando IndexedDB local
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          reject(false);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          // IndexedDB inicializado com sucesso
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Store para materials
          if (!db.objectStoreNames.contains(LOCAL_DB_CONFIG.stores.materials)) {
            const materialsStore = db.createObjectStore(LOCAL_DB_CONFIG.stores.materials, { keyPath: 'id' });
            materialsStore.createIndex('sync_status', 'sync_status', { unique: false });
            materialsStore.createIndex('type', 'type', { unique: false });
          }
          
          // Store para fila de sincronização
          if (!db.objectStoreNames.contains(LOCAL_DB_CONFIG.stores.sync_queue)) {
            const syncStore = db.createObjectStore(LOCAL_DB_CONFIG.stores.sync_queue, { keyPath: 'id' });
            syncStore.createIndex('processed', 'processed', { unique: false });
            syncStore.createIndex('table_name', 'table_name', { unique: false });
          }
          
          // Store para status de sincronização
          if (!db.objectStoreNames.contains(LOCAL_DB_CONFIG.stores.sync_status)) {
            db.createObjectStore(LOCAL_DB_CONFIG.stores.sync_status, { keyPath: 'table_name' });
          }
        };
      });
    } catch (error) {
      return false;
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<T> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(storeName: string, indexName: string, value: IDBValidKey | IDBKeyRange): Promise<T[]> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database não inicializada');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Instância singleton do banco local
export const localDB = new LocalDatabase();

// Função para inicializar o banco local
export const initializeLocalSchema = async (): Promise<void> => {
  await localDB.initialize();
};

// Função para testar conexão
export const testLocalConnection = async (): Promise<boolean> => {
  try {
    return await localDB.initialize();
  } catch (error) {
    return false;
  }
};

// Cleanup (não necessário para IndexedDB, mas mantido para compatibilidade)
export const closeLocalConnection = async (): Promise<void> => {
  // IndexedDB connection closed
}; 