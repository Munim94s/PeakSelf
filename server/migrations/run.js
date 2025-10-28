/**
 * Migration runner
 * Usage: node server/migrations/run.js <migration_name> [up|down]
 * Example: node server/migrations/run.js add_soft_deletes up
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');
dotenv.config({ path: join(serverDir, '.env') });

// Get migration name and direction from command line
const migrationName = process.argv[2];
const direction = process.argv[3] || 'up';

if (!migrationName) {
  console.error('Usage: node server/migrations/run.js <migration_name> [up|down]');
  console.error('Example: node server/migrations/run.js add_soft_deletes up');
  process.exit(1);
}

if (!['up', 'down'].includes(direction)) {
  console.error('Direction must be either "up" or "down"');
  process.exit(1);
}

// Import and run the migration
(async () => {
  try {
    const migration = await import(`./${migrationName}.js`);
    
    if (typeof migration[direction] !== 'function') {
      console.error(`Migration ${migrationName} does not export a ${direction}() function`);
      process.exit(1);
    }
    
    console.log(`Running migration: ${migrationName} (${direction})`);
    await migration[direction]();
    console.log(`Migration ${migrationName} (${direction}) completed successfully`);
    process.exit(0);
  } catch (error) {
    console.error(`Migration ${migrationName} (${direction}) failed:`, error);
    process.exit(1);
  }
})();
