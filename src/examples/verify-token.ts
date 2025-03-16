/**
 * Verify Token Example
 * 
 * This example demonstrates how to verify that your Feedonomics API token is valid
 * without creating any resources. It simply attempts to list accounts, which is
 * a read-only operation that requires valid authentication.
 * 
 * Usage:
 *   npm run verify
 *   npm run verify -- --verbose
 */

import * as dotenv from 'dotenv';
import { createFeedonomicsApi } from '../index';

// Load environment variables
dotenv.config();

// Parse command line arguments
const isVerbose = process.argv.includes('--verbose');

// Check for required environment variables
if (!process.env.FEEDONOMICS_API_TOKEN) {
  console.error('❌ Error: FEEDONOMICS_API_TOKEN is required in .env file');
  process.exit(1);
}

async function verifyToken() {
  console.log('🔑 Verifying Feedonomics API token...');

  // Initialize the Feedonomics API client
  const baseUrl = process.env.FEEDONOMICS_BASE_API_URL || 'https://meta.feedonomics.com/api.php';
  const apiToken = process.env.FEEDONOMICS_API_TOKEN || '';
  const { client } = createFeedonomicsApi({
    apiToken,
    baseUrl,
    verbose: isVerbose
  });

  try {
    // Attempt to list accounts - this operation requires valid authentication
    console.log('📝 Attempting to list accounts...');
    const accountsResult = await client.accounts();
    
    if (!accountsResult.success) {
      throw new Error(accountsResult.error || 'Unknown error occurred');
    }
    
    // Token is valid!
    console.log('\n✅ API token is valid!');
    console.log('\nConnection Details:');
    console.log('------------------');
    const details = client.getConnectionDetails();
    console.log(`🔸 API URL: ${details.baseUrl}`);
    if (isVerbose) {
      console.log(`🔸 Authentication: x-api-key header (${details.apiKeySet})`);
    }
    console.log(`🔸 Number of accessible accounts: ${accountsResult.data?.length || 0}`);
    
    if (accountsResult.data && accountsResult.data.length > 0) {
      console.log('\nAccessible Accounts:');
      accountsResult.data.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.account_name} (ID: ${account.id})`);
      });
    }
    
    console.log('\n📌 Note: This token has the necessary permissions to:');
    console.log('  - List accounts');
    console.log('  - Access account information');
    
  } catch (error: any) {
    console.error('\n❌ API token verification failed!');
    console.error('Error Details:');
    console.error('-------------');
    console.error(`🔸 Message: ${error.message}`);
    const details = client.getConnectionDetails();
    console.error(`🔸 API URL: ${details.baseUrl}`);
    if (isVerbose) {
      console.error(`🔸 Authentication: x-api-key header (${details.apiKeySet})`);
    }
    console.error('\n🔍 Common issues:');
    console.error('  1. Token might be invalid or expired');
    console.error('  2. Network connectivity issues');
    console.error('  3. API endpoint might be temporarily unavailable');
    console.error('  4. Incorrect API base URL');
    console.error('\n📋 Troubleshooting steps:');
    console.error('  1. Verify the token in your .env file');
    console.error('  2. Check your internet connection');
    console.error('  3. Verify the FEEDONOMICS_BASE_API_URL is correct');
    console.error('  4. Try again in a few minutes');
    console.error('  5. Contact Feedonomics support if the issue persists');
    process.exit(1);
  }
}

// Run the verification
verifyToken(); 