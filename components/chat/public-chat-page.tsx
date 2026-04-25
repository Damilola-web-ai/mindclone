import { cookies } from "next/headers";
import Link from "next/link";
import { hasValidVisitorAccessCookie, getVisitorAccessCookieName } from "@/lib/chat/public-access";
import { getPublicChatOwnerProfile } from "@/lib/chat/public-chat";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicChatExperience } from "@/components/chat/public-chat-experience";

type PublicChatPageProps = {
  ownerSlug?: string | null;
};

export async function PublicChatPage({ ownerSlug }: PublicChatPageProps) {
  const profile = await getPublicChatOwnerProfile(ownerSlug ?? null);

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="surface-border w-full shadow-[0_28px_80px_-56px_rgba(15,23,42,0.75)]">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              Public chat unavailable
            </Badge>
            <CardTitle className="text-3xl">This MindClone link is not live yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-7 text-muted-foreground">
            <p>
              The owner has not made their public chat available yet, or this shared
              link does not match their configured slug.
            </p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to overview
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const accessCookieValue = cookies().get(getVisitorAccessCookieName())?.value;
  const initialChatAccess =
    profile.is_public ||
    hasValidVisitorAccessCookie({
      cookieValue: accessCookieValue,
      ownerProfileId: profile.id,
      passwordHash: profile.access_password_hash,
    });

  return (
    <PublicChatExperience
      initialChatAccess={initialChatAccess}
      ownerSlug={ownerSlug ?? null}
      profile={{
        bio: profile.bio,
        greeting: profile.greeting,
        hasAccessPassword: Boolean(profile.access_password_hash),
        isPublic: profile.is_public,
        name: profile.name,
        photoUrl: profile.photo_url,
        publicLinkSlug: profile.public_link_slug,
        requireVisitorName: profile.require_visitor_name,
      }}
    />
  );
}
