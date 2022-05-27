# Deno Fetch Event Adapter

Dispatches global `fetch` events using Deno's [native HTTP server](https://deno.com/blog/v1.9#native-http%2F2-web-server).

~~It is mostly intended as a temporary solution until Deno [implements the Service Worker spec](https://github.com/denoland/deno/issues/5957#issuecomment-722568905) directly.~~   
This has been scrapped, but this module works just fine for local testing, developing Cloudflare Workers while offline, and similar use cases.

## Example

```ts
// file: "worker.js"
import 'https://deno.land/x/fetch_event_adapter/listen.ts';

// This module adds a global `FetchEvent`
if (typeof FetchEvent !== 'undefined') console.log(true);

// This module also adds global type declarations, s.t. this type-checks:
self.addEventListener('fetch', event => {
  const ip = event.request.headers.get('x-forwarded-for');
  event.respondWith(new Response(`Hello ${ip ?? 'World'}`));
});
```

Your script needs the `--allow-net` permissions. It also requires a `--location`,
to know on which port to listen for incoming connections:

```sh
deno run --allow-net --location=http://localhost:8000 worker.js
```

If you set the `--location` to either HTTPS or port 443, you have to provide a `--cert` and a `--key` parameter.
Your script will also need the read permission to read the files:

```sh
deno run --allow-net --allow-read --location=https://localhost:8000 worker.js \
  --cert=./path/to/cert.pem \
  --key=./path/to/key.pem
```

## Error Handling
If an error occurs during estabslishing a connection (e.g. invalid certificate, etc...), the error is dispatched as a global `error` event rather then crashing the process. You can add custom logging like this:

```ts
self.addEventListener('error', event => {
  console.warn(event.message);
  console.warn(event.error);
});
```

--------

<p align="center"><a href="https://workers.tools"><img src="https://workers.tools/assets/img/logo.svg" width="100" height="100" /></a>
<p align="center">This module is part of the Worker Tools collection<br/>⁕

[Worker Tools](https://workers.tools) are a collection of TypeScript libraries for writing web servers in [Worker Runtimes](https://workers.js.org) such as Cloudflare Workers, Deno Deploy and Service Workers in the browser. 

If you liked this module, you might also like:

- 🧭 [__Worker Router__][router] --- Complete routing solution that works across CF Workers, Deno and Service Workers
- 🔋 [__Worker Middleware__][middleware] --- A suite of standalone HTTP server-side middleware with TypeScript support
- 📄 [__Worker HTML__][html] --- HTML templating and streaming response library
- 📦 [__Storage Area__][kv-storage] --- Key-value store abstraction across [Cloudflare KV][cloudflare-kv-storage], [Deno][deno-kv-storage] and browsers.
- 🆗 [__Response Creators__][response-creators] --- Factory functions for responses with pre-filled status and status text
- 🎏 [__Stream Response__][stream-response] --- Use async generators to build streaming responses for SSE, etc...
- 🥏 [__JSON Fetch__][json-fetch] --- Drop-in replacements for Fetch API classes with first class support for JSON.
- 🦑 [__JSON Stream__][json-stream] --- Streaming JSON parser/stingifier with first class support for web streams.

Worker Tools also includes a number of polyfills that help bridge the gap between Worker Runtimes:
- ✏️ [__HTML Rewriter__][html-rewriter] --- Cloudflare's HTML Rewriter for use in Deno, browsers, etc...
- 📍 [__Location Polyfill__][location-polyfill] --- A `Location` polyfill for Cloudflare Workers.
- 🦕 [__Deno Fetch Event Adapter__][deno-fetch-event-adapter] --- Dispatches global `fetch` events using Deno’s native HTTP server.

[router]: https://workers.tools/router
[middleware]: https://workers.tools/middleware
[html]: https://workers.tools/html
[kv-storage]: https://workers.tools/kv-storage
[cloudflare-kv-storage]: https://workers.tools/cloudflare-kv-storage
[deno-kv-storage]: https://workers.tools/deno-kv-storage
[kv-storage-polyfill]: https://workers.tools/kv-storage-polyfill
[response-creators]: https://workers.tools/response-creators
[stream-response]: https://workers.tools/stream-response
[json-fetch]: https://workers.tools/json-fetch
[json-stream]: https://workers.tools/json-stream
[request-cookie-store]: https://workers.tools/request-cookie-store
[extendable-promise]: https://workers.tools/extendable-promise
[html-rewriter]: https://workers.tools/html-rewriter
[location-polyfill]: https://workers.tools/location-polyfill
[deno-fetch-event-adapter]: https://workers.tools/deno-fetch-event-adapter

Fore more visit [workers.tools](https://workers.tools).
