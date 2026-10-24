// Admission and annotation for a user-selected still image. Geometry is supplied
// by the maintained calibration/authoring modules; interpretation stays authored.
import {calibrate, derive, GeometryError} from "./geometry.mjs";
import {appendAnnotation} from "./authoring.mjs";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_SIDE = 8192;
const fail = message => { throw new GeometryError(message); };
function imageSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE || width * height > MAX_IMAGE_PIXELS)
    fail("Choose an image up to 8192 pixels per side and 24 megapixels.");
}
// Read declared dimensions before the browser allocates decoded image pixels.
export function inspectImageBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) fail("Choose a PNG or JPEG up to 12 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, mimeType;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) &&
      [73,72,68,82].every((v,i) => bytes[12+i] === v)) {
    width = view.getUint32(16); height = view.getUint32(20); mimeType = "image/png";
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) fail("This JPEG has an invalid image header.");
      while (offset < bytes.length && bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) fail("This JPEG header is incomplete.");
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) fail("This JPEG has no usable dimensions.");
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5);
        mimeType = "image/jpeg"; break;
      }
      offset += length;
    }
  }
  if (!mimeType) fail("Only PNG and JPEG image contents are supported.");
  imageSize(width, height);
  return {widthPx:width, heightPx:height, mimeType};
}

export function imageMetadata(value) {
  if (!value || typeof value !== "object") fail("The source image identity is missing.");
  imageSize(value.widthPx, value.heightPx);
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sha256))
    fail("The source image needs its full SHA-256 identity.");
  if (!["image/png","image/jpeg"].includes(value.mimeType)) fail("Unsupported source image type.");
  if (value.pixelCoordinates !== "browser-oriented") fail("Unsupported source pixel orientation.");
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 180)
    fail("The source image needs a short name.");
  return {sha256:value.sha256, widthPx:value.widthPx, heightPx:value.heightPx,
    mimeType:value.mimeType, name:value.name, pixelCoordinates:"browser-oriented"};
}
function inImage(p, image) {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
      p.x < 0 || p.y < 0 || p.x > image.widthPx || p.y > image.heightPx)
    fail("Every corner and mark must be inside the source image.");
}
function sourceDimensions(widthMm, heightMm) {
  if (![widthMm,heightMm].every(v => Number.isFinite(v) && v >= 1 && v <= 10000))
    fail("Measured sheet dimensions must be 1–10,000 mm.");
}
export function createCapture(image, corners, widthMm, heightMm, details = {}) {
  const meta = imageMetadata(image);
  sourceDimensions(widthMm, heightMm);
  if (!Array.isArray(corners) || corners.length !== 4) fail("Select all four sheet corners first.");
  corners.forEach(p => inImage(p, meta));
  calibrate(corners);
  const title = String(details.title || "Locally annotated demonstration").trim().slice(0,160);
  const provenance = String(details.provenance || "User-selected local image; human-authored calibration and relationships.").trim().slice(0,800);
  return {title, provenance, evidenceClass:"human-annotated-local-image",
    source:{widthMm, heightMm, corners:corners.map(p=>({x:p.x,y:p.y})), image:meta},
    landmarks:[], unknowns:["Source dimensions and relationship meanings were supplied by the annotator.",
      "A still image does not establish contact pressure, material resistance, or physical task success."]};
}
export function validateCapturedDemo(demo) {
  if (!demo?.source) fail("No source demonstration was supplied.");
  const meta = imageMetadata(demo.source.image);
  if (!Array.isArray(demo.source.corners)) fail("The source calibration is missing.");
  demo.source.corners.forEach(p => inImage(p, meta));
  if (!Array.isArray(demo.landmarks)) fail("The source marks are missing.");
  demo.landmarks.forEach(mark => inImage(mark?.sourcePx, meta));
  return derive(demo);
}
export function appendCaptureMark(demo, input) {
  const meta = imageMetadata(demo?.source?.image);
  inImage(input?.sourcePx, meta);
  const result = appendAnnotation(demo, input, demo.source.widthMm, demo.source.heightMm);
  validateCapturedDemo(result.demo);
  return result.demo;
}
export function assertImageMatches(demo, supplied) {
  const expected = imageMetadata(demo?.source?.image), actual = imageMetadata(supplied);
  if (["sha256","widthPx","heightPx","mimeType","pixelCoordinates"].some(k => expected[k] !== actual[k]))
    fail("This photo does not match the image used for these annotations. Choose the original file.");
  return true;
}
