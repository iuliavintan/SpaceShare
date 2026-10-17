import type { PrismaClient } from '../../../generated/prisma/client.js';

export function categoriesService(client: PrismaClient) {
  return {
    list: () => client.category.findMany({ orderBy: { name: 'asc' } }),
    create: (name: string) => client.category.create({ data: { name } }),
    update: (id: string, name: string) => client.category.update({ where: { id }, data: { name } }),
  };
}
