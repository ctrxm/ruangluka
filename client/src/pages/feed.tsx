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
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      <CreatePost />

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border border-border">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
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
        <Card className="p-8 border border-border text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada curhat. Jadilah yang pertama!</p>
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
