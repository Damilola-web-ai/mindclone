import { notFound } from "next/navigation";
import { PublicChatPage } from "@/components/chat/public-chat-page";

type PublicChatSlugPageProps = {
  params: {
    publicChatSlug: string;
  };
};

export default function PublicChatSlugPage({
  params,
}: PublicChatSlugPageProps) {
  const { publicChatSlug } = params;

  if (!publicChatSlug.startsWith("talk-to-")) {
    notFound();
  }

  const ownerSlug = publicChatSlug.slice("talk-to-".length).trim();

  if (!ownerSlug) {
    notFound();
  }

  return <PublicChatPage ownerSlug={ownerSlug} />;
}
