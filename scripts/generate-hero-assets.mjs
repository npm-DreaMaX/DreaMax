// Optimize the supplied image without changing its composition or colors.
// Uses the same sharp dependency as Astro's image pipeline.
import sharp from "sharp";
await sharp("public/images/hero/adventure-light-original.jpg")
  .webp({ quality: 85 })
  .toFile("public/images/hero/adventure-light.webp");
await sharp("public/images/hero/adventure-light-original.jpg")
  .resize({ width: 960 })
  .webp({ quality: 82 })
  .toFile("public/images/hero/adventure-light-mobile.webp");
console.log(
  "Generated desktop and mobile WebP backgrounds from the supplied original.",
);
