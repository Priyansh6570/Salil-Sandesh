import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import type { MediaSummary, Paginated } from "@salil-sandesh/shared";
import { env } from "../config/env";
import { r2Client } from "../config/r2";
import { ArticleModel, MediaModel, UserModel, type MediaDoc } from "../models";
import { mediaUrlFromKey } from "../utils/media-url";
import type { HydratedDocument } from "mongoose";

export const allowedUploadMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const maxUploadBytes = 8 * 1024 * 1024;
const maxDimension = 2400;

export class UnsupportedMediaError extends Error {}
export class MediaReferencedError extends Error {}

function toSummary(doc: HydratedDocument<MediaDoc>): MediaSummary {
  return {
    id: doc.id,
    url: mediaUrlFromKey(doc.key),
    alt: doc.alt,
    width: doc.width,
    height: doc.height,
    kind: doc.kind,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  alt: string
): Promise<MediaSummary> {
  if (!(allowedUploadMimeTypes as readonly string[]).includes(mimeType)) {
    throw new UnsupportedMediaError(`unsupported mime type ${mimeType}`);
  }
  const pipeline = sharp(buffer, { failOn: "error", limitInputPixels: 30_000_000 }).rotate();
  const metadata = await pipeline.metadata();
  if (!metadata.width || !metadata.height) {
    throw new UnsupportedMediaError("image dimensions could not be read");
  }
  const encoded = await pipeline
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const key = `media/${new Date().getFullYear()}/${randomUUID()}.webp`;
  await r2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: encoded.data,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const doc = await MediaModel.create({
    key,
    alt,
    width: encoded.info.width,
    height: encoded.info.height,
    kind: "image",
  });
  return toSummary(doc);
}

export async function listMedia(page: number, limit: number): Promise<Paginated<MediaSummary>> {
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    MediaModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    MediaModel.countDocuments(),
  ]);
  return { items: docs.map(toSummary), page, limit, total };
}

async function isMediaReferenced(id: string): Promise<boolean> {
  const [articleRef, avatarRef] = await Promise.all([
    ArticleModel.exists({
      $or: [{ coverMediaId: id }, { referencedMediaIds: id }],
    }),
    UserModel.exists({ avatarMediaId: id }),
  ]);
  return Boolean(articleRef) || Boolean(avatarRef);
}

export async function deleteMedia(id: string): Promise<boolean> {
  const doc = await MediaModel.findById(id);
  if (!doc) {
    return false;
  }
  if (await isMediaReferenced(id)) {
    throw new MediaReferencedError(
      "media is referenced by an article cover, inline image, or author avatar"
    );
  }
  await r2Client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: doc.key }));
  await MediaModel.deleteOne({ _id: id });
  return true;
}
