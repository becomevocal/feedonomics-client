# Feedonomics Node.js API Client

A Node.js client library for the Feedonomics API, designed to help you integrate with Feedonomics for product data synchronization between eCommerce platforms and marketing channels.

## Features

- TypeScript support
- Promise-based API for all operations
- Comprehensive error handling and response normalization
- Support for these Feedonomics API endpoints:
  - Account and database management
  - Import configuration and scheduling
  - Export configuration and scheduling
  - Transformers management
  - Vault entries for secure credential storage
  - FTP account management

## Installation

```bash
npm install feedonomics-client
```

## Quick Start

```typescript
import { createFeedonomicsApi } from 'feedonomics-client';

// Create both client and service with one call
const { client, service } = createFeedonomicsApi({
  apiToken: 'your-api-token',
  dbId: 'optional-database-id' // Can be set later with client.setDbId()
});
```

## Direct Client Usage

If you prefer more control, you can use the client directly:

```typescript
import { createClient } from 'feedonomics-client';

const client = createClient({
  apiToken: 'your-api-token',
  dbId: 'your-database-id'
});

async function getAccounts() {
  const response = await client.accounts();
  
  if (response.success) {
    console.log('Accounts:', response.data);
  } else {
    console.error('Error getting accounts:', response.error);
  }
}

getAccounts();
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/feedonomics-client.git
cd feedonomics-client

# Install dependencies
npm install

# Build the library
npm run build
```

## Running Examples

There are complete examples provided in the `src/examples` directory:

1. `bigcommerce-setup.ts` - A step-by-step demonstration of setting up BigCommerce integration
2. `bigcommerce-integrated-setup.ts` - A simplified setup using the new `setupBigCommerceIntegration` method

To run the examples:

1. Copy `.env.template` to `.env` and fill in your credentials
2. Run an example:

```bash
# Verify the API token works
npm run example:verify-api-token

# Run the step-by-step setup that runs through a sequence of calls
# (Helpful for understanding how the complete process works)
npm run example:manual-bigcommerce-setup

# Run the streamlined setup process that uses one service method
# (This is what an app utilizing the library would likely prefer)
npm run example:example:automated-bigcommerce-setup
```

### Testing

The library includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Linting

Ensure code quality with ESLint:

```bash
npm run lint
```

### Documentation

Generate API documentation with TypeDoc:

```bash
npm run docs
```

Then open `docs/index.html` in your browser.

## License

MIT 