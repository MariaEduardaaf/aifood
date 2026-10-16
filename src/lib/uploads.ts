import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Menu photo storage: Cloudinary when all three CLOUDINARY_* vars are set,
// otherwise files on local disk (UPLOAD_DIR, default <cwd>/uploads) served by
// GET /api/uploads/<name>. Local storage needs a persistent volume in
// production (see docs/DEPLOY.md).

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;
type Mime = keyof typeof EXTENSIONS;

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Names storeImage generates: 16 random bytes in hex plus the extension
export const UPLOAD_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;
const UPLOAD_URL = /^\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

export function isUploadedImageUrl(value: string): boolean {
  return UPLOAD_URL.test(value);
}

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

// Rejected upload; the route answers 400 with this message
export class UploadError extends Error {}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  Buffer.from(bytes.subarray(start, end)).toString("latin1");

// True when the file starts with the signature of the declared image type
export function matchesMagicBytes(mime: string, bytes: Uint8Array): boolean {
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b);
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6));
    case "image/webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    default:
      return false;
  }
}

const cloudinaryConfigured = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

export async function storeImage(file: File): Promise<{ url: string }> {
  if (!(file.type in EXTENSIONS)) {
    throw new UploadError("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("File too large. Maximum size: 5MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesMagicBytes(file.type, buffer)) {
    throw new UploadError("File content does not match its image type");
  }

  if (cloudinaryConfigured()) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const result = await cloudinary.uploader.upload(
      `data:${file.type};base64,${buffer.toString("base64")}`,
      {
        folder: "visionary/menu",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
    );
    return { url: result.secure_url };
  }

  const name = `${randomBytes(16).toString("hex")}.${EXTENSIONS[file.type as Mime]}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer, { flag: "wx" });
  return { url: `/api/uploads/${name}` };
}
