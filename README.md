# Deno Fetch Event Adapter

Dispatches global `fetch` events using Deno's [http](https://deno.land/std/http) module.

It is mostly intended as a temporary solution until Deno [implements the Service Worker spec](https://github.com/denoland/deno/issues/5957#issuecomment-722568905) directly.

It works fine for local testing, developing Cloudflare Workers while offline, and similar use cases. 
However, production use is not recommended.

## Example

```ts
// file: 'mod.ts'
import 'https://deno.land/x/fetch_event_adapter/mod.ts';

if (typeof FetchEvent !== 'undefined') console.log(true);

self.addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World', { 
    status: 200, 
    headers: [['content-type', 'plain/text']],
  }));
});
```

Your script needs the `--net` permission and also requires a `--location`:

```sh
deno run --allow-net --location=http://localhost:8000 mod.ts
```

