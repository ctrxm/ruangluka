import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, UserCircle, Loader2, EyeOff, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { POST_CATEGORIES } from "@shared/schema";

export function CreatePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: { content: string; isAnonymous: boolean; category?: string }) =>
      apiRequest("POST", "/api/posts", data),
    onSuccess: () => {
      setContent("");
      setIsAnonymous(false);
      setCategory("");
      setIsFocused(false);
      setShowCategories(false);
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trending"] });
      toast({ title: "Curhat berhasil diposting!" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal posting", description: err.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  return (
    <Card className="p-4 border border-border" data-testid="card-create-post">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {isAnonymous ? (
            <AvatarFallback className="bg-muted">
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <Textarea
            placeholder="Apa yang ingin kamu ceritakan? Luapkan di sini..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="resize-none border-0 text-sm focus-visible:ring-0 min-h-[60px]"
            data-testid="input-post-content"
          />

          {category && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs gap-1" data-testid="badge-selected-category">
                <Tag className="w-3 h-3" />
                {category}
                <button
                  onClick={() => setCategory("")}
                  className="ml-1 text-muted-foreground"
                  data-testid="button-remove-category"
                >
                  x
                </button>
              </Badge>
            </div>
          )}

          {showCategories && !category && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POST_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    setCategory(cat);
                    setShowCategories(false);
                  }}
                  data-testid={`badge-category-${cat}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {(isFocused || content) && (
            <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    data-testid="switch-anonymous"
                  />
                  <Label htmlFor="anonymous" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                    <EyeOff className="w-3 h-3" />
                    Anonim
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategories(!showCategories)}
                  className="gap-1.5 text-muted-foreground"
                  data-testid="button-toggle-categories"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span className="text-xs">Kategori</span>
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => mutation.mutate({ content, isAnonymous, category: category || undefined })}
                disabled={!content.trim() || mutation.isPending}
                className="gap-1.5"
                data-testid="button-submit-post"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Curhat
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
