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
    headers: [['content-type', 'text/plain']],
  }));
});
```

Your script needs the `--allow-net` permission and also requires a `--location`:

```sh
deno run --allow-net --location=http://localhost:8000 mod.ts
```

If you set the `--location` to either HTTPS or port 443, you have to provide a `--cert` and a `--key` parameter.
Your worker will also need the read permission to read the files:

```sh
deno run --allow-net --allow-read --location=https://localhost:8000 mod.ts \
  --cert=./path/to/localhost.key \
  --key=./path/to/localhost.crt
```

For more, see Deno's [`http` module documentation](https://github.com/denoland/deno_std/tree/main/http).
