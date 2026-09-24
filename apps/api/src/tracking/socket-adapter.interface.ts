/**
 * SERVENTICA — Horizontal Socket Scaling Abstraction (Phase 6)
 * Prepares the platform for horizontal multi-instance scaling via Redis Adapter
 * without modifying domain tracking business services.
 */

export interface ISocketAdapter {
  broadcastToRoom(room: string, event: string, payload: unknown): Promise<void>;
  joinRoom(socketId: string, room: string): Promise<void>;
  leaveRoom(socketId: string, room: string): Promise<void>;
  getRoomSocketsCount(room: string): Promise<number>;
}

export class InMemorySocketAdapter implements ISocketAdapter {
  constructor(private readonly ioServer: any) {}

  public async broadcastToRoom(room: string, event: string, payload: unknown): Promise<void> {
    if (this.ioServer) {
      this.ioServer.to(room).emit(event, payload);
    }
  }

  public async joinRoom(socketId: string, room: string): Promise<void> {
    const socket = this.ioServer?.sockets?.get?.(socketId);
    if (socket) {
      socket.join(room);
    }
  }

  public async leaveRoom(socketId: string, room: string): Promise<void> {
    const socket = this.ioServer?.sockets?.get?.(socketId);
    if (socket) {
      socket.leave(room);
    }
  }

  public async getRoomSocketsCount(room: string): Promise<number> {
    const roomSet = this.ioServer?.adapter?.rooms?.get?.(room);
    return roomSet ? roomSet.size : 0;
  }
}
