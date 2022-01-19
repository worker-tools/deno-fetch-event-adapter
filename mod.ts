import * as flags from "https://deno.land/std/flags/mod.ts";

class AdaptedFetchEvent extends Event implements FetchEvent {
  #event: Deno.RequestEvent;

  constructor(type: string, eventInitDict?: FetchEventInit);
  constructor(event: Deno.RequestEvent);
  constructor(event: string | Deno.RequestEvent) {
    super('fetch');
    if (typeof event === 'string') throw Error('Overload not implemented');
    this.#event = event;
  }
  get request(): Request { return this.#event.request };
  respondWith(r: Response | Promise<Response>): void {
    this.#event.respondWith(r);
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
  value: AdaptedFetchEvent,
});

const NAME = 'Deno Fetch Event Adapter';

(async () => {
  let server: Deno.Listener;

  if (!self.location) {
    throw new Error(`${NAME}: When using Deno Fetch Event Adapter, a --location is required.`)
  }

  if (self.location.protocol === 'https:' || self.location.port === '433') {
    const { cert: certFile, key: keyFile } = flags.parse(Deno.args, { 
      alias: { 
        cert: ['c', 'cert-file'], 
        key: ['k', 'key-file'],
      } 
    });

    if (!certFile || !keyFile) {
      throw new Error(`${NAME}:  When using HTTPS or port 443, a --cert and --key are required.`);
    }

    server = Deno.listenTls({
      hostname: self.location.hostname,
      port: Number(self.location.port || 443),
      certFile,
      keyFile,
    });
  } else {
    server = Deno.listen({
      hostname: self.location.hostname,
      port: Number(self.location.port || 80),
    });
  }

  for await (const conn of server) {
    (async () => {
      try {
        for await (const event of Deno.serveHttp(conn)) {
          const { hostname: ip } = conn.remoteAddr as Deno.NetAddr;
          const fe = new AdaptedFetchEvent(event);
          fe.request.headers.set('x-forwarded-for', ip);
          self.dispatchEvent(fe);
        }
      } catch (error) {
        self.dispatchEvent(new ErrorEvent('error', {
          message: error?.message,
          filename: import.meta.url,
          error,
        }));
      }
    })();
  }
})();

//#region Global Types
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
  function addEventListener(type: 'error', handler: (event: ErrorEvent) => void): void;
}
//#endregion
