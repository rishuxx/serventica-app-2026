import { io, Socket } from 'socket.io-client';
import { TrackingConnectionState } from '@serventica/types';

export interface SocketConnectionOptions {
  url?: string;
  token?: string;
  userId?: string;
  role?: 'CUSTOMER' | 'PARTNER';
}

type ConnectionStateListener = (state: TrackingConnectionState) => void;

/**
 * SERVENTICA — SocketConnectionManager (Phase 3)
 * Singleton connection lifecycle manager:
 * - Maintains single authenticated connection per app session
 * - Prevents duplicate socket instances
 * - Auto-reconnect with exponential backoff
 * - Exposes connection state (CONNECTED, RECONNECTING, DISCONNECTED)
 * - Safe teardown and cleanup
 */
export class SocketConnectionManager {
  private static instance: SocketConnectionManager;
  private socket: Socket | null = null;
  private stateListeners: Set<ConnectionStateListener> = new Set();
  private currentState: TrackingConnectionState = 'DISCONNECTED';
  private currentOptions: SocketConnectionOptions = {};

  private constructor() {}

  public static getInstance(): SocketConnectionManager {
    if (!SocketConnectionManager.instance) {
      SocketConnectionManager.instance = new SocketConnectionManager();
    }
    return SocketConnectionManager.instance;
  }

  public getConnectionState(): TrackingConnectionState {
    return this.currentState;
  }

  public onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.currentState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(state: TrackingConnectionState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {}
    });
  }

  public connect(options?: SocketConnectionOptions): Socket {
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options };
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return this.socket;
    }

    // Default API port 3000 for local dev or configured env
    const serverUrl =
      this.currentOptions.url ||
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      'http://localhost:3000';

    this.setState('RECONNECTING');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 25,
      // Controlled Exponential Backoff with Jitter (Phase 4):
      // 1s -> 2s -> 4s -> 8s -> 16s -> 30s max
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 10000,
      auth: {
        token: this.currentOptions.token || 'guest_token',
        userId: this.currentOptions.userId || 'guest_user',
        role: this.currentOptions.role || 'CUSTOMER',
      },
      query: {
        userId: this.currentOptions.userId || 'guest_user',
      },
    });

    this.socket.on('connect', () => {
      this.setState('CONNECTED');
    });

    this.socket.on('disconnect', (reason) => {
      // If server disconnected client or network transport lost, transition to RECONNECTING/DISCONNECTED
      if (reason === 'io server disconnect') {
        this.setState('DISCONNECTED');
      } else {
        this.setState('RECONNECTING');
      }
    });

    this.socket.on('connect_error', () => {
      this.setState('RECONNECTING');
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.setState('RECONNECTING');
    });

    this.socket.on('reconnect', () => {
      this.setState('CONNECTED');
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setState('DISCONNECTED');
  }
}

export const socketConnectionManager = SocketConnectionManager.getInstance();
