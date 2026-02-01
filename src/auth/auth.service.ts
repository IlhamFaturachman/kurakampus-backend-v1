import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Validate terms agreement
    if (!dto.agreeToTerms) {
      throw new BadRequestException(
        'You must agree to the terms and conditions',
      );
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.USER,
      },
    });

    return this.generateTokens(user.id, user.email, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await argon2.verify(user.password, dto.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.username);
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    try {
      // Verify refresh token
      await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('REFRESH_TOKEN_SECRET'),
      });

      // Find refresh token in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.revoked) {
        // Token reuse detected - revoke entire family
        if (storedToken?.family) {
          await this.revokeTokenFamily(storedToken.family);
        }
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check expiration
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true, revokedAt: new Date() },
      });

      // Generate new tokens
      return this.generateTokens(
        storedToken.userId,
        storedToken.user.email,
        storedToken.user.username,
        storedToken.family,
        storedToken.id,
        userAgent,
        ipAddress,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    username?: string,
    tokenFamily?: string,
    replacedTokenId?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // Fetch user to get role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        emailVerified: true,
        avatar: true,
      },
    });

    const payload = { sub: userId, email, role: user?.role };

    // Generate access token (short-lived)
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    // Generate refresh token (long-lived)
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    });

    // Store refresh token in database
    const family = tokenFamily || uuidv4(); // Maintain family for rotation
    const expiresIn = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiration(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        family,
        expiresAt,
        replacedBy: replacedTokenId,
        userAgent,
        ipAddress,
      },
    });

    // Link replaced token
    if (replacedTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacedTokenId },
        data: { replacedBy: refreshToken },
      });
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: this.getExpirationSeconds(
        this.config.get('JWT_EXPIRES_IN', '15m'),
      ),
      user: {
        id: user?.id || userId,
        email: user?.email || email,
        username: user?.username || username,
        firstName: user?.firstName,
        lastName: user?.lastName,
        fullName: user ? `${user.firstName} ${user.lastName}` : undefined,
        role: user?.role,
        status: user?.status,
        emailVerified: user?.emailVerified,
        avatar: user?.avatar,
      },
    };
  }

  private getExpirationSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const [, value, unit] = match;
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    return parseInt(value) * multipliers[unit];
  }

  private async revokeTokenFamily(family: string) {
    await this.prisma.refreshToken.updateMany({
      where: { family, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  private calculateExpiration(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');

    const [, value, unit] = match;
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const ms = parseInt(value) * multipliers[unit];

    return new Date(Date.now() + ms);
  }
}
