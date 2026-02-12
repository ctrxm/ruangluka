import { useQuery } from "@tanstack/react-query";
import type { PostWithAuthor, TrendingTopic } from "@shared/schema";
import { CreatePost } from "@/components/create-post";
import { PostCard } from "@/components/post-card";
import { AdBanner } from "@/components/ad-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, TrendingUp, Tag } from "lucide-react";
import { useLocation } from "wouter";

function TrendingTopics() {
  const [, navigate] = useLocation();
  const { data: topics, isLoading } = useQuery<TrendingTopic[]>({
    queryKey: ["/api/trending"],
  });

  if (isLoading) return null;
  if (!topics || topics.length === 0) return null;

  return (
    <Card className="p-4 border border-border" data-testid="card-trending-topics">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Trending</h3>
      </div>
      <div className="space-y-2.5">
        {topics.slice(0, 5).map((topic, idx) => (
          <div
            key={topic.category}
            className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded-md p-1.5 -mx-1.5"
            onClick={() => navigate("/explore")}
            data-testid={`trending-topic-${idx}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-chart-2" />
                  <span className="text-sm font-semibold truncate">{topic.category}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{topic.postCount} curhat</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function FeedPage() {
  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feed"],
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <CreatePost />
      <TrendingTopics />

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
        <Card className="p-12 border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-base font-semibold mb-1">Belum ada curhat</p>
          <p className="text-sm text-muted-foreground">Jadilah yang pertama berbagi cerita!</p>
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
