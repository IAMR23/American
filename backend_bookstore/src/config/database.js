import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('La variable MONGO_URI es obligatoria.');
  }

  await mongoose.connect(mongoUri);
  console.log('Conexion con MongoDB establecida.');
}
