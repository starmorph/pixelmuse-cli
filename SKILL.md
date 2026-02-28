---
name: pixelmuse-generate
description: |
  Generate images using the Pixelmuse API. Use when the user says 'generate image', 'create image',
  'pixelmuse', 'generate thumbnail', 'create thumbnail', 'make an image', 'AI image', 'generate art',
  'nano banana', 'nanobanana', 'flux', 'recraft', 'ideogram', 'imagen', or wants to create any image
  using AI image generation. Also use when the user provides a prompt and wants it turned into an image.
version: 1.1.0
---

# Pixelmuse Image Generation

Generate images via the Pixelmuse REST API at `https://www.pixelmuse.studio/api/v1/images`.

## Authentication

The API key must be set as the `PIXELMUSE_API_KEY` environment variable. Keys start with `pm_live_` or `pm_test_`.

**Setup:** Get your API key from [pixelmuse.studio/developers](https://pixelmuse.studio/developers), then add it to your shell profile:

```bash
export PIXELMUSE_API_KEY="pm_live_your_key_here"
```

Or add it to `~/.zsh_secrets`, `~/.env`, or your project's `.env.local`.

**Key resolution order** (use the first one found):

```bash
# 1. Environment variable (recommended)
API_KEY="$PIXELMUSE_API_KEY"

# 2. Fallback: read from a local .env.local if env var is not set
if [ -z "$API_KEY" ]; then
  API_KEY=$(grep 'PIXELMUSE_API_KEY' .env.local 2>/dev/null | cut -d'"' -f2)
fi
```

If no key is found, ask the user to set `PIXELMUSE_API_KEY`. They can get one at [pixelmuse.studio/developers](https://pixelmuse.studio/developers).

## Available Models

| Model ID | Name | Credits | Provider | Best For |
|----------|------|---------|----------|----------|
| `nano-banana-2` | Nano Banana 2 | 1 | Gemini | Speed, text rendering, world knowledge (DEFAULT) |
| `nano-banana-pro` | Nano Banana Pro | 3 | Gemini | Text rendering, real-time info, multi-image editing |
| `flux-schnell` | Flux Schnell | 1 | Replicate | Quick mockups, ideation |
| `imagen-3` | Google Imagen 3 | 1 | Gemini | Realistic photos, complex compositions |
| `ideogram-v3-turbo` | Ideogram v3 Turbo | 1 | Replicate | Text rendering, graphic design |
| `recraft-v4` | Recraft V4 | 1 | Replicate | Typography, design, composition |
| `recraft-v4-pro` | Recraft V4 Pro | 3 | Replicate | High-res design, art direction |

**Default model:** `nano-banana-2` (fast, 1 credit, good text rendering)

## Aspect Ratios

Supported: `1:1`, `16:9`, `9:16`, `3:2`, `2:3`, `4:5`, `5:4`, `3:4`, `4:3`, `21:9`, `9:21`

Common use cases:
- **Blog thumbnails / OG images:** `16:9`
- **Social media posts:** `1:1`
- **Phone wallpapers / stories:** `9:16`
- **Portraits:** `2:3` or `4:5`
- **Ultrawide banners:** `21:9`

## Styles

Optional: `realistic`, `anime`, `artistic`, `none` (default: `none`)

## Generate an Image

Use `curl` via the Bash tool. **Always use `www.pixelmuse.studio`** (non-www redirects and drops the auth header).

**IMPORTANT:** Gemini models (nano-banana-2, nano-banana-pro, imagen-3) return inline results. Use `Prefer: wait=55` to get synchronous responses. Replicate models (flux-schnell, recraft-v4, etc.) return async predictions that require polling.

### Synchronous (Gemini models — recommended)

```bash
curl -s -X POST https://www.pixelmuse.studio/api/v1/images \
  -H "Authorization: Bearer $PIXELMUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: wait=55" \
  -d '{
    "prompt": "YOUR PROMPT HERE",
    "model": "nano-banana-2",
    "aspect_ratio": "16:9"
  }'
```

### Response Format

```json
{
  "id": "gemini_...",
  "status": "succeeded",
  "model": "nano-banana-2",
  "prompt": "...",
  "output": ["data:image/png;base64,..."],
  "credits_charged": 1,
  "error": null,
  "created_at": "2026-02-28T...",
  "completed_at": null
}
```

## Save the Image

The output is a base64 data URL. Extract and save it with Python:

```bash
curl -s -X POST https://www.pixelmuse.studio/api/v1/images \
  -H "Authorization: Bearer $PIXELMUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: wait=55" \
  -d '{
    "prompt": "YOUR PROMPT HERE",
    "model": "nano-banana-2",
    "aspect_ratio": "16:9"
  }' | python3 -c "
import json, sys, base64
data = json.load(sys.stdin)
if data['status'] == 'succeeded':
    b64 = data['output'][0].split(',', 1)[1]
    img = base64.b64decode(b64)
    with open('OUTPUT_PATH.png', 'wb') as f:
        f.write(img)
    print(f'Saved {len(img)} bytes')
else:
    print(f'Generation failed: {data.get(\"error\", data[\"status\"])}')
"
```

Replace `OUTPUT_PATH.png` with the desired file path.

## Workflow

1. **Ask user for prompt** if not provided. Help them refine it for best results.
2. **Resolve API key** — check `$PIXELMUSE_API_KEY` env var first, fall back to `.env.local` in the current directory, then ask the user to set it.
3. **Choose model** — default to `nano-banana-2` unless user specifies otherwise or needs specific capabilities.
4. **Choose aspect ratio** based on use case (blog thumbnail = `16:9`, social = `1:1`, etc.).
5. **Generate the image** using the curl command above.
6. **Save to disk** using the Python extraction script.
7. **Preview the image** using the Read tool so the user can see the result.
8. **Regenerate if needed** — offer to retry with a refined prompt if the user isn't happy.

## Prompt Tips

- Be specific and descriptive. Include style, lighting, composition, and mood.
- For blog thumbnails: include the topic visually, use dark backgrounds for dev content.
- For text in images: Nano Banana 2 and Ideogram are best at rendering text accurately.
- Avoid prompts that violate content policy (NSFW, violence, real people).

## Checking Account Balance

```bash
curl -s https://www.pixelmuse.studio/api/v1/account \
  -H "Authorization: Bearer $PIXELMUSE_API_KEY" | python3 -m json.tool
```

## Async Models (Replicate — flux, recraft, ideogram)

These return `202` with `status: "processing"`. Poll for completion:

```bash
# Generate (returns processing status with ID)
RESPONSE=$(curl -s -X POST https://www.pixelmuse.studio/api/v1/images \
  -H "Authorization: Bearer $PIXELMUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: wait=55" \
  -d '{"prompt": "...", "model": "recraft-v4", "aspect_ratio": "1:1"}')

# Extract ID and poll
ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
curl -s "https://www.pixelmuse.studio/api/v1/images/$ID" \
  -H "Authorization: Bearer $PIXELMUSE_API_KEY" | python3 -m json.tool
```

Poll every 2-3 seconds until `status` is `succeeded` or `failed`. The `Prefer: wait=55` header makes the server wait up to 55 seconds before returning, which often avoids polling entirely.
