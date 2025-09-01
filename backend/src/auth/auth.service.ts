import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/user.service';
import { Session } from './types/session';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  // TODO Move to real service with TTL and cleanup background task
  private sessionStorage: Map<string, Session> = new Map<string, Session>(); // access_token -> Session
  private userSessions: Map<string, string> = new Map<string, string>(); // username -> access_token

  private readonly logger = new Logger(AuthService.name);

  private static SESSION_LENGTH = (1000 * 60 * 60); // 1 Hour

  constructor(
    private usersService: UsersService
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async cleanOldSessions() {
    this.logger.log("Running cleanOldSessions");
    let cleanups: number = 0;
    for (let [key, value] of this.sessionStorage) {
        if(!this.isSessionValid(value)) {
            this.deleteSession(value);
            cleanups+=1;
        }
    }
    this.logger.log(`Cleaned up ${cleanups}`);
  }

  async validateUser(username: string, pass: string): Promise<string | null> {
    const user = await this.usersService.getUserByUsername(username);
    if (user && await UsersService.comparePassword(pass, user)) {
      this.sessionStorage.delete(this.userSessions.get(user.username)); // Delete old user session
      const accessToken = randomUUID();
      this.sessionStorage.set(accessToken, { // Create new access_token
        access_token: accessToken,
        user_id: user.id,
        user_username: user.username,
        submitted_at: new Date(),
      });
      this.userSessions.set(user.username, accessToken); // set new user session
      
      return accessToken;
    }
    return null;
  }

  async validateSession(access_token: string): Promise<Session> {
    const currSession = this.sessionStorage.get(access_token);
    if (!currSession) {
        throw new UnauthorizedException('Session not authorized.');
    }
    if(!this.isSessionValid(currSession)) {
        this.userSessions.delete(currSession.user_username);
        this.sessionStorage.delete(access_token); // TODO Background cleanup task
        throw new UnauthorizedException('Session expired.');
    }
    return currSession;
  }

  isSessionValid(session: Session): boolean {
    const validUntil = session.submitted_at.getTime() + AuthService.SESSION_LENGTH; // TODO + 1day
    return !(validUntil < (new Date()).getTime());
  }

  deleteSession(session: Session) {
    this.logger.log("Removing access token from session cache: " + session.access_token);
    this.sessionStorage.delete(session.access_token);
  }
}