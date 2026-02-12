import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate("/");
    } catch (err: any) {
      toast({ title: isLogin ? "Gagal masuk" : "Gagal daftar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/images/logo.png" alt="Ruang Luka" className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Ruang Luka</h1>
          <p className="text-sm text-muted-foreground mt-1">Tempat berbagi cerita dan keluh kesahmu</p>
        </div>

        <Card className="p-6 border border-border">
          <div className="flex mb-6 border-b border-border">
            <button
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${isLogin ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => setIsLogin(true)}
              data-testid="button-tab-login"
            >
              Masuk
            </button>
            <button
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${!isLogin ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => setIsLogin(false)}
              data-testid="button-tab-register"
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                required
                data-testid="input-email"
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input
                    id="username"
                    placeholder="username_kamu"
                    value={form.username}
                    onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-xs">Nama Tampilan</Label>
                  <Input
                    id="displayName"
                    placeholder="Nama Lengkap"
                    value={form.displayName}
                    onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
                    required
                    data-testid="input-display-name"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-auth-submit">
              {loading ? "Memproses..." : (isLogin ? "Masuk" : "Daftar")}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Dengan masuk, kamu setuju dengan ketentuan layanan Ruang Luka
        </p>
      </div>
    </div>
  );
}
