type Props = {
  status: string;
};

export function StatusBadge({
  status,
}: Props) {
  const styles: Record<
    string,
    string
  > = {
    new: "bg-zinc-500/10 text-zinc-400",
    warm: "bg-amber-500/10 text-amber-400",
    hot: "bg-red-500/10 text-red-400",
    qualified:
      "bg-blue-500/10 text-blue-400",
    booked:
      "bg-emerald-500/10 text-emerald-400",
    won: "bg-green-500/10 text-green-400",
    lost: "bg-zinc-500/10 text-zinc-500",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        styles[status] ??
        styles.new
      }`}
    >
      {status}
    </span>
  );
}