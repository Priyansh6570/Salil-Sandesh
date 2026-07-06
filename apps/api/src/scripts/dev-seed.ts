import type { TipTapNode } from "@salil-sandesh/shared";
import { connectDb } from "../config/db";
import {
  ArticleModel,
  CategoryModel,
  MediaModel,
  RoleModel,
  TagModel,
  UserModel,
} from "../models";

function paragraph(text: string): TipTapNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function heading(text: string, level: number): TipTapNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function bulletList(items: string[]): TipTapNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}

function blockquote(text: string): TipTapNode {
  return { type: "blockquote", content: [paragraph(text)] };
}

function body(...content: TipTapNode[]): TipTapNode {
  return { type: "doc", content };
}

async function main(): Promise<void> {
  const mongoose = await connectDb();
  console.log(`dev-seed connected to ${mongoose.connection.name}`);

  const editorRole = await RoleModel.findOneAndUpdate(
    { name: "editor" },
    { permissions: ["article:create", "article:edit", "article:publish"], systemLocked: false },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const author = await UserModel.findOneAndUpdate(
    { slug: "sandeep-sharma" },
    {
      $setOnInsert: { phone: "+919999000002" },
      name: "संदीप शर्मा",
      bio: "वरिष्ठ संवाददाता, दो दशक का पत्रकारिता अनुभव",
      roleIds: [editorRole._id],
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const national = await CategoryModel.findOneAndUpdate(
    { slug: "rashtriya" },
    { name: "राष्ट्रीय", order: 1 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const sports = await CategoryModel.findOneAndUpdate(
    { slug: "khel" },
    { name: "खेल", order: 2 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const electionTag = await TagModel.findOneAndUpdate(
    { slug: "chunav" },
    { name: "चुनाव" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cricketTag = await TagModel.findOneAndUpdate(
    { slug: "cricket" },
    { name: "क्रिकेट" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cover = await MediaModel.findOneAndUpdate(
    { key: "seed/cover-monsoon.webp" },
    { alt: "मानसून की बारिश", width: 1280, height: 720 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const monsoon = await ArticleModel.findOneAndUpdate(
    { "translations.hi.slug": "monsoon-satra-jal-niti" },
    {
      defaultLanguage: "hi",
      translations: {
        hi: {
          title: "मानसून सत्र में जल नीति पर बड़ा फैसला",
          excerpt: "संसद के मानसून सत्र में जल संरक्षण नीति को मंजूरी मिलने की संभावना है।",
          slug: "monsoon-satra-jal-niti",
          body: body(
            heading("जल नीति का मसौदा तैयार", 2),
            paragraph(
              "संसद के मानसून सत्र में जल संरक्षण नीति पर बड़ा फैसला होने जा रहा है। मसौदे में भूजल पुनर्भरण और वर्षा जल संचयन पर विशेष जोर दिया गया है।"
            ),
            bulletList([
              "हर जिले में जल बजट अनिवार्य",
              "वर्षा जल संचयन के लिए अनुदान",
              "भूजल दोहन पर सख्त निगरानी",
            ]),
            blockquote("जल है तो कल है — यही इस नीति का मूल मंत्र है।"),
            paragraph("विपक्ष ने भी मोटे तौर पर मसौदे का समर्थन किया है।")
          ),
        },
        en: {
          title: "Major water policy decision expected in monsoon session",
          excerpt: "Parliament is likely to approve the water conservation policy this monsoon session.",
          slug: "monsoon-session-water-policy",
          body: body(
            heading("Draft policy ready", 2),
            paragraph(
              "A landmark water conservation policy is set for approval in the monsoon session, with a strong focus on groundwater recharge and rainwater harvesting."
            ),
            bulletList([
              "Mandatory water budgets for every district",
              "Grants for rainwater harvesting",
              "Strict monitoring of groundwater extraction",
            ]),
            paragraph("The opposition has broadly supported the draft.")
          ),
        },
      },
      categoryId: national._id,
      authorId: author._id,
      tagIds: [electionTag._id],
      coverMediaId: cover._id,
      isFeatured: true,
      isBreaking: false,
      isPremium: false,
      status: "published",
      publishedAt: new Date("2026-07-04T09:00:00Z"),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cricket = await ArticleModel.findOneAndUpdate(
    { "translations.hi.slug": "bharat-series-jeet" },
    {
      defaultLanguage: "hi",
      translations: {
        hi: {
          title: "भारत ने रोमांचक मुकाबले में सीरीज़ जीती",
          excerpt: "आख़िरी ओवर तक चले मुकाबले में भारतीय टीम ने शानदार जीत दर्ज की।",
          slug: "bharat-series-jeet",
          body: body(
            paragraph(
              "आख़िरी ओवर तक चले रोमांचक मुकाबले में भारतीय क्रिकेट टीम ने सीरीज़ अपने नाम कर ली।"
            ),
            heading("मैच के मुख्य क्षण", 2),
            bulletList(["शतकीय साझेदारी", "आख़िरी ओवर में 12 रन", "गेंदबाज़ों का दमदार प्रदर्शन"])
          ),
        },
      },
      categoryId: sports._id,
      authorId: author._id,
      tagIds: [cricketTag._id],
      isBreaking: true,
      isFeatured: false,
      isPremium: false,
      status: "published",
      publishedAt: new Date("2026-07-05T15:30:00Z"),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const draft = await ArticleModel.findOneAndUpdate(
    { "translations.hi.slug": "draft-shiksha-niti" },
    {
      defaultLanguage: "hi",
      translations: {
        hi: {
          title: "शिक्षा नीति पर मसौदा रिपोर्ट",
          excerpt: "यह लेख अभी प्रकाशित नहीं हुआ है।",
          slug: "draft-shiksha-niti",
          body: body(paragraph("मसौदा तैयार हो रहा है।")),
        },
      },
      categoryId: national._id,
      authorId: author._id,
      tagIds: [],
      status: "draft",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(
    JSON.stringify({
      author: author.slug,
      categories: [national.slug, sports.slug],
      tags: [electionTag.slug, cricketTag.slug],
      cover: cover.key,
      published: [
        { id: monsoon.id, languages: [...monsoon.translations.keys()] },
        { id: cricket.id, languages: [...cricket.translations.keys()] },
      ],
      draft: { id: draft.id, status: draft.status },
    })
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
