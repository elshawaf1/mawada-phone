import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Plus, Edit, Trash2, ImagePlus, Loader2, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Banner {
  id: string;
  title: string | null;
  titleAr: string | null;
  imageUrl: string;
  linkType: string | null;
  linkId: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string | null;
  imageUrl: string | null;
  homeImageUrl: string | null;
  searchImageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
}

interface Product {
  id: string;
  name: string;
  nameAr: string;
}

const linkTypeLabels: Record<string, string> = {
  product: "منتج",
  category: "فئة",
  brand: "علامة تجارية",
  external: "رابط خارجي",
};

const commonIcons = [
  "Smartphone", "Laptop", "Headphones", "Watch", "Tablet", "Camera",
  "Monitor", "Speaker", "Gamepad2", "Mouse", "Keyboard", "Tv",
  "Printer", "HardDrive", "Usb", "Battery", "Wifi", "Bluetooth",
  "Shield", "Star", "Heart", "ShoppingBag", "Gift", "Tag",
];

export default function Marketing() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Banner state
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerTitleAr, setBannerTitleAr] = useState("");
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerLinkType, setBannerLinkType] = useState("external");
  const [bannerLinkId, setBannerLinkId] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [bannerSortOrder, setBannerSortOrder] = useState(0);
  const [bannerActive, setBannerActive] = useState(true);

  // Category state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catNameAr, setCatNameAr] = useState("");
  const [catIcon, setCatIcon] = useState("Smartphone");
  const [catParentId, setCatParentId] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catActive, setCatActive] = useState(true);
  const [catHomeImageUrl, setCatHomeImageUrl] = useState("");
  const [catSearchImageUrl, setCatSearchImageUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bannersRes, categoriesRes, productsRes] = await Promise.all([
        supabaseAdmin.from("banners").select("*").order("sortOrder"),
        supabaseAdmin.from("categories").select("*").order("sortOrder"),
        supabaseAdmin.from("products").select("id, name, nameAr").eq("isActive", true),
      ]);

      setBanners(bannersRes.data || []);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Banner handlers
  const resetBannerForm = () => {
    setBannerTitle("");
    setBannerTitleAr("");
    setBannerImage(null);
    setBannerImageUrl("");
    setBannerLinkType("external");
    setBannerLinkId("");
    setBannerLinkUrl("");
    setBannerSortOrder(0);
    setBannerActive(true);
    setEditingBanner(null);
  };

  const handleBannerImageUpload = async () => {
    if (!bannerImage) return bannerImageUrl;

    const fileExt = bannerImage.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { data, error } = await supabaseAdmin.storage
      .from("banner-images")
      .upload(fileName, bannerImage);

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("banner-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const saveBanner = async () => {
    if (!bannerTitleAr) {
      toast({ title: "خطأ", description: "اسم البانر بالعربية مطلوب", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let imageUrl = bannerImageUrl;
      if (bannerImage) {
        imageUrl = await handleBannerImageUpload();
      }

      const bannerData = {
        title: bannerTitle,
        titleAr: bannerTitleAr,
        imageUrl,
        linkType: bannerLinkType,
        linkId: bannerLinkId || null,
        linkUrl: bannerLinkUrl || null,
        isActive: bannerActive,
        sortOrder: bannerSortOrder,
      };

      if (editingBanner) {
        const { error } = await supabaseAdmin
          .from("banners")
          .update(bannerData)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast({ title: "تم", description: "تم تحديث البانر" });
      } else {
        const { error } = await supabaseAdmin.from("banners").insert(bannerData);
        if (error) throw error;
        toast({ title: "تم", description: "تم إضافة البانر" });
      }

      setShowBannerForm(false);
      resetBannerForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const editBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title || "");
    setBannerTitleAr(banner.titleAr || "");
    setBannerImageUrl(banner.imageUrl);
    setBannerLinkType(banner.linkType || "external");
    setBannerLinkId(banner.linkId || "");
    setBannerLinkUrl(banner.linkUrl || "");
    setBannerSortOrder(banner.sortOrder);
    setBannerActive(banner.isActive);
    setShowBannerForm(true);
  };

  const deleteBanner = async (id: string) => {
    const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف البانر" });
      fetchData();
    }
  };

  const toggleBannerActive = async (banner: Banner) => {
    const { error } = await supabaseAdmin
      .from("banners")
      .update({ isActive: !banner.isActive })
      .eq("id", banner.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  // Category handlers
  const resetCategoryForm = () => {
    setCatName("");
    setCatNameAr("");
    setCatIcon("Smartphone");
    setCatParentId("");
    setCatSortOrder(0);
    setCatActive(true);
    setCatHomeImageUrl("");
    setCatSearchImageUrl("");
    setEditingCategory(null);
  };

  const saveCategory = async () => {
    if (!catNameAr) {
      toast({ title: "خطأ", description: "اسم الفئة بالعربية مطلوب", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const nameSource = catName || catNameAr;
      const baseSlug = nameSource
        .replace(/[^\w\s\u0600-\u06FF-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || `category-${Date.now()}`;

      const catData: Record<string, any> = {
        name: catName,
        nameAr: catNameAr,
        slug: baseSlug,
        icon: catIcon,
        parentId: catParentId || null,
        isActive: catActive,
        sortOrder: catSortOrder,
      };

      if (catHomeImageUrl) catData.homeImageUrl = catHomeImageUrl;
      if (catSearchImageUrl) catData.searchImageUrl = catSearchImageUrl;

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
            catData.slug = `${baseSlug}-${Date.now()}`;
            const { error: retryError } = await supabaseAdmin.from("categories").insert(catData);
            if (retryError) throw retryError;
          } else throw error;
        }
        toast({ title: "تم", description: "تم إضافة الفئة" });
      }

      setShowCategoryForm(false);
      resetCategoryForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setCatName(category.name || "");
    setCatNameAr(category.nameAr);
    setCatIcon(category.icon || "Smartphone");
    setCatParentId(category.parentId || "");
    setCatSortOrder(category.sortOrder);
    setCatActive(category.isActive);
    setCatHomeImageUrl(category.homeImageUrl || "");
    setCatSearchImageUrl(category.searchImageUrl || "");
    setShowCategoryForm(true);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف الفئة" });
      fetchData();
    }
  };

  const toggleCategoryActive = async (category: Category) => {
    const { error } = await supabase
      .from("categories")
      .update({ isActive: !category.isActive })
      .eq("id", category.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">التسويق</h1>
        <p className="text-muted-foreground mt-1">إدارة البانرات والفئات</p>
      </div>



      <Tabs defaultValue="banners">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="banners" className="data-[state=active]:shadow-sm">البانرات</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:shadow-sm">الفئات</TabsTrigger>
        </TabsList>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetBannerForm(); setShowBannerForm(true); }} className="shadow-sm">
              <Plus className="w-4 h-4 ml-2" />
              إضافة بانر
            </Button>
          </div>

          {banners.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
                  <ImagePlus className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground">لا توجد بانرات بعد</p>
              </CardContent>
            </Card>
          ) : (
            <ResponsiveTable
              desktop={
                <Card borderless className="shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-right font-semibold text-foreground/70">الصورة</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">العنوان</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">الرابط</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">الحالة</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">الترتيب</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {banners.map((banner) => (
                        <TableRow key={banner.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <img src={banner.imageUrl} alt="" className="w-16 h-10 object-cover rounded-lg ring-1 ring-black/5" />
                          </TableCell>
                          <TableCell className="font-medium">{banner.titleAr || banner.title}</TableCell>
                          <TableCell>
                            {banner.linkType && (
                              <Badge variant="outline" className="font-medium">{linkTypeLabels[banner.linkType] || banner.linkType}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch checked={banner.isActive} onCheckedChange={() => toggleBannerActive(banner)} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{banner.sortOrder}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => editBanner(banner)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => deleteBanner(banner.id)}>
                                <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              }
              mobile={
                <div className="space-y-3">
                  {banners.map((banner) => (
                    <Card key={banner.id} borderless className="shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <img src={banner.imageUrl} alt="" className="w-20 h-12 object-cover rounded-lg ring-1 ring-black/5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{banner.titleAr || banner.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {banner.linkType && (
                                <Badge variant="outline" className="text-[10px] font-medium">{linkTypeLabels[banner.linkType] || banner.linkType}</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">ترتيب: {banner.sortOrder}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Switch checked={banner.isActive} onCheckedChange={() => toggleBannerActive(banner)} />
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => editBanner(banner)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => deleteBanner(banner.id)}>
                              <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              }
            />
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCategoryForm(); setShowCategoryForm(true); }} className="shadow-sm">
              <Plus className="w-4 h-4 ml-2" />
              إضافة فئة
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
                  <LayoutGrid className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground">لا توجد فئات بعد</p>
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
                        <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">صورة الصفحة الرئيسية</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70 hidden md:table-cell">أيقونة صفحة البحث</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70 hidden md:table-cell">الفئة الأب</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">الحالة</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70 hidden sm:table-cell">الترتيب</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => {
                        const parent = categories.find(c => c.id === category.parentId);
                        return (
                          <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5">
                                <span className="text-xs font-medium text-muted-foreground">{category.icon}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{category.nameAr}{category.name ? <span className="text-muted-foreground text-xs"> ({category.name})</span> : ""}</TableCell>
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
                            <TableCell className="text-muted-foreground hidden md:table-cell">{parent?.nameAr || "-"}</TableCell>
                            <TableCell>
                              <Switch checked={category.isActive} onCheckedChange={() => toggleCategoryActive(category)} />
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell">{category.sortOrder}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary" onClick={() => editCategory(category)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => deleteCategory(category.id)}>
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
                  {categories.map((category) => {
                    const parent = categories.find(c => c.id === category.parentId);
                    return (
                      <Card key={category.id} borderless className="shadow-sm overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center ring-1 ring-black/5 shrink-0">
                              <span className="text-xs font-medium text-muted-foreground">{category.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{category.nameAr}</p>
                              {category.name && <p className="text-xs text-muted-foreground truncate">{category.name}</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {parent && <Badge variant="outline" className="text-[10px]">{parent.nameAr}</Badge>}
                                <span className="text-xs text-muted-foreground">ترتيب: {category.sortOrder}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Switch checked={category.isActive} onCheckedChange={() => toggleCategoryActive(category)} />
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => editCategory(category)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => deleteCategory(category.id)}>
                                <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Banner Form Dialog */}
      <Dialog open={showBannerForm} onOpenChange={setShowBannerForm}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "تعديل البانر" : "إضافة بانر"}</DialogTitle>
            <DialogDescription>{editingBanner ? "قم بتعديل بيانات البانر" : "أضف بانر جديد للصفحة الرئيسية"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العنوان (English)</Label>
                <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>العنوان (العربية)</Label>
                <Input value={bannerTitleAr} onChange={(e) => setBannerTitleAr(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الصورة</Label>
              {bannerImageUrl && <img src={bannerImageUrl} alt="" className="w-full h-32 object-cover rounded mb-2" />}
              <Input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setBannerImage(file);
              }} />
            </div>

            <div className="space-y-2">
              <Label>نوع الرابط</Label>
              <Select value={bannerLinkType} onValueChange={setBannerLinkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">رابط خارجي</SelectItem>
                  <SelectItem value="product">منتج</SelectItem>
                  <SelectItem value="category">فئة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bannerLinkType === "external" && (
              <div className="space-y-2">
                <Label>الرابط</Label>
                <Input value={bannerLinkUrl} onChange={(e) => setBannerLinkUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {bannerLinkType === "product" && (
              <div className="space-y-2">
                <Label>اختر المنتج</Label>
                <Select value={bannerLinkId} onValueChange={setBannerLinkId}>
                  <SelectTrigger><SelectValue placeholder="اختر منتجًا" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nameAr || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الترتيب</Label>
                <Input type="number" value={bannerSortOrder} onChange={(e) => setBannerSortOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={bannerActive} onCheckedChange={setBannerActive} />
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBannerForm(false)}>إلغاء</Button>
            <Button onClick={saveBanner} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingBanner ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "تعديل الفئة" : "إضافة فئة"}</DialogTitle>
            <DialogDescription>{editingCategory ? "قم بتعديل بيانات الفئة" : "أضف فئة جديدة"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>الاسم (العربية)</Label>
                <Input value={catNameAr} onChange={(e) => setCatNameAr(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {commonIcons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`p-2 rounded-lg border text-xs text-center transition-colors ${catIcon === icon ? "border-primary bg-primary/10" : "border-muted hover:bg-muted"}`}
                    onClick={() => setCatIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>صورة الفئة - الصفحة الرئيسية (صورة غلاف كاملة)</Label>
              <p className="text-xs text-muted-foreground">تظهر كصورة غلاف كبيرة في قسم الفئات بالصفحة الرئيسية</p>
              <Input value={catHomeImageUrl} onChange={(e) => setCatHomeImageUrl(e.target.value)} placeholder="https://..." />
              {catHomeImageUrl && <img src={catHomeImageUrl} alt="" className="w-full h-24 object-cover rounded mt-2 ring-1 ring-black/5" />}
            </div>

            <div className="space-y-2">
              <Label>أيقونة الفئة - صفحة البحث (أيقونة صغيرة)</Label>
              <p className="text-xs text-muted-foreground">تظهر كأيقونة صغيرة دائرية في قسم الفئات بصفحة البحث</p>
              <Input value={catSearchImageUrl} onChange={(e) => setCatSearchImageUrl(e.target.value)} placeholder="https://..." />
              {catSearchImageUrl && (
                <div className="flex justify-center mt-2">
                  <img src={catSearchImageUrl} alt="" className="w-12 h-12 object-contain rounded-full ring-1 ring-black/5 bg-muted" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>الفئة الأب (اختياري)</Label>
              <Select value={catParentId || undefined} onValueChange={(v) => setCatParentId(v || "")}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.id !== editingCategory?.id).map(c => (
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
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={catActive} onCheckedChange={setCatActive} />
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryForm(false)}>إلغاء</Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingCategory ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
