import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  FolderTree, LayoutGrid, Link as LinkIcon, Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  homeImageUrl: string | null;
  searchImageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const commonIcons = [
  "Smartphone", "Laptop", "Headphones", "Watch", "Tablet", "Camera",
  "Monitor", "Speaker", "Gamepad2", "Mouse", "Keyboard", "Tv",
  "Printer", "HardDrive", "Usb", "Battery", "Wifi", "Bluetooth",
  "Shield", "Star", "Heart", "ShoppingBag", "Gift", "Tag",
];

export default function Categories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [catName, setCatName] = useState("");
  const [catNameAr, setCatNameAr] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("Smartphone");
  const [catIconMode, setCatIconMode] = useState<"preset" | "url">("preset");
  const [catIconUrl, setCatIconUrl] = useState("");
  const [catIconFile, setCatIconFile] = useState<File | null>(null);
  const [catHomeImageUrl, setCatHomeImageUrl] = useState("");
  const [catHomeImageFile, setCatHomeImageFile] = useState<File | null>(null);
  const [catSearchImageUrl, setCatSearchImageUrl] = useState("");
  const [catSearchImageFile, setCatSearchImageFile] = useState<File | null>(null);
  const [catParentId, setCatParentId] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catActive, setCatActive] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("sortOrder");
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const filtered = categories.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nameAr?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.slug?.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setCatName("");
    setCatNameAr("");
    setCatSlug("");
    setCatIcon("Smartphone");
    setCatIconMode("preset");
    setCatIconUrl("");
    setCatIconFile(null);
    setCatHomeImageUrl("");
    setCatHomeImageFile(null);
    setCatSearchImageUrl("");
    setCatSearchImageFile(null);
    setCatParentId("");
    setCatSortOrder(0);
    setCatActive(true);
    setEditingCategory(null);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name || "");
    setCatNameAr(cat.nameAr);
    setCatSlug(cat.slug || "");
    if (cat.icon && commonIcons.includes(cat.icon)) {
      setCatIconMode("preset");
      setCatIcon(cat.icon);
      setCatIconUrl("");
    } else if (cat.icon) {
      setCatIconMode("url");
      setCatIconUrl(cat.icon);
      setCatIcon("Smartphone");
    } else {
      setCatIconMode("preset");
      setCatIcon("Smartphone");
      setCatIconUrl("");
    }
    setCatIconFile(null);
    setCatHomeImageUrl(cat.homeImageUrl || "");
    setCatHomeImageFile(null);
    setCatSearchImageUrl(cat.searchImageUrl || "");
    setCatSearchImageFile(null);
    setCatParentId(cat.parentId || "");
    setCatSortOrder(cat.sortOrder);
    setCatActive(cat.isActive);
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
      .toLowerCase() || `category-${Date.now()}`;
  };

  const saveCategory = async () => {
    if (!catNameAr) {
      toast({ title: "خطأ", description: "اسم الفئة بالعربية مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let homeUrl = catHomeImageUrl;
      let searchUrl = catSearchImageUrl;
      if (catHomeImageFile) {
        homeUrl = await handleImageUpload(catHomeImageFile, "category-images");
      }
      if (catSearchImageFile) {
        searchUrl = await handleImageUpload(catSearchImageFile, "category-images");
      }

      let iconValue = catIconMode === "url" ? catIconUrl : catIcon;
      if (catIconFile) {
        iconValue = await handleImageUpload(catIconFile, "category-images");
      }

      const slug = catSlug || generateSlug(catName || catNameAr);

      const catData: Record<string, any> = {
        name: catName,
        nameAr: catNameAr,
        slug,
        icon: iconValue || null,
        parentId: catParentId || null,
        isActive: catActive,
        sortOrder: catSortOrder,
      };

      if (homeUrl) catData.homeImageUrl = homeUrl;
      if (searchUrl) catData.searchImageUrl = searchUrl;

      if (editingCategory) {
        const { error } = await supabaseAdmin
          .from("categories")
          .update(catData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast({ title: "تم", description: "تم تحديث الفئة" });
      } else {
        const { error } = await supabaseAdmin.from("categories").insert(catData);
        if (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("slug")) {
            catData.slug = `${slug}-${Date.now()}`;
            const { error: retryError } = await supabaseAdmin.from("categories").insert(catData);
            if (retryError) throw retryError;
          } else throw error;
        }
        toast({ title: "تم", description: "تم إضافة الفئة" });
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
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", deletingId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف الفئة" });
      fetchData();
    }
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ isActive: !cat.isActive })
      .eq("id", cat.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId)?.nameAr;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="w-7 h-7" />
            الفئات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة فئات المنتجات والأقسام</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="shadow-sm">
          <Plus className="w-4 h-4 ml-2" />
          إضافة فئة
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">إجمالي الفئات</p>
            <p className="text-2xl font-bold mt-1">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">الفئات النشطة</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{categories.filter((c) => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">الفئات المعطلة</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{categories.filter((c) => !c.isActive).length}</p>
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
              <FolderTree className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-muted-foreground">
              {search ? "لا توجد نتائج" : "لا توجد فئات بعد"}
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
                    <TableHead className="text-right font-semibold text-foreground/70">الأيقونة</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">الاسم</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">الرابط</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">صورة الرئيسية</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden md:table-cell">صورة البحث</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden md:table-cell">الفئة الأب</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">الحالة</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">الترتيب</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((category) => {
                    const parentName = getParentName(category.parentId);
                    return (
                      <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5 overflow-hidden">
                            {category.icon && category.icon.startsWith("http") ? (
                              <img src={category.icon} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">{category.icon || "-"}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[220px]">
                          <div>
                            <span className="truncate block">{category.nameAr}</span>
                            {category.name && (
                              <span className="text-muted-foreground text-xs truncate block">{category.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                          {category.slug}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {category.homeImageUrl ? (
                            <img src={category.homeImageUrl} alt="" className="w-12 h-8 object-cover rounded ring-1 ring-black/5" />
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {category.searchImageUrl ? (
                            <img src={category.searchImageUrl} alt="" className="w-8 h-8 object-contain rounded-full ring-1 ring-black/5 bg-muted" />
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell text-sm">
                          {parentName || "-"}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleActive(category)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                              category.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            )}
                          >
                            {category.isActive ? "نشط" : "معطل"}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">{category.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(category)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => confirmDelete(category.id)}>
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
              {filtered.map((category) => {
                const parentName = getParentName(category.parentId);
                return (
                  <Card key={category.id} borderless className="shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5 shrink-0 overflow-hidden">
                          {category.icon && category.icon.startsWith("http") ? (
                            <img src={category.icon} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">{category.icon || "-"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{category.nameAr}</p>
                          {category.name && <p className="text-xs text-muted-foreground truncate">{category.name}</p>}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {parentName && <Badge variant="outline" className="text-[10px]">{parentName}</Badge>}
                            <span className="text-xs text-muted-foreground">ترتيب: {category.sortOrder}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleActive(category)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                            category.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          )}
                        >
                          {category.isActive ? "نشط" : "معطل"}
                        </button>
                      </div>
                      <div className="flex gap-1 mt-3 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(category)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => confirmDelete(category.id)}>
                          <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          }
        />
      )}

      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
            <DialogDescription>{editingCategory ? "قم بتعديل بيانات الفئة" : "أضف فئة جديدة لتصنيف المنتجات"}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="images" className="flex-1">الصور والأيقونات</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربية *</Label>
                  <Input value={catNameAr} onChange={(e) => setCatNameAr(e.target.value)} placeholder="مثال: الهواتف الذكية" />
                </div>
                <div className="space-y-2">
                  <Label>Name (English)</Label>
                  <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Smartphones" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="يُولد تلقائياً من الاسم"
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-[11px] text-muted-foreground">اتركه فارغاً ليُولد تلقائياً من الاسم</p>
              </div>
              <div className="space-y-2">
                <Label>الفئة الأب (اختياري)</Label>
                <Select value={catParentId || "__none__"} onValueChange={(v) => setCatParentId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="بدون (فئة رئيسية)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون (فئة رئيسية)</SelectItem>
                    {categories.filter((c) => c.id !== editingCategory?.id).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input type="number" value={catSortOrder} onChange={(e) => setCatSortOrder(Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={catActive} onCheckedChange={setCatActive} />
                  <Label className="text-sm">{catActive ? "نشط" : "معطل"}</Label>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="images" className="space-y-5 mt-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">الأيقونة</Label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      catIconMode === "preset" ? "border-primary bg-primary/10 text-primary" : "border-muted hover:bg-muted"
                    )}
                    onClick={() => setCatIconMode("preset")}
                  >
                    أيقونة جاهزة
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      catIconMode === "url" ? "border-primary bg-primary/10 text-primary" : "border-muted hover:bg-muted"
                    )}
                    onClick={() => setCatIconMode("url")}
                  >
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3" />
                      رابط / ملف
                    </span>
                  </button>
                </div>
                {catIconMode === "preset" ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {commonIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={cn(
                          "p-2 rounded-lg border text-[11px] text-center transition-colors",
                          catIcon === icon ? "border-primary bg-primary/10 text-primary font-medium" : "border-muted hover:bg-muted text-muted-foreground"
                        )}
                        onClick={() => setCatIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={catIconUrl}
                          onChange={(e) => { setCatIconUrl(e.target.value); setCatIconFile(null); }}
                          placeholder="https://example.com/icon.png"
                          dir="ltr"
                          className="text-left text-sm"
                        />
                      </div>
                      <label className="shrink-0 cursor-pointer">
                        <div className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">ملف</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) { setCatIconFile(file); setCatIconUrl(""); }
                          }}
                        />
                      </label>
                    </div>
                    {catIconFile && (
                      <div className="relative inline-block">
                        <img src={URL.createObjectURL(catIconFile)} alt="" className="w-14 h-14 object-contain rounded-lg ring-1 ring-black/5 bg-muted" />
                        <button type="button" onClick={() => setCatIconFile(null)} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                      </div>
                    )}
                    {!catIconFile && catIconUrl && (
                      <div className="relative inline-block">
                        <img src={catIconUrl} alt="" className="w-14 h-14 object-contain rounded-lg ring-1 ring-black/5 bg-muted" />
                        <button type="button" onClick={() => setCatIconUrl("")} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">صورة الصفحة الرئيسية</Label>
                <p className="text-[11px] text-muted-foreground">تظهر كصورة غلاف كبيرة في قسم الفئات</p>
                <div className="flex items-center gap-3">
                  <label className="shrink-0 cursor-pointer">
                    <div className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">اختر صورة</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCatHomeImageFile(file); setCatHomeImageUrl(""); }
                    }} />
                  </label>
                  {catHomeImageFile && (
                    <div className="relative">
                      <img src={URL.createObjectURL(catHomeImageFile)} alt="" className="w-20 h-14 object-cover rounded ring-1 ring-black/5" />
                      <button type="button" onClick={() => setCatHomeImageFile(null)} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  {!catHomeImageFile && catHomeImageUrl && (
                    <div className="relative">
                      <img src={catHomeImageUrl} alt="" className="w-20 h-14 object-cover rounded ring-1 ring-black/5" />
                      <button type="button" onClick={() => setCatHomeImageUrl("")} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                </div>
                <Input
                  value={catHomeImageUrl}
                  onChange={(e) => { setCatHomeImageUrl(e.target.value); setCatHomeImageFile(null); }}
                  placeholder="أو الصق رابط الصورة هنا..."
                  dir="ltr"
                  className="text-left text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">أيقونة صفحة البحث</Label>
                <p className="text-[11px] text-muted-foreground">تظهر كأيقونة صغيرة دائرية في صفحة البحث</p>
                <div className="flex items-center gap-3">
                  <label className="shrink-0 cursor-pointer">
                    <div className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">اختر صورة</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCatSearchImageFile(file); setCatSearchImageUrl(""); }
                    }} />
                  </label>
                  {catSearchImageFile && (
                    <div className="relative">
                      <img src={URL.createObjectURL(catSearchImageFile)} alt="" className="w-14 h-14 object-contain rounded-full ring-1 ring-black/5 bg-muted" />
                      <button type="button" onClick={() => setCatSearchImageFile(null)} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                  {!catSearchImageFile && catSearchImageUrl && (
                    <div className="relative">
                      <img src={catSearchImageUrl} alt="" className="w-14 h-14 object-contain rounded-full ring-1 ring-black/5 bg-muted" />
                      <button type="button" onClick={() => setCatSearchImageUrl("")} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center">&times;</button>
                    </div>
                  )}
                </div>
                <Input
                  value={catSearchImageUrl}
                  onChange={(e) => { setCatSearchImageUrl(e.target.value); setCatSearchImageFile(null); }}
                  placeholder="أو الصق رابط الصورة هنا..."
                  dir="ltr"
                  className="text-left text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingCategory ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف الفئة</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذه الفئة؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
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
