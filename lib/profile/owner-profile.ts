const DEFAULT_SLUG_FALLBACK = "mindclone";

function trimNullableText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePublicLinkSlug(
  value?: string | null,
  fallbackValue?: string | null,
) {
  const source = trimNullableText(value) ?? trimNullableText(fallbackValue);

  if (!source) {
    return DEFAULT_SLUG_FALLBACK;
  }

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");

  return normalized || DEFAULT_SLUG_FALLBACK;
}

export function buildOwnerPhotoStoragePath(ownerId: string) {
  return `owners/${ownerId}/profile-photo`;
}

export function buildPublicSharePath(slug?: string | null) {
  const normalizedSlug = trimNullableText(slug);

  if (!normalizedSlug) {
    return "/chat";
  }

  return `/talk-to-${normalizedSlug}`;
}

export function buildPublicShareUrl(appUrl?: string | null, slug?: string | null) {
  const sharePath = buildPublicSharePath(slug);
  const normalizedAppUrl = trimNullableText(appUrl);

  if (!normalizedAppUrl) {
    return sharePath;
  }

  return `${normalizedAppUrl.replace(/\/+$/, "")}${sharePath}`;
}
