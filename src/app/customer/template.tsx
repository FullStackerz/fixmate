/** Re-mounts on each customer route change for a soft page fade (opacity only, so fixed bars keep working). */
export default function CustomerTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
