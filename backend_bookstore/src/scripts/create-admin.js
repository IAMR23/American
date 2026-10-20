import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/index.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
const username = (process.env.ADMIN_USERNAME?.trim().toLowerCase() || email?.split('@')[0]).replace(/[^a-z0-9._-]/g, '-');
if (!email || !password || password.length < 12) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres).');
await connectDatabase();
const user = await User.findOneAndUpdate({ email }, { name, username, email, passwordHash: await bcrypt.hash(password, 12), role: 'admin', status: 'active', $inc: { tokenVersion: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true });
console.log(`Administrador preparado: ${user.email}`);
await mongoose.disconnect();
