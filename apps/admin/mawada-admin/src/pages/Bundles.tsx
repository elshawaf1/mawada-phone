import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, X, Loader2, MoreHorizontal, Boxes, Eye, EyeOff, Package, Percent } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  basePrice: number;
  salePrice: number | null;
  isOnSale: boolean;
  product_images?: { id: string; url: string; isPrimary: boolean }[];
}

interface Bundle {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  main_product_id: string;
  addon_product_ids: string[];
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  main_product?: Product;
  addon_products?: Product[];
}

export default function Bundles() {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [mainProductId, setMainProductId] = useState("");
  const [addonProductIds, setAddonProductIds] = useState<string[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bundlesRes, productsRes] = await Promise.all([
        supabaseAdmin
          .from("product_bundles")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("products")
          .select("id, name, nameAr, basePrice, salePrice, isOnSale, product_images(id, url, isPrimary)")
          .eq("isActive", true)
          .order("nameAr"),
      ]);

      const bundlesData = bundlesRes.data || [];
      const allProducts = productsRes.data || [];

      const enrichedBundles = bundlesData.map((bundle) => {
        const mainProduct = allProducts.find((p) => p.id === bundle.main_product_id);
        const addons = allProducts.filter((p) => bundle.addon_product_ids?.includes(p.id));
        return { ...bundle, main_product: mainProduct, addon_products: addons };
      });

      setBundles(enrichedBundles);
      setProducts(allProducts);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setNameAr(""); setDescription(""); setDescriptionAr("");
    setMainProductId(""); setAddonProductIds([]); setDiscountPercent(0);
    setIsActive(true); setSortOrder(0);
    setEditingBundle(null);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setName(bundle.name || "");
    setNameAr(bundle.name_ar);
    setDescription(bundle.description || "");
    setDescriptionAr(bundle.description_ar || "");
    setMainProductId(bundle.main_product_id);
    setAddonProductIds(bundle.addon_product_ids || []);
    setDiscountPercent(bundle.discount_percent);
    setIsActive(bundle.is_active);
    setSortOrder(bundle.sort_order);
    setShowForm(true);
  };

  const saveBundle = async () => {
    if (!nameAr) {
      toast({ title: "خطأ", description: "اسم الباقة بالعربية مطلوب", variant: "destructive" });
      return;
    }
    if (!mainProductId) {
      toast({ title: "خطأ", description: "اختر المنتج الرئيسي", variant: "destructive" });
      return;
    }
    if (addonProductIds.length === 0) {
      toast({ title: "خطأ", description: "اختر منتجاً واحداً على الأقل كإضافة", variant: "destructive" });
      return;
    }
    if (discountPercent < 0 || discountPercent > 100) {
      toast({ title: "خطأ", description: "نسبة الخصم يجب أن تكون بين 0 و 100", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const bundleData = {
        name: name || nameAr,
        name_ar: nameAr,
        description: description || null,
        description_ar: descriptionAr || null,
        main_product_id: mainProductId,
        addon_product_ids: addonProductIds,
        discount_percent: discountPercent,
        is_active: isActive,
        sort_order: sortOrder,
      };

      if (editingBundle) {
        const { error } = await supabaseAdmin
          .from("product_bundles")
          .update(bundleData)
          .eq("id", editingBundle.id);
        if (error) throw error;
        toast({ title: "تم", description: "تم تعديل الباقة بنجاح" });
      } else {
        const { error } = await supabaseAdmin
          .from("product_bundles")
          .insert(bundleData);
        if (error) throw error;
        toast({ title: "تم", description: "تم إضافة الباقة بنجاح" });
      }

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabaseAdmin.from("product_bundles").delete().eq("id", deletingId);
      if (error) throw error;
      toast({ title: "تم", description: "تم حذف الباقة" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const toggleActive = async (bundle: Bundle) => {
    try {
      await supabaseAdmin
        .from("product_bundles")
        .update({ is_active: !bundle.is_active })
        .eq("id", bundle.id);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const toggleAddon = (productId: string) => {
    setAddonProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const productImage = (product?: Product) =>
    product?.product_images?.find((img) => img.isPrimary)?.url ||
    product?.product_images?.[0]?.url ||
    null;

  const filtered = bundles.filter(
    (b) =>
      b.name_ar.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.main_product?.nameAr?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            البندل
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة باقات المنتجات</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-xl gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة باقة
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث في البندل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 rounded-xl"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20 bg-muted/30 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : (
        <ResponsiveTable
          desktop={
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الباقة</TableHead>
                    <TableHead className="text-right">المنتج الرئيسي</TableHead>
                    <TableHead className="text-right">الإضافات</TableHead>
                    <TableHead className="text-right">الخصم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <Boxes className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">لا توجد باقات</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((bundle) => {
                    const mainImg = productImage(bundle.main_product);
                    return (
                      <TableRow key={bundle.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {mainImg && (
                              <img src={mainImg} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{bundle.name_ar}</p>
                              {bundle.name && <p className="text-xs text-muted-foreground">{bundle.name}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {bundle.main_product?.nameAr || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs rounded-full">
                              {bundle.addon_products?.length || 0} منتجات
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs rounded-full font-number">
                            <Percent className="w-3 h-3 ml-1" />
                            {bundle.discount_percent}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleActive(bundle)}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                              bundle.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                            )}
                          >
                            {bundle.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {bundle.is_active ? "نشط" : "غير نشط"}
                          </button>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-xl min-w-[150px]">
                              <DropdownMenuItem onClick={() => openEdit(bundle)} className="cursor-pointer rounded-lg gap-2">
                                <Edit className="w-3.5 h-3.5" /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => confirmDelete(bundle.id)} className="cursor-pointer rounded-lg gap-2 text-red-600 focus:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          }
          mobile={
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Boxes className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">لا توجد باقات</p>
                </div>
              ) : filtered.map((bundle) => {
                const mainImg = productImage(bundle.main_product);
                return (
                  <Card key={bundle.id} className="shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {mainImg && (
                          <img src={mainImg} alt="" className="w-16 h-16 rounded-lg object-cover ring-1 ring-black/5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{bundle.name_ar}</p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60 shrink-0">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-xl min-w-[150px]">
                                <DropdownMenuItem onClick={() => openEdit(bundle)} className="cursor-pointer rounded-lg gap-2">
                                  <Edit className="w-3.5 h-3.5" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmDelete(bundle.id)} className="cursor-pointer rounded-lg gap-2 text-red-600 focus:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" /> حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {bundle.main_product?.nameAr || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[11px] rounded-full">
                            +{bundle.addon_products?.length || 0} إضافات
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] rounded-full font-number">
                            -{bundle.discount_percent}%
                          </Badge>
                        </div>
                        <button
                          onClick={() => toggleActive(bundle)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                            bundle.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                          )}
                        >
                          {bundle.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {bundle.is_active ? "نشط" : "غير نشط"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          }
        />
      )}

      {/* Bundle Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingBundle ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            <DialogDescription>{editingBundle ? "قم بتعديل بيانات الباقة" : "أضف باقة منتجات جديدة"}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="basic" className="rounded-lg text-sm">أساسي</TabsTrigger>
              <TabsTrigger value="products" className="rounded-lg text-sm">المنتجات</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الاسم (العربية) *</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="أكمل معداتك" className="bg-muted/30 focus:bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name (English)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Complete Your Setup" className="bg-muted/30 focus:bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الوصف (العربية)</Label>
                  <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={2} className="bg-muted/30 focus:bg-background resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (English)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-muted/30 focus:bg-background resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">نسبة الخصم (%) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="bg-muted/30 focus:bg-background font-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الترتيب</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="bg-muted/30 focus:bg-background font-number"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
                  <Label htmlFor="isActive" className="text-sm cursor-pointer">نشط</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">المنتج الرئيسي *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-xl p-2">
                  {products.map((product) => {
                    const img = productImage(product);
                    const isSelected = mainProductId === product.id;
                    const isAddon = addonProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        disabled={isAddon}
                        onClick={() => setMainProductId(product.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all text-right",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : isAddon
                              ? "border-muted opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        {img ? (
                          <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{product.nameAr}</p>
                          <p className="text-[10px] text-muted-foreground font-number">
                            {product.basePrice.toLocaleString("ar-EG")} ج
                          </p>
                        </div>
                        {isSelected && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] rounded-full shrink-0">رئيسي</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  المنتجات الإضافية * <span className="text-muted-foreground font-normal">({addonProductIds.length} محدد)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-xl p-2">
                  {products.filter((p) => p.id !== mainProductId).map((product) => {
                    const img = productImage(product);
                    const isSelected = addonProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => toggleAddon(product.id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all text-right",
                          isSelected
                            ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                            : "border-border hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        {img ? (
                          <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{product.nameAr}</p>
                          <p className="text-[10px] text-muted-foreground font-number">
                            {product.basePrice.toLocaleString("ar-EG")} ج
                          </p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-gray-300"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">
              إلغاء
            </Button>
            <Button onClick={saveBundle} disabled={saving} className="rounded-xl gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingBundle ? "حفظ التعديلات" : "إضافة الباقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الباقة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
