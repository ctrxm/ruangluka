import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { PostWithAuthor, CommentWithAuthor } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "./verified-badge";
import { Heart, MessageCircle, Repeat2, Send, UserCircle, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex gap-2 py-2" data-testid={`comment-item-${comment.id}`}>
      <Avatar className="w-7 h-7 cursor-pointer" onClick={() => navigate(`/profile/${comment.author.username}`)}>
        <AvatarImage src={comment.author.avatarUrl || undefined} />
        <AvatarFallback className="text-[10px] bg-muted">
          {comment.author.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className="text-xs font-semibold cursor-pointer hover:underline"
            onClick={() => navigate(`/profile/${comment.author.username}`)}
            data-testid={`text-comment-author-${comment.id}`}
          >
            {comment.author.displayName}
          </span>
          {comment.author.isVerified && <VerifiedBadge className="w-3 h-3" />}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt!), { addSuffix: true, locale: idLocale })}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 break-words" data-testid={`text-comment-content-${comment.id}`}>{comment.content}</p>
      </div>
    </div>
  );
}

export function PostCard({ post, showFullComments = false }: { post: PostWithAuthor; showFullComments?: boolean }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(showFullComments);
  const [commentText, setCommentText] = useState("");
  const [showRepostConfirm, setShowRepostConfirm] = useState(false);

  const isAnonymous = post.isAnonymous;
  const authorName = isAnonymous ? "Anonim" : post.author?.displayName || "Unknown";
  const authorUsername = isAnonymous ? "anonim" : post.author?.username || "unknown";
  const authorAvatar = isAnonymous ? undefined : post.author?.avatarUrl || undefined;
  const authorInitial = isAnonymous ? "?" : (post.author?.displayName?.charAt(0) || "U").toUpperCase();
  const isVerified = !isAnonymous && post.author?.isVerified;

  const { data: comments } = useQuery<CommentWithAuthor[]>({
    queryKey: ["/api/posts", post.id, "comments"],
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/posts/${post.id}/comments`, { content, postId: post.id }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/repost`),
    onSuccess: () => {
      setShowRepostConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Berhasil di-repost!" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal repost", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/posts/${post.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      toast({ title: "Postingan dihapus" });
    },
  });

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  const displayPost = post.originalPost || post;
  const isRepost = !!post.originalPostId;

  return (
    <Card className="p-4 border border-border" data-testid={`card-post-${post.id}`}>
      {isRepost && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 pl-1">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>
            {post.author?.displayName || "Seseorang"} me-repost
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar
          className={`w-10 h-10 ${!isAnonymous ? "cursor-pointer" : ""}`}
          onClick={() => !isAnonymous && navigate(`/profile/${isRepost ? displayPost.author?.username : authorUsername}`)}
        >
          <AvatarImage src={isRepost ? displayPost.author?.avatarUrl || undefined : authorAvatar} />
          <AvatarFallback className="bg-muted text-sm">
            {isAnonymous && !isRepost ? (
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            ) : (
              (isRepost ? displayPost.author?.displayName?.charAt(0) : authorInitial) || "U"
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={`text-sm font-semibold truncate ${!isAnonymous ? "cursor-pointer hover:underline" : ""}`}
                onClick={() => {
                  if (isRepost && displayPost.author) navigate(`/profile/${displayPost.author.username}`);
                  else if (!isAnonymous) navigate(`/profile/${authorUsername}`);
                }}
                data-testid={`text-post-author-${post.id}`}
              >
                {isRepost ? (displayPost.isAnonymous ? "Anonim" : displayPost.author?.displayName || "Unknown") : authorName}
              </span>
              {(isRepost ? !displayPost.isAnonymous && displayPost.author?.isVerified : isVerified) && <VerifiedBadge />}
              <span className="text-xs text-muted-foreground">
                @{isRepost ? (displayPost.isAnonymous ? "anonim" : displayPost.author?.username || "unknown") : authorUsername}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(displayPost.createdAt!), { addSuffix: true, locale: idLocale })}
              </span>
            </div>
            {user && (user.id === post.userId || user.isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-post-menu-${post.id}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => deleteMutation.mutate()} data-testid={`button-delete-post-${post.id}`}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm mt-1.5 whitespace-pre-wrap break-words leading-relaxed" data-testid={`text-post-content-${post.id}`}>
            {isRepost ? displayPost.content : post.content}
          </p>

          <div className="flex items-center gap-4 mt-3">
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
              onClick={() => user && likeMutation.mutate()}
              disabled={!user}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`w-4 h-4 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{post.likesCount}</span>
            </button>

            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setShowComments(!showComments)}
              data-testid={`button-comment-toggle-${post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount}</span>
            </button>

            {!isRepost && (
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-500 transition-colors"
                onClick={() => user && setShowRepostConfirm(true)}
                disabled={!user}
                data-testid={`button-repost-${post.id}`}
              >
                <Repeat2 className={`w-4 h-4 ${post.isReposted ? "text-green-500" : ""}`} />
                <span>{post.repostsCount}</span>
              </button>
            )}
          </div>

          {showRepostConfirm && (
            <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Repost curhat ini ke timeline kamu?</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => repostMutation.mutate()} disabled={repostMutation.isPending} data-testid={`button-confirm-repost-${post.id}`}>
                  Ya, Repost
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRepostConfirm(false)} data-testid={`button-cancel-repost-${post.id}`}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {showComments && (
            <div className="mt-3 border-t border-border pt-3">
              {user && (
                <div className="flex gap-2 mb-3">
                  <Textarea
                    placeholder="Tulis komentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="resize-none text-sm min-h-[60px]"
                    data-testid={`input-comment-${post.id}`}
                  />
                  <Button
                    size="icon"
                    onClick={handleComment}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    data-testid={`button-send-comment-${post.id}`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-1">
                {comments?.map((c) => <CommentItem key={c.id} comment={c} />)}
                {comments?.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">Belum ada komentar.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
