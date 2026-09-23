export default function UsageBadge({ used }: { used: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        used ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      }`}
    >
      {used ? "사용" : "미사용"}
    </span>
  );
}
