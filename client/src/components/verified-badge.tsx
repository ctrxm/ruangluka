export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <img 
      src="/images/verified-badge.png" 
      alt="Verified" 
      className={`inline-block w-4 h-4 ${className}`}
      data-testid="img-verified-badge"
    />
  );
}
