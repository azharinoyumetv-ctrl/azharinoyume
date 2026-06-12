import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ja", "id", "ko", "ru", "fr", "zh-CN", "zh-TW"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
