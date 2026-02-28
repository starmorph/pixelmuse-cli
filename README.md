# pixelmuse

Terminal-native AI image generation CLI powered by the [Pixelmuse](https://pixelmuse.studio) API.

Generate images, browse your gallery, manage prompt templates, and preview results directly in the terminal — built for developers who live in the CLI with tools like Claude Code, Gemini CLI, and Cursor.

## Install

```bash
# Run directly (no install)
npx pixelmuse

# Or install globally
pnpm add -g pixelmuse
```

Requires Node.js 18+. For the best image preview experience, install [chafa](https://hpjansson.org/chafa/) (`brew install chafa` on macOS, `apt install chafa` on Linux). Falls back to a built-in renderer if chafa is not available.

## Authentication

Get your API key from [pixelmuse.studio/developers](https://pixelmuse.studio/developers), then either:

```bash
# Set as environment variable (recommended)
export PIXELMUSE_API_KEY="pm_live_your_key_here"

# Or use the interactive login
pixelmuse login
```

Keys are stored securely in your OS keychain when available, with a fallback to `~/.config/pixelmuse-cli/auth.json` (chmod 600).

## Usage

```bash
# Interactive TUI — full menu with navigation
pixelmuse

# Generate an image
pixelmuse generate "a cat floating through space, cinematic lighting"

# Generate with specific options
pixelmuse generate "neon cityscape at night" -m nano-banana-2 -a 16:9

# Browse your generations
pixelmuse gallery

# View available models
pixelmuse models

# Manage prompt templates
pixelmuse prompts

# View account info and usage
pixelmuse account
```

### Commands

| Command | Description |
|---------|-------------|
| `pixelmuse` | Interactive TUI (home screen) |
| `pixelmuse generate <prompt>` | Generate an image |
| `pixelmuse gallery` | Browse your generations |
| `pixelmuse models` | View available models |
| `pixelmuse prompts` | Manage prompt templates |
| `pixelmuse account` | Account info & credits |
| `pixelmuse login` | Authenticate with API key |
| `pixelmuse logout` | Remove stored credentials |

### Flags

| Flag | Description |
|------|-------------|
| `-m, --model` | Model ID (e.g. `nano-banana-2`) |
| `-a, --aspect-ratio` | Aspect ratio (e.g. `16:9`, `1:1`, `9:16`) |
| `-s, --style` | Style: `realistic`, `anime`, `artistic`, `none` |
| `--no-preview` | Skip image preview |
| `--json` | Output JSON (for scripting) |

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

## Prompt Templates

Save reusable prompts with variables:

```yaml
# ~/.config/pixelmuse-cli/prompts/blog-thumbnail.yaml
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

Create and manage templates through the interactive `pixelmuse prompts` screen or by editing YAML files directly.

## Claude Code Skill

This repo includes a [Claude Code skill](SKILL.md) that lets Claude generate images on your behalf. Copy `SKILL.md` to `~/.claude/skills/pixelmuse-generate/SKILL.md` to use it globally:

```bash
mkdir -p ~/.claude/skills/pixelmuse-generate
cp SKILL.md ~/.claude/skills/pixelmuse-generate/SKILL.md
```

Then ask Claude: "generate a blog thumbnail of a terminal with code"

## Configuration

Settings are stored at `~/.config/pixelmuse-cli/config.yaml`:

```yaml
defaultModel: nano-banana-2
defaultAspectRatio: "1:1"
defaultStyle: none
autoPreview: true
autoSave: true
```

Generated images are auto-saved to `~/.local/share/pixelmuse-cli/generations/`.

## License

MIT
