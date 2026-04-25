import Link from "next/link";
import { SettingsWorkspace } from "@/components/dashboard/settings-workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { getOptionalAppUrl } from "@/lib/env";
import { buildPublicSharePath, buildPublicShareUrl } from "@/lib/profile/owner-profile";
import { getOwnerAccessState } from "@/lib/supabase/queries";

export default async function SettingsPage() {
  const accessState = await getOwnerAccessState();

  if (!accessState.ownerProfile) {
    return null;
  }

  const ownerProfile = accessState.ownerProfile;
  const sharePath = buildPublicSharePath(ownerProfile.public_link_slug);
  const shareUrl = buildPublicShareUrl(
    getOptionalAppUrl(),
    ownerProfile.public_link_slug,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Public profile"
        title="Profile and public page settings"
        description="Manage the identity visitors see before they talk to MindClone. These settings now control the real public profile, greeting, share link, visitor-name rules, and private-link password gate."
        actions={
          <Link
            href={sharePath}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Open visitor page
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Visibility"
          value={ownerProfile.is_public ? "Public" : "Private"}
          hint={
            ownerProfile.is_public
              ? "Anyone with the link can open the page and start chatting."
              : "Visitors must unlock the link with the owner password before chatting."
          }
        />
        <StatCard
          label="Visitor names"
          value={ownerProfile.require_visitor_name ? "Required" : "Optional"}
          hint="This rule is enforced on the real public chat flow."
        />
        <StatCard
          label="Share link"
          value={sharePath}
          hint={shareUrl}
        />
      </div>

      <SettingsWorkspace
        appUrl={getOptionalAppUrl()}
        initialProfile={{
          bio: ownerProfile.bio,
          greeting: ownerProfile.greeting,
          hasAccessPassword: Boolean(ownerProfile.access_password_hash),
          id: ownerProfile.id,
          isPublic: ownerProfile.is_public,
          name: ownerProfile.name,
          photoUrl: ownerProfile.photo_url,
          publicLinkSlug: ownerProfile.public_link_slug,
          requireVisitorName: ownerProfile.require_visitor_name,
          sharePath,
          shareUrl,
        }}
      />
    </div>
  );
}
