import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from '../models/user.models.js';

async function fixTouristIdIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the existing touristId index if it exists
    try {
      await User.collection.dropIndex('touristId_1');
      console.log('Dropped existing touristId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index touristId_1 does not exist, skipping drop');
      } else {
        throw error;
      }
    }

    // Create the new sparse unique index
    await User.collection.createIndex(
      { touristId: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'touristId_1'
      }
    );
    console.log('Created new sparse unique index on touristId');

    // Verify the index
    const indexes = await User.collection.indexes();
    const touristIdIndex = indexes.find(idx => idx.name === 'touristId_1');
    console.log('Index details:', JSON.stringify(touristIdIndex, null, 2));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing index:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixTouristIdIndex();

