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
import { Camera, ArrowLeft, Calendar } from "lucide-react";
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
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-6 border border-border">
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Pengguna tidak ditemukan</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      <Card className="p-6 border border-border" data-testid="card-profile">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-muted">{profile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <button
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold" data-testid="text-profile-name">{profile.displayName}</h2>
              {profile.isVerified && <VerifiedBadge className="w-5 h-5" />}
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-profile-username">@{profile.username}</p>
            {profile.bio && <p className="text-sm mt-2 break-words" data-testid="text-profile-bio">{profile.bio}</p>}
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Bergabung {format(new Date(profile.createdAt!), "MMMM yyyy", { locale: idLocale })}</span>
            </div>
            <div className="flex gap-4 mt-3">
              <span className="text-sm">
                <strong>{profile.followingCount}</strong> <span className="text-muted-foreground text-xs">Mengikuti</span>
              </span>
              <span className="text-sm">
                <strong>{profile.followersCount}</strong> <span className="text-muted-foreground text-xs">Pengikut</span>
              </span>
              <span className="text-sm">
                <strong>{profile.postsCount}</strong> <span className="text-muted-foreground text-xs">Postingan</span>
              </span>
            </div>
            <div className="mt-3">
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
                  {profile.isFollowing ? "Berhenti Ikuti" : "Ikuti"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {posts?.map((post) => <PostCard key={post.id} post={post} />)}
        {posts?.length === 0 && (
          <Card className="p-8 border border-border text-center">
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
            <div className="space-y-2">
              <Label className="text-xs">Nama Tampilan</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm(p => ({ ...p, displayName: e.target.value }))}
                data-testid="input-edit-displayname"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Username</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm(p => ({ ...p, username: e.target.value }))}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bio</Label>
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
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
