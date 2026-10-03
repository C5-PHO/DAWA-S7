import mongoose from 'mongoose';

export async function connectDatabase(config) {
    await mongoose.connect(config.mongoUri, { autoIndex: !config.production, serverSelectionTimeoutMS: 10000 });
    console.log('Mongo connected');
}

export async function disconnectDatabase() { await mongoose.disconnect(); }
