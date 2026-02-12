import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation } from "wouter";
import type { UserProfile, PostWithAuthor } from "@shared/schema";
import { PostCard } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/profile/:username");
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const username = params?.username;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", username],
    enabled: !!username,
  });

  const { data: posts } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/users", username, "posts"],
    enabled: !!username,
  });

  const [editForm, setEditForm] = useState({ displayName: "", bio: "", username: "" });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${profile?.id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; username?: string }) =>
      apiRequest("PATCH", "/api/auth/profile", data),
    onSuccess: async (res) => {
      const updated = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditOpen(false);
      toast({ title: "Profil berhasil diperbarui" });
      if (updated.username && updated.username !== username) {
        navigate(`/profile/${updated.username}`);
      }
    },
    onError: (err: any) => {
      toast({ title: "Gagal memperbarui profil", description: err.message, variant: "destructive" });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/auth/avatar", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload gagal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
      toast({ title: "Foto profil berhasil diperbarui" });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
  };

  const openEdit = () => {
    if (profile) {
      setEditForm({ displayName: profile.displayName, bio: profile.bio || "", username: profile.username });
    }
    setEditOpen(true);
  };

  const isOwnProfile = currentUser?.username === username;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <Card className="p-6 border border-border">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2 w-full">
              <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-24 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-muted-foreground mb-4">Pengguna tidak ditemukan</p>
        <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <Card className="border border-border overflow-hidden" data-testid="card-profile">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/20 via-chart-2/10 to-primary/5" />
        <div className="px-5 pb-5 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
            <div className="relative flex-shrink-0 mx-auto sm:mx-0">
              <Avatar className="w-24 h-24 ring-4 ring-background">
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{profile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <button
                    className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-change-avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar-file"
                  />
                </>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h2 className="text-lg font-bold" data-testid="text-profile-name">{profile.displayName}</h2>
                {profile.isVerified && <VerifiedBadge className="w-5 h-5" />}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-username">@{profile.username}</p>
            </div>
            <div className="flex justify-center sm:justify-end">
              {isOwnProfile ? (
                <Button variant="outline" size="sm" onClick={openEdit} data-testid="button-edit-profile">
                  Edit Profil
                </Button>
              ) : currentUser ? (
                <Button
                  size="sm"
                  variant={profile.isFollowing ? "outline" : "default"}
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  data-testid="button-follow"
                >
                  {followMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (profile.isFollowing ? "Berhenti Ikuti" : "Ikuti")}
                </Button>
              ) : null}
            </div>
          </div>

          {profile.bio && <p className="text-sm mt-4 break-words leading-relaxed" data-testid="text-profile-bio">{profile.bio}</p>}

          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground justify-center sm:justify-start">
            <Calendar className="w-3 h-3" />
            <span>Bergabung {format(new Date(profile.createdAt!), "MMMM yyyy", { locale: idLocale })}</span>
          </div>

          <div className="flex gap-5 mt-4 justify-center sm:justify-start flex-wrap">
            <span className="text-sm">
              <strong className="font-bold">{profile.followingCount}</strong>{" "}
              <span className="text-muted-foreground text-xs">Mengikuti</span>
            </span>
            <span className="text-sm">
              <strong className="font-bold">{profile.followersCount}</strong>{" "}
              <span className="text-muted-foreground text-xs">Pengikut</span>
            </span>
            <span className="text-sm">
              <strong className="font-bold">{profile.postsCount}</strong>{" "}
              <span className="text-muted-foreground text-xs">Postingan</span>
            </span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {posts?.map((post) => <PostCard key={post.id} post={post} />)}
        {posts?.length === 0 && (
          <Card className="p-10 border border-border text-center">
            <p className="text-sm text-muted-foreground">Belum ada postingan</p>
          </Card>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nama Tampilan</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm(p => ({ ...p, displayName: e.target.value }))}
                data-testid="input-edit-displayname"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Username</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm(p => ({ ...p, username: e.target.value }))}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(p => ({ ...p, bio: e.target.value }))}
                className="resize-none"
                data-testid="input-edit-bio"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateProfileMutation.mutate(editForm)}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
