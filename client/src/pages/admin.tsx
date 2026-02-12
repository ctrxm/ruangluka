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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerifiedBadge } from "@/components/verified-badge";
import { Shield, Users, Megaphone, Settings, Plus, Trash2, ShieldCheck, ShieldOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function UserManagement() {
  const { toast } = useToast();
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });

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
      <h3 className="text-sm font-semibold">Manajemen Pengguna ({users?.length || 0})</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">{u.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{u.displayName}</span>
                        {u.isVerified && <VerifiedBadge className="w-3 h-3" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">@{u.username}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs hidden sm:table-cell">{u.email}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.isAdmin && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                    {u.isVerified && <Badge variant="secondary" className="text-[10px]">Verified</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleVerifyMutation.mutate(u.id)}
                      title={u.isVerified ? "Cabut Verifikasi" : "Verifikasi"}
                      data-testid={`button-verify-${u.id}`}
                    >
                      {u.isVerified ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleAdminMutation.mutate(u.id)}
                      title={u.isAdmin ? "Cabut Admin" : "Jadikan Admin"}
                      data-testid={`button-admin-${u.id}`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteUserMutation.mutate(u.id)}
                      data-testid={`button-delete-user-${u.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Manajemen Iklan ({ads?.length || 0})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="button-create-ad">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Iklan
        </Button>
      </div>

      <div className="space-y-3">
        {ads?.map((ad) => (
          <Card key={ad.id} className="p-3 border border-border" data-testid={`card-ad-${ad.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{ad.title}</span>
                  <Badge variant={ad.isActive ? "default" : "secondary"} className="text-[10px]">
                    {ad.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{ad.type}</Badge>
                </div>
                {ad.content && <p className="text-xs text-muted-foreground mt-1 truncate">{ad.content}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => toggleAdMutation.mutate(ad.id)} data-testid={`button-toggle-ad-${ad.id}`}>
                  <Switch checked={ad.isActive ?? false} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteAdMutation.mutate(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Iklan Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Tipe</Label>
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
              <Label className="text-xs">Judul</Label>
              <Input value={adForm.title} onChange={(e) => setAdForm(p => ({ ...p, title: e.target.value }))} data-testid="input-ad-title" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Konten</Label>
              <Textarea value={adForm.content} onChange={(e) => setAdForm(p => ({ ...p, content: e.target.value }))} className="resize-none" data-testid="input-ad-content" />
            </div>
            {adForm.type === "image" && (
              <div className="space-y-2">
                <Label className="text-xs">URL Gambar</Label>
                <Input value={adForm.imageUrl} onChange={(e) => setAdForm(p => ({ ...p, imageUrl: e.target.value }))} data-testid="input-ad-image" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">URL Link</Label>
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
    <div className="space-y-6">
      <h3 className="text-sm font-semibold">Pengaturan Situs</h3>

      <Card className="p-4 border border-border space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Mode Maintenance</p>
            <p className="text-xs text-muted-foreground">Nonaktifkan situs sementara untuk perawatan</p>
          </div>
          <Switch
            checked={maintenanceMode}
            onCheckedChange={(v) => updateSettingMutation.mutate({ key: "maintenance_mode", value: String(v) })}
            data-testid="switch-maintenance"
          />
        </div>
      </Card>

      <Card className="p-4 border border-border space-y-3">
        <Label className="text-xs">Deskripsi Situs</Label>
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
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Akses ditolak. Halaman ini hanya untuk admin.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold" data-testid="text-admin-title">Panel Admin</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full justify-start mb-4 flex-wrap gap-1">
          <TabsTrigger value="users" data-testid="tab-admin-users">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-admin-ads">
            <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Iklan
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-admin-settings">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Pengaturan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="ads"><AdsManagement /></TabsContent>
        <TabsContent value="settings"><SiteSettingsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
