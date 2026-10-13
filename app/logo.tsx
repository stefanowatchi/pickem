export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`display ${size === "lg" ? "text-5xl" : "text-3xl"}`}>
      Pick<span className="text-accent">&apos;</span>em
    </span>
  );
}
