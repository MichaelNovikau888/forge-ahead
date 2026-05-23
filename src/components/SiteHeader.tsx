import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dumbbell, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const dashboardPath = roles.includes("admin")
    ? "/admin"
    : roles.includes("trainer")
      ? "/trainer"
      : "/dashboard";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-6 w-6 text-accent" />
          <span>FitMatch</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Главная</Link>
          <Link to="/trainers" className="hover:text-foreground">Тренеры</Link>
          {user && (
            <Link to={dashboardPath} className="hover:text-foreground">Кабинет</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to={dashboardPath}>
                <Button variant="ghost" size="sm">Мой кабинет</Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Выйти">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Войти</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}