import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { PrismaClient, ResourceImage } from '../../../generated/prisma/client.js';
import { HttpError } from '../../shared/http-error.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const formats = {
  'image/png': { extension: '.png', signature: (file: Buffer) => file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/jpeg': { extension: '.jpg', signature: (file: Buffer) => file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff },
  'image/webp': { extension: '.webp', signature: (file: Buffer) => file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WEBP' },
} as const;

export function floorplansService(client: PrismaClient, directory: string) {
  async function removeFile(filename: string) {
    if (basename(filename) !== filename) return;
    await unlink(join(directory, filename)).catch((error: unknown) => {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    });
  }

  return {
    async save(resourceId: string, contentType: string, file: unknown) {
      if (!Buffer.isBuffer(file) || file.length === 0 || file.length > MAX_FILE_SIZE) {
        throw new HttpError(400, 'Imaginea trebuie sa aiba intre 1 byte si 5 MB.');
      }
      const format = formats[contentType as keyof typeof formats];
      if (!format || !format.signature(file)) throw new HttpError(400, 'Foloseste un fisier PNG, JPEG sau WebP valid.');
      const resource = await client.resource.findUnique({ where: { id: resourceId }, select: { id: true, name: true } });
      if (!resource) throw new HttpError(404, 'Resursa nu exista.');

      await mkdir(directory, { recursive: true });
      const filename = `${randomUUID()}${format.extension}`;
      const filepath = join(directory, filename);
      await writeFile(filepath, file, { flag: 'wx' });
      let previous: ResourceImage | null = null;
      let image: ResourceImage;
      try {
        previous = await client.resourceImage.findFirst({ where: { resourceId, position: 0 } });
        image = previous
          ? await client.resourceImage.update({ where: { id: previous.id }, data: { path: filename, altText: `Plan arhitectural pentru ${resource.name}` } })
          : await client.resourceImage.create({ data: { resourceId, path: filename, altText: `Plan arhitectural pentru ${resource.name}`, position: 0 } });
      } catch (error) {
        await removeFile(filename);
        throw error;
      }
      if (previous) await removeFile(previous.path);
      return image;
    },
    async remove(resourceId: string) {
      const image = await client.resourceImage.findFirst({ where: { resourceId, position: 0 } });
      if (!image) throw new HttpError(404, 'Sala nu are un plan arhitectural incarcat.');
      await client.resourceImage.delete({ where: { id: image.id } });
      await removeFile(image.path);
    },
    async find(resourceId: string) {
      const image = await client.resourceImage.findFirst({ where: { resourceId, position: 0 } });
      if (!image || basename(image.path) !== image.path || extname(image.path) === '') return null;
      return image;
    },
    async read(resourceId: string) {
      const image = await client.resourceImage.findFirst({ where: { resourceId, position: 0 } });
      if (!image || basename(image.path) !== image.path || extname(image.path) === '') throw new HttpError(404, 'Planul arhitectural nu exista.');
      try {
        return { image, file: await readFile(join(directory, image.path)) };
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new HttpError(404, 'Fisierul planului arhitectural nu exista.');
        throw error;
      }
    },
  };
}
