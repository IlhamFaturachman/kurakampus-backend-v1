import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(private config: ConfigService) {
    const smtpHost = this.config.get('SMTP_HOST');
    const smtpPort = this.config.get('SMTP_PORT');
    const smtpUser = this.config.get('SMTP_USER');
    const smtpPass = this.config.get('SMTP_PASS');
    this.from = this.config.get('SMTP_FROM') || 'noreply@kurakampus.com';

    if (smtpHost && smtpPort) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      });

      this.logger.log('Email service initialized');
    } else {
      this.logger.warn('SMTP not configured, emails will be logged only');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `[EMAIL] To: ${options.to}, Subject: ${options.subject}`,
      );
      this.logger.debug(`[EMAIL BODY] ${options.text || options.html}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string,
  ): Promise<void> {
    const verificationUrl = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Verifikasi Email Anda</h2>
            <p>Halo ${firstName},</p>
            <p>Terima kasih telah mendaftar di KuraKampus! Silakan verifikasi email Anda dengan mengklik tombol di bawah ini:</p>
            <a href="${verificationUrl}" class="button">Verifikasi Email</a>
            <p>Atau salin dan tempel link berikut ke browser Anda:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
            <p>Link ini akan kadaluarsa dalam 24 jam.</p>
            <div class="footer">
              <p>Jika Anda tidak mendaftar di KuraKampus, abaikan email ini.</p>
              <p>&copy; ${new Date().getFullYear()} KuraKampus. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verifikasi Email - KuraKampus',
      html,
      text: `Halo ${firstName}, silakan verifikasi email Anda dengan mengunjungi: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
  ): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #DC2626; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .warning { 
              background-color: #FEF3C7; 
              border-left: 4px solid #F59E0B; 
              padding: 12px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset Password</h2>
            <p>Halo ${firstName},</p>
            <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Atau salin dan tempel link berikut ke browser Anda:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Penting:</strong> Link ini akan kadaluarsa dalam 1 jam.
            </div>
            <div class="footer">
              <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda tidak akan berubah.</p>
              <p>&copy; ${new Date().getFullYear()} KuraKampus. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Password - KuraKampus',
      html,
      text: `Halo ${firstName}, reset password Anda dengan mengunjungi: ${resetUrl}`,
    });
  }

  async send2FAEnabledEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { 
              background-color: #D1FAE5; 
              border-left: 4px solid #10B981; 
              padding: 12px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Two-Factor Authentication Diaktifkan</h2>
            <p>Halo ${firstName},</p>
            <div class="success">
              <strong>✓ Berhasil!</strong> Two-Factor Authentication (2FA) telah diaktifkan untuk akun Anda.
            </div>
            <p>Akun Anda sekarang lebih aman dengan lapisan keamanan tambahan.</p>
            <p>Setiap kali login, Anda akan diminta memasukkan kode verifikasi dari aplikasi authenticator Anda.</p>
            <div class="footer">
              <p>Jika Anda tidak mengaktifkan 2FA, segera hubungi tim support kami.</p>
              <p>&copy; ${new Date().getFullYear()} KuraKampus. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '2FA Diaktifkan - KuraKampus',
      html,
      text: `Halo ${firstName}, Two-Factor Authentication telah diaktifkan untuk akun Anda.`,
    });
  }

  async sendAccountLockedEmail(
    email: string,
    firstName: string,
    reason: string,
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { 
              background-color: #FEE2E2; 
              border-left: 4px solid #DC2626; 
              padding: 12px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Akun Anda Dikunci</h2>
            <p>Halo ${firstName},</p>
            <div class="alert">
              <strong>⚠️ Peringatan Keamanan:</strong> Akun Anda telah dikunci.
            </div>
            <p><strong>Alasan:</strong> ${reason}</p>
            <p>Untuk membuka kunci akun Anda, silakan hubungi tim support kami atau tunggu 30 menit.</p>
            <div class="footer">
              <p>Jika Anda merasa ini adalah kesalahan, segera hubungi support@kurakampus.com</p>
              <p>&copy; ${new Date().getFullYear()} KuraKampus. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Akun Dikunci - KuraKampus',
      html,
      text: `Halo ${firstName}, akun Anda telah dikunci. Alasan: ${reason}`,
    });
  }
}
