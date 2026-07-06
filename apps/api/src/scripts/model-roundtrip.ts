import { connectDb } from "../config/db";
import {
  ArticleModel,
  CategoryModel,
  MediaModel,
  RefreshTokenModel,
  RoleModel,
  TagModel,
  UserModel,
} from "../models";

interface Deletable {
  deleteOne(): Promise<unknown>;
}

async function expectValidationFailure(
  label: string,
  action: () => Promise<Deletable>
): Promise<void> {
  let doc: Deletable | undefined;
  try {
    doc = await action();
  } catch (error) {
    console.log(`${label}: rejected -> ${(error as Error).message}`);
    return;
  }
  await doc.deleteOne();
  throw new Error(`${label}: expected validation to fail but it passed`);
}

async function main(): Promise<void> {
  const mongoose = await connectDb();
  console.log(`roundtrip connected to ${mongoose.connection.name}`);

  const created: Deletable[] = [];
  const track = <T extends Deletable>(doc: T): T => {
    created.push(doc);
    return doc;
  };

  try {
    const role = track(
      await RoleModel.create({
        name: `roundtrip-editor-${Date.now()}`,
        permissions: ["article:create", "article:edit"],
        systemLocked: false,
      })
    );

    const user = track(
      await UserModel.create({
        name: "Roundtrip Author",
        phone: `+9199${Date.now().toString().slice(-8)}`,
        roleIds: [role._id],
        slug: `roundtrip-author-${Date.now()}`,
        bio: "roundtrip verification author",
      })
    );

    const category = track(
      await CategoryModel.create({
        name: "राष्ट्रीय",
        slug: `roundtrip-national-${Date.now()}`,
        order: 1,
      })
    );

    const tag = track(
      await TagModel.create({
        name: "चुनाव",
        slug: `roundtrip-election-${Date.now()}`,
      })
    );

    const media = track(
      await MediaModel.create({
        key: `roundtrip/cover-${Date.now()}.webp`,
        alt: "roundtrip cover",
        width: 1280,
        height: 720,
      })
    );

    const article = track(
      await ArticleModel.create({
        defaultLanguage: "hi",
        translations: {
          hi: {
            title: "जल संरक्षण पर विशेष रिपोर्ट",
            excerpt: "जल संकट और समाधान",
            slug: `jal-sanrakshan-${Date.now()}`,
            body: {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "जल ही जीवन है।" }] },
              ],
            },
          },
          en: {
            title: "Special report on water conservation",
            excerpt: "Water crisis and solutions",
            slug: `water-conservation-${Date.now()}`,
            body: {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Water is life." }] },
              ],
            },
          },
        },
        categoryId: category._id,
        authorId: user._id,
        tagIds: [tag._id],
        coverMediaId: media._id,
        isBreaking: true,
        status: "draft",
      })
    );

    const refreshToken = track(
      await RefreshTokenModel.create({
        userId: user._id,
        familyId: `fam-${Date.now()}`,
        tokenHash: `hash-${Date.now()}`,
        expiresAt: new Date(Date.now() + 86400000),
      })
    );

    const readBack = await ArticleModel.findById(article._id).orFail();
    console.log(
      JSON.stringify(
        {
          articleId: readBack.id,
          defaultLanguage: readBack.defaultLanguage,
          translationLanguages: [...readBack.translations.keys()],
          hindiTitle: readBack.translations.get("hi")?.title,
          englishTitle: readBack.translations.get("en")?.title,
          bodyNodeType: readBack.translations.get("hi")?.body?.type,
          status: readBack.status,
          isBreaking: readBack.isBreaking,
          categoryId: readBack.categoryId.toString(),
          authorId: readBack.authorId.toString(),
          tagIds: readBack.tagIds.map((id) => id.toString()),
          coverMediaId: readBack.coverMediaId?.toString(),
          refreshTokenStatus: refreshToken.status,
        },
        null,
        2
      )
    );

    await expectValidationFailure("article with unsupported language key", () =>
      ArticleModel.create({
        defaultLanguage: "hi",
        translations: {
          hi: { title: "t", excerpt: "e", slug: "s", body: { type: "doc" } },
          xx: { title: "t", excerpt: "e", slug: "s", body: { type: "doc" } },
        },
        categoryId: category._id,
        authorId: user._id,
      })
    );

    await expectValidationFailure("article missing default-language translation", () =>
      ArticleModel.create({
        defaultLanguage: "hi",
        translations: {
          en: { title: "t", excerpt: "e", slug: "s", body: { type: "doc" } },
        },
        categoryId: category._id,
        authorId: user._id,
      })
    );

    await expectValidationFailure("role with unknown permission", () =>
      RoleModel.create({ name: `roundtrip-bad-${Date.now()}`, permissions: ["article:fly"] })
    );

    await expectValidationFailure("user with invalid status", () =>
      UserModel.create({
        name: "Bad Status",
        phone: `+9198${Date.now().toString().slice(-8)}`,
        roleIds: [role._id],
        slug: `roundtrip-bad-${Date.now()}`,
        status: "asleep",
      })
    );
  } finally {
    for (const doc of created.reverse()) {
      await doc.deleteOne();
    }
    console.log(`roundtrip cleanup complete (${created.length} documents removed)`);
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
