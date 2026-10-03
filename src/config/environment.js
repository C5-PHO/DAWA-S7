import dotenv from 'dotenv';

dotenv.config();

export function loadConfig(env = process.env) {
    const port = Number(env.PORT ?? 3000);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT debe ser un puerto válido.');
    if (!env.MONGODB_URI?.startsWith('mongodb')) throw new Error('Configura MONGODB_URI en .env.');
    if (!env.JWT_SECRET || env.JWT_SECRET === 'replace_with_a_random_secret') throw new Error('Configura un JWT_SECRET propio en .env.');
    const saltRounds = Number(env.BCRYPT_SALT_ROUNDS || 10);
    if (!Number.isInteger(saltRounds) || saltRounds < 4 || saltRounds > 16) throw new Error('BCRYPT_SALT_ROUNDS debe estar entre 4 y 16.');
    return Object.freeze({ port, mongoUri: env.MONGODB_URI, production: env.NODE_ENV === 'production',
        corsOrigins: (env.CORS_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean) });
}
