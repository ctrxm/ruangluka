import { useQuery } from "@tanstack/react-query";
import type { Ad } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function AdBanner() {
  const { data: ads } = useQuery<Ad[]>({
    queryKey: ["/api/ads/active"],
  });

  if (!ads || ads.length === 0) return null;
  const ad = ads[Math.floor(Math.random() * ads.length)];

  return (
    <Card className="p-3 border border-border">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Iklan</span>
      </div>
      {ad.type === "image" && ad.imageUrl && (
        <a href={ad.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`link-ad-${ad.id}`}>
          <img src={ad.imageUrl} alt={ad.title} className="w-full rounded-md mb-2 object-cover max-h-40" />
        </a>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium leading-tight">{ad.title}</p>
        {ad.content && <p className="text-xs text-muted-foreground leading-relaxed">{ad.content}</p>}
        {ad.linkUrl && (
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            data-testid={`link-ad-url-${ad.id}`}
          >
            Kunjungi <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
