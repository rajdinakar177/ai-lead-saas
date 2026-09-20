import { Business } from "@/models/Business";

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createUniqueBusinessSlug(businessName: string) {
  const baseSlug = createSlug(businessName) || "business";

  let slug = baseSlug;
  let counter = 1;

  while (
    await Business.exists({
      slug,
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
