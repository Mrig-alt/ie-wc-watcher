import AccountClient from "./AccountClient";
import MyGroupsOverview from "@/components/profile/MyGroupsOverview";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPageServer() {
  const session = await auth();

  return (
    <AccountClient>
      {session?.user?.id && !session.user.isGuest && (
        <MyGroupsOverview currentUserId={session.user.id} />
      )}
    </AccountClient>
  );
}
