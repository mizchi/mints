async function start(initialUrl: string, swUrl = "/sw.js") {
  const sw = navigator.serviceWorker;
  let installed = !!sw.controller;
  sw.addEventListener("controllerchange", () => installed && location.reload());
  const reg = await sw.register(swUrl);
  await sw.ready;
  installed = true;
  setInterval(() => reg.update(), 60 * 1000);
  new Function("u", "import(u)")(initialUrl);
}
start("/foo.tsx");
