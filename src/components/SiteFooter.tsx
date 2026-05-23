export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
        <p>© {new Date().getFullYear()} FitMatch. Все права защищены.</p>
        <p>Маркетплейс персональных фитнес-тренеров.</p>
      </div>
    </footer>
  );
}