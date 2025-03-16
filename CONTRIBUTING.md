# Contributing to Feedonomics Node.js API Client

Thank you for your interest in contributing to the Feedonomics Node.js API Client! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/feedonomics-client.git
   cd feedonomics-client
   ```
3. **Set up the development environment**:
   ```bash
   # Install dependencies
   npm install
   
   # Copy the environment template
   cp .env.template .env
   
   # Edit .env to add your Feedonomics API credentials
   ```
4. **Run the setup script** (optional):
   ```bash
   ./setup.sh
   ```

## Development Workflow

1. **Create a feature branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and ensure they follow the [coding standards](#coding-standards).

3. **Write tests** for your changes to ensure they work as expected.

4. **Run the tests** to make sure everything passes:
   ```bash
   npm test
   ```

5. **Run the linter** to ensure code quality:
   ```bash
   npm run lint
   ```

6. **Commit your changes** with a clear and descriptive commit message:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

7. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a pull request** from your fork to the main repository.

## Pull Request Process

1. Ensure your code follows the [coding standards](#coding-standards).
2. Update the README.md with details of changes if applicable.
3. Update the documentation if you're adding or changing functionality.
4. The PR should work with the existing tests and include new tests if adding functionality.
5. The PR will be merged once it receives approval from the maintainers.

## Coding Standards

This project follows TypeScript best practices and uses ESLint and Prettier for code formatting:

- Use TypeScript for all code.
- Follow the existing code style.
- Use meaningful variable and function names.
- Write clear comments and documentation.
- Keep functions small and focused on a single responsibility.
- Use async/await for asynchronous code.
- Handle errors appropriately.

## Testing

- Write unit tests for all new functionality.
- Ensure all tests pass before submitting a pull request.
- Aim for high test coverage.
- Use Jest for testing.

## Documentation

- Document all public APIs using JSDoc comments.
- Update the README.md if you're adding or changing functionality.
- Generate API documentation using TypeDoc:
  ```bash
  npm run docs
  ```

## Release Process

The release process is managed by the project maintainers:

1. Version numbers follow [Semantic Versioning](https://semver.org/).
2. Releases are published to npm by the maintainers.
3. Each release is tagged in the git repository.
4. Release notes are maintained in the CHANGELOG.md file.

---

Thank you for contributing to the Feedonomics Node.js API Client! 