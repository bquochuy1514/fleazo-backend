import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService, PrismaService],
  exports: [MembershipService],
})
export class MembershipModule {}
