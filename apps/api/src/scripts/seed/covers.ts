import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../../config/env";
import { r2Client } from "../../config/r2";
import { MediaModel } from "../../models";

const palette: Record<string, { r: number; g: number; b: number }> = {
  pramukh: { r: 30, g: 58, b: 138 },
  rashtriya: { r: 153, g: 27, b: 27 },
  vishwa: { r: 6, g: 95, b: 70 },
  vyapar: { r: 120, g: 53, b: 15 },
  khel: { r: 22, g: 101, b: 52 },
  manoranjan: { r: 112, g: 26, b: 117 },
  takneek: { r: 30, g: 64, b: 175 },
  swasthya: { r: 15, g: 118, b: 110 },
};

async function objectExists(key: string): Promise<boolean> {
  try {
    await r2Client().send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function ensureCategoryCover(
  categorySlug: string,
  categoryName: string
): Promise<string> {
  const key = `seed/covers/${categorySlug}.webp`;
  const color = palette[categorySlug] ?? { r: 51, g: 65, b: 85 };
  const width = 1280;
  const height = 720;
  const existing = await MediaModel.findOne({ key });
  if (existing && (await objectExists(key))) {
    return existing.id;
  }
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect width="100%" height="100%" fill="rgb(${color.r},${color.g},${color.b})"/>` +
      `<text x="50%" y="52%" font-family="sans-serif" font-size="96" fill="rgba(255,255,255,0.92)" ` +
      `text-anchor="middle" dominant-baseline="middle">${categoryName}</text></svg>`
  );
  const webp = await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .composite([{ input: svg }])
    .webp({ quality: 82 })
    .toBuffer();
  await r2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: webp,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const doc = await MediaModel.findOneAndUpdate(
    { key },
    { alt: `${categoryName} कवर`, width, height, kind: "image" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.id;
}
