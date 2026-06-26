import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  Plus, Search, Edit, Trash2, ImagePlus, Loader2,
  Award, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BrandItem {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface Category {
  id: string;
  nameAr: string;
}

export default function Brands() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [brandNameAr, setBrandNameAr] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandSortOrder, setBrandSortOrder] = useState(0);
  const [brandActive, setBrandActive] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [brandsRes, catsRes] = await Promise.all([
      supabaseAdmin.from("brands").select("*").order("sortOrder"),
      supabaseAdmin.from("categories").select("id, nameAr").order("sortOrder"),
    ]);
    if (brandsRes.error) {
      toast({ title: "خطأ", description: brandsRes.error.message, variant: "destructive" });
    } else {
      setBrands(brandsRes.data || []);
    }
    setCategories(catsRes.data || []);
    setLoading(false);
  };

  const filtered = brands.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.nameAr?.toLowerCase().includes(q) || b.name?.toLowerCase().includes(q) || b.slug?.toLowerCase().includes(q);
  });

  const resetForm = () => {
    setBrandName("");
    setBrandNameAr("");
    setBrandSlug("");
    setBrandLogoUrl("");
    setBrandLogoFile(null);
    setBrandSortOrder(0);
    setBrandActive(true);
    setSelectedCategoryIds([]);
    setEditingBrand(null);
  };

  const openEdit = async (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandName(brand.name || "");
    setBrandNameAr(brand.nameAr);
    setBrandSlug(brand.slug || "");
    setBrandLogoUrl(brand.logoUrl || "");
    setBrandLogoFile(null);
    setBrandSortOrder(brand.sortOrder);
    setBrandActive(brand.isActive);

    const { data } = await supabaseAdmin
      .from("brand_categories")
      .select('"categoryId"')
      .eq("brandId", brand.id);
    setSelectedCategoryIds((data || []).map((r: any) => r.categoryId));

    setShowForm(true);
  };

  const handleImageUpload = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabaseAdmin.storage.from(folder).upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabaseAdmin.storage.from(folder).getPublicUrl(fileName);
    return publicUrl;
  };

  const generateSlug = (text: string) => {
    return text
      .replace(/[^\w\s\u0600-\u06FF-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || `brand-${Date.now()}`;
  };

  const saveBrand = async () => {
    if (!brandNameAr) {
      toast({ title: "خطأ", description: "اسم العلامة التجارية بالعربية مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let logoUrl = brandLogoUrl;
      if (brandLogoFile) {
        logoUrl = await handleImageUpload(brandLogoFile, "brand-images");
      }

      const slug = brandSlug || generateSlug(brandName || brandNameAr);
      const brandData: Record<string, any> = {
        name: brandName,
        nameAr: brandNameAr,
        slug,
        logoUrl: logoUrl || null,
        isActive: brandActive,
        sortOrder: brandSortOrder,
      };

      let brandId: string;

      if (editingBrand) {
        const { error } = await supabaseAdmin.from("brands").update(brandData).eq("id", editingBrand.id);
        if (error) throw error;
        brandId = editingBrand.id;
        toast({ title: "تم", description: "تم تحديث العلامة التجارية" });
      } else {
        const { data, error } = await supabaseAdmin.from("brands").insert(brandData).select("id").single();
        if (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("slug")) {
            brandData.slug = `${slug}-${Date.now()}`;
            const { data: retryData, error: retryError } = await supabaseAdmin.from("brands").insert(brandData).select("id").single();
            if (retryError) throw retryError;
            brandId = retryData!.id;
          } else throw error;
        } else {
          brandId = data!.id;
        }
        toast({ title: "تم", description: "تم إضافة العلامة التجارية" });
      }

      // Save brand-categories associations
      await supabaseAdmin.from("brand_categories").delete().eq("brandId", brandId);
      if (selectedCategoryIds.length > 0) {
        const inserts = selectedCategoryIds.map((catId) => ({
          brandId,
          categoryId: catId,
        }));
        const { error: bcError } = await supabaseAdmin.from("brand_categories").insert(inserts);
        if (bcError) throw bcError;
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
    const { error } = await supabaseAdmin.from("brands").delete().eq("id", deletingId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف العلامة التجارية" });
      fetchData();
    }
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  const toggleActive = async (brand: BrandItem) => {
    const { error } = await supabaseAdmin
      .from("brands")
      .update({ isActive: !brand.isActive })
      .eq("id", brand.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="w-7 h-7" />
            العلامات التجارية
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة العلامات التجارية وربطها بالفئات</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="shadow-sm">
          <Plus className="w-4 h-4 ml-2" />
          إضافة علامة تجارية
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">إجمالي العلامات</p>
            <p className="text-2xl font-bold mt-1">{brands.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">العلامات النشطة</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{brands.filter((b) => b.isActive).length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">العلامات المعطلة</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{brands.filter((b) => !b.isActive).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9 bg-muted/30"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Award className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-muted-foreground">
              {search ? "لا توجد نتائج" : "لا توجد علامات تجارية بعد"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveTable
          desktop={
            <Card borderless className="shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-right font-semibold text-foreground/70">الشعار</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">الاسم</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">الرابط</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden md:table-cell">الفئات</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">الحالة</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">الترتيب</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((brand) => {
                    const brandCatCount = brand._catCount;
                    return (
                      <TableRow key={brand.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5 overflow-hidden">
                            {brand.logoUrl ? (
                              <img src={brand.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">{brand.nameAr?.charAt(0)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <div>
                            <span className="truncate block">{brand.nameAr}</span>
                            {brand.name && (
                              <span className="text-muted-foreground text-xs truncate block">{brand.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                          {brand.slug}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">-</TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleActive(brand)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                              brand.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            )}
                          >
                            {brand.isActive ? "نشط" : "معطل"}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">{brand.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(brand)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => confirmDelete(brand.id)}>
                              <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                            </Button>
                          </div>
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
              {filtered.map((brand) => (
                <Card key={brand.id} borderless className="shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5 shrink-0 overflow-hidden">
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{brand.nameAr?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{brand.nameAr}</p>
                        {brand.name && <p className="text-xs text-muted-foreground truncate">{brand.name}</p>}
                        <span className="text-xs text-muted-foreground">ترتيب: {brand.sortOrder}</span>
                      </div>
                      <button
                        onClick={() => toggleActive(brand)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                          brand.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        )}
                      >
                        {brand.isActive ? "نشط" : "معطل"}
                      </button>
                    </div>
                    <div className="flex gap-1 mt-3 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(brand)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => confirmDelete(brand.id)}>
                        <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrand ? "تعديل العلامة التجارية" : "إضافة علامة تجارية جديدة"}</DialogTitle>
            <DialogDescription>{editingBrand ? "قم بتعديل بيانات العلامة التجارية" : "أضف علامة تجارية جديدة"}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="categories" className="flex-1">الفئات</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربية *</Label>
                  <Input value={brandNameAr} onChange={(e) => setBrandNameAr(e.target.value)} placeholder="مثال: أبل" />
                </div>
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Apple" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={brandSlug}
                  onChange={(e) => setBrandSlug(e.target.value)}
                  placeholder="يُولد تلقائياً من الاسم"
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-[11px] text-muted-foreground">اتركه فارغاً ليُولد تلقائياً من الاسم</p>
              </div>
              <div className="space-y-2">
                <Label>الشعار</Label>
                <p className="text-[11px] text-muted-foreground">رابط صورة الشعار أو رفع ملف</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={brandLogoUrl}
                      onChange={(e) => { setBrandLogoUrl(e.target.value); setBrandLogoFile(null); }}
                      placeholder="https://example.com/logo.png"
                      dir="ltr"
                      className="text-left text-sm"
                    />
                  </div>
                  <label className="shrink-0 cursor-pointer">
                    <div className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">ملف</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setBrandLogoFile(file); setBrandLogoUrl(""); }
                      }}
                    />
                  </label>
                </div>
                {brandLogoFile && (
                  <div className="relative inline-block mt-2">
                    <img src={URL.createObjectURL(brandLogoFile)} alt="" className="w-20 h-20 object-contain rounded-lg ring-1 ring-black/5 bg-muted p-2" />
                    <button type="button" onClick={() => setBrandLogoFile(null)} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                  </div>
                )}
                {!brandLogoFile && brandLogoUrl && (
                  <div className="relative inline-block mt-2">
                    <img src={brandLogoUrl} alt="" className="w-20 h-20 object-contain rounded-lg ring-1 ring-black/5 bg-muted p-2" />
                    <button type="button" onClick={() => setBrandLogoUrl("")} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input type="number" value={brandSortOrder} onChange={(e) => setBrandSortOrder(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={brandActive} onCheckedChange={setBrandActive} />
                  <Label className="text-sm">{brandActive ? "نشط" : "معطل"}</Label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="categories" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">اختر الفئات التي تظهر فيها هذه العلامة التجارية</p>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد فئات بعد</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-sm text-right transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{cat.nameAr}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                تم تحديد {selectedCategoryIds.length} من {categories.length} فئة
              </p>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={saveBrand} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingBrand ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف العلامة التجارية</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذه العلامة التجارية؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletingId(null); }}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
