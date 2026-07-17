/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // Shared by every method below that operates on an existing conversation —
  // verifies it exists and the caller is one of its two participants
  async assertParticipant(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }
    if (
      conversation.initiatorId !== userId &&
      conversation.recipientId !== userId
    ) {
      throw new ForbiddenException(
        'Bạn không phải thành viên của cuộc trò chuyện này',
      );
    }

    return conversation;
  }

  async findOrCreateConversation(userId: number, dto: CreateConversationDto) {
    // 1. Can't start a conversation with yourself
    if (dto.recipientId === userId) {
      throw new BadRequestException(
        'Không thể tạo cuộc trò chuyện với chính mình',
      );
    }

    // 2. Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) {
      throw new NotFoundException('Người nhận không tồn tại');
    }

    // 3. Check both directions — a pair has exactly one conversation, ever
    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { initiatorId: userId, recipientId: dto.recipientId },
          { initiatorId: dto.recipientId, recipientId: userId },
        ],
      },
    });
    if (existing) {
      return existing;
    }

    // 4. Create new conversation
    return this.prisma.conversation.create({
      data: { initiatorId: userId, recipientId: dto.recipientId },
    });
  }

  async listConversations(userId: number) {
    // 1. Find every conversation this user participates in, with the last
    // message and unread count attached, newest activity first
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ initiatorId: userId }, { recipientId: userId }],
        messages: { some: {} },
      },
      include: {
        initiator: { select: { id: true, fullName: true, avatar: true } },
        recipient: { select: { id: true, fullName: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: {
          select: {
            messages: { where: { senderId: { not: userId }, isRead: false } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 2. Shape response — collapse initiator/recipient into "the other person"
    return conversations.map((c) => ({
      id: c.id,
      otherUser: c.initiatorId === userId ? c.recipient : c.initiator,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      updatedAt: c.updatedAt,
    }));
  }

  async getMessages(
    userId: number,
    conversationId: number,
    query: QueryMessagesDto,
  ) {
    // 1. Verify participant
    await this.assertParticipant(userId, conversationId);

    const { page = 1, limit = 30 } = query;

    // 2. Query messages and total count in parallel — newest first, paginated
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    // 3. Reverse to chronological order for display
    return {
      data: data.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendMessage(
    userId: number,
    conversationId: number,
    dto: SendMessageDto,
  ) {
    // 1. Verify participant
    await this.assertParticipant(userId, conversationId);

    // 2. Create message and bump conversation's updatedAt atomically
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          productId: dto.productId,
          content: dto.content,
        },
        include: { conversation: true },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async recallMessage(userId: number, messageId: number) {
    // 1. Verify message exists and belongs to this user — only the sender
    // can recall their own message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể thu hồi tin nhắn của chính mình',
      );
    }

    // 2. Soft-hide — content stays in the DB (see AGENTS: Chat section)
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isRecalled: true },
    });
  }

  async getPartnerIds(userId: number): Promise<number[]> {
    // Every conversation this user is part of — returns the OTHER person's id
    // each time, used to know who to notify about this user's online status
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
      select: { initiatorId: true, recipientId: true },
    });

    return conversations.map((c) =>
      c.initiatorId === userId ? c.recipientId : c.initiatorId,
    );
  }

  async markAsRead(userId: number, conversationId: number) {
    // 1. Verify participant
    await this.assertParticipant(userId, conversationId);

    // 2. Mark every unread message FROM the other person as read —
    // never touch messages the current user sent themselves
    const result = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }
}
