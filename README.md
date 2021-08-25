# Deno Fetch Event Adapter

Dispatches global `fetch` events using Deno's ~~[http](https://deno.land/std/http) module~~ [native HTTP server](https://deno.com/blog/v1.9#native-http%2F2-web-server).

It is mostly intended as a temporary solution until Deno [implements the Service Worker spec](https://github.com/denoland/deno/issues/5957#issuecomment-722568905) directly.

It works fine for local testing, developing Cloudflare Workers while offline, and similar use cases. 

## Example

```ts
// filename: "sw.js"
import 'https://deno.land/x/fetch_event_adapter/listen.ts';

if (typeof FetchEvent !== 'undefined') console.log(true);

self.addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World', { 
    status: 200, 
    headers: [['content-type', 'text/plain']],
  }));
});
```

Your script needs the `--allow-net` permissions. It also requires a `--location`,
to know on which port to listen for incoming connections:

```sh
deno run --allow-net --location=http://localhost:8000 sw.ts
```

If you set the `--location` to either HTTPS or port 443, you have to provide a `--cert` and a `--key` parameter.
Your script will also need the read permission to read the files:

```sh
deno run --allow-net --allow-read --location=https://localhost:8000 sw.ts \
  --cert=./path/to/localhost.crt \
  --key=./path/to/localhost.key
```
