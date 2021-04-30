import { serve, serveTLS, ServerRequest, Server } from "https://deno.land/std/http/server.ts";
import { readerFromStreamReader, readableStreamFromIterable } from 'https://deno.land/std/io/streams.ts';
import * as flags from "https://deno.land/std/flags/mod.ts";

const makeRespond = (denoReq: ServerRequest) => async ({ body, headers, status }: Response) => {
  const reader = body?.getReader();
  try {
    const denoReader = reader && readerFromStreamReader(reader);
    if (!headers.has('content-type')) headers.set('content-type', 'text/plain');
    await denoReq.respond({
      status,
      headers,
      body: denoReader,
    });
  } catch (err) {
    reader?.cancel();
    // TODO: Swallow with other errors?
    // TODO: Logging?
    if (err instanceof Deno.errors.BrokenPipe) { }
    else console.error(err);
  }
}

class DenoFetchEvent extends Event implements FetchEvent {
  #request: Request;
  #respond: (r: Response) => Promise<void>;

  constructor(type: string, eventInitDict: FetchEventInit);
  constructor(denoReq: ServerRequest);
  constructor(denoReq: string | ServerRequest, _eventInitDict?: FetchEventInit) {
    super('fetch');
    if (!(denoReq instanceof ServerRequest)) throw Error('Overload not implemented');

    this.#respond = makeRespond(denoReq);

    const { url, method, headers } = denoReq;
    const info = new URL(url, self.location.origin).href;
    headers.set('deno-connecting-ip', (denoReq.conn.remoteAddr as Deno.NetAddr).hostname);
    this.#request = new Request(info, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD'
        ? readableStreamFromIterable(Deno.iter(denoReq.body))
        : null
    });
  }
  get request(): Request { return this.#request };
  respondWith(r: Response | Promise<Response>): void {
    if (r instanceof Promise) r.then(this.#respond); else this.#respond(r);
  }
  waitUntil(_f: any): void {
    // Deno doesn't shut down the way Service Workers or CF Workers do, so this is a noop.
  }

  get clientId(): string { return '' };
  get preloadResponse(): Promise<any> { return Promise.resolve() };
  get replacesClientId(): string { return '' };
  get resultingClientId(): string { return '' };
}

// TODO: Don't overwrite if already present?
Object.defineProperty(self, 'FetchEvent', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: DenoFetchEvent,
});

; (async () => {
  let server: Server;

  if (self.location.protocol === 'https:' || self.location.port === '433') {
    const { c, cert, k, key } = flags.parse(Deno.args);
    const certFile = cert || c;
    const keyFile = key || k;

    if (!certFile || !keyFile) {
      console.warn('When using HTTPS or port 443, a --cert and --key are required.');
    }

    server = serveTLS({
      hostname: self.location.hostname,
      port: Number(self.location.port || 443),
      certFile,
      keyFile,
    });
  } else {
    server = serve({
      hostname: self.location.hostname,
      port: Number(self.location.port || 80),
    });
  }

  for await (const req of server) {
    self.dispatchEvent(new DenoFetchEvent(req));
  }
})();

declare global {
  /**
   * Extends the lifetime of the install and activate events dispatched on the global scope as part of the
   * service worker lifecycle. This ensures that any functional events (like FetchEvent) are not dispatched until it
   * upgrades database schemas and deletes the outdated cache entries. 
   */
  interface ExtendableEvent extends Event {
    waitUntil(f: any): void;
  }

  interface ExtendableEventInit extends EventInit {
  }

  var ExtendableEvent: {
    prototype: ExtendableEvent;
    new(type: string, eventInitDict?: ExtendableEventInit): ExtendableEvent;
  };

  interface FetchEventInit extends ExtendableEventInit {
    clientId?: string;
    preloadResponse?: Promise<any>;
    replacesClientId?: string;
    request: Request;
    resultingClientId?: string;
  }

  var FetchEvent: {
    prototype: FetchEvent;
    new(type: string, eventInitDict: FetchEventInit): FetchEvent;
  };

  /**
   * This is the event type for fetch events dispatched on the service worker global scope. 
   * It contains information about the fetch, including the request and how the receiver will treat the response. 
   * It provides the event.respondWith() method, which allows us to provide a response to this fetch. 
   */
  interface FetchEvent extends ExtendableEvent {
    readonly clientId: string;
    readonly preloadResponse: Promise<any>;
    readonly replacesClientId: string;
    readonly request: Request;
    readonly resultingClientId: string;
    respondWith(r: Response | Promise<Response>): void;
  }

  interface Window {
    FetchEvent: new (type: string, eventInitDict: FetchEventInit) => FetchEvent;
  }

  function addEventListener(type: 'fetch', handler: (event: FetchEvent) => void): void;
}
