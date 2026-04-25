"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveOwnerSettings, type OwnerSettingsProfileSnapshot } from "@/app/dashboard/settings/actions";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildOwnerPhotoStoragePath, buildPublicSharePath, buildPublicShareUrl, normalizePublicLinkSlug } from "@/lib/profile/owner-profile";
import { cn } from "@/lib/utils";

type SettingsWorkspaceProps = {
  appUrl?: string | null;
  initialProfile: OwnerSettingsProfileSnapshot;
};

type BannerState = {
  message: string;
  tone: "error" | "info" | "success";
};

function getBannerClasses(tone: BannerState["tone"]) {
  if (tone === "error") {
    return "border-rose-400/18 bg-rose-400/10 text-rose-50";
  }

  if (tone === "success") {
    return "border-emerald-400/18 bg-emerald-400/10 text-emerald-50";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-50";
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "MC";
}

export function SettingsWorkspace({
  appUrl,
  initialProfile,
}: SettingsWorkspaceProps) {
  const toast = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [greeting, setGreeting] = useState(initialProfile.greeting);
  const [publicLinkSlug, setPublicLinkSlug] = useState(
    initialProfile.publicLinkSlug ?? "",
  );
  const [isPublic, setIsPublic] = useState(initialProfile.isPublic);
  const [requireVisitorName, setRequireVisitorName] = useState(
    initialProfile.requireVisitorName,
  );
  const [accessPassword, setAccessPassword] = useState("");
  const [clearAccessPassword, setClearAccessPassword] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedSlug = normalizePublicLinkSlug(publicLinkSlug, name);
  const sharePath = buildPublicSharePath(normalizedSlug);
  const shareUrl = buildPublicShareUrl(appUrl, normalizedSlug);
  const livePhotoUrl = removePhoto ? null : profile.photoUrl;

  async function uploadPhotoIfNeeded() {
    if (!selectedPhoto) {
      return livePhotoUrl;
    }

    const supabase = getSupabaseBrowserClient();
    const storagePath = buildOwnerPhotoStoragePath(profile.id);
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(storagePath, selectedPhoto, {
        contentType: selectedPhoto.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message || "The profile photo could not be uploaded.",
      );
    }

    const { data } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        description: "The current visitor link is now on your clipboard.",
        title: "Share link copied",
        tone: "success",
      });
    } catch {
      toast({
        description: "Clipboard access failed in this browser session.",
        title: "Could not copy link",
        tone: "error",
      });
    }
  }

  async function handleSave() {
    setBanner(null);
    setIsSaving(true);

    try {
      const uploadedPhotoUrl = await uploadPhotoIfNeeded();
      const result = await saveOwnerSettings({
        accessPassword,
        bio,
        clearAccessPassword,
        greeting,
        isPublic,
        name,
        photoUrl: uploadedPhotoUrl,
        publicLinkSlug,
        removePhoto,
        requireVisitorName,
      });

      if (result.status === "error") {
        setBanner({
          message: result.message,
          tone: "error",
        });
        toast({
          description: result.message,
          title: "Settings not saved",
          tone: "error",
        });
        return;
      }

      setProfile(result.profile);
      setName(result.profile.name);
      setBio(result.profile.bio);
      setGreeting(result.profile.greeting);
      setPublicLinkSlug(result.profile.publicLinkSlug ?? "");
      setIsPublic(result.profile.isPublic);
      setRequireVisitorName(result.profile.requireVisitorName);
      setAccessPassword("");
      setClearAccessPassword(false);
      setSelectedPhoto(null);
      setRemovePhoto(false);
      setBanner({
        message: result.message,
        tone: "success",
      });
      toast({
        description: "The public profile preview and visitor chat rules updated successfully.",
        title: "Settings saved",
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      const nextBanner = {
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving settings.",
        tone: "error",
      } satisfies BannerState;

      setBanner(nextBanner);
      toast({
        description: nextBanner.message,
        title: "Settings not saved",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Visitor-facing profile
            </CardDescription>
            <CardTitle className="text-white">Public page settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {banner ? (
              <div
                className={cn(
                  "rounded-[1.4rem] border px-4 py-3 text-sm leading-6",
                  getBannerClasses(banner.tone),
                )}
              >
                {banner.message}
              </div>
            ) : null}

            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b1622] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(59,130,246,0.9))] text-2xl font-semibold text-white"
                  style={
                    livePhotoUrl
                      ? {
                          backgroundImage: `linear-gradient(135deg, rgba(16,185,129,0.28), rgba(59,130,246,0.22)), url(${livePhotoUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                  aria-label={livePhotoUrl ? `${name} profile photo` : undefined}
                  role={livePhotoUrl ? "img" : undefined}
                >
                  {livePhotoUrl ? null : getInitials(name)}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white">Profile photo</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Upload the image visitors should see before they start chatting.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15">
                      Choose photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setSelectedPhoto(nextFile);
                          setRemovePhoto(false);
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-300 hover:bg-white/8 hover:text-white"
                      onClick={() => {
                        setSelectedPhoto(null);
                        setRemovePhoto(true);
                      }}
                    >
                      Remove photo
                    </Button>
                  </div>
                  {selectedPhoto ? (
                    <p className="text-sm text-emerald-200/90">
                      Ready to upload: {selectedPhoto.name}
                    </p>
                  ) : removePhoto ? (
                    <p className="text-sm text-amber-200/90">
                      The current photo will be removed when you save.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="display-name" className="text-slate-200">
                Display name
              </Label>
              <Input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                placeholder="The name visitors should see"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="public-link" className="text-slate-200">
                Public link slug
              </Label>
              <Input
                id="public-link"
                value={publicLinkSlug}
                onChange={(event) => setPublicLinkSlug(event.target.value)}
                className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                placeholder="your-name"
              />
              <p className="text-sm leading-6 text-slate-400">
                We normalize this automatically. Preview:{" "}
                <span className="font-mono text-emerald-300/90">{sharePath}</span>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="public-bio" className="text-slate-200">
                Public bio
              </Label>
              <Textarea
                id="public-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-[120px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                placeholder="A short intro visitors see before the chat begins."
              />
              <p className="text-xs text-slate-500">{bio.length}/280 characters</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="greeting" className="text-slate-200">
                Greeting message
              </Label>
              <Textarea
                id="greeting"
                value={greeting}
                onChange={(event) => setGreeting(event.target.value)}
                className="min-h-[120px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                placeholder="The first thing the clone says when a visitor starts the conversation."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Privacy and visitor rules
            </CardDescription>
            <CardTitle className="text-white">Access controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                [true, "Public link", "Anyone with the link can open the profile and chat immediately."],
                [false, "Private password", "Visitors must unlock the link with a password before they can talk to the clone."],
              ] as Array<[boolean, string, string]>).map(([value, title, description]) => (
                <button
                  key={title}
                  type="button"
                  aria-pressed={isPublic === value}
                  className={cn(
                    "rounded-[1.45rem] border px-4 py-4 text-left transition-colors",
                    isPublic === value
                      ? "border-emerald-300/20 bg-emerald-400/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]",
                  )}
                  onClick={() => setIsPublic(value)}
                >
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-inherit/80">
                    {description}
                  </p>
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1622] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Visitor names</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Decide whether visitors can stay anonymous or must introduce themselves first.
                  </p>
                </div>
                <div className="flex gap-2">
                  {([
                    [false, "Optional"],
                    [true, "Required"],
                  ] as Array<[boolean, string]>).map(([value, label]) => (
                    <Button
                      key={label}
                      type="button"
                      variant={requireVisitorName === value ? "default" : "secondary"}
                      size="sm"
                      className={requireVisitorName === value ? "" : "bg-white/10 text-white hover:bg-white/15"}
                      onClick={() => setRequireVisitorName(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1622] p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Private link password</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {profile.hasAccessPassword && !clearAccessPassword
                        ? "Leave this blank to keep the current password, or enter a new one to rotate it."
                        : "Set the password visitors need when the link is private."}
                    </p>
                  </div>
                  {profile.hasAccessPassword && !clearAccessPassword ? (
                    <Badge className="bg-emerald-400/12 text-emerald-100">
                      Password saved
                    </Badge>
                  ) : (
                    <Badge className="bg-white/8 text-slate-300">
                      No saved password
                    </Badge>
                  )}
                </div>

                <Input
                  type="password"
                  value={accessPassword}
                  onChange={(event) => {
                    setAccessPassword(event.target.value);
                    if (event.target.value.trim()) {
                      setClearAccessPassword(false);
                    }
                  }}
                  className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
                  placeholder="At least 6 characters"
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-300 hover:bg-white/8 hover:text-white"
                    onClick={() => {
                      setAccessPassword("");
                      setClearAccessPassword(true);
                    }}
                  >
                    Clear saved password
                  </Button>
                  {clearAccessPassword ? (
                    <p className="text-sm text-amber-200/90">
                      The saved password will be removed when you save.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Saving settings..." : "Save public settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="border-white/10 bg-white/[0.03] text-white shadow-none">
          <CardHeader>
            <CardDescription className="text-slate-400">
              Live public preview
            </CardDescription>
            <CardTitle className="text-white">How visitors will see you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,#132232,#0d1824)] p-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.94),rgba(59,130,246,0.9))] text-xl font-semibold text-white"
                  style={
                    livePhotoUrl
                      ? {
                          backgroundImage: `linear-gradient(135deg, rgba(16,185,129,0.28), rgba(59,130,246,0.22)), url(${livePhotoUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                >
                  {livePhotoUrl ? null : getInitials(name)}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold text-white">{name || "Owner"}</p>
                    <Badge className={isPublic ? "bg-emerald-400/12 text-emerald-100" : "bg-amber-300/12 text-amber-100"}>
                      {isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-slate-300">
                    {bio || "A short public intro will show up here before visitors begin chatting."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
                  Greeting preview
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {greeting || "Thanks for stopping by. Ask me anything and I'll answer naturally."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white">Visitor names</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {requireVisitorName
                    ? "Visitors must share a name before they can start the conversation."
                    : "Visitors can chat anonymously or optionally share a name."}
                </p>
              </div>
              <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white">Link behavior</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isPublic
                    ? "The page opens immediately for anyone with the link."
                    : profile.hasAccessPassword || accessPassword.trim()
                      ? "Visitors must enter the password before the chat unlocks."
                      : "Set a password before saving private mode."}
                </p>
              </div>
            </div>

            <Card className="border-white/10 bg-[#0b1622] text-white shadow-none">
              <CardHeader>
                <CardTitle className="text-white">Share link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-mono text-sm text-emerald-300/90">{shareUrl}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={sharePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                  >
                    Open visitor page
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/15"
                    onClick={() => void handleCopyShareLink()}
                  >
                    Copy link
                  </Button>
                  <p className="text-sm leading-6 text-slate-400">
                    The root `/chat` route stays available too, but this is the shareable branded link preview.
                  </p>
                </div>
              </CardContent>
            </Card>

            {!isPublic && !(profile.hasAccessPassword || accessPassword.trim()) ? (
              <EmptyStateCard
                title="Private mode needs a password"
                description="Set a private-link password before saving if you want visitors to unlock the chat instead of getting blocked."
                hint="You can leave the link public if you do not want to manage visitor passwords."
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
