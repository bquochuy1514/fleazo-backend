import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the underlying Socket.IO client from the WebSocket context
    const client: Socket = context.switchToWs().getClient();

    // 2. This runs on every @SubscribeMessage call, AFTER connection — user
    // was already verified once in handleConnection, so client.data.user
    // should already exist. This guard just re-checks it's still there.
    if (!client.data.user) {
      throw new UnauthorizedException('Chưa xác thực');
    }

    return true;
  }
}
