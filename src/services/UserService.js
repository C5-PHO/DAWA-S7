import userRepository from '../repositories/UserRepository.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { publicUser, profileData, validatePassword, fail } from '../utils/userValidation.js';

class UserService {

    async getAll() {
        return (await userRepository.getAll()).map(publicUser);
    }

    async getById(id) {
        if (!mongoose.isValidObjectId(id)) fail('Usuario no encontrado', 404);
        const user = await userRepository.findById(id);
        if (!user) {
            const err = new Error('Usuario no encontrado');
            err.status = 404;
            throw err;
        }
        return publicUser(user);
    }

    async updateMe(id, input) {
        const data = profileData(input);
        const existing = await userRepository.findByEmail(data.email);
        if (existing && String(existing._id) !== String(id)) fail('El email ya se encuentra en uso');
        if (input.password) {
            validatePassword(input.password);
            data.password = await bcrypt.hash(input.password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
        }
        const user = await userRepository.updateProfile(id, data);
        if (!user) fail('Usuario no encontrado', 404);
        return publicUser(user);
    }
}

export default new UserService();

