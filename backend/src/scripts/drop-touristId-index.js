import mongoose from 'mongoose';
import 'dotenv/config';

async function dropTouristIdIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Try to drop the touristId_1 index
    try {
      await collection.dropIndex('touristId_1');
      console.log('✅ Successfully dropped touristId_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index touristId_1 does not exist');
      } else {
        console.error('❌ Error dropping index:', error.message);
        throw error;
      }
    }

    // Verify it's gone
    const indexesAfter = await collection.indexes();
    console.log('Indexes after drop:', indexesAfter.map(idx => idx.name));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    console.log('\n✅ Done! Restart your server and the new sparse index will be created automatically.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

dropTouristIdIndex();

