import { useQuery } from "@tanstack/react-query";
import type { PostWithAuthor } from "@shared/schema";
import { CreatePost } from "@/components/create-post";
import { PostCard } from "@/components/post-card";
import { AdBanner } from "@/components/ad-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export default function FeedPage() {
  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feed"],
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <CreatePost />

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border border-border">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {posts && posts.length === 0 && (
        <Card className="p-10 border border-border text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">Belum ada curhat</p>
          <p className="text-xs text-muted-foreground">Jadilah yang pertama berbagi cerita!</p>
        </Card>
      )}

      {posts?.map((post, index) => (
        <div key={post.id}>
          <PostCard post={post} />
          {(index + 1) % 5 === 0 && <div className="my-4"><AdBanner /></div>}
        </div>
      ))}
    </div>
  );
}
