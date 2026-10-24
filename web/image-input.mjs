import {inspectImageBytes, imageMetadata, MAX_IMAGE_BYTES} from "/src/capture.mjs";

// The object URL is only committed to caller state after all checks succeed.
export async function loadLocalImage(file) {
  if (!file || file.size < 1 || file.size > MAX_IMAGE_BYTES) throw Error("Choose a PNG or JPEG up to 12 MB.");
  const bytes = await file.arrayBuffer();
  const encoded = inspectImageBytes(bytes);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2,"0")).join("");
  const url = URL.createObjectURL(new Blob([bytes], {type:encoded.mimeType}));
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    // EXIF rotation can swap encoded width/height. Store the browser-oriented
    // dimensions used for both the visible pixels and manual coordinates.
    const widthPx = image.naturalWidth, heightPx = image.naturalHeight;
    if (!((widthPx === encoded.widthPx && heightPx === encoded.heightPx) ||
          (widthPx === encoded.heightPx && heightPx === encoded.widthPx)))
      throw Error("Decoded image dimensions differ from its header.");
    return {url, image:imageMetadata({sha256,widthPx,heightPx,mimeType:encoded.mimeType,
      name:String(file.name || "local-image").slice(0,180),pixelCoordinates:"browser-oriented"})};
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
export function releaseImage(media) { if (media?.url) URL.revokeObjectURL(media.url); }
