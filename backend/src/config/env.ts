import 'dotenv/config';

const portValue = process.env.PORT ?? '3000';
if (!/^\d+$/.test(portValue)) {
  throw new Error('PORT trebuie sa fie un numar intreg intre 1 si 65535.');
}

const port = Number(portValue);
if (port < 1 || port > 65535) {
  throw new Error('PORT trebuie sa fie intre 1 si 65535.');
}

export const env = { port };
