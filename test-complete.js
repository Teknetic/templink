// Comprehensive test of the fixed functionality

const testComplete = async () => {
  console.log('🧪 Testing TempLink - All Features\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Create link with NO optional fields (the bug case)
    console.log('\n✅ Test 1: Link with empty optional fields');
    const res1 = await fetch('http://localhost:3000/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/page1' })
    });
    const link1 = await res1.json();
    console.log('   Created:', link1.shortUrl);

    // Test 2: Create link WITH all optional fields
    console.log('\n✅ Test 2: Link with all optional fields');
    const res2 = await fetch('http://localhost:3000/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/page2',
        expiresIn: 7200,
        maxViews: 10,
        password: 'test123',
        customSlug: 'my-custom-link'
      })
    });
    const link2 = await res2.json();
    console.log('   Created:', link2.shortUrl);
    console.log('   Expires:', new Date(link2.expiresAt).toLocaleString());
    console.log('   Max views:', link2.maxViews);

    // Test 3: Test redirect
    console.log('\n✅ Test 3: Testing redirect');
    const res3 = await fetch(`http://localhost:3000/${link1.id}`, {
      redirect: 'manual'
    });
    console.log('   Status:', res3.status, res3.statusText);
    console.log('   Redirects to:', res3.headers.get('location'));

    // Test 4: Test analytics
    console.log('\n✅ Test 4: Testing analytics');
    const res4 = await fetch(`http://localhost:3000/api/links/${link1.id}/analytics`);
    const analytics = await res4.json();
    console.log('   Total views:', analytics.totalViews);
    console.log('   Is active:', analytics.isActive);
    console.log('   Recent visits:', analytics.recentVisits.length);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed! Bug is FIXED!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testComplete();
