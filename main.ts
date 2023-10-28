import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { resize } from "https://deno.land/x/deno_image/mod.ts";

import api from "npm:@atproto/api@0.6.20";
const { BskyAgent, RichText } = api;

const resp = await fetch(Deno.env.get("WIKI_RANDOM"));
const html = await resp.text();
const document = new DOMParser().parseFromString(html, "text/html");
const script = document.querySelector('script[type="application/ld+json"]');
const jsonld = JSON.parse(script.textContent);
console.log(jsonld);

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
  langs: [Deno.env.get("WIKI_LANG")],
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
  try {
    const image = await fetch(jsonld.image);
    const encoding = image.headers.get("content-type");
    if (
      encoding?.startsWith("image/jpeg") ||
      encoding?.startsWith("image/png")
    ) {
      const data = await image.arrayBuffer();
      const resized = await resize(new Uint8Array(data), { width: 480 });
      const uploaded = await agent.uploadBlob(resized, { encoding });
      const thumb = {
        $type: "blob",
        ref: {
          $link: uploaded.data.blob.ref.toString(),
        },
        mimeType: uploaded.data.blob.mimeType,
        size: uploaded.data.blob.size,
      };
      post.embed.external.thumb = thumb;
    }
  } catch (e) {
    console.log("Failed to upload image");
    console.log(e);
  }
}

await agent.post(post);
console.log(post);
