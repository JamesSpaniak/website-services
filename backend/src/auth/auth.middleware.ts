import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    console.debug("AuthMiddleWare Starting");
    const authHeader = req.headers?.authorization?.split(' ').pop();
    console.log("Auth Header to compare: " + authHeader);
    const isValid = await this.authService.validateSession(authHeader);
    if (!isValid) {
        const err = new UnauthorizedException('Session is not valid')
        next(err);
    }
    next();
  }
}
