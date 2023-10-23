import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const resp = await fetch("https://cs.wikipedia.org/wiki/Special:Random");
const html = await resp.text();
const document = new DOMParser().parseFromString(html, "text/html");
const script = document.querySelector('script[type="application/ld+json"]');
const jsonld = JSON.parse(script.textContent);

console.log(jsonld.url, jsonld.name);

console.log(Deno.env.get("BSKY_HANDLE"));
