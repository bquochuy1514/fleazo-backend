/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/modules/auth/strategies/refresh-jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req.headers.authorization?.startsWith('Bearer ')) {
            return req.headers.authorization.split(' ')[1];
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // 1. Extract refresh token from header
    const refreshToken = req.headers.authorization
      ?.replace('Bearer', '')
      .trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token.');
    }

    // 2. Validate refresh token against DB
    return this.authService.validateRefreshToken(payload, refreshToken);
  }
}
