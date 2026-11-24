# Cloudflare image, chat, and speech backend

The static guide calls this Worker for short Russian chat replies, image generation, and Russian speech. Speech uses Cloudflare Workers AI Grok TTS with the warm `ara` voice and returns MP3. It requires no Azure resource or speech key. Workers AI has a 10,000 Neuron daily free allocation; requests stop when the Free plan allocation is exhausted. The model is priced per character, so a Workers Paid account can incur charges after the free allocation. The Worker accepts requests only from the origins listed in `wrangler.toml`. Image requests and speech requests have separate per-IP limits of five requests per minute.

## Deploy

1. Install Node.js and Wrangler if they are not installed.
2. In this folder, run `wrangler login` and finish Cloudflare sign-in.
3. Confirm the exact GitHub Pages origin in `ALLOWED_ORIGINS` (keep localhost only for local testing).
4. Run `npx wrangler deploy`. The existing AI binding is already configured in `wrangler.toml`; no speech secret or region is needed.
5. Keep the Worker URL in `site-a/image-config.js`, then publish the updated site files.

The chat route uses Cloudflare Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; image generation uses `@cf/black-forest-labs/flux-1-schnell`; speech uses Cloudflare Workers AI `xai/grok-tts` with Russian (`ru`) and the warm `ara` voice. See [Grok TTS](https://developers.cloudflare.com/ai/models/xai/grok-tts/) and [Workers AI pricing and free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/). Workers AI quota and pricing apply to chat and image generation; see [pricing and quotas](https://developers.cloudflare.com/workers-ai/platform/pricing/), the [chat model](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/), and the [image model](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).
