# Contributing to Cloud Sovereignty Self-Assessment

Thank you for your interest in this project. We welcome your contributions.

## Technical Style Guidelines

This repository follows strict writing guidelines. You must follow these guidelines for all code, documentation, and commit messages:

1. **British English Spelling:** You must use the British English variant in all files (for example, use "organisation", "programme", and "behaviour").
2. **Simplified Technical English (ASD-STE100):** You must use Simplified Technical English for all user-facing text, error messages, and documentation. Use active voice, simple tenses, and short sentences. Semicolons are not permitted.

## How to Report Issues

If you find a bug, have a feature request, or want to suggest an improvement, please open an issue on GitHub. Please select and use the correct issue template when you create a new issue.

### Reporting Bugs
Use the **Bug Report** template. Please include:
- A clear description of the problem.
- Steps to reproduce the issue.
- The expected behaviour and the actual behaviour.
- Attach screenshots if they can provide a better understanding of the issue.
- Details about your environment (Node.js version, operating system, and browser).

### Suggesting Features and Improvements
Use the **Feature Request or Improvement** template. Please include:
- A clear explanation of the problem you want to solve.
- A detailed description of your proposed solution or change.
- Any alternative ideas or workarounds you have considered.
- Attach screenshots or mockups if they help explain your idea.

## Development Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/SUSE/csf-self-assessment.git
   cd csf-self-assessment-tools
   ```
2. Install dependencies (we pin pnpm to version 11.24.0):
   ```sh
   pnpm install --frozen-lockfile
   ```
3. Run the development servers:
   ```sh
   pnpm dev
   ```

## Quality Checks

Before you submit a pull request, make sure all checks pass:

```sh
pnpm lint            # Runs ESLint across the workspace
pnpm typecheck       # Runs Svelte and TypeScript checks
pnpm test            # Runs unit and smoke tests
pnpm verify          # Runs all quality checks and builds the project
```

## Commit Message Guidelines

This repository requires Conventional Commits. Your commit messages must follow the [Conventional Commits specification](https://www.conventionalcommits.org/).

Use the following format for your commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Approved types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

## Submitting Pull Requests

1. Create a branch from `main` for your changes.
2. Make your changes and write clear commit messages using the Conventional Commits specification.
3. We do not allow merge commits. We require a linear git history. Rebase your branch on `main` before you push your changes.
4. Run `pnpm verify` to make sure all checks pass.
5. Push your branch and open a pull request.
