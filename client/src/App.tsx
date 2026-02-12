import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { WebSocketProvider, useWebSocket } from "@/lib/websocket";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Search, Bell, Shield, User, LogOut, Loader2, Compass } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import FeedPage from "@/pages/feed";
import ProfilePage from "@/pages/profile";
import NotificationsPage from "@/pages/notifications";
import ExplorePage from "@/pages/explore";
import AdminPage from "@/pages/admin";
import PostDetailPage from "@/pages/post-detail";

function MobileNav() {
  const [location, navigate] = useLocation();
  const { unreadCount } = useWebSocket();

  const items = [
    { icon: Home, path: "/", label: "Beranda" },
    { icon: Compass, path: "/explore", label: "Jelajahi" },
    { icon: Bell, path: "/notifications", label: "Notifikasi", badge: unreadCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-50 sm:hidden" data-testid="nav-mobile">
      <div className="flex items-center justify-around gap-2 h-14">
        {items.map(({ icon: Icon, path, label, badge }) => {
          const isActive = location === path;
          return (
            <button
              key={path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => navigate(path)}
              data-testid={`button-nav-${label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge ? (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-medium">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { unreadCount } = useWebSocket();

  if (!user) return null;

  return (
    <header className="sticky top-0 bg-background/80 backdrop-blur-xl border-b border-border z-50" data-testid="header">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 h-14">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")} data-testid="link-logo">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <img src="/images/logo.png" alt="Ruang Luka" className="w-5 h-5" />
          </div>
          <span className="font-bold text-base hidden sm:inline gradient-text">Ruang Luka</span>
        </div>

        <nav className="hidden sm:flex items-center gap-1 flex-wrap" data-testid="nav-desktop">
          {[
            { icon: Home, path: "/", label: "Beranda" },
            { icon: Compass, path: "/explore", label: "Jelajahi" },
            { icon: Bell, path: "/notifications", label: "Notifikasi", badge: unreadCount },
          ].map(({ icon: Icon, path, label, badge }) => {
            const isActive = location === path;
            return (
              <Button
                key={path}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(path)}
                className="relative gap-1.5"
                data-testid={`button-desktop-nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs">{label}</span>
                {badge ? (
                  <Badge variant="destructive" className="ml-0.5 text-[9px] px-1 min-w-0 h-4">
                    {badge > 9 ? "9+" : badge}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 flex-wrap">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)} data-testid="menu-item-profile">
                <User className="w-3.5 h-3.5 mr-2" /> Profil Saya
              </DropdownMenuItem>
              {user.isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-item-admin">
                  <Shield className="w-3.5 h-3.5 mr-2" /> Panel Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="menu-item-logout">
                <LogOut className="w-3.5 h-3.5 mr-2" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <img src="/images/logo.png" alt="Ruang Luka" className="w-10 h-10 animate-pulse" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-background pb-16 sm:pb-0">
        <Header />
        <main>
          <Switch>
            <Route path="/" component={FeedPage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/notifications" component={NotificationsPage} />
            <Route path="/profile/:username" component={ProfilePage} />
            <Route path="/post/:id" component={PostDetailPage} />
            <Route path="/admin" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <MobileNav />
      </div>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
