// Quick API test script
const testAPI = async () => {
  try {
    console.log('Testing link creation API...\n');

    const response = await fetch('http://localhost:3000/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.example.com/very/long/url/to/shorten',
        expiresIn: 3600,
        maxViews: 10,
        password: 'secret123'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('Response text:', text);

    try {
      const data = JSON.parse(text);
      console.log('✅ Link created successfully!');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }

    console.log('\n---\n');

    // Test analytics
    console.log(`Testing analytics for link: ${data.id}...\n`);
    const analyticsResponse = await fetch(`http://localhost:3000/api/links/${data.id}/analytics`);
    const analytics = await analyticsResponse.json();
    console.log('✅ Analytics retrieved successfully!');
    console.log(JSON.stringify(analytics, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testAPI();
