// Offline Queue Manager for Medical Driver Resilience (Basements & Blindspots)

import { PendingOfflineAction } from '../types';

const QUEUE_STORAGE_KEY = 'biodispatch_offline_queue_v1';
const SIMULATED_OFFLINE_KEY = 'biodispatch_force_offline';

export class OfflineQueueManager {
  private static instance: OfflineQueueManager;
  private queue: PendingOfflineAction[] = [];
  private listeners: Array<() => void> = [];
  private isProcessing = false;

  private constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncQueue());
    }
  }

  public static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public isForceOffline(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  }

  public setForceOffline(offline: boolean) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, offline ? 'true' : 'false');
    }
    this.notify();
    if (!offline && this.isOnline()) {
      this.syncQueue();
    }
  }

  public isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    if (this.isForceOffline()) return false;
    return navigator.onLine;
  }

  private loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(QUEUE_STORAGE_KEY);
        if (data) {
          this.queue = JSON.parse(data);
        }
      }
    } catch (e) {
      console.error('Failed to load offline queue:', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
    this.notify();
  }

  public enqueueAction(
    orderId: string,
    actionType: PendingOfflineAction['actionType'],
    payload: any,
    coords: { lat: number; lng: number }
  ): PendingOfflineAction {
    const action: PendingOfflineAction = {
      id: `OFFLINE-ACT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderId,
      actionType,
      payload,
      timestamp: new Date().toISOString(),
      gpsLatitude: coords.lat,
      gpsLongitude: coords.lng,
      deviceId: 'MOB-GER-DRIVER-APP-09',
      retryCount: 0
    };

    this.queue.push(action);
    this.saveQueue();

    // If online, attempt immediate flush
    if (this.isOnline()) {
      this.syncQueue();
    }

    return action;
  }

  public getQueue(): PendingOfflineAction[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public async syncQueue(): Promise<{ syncedCount: number; errors: string[] }> {
    if (this.isProcessing || this.queue.length === 0 || !this.isOnline()) {
      return { syncedCount: 0, errors: [] };
    }

    this.isProcessing = true;
    const syncedIds: string[] = [];
    const errors: string[] = [];

    const queueCopy = [...this.queue];

    for (const action of queueCopy) {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });

        if (response.ok) {
          syncedIds.push(action.id);
        } else {
          const errData = await response.json().catch(() => ({ message: 'Server sync error' }));
          action.retryCount++;
          errors.push(`Action ${action.actionType} for order ${action.orderId}: ${errData.message || 'Sync failed'}`);
        }
      } catch (err: any) {
        action.retryCount++;
        errors.push(`Network error syncing ${action.actionType}: ${err?.message || 'Offline'}`);
        break; // Stop loop if network lost again
      }
    }

    // Remove successfully synced items
    if (syncedIds.length > 0) {
      this.queue = this.queue.filter(item => !syncedIds.includes(item.id));
      this.saveQueue();
    }

    this.isProcessing = false;
    this.notify();

    return { syncedCount: syncedIds.length, errors };
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineQueue = OfflineQueueManager.getInstance();
