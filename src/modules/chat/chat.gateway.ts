import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { WsJoinConversationDto } from './dto/ws-join-conversation.dto';
import { WsSendMessageDto } from './dto/ws-send-message.dto';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PrismaService } from '../../prisma.service';
import { WsRecallMessageDto } from './dto/ws-recall-message.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private onlineUsers = new Set<number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      console.log(`Rejected ${client.id}: no token`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.data.user = payload;
      console.log(`Client connected: ${client.id}, userId: ${payload.id}`);

      await client.join(`user:${payload.id}`);

      this.onlineUsers.add(payload.id);
      const partnerIds = await this.chatService.getPartnerIds(payload.id);
      console.log(`userId ${payload.id} has partners:`, partnerIds);
      for (const partnerId of partnerIds) {
        this.server
          .to(`user:${partnerId}`)
          .emit('userOnline', { userId: payload.id });
      }
    } catch {
      console.log(`Rejected ${client.id}: invalid token`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const user = client.data.user as JwtPayload | undefined;
    if (!user) return;

    this.onlineUsers.delete(user.id);
    const partnerIds = await this.chatService.getPartnerIds(user.id);
    for (const partnerId of partnerIds) {
      this.server
        .to(`user:${partnerId}`)
        .emit('userOffline', { userId: user.id });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe()) dto: WsJoinConversationDto,
  ) {
    const { id: userId } = client.data.user as JwtPayload;

    const conversation = await this.chatService.assertParticipant(
      userId,
      dto.conversationId,
    );
    const otherUserId =
      conversation.initiatorId === userId
        ? conversation.recipientId
        : conversation.initiatorId;

    const room = `conversation:${dto.conversationId}`;
    await client.join(room);
    console.log(`${client.id} joined ${room}`);

    const { count } = await this.chatService.markAsRead(
      userId,
      dto.conversationId,
    );
    if (count > 0) {
      this.server.to(`user:${otherUserId}`).emit('messagesRead', {
        conversationId: dto.conversationId,
        readerId: userId,
      });
    }

    return { otherUserOnline: this.onlineUsers.has(otherUserId) };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe()) dto: WsSendMessageDto,
  ) {
    try {
      const { id: senderId } = client.data.user as JwtPayload;
      const message = await this.chatService.sendMessage(
        senderId,
        dto.conversationId,
        dto,
      );

      const room = `conversation:${dto.conversationId}`;
      this.server.to(room).emit('newMessage', message);

      const recipientId =
        message.conversation.initiatorId === senderId
          ? message.conversation.recipientId
          : message.conversation.initiatorId;

      this.server.to(`user:${recipientId}`).emit('newMessageNotification', {
        conversationId: dto.conversationId,
        latestMessage: message.content,
        unreadCount: await this.prisma.message.count({
          where: {
            conversationId: dto.conversationId,
            senderId: { not: recipientId },
            isRead: false,
          },
        }),
      });
    } catch (error) {
      console.error('sendMessage FAILED:', error);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('recallMessage')
  async handleRecallMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe()) dto: WsRecallMessageDto,
  ) {
    try {
      const { id: userId } = client.data.user as JwtPayload;
      const message = await this.chatService.recallMessage(
        userId,
        dto.messageId,
      );

      const room = `conversation:${message.conversationId}`;
      this.server.to(room).emit('messageRecalled', { messageId: message.id });
    } catch (error) {
      console.error('recallMessage FAILED:', error);
    }
  }
}
