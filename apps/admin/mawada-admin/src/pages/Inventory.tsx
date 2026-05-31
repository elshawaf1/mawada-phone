import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PackageSearch, Search, AlertTriangle, Box, Loader2, MoreHorizontal, Edit, EyeOff, Eye, ChevronDown, ChevronUp, Save, X, Tag } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SkeletonKPI, SkeletonTable } from "@/components/ui/skeleton";

interface ProductVariant {
  id: string;
  color: string | null;
  colorHex: string | null;
  storage: string | null;
  ram: string | null;
  price: number;
  stock: number;
  sku: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  nameAr: string;
  name: string;
  sku: string | null;
  basePrice: number;
  salePrice: number | null;
  totalStock: number;
  isActive: boolean;
  isFeatured: boolean;
  categories: { nameAr: string } | { nameAr: string }[] | null;
  brands: { nameAr: string } | { nameAr: string }[] | null;
  product_variants: ProductVariant[];
}

const catName = (c: Product["categories"]) => Array.isArray(c) ? c[0]?.nameAr : c?.nameAr;
const brandName = (b: Product["brands"]) => Array.isArray(b) ? b[0]?.nameAr : b?.nameAr;

interface Category {
  id: string;
  nameAr: string;
}

interface Brand {
  id: string;
  nameAr: string;
}

export default function Inventory() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTotalStock, setEditTotalStock] = useState(0);
  const [editVariants, setEditVariants] = useState<{ id: string; stock: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase
          .from("products")
          .select(`id, nameAr, name, sku, basePrice, salePrice, totalStock, isActive, isFeatured, categories(nameAr), brands(nameAr), product_variants(id, color, colorHex, storage, ram, price, stock, sku, isActive)`)
          .order("createdAt", { ascending: false }),
        supabase.from("categories").select("id, nameAr").order("nameAr"),
        supabase.from("brands").select("id, nameAr").order("nameAr"),
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setEditTotalStock(product.totalStock);
    setEditVariants(product.product_variants.map(v => ({ id: v.id, stock: v.stock })));
    setShowEdit(true);
  };

  const handleSaveStock = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const { error: prodErr } = await supabase.from("products").update({ totalStock: editTotalStock, updatedAt: new Date().toISOString() }).eq("id", editingProduct.id);
      if (prodErr) throw prodErr;

      for (const variant of editVariants) {
        const { error: varErr } = await supabase.from("product_variants").update({ stock: variant.stock }).eq("id", variant.id);
        if (varErr) throw varErr;
      }

      toast({ title: "تم", description: "تم تحديث المخزون بنجاح" });
      setShowEdit(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase.from("products").update({ isActive: !product.isActive, updatedAt: new Date().toISOString() }).eq("id", product.id);
      if (error) throw error;
      toast({ title: "تم", description: product.isActive ? "تم إخفاء المنتج" : "تم إظهار المنتج" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const outOfStock = products.filter(p => p.totalStock === 0 && p.isActive).length;
  const lowStock = products.filter(p => p.totalStock > 0 && p.totalStock <= 5 && p.isActive).length;
  const totalActive = products.filter(p => p.isActive).length;

  const filtered = products.filter(p => {
    const matchSearch = p.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "ALL" || catName(p.categories) === categoryFilter;
    const matchBrand = brandFilter === "ALL" || brandName(p.brands) === brandFilter;
    const matchStock = stockFilter === "ALL" ||
      (stockFilter === "OUT" && p.totalStock === 0) ||
      (stockFilter === "LOW" && p.totalStock > 0 && p.totalStock <= 5) ||
      (stockFilter === "OK" && p.totalStock > 5);
    return matchSearch && matchCategory && matchBrand && matchStock;
  });

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-28 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-44 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-7 w-24 bg-muted/50 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <SkeletonKPI key={i} />)}
        </div>
        <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <SkeletonTable rows={6} cols={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">المخزون</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة مخزون المنتجات والمتغيرات</p>
        </div>
        <Badge variant="secondary" className="rounded-full text-xs font-number px-3">
          {totalActive} منتج نشط
        </Badge>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card borderless className="shadow-sm border-r-4 border-r-red-400">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">نفذ من المخزون</p>
              <p className="text-xl font-bold font-number text-red-600">{outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card borderless className="shadow-sm border-r-4 border-r-amber-400">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">مخزون منخفض (≤5)</p>
              <p className="text-xl font-bold font-number text-amber-600">{lowStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card borderless className="shadow-sm border-r-4 border-r-emerald-400">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70">إجمالي المنتجات</p>
              <p className="text-xl font-bold font-number text-emerald-600">{products.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المنتج أو SKU..." className="pr-10 bg-muted/50 border-border/60 focus:bg-background" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع التصنيفات</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.nameAr}>{c.nameAr}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الماركة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الماركات</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.nameAr}>{b.nameAr}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="حالة المخزون" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الحالات</SelectItem>
            <SelectItem value="OUT">نفذ من المخزون</SelectItem>
            <SelectItem value="LOW">مخزون منخفض</SelectItem>
            <SelectItem value="OK">مخزون كافٍ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Table */}
      <ResponsiveTable
        desktop={
          <>
            <Card borderless className="shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/40">
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10 w-8"></TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">المنتج</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">التصنيف</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">SKU</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">السعر الأساسي</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">المخزون</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">الحالة</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-10">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        <PackageSearch className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">لا توجد منتجات مطابقة</p>
                      </TableCell></TableRow>
                    ) : filtered.map((product) => {
                      const isExpanded = expandedId === product.id;
                      const totalVariantStock = product.product_variants.reduce((s, v) => s + v.stock, 0);
                      const stockPct = product.totalStock > 0 ? Math.min(100, Math.round((totalVariantStock / Math.max(totalVariantStock, 1)) * 100)) : 0;
                      return (
                        <TableRow key={product.id} className={cn("hover:bg-muted/20 transition-colors border-b border-border/20", !product.isActive && "opacity-60")}>
                          <TableCell className="py-2.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : product.id)}
                              className="w-6 h-6 sm:w-9 sm:h-9 min-w-[44px] min-h-[44px] rounded-md hover:bg-muted/60 flex items-center justify-center"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                                <Box className="w-4 h-4 text-primary/60" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{product.nameAr}</p>
                                {product.name && <p className="text-xs text-muted-foreground">{product.name}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground py-2.5">{catName(product.categories) || "-"}</TableCell>
                          <TableCell className="font-number text-xs text-muted-foreground py-2.5 font-mono">{product.sku || "-"}</TableCell>
                          <TableCell className="font-number text-sm font-medium py-2.5">{Number(product.basePrice).toLocaleString()} ج</TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-number font-bold text-sm",
                                product.totalStock === 0 ? "text-red-500" : product.totalStock <= 5 ? "text-amber-500" : "text-emerald-600"
                              )}>
                                {product.totalStock}
                              </span>
                              <div className="w-16 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                <div className={cn(
                                  "h-full rounded-full",
                                  product.totalStock === 0 ? "bg-red-500" : product.totalStock <= 5 ? "bg-amber-500" : "bg-emerald-500"
                                )} style={{ width: `${Math.min(100, product.totalStock)}%` }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-[11px] px-2 py-0.5 rounded-full">
                              {product.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-muted/60">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-xl min-w-[160px]">
                                <DropdownMenuItem onClick={() => openEdit(product)} className="cursor-pointer rounded-lg gap-2">
                                  <Edit className="w-3.5 h-3.5" /> تعديل المخزون
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleActive(product)} className="cursor-pointer rounded-lg gap-2">
                                  {product.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  {product.isActive ? "إخفاء" : "إظهار"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {expandedId && (
              <Card borderless className="shadow-sm bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">تفاصيل المتغيرات</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/40">
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">اللون</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">السعة / الرام</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">SKU</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">السعر</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">المخزون</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-8">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(products.find(p => p.id === expandedId)?.product_variants || []).map((v) => (
                        <TableRow key={v.id} className="border-b border-border/10">
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              {v.colorHex && <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: v.colorHex }} />}
                              <span className="text-sm">{v.color || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{[v.storage, v.ram].filter(Boolean).join(" / ") || "-"}</TableCell>
                          <TableCell className="font-number text-xs font-mono text-muted-foreground">{v.sku || "-"}</TableCell>
                          <TableCell className="font-number text-sm">{Number(v.price).toLocaleString()} ج</TableCell>
                          <TableCell className="py-2">
                            <span className={cn("font-number font-medium text-sm", v.stock === 0 ? "text-red-500" : v.stock <= 2 ? "text-amber-500" : "text-emerald-600")}>
                              {v.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={v.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 rounded-full">{v.isActive ? "نشط" : "غير نشط"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(products.find(p => p.id === expandedId)?.product_variants || []).length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">لا توجد متغيرات لهذا المنتج</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        }
        mobile={
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <PackageSearch className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد منتجات مطابقة</p>
              </div>
            ) : filtered.map((product) => {
              const isExpanded = expandedId === product.id;
              const variants = product.product_variants || [];
              return (
                <Card key={product.id} borderless className="shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                          <Box className="w-5 h-5 text-primary/60" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{product.nameAr}</p>
                          {product.name && <p className="text-xs text-muted-foreground truncate">{product.name}</p>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60 shrink-0">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl min-w-[160px]">
                          <DropdownMenuItem onClick={() => openEdit(product)} className="cursor-pointer rounded-lg gap-2">
                            <Edit className="w-3.5 h-3.5" /> تعديل المخزون
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(product)} className="cursor-pointer rounded-lg gap-2">
                            {product.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {product.isActive ? "إخفاء" : "إظهار"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {catName(product.categories) || "-"}
                      </span>
                      <span className="font-mono">{product.sku || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-number font-semibold text-sm">{Number(product.basePrice).toLocaleString()} ج</span>
                      <Badge variant={product.isActive ? "default" : "secondary"} className="text-[10px] px-2 py-0.5 rounded-full">
                        {product.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn("font-number font-bold text-sm", product.totalStock === 0 ? "text-red-500" : product.totalStock <= 5 ? "text-amber-500" : "text-emerald-600")}>
                        {product.totalStock}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", product.totalStock === 0 ? "bg-red-500" : product.totalStock <= 5 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(100, product.totalStock)}%` }} />
                      </div>
                    </div>
                    {variants.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : product.id)}
                          className="flex items-center justify-center gap-1 w-full mt-3 pt-2.5 border-t border-border/40 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? "إخفاء المتغيرات" : `عرض المتغيرات (${variants.length})`}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            {variants.map((v) => (
                              <div key={v.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 text-xs">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {v.colorHex && <span className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: v.colorHex }} />}
                                  <span className="truncate">{v.color || "-"}</span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="truncate text-muted-foreground">{[v.storage, v.ram].filter(Boolean).join(" / ") || "-"}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn("font-number font-medium", v.stock === 0 ? "text-red-500" : v.stock <= 2 ? "text-amber-500" : "text-emerald-600")}>
                                    {v.stock}
                                  </span>
                                  <Badge variant={v.isActive ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 rounded-full">{v.isActive ? "نشط" : "غير نشط"}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
      />

      {/* Stock Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المخزون</DialogTitle>
            <DialogDescription>{editingProduct?.nameAr}</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>المخزون الإجمالي</Label>
                <Input type="number" inputMode="numeric" value={editTotalStock} onChange={(e) => setEditTotalStock(parseInt(e.target.value) || 0)} className="font-number" />
              </div>
              {editVariants.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm text-muted-foreground">المتغيرات</Label>
                  {editVariants.map((v) => {
                    const variant = editingProduct.product_variants.find(pv => pv.id === v.id);
                    if (!variant) return null;
                    return (
                      <div key={v.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {[variant.color, variant.storage, variant.ram].filter(Boolean).join(" / ") || variant.id.slice(0, 8)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={v.stock}
                          onChange={(e) => setEditVariants(prev => prev.map(x => x.id === v.id ? { ...x, stock: parseInt(e.target.value) || 0 } : x))}
                          className="w-24 font-number text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              <X className="w-4 h-4 ml-1.5" /> إلغاء
            </Button>
            <Button onClick={handleSaveStock} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
