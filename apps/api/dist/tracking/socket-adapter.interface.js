"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySocketAdapter = void 0;
class InMemorySocketAdapter {
    constructor(ioServer) {
        this.ioServer = ioServer;
    }
    async broadcastToRoom(room, event, payload) {
        if (this.ioServer) {
            this.ioServer.to(room).emit(event, payload);
        }
    }
    async joinRoom(socketId, room) {
        const socket = this.ioServer?.sockets?.get?.(socketId);
        if (socket) {
            socket.join(room);
        }
    }
    async leaveRoom(socketId, room) {
        const socket = this.ioServer?.sockets?.get?.(socketId);
        if (socket) {
            socket.leave(room);
        }
    }
    async getRoomSocketsCount(room) {
        const roomSet = this.ioServer?.adapter?.rooms?.get?.(room);
        return roomSet ? roomSet.size : 0;
    }
}
exports.InMemorySocketAdapter = InMemorySocketAdapter;
//# sourceMappingURL=socket-adapter.interface.js.map