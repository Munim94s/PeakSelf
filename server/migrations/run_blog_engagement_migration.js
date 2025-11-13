import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: join(__dirname, '../.env') });

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    console.log('🔄 Running blog engagement migration...');
    
    if (command === 'up') {
      const { up } = await import('./create_blog_engagement.js');
      await up();
      console.log('✅ Migration completed successfully!');
    } else if (command === 'down') {
      const { down } = await import('./create_blog_engagement.js');
      await down();
      console.log('✅ Migration rolled back successfully!');
    } else {
      console.log('Usage: node run_blog_engagement_migration.js [up|down]');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
