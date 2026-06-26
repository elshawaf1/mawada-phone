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
import { Plus, Search, Edit, Trash2, X, Loader2, MoreHorizontal, Boxes, Eye, EyeOff, Package, Settings2 } from "lucide-react";
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

interface BundleItemConfig {
  product_id: string;
  role: "main" | "addon";
  custom_name: string;
  custom_price: string;
  sort_order: number;
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
  bundle_items?: { product_id: string; role: string; custom_name: string | null; custom_price: number | null }[];
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
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [bundleItems, setBundleItems] = useState<BundleItemConfig[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bundlesRes, productsRes, itemsRes] = await Promise.all([
        supabaseAdmin.from("product_bundles").select("*").order("sort_order", { ascending: true }),
        supabaseAdmin.from("products").select("id, name, nameAr, basePrice, salePrice, isOnSale, product_images(id, url, isPrimary)").eq("isActive", true).order("nameAr"),
        supabaseAdmin.from("bundle_items").select("*"),
      ]);

      const allProducts = productsRes.data || [];
      const allItems = itemsRes.data || [];

      const enriched = (bundlesRes.data || []).map((bundle) => {
        const items = allItems.filter((i) => i.bundle_id === bundle.id);
        return { ...bundle, bundle_items: items };
      });

      setBundles(enriched);
      setProducts(allProducts);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setNameAr(""); setDescription(""); setDescriptionAr("");
    setIsActive(true); setSortOrder(0); setBundleItems([]);
    setEditingBundle(null);
  };

  const openEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setName(bundle.name || "");
    setNameAr(bundle.name_ar);
    setDescription(bundle.description || "");
    setDescriptionAr(bundle.description_ar || "");
    setIsActive(bundle.is_active);
    setSortOrder(bundle.sort_order);

    const items: BundleItemConfig[] = (bundle.bundle_items || []).map((bi) => ({
      product_id: bi.product_id,
      role: bi.role as "main" | "addon",
      custom_name: bi.custom_name || "",
      custom_price: bi.custom_price != null ? String(bi.custom_price) : "",
      sort_order: 0,
    }));
    setBundleItems(items);
    setShowForm(true);
  };

  const saveBundle = async () => {
    if (!nameAr) {
      toast({ title: "خطأ", description: "اسم الباقة بالعربية مطلوب", variant: "destructive" });
      return;
    }

    const mainItems = bundleItems.filter((i) => i.role === "main");
    if (mainItems.length === 0) {
      toast({ title: "خطأ", description: "اختر منتجاً واحداً على الأقل كمنتج رئيسي", variant: "destructive" });
      return;
    }
    if (bundleItems.length < 2) {
      toast({ title: "خطأ", description: "يجب إضافة منتجين على الأقل في الباقة", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const mainProductId = mainItems[0].product_id;
      const addonIds = bundleItems.filter((i) => i.role === "addon").map((i) => i.product_id);

      const bundleData = {
        name: name || nameAr,
        name_ar: nameAr,
        description: description || null,
        description_ar: descriptionAr || null,
        main_product_id: mainProductId,
        addon_product_ids: addonIds,
        is_active: isActive,
        sort_order: sortOrder,
      };

      let bundleId = editingBundle?.id;

      if (editingBundle) {
        const { error } = await supabaseAdmin.from("product_bundles").update(bundleData).eq("id", editingBundle.id);
        if (error) throw error;
        await supabaseAdmin.from("bundle_items").delete().eq("bundle_id", editingBundle.id);
      } else {
        const { data: newBundle, error } = await supabaseAdmin.from("product_bundles").insert(bundleData).select().single();
        if (error) throw error;
        bundleId = newBundle.id;
      }

      const itemsToInsert = bundleItems.map((item, idx) => ({
        bundle_id: bundleId,
        product_id: item.product_id,
        role: item.role,
        custom_name: item.custom_name || null,
        custom_price: item.custom_price ? Number(item.custom_price) : null,
        sort_order: idx,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabaseAdmin.from("bundle_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      toast({ title: "تم", description: editingBundle ? "تم تعديل الباقة بنجاح" : "تم إضافة الباقة بنجاح" });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => { setDeletingId(id); setShowDeleteDialog(true); };

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
      await supabaseAdmin.from("product_bundles").update({ is_active: !bundle.is_active }).eq("id", bundle.id);
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const toggleAddon = (productId: string) => {
    setBundleItems((prev) => {
      const exists = prev.find((i) => i.product_id === productId);
      if (exists) {
        return prev.filter((i) => i.product_id !== productId);
      }
      return [...prev, { product_id: productId, role: "addon", custom_name: "", custom_price: "", sort_order: prev.length }];
    });
  };

  const setMainProduct = (productId: string) => {
    setBundleItems((prev) => {
      const withoutNewMain = prev.filter((i) => i.role !== "main");
      return [...withoutNewMain, { product_id: productId, role: "main", custom_name: "", custom_price: "", sort_order: 0 }];
    });
  };

  const updateItemConfig = (productId: string, field: "custom_name" | "custom_price", value: string) => {
    setBundleItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, [field]: value } : i))
    );
  };

  const productImage = (product?: Product) =>
    product?.product_images?.find((img) => img.isPrimary)?.url ||
    product?.product_images?.[0]?.url || null;

  const getBundleTotal = (bundle: Bundle) => {
    const items = bundle.bundle_items || [];
    let total = 0;
    items.forEach((bi) => {
      if (bi.custom_price != null) {
        total += bi.custom_price;
      } else {
        const p = products.find((pp) => pp.id === bi.product_id);
        if (p) total += p.isOnSale && p.salePrice ? p.salePrice : p.basePrice;
      }
    });
    return total;
  };

  const getOriginalTotal = (bundle: Bundle) => {
    const items = bundle.bundle_items || [];
    let total = 0;
    items.forEach((bi) => {
      const p = products.find((pp) => pp.id === bi.product_id);
      if (p) total += p.isOnSale && p.salePrice ? p.salePrice : p.basePrice;
    });
    return total;
  };

  const filtered = bundles.filter(
    (b) =>
      b.name_ar.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            الباقات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة باقات المنتجات مع تسعير مخصص</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> إضافة باقة
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث في الباقات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 rounded-xl" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20 bg-muted/30 rounded-xl" /></Card>
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
                    <TableHead className="text-right">المنتجات</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">التخفيض</TableHead>
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
                    const mainImg = bundle.bundle_items?.find((i) => i.role === "main");
                    const mainProduct = products.find((p) => p.id === mainImg?.product_id);
                    const img = productImage(mainProduct);
                    const total = getBundleTotal(bundle);
                    const origTotal = getOriginalTotal(bundle);
                    const discount = origTotal > 0 ? Math.round(((origTotal - total) / origTotal) * 100) : 0;
                    const itemCount = bundle.bundle_items?.length || 0;

                    return (
                      <TableRow key={bundle.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {img && <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/5" />}
                            <div>
                              <p className="font-medium text-sm">{bundle.name_ar}</p>
                              {bundle.name && <p className="text-xs text-muted-foreground">{bundle.name}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs rounded-full">{itemCount} منتجات</Badge>
                        </TableCell>
                        <TableCell className="font-number text-sm">
                          {total.toLocaleString("ar-EG")} ج
                          {origTotal > total && (
                            <span className="text-muted-foreground line-through text-[10px] mr-1">{origTotal.toLocaleString("ar-EG")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {discount > 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs rounded-full">-{discount}%</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => toggleActive(bundle)} className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                            bundle.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                          )}>
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
                const mainItem = bundle.bundle_items?.find((i) => i.role === "main");
                const mainProduct = products.find((p) => p.id === mainItem?.product_id);
                const img = productImage(mainProduct);
                const total = getBundleTotal(bundle);
                const origTotal = getOriginalTotal(bundle);
                const discount = origTotal > 0 ? Math.round(((origTotal - total) / origTotal) * 100) : 0;

                return (
                  <Card key={bundle.id} className="shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {img && <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover ring-1 ring-black/5 shrink-0" />}
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
                            {bundle.bundle_items?.length || 0} منتجات
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-number text-sm font-medium">{total.toLocaleString("ar-EG")} ج</span>
                          {discount > 0 && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] rounded-full">-{discount}%</Badge>
                          )}
                        </div>
                        <button onClick={() => toggleActive(bundle)} className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                          bundle.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                        )}>
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
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingBundle ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            <DialogDescription>{editingBundle ? "قم بتعديل بيانات الباقة" : "أضف باقة منتجات جديدة"}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="basic" className="rounded-lg text-sm">أساسي</TabsTrigger>
              <TabsTrigger value="products" className="rounded-lg text-sm">المنتجات</TabsTrigger>
              <TabsTrigger value="customize" className="rounded-lg text-sm gap-1"><Settings2 className="w-3.5 h-3.5" /> التسعير</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الاسم (العربية) *</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="عرض مودة" className="bg-muted/30 focus:bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name (English)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mawda Offer" className="bg-muted/30 focus:bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الوصف (العربية)</Label>
                  <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={2} className="bg-muted/30 focus:bg-background resize-none" placeholder="وفّر عند شراء هذه المنتجات معاً" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (English)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-muted/30 focus:bg-background resize-none" placeholder="Save when you buy these products together" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الترتيب</Label>
                  <Input type="number" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
                  <Label htmlFor="isActive" className="text-sm cursor-pointer">نشط</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  المنتجات في الباقة * <span className="text-muted-foreground font-normal">({bundleItems.length} محدد)</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto border rounded-xl p-2">
                  {products.map((product) => {
                    const img = productImage(product);
                    const config = bundleItems.find((i) => i.product_id === product.id);
                    const isMain = config?.role === "main";
                    const isAddon = config?.role === "addon";
                    const isSelected = !!config;

                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          if (isSelected) {
                            setBundleItems((prev) => prev.filter((i) => i.product_id !== product.id));
                          } else {
                            const hasMain = bundleItems.some((i) => i.role === "main");
                            setBundleItems((prev) => [...prev, {
                              product_id: product.id,
                              role: hasMain ? "addon" : "main",
                              custom_name: "",
                              custom_price: "",
                              sort_order: prev.length,
                            }]);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-all text-right",
                          isMain ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : isAddon ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
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
                          <p className="text-[10px] text-muted-foreground font-number">{product.basePrice.toLocaleString("ar-EG")} ج</p>
                        </div>
                        {isMain && <Badge className="bg-primary text-primary-foreground text-[10px] rounded-full shrink-0">رئيسي</Badge>}
                        {isAddon && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] rounded-full shrink-0">إضافة</Badge>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="customize" className="space-y-4 mt-4">
              {bundleItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">أضف منتجات أولاً من تبويب "المنتجات"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">خصّص اسم وسعر كل منتج في الباقة. اترك الحقول فارغة لاستخدام القيم الأصلية.</p>
                  {bundleItems.map((item, idx) => {
                    const product = products.find((p) => p.id === item.product_id);
                    if (!product) return null;
                    const img = productImage(product);
                    const originalPrice = product.isOnSale && product.salePrice ? product.salePrice : product.basePrice;

                    return (
                      <div key={item.product_id} className="flex items-center gap-3 p-3 border rounded-xl bg-muted/20">
                        {img && <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.nameAr}</p>
                          <p className="text-[10px] text-muted-foreground">السعر الأصلي: {originalPrice.toLocaleString("ar-EG")} ج</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 w-40">
                          <Input
                            placeholder={`الاسم: ${product.nameAr}`}
                            value={item.custom_name}
                            onChange={(e) => updateItemConfig(item.product_id, "custom_name", e.target.value)}
                            className="h-8 text-xs rounded-lg"
                          />
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder={`السعر: ${originalPrice}`}
                            value={item.custom_price}
                            onChange={(e) => updateItemConfig(item.product_id, "custom_price", e.target.value)}
                            className="h-8 text-xs rounded-lg font-number"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateItemConfig(item.product_id, "role", item.role === "main" ? "addon" : "main")}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              item.role === "main" ? "bg-primary text-primary-foreground" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {item.role === "main" ? "رئيسي" : "إضافة"}
                          </button>
                          <button
                            onClick={() => setBundleItems((prev) => prev.filter((i) => i.product_id !== item.product_id))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveBundle} disabled={saving} className="rounded-xl gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingBundle ? "حفظ التعديلات" : "إضافة الباقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الباقة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
