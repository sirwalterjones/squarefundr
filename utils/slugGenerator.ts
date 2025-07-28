export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

export function isValidSlug(slug: string): boolean {
  // Check if slug is valid (no special characters, not empty, reasonable length)
  return (
    slug.length > 0 &&
    slug.length <= 100 &&
    /^[a-z0-9-]+$/.test(slug) &&
    !slug.startsWith('-') &&
    !slug.endsWith('-') &&
    !slug.includes('--')
  );
}

export function generateRandomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateCampaignUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${base}/fundraiser/${slug}`;
}


