import AccountClient from "./AccountClient";
import MyGroupsOverview from "@/components/profile/MyGroupsOverview";
import { auth } from "@/lib/auth";

import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AccountPageServer() {
  const session = await auth();
  
  let dbUser = null;
  if (session?.user?.id) {
    const [u] = await db
      .select({ isGuest: students.isGuest, tokenBalance: students.tokenBalance, hasBoughtIn: students.hasBoughtIn })
      .from(students)
      .where(eq(students.id, session.user.id))
      .limit(1);
    dbUser = u;
  }

  return (
    <AccountClient dbUser={dbUser}>
      {session?.user?.id && (!dbUser || !dbUser.isGuest) && (
        <MyGroupsOverview currentUserId={session.user.id} />
      )}
    </AccountClient>
  );
}
