import { loadConfig } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createApp } from './app.js';
import seedRoles from './utils/seedRoles.js';
import seedUsers from './utils/seedUsers.js';

let server;
let stopping = false;

async function shutdown() {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    try {
        if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await disconnectDatabase();
        clearTimeout(deadline);
    } catch (error) {
        console.error('Error al cerrar el servidor:', error.message);
        process.exitCode = 1;
    }
}

async function start() {
    const config = loadConfig();
    await connectDatabase(config);
    await seedRoles();
    await seedUsers();
    const app = createApp(config);
    server = app.listen(config.port, () => console.log(`Servidor corriendo en el puerto ${server.address().port}`));
    server.on('error', async error => {
        console.error('No se pudo iniciar HTTP:', error.message);
        process.exitCode = 1;
        await shutdown();
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
start().catch(async error => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exitCode = 1;
    await shutdown();
});
