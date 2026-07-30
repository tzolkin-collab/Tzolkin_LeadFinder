import { prisma } from './src/index.js';

async function main() {
  try {
    console.log('Starting safe migration for SignalType enum to String...');
    
    // Convert enum column to text, using the enum's string representation
    await prisma.$executeRawUnsafe(`ALTER TABLE "signals" ALTER COLUMN "type" TYPE text USING type::text;`);
    console.log('Successfully changed type column to text.');
    
    // Drop the enum type
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "SignalType" CASCADE;`);
    console.log('Successfully dropped SignalType enum.');
    
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
