import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { PostWithAuthor, CommentWithAuthor, ReactionType } from "@shared/schema";
import { REACTION_LABELS } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { VerifiedBadge } from "./verified-badge";
import { Heart, MessageCircle, Repeat2, Send, UserCircle, MoreHorizontal, Trash2, Loader2, Bookmark, BookmarkCheck, Flag, Tag, HandHeart, Flame, Frown, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const REACTION_ICONS: Record<ReactionType, typeof HandHeart> = {
  peluk: HandHeart,
  semangat: Flame,
  ikut_sedih: Frown,
  bangga: Trophy,
};

function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex gap-2.5 py-2.5" data-testid={`comment-item-${comment.id}`}>
      <Avatar className="w-7 h-7 flex-shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${comment.author.username}`)}>
        <AvatarImage src={comment.author.avatarUrl || undefined} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
          {comment.author.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 bg-muted/40 rounded-md px-3 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
        <p className="text-sm text-foreground/90 mt-0.5 break-words leading-relaxed" data-testid={`text-comment-content-${comment.id}`}>{comment.content}</p>
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
  const [showReactions, setShowReactions] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");

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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
  };

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/like`),
    onSuccess: invalidateAll,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => apiRequest("POST", `/api/posts/${post.id}/comments`, { content, postId: post.id }),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "comments"] });
      invalidateAll();
    },
  });

  const repostMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/repost`),
    onSuccess: () => {
      setShowRepostConfirm(false);
      invalidateAll();
      toast({ title: "Berhasil di-repost!" });
    },
    onError: (err: any) => {
      toast({ title: "Gagal repost", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/posts/${post.id}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Postingan dihapus" });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: (type: ReactionType) => apiRequest("POST", `/api/posts/${post.id}/react`, { type }),
    onSuccess: () => {
      setShowReactions(false);
      invalidateAll();
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/posts/${post.id}/bookmark`),
    onSuccess: invalidateAll,
  });

  const reportMutation = useMutation({
    mutationFn: (reason: string) => apiRequest("POST", `/api/posts/${post.id}/report`, { reason }),
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason("");
      toast({ title: "Laporan terkirim", description: "Terima kasih, kami akan meninjau laporan kamu." });
    },
    onError: (err: any) => {
      toast({ title: "Gagal melapor", description: err.message, variant: "destructive" });
    },
  });

  const handleComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
  };

  const displayPost = post.originalPost || post;
  const isRepost = !!post.originalPostId;
  const totalReactions = post.reactionsCount ? Object.values(post.reactionsCount).reduce((a, b) => a + b, 0) : 0;

  return (
    <Card className="p-4 border border-border transition-colors hover-elevate" data-testid={`card-post-${post.id}`}>
      {isRepost && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 pl-1">
          <Repeat2 className="w-3.5 h-3.5 text-green-500" />
          <span className="font-medium">{post.author?.displayName || "Seseorang"} me-repost</span>
        </div>
      )}

      <div className="flex gap-3">
        <Avatar
          className={`w-10 h-10 flex-shrink-0 ${!isAnonymous ? "cursor-pointer" : ""}`}
          onClick={() => !isAnonymous && navigate(`/profile/${isRepost ? displayPost.author?.username : authorUsername}`)}
        >
          <AvatarImage src={isRepost ? displayPost.author?.avatarUrl || undefined : authorAvatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {isAnonymous && !isRepost ? (
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            ) : (
              (isRepost ? displayPost.author?.displayName?.charAt(0) : authorInitial) || "U"
            )}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={`text-sm font-bold truncate ${!isAnonymous ? "cursor-pointer hover:underline" : ""}`}
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
              <span className="text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(displayPost.createdAt!), { addSuffix: true, locale: idLocale })}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" data-testid={`button-post-menu-${post.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user && (
                  <DropdownMenuItem
                    onClick={() => bookmarkMutation.mutate()}
                    data-testid={`button-bookmark-menu-${post.id}`}
                  >
                    {post.isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 mr-2" /> : <Bookmark className="w-3.5 h-3.5 mr-2" />}
                    {post.isBookmarked ? "Hapus Simpanan" : "Simpan"}
                  </DropdownMenuItem>
                )}
                {user && user.id !== post.userId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowReportDialog(true)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-report-${post.id}`}
                    >
                      <Flag className="w-3.5 h-3.5 mr-2" />
                      Laporkan
                    </DropdownMenuItem>
                  </>
                )}
                {user && (user.id === post.userId || user.isAdmin) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate()}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {(isRepost ? displayPost.category : post.category) && (
            <div className="mt-1.5">
              <Badge variant="secondary" className="text-[10px] gap-1" data-testid={`badge-post-category-${post.id}`}>
                <Tag className="w-2.5 h-2.5" />
                {isRepost ? displayPost.category : post.category}
              </Badge>
            </div>
          )}

          <p
            className="text-sm mt-2 whitespace-pre-wrap break-words leading-relaxed cursor-pointer"
            onClick={() => navigate(`/post/${post.id}`)}
            data-testid={`text-post-content-${post.id}`}
          >
            {isRepost ? displayPost.content : post.content}
          </p>

          <div className="flex items-center gap-1 mt-3 pt-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 ${post.isLiked ? "text-red-500" : "text-muted-foreground"}`}
              onClick={() => user && likeMutation.mutate()}
              disabled={!user}
              data-testid={`button-like-${post.id}`}
            >
              <Heart className={`w-4 h-4 transition-transform ${post.isLiked ? "fill-red-500 scale-110" : ""}`} />
              <span className="text-xs font-medium">{post.likesCount}</span>
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 ${post.userReaction ? "text-chart-2" : "text-muted-foreground"}`}
                onClick={() => user && setShowReactions(!showReactions)}
                disabled={!user}
                data-testid={`button-reaction-toggle-${post.id}`}
              >
                {post.userReaction ? (
                  (() => {
                    const Icon = REACTION_ICONS[post.userReaction];
                    return <Icon className="w-4 h-4" />;
                  })()
                ) : (
                  <HandHeart className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">{totalReactions}</span>
              </Button>

              {showReactions && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 rounded-md bg-popover border border-border shadow-md z-50">
                  {(Object.keys(REACTION_ICONS) as ReactionType[]).map((type) => {
                    const Icon = REACTION_ICONS[type];
                    const isActive = post.userReaction === type;
                    return (
                      <Button
                        key={type}
                        size="icon"
                        variant={isActive ? "default" : "ghost"}
                        onClick={() => reactionMutation.mutate(type)}
                        title={REACTION_LABELS[type]}
                        data-testid={`button-react-${type}-${post.id}`}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setShowComments(!showComments)}
              data-testid={`button-comment-toggle-${post.id}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{post.commentsCount}</span>
            </Button>

            {!isRepost && (
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 ${post.isReposted ? "text-green-500" : "text-muted-foreground"}`}
                onClick={() => user && setShowRepostConfirm(true)}
                disabled={!user}
                data-testid={`button-repost-${post.id}`}
              >
                <Repeat2 className={`w-4 h-4 ${post.isReposted ? "text-green-500" : ""}`} />
                <span className="text-xs font-medium">{post.repostsCount}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 ml-auto ${post.isBookmarked ? "text-chart-4" : "text-muted-foreground"}`}
              onClick={() => user && bookmarkMutation.mutate()}
              disabled={!user}
              data-testid={`button-bookmark-${post.id}`}
            >
              {post.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          </div>

          {showRepostConfirm && (
            <div className="mt-3 p-3 rounded-md bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Repost curhat ini ke timeline kamu?</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => repostMutation.mutate()} disabled={repostMutation.isPending} data-testid={`button-confirm-repost-${post.id}`}>
                  {repostMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ya, Repost"}
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
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Tulis komentar..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="resize-none text-sm min-h-[50px] flex-1"
                      data-testid={`input-comment-${post.id}`}
                    />
                    <Button
                      size="icon"
                      onClick={handleComment}
                      disabled={!commentText.trim() || commentMutation.isPending}
                      data-testid={`button-send-comment-${post.id}`}
                    >
                      {commentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-0.5">
                {comments?.map((c) => <CommentItem key={c.id} comment={c} />)}
                {comments?.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">Belum ada komentar.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan Postingan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Jelaskan alasan kamu melaporkan postingan ini:</p>
            <Textarea
              placeholder="Alasan pelaporan..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-report-reason"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowReportDialog(false)} data-testid="button-cancel-report">
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => reportMutation.mutate(reportReason)}
                disabled={!reportReason.trim() || reportMutation.isPending}
                data-testid="button-submit-report"
              >
                {reportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim Laporan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
