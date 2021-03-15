import './mod.d.ts';
import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import { readerFromStreamReader, readableStreamFromIterable } from 'https://deno.land/std/io/streams.ts';

const respond = (denoReq: ServerRequest) => async ({ body, headers, status }: Response) => {
  const reader = body?.getReader();
  try {
    const denoReader = reader && readerFromStreamReader(reader);
    await denoReq.respond({
      status,
      headers,
      body: denoReader,
    });
  } catch (err) {
    reader?.cancel();
    // TODO: Swallow with other errors?
    // TODO: Logging?
    if (err instanceof Deno.errors.BrokenPipe) {}
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

    this.#respond = respond(denoReq);

    const info = new URL(denoReq.url, self.location.origin).href;
    this.#request = new Request(info, {
      method: denoReq.method,
      headers: denoReq.headers,
      body: readableStreamFromIterable(Deno.iter(denoReq.body)),
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
self.FetchEvent = DenoFetchEvent;

;(async () => {
  // TODO: https support!?
  const server = serve({ port: Number(self.location.port || 80) });
  for await (const req of server) {
    self.dispatchEvent(new DenoFetchEvent(req));
  }
})();

export {}
