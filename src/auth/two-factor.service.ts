import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate 2FA secret and QR code for user
   */
  async generateSecret(
    userId: string,
  ): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `KuraKampus (${user.email})`,
      issuer: 'KuraKampus',
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (will be confirmed when user verifies)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  /**
   * Enable 2FA after verifying the code
   */
  async enable2FA(
    userId: string,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before/after
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => argon2.hash(code)),
    );

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    return { backupCodes };
  }

  /**
   * Verify 2FA code during login
   */
  async verify2FACode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Try TOTP code first
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (isValidTOTP) {
      return true;
    }

    // Try backup codes
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const isValidBackup = await argon2.verify(
        user.twoFactorBackupCodes[i],
        code,
      );
      if (isValidBackup) {
        // Remove used backup code
        const updatedCodes = [...user.twoFactorBackupCodes];
        updatedCodes.splice(i, 1);
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorBackupCodes: updatedCodes },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isValidPassword = await argon2.verify(user.password, password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });
  }

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled || false;
  }
}
