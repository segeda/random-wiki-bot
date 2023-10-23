import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import api from "npm:@atproto/api@0.6.20";
const { BskyAgent, RichText } = api;

const resp = await fetch("https://cs.wikipedia.org/wiki/Special:Random");
const html = await resp.text();
const document = new DOMParser().parseFromString(html, "text/html");
const script = document.querySelector('script[type="application/ld+json"]');
const jsonld = JSON.parse(script.textContent);

const agent = new BskyAgent({ service: "https://bsky.social" });
await agent.login({
  identifier: Deno.env.get("BSKY_HANDLE"),
  password: Deno.env.get("BSKY_PASSWORD"),
});

const richText = new RichText({ text: `${jsonld.name}\n${jsonld.url}` });
await richText.detectFacets();

const post = {
  text: richText.text,
  facets: richText.facets,
  embed: {
    $type: "app.bsky.embed.external",
    external: {
      uri: jsonld.url,
      title: jsonld.name,
      description: jsonld.headline ?? "",
    },
  },
};

if (jsonld.image) {
  const image = await fetch(jsonld.image);
  const encoding = image.headers.get("content-type");
  const data = await image.arrayBuffer();
  const blob = await agent.uploadBlob(data, { encoding });
  const thumb = {
    $type: "blob",
    ref: {
      $link: blob.data.blob.ref.toString(),
    },
    mimeType: blob.data.blob.mimeType,
    size: blob.data.blob.size,
  };
  post.embed.external.thumb = thumb;
}

await agent.post(post);

console.log(`${jsonld.name} ${jsonld.url}`);
