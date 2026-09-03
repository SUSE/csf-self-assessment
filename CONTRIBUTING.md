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

### Running Verification in Headless or Container Environments

The desktop smoke tests launch a real Electron application. If you run the verification suite in a headless Linux environment, or in a container (such as Docker or Podman), you must install additional system packages.

You can run the combined verification pipeline with this command:

```sh
pnpm verify:headless
```

This command wraps the verification pipeline inside a virtual framebuffer server (`xvfb-run`). The virtual display is only required for the `pnpm test` stage. Other stages like linting, typechecking, or building do not need a display server.

#### Package Requirements

This section is **ILLUSTRATIVE**. It doesn't pretend to list all the operative systems and the packages may change through the time, so what worked one day may not work today.

Install these packages using your system package manager.

##### 1. openSUSE Tumbleweed / Leap (Docker/Podman)
```sh
sudo zypper install -y \
  xvfb-run \
  dejavu-fonts \
  libasound2 \
  libatk-1_0-0 \
  at-spi2-core \
  libcups2 \
  libdbus-1-3 \
  libcairo2 \
  libgtk-3-0 \
  libpango-1_0-0 \
  libX11-6 \
  libXcomposite1 \
  libXdamage1 \
  libXext6 \
  libXfixes3 \
  libXrandr2 \
  libxcb1 \
  libxkbcommon0 \
  mozilla-nspr \
  mozilla-nss
```

##### 2. Debian / Ubuntu (Docker/Podman)
```sh
sudo apt-get update && sudo apt-get install -y \
  xvfb \
  fonts-dejavu-core \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxkbcommon0
```

##### 3. Fedora / Red Hat Enterprise Linux (Docker/Podman)
```sh
sudo dnf install -y \
  xorg-x11-server-Xvfb \
  dejavu-sans-fonts \
  alsa-lib \
  atk \
  at-spi2-atk \
  cups-libs \
  dbus-libs \
  cairo \
  gtk3 \
  pango \
  libX11 \
  libXcomposite \
  libXdamage \
  libXext \
  libXfixes \
  libXrandr \
  mesa-libGBM \
  libxcb \
  libxkbcommon
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
