import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/UserRepository.js';
import roleRepository from '../repositories/RoleRepository.js';
import { profileData, validatePassword, publicUser } from '../utils/userValidation.js';

class AuthService {

    async signUp(input) {
        const data = profileData(input);
        const { email } = data;
        const { password } = input;
        validatePassword(password);
        const roles = ['user'];
        const existing = await userRepository.findByEmail(email);
        if (existing) {
            const err = new Error('El email ya se encuentra en uso');
            err.status = 400;
            throw err;
        }

        //lógica par encriptar el password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
        const hashed = await bcrypt.hash(password, saltRounds);

        // Asignar los role ids
        const roleDocs = [];
        for (const r of roles) {
            let roleDoc = await roleRepository.findByName(r);
            if (!roleDoc) roleDoc = await roleRepository.create({ name: r });
            roleDocs.push(roleDoc._id);
        }

        const user = await userRepository.create({ ...data, password: hashed, roles: roleDocs });

        return publicUser(await userRepository.findById(user._id));
    }

    async signIn({ email, password }) {
        if (typeof email !== 'string' || typeof password !== 'string') {
            const err = new Error('Credenciales inválidas'); err.status = 401; throw err;
        }
        email = email.trim().toLowerCase();
        const user = await userRepository.findByEmail(email);
        if (!user) {
            const err = new Error('Credenciales inválidas');
            err.status = 401;
            throw err;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            const err = new Error('Credenciales inválidas');
            err.status = 401;
            throw err;
        }

        const token = jwt.sign({ 
            sub: user._id, 
            roles: user.roles.map(r => r.name) }, 
            process.env.JWT_SECRET, 
            { 
                expiresIn: process.env.JWT_EXPIRES_IN || '1h' 
            }
        );
        // console.log("Verify:", jwt.verify(token, process.env.JWT_SECRET));

        return { token };
    }
}

export default new AuthService();

