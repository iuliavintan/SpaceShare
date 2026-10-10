import type { User } from '../../../generated/prisma/client.js';

export const publicUserSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

declare global {
  namespace Express {
    interface Request {
      authUser?: PublicUser;
    }
  }
}
