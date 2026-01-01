// Test database directly
import db from './src/database.js';

console.log('Testing database operations...\n');

try {
  // Test insert
  const stmt = db.prepare('INSERT INTO links (id, original_url, created_at, is_active) VALUES (?, ?, ?, ?)');
  stmt.run('test123', 'https://example.com', Date.now(), 1);
  console.log('✅ Insert successful');

  // Test select
  const selectStmt = db.prepare('SELECT * FROM links WHERE id = ?');
  const result = selectStmt.get('test123');
  console.log('✅ Select successful');
  console.log('Result:', result);

} catch (error) {
  console.error('❌ Database error:', error.message);
  console.error(error.stack);
}
