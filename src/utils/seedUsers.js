import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { validatePassword } from './userValidation.js';

export default async function seedUsers() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    if (await User.exists({ email })) return;
    validatePassword(password);
    const roles = await Role.find({ name: { $in: ['user', 'admin'] } });
    await User.create({ email, password: await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS || 10)),
        name: 'Administrador', lastName: 'Laboratorio', phoneNumber: '999999999', birthdate: new Date('2000-01-01'), roles: roles.map(role => role._id) });
    console.log('Usuario administrador creado:', email);
}
