import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Override the handleRequest method to allow unauthenticated users.
   * If authentication fails (e.g., no token, invalid token), it will not throw an error.
   * Instead, `req.user` will be undefined, and the request will proceed.
   */
  handleRequest(err, user, info) {
    return user;
  }
}