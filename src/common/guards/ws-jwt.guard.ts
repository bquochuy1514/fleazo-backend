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

    // 2. Already verified once in handleConnection — this just re-checks client.data.user is still set
    if (!client.data.user) {
      throw new UnauthorizedException('Chưa xác thực');
    }

    return true;
  }
}
