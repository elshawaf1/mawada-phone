import { Link } from "wouter";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">٤٠٤</h1>
        <p className="text-muted-foreground">الصفحة غير موجودة</p>
        <Link href="/">
          <a className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </a>
        </Link>
      </div>
    </div>
  );
}
