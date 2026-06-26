import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Link2, Package, ArrowUp, ArrowDown, ChevronDown, ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  categoryId: string | null;
  showRelatedProducts?: boolean;
  product_images?: { url: string; isPrimary: boolean }[];
}

interface RelatedRow {
  id: string;
  productId: string;
  relatedProductId: string;
  sortOrder: number;
  products?: Product;
}

const productImage = (p: Product) =>
  p.product_images?.find((i) => i.isPrimary)?.url || p.product_images?.[0]?.url;

export default function RelatedProducts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [relatedCounts, setRelatedCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<RelatedRow[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingToId, setAddingToId] = useState<string>("");
  const [addSearch, setAddSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: RelatedRow | null }>({
    open: false,
    item: null,
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [productsRes, countsRes] = await Promise.all([
        supabaseAdmin
          .from("products")
          .select("*, product_images(id, url, isPrimary)")
          .eq("isActive", true)
          .order("nameAr"),
        supabaseAdmin.from("product_related").select("productId"),
      ]);

      if (productsRes.error) throw productsRes.error;

      setProducts(productsRes.data || []);

      const counts: Record<string, number> = {};
      (countsRes.data || []).forEach((r: any) => {
        counts[r.productId] = (counts[r.productId] || 0) + 1;
      });
      setRelatedCounts(counts);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchExpandedItems = useCallback(async (productId: string) => {
    try {
      setLoadingExpanded(true);
      const { data, error } = await supabaseAdmin
        .from("product_related")
        .select("*, products!product_related_relatedProductId_fkey(*, product_images(id, url, isPrimary))")
        .eq("productId", productId)
        .order("sortOrder");
      if (error) throw error;
      setExpandedItems(data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoadingExpanded(false);
    }
  }, []);

  const toggleExpand = (productId: string) => {
    if (expandedId === productId) {
      setExpandedId(null);
      setExpandedItems([]);
    } else {
      setExpandedId(productId);
      fetchExpandedItems(productId);
    }
  };

  const toggleShowRelated = async (productId: string, value: boolean) => {
    try {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, showRelatedProducts: value } : p))
      );
      const { error } = await supabaseAdmin
        .from("products")
        .update({ "showRelatedProducts": value })
        .eq("id", productId);
      if (error) throw error;
      toast({
        title: "تم",
        description: value ? "تم تفعيل المنتجات المشابهة" : "تم إخفاء المنتجات المشابهة",
      });
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, showRelatedProducts: !value } : p))
      );
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openAddDialog = (productId: string) => {
    setAddingToId(productId);
    setAddSearch("");
    setAddDialogOpen(true);
  };

  const addRelated = async (targetProduct: Product) => {
    if (!addingToId) return;
    if (targetProduct.id === addingToId) {
      toast({ title: "تنبيه", description: "لا يمكن إضافة المنتج نفسه", variant: "destructive" });
      return;
    }
    if (expandedItems.some((r) => r.relatedProductId === targetProduct.id)) {
      toast({ title: "تنبيه", description: "المنتج مضاف بالفعل", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabaseAdmin.from("product_related").insert({
        productId: addingToId,
        relatedProductId: targetProduct.id,
        sortOrder: expandedItems.length,
      });
      if (error) throw error;
      toast({ title: "تم", description: "تمت إضافة المنتج بنجاح" });
      setAddDialogOpen(false);
      setAddSearch("");
      fetchExpandedItems(addingToId);
      setRelatedCounts((prev) => ({
        ...prev,
        [addingToId]: (prev[addingToId] || 0) + 1,
      }));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeRelated = async (item: RelatedRow) => {
    try {
      const { error } = await supabaseAdmin.from("product_related").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "تم", description: "تمت الإزالة بنجاح" });
      setDeleteDialog({ open: false, item: null });
      fetchExpandedItems(item.productId);
      setRelatedCounts((prev) => ({
        ...prev,
        [item.productId]: Math.max(0, (prev[item.productId] || 1) - 1),
      }));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const moveItem = async (item: RelatedRow, direction: "up" | "down") => {
    const idx = expandedItems.findIndex((r) => r.id === item.id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= expandedItems.length) return;
    const swapped = [...expandedItems];
    [swapped[idx], swapped[swapIdx]] = [swapped[swapIdx], swapped[idx]];
    try {
      const updates = swapped.map((r, i) =>
        supabaseAdmin.from("product_related").update({ sortOrder: i }).eq("id", r.id)
      );
      await Promise.all(updates);
      setExpandedItems(swapped);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const filteredAdd = products.filter(
    (p) =>
      p.id !== addingToId &&
      !expandedItems.some((r) => r.relatedProductId === p.id) &&
      (p.nameAr?.includes(addSearch) || p.name?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const filteredProducts = products.filter(
    (p) =>
      !search ||
      p.nameAr?.toLowerCase().includes(search.toLowerCase()) ||
      p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            المنتجات المشابهة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تحكم في منتجات "قد يعجبك ايضاً" لكل منتج
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث في المنتجات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 rounded-xl"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-16 bg-muted/30 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const img = productImage(product);
            const count = relatedCounts[product.id] || 0;
            const isExpanded = expandedId === product.id;
            const isVisible = product.showRelatedProducts || false;

            return (
              <Card key={product.id} className="shadow-sm overflow-hidden transition-all">
                {/* Main Row */}
                <button
                  onClick={() => toggleExpand(product.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 text-right transition-colors hover:bg-muted/30",
                    isExpanded && "bg-muted/20"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-medium truncate">{product.nameAr}</p>
                    {product.name && (
                      <p className="text-xs text-muted-foreground truncate">{product.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={isVisible}
                        onCheckedChange={(v) => toggleShowRelated(product.id, v)}
                        id={`toggle-${product.id}`}
                      />
                      <Label
                        htmlFor={`toggle-${product.id}`}
                        className="text-[10px] cursor-pointer text-muted-foreground"
                      >
                        {isVisible ? "ظاهر" : "مخفي"}
                      </Label>
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-full text-[11px] font-number px-2.5 min-w-[28px] text-center",
                        count > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </Badge>

                    <div
                      className={cn(
                        "transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 px-4 pb-4">
                    <div className="flex items-center justify-between pt-3 pb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        المنتجات المشابهة ({expandedItems.length})
                      </p>
                      <Button
                        size="sm"
                        onClick={() => openAddDialog(product.id)}
                        className="gap-1.5 rounded-xl h-8"
                      >
                        <Plus className="w-3.5 h-3.5" /> إضافة
                      </Button>
                    </div>

                    {loadingExpanded ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : expandedItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">لم تتم إضافة منتجات مشابهة بعد</p>
                        <p className="text-[10px] mt-1 opacity-60">
                          اضغط "إضافة" لبدء تحديد المنتجات المشابهة
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {expandedItems.map((item, idx) => {
                          const p = item.products;
                          if (!p) return null;
                          const pImg = productImage(p);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2.5 rounded-xl bg-background hover:bg-muted/50 transition-colors border border-border/50"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
                                {pImg ? (
                                  <img src={pImg} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-4 h-4 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.nameAr}</p>
                                {p.name && (
                                  <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => moveItem(item, "up")}
                                  disabled={idx === 0}
                                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                                  title="تحريك لأعلى"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveItem(item, "down")}
                                  disabled={idx === expandedItems.length - 1}
                                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                                  title="تحريك لأسفل"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteDialog({ open: true, item })}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                  title="إزالة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة منتج مشابه</DialogTitle>
            <DialogDescription>ابحث واختر منتجاً لإضافته كمنتج مشابه</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="ابحث بالاسم..."
              className="pr-10 rounded-xl"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredAdd.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                لا توجد نتائج
              </div>
            ) : (
              filteredAdd.slice(0, 30).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addRelated(p)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
                    {productImage(p) ? (
                      <img src={productImage(p)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nameAr}</p>
                    {p.name && (
                      <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, item: null })}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>إزالة منتج مشابه</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إزالة "{deleteDialog.item?.products?.nameAr}" من المنتجات المشابهة؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, item: null })}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.item && removeRelated(deleteDialog.item)}
              className="rounded-xl"
            >
              إزالة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
