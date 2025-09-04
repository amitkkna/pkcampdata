// Auth middleware disabled; leaving a no-op to preserve imports if referenced somewhere else.
import type { Request, Response, NextFunction } from 'express';
export async function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  return next();
}
