import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Notification, User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Repeat2, UserPlus, Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type NotificationWithFrom = Notification & {
  fromUser?: Pick<User, "id" | "username" | "displayName" | "avatarUrl"> | null;
};

const iconMap: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  repost: Repeat2,
  follow: UserPlus,
};

const colorMap: Record<string, string> = {
  like: "text-red-500 bg-red-500/10",
  comment: "text-primary bg-primary/10",
  repost: "text-green-500 bg-green-500/10",
  follow: "text-blue-500 bg-blue-500/10",
};

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { data: notifications, isLoading } = useQuery<NotificationWithFrom[]>({
    queryKey: ["/api/notifications"],
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-base font-bold" data-testid="text-notifications-title">Notifikasi</h1>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">({unreadCount} belum dibaca)</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            className="gap-1.5"
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai dibaca
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-3.5 border border-border">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {notifications?.length === 0 && (
        <Card className="p-12 border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <p className="text-base font-semibold mb-1">Belum ada notifikasi</p>
          <p className="text-sm text-muted-foreground">Notifikasi akan muncul di sini saat ada aktivitas</p>
        </Card>
      )}

      <div className="space-y-2">
        {notifications?.map((notif) => {
          const Icon = iconMap[notif.type] || Bell;
          const colors = colorMap[notif.type] || "text-muted-foreground bg-muted";
          const [textColor, bgColor] = colors.split(" ");
          return (
            <Card
              key={notif.id}
              className={`p-3.5 border border-border hover-elevate cursor-pointer transition-colors ${!notif.isRead ? "bg-accent/30" : ""}`}
              onClick={() => {
                if (notif.postId) navigate(`/post/${notif.postId}`);
                else if (notif.fromUser) navigate(`/profile/${notif.fromUser.username}`);
              }}
              data-testid={`card-notification-${notif.id}`}
            >
              <div className="flex gap-3 items-start">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={notif.fromUser?.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                      {notif.fromUser?.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${bgColor} flex items-center justify-center ring-2 ring-background`}>
                    <Icon className={`w-2.5 h-2.5 ${textColor}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words leading-relaxed" data-testid={`text-notification-message-${notif.id}`}>{notif.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt!), { addSuffix: true, locale: idLocale })}
                  </p>
                </div>
                {!notif.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
