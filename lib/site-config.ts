export const siteConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "AI Lead Assistant",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "",
};