import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createNamespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Create the namespace once. It's idempotent.
const ns = createNamespace('app-namespace');

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    ns.run(() => {
      const requestId = (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || uuidv4();
      ns.set('requestId', requestId);
      res.setHeader(REQUEST_ID_HEADER, requestId);
      next();
    });
  }
}