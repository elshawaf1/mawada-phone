import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Link2, Package, ArrowUpDown, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTable } from "@/components/ui/skeleton";

interface Product { id: string; name: string; nameAr: string; categoryId: string | null; showRelatedProducts?: boolean; product_images?: { url: string; isPrimary: boolean }[]; }
interface RelatedProduct { id: string; productId: string; relatedProductId: string; sortOrder: number; products?: Product; }

const productImage = (p: Product) => p.product_images?.find(i => i.isPrimary)?.url || p.product_images?.[0]?.url;

export default function RelatedProducts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [relatedItems, setRelatedItems] = useState<RelatedProduct[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: RelatedProduct | null }>({ open: false, item: null });
  const [showRelated, setShowRelated] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchRelated();
      const p = products.find(p => p.id === selectedProductId);
      setShowRelated(p?.showRelatedProducts || false);
    }
  }, [selectedProductId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin.from("products")
        .select("id, name, nameAr, categoryId, product_images(url, isPrimary)")
        .eq("isActive", true)
        .order("nameAr");
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async () => {
    try {
      const { data, error } = await supabaseAdmin.from("product_related")
        .select("*, products!product_related_relatedProductId_fkey(id, name, nameAr, product_images(url, isPrimary))")
        .eq("productId", selectedProductId)
        .order("sortOrder");
      if (error) throw error;
      setRelatedItems(data || []);
      setRelatedProducts((data || []).map((r: any) => r.products).filter(Boolean));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const addRelated = async (targetProduct: Product) => {
    if (!selectedProductId) return;
    if (targetProduct.id === selectedProductId) {
      toast({ title: "تنبيه", description: "لا يمكن إضافة المنتج نفسه", variant: "destructive" });
      return;
    }
    if (relatedProducts.some(p => p.id === targetProduct.id)) {
      toast({ title: "تنبيه", description: "المنتج مضاف بالفعل", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabaseAdmin.from("product_related").insert({
        productId: selectedProductId,
        relatedProductId: targetProduct.id,
        sortOrder: relatedItems.length,
      });
      if (error) throw error;
      toast({ title: "تم", description: "تمت إضافة المنتج بنجاح" });
      setAddDialogOpen(false);
      setAddSearch("");
      fetchRelated();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeRelated = async (item: RelatedProduct) => {
    try {
      const { error } = await supabaseAdmin.from("product_related").delete().eq("id", item.id);
      if (error) throw error;
      toast({ title: "تم", description: "تمت الإزالة بنجاح" });
      setDeleteDialog({ open: false, item: null });
      fetchRelated();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const moveItem = async (item: RelatedProduct, direction: "up" | "down") => {
    const idx = relatedItems.findIndex(r => r.id === item.id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= relatedItems.length) return;
    const swapped = [...relatedItems];
    [swapped[idx], swapped[swapIdx]] = [swapped[swapIdx], swapped[idx]];
    try {
      const updates = swapped.map((r, i) =>
        supabaseAdmin.from("product_related").update({ sortOrder: i }).eq("id", r.id)
      );
      await Promise.all(updates);
      setRelatedItems(swapped);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleShowRelated = async (value: boolean) => {
    try {
      setShowRelated(value);
      const { error } = await supabaseAdmin.from("products").update({ showRelatedProducts: value }).eq("id", selectedProductId);
      if (error) throw error;
      toast({ title: "تم", description: value ? "تم تفعيل قسم المنتجات المشابهة" : "تم إخفاء قسم المنتجات المشابهة" });
    } catch (err: any) {
      setShowRelated(!value);
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const filteredAdd = products.filter(p =>
    p.id !== selectedProductId &&
    !relatedProducts.some(r => r.id === p.id) &&
    (p.nameAr?.includes(addSearch) || p.name?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المنتجات المشابهة</h1>
          <p className="text-sm text-muted-foreground mt-1">تحكم في منتجات "قد يعجبك ايضاً" لكل منتج</p>
        </div>
        <Link2 className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Product Selector */}
      <Card borderless className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">اختر منتجاً</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full rounded-xl bg-muted/50 border-border/60 h-11">
              <SelectValue placeholder="اختر منتجاً لإدارة منتجاته المشابهة..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0">
                      {productImage(p) ? (
                        <img src={productImage(p)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-3 h-3 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <span>{p.nameAr}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Related Products List */}
      {selectedProductId && (
        <Card borderless className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                المنتجات المشابهة لـ "{selectedProduct?.nameAr}"
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={showRelated} onCheckedChange={toggleShowRelated} id="showRelatedToggle" />
                  <Label htmlFor="showRelatedToggle" className="text-xs cursor-pointer text-muted-foreground">{showRelated ? "ظاهر" : "مخفي"}</Label>
                </div>
                <Badge variant="secondary" className="rounded-full text-xs font-number px-3">
                  {relatedItems.length}
                </Badge>
                <Button size="sm" onClick={() => { setAddDialogOpen(true); setAddSearch(""); }} className="gap-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <SkeletonTable />
            ) : relatedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Link2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لم تتم إضافة منتجات مشابهة بعد</p>
                <p className="text-xs mt-1">اضغط "إضافة" لبدء تحديد المنتجات المشابهة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relatedItems.map((item, idx) => {
                  const p = item.products;
                  if (!p) return null;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      <div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
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
                        {p.name && <p className="text-xs text-muted-foreground truncate">{p.name}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveItem(item, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                          title="تحريك لأعلى"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        <button
                          onClick={() => moveItem(item, "down")}
                          disabled={idx === relatedItems.length - 1}
                          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                          title="تحريك لأسفل"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 -rotate-90" />
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
          </CardContent>
        </Card>
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
              filteredAdd.slice(0, 20).map(p => (
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
                    {p.name && <p className="text-xs text-muted-foreground truncate">{p.name}</p>}
                  </div>
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>إزالة منتج مشابه</DialogTitle>
            <DialogDescription>هل أنت متأكد من إزالة "{deleteDialog.item?.products?.nameAr}" من المنتجات المشابهة؟</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, item: null })}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteDialog.item && removeRelated(deleteDialog.item)}>إزالة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
