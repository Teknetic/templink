// Test linkService directly
import * as linkService from './src/linkService.js';

console.log('Testing linkService...\n');

try {
  const result = await linkService.createLink({
    originalUrl: 'https://www.example.com/test',
    expiresIn: 3600,
    maxViews: 10,
    password: 'secret123',
    customSlug: null,
    creatorIp: '127.0.0.1'
  });

  console.log('✅ Link created successfully!');
  console.log(result);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
