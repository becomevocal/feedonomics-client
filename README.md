# Feedonomics Node.js API Client

[![Publish Package](https://github.com/becomevocal/feedonomics-client/actions/workflows/publish.yml/badge.svg)](https://github.com/becomevocal/feedonomics-client/actions/workflows/publish.yml)

A Node.js client library for the Feedonomics API, designed to help you integrate with Feedonomics for product data synchronization between ecommerce platforms and marketing channels.

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
npm install fdx-client
```

## Quick Start

```typescript
import { createFeedonomicsApi } from 'fdx-client';

// Create both client and service with one call
const { client, service } = createFeedonomicsApi({
  apiToken: 'your-api-token',
  dbId: 'optional-database-id' // Can be set later with client.setDbId()
});
```

## Direct Client Usage

If you prefer more control, you can use the client directly:

```typescript
import { createClient } from 'fdx-client';

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
git clone https://github.com/yourusername/fdx-client.git
cd fdx-client

# Install dependencies
npm install

# Build the library
npm run build
```

### Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions, create changelogs, and publish to npm. Here's how to create a new release:

#### Adding a Changeset

When making changes that should be published in a new version:

1. Run `npm run changeset`
2. Follow the prompts to:
   - Select the type of change (major, minor, patch)
   - Provide a description of the change (this will appear in the changelog)
3. Commit the generated changeset file along with your changes

#### Automated Release Process

The repository is configured with GitHub Actions to:

1. Automatically create a "Version Packages" PR when changesets are detected on the main branch
2. When the "Version Packages" PR is merged:
   - Package versions will be updated according to the changesets
   - CHANGELOG.md will be updated
   - Changes will be published to npm
   - A GitHub Release will be created

#### Required Environment Variables

For the automated release process to work, the following GitHub repository secrets are required:

- `NPM_TOKEN`: An npm token with publish permissions
  - Create one at https://www.npmjs.com/settings/your-username/tokens
  - Add it as a repository secret in GitHub: `Settings > Secrets and variables > Actions`

> **Note:** The workflow also uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions and does not need to be manually configured.

#### Manual Release

If needed, you can also perform a manual release:

```bash
# Update version and changelog based on changesets
npm run version

# Publish to npm (requires npm login)
npm run release
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