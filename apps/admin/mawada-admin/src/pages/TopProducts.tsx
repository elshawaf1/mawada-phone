import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/ui/skeleton";

interface TopProduct {
  id: string;
  nameAr: string;
  name: string;
  soldCount: number;
}

const rankIcon = (idx: number) => {
  if (idx === 0) return <ArrowUp className="w-4 h-4 text-emerald-500" />;
  if (idx === 1) return <ArrowUp className="w-4 h-4 text-blue-500" />;
  if (idx === 2) return <ArrowUp className="w-4 h-4 text-amber-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground/40" />;
};

const rankBg = (idx: number) => {
  if (idx === 0) return "bg-emerald-100 text-emerald-700";
  if (idx === 1) return "bg-blue-100 text-blue-700";
  if (idx === 2) return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
};

export default function TopProducts() {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState("10");

  useEffect(() => {
    fetchData();
  }, [limit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("get_top_products", { limit_count: parseInt(limit) });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching top products:", error);
    } finally {
      setLoading(false);
    }
  };

  const maxSold = products.length > 0 ? Math.max(...products.map((p) => p.soldCount)) : 0;

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-36 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-9 w-28 bg-muted/50 rounded-xl animate-pulse" />
        </div>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الأكثر مبيعاً</h1>
          <p className="text-sm text-muted-foreground mt-0.5">المنتجات الأكثر طلباً في المتجر</p>
        </div>
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-32 h-9 rounded-xl bg-muted/40 border-border/60 text-sm">
            <Calendar className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">أفضل 5</SelectItem>
            <SelectItem value="10">أفضل 10</SelectItem>
            <SelectItem value="20">أفضل 20</SelectItem>
            <SelectItem value="50">أفضل 50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {products.length === 0 ? (
        <Card borderless className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">لا توجد بيانات كافية لعرض المنتجات الأكثر مبيعاً</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table */}
          <ResponsiveTable
            desktop={
              <Card borderless className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">قائمة المنتجات</CardTitle>
                    <Badge variant="secondary" className="rounded-full text-xs font-number px-3">
                      {products.length} منتج
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9 w-12">#</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">المنتج</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9 hidden sm:table-cell">الاسم (EN)</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">عدد المبيعات</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">النسبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product, idx) => (
                        <TableRow key={product.id} className="hover:bg-muted/20 transition-colors border-b border-border/20">
                          <TableCell className="py-3">
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-number",
                              rankBg(idx)
                            )}>
                              {idx + 1}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{product.nameAr}</span>
                              {rankIcon(idx)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-3 hidden sm:table-cell">{product.name || "-"}</TableCell>
                          <TableCell className="font-number font-semibold text-sm py-3">{product.soldCount}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden max-w-[120px] sm:max-w-none">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : "bg-primary/40"
                                  )}
                                  style={{ width: `${maxSold > 0 ? (product.soldCount / maxSold) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground font-number">
                                {maxSold > 0 ? Math.round((product.soldCount / maxSold) * 100) : 0}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            }
            mobile={
              <div className="space-y-3">
                {products.map((product, idx) => (
                  <Card key={product.id} borderless className="shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold font-number shrink-0",
                          rankBg(idx)
                        )}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{product.nameAr}</span>
                            {rankIcon(idx)}
                          </div>
                          {product.name && <p className="text-xs text-muted-foreground truncate">{product.name}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-muted-foreground">عدد المبيعات</span>
                        <span className="font-number font-bold text-sm">{product.soldCount}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : "bg-primary/40")}
                            style={{ width: `${maxSold > 0 ? (product.soldCount / maxSold) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-number">
                          {maxSold > 0 ? Math.round((product.soldCount / maxSold) * 100) : 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          />
        </>
      )}
    </div>
  );
}