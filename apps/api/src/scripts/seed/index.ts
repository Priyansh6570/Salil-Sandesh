import { permissionCatalogue, type Permission } from "@salil-sandesh/shared";
import { collectImageMediaIds } from "@salil-sandesh/editor-config";
import { connectDb } from "../../config/db";
import {
  ArticleModel,
  CategoryModel,
  RoleModel,
  TagModel,
  UserModel,
} from "../../models";
import { ensureCategoryCover } from "./covers";
import {
  categoryDefinitions,
  categoryForNews,
  englishBody,
  hindiBody,
  slugFrom,
} from "./content";
import { fetchHindiHeadlines } from "./news-client";

interface RoleSeed {
  name: string;
  permissions: Permission[];
  systemLocked: boolean;
}

const roleSeeds: RoleSeed[] = [
  { name: "admin", permissions: [...permissionCatalogue], systemLocked: true },
  {
    name: "editor",
    permissions: [
      "article:create",
      "article:edit",
      "article:publish",
      "article:delete",
      "media:upload",
      "media:manage",
      "category:manage",
      "tag:manage",
    ],
    systemLocked: false,
  },
  {
    name: "author",
    permissions: ["article:create", "article:edit", "media:upload"],
    systemLocked: false,
  },
  { name: "writer", permissions: ["article:create", "article:edit"], systemLocked: false },
  { name: "photographer", permissions: ["media:upload", "media:manage"], systemLocked: false },
];

interface UserSeed {
  slug: string;
  name: string;
  phone: string;
  roleName: string;
  bio: string;
}

const userSeeds: UserSeed[] = [
  { slug: "admin-root", name: "प्रधान संपादक", phone: "+919999000001", roleName: "admin", bio: "सलिल संदेश के प्रधान संपादक" },
  { slug: "sandeep-sharma", name: "संदीप शर्मा", phone: "+919999000002", roleName: "editor", bio: "वरिष्ठ संपादक, राष्ट्रीय डेस्क" },
  { slug: "kavita-verma", name: "कविता वर्मा", phone: "+919999000003", roleName: "author", bio: "फ़ीचर लेखिका" },
  { slug: "rahul-mishra", name: "राहुल मिश्रा", phone: "+919999000004", roleName: "author", bio: "खेल संवाददाता" },
  { slug: "neha-gupta", name: "नेहा गुप्ता", phone: "+919999000005", roleName: "writer", bio: "व्यापार एवं तकनीक लेखिका" },
  { slug: "arjun-nair", name: "अर्जुन नायर", phone: "+919999000006", roleName: "photographer", bio: "मुख्य छायाकार" },
];

const tagPool = [
  { slug: "bharat", name: "भारत" },
  { slug: "chunav", name: "चुनाव" },
  { slug: "arthvyavastha", name: "अर्थव्यवस्था" },
  { slug: "cricket", name: "क्रिकेट" },
  { slug: "takneek", name: "तकनीक" },
  { slug: "swasthya", name: "स्वास्थ्य" },
  { slug: "duniya", name: "दुनिया" },
  { slug: "manoranjan", name: "मनोरंजन" },
];

async function main(): Promise<void> {
  const mongoose = await connectDb();
  console.log(`seed connected to ${mongoose.connection.name}`);

  const rolesByName = new Map<string, string>();
  for (const role of roleSeeds) {
    const doc = await RoleModel.findOneAndUpdate(
      { name: role.name },
      { permissions: role.permissions, systemLocked: role.systemLocked },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    rolesByName.set(role.name, doc.id);
  }
  console.log(`roles ready: ${[...rolesByName.keys()].join(", ")}`);

  const authorIds: string[] = [];
  for (const user of userSeeds) {
    const roleId = rolesByName.get(user.roleName)!;
    const doc = await UserModel.findOneAndUpdate(
      { phone: user.phone },
      {
        name: user.name,
        slug: user.slug,
        bio: user.bio,
        roleIds: [roleId],
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (["editor", "author", "writer"].includes(user.roleName)) {
      authorIds.push(doc.id);
    }
  }
  console.log(`users ready: ${userSeeds.length} (${authorIds.length} can author)`);

  const categoryIdBySlug = new Map<string, string>();
  const coverIdBySlug = new Map<string, string>();
  for (const definition of categoryDefinitions) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: definition.slug },
      { name: definition.name, order: definition.order },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryIdBySlug.set(definition.slug, doc.id);
    coverIdBySlug.set(definition.slug, await ensureCategoryCover(definition.slug, definition.name));
  }
  console.log(`categories ready with covers: ${categoryIdBySlug.size}`);

  const tagIdBySlug = new Map<string, string>();
  for (const tag of tagPool) {
    const doc = await TagModel.findOneAndUpdate(
      { slug: tag.slug },
      { name: tag.name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    tagIdBySlug.set(tag.slug, doc.id);
  }
  const tagIds = [...tagIdBySlug.values()];

  const headlines = await fetchHindiHeadlines(40);
  console.log(`fetched ${headlines.length} real Hindi headlines from NewsData.io`);

  let created = 0;
  let updated = 0;
  let withEnglish = 0;
  for (const [index, article] of headlines.entries()) {
    const definition = categoryForNews(article.category);
    const slug = slugFrom(article.title, article.articleId);
    const authorId = authorIds[index % authorIds.length]!;
    const coverId = coverIdBySlug.get(definition.slug)!;
    const articleTags = [tagIds[index % tagIds.length]!, tagIds[(index + 3) % tagIds.length]!];
    const body = hindiBody(article, definition.name);
    const translations: Record<string, unknown> = {
      hi: {
        title: article.title.slice(0, 300),
        excerpt: article.description.slice(0, 500),
        slug,
        body,
      },
    };
    const addEnglish = index % 7 === 0;
    if (addEnglish) {
      translations.en = {
        title: `${definition.englishName}: ${article.sourceName} report`,
        excerpt: "An English summary of this report is available for our readers.",
        slug: `${slug}-en`,
        body: englishBody(`${definition.englishName} report`, article.description),
      };
      withEnglish += 1;
    }
    const referencedMediaIds = [
      coverId,
      ...collectImageMediaIds(body),
    ];
    const existing = await ArticleModel.findOne({ "translations.hi.slug": slug });
    const publishedAt = new Date(Date.now() - index * 3600_000);
    await ArticleModel.findOneAndUpdate(
      { "translations.hi.slug": slug },
      {
        defaultLanguage: "hi",
        translations,
        categoryId: categoryIdBySlug.get(definition.slug),
        authorId,
        tagIds: articleTags,
        coverMediaId: coverId,
        referencedMediaIds,
        isBreaking: index < 2,
        isFeatured: index < 6,
        isPremium: index % 11 === 0,
        status: "published",
        publishedAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(
    JSON.stringify({
      articlesCreated: created,
      articlesUpdated: updated,
      articlesWithEnglish: withEnglish,
      categories: categoryIdBySlug.size,
      tags: tagIds.length,
      staff: userSeeds.length,
      otpLoginAdminPhone: userSeeds[0]!.phone,
    })
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
