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
  like: "text-red-500",
  comment: "text-primary",
  repost: "text-green-500",
  follow: "text-blue-500",
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
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" data-testid="text-notifications-title">Notifikasi</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-3 border border-border">
              <div className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
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
        <Card className="p-8 border border-border text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
        </Card>
      )}

      <div className="space-y-2">
        {notifications?.map((notif) => {
          const Icon = iconMap[notif.type] || Bell;
          const color = colorMap[notif.type] || "text-muted-foreground";
          return (
            <Card
              key={notif.id}
              className={`p-3 border border-border hover-elevate cursor-pointer ${!notif.isRead ? "bg-accent/30" : ""}`}
              onClick={() => {
                if (notif.postId) navigate(`/post/${notif.postId}`);
                else if (notif.fromUser) navigate(`/profile/${notif.fromUser.username}`);
              }}
              data-testid={`card-notification-${notif.id}`}
            >
              <div className="flex gap-3 items-start">
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={notif.fromUser?.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {notif.fromUser?.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${color}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words" data-testid={`text-notification-message-${notif.id}`}>{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.createdAt!), { addSuffix: true, locale: idLocale })}
                  </p>
                </div>
                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
