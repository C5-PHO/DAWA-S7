import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { profileData, validatePassword } from '../src/utils/userValidation.js';

dotenv.config();

test('Registration validation rejects weak passwords and impossible birthdates', () => {
    for (const value of ['abcdefgh', 'Abcdefgh', 'Abcdefg1', 'Ab1#']) assert.throws(() => validatePassword(value));
    validatePassword('Password#2026');
    const input = { name: 'Ana', lastName: 'Prueba', email: 'ANA@example.com', phoneNumber: '999999999', birthdate: '2001-02-28' };
    assert.equal(profileData(input).email, 'ana@example.com');
    assert.throws(() => profileData({ ...input, birthdate: '2001-02-29' }));
    assert.throws(() => profileData({ ...input, birthdate: '2999-01-01' }));
    assert.throws(() => profileData({ ...input, lastName: '' }));
    assert.throws(() => profileData({ ...input, url_profile: 'javascript:alert(1)' }));
});

test('Full account flow enforces roles, protects pages and saves profile changes', { timeout: 30000 }, async () => {
    const database = `auth_lab_test_${process.pid}_${Date.now()}`;
    const connection = await mongoose.createConnection(process.env.MONGODB_URI, { dbName: database, serverSelectionTimeoutMS: 3000 }).asPromise();
    const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const secret = 'isolated-laboratory-test-secret';
    const uri = process.env.MONGODB_URI.replace(/\/[^/?]+(\?.*)?$/, `/${database}$1`);
    const child = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, MONGODB_URI: uri, PORT: String(port), JWT_SECRET: secret, ADMIN_EMAIL: 'admin@test.local', ADMIN_PASSWORD: 'Admin#2026' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    const base = `http://127.0.0.1:${port}`;
    async function request(path, method = 'GET', body, token, cookie) {
        return fetch(base + path, { method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    try {
        for (let i = 0; i < 100; i++) {
            if (child.exitCode != null) throw new Error(output);
            try { if ((await request('/health')).ok) break; } catch {}
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal((await request('/health')).status, 200, output);
        for (const path of ['/signIn', '/signUp']) assert.equal((await request(path)).status, 200);
        assert.equal((await request('/missing-page')).status, 404);
        assert.equal((await request('/profile')).headers.get('location'), '/signIn');
        assert.equal((await request('/api/users/me')).status, 401);
        const data = { name: 'Ana', lastName: 'Prueba', email: 'ana@test.local', phoneNumber: '999999999', birthdate: '2001-02-28', password: 'Prueba#2026', roles: ['admin'] };
        assert.equal((await request('/api/auth/signUp', 'POST', { ...data, password: 'weak' })).status, 400);
        const signup = await request('/api/auth/signUp', 'POST', data); assert.equal(signup.status, 201);
        const registered = await signup.json(); assert.deepEqual(registered.roles, ['user']); assert.ok(!('password' in registered));
        assert.equal((await request('/api/auth/signUp', 'POST', data)).status, 400);
        assert.equal((await request('/api/auth/signIn', 'POST', { email: data.email, password: 'incorrect' })).status, 401);
        const login = await request('/api/auth/signIn', 'POST', data);
        const cookie = login.headers.get('set-cookie').split(';')[0]; const { token } = await login.json();
        assert.equal((await request('/dashboard/user', 'GET', null, null, cookie)).status, 200);
        assert.equal((await request('/profile', 'GET', null, null, cookie)).status, 200);
        assert.equal((await request('/dashboard/admin', 'GET', null, null, cookie)).status, 403);
        assert.equal((await request('/api/users', 'GET', null, token)).status, 403);
        const edited = await request('/api/users/me', 'PATCH', { ...data, name: 'Ana editada', password: '', address: 'Lima', roles: ['admin'] }, token);
        assert.equal(edited.status, 200); const profile = await edited.json(); assert.equal(profile.name, 'Ana editada'); assert.deepEqual(profile.roles, ['user']); assert.equal(typeof profile.age, 'number');
        assert.equal((await request('/api/users/me', 'PATCH', { ...data, password: 'weak' }, token)).status, 400);
        assert.equal((await request('/api/users/me', 'PATCH', { ...data, password: 'Nueva#2026' }, token)).status, 200);
        assert.equal((await request('/api/auth/signIn', 'POST', { email: data.email, password: data.password })).status, 401);
        assert.equal((await request('/api/auth/signIn', 'POST', { email: data.email, password: 'Nueva#2026' })).status, 200);
        const expired = jwt.sign({ sub: registered.id, roles: ['user'] }, secret, { expiresIn: -1 });
        assert.equal((await request('/api/users/me', 'GET', null, expired)).status, 401);
        assert.equal((await request('/profile', 'GET', null, null, `session_token=${expired}`)).headers.get('location'), '/signIn');
        const adminLogin = await request('/api/auth/signIn', 'POST', { email: 'admin@test.local', password: 'Admin#2026' });
        const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0]; const admin = await adminLogin.json();
        assert.equal((await request('/dashboard/admin', 'GET', null, null, adminCookie)).status, 200);
        const users = await (await request('/api/users', 'GET', null, admin.token)).json(); assert.equal(users.length, 2); assert.ok(users.every(user => !('password' in user)));
        assert.equal((await request(`/api/users/${registered.id}`, 'GET', null, admin.token)).status, 200);
        assert.equal((await request('/api/users/not-an-id', 'GET', null, admin.token)).status, 404);
        const out = await request('/api/auth/signOut', 'POST'); assert.equal(out.status, 200); assert.match(out.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
    } finally {
        if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
        // Solo se borra la base temporal cuyo nombre generó esta prueba.
        assert.ok(database.startsWith(`auth_lab_test_${process.pid}_`));
        await connection.dropDatabase(); await connection.close();
    }
});
