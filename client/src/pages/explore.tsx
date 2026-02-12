import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PostWithAuthor, User } from "@shared/schema";
import { PostCard } from "@/components/post-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function ExplorePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const { data: posts, isLoading: postsLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts", "explore"],
  });

  const { data: searchResults } = useQuery<{ users: User[]; posts: PostWithAuthor[] }>({
    queryKey: ["/api/search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
  });

  const showSearch = debouncedSearch.length >= 2;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari orang atau curhat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {showSearch && searchResults && (
        <div className="space-y-5">
          {searchResults.users.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Pengguna</h3>
              <div className="space-y-2">
                {searchResults.users.map((u) => (
                  <Card
                    key={u.id}
                    className="p-3 border border-border hover-elevate cursor-pointer"
                    onClick={() => navigate(`/profile/${u.username}`)}
                    data-testid={`card-search-user-${u.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatarUrl || undefined} />
                        <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">{u.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold truncate">{u.displayName}</span>
                          {u.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {searchResults.posts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Curhat</h3>
              <div className="space-y-3">
                {searchResults.posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
          {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
            <Card className="p-10 border border-border text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium mb-1">Tidak ditemukan</p>
              <p className="text-xs text-muted-foreground">Coba kata kunci lain untuk "{debouncedSearch}"</p>
            </Card>
          )}
        </div>
      )}

      {!showSearch && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-bold">Curhat Terbaru</h2>
          </div>
          {postsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4 border border-border">
                  <div className="flex gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {posts?.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
