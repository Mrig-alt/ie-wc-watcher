import { TeamStats } from "@/lib/standings";

export default function GroupStandingsTable({ groupName, stats }: { groupName: string; stats: TeamStats[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Group {groupName}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-4 py-2 font-medium w-8">#</th>
              <th className="px-4 py-2 font-medium">Team</th>
              <th className="px-2 py-2 font-medium text-center" title="Played">P</th>
              <th className="px-2 py-2 font-medium text-center" title="Won">W</th>
              <th className="px-2 py-2 font-medium text-center" title="Drawn">D</th>
              <th className="px-2 py-2 font-medium text-center" title="Lost">L</th>
              <th className="px-2 py-2 font-medium text-center" title="Goal Difference">GD</th>
              <th className="px-4 py-2 font-semibold text-center text-gray-900" title="Points">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map((team, index) => {
              const isAdvancing = index < 2; // Top 2 advance
              return (
                <tr key={team.teamId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">
                    <span className={isAdvancing ? "font-bold text-green-600" : ""}>{index + 1}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <span className="text-lg mr-2">{team.flagEmoji}</span>
                    {team.name}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-500">{team.played}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{team.won}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{team.drawn}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{team.lost}</td>
                  <td className="px-2 py-3 text-center text-gray-500 font-medium">
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
