import type { PrismaClient } from '../../../generated/prisma/client.js';
import { handleDuplicateEmail } from '../auth/auth.service.js';
import type { profileInput } from '../auth/auth.validation.js';
import { publicUserSelect } from './user.types.js';

export function usersService(client: PrismaClient) {
  return {
    async updateProfile(id: string, data: ReturnType<typeof profileInput>) {
      try { return await client.user.update({ where: { id }, data, select: publicUserSelect }); }
      catch (error: unknown) { return handleDuplicateEmail(error); }
    },
  };
}
