import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Plus, Edit, Trash2, ImagePlus, Loader2 } from "lucide-react";
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

export default function Marketing() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bannersRes, productsRes] = await Promise.all([
        supabaseAdmin.from("banners").select("*").order("sortOrder"),
        supabaseAdmin.from("products").select("id, name, nameAr").eq("isActive", true),
      ]);
      setBanners(bannersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
    const { data, error } = await supabaseAdmin.storage.from("banner-images").upload(fileName, bannerImage);
    if (error) throw error;
    const { data: { publicUrl } } = supabaseAdmin.storage.from("banner-images").getPublicUrl(fileName);
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
      if (bannerImage) imageUrl = await handleBannerImageUpload();

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
        const { error } = await supabaseAdmin.from("banners").update(bannerData).eq("id", editingBanner.id);
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
    const { error } = await supabaseAdmin.from("banners").update({ isActive: !banner.isActive }).eq("id", banner.id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">البانرات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة بانرات الصفحة الرئيسية</p>
        </div>
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
                    {products.map((p) => (
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
    </div>
  );
}
