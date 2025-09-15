import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/types/user.entity'; // Assuming entity path
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.getUserByUsername(username);
    if (user && (await UsersService.comparePassword(pass, user.password))) {      
      // Return the full user object, including password and token_version, for internal use.
      // The controller will be responsible for creating a safe DTO for the response.
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      token_version: user.token_version,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendPasswordResetLink(email: string): Promise<{ message: string }> {
    const user = await this.usersService.getUserByEmail(email);

    if (!user) {
      // For security, don't reveal if the user/email exists.
      this.logger.warn(`Password reset attempt for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_RESET_SECRET'),
      expiresIn: this.configService.get<string>('JWT_RESET_EXPIRES_IN'),
    });
    
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user, resetLink);
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });

      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Invalid token payload.');
      }

      const hashedPassword = await UsersService.hashPassword(newPassword);
      await this.usersService.updatePassword(userId, hashedPassword);

      return { message: 'Password has been reset successfully.' };
    } catch (error) {
      // Catches JWT errors like token expired or invalid signature
      throw new UnauthorizedException('Invalid or expired password reset token.');
    }
  }

  /**
   * Invalidates all current JWTs for a user by incrementing the token version.
   * @param userId The ID of the user to log out from all devices.
   */
  async logout(userId: number): Promise<void> {
    await this.usersService.incrementTokenVersion(userId);
  }
}
