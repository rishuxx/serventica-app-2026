export interface ISocketAdapter {
    broadcastToRoom(room: string, event: string, payload: unknown): Promise<void>;
    joinRoom(socketId: string, room: string): Promise<void>;
    leaveRoom(socketId: string, room: string): Promise<void>;
    getRoomSocketsCount(room: string): Promise<number>;
}
export declare class InMemorySocketAdapter implements ISocketAdapter {
    private readonly ioServer;
    constructor(ioServer: any);
    broadcastToRoom(room: string, event: string, payload: unknown): Promise<void>;
    joinRoom(socketId: string, room: string): Promise<void>;
    leaveRoom(socketId: string, room: string): Promise<void>;
    getRoomSocketsCount(room: string): Promise<number>;
}
