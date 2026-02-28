# pixelmuse

AI image generation from the command line, powered by the [Pixelmuse](https://pixelmuse.studio) API.

Built for developers who live in the terminal — works standalone, pipes with other tools, and integrates natively with Claude Code, Cursor, and any MCP-compatible AI agent.

```bash
pixelmuse "astronaut riding a horse"
# ⚡ Nano Banana 2 · 1 credit (balance: 142) — generating...
# ✓ Generated in 4.2s · 1 credit charged (remaining: 141)
#   Saved to ./astronaut-riding-a-horse.png
```

## Install

```bash
# Run directly (no install)
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

## Authentication

Get your API key from [pixelmuse.studio/developers](https://pixelmuse.studio/developers):

```bash
# Option 1: Environment variable (recommended)
export PIXELMUSE_API_KEY="pm_live_your_key_here"

# Option 2: Interactive login (stores in OS keychain or ~/.config/pixelmuse-cli/auth.json)
pixelmuse login
```

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
# [12:34:01] ✓ Saved to output.png (4.1s)
# [12:34:22] ✓ Saved to output.png (3.8s)  ← prompt file changed
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

Features a home screen, generation wizard, gallery browser with image previews, prompt template editor, account management, and credit purchases — all navigable with keyboard shortcuts.

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

### Claude Code Skill

This repo also includes a [Claude Code skill](SKILL.md) that works via REST API without MCP. Copy it to use globally:

```bash
mkdir -p ~/.claude/skills/pixelmuse-generate
cp SKILL.md ~/.claude/skills/pixelmuse-generate/SKILL.md
```

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

## License

MIT
