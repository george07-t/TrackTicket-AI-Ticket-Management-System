import { ReactNode } from "react";

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[var(--paper)] text-left text-[var(--muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
