import { useQuery } from "@tanstack/react-query";
import type { PostWithAuthor } from "@shared/schema";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark } from "lucide-react";

export default function BookmarksPage() {
  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/bookmarks"],
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4" data-testid="text-bookmarks-title">Tersimpan</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-md" />)}
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Belum ada postingan tersimpan</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Simpan curhat yang menyentuh hatimu untuk dibaca lagi nanti</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
