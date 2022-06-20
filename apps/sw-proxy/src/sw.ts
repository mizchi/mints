import { transformSync } from "@mizchi/mints";

type FetchEvent = {
  request: Request;
  respondWith(promise: Promise<any>): void;
};

const TARGET_EXTENSIONS = [".ts", ".tsx"];

// @ts-ignore
self.addEventListener("install", (ev: any) => ev.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (ev: any) =>
  //  @ts-ignore
  ev.waitUntil(self.clients.claim())
);

self.addEventListener("fetch", (event: any) => {
  const req = event.request as Request;
  if (TARGET_EXTENSIONS.some((t) => req.url.endsWith(t))) {
    event.respondWith(handleWithTransform(event));
  }
});

const handleWithTransform = async (event: FetchEvent): Promise<Response> => {
  const rawContent = await fetch(event.request.url).then((res) => res.text());
  const compiled = transformSync(rawContent);
  if (compiled.error) throw new Error(JSON.stringify(compiled, null, 2));
  return new Response(compiled.code, {
    // @ts-ignore
    mode: "no-cors",
    status: 200,
    headers: {
      "Content-Type": "text/javascript",
    },
  });
};
