import User from '../models/User.js';

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return user.save();
    }

    async findByEmail(email) {
        return User.findOne({ email }).populate('roles').exec();
    }

    async findById(id) {
        return User.findById(id).populate('roles').exec();
    }

    async updatePassword(id, hashedPassword) {
        return User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true }).exec();
    }

    async getAll() {
        return User.find().populate('roles').exec();
    }

    async getPage(page, limit) {
        const [users, total] = await Promise.all([
            User.find().select('-password').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('roles').exec(),
            User.countDocuments().exec()
        ]);
        return { users, total };
    }

    async updateProfile(id, data) {
        return User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).populate('roles').exec();
    }
}

export default new UserRepository();

