import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PartnerLiveLocation } from '@serventica/types';
import { TrackingSessionService } from './tracking-session.service';
export declare class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly sessionService;
    server: Server;
    private readonly logger;
    private readonly socketUsers;
    private readonly socketRooms;
    constructor(sessionService: TrackingSessionService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(client: Socket, payload: {
        bookingId: string;
        clientRole: 'CUSTOMER' | 'PARTNER';
        token?: string;
    }): void;
    handlePartnerLocation(client: Socket, location: Partial<PartnerLiveLocation>): void;
    handleStatusUpdate(client: Socket, payload: {
        bookingId: string;
        status: any;
    }): void;
}
