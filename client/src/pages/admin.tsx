import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { User, Ad, SiteSetting } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerifiedBadge } from "@/components/verified-badge";
import { Shield, Users, Megaphone, Settings, Plus, Trash2, ShieldCheck, ShieldOff, ArrowLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function UserManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

  const filteredUsers = users?.filter(u =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleVerifyMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", `/api/admin/users/${userId}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Status verifikasi diperbarui" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", `/api/admin/users/${userId}/admin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Status admin diperbarui" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Pengguna dihapus" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold">Manajemen Pengguna ({users?.length || 0})</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari pengguna..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      <div className="space-y-2">
        {filteredUsers?.map((u) => (
          <Card key={u.id} className="p-3.5 border border-border" data-testid={`card-user-${u.id}`}>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={u.avatarUrl || undefined} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">{u.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold truncate">{u.displayName}</span>
                  {u.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                  {u.isAdmin && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{u.email}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleVerifyMutation.mutate(u.id)}
                  title={u.isVerified ? "Cabut Verifikasi" : "Verifikasi"}
                  data-testid={`button-verify-${u.id}`}
                >
                  {u.isVerified ? <ShieldOff className="w-4 h-4 text-muted-foreground" /> : <ShieldCheck className="w-4 h-4 text-primary" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleAdminMutation.mutate(u.id)}
                  title={u.isAdmin ? "Cabut Admin" : "Jadikan Admin"}
                  data-testid={`button-admin-${u.id}`}
                >
                  <Shield className={`w-4 h-4 ${u.isAdmin ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteUserMutation.mutate(u.id)}
                  data-testid={`button-delete-user-${u.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdsManagement() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [adForm, setAdForm] = useState({ type: "text", title: "", content: "", imageUrl: "", linkUrl: "", isActive: true });

  const { data: ads } = useQuery<Ad[]>({ queryKey: ["/api/admin/ads"] });

  const createAdMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/ads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      setShowCreate(false);
      setAdForm({ type: "text", title: "", content: "", imageUrl: "", linkUrl: "", isActive: true });
      toast({ title: "Iklan berhasil dibuat" });
    },
  });

  const toggleAdMutation = useMutation({
    mutationFn: (adId: number) => apiRequest("POST", `/api/admin/ads/${adId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ads/active"] });
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: (adId: number) => apiRequest("DELETE", `/api/admin/ads/${adId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      toast({ title: "Iklan dihapus" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold">Manajemen Iklan ({ads?.length || 0})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5" data-testid="button-create-ad">
          <Plus className="w-3.5 h-3.5" /> Tambah Iklan
        </Button>
      </div>

      <div className="space-y-2">
        {ads?.map((ad) => (
          <Card key={ad.id} className="p-3.5 border border-border" data-testid={`card-ad-${ad.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{ad.title}</span>
                  <Badge variant={ad.isActive ? "default" : "secondary"} className="text-[10px]">
                    {ad.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{ad.type}</Badge>
                </div>
                {ad.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.content}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={() => toggleAdMutation.mutate(ad.id)} data-testid={`button-toggle-ad-${ad.id}`}>
                  <Switch checked={ad.isActive ?? false} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteAdMutation.mutate(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {ads?.length === 0 && (
          <Card className="p-8 border border-border text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada iklan</p>
          </Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Iklan Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Tipe</Label>
              <Select value={adForm.type} onValueChange={(v) => setAdForm(p => ({ ...p, type: v }))}>
                <SelectTrigger data-testid="select-ad-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Teks</SelectItem>
                  <SelectItem value="image">Gambar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Judul</Label>
              <Input value={adForm.title} onChange={(e) => setAdForm(p => ({ ...p, title: e.target.value }))} data-testid="input-ad-title" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Konten</Label>
              <Textarea value={adForm.content} onChange={(e) => setAdForm(p => ({ ...p, content: e.target.value }))} className="resize-none" data-testid="input-ad-content" />
            </div>
            {adForm.type === "image" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">URL Gambar</Label>
                <Input value={adForm.imageUrl} onChange={(e) => setAdForm(p => ({ ...p, imageUrl: e.target.value }))} data-testid="input-ad-image" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">URL Link</Label>
              <Input value={adForm.linkUrl} onChange={(e) => setAdForm(p => ({ ...p, linkUrl: e.target.value }))} data-testid="input-ad-link" />
            </div>
            <Button
              className="w-full"
              onClick={() => createAdMutation.mutate(adForm)}
              disabled={!adForm.title || createAdMutation.isPending}
              data-testid="button-submit-ad"
            >
              Buat Iklan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SiteSettingsPanel() {
  const { toast } = useToast();
  const { data: settings } = useQuery<SiteSetting[]>({ queryKey: ["/api/admin/settings"] });

  const maintenanceMode = settings?.find(s => s.key === "maintenance_mode")?.value === "true";
  const siteDescription = settings?.find(s => s.key === "site_description")?.value || "";

  const updateSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) => apiRequest("POST", "/api/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Pengaturan berhasil disimpan" });
    },
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold">Pengaturan Situs</h3>

      <Card className="p-4 border border-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Mode Maintenance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nonaktifkan situs sementara untuk perawatan</p>
          </div>
          <Switch
            checked={maintenanceMode}
            onCheckedChange={(v) => updateSettingMutation.mutate({ key: "maintenance_mode", value: String(v) })}
            data-testid="switch-maintenance"
          />
        </div>
      </Card>

      <Card className="p-4 border border-border space-y-3">
        <div>
          <p className="text-sm font-semibold">Deskripsi Situs</p>
          <p className="text-xs text-muted-foreground mt-0.5">Deskripsi singkat yang muncul di halaman utama</p>
        </div>
        <Textarea
          defaultValue={siteDescription}
          onBlur={(e) => updateSettingMutation.mutate({ key: "site_description", value: e.target.value })}
          className="resize-none"
          placeholder="Deskripsi singkat tentang situs..."
          data-testid="input-site-description"
        />
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user?.isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold mb-1">Akses Ditolak</p>
        <p className="text-sm text-muted-foreground mb-4">Halaman ini hanya untuk admin.</p>
        <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <h1 className="text-lg font-bold" data-testid="text-admin-title">Panel Admin</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full justify-start mb-5 flex-wrap gap-1">
          <TabsTrigger value="users" className="gap-1.5" data-testid="tab-admin-users">
            <Users className="w-3.5 h-3.5" /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5" data-testid="tab-admin-ads">
            <Megaphone className="w-3.5 h-3.5" /> Iklan
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5" data-testid="tab-admin-settings">
            <Settings className="w-3.5 h-3.5" /> Pengaturan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="ads"><AdsManagement /></TabsContent>
        <TabsContent value="settings"><SiteSettingsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
