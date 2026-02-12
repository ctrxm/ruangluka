import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Lock, User, AtSign } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-chart-2/8 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-chart-3/5 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-sm mx-4 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/20">
            <img src="/images/logo.png" alt="Ruang Luka" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">Ruang Luka</h1>
          <p className="text-sm text-muted-foreground mt-3 text-center max-w-[280px] leading-relaxed">
            Tempat aman untuk berbagi cerita dan keluh kesahmu
          </p>
        </div>

        <Card className="p-6 border border-border backdrop-blur-sm">
          <div className="flex mb-6 gap-1 p-1 bg-muted/50 rounded-md">
            <button
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setIsLogin(true)}
              data-testid="button-tab-login"
            >
              Masuk
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${!isLogin ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setIsLogin(false)}
              data-testid="button-tab-register"
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  className="pl-10"
                  data-testid="input-email"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">Username</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="username_kamu"
                      value={form.username}
                      onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                      required
                      className="pl-10"
                      data-testid="input-username"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-medium text-muted-foreground">Nama Tampilan</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      placeholder="Nama Lengkap"
                      value={form.displayName}
                      onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
                      required
                      className="pl-10"
                      data-testid="input-display-name"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  className="pl-10 pr-10"
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

            <Button type="submit" className="w-full gap-2" disabled={loading} data-testid="button-auth-submit">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Masuk" : "Daftar Sekarang"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-6 leading-relaxed">
          Dengan masuk, kamu setuju dengan ketentuan layanan Ruang Luka
        </p>
      </div>
    </div>
  );
}
