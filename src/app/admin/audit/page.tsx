import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { isNotNull, eq, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.id || !adminEmail || session.user.email !== adminEmail) {
    redirect("/");
  }

  // Get all students with a deviceId
  const allStudents = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      deviceId: students.deviceId,
      createdAt: students.createdAt,
      tokenBalance: students.tokenBalance,
    })
    .from(students)
    .where(isNotNull(students.deviceId));

  // Group by deviceId
  const deviceMap: Record<string, typeof allStudents> = {};
  for (const s of allStudents) {
    if (!s.deviceId) continue;
    if (!deviceMap[s.deviceId]) deviceMap[s.deviceId] = [];
    deviceMap[s.deviceId].push(s);
  }

  // Filter to only those with multiple accounts
  const suspiciousDevices = Object.entries(deviceMap)
    .filter(([_, accounts]) => accounts.length > 1)
    .sort((a, b) => b[1].length - a[1].length); // sort by highest number of accounts first

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            ← Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Security Audit</h1>
        </div>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-red-900 text-lg flex items-center gap-2">
          <span>🚨 Suspicious Device Activity</span>
        </h2>
        <p className="text-sm text-red-700">
          The following device signatures have registered or logged into multiple accounts. This strongly indicates someone is farming tokens using fake emails.
        </p>

        {suspiciousDevices.length === 0 ? (
          <div className="bg-white p-4 rounded-lg border border-red-100 text-center text-sm text-gray-500">
            No suspicious overlapping devices found. The class is playing fair!
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {suspiciousDevices.map(([deviceId, accounts]) => (
              <div key={deviceId} className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-sm">
                <div className="bg-red-100/50 px-4 py-2 border-b border-red-200 flex justify-between items-center">
                  <span className="text-xs font-mono text-red-800">Device: {deviceId}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">{accounts.length} Accounts</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {accounts.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2 text-gray-900 font-medium">{s.name}</td>
                        <td className="px-4 py-2 text-gray-600">{s.email}</td>
                        <td className="px-4 py-2 text-right text-green-600 font-medium">{s.tokenBalance}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
