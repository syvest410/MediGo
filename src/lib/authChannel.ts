/**
 * Multi-tab authentication synchronization via BroadcastChannel.
 * Enforces immediate cross-tab logout without transmitting secrets or tokens.
 */

const AUTH_CHANNEL_NAME = 'biodispatch_session_sync';

interface AuthChannelMessage {
  type: 'LOGOUT';
}

class AuthSyncChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<AuthChannelMessage>) => {
          if (event.data?.type === 'LOGOUT') {
            this.listeners.forEach(cb => cb());
          }
        };
      } catch (err) {
        console.warn('[AuthChannel] BroadcastChannel initialization failed:', err);
      }
    }
  }

  public notifyLogout(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'LOGOUT' });
      } catch (err) {
        console.warn('[AuthChannel] Error broadcasting logout:', err);
      }
    }
  }

  public onLogout(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
}

export const authChannel = new AuthSyncChannel();
