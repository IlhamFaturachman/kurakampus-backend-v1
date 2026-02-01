import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@SkipThrottle() // Skip default throttle, use custom per endpoint
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 requests per minute
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);

    // Set secure httpOnly cookies
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Registration successful',
      user: result.user,
      // Also return tokens in body for frontend that stores in memory/localStorage
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 10 } }) // 10 requests per minute
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set secure httpOnly cookies
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Login successful',
      user: result.user,
      // Also return tokens in body for frontend that stores in memory/localStorage
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('refresh')
  @Throttle({ short: { ttl: 60000, limit: 20 } }) // 20 requests per minute
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] as string | undefined;

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await this.authService.refreshTokens(
      refreshToken,
      userAgent,
      ipAddress,
    );

    // Set new secure httpOnly cookies
    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      message: 'Tokens refreshed',
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookies
    await Promise.resolve();
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Access Token Cookie (15 minutes)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax', // Use 'lax' in dev for cross-origin
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Refresh Token Cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax', // Use 'lax' in dev for cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // Use root path for easier access in development
    });
  }
}
