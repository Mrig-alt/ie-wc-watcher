import { db } from "@/db";
import { friendGroups, groupMembers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

export default async function MyGroupsOverview({ currentUserId }: { currentUserId: string }) {
  const profitSql = sql<number>`${groupMembers.tokenBalance} + ${groupMembers.escrowTokens} - ${groupMembers.totalTokensReceived}`;
  
  const memberships = await db
    .select({
      groupId: friendGroups.id,
      groupName: friendGroups.name,
      profit: profitSql,
      tokenBalance: groupMembers.tokenBalance,
    })
    .from(groupMembers)
    .innerJoin(friendGroups, eq(friendGroups.id, groupMembers.groupId))
    .where(eq(groupMembers.studentId, currentUserId))
    .orderBy(desc(profitSql));

  if (memberships.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-6">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-green-600" />
          My Groups Overview
        </h2>
        <Link href="/students" className="text-xs font-medium text-green-600 hover:text-green-700">
          View all →
        </Link>
      </div>
      
      <div className="divide-y divide-gray-50">
        {memberships.map((m) => (
          <Link key={m.groupId} href={`/students/groups/${m.groupId}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <span className="font-medium text-sm text-gray-800">{m.groupName}</span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`text-sm font-bold flex items-center gap-1 ${m.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {m.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {m.profit > 0 ? "+" : ""}{m.profit}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">Net Profit</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
