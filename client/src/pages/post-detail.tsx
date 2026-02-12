import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { PostWithAuthor } from "@shared/schema";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PostDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/post/:id");
  const postId = params?.id;

  const { data: post, isLoading } = useQuery<PostWithAuthor>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 border border-border">
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Postingan tidak ditemukan</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
      </Button>
      <PostCard post={post} showFullComments />
    </div>
  );
}
