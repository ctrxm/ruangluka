import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { PostWithAuthor } from "@shared/schema";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageCircle } from "lucide-react";

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
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
        </Button>
        <Card className="p-4 border border-border">
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold mb-1">Postingan tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mb-4">Mungkin sudah dihapus atau tidak tersedia</p>
        <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
      </Button>
      <PostCard post={post} showFullComments />
    </div>
  );
}
