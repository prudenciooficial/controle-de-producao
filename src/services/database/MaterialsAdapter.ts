import { localDB, LOCAL_DB_CONFIG } from '@/config/database';
import { supabase } from '@/integrations/supabase/client';
import { Material } from '@/types';

export interface MaterialsAdapter {
  isOnline(): Promise<boolean>;
  getMaterials(): Promise<Material[]>;
  createMaterial(material: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material>;
  updateMaterial(id: string, material: Partial<Material>): Promise<void>;
  deleteMaterial(id: string): Promise<void>;
  syncPendingOperations(): Promise<void>;
  getPendingOperations(): Promise<Record<string, unknown>[]>;
}

// Interfaces para IndexedDB
interface LocalMaterial {
  id: string;
  name: string;
  code: string;
  type: "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro";
  unit_of_measure: string;
  description: string;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  sync_status: 'pending' | 'synced' | 'conflict' | 'error';
  remote_id?: string;
  local_changes: Record<string, unknown>;
  [key: string]: unknown; // Index signature para compatibilidade
}

interface SyncQueueItem {
  id: string;
  table_name: string;
  operation: string;
  record_id: string;
  data: Record<string, unknown>;
  created_at: string;
  processed: boolean;
  retry_count: number;
  error_message?: string;
  processed_at?: string;
}

export class HybridMaterialsAdapter implements MaterialsAdapter {
  private isOnlineCache: boolean | null = null;
  private lastConnectivityCheck = 0;
  private readonly CONNECTIVITY_CHECK_INTERVAL = 10000;

  constructor() {
    this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      await localDB.initialize();
    } catch (error) {
      console.error('Erro ao inicializar IndexedDB:', error);
    }
  }

  async isOnline(): Promise<boolean> {
    const now = Date.now();
    
    if (this.isOnlineCache !== null && (now - this.lastConnectivityCheck) < this.CONNECTIVITY_CHECK_INTERVAL) {
      return this.isOnlineCache;
    }

    try {
      const { error } = await supabase
        .from('materials')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      this.isOnlineCache = !error;
      this.lastConnectivityCheck = now;
      
      if (!error) {
        console.log('🟢 Online: Conectado ao Supabase');
      } else {
        console.log('🔴 Offline: Sem conexão com Supabase');
      }
      
      return this.isOnlineCache;
    } catch (error) {
      console.log('🔴 Offline: Erro de rede');
      this.isOnlineCache = false;
      this.lastConnectivityCheck = now;
      return false;
    }
  }

  async getMaterials(): Promise<Material[]> {
    try {
      // Sempre buscar do local primeiro para velocidade
      const localMaterials = await this.getLocalMaterials();
      
      // Se online, sincronizar em background
      if (await this.isOnline()) {
        this.syncFromRemoteInBackground();
      }
      
      return localMaterials;
    } catch (error) {
      console.error('Erro ao buscar materials:', error);
      return [];
    }
  }

  private async getLocalMaterials(): Promise<Material[]> {
    try {
      const localMaterials = await localDB.getAll<LocalMaterial>(LOCAL_DB_CONFIG.stores.materials);
      
      // Ordenar por data de criação (mais recentes primeiro)
      localMaterials.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return localMaterials.map(this.convertLocalToMaterial);
    } catch (error) {
      console.error('Erro ao buscar materials locais:', error);
      return [];
    }
  }

  async createMaterial(material: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material> {
    const online = await this.isOnline();
    
    if (online) {
      try {
        // Tentar criar no Supabase
        const { data, error } = await supabase
          .from('materials')
          .insert({
            name: material.name,
            code: material.code,
            type: material.type,
            unit_of_measure: material.unitOfMeasure,
            description: material.description
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Sincronizar para local
        await this.syncMaterialToLocal(data);
        
        return this.convertSupabaseToMaterial(data);
      } catch (error) {
        console.warn('Falha ao criar no remoto, usando local:', error);
        return await this.createMaterialLocal(material);
      }
    } else {
      return await this.createMaterialLocal(material);
    }
  }

  private async createMaterialLocal(material: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material> {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      
      const localMaterial: LocalMaterial = {
        id,
        name: material.name,
        code: material.code,
        type: material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
        unit_of_measure: material.unitOfMeasure,
        description: material.description,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        local_changes: {}
      };
      
      await localDB.put(LOCAL_DB_CONFIG.stores.materials, localMaterial);
      
      // Adicionar à fila de sincronização
      await this.addToSyncQueue('INSERT', id, localMaterial);
      
      return this.convertLocalToMaterial(localMaterial);
    } catch (error) {
      console.error('Erro ao criar material local:', error);
      throw error;
    }
  }

  async updateMaterial(id: string, material: Partial<Material>): Promise<void> {
    const online = await this.isOnline();
    
    if (online) {
      try {
        // Tentar atualizar no Supabase
        const updates: Record<string, string | undefined> = {};
        if (material.name) updates.name = material.name;
        if (material.code !== undefined) updates.code = material.code;
        if (material.type) updates.type = material.type;
        if (material.unitOfMeasure) updates.unit_of_measure = material.unitOfMeasure;
        if (material.description !== undefined) updates.description = material.description;
        
        const { error } = await supabase
          .from('materials')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
        
        // Atualizar local também
        await this.updateMaterialLocal(id, material, 'synced');
      } catch (error) {
        console.warn('Falha ao atualizar no remoto, usando local:', error);
        await this.updateMaterialLocal(id, material, 'pending');
      }
    } else {
      await this.updateMaterialLocal(id, material, 'pending');
    }
  }

  private async updateMaterialLocal(id: string, material: Partial<Material>, syncStatus: string): Promise<void> {
    try {
      const existing = await localDB.get<LocalMaterial>(LOCAL_DB_CONFIG.stores.materials, id);
      if (!existing) throw new Error(`Material ${id} não encontrado`);
      
      const updated: LocalMaterial = {
        ...existing,
        updated_at: new Date().toISOString(),
        sync_status: syncStatus as 'pending' | 'synced' | 'conflict' | 'error'
      };
      
      if (material.name) updated.name = material.name;
      if (material.code !== undefined) updated.code = material.code;
      if (material.type) updated.type = material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro";
      if (material.unitOfMeasure) updated.unit_of_measure = material.unitOfMeasure;
      if (material.description !== undefined) updated.description = material.description;
      
      await localDB.put(LOCAL_DB_CONFIG.stores.materials, updated);
      
      if (syncStatus === 'pending') {
        await this.addToSyncQueue('UPDATE', id, material);
      }
    } catch (error) {
      console.error('Erro ao atualizar material local:', error);
      throw error;
    }
  }

  async deleteMaterial(id: string): Promise<void> {
    const online = await this.isOnline();
    
    if (online) {
      try {
        // Tentar deletar no Supabase
        const { error } = await supabase
          .from('materials')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Deletar local também
        await this.deleteMaterialLocal(id);
      } catch (error) {
        console.warn('Falha ao deletar no remoto, marcando para sync:', error);
        await this.addToSyncQueue('DELETE', id, { id });
      }
    } else {
      await this.addToSyncQueue('DELETE', id, { id });
    }
  }

  private async deleteMaterialLocal(id: string): Promise<void> {
    try {
      await localDB.delete(LOCAL_DB_CONFIG.stores.materials, id);
    } catch (error) {
      console.error('Erro ao deletar material local:', error);
      throw error;
    }
  }

  async syncPendingOperations(): Promise<void> {
    if (!(await this.isOnline())) {
      console.log('Offline - não é possível sincronizar');
      return;
    }

    try {
      const pendingOps = await localDB.query<SyncQueueItem>(
        LOCAL_DB_CONFIG.stores.sync_queue,
        'table_name',
        'materials'
      );
      
      const unprocessed = pendingOps.filter(op => !op.processed);
      
      for (const op of unprocessed) {
        try {
          await this.processSyncOperation(op);
          await this.markOperationAsProcessed(op.id);
        } catch (error) {
          console.error('Erro ao processar operação de sync:', error);
          await this.incrementRetryCount(op.id);
        }
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  }

  private async processSyncOperation(op: SyncQueueItem): Promise<void> {
    const data = op.data;
    
    switch (op.operation) {
      case 'INSERT':
        await supabase.from('materials').insert({
          name: data.name as string,
          code: data.code as string,
          type: data.type as string,
          unit_of_measure: data.unit_of_measure as string,
          description: data.description as string
        });
        break;
      case 'UPDATE':
        await supabase.from('materials').update(data).eq('id', op.record_id);
        break;
      case 'DELETE':
        await supabase.from('materials').delete().eq('id', op.record_id);
        await this.deleteMaterialLocal(op.record_id);
        break;
    }
  }

  private async addToSyncQueue(operation: string, recordId: string, data: Record<string, unknown>): Promise<void> {
    try {
      const syncItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        table_name: 'materials',
        operation,
        record_id: recordId,
        data,
        created_at: new Date().toISOString(),
        processed: false,
        retry_count: 0
      };
      
      await localDB.put(LOCAL_DB_CONFIG.stores.sync_queue, syncItem);
    } catch (error) {
      console.error('Erro ao adicionar à fila de sync:', error);
    }
  }

  private async markOperationAsProcessed(operationId: string): Promise<void> {
    try {
      const existing = await localDB.get<SyncQueueItem>(LOCAL_DB_CONFIG.stores.sync_queue, operationId);
      if (existing) {
        const updated = { 
          ...existing, 
          processed: true, 
          processed_at: new Date().toISOString() 
        };
        await localDB.put(LOCAL_DB_CONFIG.stores.sync_queue, updated);
      }
    } catch (error) {
      console.error('Erro ao marcar operação como processada:', error);
    }
  }

  private async incrementRetryCount(operationId: string): Promise<void> {
    try {
      const existing = await localDB.get<SyncQueueItem>(LOCAL_DB_CONFIG.stores.sync_queue, operationId);
      if (existing) {
        const updated = { ...existing, retry_count: existing.retry_count + 1 };
        await localDB.put(LOCAL_DB_CONFIG.stores.sync_queue, updated);
      }
    } catch (error) {
      console.error('Erro ao incrementar retry count:', error);
    }
  }

  private async syncFromRemoteInBackground(): Promise<void> {
    // Não bloquear a interface - executar em background
    setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        for (const material of data || []) {
          await this.syncMaterialToLocal(material);
        }
      } catch (error) {
        console.error('Erro na sincronização em background:', error);
      }
    }, 100);
  }

  private async syncMaterialToLocal(remoteMaterial: Record<string, unknown>): Promise<void> {
    try {
      const localMaterial: LocalMaterial = {
        id: remoteMaterial.id as string,
        name: remoteMaterial.name as string,
        code: remoteMaterial.code as string,
        type: remoteMaterial.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
        unit_of_measure: remoteMaterial.unit_of_measure as string,
        description: remoteMaterial.description as string,
        created_at: remoteMaterial.created_at as string,
        updated_at: remoteMaterial.updated_at as string,
        remote_id: remoteMaterial.id as string,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        local_changes: {}
      };
      
      await localDB.put(LOCAL_DB_CONFIG.stores.materials, localMaterial);
    } catch (error) {
      console.error('Erro ao sincronizar material para local:', error);
    }
  }

  private convertLocalToMaterial(row: LocalMaterial): Material {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type,
      unitOfMeasure: row.unit_of_measure,
      description: row.description,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private convertSupabaseToMaterial(data: Record<string, unknown>): Material {
    return {
      id: data.id as string,
      name: data.name as string,
      code: data.code as string,
      type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
      unitOfMeasure: data.unit_of_measure as string,
      description: data.description as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }

  async getPendingOperations(): Promise<Record<string, unknown>[]> {
    try {
      const allSyncItems = await localDB.getAll<SyncQueueItem>(LOCAL_DB_CONFIG.stores.sync_queue);
      const materialsOps = allSyncItems.filter(item => 
        item.table_name === 'materials' && !item.processed
      );
      
      return materialsOps.map((item) => ({
        id: item.id,
        operation: item.operation,
        record_id: item.record_id,
        data: item.data,
        created_at: item.created_at,
        processed: item.processed,
        processed_at: item.processed_at,
        retry_count: item.retry_count
      }));
    } catch (error) {
      console.error('Erro ao buscar operações pendentes:', error);
      return [];
    }
  }
}

// Instância singleton
export const materialsAdapter = new HybridMaterialsAdapter(); 