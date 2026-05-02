import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import {
  SecurityLoggerService,
  SecurityEventType,
} from '../common/services/security-logger.service';
import { TwoFactorService } from './two-factor.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthEnhancedService {
  private readonly logger = new Logger(AuthEnhancedService.name);
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number; // in minutes

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private securityLogger: SecurityLoggerService,
    private twoFactorService: TwoFactorService,
  ) {
    this.maxLoginAttempts = parseInt(
      this.config.get('MAX_LOGIN_ATTEMPTS', '5'),
    );
    this.lockoutDuration = parseInt(
      this.config.get('LOCKOUT_DURATION_MINUTES', '30'),
    );
  }

  /**
   * Register new user with email verification
   */
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    if (!dto.agreeToTerms) {
      throw new BadRequestException(
        'You must agree to the terms and conditions',
      );
    }

    // Check existing email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check existing username
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await argon2.hash(dto.password);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        status: 'PENDING', // User must verify email first
      },
    });

    // Assign default role
    const defaultRole = await this.prisma.role.findFirst({
      where: { name: 'MAHASISWA', organizationId: null },
    });

    if (defaultRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName,
      );
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
    }

    // Log security event
    await this.securityLogger.logSecurityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
      success: true,
      message: 'User registered successfully',
    });

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      email: user.email,
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    await this.securityLogger.logSecurityEvent({
      type: SecurityEventType.EMAIL_VERIFIED,
      userId: user.id,
      email: user.email,
      success: true,
      message: 'Email verified successfully',
    });
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName,
    );
  }

  /**
   * Login with account lockout protection
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.securityLogger.logLoginAttempt(
        dto.email,
        false,
        ipAddress,
        userAgent,
        undefined,
        'User not found',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      await this.securityLogger.logLoginAttempt(
        dto.email,
        false,
        ipAddress,
        userAgent,
        user.id,
        'Account locked',
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Verify password
    const passwordMatch = await argon2.verify(user.password, dto.password);

    if (!passwordMatch) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      // Lock account if max attempts reached
      if (failedAttempts >= this.maxLoginAttempts) {
        const lockedUntil = new Date(
          Date.now() + this.lockoutDuration * 60 * 1000,
        );
        updateData.lockedUntil = lockedUntil;
        updateData.status = 'SUSPENDED';

        await this.securityLogger.logAccountLockout(
          user.id,
          user.email,
          `Too many failed login attempts (${failedAttempts})`,
        );

        // Send email notification
        try {
          await this.emailService.sendAccountLockedEmail(
            user.email,
            user.firstName,
            `Too many failed login attempts`,
          );
        } catch (error) {
          this.logger.error('Failed to send account locked email', error);
        }
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await this.securityLogger.logLoginAttempt(
        dto.email,
        false,
        ipAddress,
        userAgent,
        user.id,
        'Invalid password',
      );

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return temporary token for 2FA verification
      return {
        requires2FA: true,
        tempToken: await this.generateTempToken(user.id),
      };
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        status: 'ACTIVE',
      },
    });

    await this.securityLogger.logLoginAttempt(
      dto.email,
      true,
      ipAddress,
      userAgent,
      user.id,
    );

    return this.generateTokens(user.id, user.email, user.username);
  }

  /**
   * Verify 2FA and complete login
   */
  async verify2FALogin(
    tempToken: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync(tempToken, {
        secret: this.config.get('JWT_SECRET'),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify 2FA code
    const isValid = await this.twoFactorService.verify2FACode(userId, code);
    if (!isValid) {
      await this.securityLogger.log2FAEvent(
        userId,
        SecurityEventType.TWO_FACTOR_FAILED,
        false,
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Update login info
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    await this.securityLogger.logLoginAttempt(
      user.email,
      true,
      ipAddress,
      userAgent,
      user.id,
    );

    return this.generateTokens(user.id, user.email, user.username);
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.firstName,
    );

    await this.securityLogger.logSecurityEvent({
      type: SecurityEventType.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      email: user.email,
      success: true,
      message: 'Password reset requested',
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.securityLogger.logSecurityEvent({
      type: SecurityEventType.PASSWORD_RESET_COMPLETED,
      userId: user.id,
      email: user.email,
      success: true,
      message: 'Password reset completed',
    });
  }

  /**
   * Generate temporary token for 2FA
   */
  private async generateTempToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, temp: true },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '5m', // 5 minutes to complete 2FA
      },
    );
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    username?: string,
    tokenFamily?: string,
    replacedTokenId?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    // Fetch user with roles and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const roles = user?.userRoles.map((ur) => ur.role.name) || [];
    const permissions = Array.from(
      new Set(
        user?.userRoles.flatMap((ur) => {
          const scope = ur.organizationId ? `${ur.organizationId}:` : '';
          return ur.role.rolePermissions.map(
            (rp) => `${scope}${rp.permission.name}`,
          );
        }) || [],
      ),
    );

    const payload = {
      sub: userId,
      email,
      roles,
      permissions,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    });

    const family = tokenFamily || uuidv4();
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
        roles,
        permissions,
        status: user?.status,
        emailVerified: user?.emailVerified,
        avatar: user?.avatar,
        twoFactorEnabled: user?.twoFactorEnabled,
      },
    };
  }

  private getExpirationSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900;

    const [, value, unit] = match;
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };
    return parseInt(value) * multipliers[unit];
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
