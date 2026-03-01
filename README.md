# pixelmuse

[![CI](https://github.com/starmorph/pixelmuse-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/starmorph/pixelmuse-cli/actions/workflows/ci.yml)
[![Security](https://github.com/starmorph/pixelmuse-cli/actions/workflows/security.yml/badge.svg)](https://github.com/starmorph/pixelmuse-cli/actions/workflows/security.yml)
[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

AI image generation from the command line, powered by the [Pixelmuse](https://pixelmuse.studio) API.

Built for developers who live in the terminal — works standalone, pipes with other tools, and integrates natively with Claude Code, Cursor, and any MCP-compatible AI agent.

```bash
pixelmuse "astronaut riding a horse"
# Nano Banana 2 · 1 credit (balance: 142) — generating...
# Generated in 4.2s · 1 credit charged (remaining: 141)
#   Saved to ./astronaut-riding-a-horse.png
```

## Getting Started

### 1. Create an account

Sign up at [pixelmuse.studio/signup](https://pixelmuse.studio/signup). New accounts include free credits to get started.

### 2. Get an API key

Generate your API key at [pixelmuse.studio/developers](https://pixelmuse.studio/developers).

### 3. Install

```bash
# Run directly (no install needed)
npx pixelmuse

# Or install globally
pnpm add -g pixelmuse
```

Requires Node.js 18+. For terminal image previews, install [chafa](https://hpjansson.org/chafa/):

```bash
# macOS
brew install chafa

# Ubuntu/Debian
sudo apt install chafa
```

### 4. Authenticate

```bash
# Option 1: Environment variable
export PIXELMUSE_API_KEY="pm_live_your_key_here"

# Option 2: Interactive login (stores in OS keychain or config file)
pixelmuse login
```

### 5. Generate your first image

```bash
pixelmuse "a cat floating through space"
```

### Credits

Pixelmuse uses a credit-based system. Each model costs a set number of credits per generation (shown before and after each run). Check your balance anytime:

```bash
pixelmuse account
```

Top up credits at [pixelmuse.studio](https://pixelmuse.studio). See the [API docs](https://pixelmuse.studio/docs/api) for full pricing details.

## Usage

### Generate images

The default command. Just pass a prompt — everything else has sensible defaults.

```bash
# Simple generation — saves to current directory
pixelmuse "a cat floating through space"

# Choose model and aspect ratio
pixelmuse "neon cityscape at night" -m nano-banana-pro -a 16:9

# Save to specific path
pixelmuse "app icon, minimal" -o icon.png

# Apply a style
pixelmuse "mountain landscape" -s anime -a 21:9

# Pipe prompt from stdin
echo "hero banner for SaaS landing page" | pixelmuse -o hero.png
cat prompt.txt | pixelmuse -m recraft-v4

# JSON output for scripting
pixelmuse --json "logo concept" | jq .output_path

# Skip preview, copy to clipboard
pixelmuse "avatar" --no-preview --clipboard

# Open result in system viewer
pixelmuse "wallpaper" -a 16:9 --open
```

### Watch mode

Regenerates automatically when a prompt file changes — ideal for iterating on prompts in your editor.

```bash
pixelmuse --watch prompt.txt -o output.png
# Watching prompt.txt for changes... (Ctrl+C to stop)
# [12:34:01] Saved to output.png (4.1s)
# [12:34:22] Saved to output.png (3.8s)  <- prompt file changed
```

### Browse and manage

```bash
# List available models with costs
pixelmuse models

# View account balance and usage
pixelmuse account

# Recent generations
pixelmuse history

# Open a generation in your system image viewer
pixelmuse open <generation-id>
```

### Prompt templates

Save reusable prompts as YAML files with variables and default settings.

```bash
# Scaffold a new template
pixelmuse template init product-shot

# List all templates
pixelmuse template list

# View template contents
pixelmuse template show blog-thumbnail

# Generate with a template, overriding variables
pixelmuse template use blog-thumbnail --var subject="React hooks guide"
```

Templates are stored at `~/.config/pixelmuse-cli/prompts/`:

```yaml
# blog-thumbnail.yaml
name: Blog Thumbnail
description: Dark-themed blog post thumbnail
prompt: >
  A cinematic {{subject}} on a dark gradient background,
  dramatic lighting, 8K resolution
defaults:
  model: nano-banana-2
  aspect_ratio: "16:9"
variables:
  subject: "code editor with syntax highlighting"
tags: [blog, thumbnail, dark]
```

### Interactive TUI

For visual browsing and exploration, launch the full interactive interface:

```bash
pixelmuse ui
```

## Commands

| Command | Description |
|---------|-------------|
| `pixelmuse "prompt"` | Generate an image (default command) |
| `pixelmuse models` | List available models with costs |
| `pixelmuse account` | Account balance and usage stats |
| `pixelmuse history` | Recent generations table |
| `pixelmuse open <id>` | Open a generation in system viewer |
| `pixelmuse login` | Authenticate with API key |
| `pixelmuse logout` | Remove stored credentials |
| `pixelmuse template <cmd>` | Manage prompt templates |
| `pixelmuse ui` | Launch interactive TUI |

## Flags

| Flag | Description |
|------|-------------|
| `-m, --model` | Model ID (default: `nano-banana-2`) |
| `-a, --aspect-ratio` | Aspect ratio (default: `1:1`) |
| `-s, --style` | `realistic`, `anime`, `artistic`, `none` |
| `-o, --output` | Output file path |
| `--json` | Machine-readable JSON output |
| `--no-preview` | Skip terminal image preview |
| `--open` | Open result in system viewer |
| `--clipboard` | Copy image to clipboard |
| `--watch <file>` | Watch prompt file, regenerate on save |
| `--no-save` | Don't save image to disk |

## Models

| Model | Credits | Best For |
|-------|---------|----------|
| **Nano Banana 2** (default) | 1 | Speed, text rendering, world knowledge |
| Nano Banana Pro | 3 | Text rendering, real-time info, multi-image editing |
| Flux Schnell | 1 | Quick mockups, ideation |
| Google Imagen 3 | 1 | Realistic photos, complex compositions |
| Ideogram v3 Turbo | 1 | Text rendering, graphic design |
| Recraft V4 | 1 | Typography, design, composition |
| Recraft V4 Pro | 3 | High-res design, art direction |

## MCP Server

pixelmuse ships with a built-in [MCP](https://modelcontextprotocol.io) server for native integration with AI coding tools like Claude Code, Cursor, and Windsurf.

### Setup

Add to your MCP client configuration (e.g. `~/.claude/settings.json` for Claude Code):

```json
{
  "mcpServers": {
    "pixelmuse": {
      "command": "pixelmuse-mcp",
      "env": {
        "PIXELMUSE_API_KEY": "pm_live_your_key_here"
      }
    }
  }
}
```

If installed locally instead of globally, use the full path:

```json
{
  "mcpServers": {
    "pixelmuse": {
      "command": "npx",
      "args": ["pixelmuse-mcp"],
      "env": {
        "PIXELMUSE_API_KEY": "pm_live_your_key_here"
      }
    }
  }
}
```

### Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Generate an image with prompt, model, aspect ratio, style, and output path |
| `list_models` | List available models with costs and capabilities |
| `check_balance` | Check account credit balance and plan info |

Once configured, your AI agent can generate images directly:

> "Generate a hero image for my landing page, 16:9, save it to ./public/hero.png"

## Configuration

Settings are stored at `~/.config/pixelmuse-cli/config.yaml`:

```yaml
defaultModel: nano-banana-2
defaultAspectRatio: "1:1"
defaultStyle: none
autoPreview: true
autoSave: true
```

### File locations

| Path | Contents |
|------|----------|
| `~/.config/pixelmuse-cli/config.yaml` | User settings |
| `~/.config/pixelmuse-cli/auth.json` | API key (fallback if keychain unavailable) |
| `~/.config/pixelmuse-cli/prompts/` | Prompt template YAML files |
| `~/.local/share/pixelmuse-cli/generations/` | Auto-saved generation images |

## Links

- [Pixelmuse](https://pixelmuse.studio) — Platform home
- [Sign up](https://pixelmuse.studio/signup) — Create an account
- [API keys](https://pixelmuse.studio/developers) — Manage API keys
- [API docs](https://pixelmuse.studio/docs/api) — Full API reference

## License

Business Source License 1.1 (BSL 1.1). See [LICENSE](./LICENSE) for details.

Free for any use except offering a competing image generation API or platform. Converts to MIT on 2030-03-01.

Copyright 2025 StarMorph LLC.
