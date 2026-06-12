import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Edit, Trash2, X, ImagePlus, Loader2, MoreHorizontal, Package, Tag, AlertTriangle, TrendingUp, EyeOff, Eye, Star, Copy } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SkeletonKPI, SkeletonTable } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  categoryId: string | null;
  brandId: string | null;
  basePrice: number;
  salePrice: number | null;
  isOnSale: boolean;
  totalStock: number;
  sku: string | null;
  isActive: boolean;
  isFeatured: boolean;
  usePriceRange: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: string;
  categories?: { name: string; nameAr: string } | { name: string; nameAr: string }[] | null;
  brands?: { name: string; nameAr: string } | { name: string; nameAr: string }[] | null;
  product_images?: { id: string; url: string; isPrimary: boolean; sortOrder: number }[];
}

const catName = (c: Product["categories"]) => Array.isArray(c) ? c[0]?.nameAr : c?.nameAr;

interface Category { id: string; name: string; nameAr: string; }
interface Brand { id: string; name: string; nameAr: string; }
interface Variant {
  id?: string; color: string | null; colorHex: string | null;
  storage: string | null; ram: string | null; price: number; stock: number; sku: string | null; batteryHealth: number | null; taxRate: number; _isNew?: boolean; _tempId?: string;
}
interface Spec {
  id?: string; groupName: string; key: string; value: string; sortOrder: number; _isNew?: boolean;
}

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [isOnSale, setIsOnSale] = useState(false);
  const [usePriceRange, setUsePriceRange] = useState(false);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [totalStock, setTotalStock] = useState(0);
  const [sku, setSku] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<{ id?: string; url: string; isPrimary: boolean; sortOrder: number; file?: File }[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabaseAdmin.from("products")
          .select("*, categories(name, nameAr), brands(name, nameAr), product_images(id, url, isPrimary, sortOrder)")
          .order("createdAt", { ascending: false }),
        supabaseAdmin.from("categories").select("id, name, nameAr").order("sortOrder"),
        supabaseAdmin.from("brands").select("id, name, nameAr").order("sortOrder"),
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setNameAr(""); setDescription(""); setDescriptionAr("");
    setCategoryId(""); setBrandId(""); setBasePrice(0); setSalePrice(null);
    setIsOnSale(false); setUsePriceRange(false); setMinPrice(0); setMaxPrice(0);
    setTotalStock(0); setSku("");
    setIsActive(true); setIsFeatured(false); setImages([]); setVariants([]); setSpecs([]);
    setEditingProduct(null);
  };

  const openEdit = async (product: Product) => {
    setEditingProduct(product);
    setName(product.name || "");
    setNameAr(product.nameAr);
    setDescription(product.description || "");
    setDescriptionAr(product.descriptionAr || "");
    setCategoryId(product.categoryId || "");
    setBrandId(product.brandId || "");
    setBasePrice(product.basePrice);
    setSalePrice(product.salePrice);
    setIsOnSale(product.isOnSale);
    setUsePriceRange(product.usePriceRange || false);
    setMinPrice(product.minPrice || 0);
    setMaxPrice(product.maxPrice || 0);
    setTotalStock(product.totalStock);
    setSku(product.sku || "");
    setIsActive(product.isActive);
    setIsFeatured(product.isFeatured);
    setImages(product.product_images?.map(img => ({ ...img })) || []);
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("*")
      .eq("productId", product.id)
      .order("createdAt");
    setVariants((existingVariants || []).map(v => ({
      id: v.id, color: v.color, colorHex: v.colorHex,
      storage: v.storage, ram: v.ram, price: v.price, stock: v.stock, sku: v.sku, batteryHealth: v.batteryHealth, taxRate: v.taxRate || 0,
    })));
    const { data: existingSpecs } = await supabase
      .from("specifications")
      .select("*")
      .eq("productId", product.id)
      .order("sortOrder");
    setSpecs((existingSpecs || []).map(s => ({
      id: s.id, groupName: s.groupName, key: s.key, value: s.value, sortOrder: s.sortOrder,
    })));
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!nameAr) {
      toast({ title: "خطأ", description: "اسم المنتج بالعربية مطلوب", variant: "destructive" });
      return;
    }
    if (usePriceRange) {
      if (minPrice <= 0 || maxPrice <= 0 || minPrice > maxPrice) {
        toast({ title: "خطأ", description: "الحد الأدنى والأقصى للسعر يجب أن يكونا صحيحيْن والحد الأدنى أقل من الأقصى", variant: "destructive" });
        return;
      }
    } else {
      if (basePrice <= 0) {
        toast({ title: "خطأ", description: "السعر الأساسي مطلوب", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    const uploadedFileNames: string[] = [];
    try {
      const uploadedUrls: { url: string; isPrimary: boolean; sortOrder: number }[] = [];
      for (const img of images) {
        if (img.file) {
          const fileExt = img.file.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const { error } = await supabaseAdmin.storage.from("product-images").upload(fileName, img.file);
          if (error) throw error;
          uploadedFileNames.push(fileName);
          const { data: { publicUrl } } = supabaseAdmin.storage.from("product-images").getPublicUrl(fileName);
          uploadedUrls.push({ url: publicUrl, isPrimary: img.isPrimary, sortOrder: img.sortOrder });
        }
      }

      const imageRecords: { url: string; isPrimary: boolean; sortOrder: number }[] = images
        .filter(img => !img.file)
        .map(img => ({ url: img.url, isPrimary: img.isPrimary, sortOrder: img.sortOrder }));
      for (const u of uploadedUrls) imageRecords.push(u);

      const nameSource = name || nameAr;
      let slug = nameSource.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || `product-${Date.now()}`;

      const productData = {
        name, nameAr, slug, description, descriptionAr,
        categoryId: categoryId || null, brandId: brandId || null,
        basePrice: usePriceRange ? 0 : basePrice,
        salePrice: usePriceRange ? null : salePrice,
        isOnSale: usePriceRange ? false : isOnSale,
        usePriceRange,
        minPrice: usePriceRange ? minPrice : null,
        maxPrice: usePriceRange ? maxPrice : null,
        totalStock,
        sku: sku || null, isActive, isFeatured,
        updatedAt: new Date().toISOString(),
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabaseAdmin.from("products").update(productData).eq("id", editingProduct.id);
        if (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("slug")) {
            productData.slug = `${slug}-${Date.now()}`;
            const { error: retryError } = await supabaseAdmin.from("products").update(productData).eq("id", editingProduct.id);
            if (retryError) throw retryError;
          } else throw error;
        }
        productId = editingProduct.id;
        const { data: oldImages } = await supabaseAdmin.from("product_images").select("url").eq("productId", productId);
        const oldImageUrls = (oldImages || []).map(img => img.url);
        const removedUrls = oldImageUrls.filter(url => !imageRecords.map(r => r.url).includes(url));
        for (const url of removedUrls) {
          const parts = url.split("/");
          await supabaseAdmin.storage.from("product-images").remove([parts[parts.length - 1]]).catch(() => {});
        }
        await Promise.all([
          supabaseAdmin.from("product_images").delete().eq("productId", productId),
          supabaseAdmin.from("product_variants").delete().eq("productId", productId),
          supabaseAdmin.from("specifications").delete().eq("productId", productId),
        ]);
      } else {
        const { data, error } = await supabaseAdmin.from("products").insert(productData).select().single();
        if (error) {
          if (error.message?.includes("duplicate") || error.message?.includes("slug")) {
            productData.slug = `${slug}-${Date.now()}`;
            const { data: retryData, error: retryError } = await supabaseAdmin.from("products").insert(productData).select().single();
            if (retryError) throw retryError;
            productId = retryData.id;
          } else throw error;
        } else productId = data.id;
      }

      if (imageRecords.length > 0) {
        const { error: imgError } = await supabaseAdmin.from("product_images").insert(imageRecords.map(img => ({ ...img, productId })));
        if (imgError) throw imgError;
      }
      if (variants.length > 0) {
        const { error: varError } = await supabaseAdmin.from("product_variants").insert(variants.map(v => ({
          productId, color: v.color, colorHex: v.colorHex, storage: v.storage, ram: v.ram, price: v.price, stock: v.stock, sku: v.sku, batteryHealth: v.batteryHealth, taxRate: v.taxRate || 0,
        })));
        if (varError) throw varError;
      }
      if (specs.length > 0) {
        const { error: specError } = await supabaseAdmin.from("specifications").insert(specs.map(s => ({
          productId, groupName: s.groupName, key: s.key, value: s.value, sortOrder: s.sortOrder,
        })));
        if (specError) throw specError;
      }

      toast({ title: "تم", description: editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج" });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      for (const fileName of uploadedFileNames) {
        await supabaseAdmin.storage.from("product-images").remove([fileName]).catch(() => {});
      }
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
    const { error } = await supabaseAdmin.from("products").delete().eq("id", deletingId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم حذف المنتج" });
      setShowDeleteDialog(false);
      setDeletingId(null);
      fetchData();
    }
  };

  const duplicateProduct = async (product: Product) => {
    try {
      setSaving(true);
      const { data: images } = await supabaseAdmin.from("product_images").select("*").eq("productId", product.id);
      const { data: variantsData } = await supabaseAdmin.from("product_variants").select("*").eq("productId", product.id);
      const { data: specsData } = await supabaseAdmin.from("specifications").select("*").eq("productId", product.id);

      const newNameAr = `${product.nameAr} (نسخة)`;
      const nameSource = product.name || newNameAr;
      let slug = nameSource.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || `product-${Date.now()}`;
      slug = `${slug}-${Date.now()}`;

      const productData = {
        name: product.name,
        nameAr: newNameAr,
        slug,
        description: product.description,
        descriptionAr: product.descriptionAr,
        categoryId: product.categoryId,
        brandId: product.brandId,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        isOnSale: product.isOnSale,
        usePriceRange: product.usePriceRange || false,
        minPrice: product.minPrice || null,
        maxPrice: product.maxPrice || null,
        totalStock: 0,
        sku: product.sku ? `${product.sku}-COPY` : null,
        isActive: false,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: newProduct, error } = await supabaseAdmin.from("products").insert(productData).select().single();
      if (error) throw error;

      if (images && images.length > 0) {
        const { error: imgError } = await supabaseAdmin.from("product_images").insert(images.map(img => ({
          productId: newProduct.id,
          url: img.url,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        })));
        if (imgError) throw imgError;
      }

      if (variantsData && variantsData.length > 0) {
        const { error: varError } = await supabaseAdmin.from("product_variants").insert(variantsData.map(v => ({
          productId: newProduct.id,
          color: v.color,
          colorHex: v.colorHex,
          storage: v.storage,
          ram: v.ram,
          price: v.price,
          stock: 0,
          sku: v.sku ? `${v.sku}-COPY` : null,
          batteryHealth: v.batteryHealth,
          taxRate: v.taxRate || 0,
          isActive: v.isActive,
        })));
        if (varError) throw varError;
      }

      if (specsData && specsData.length > 0) {
        const { error: specError } = await supabaseAdmin.from("specifications").insert(specsData.map(s => ({
          productId: newProduct.id,
          groupName: s.groupName,
          key: s.key,
          value: s.value,
          sortOrder: s.sortOrder,
        })));
        if (specError) throw specError;
      }

      toast({ title: "تم", description: "تم نسخ المنتج بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    const { error } = await supabaseAdmin.from("products").update({ isActive: !product.isActive, updatedAt: new Date().toISOString() }).eq("id", product.id);
    if (!error) fetchData();
  };

  const filtered = products.filter(p => {
    const matchSearch = p.nameAr.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "ALL" || p.categoryId === categoryFilter;
    return matchSearch && matchCategory;
  });

  const getVariantId = (v: Variant) => v.id || v._tempId || `gen_${Math.random().toString(36).slice(2, 10)}`;
  
  const addVariant = () => setVariants((prev) => [...prev, { color: null, colorHex: null, storage: null, ram: null, price: 0, stock: 0, sku: null, batteryHealth: null, taxRate: 0, _isNew: true, _tempId: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}` }]);
  
  const removeVariant = async (variantId: string) => {
    const variant = variants.find(v => getVariantId(v) === variantId);
    if (variant?.id && !variant._isNew) {
      const { error } = await supabaseAdmin.from("product_variants").delete().eq("id", variant.id);
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        return;
      }
    }
    setVariants((prev) => prev.filter((v) => getVariantId(v) !== variantId));
  };
  
  const updateVariant = (variantId: string, key: keyof Variant, value: any) => {
    setVariants(variants.map((v) => getVariantId(v) === variantId ? { ...v, [key]: value } : v));
  };
  const addSpec = () => setSpecs([...specs, { groupName: "", key: "", value: "", sortOrder: specs.length, _isNew: true }]);
  const removeSpec = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, key: keyof Spec, value: any) => {
    const updated = [...specs];
    updated[i] = { ...updated[i], [key]: value };
    setSpecs(updated);
  };

  const activeCount = products.filter(p => p.isActive).length;
  const onSaleCount = products.filter(p => p.isOnSale).length;
  const lowStockCount = products.filter(p => p.totalStock > 0 && p.totalStock <= 5).length;

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-28 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 bg-muted/50 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <SkeletonTable rows={6} cols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة منتجات المتجر</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="shadow-sm">
          <Plus className="w-4 h-4 ml-2" />
          إضافة منتج
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card borderless className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Package className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70">إجمالي</p>
              <p className="text-lg font-bold font-number">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card borderless className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Tag className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70">نشط</p>
              <p className="text-lg font-bold font-number text-emerald-600">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card borderless className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70">عرض</p>
              <p className="text-lg font-bold font-number text-amber-600">{onSaleCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card borderless className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/70">مخزون منخفض</p>
              <p className="text-lg font-bold font-number text-red-600">{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="pr-10 bg-muted/50 border-border/60 focus:bg-background"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 rounded-xl bg-muted/50 border-border/60">
            <SelectValue placeholder="جميع التصنيفات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع التصنيفات</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Product Table */}
      <ResponsiveTable
        desktop={
          <Card borderless className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">قائمة المنتجات</CardTitle>
                <Badge variant="secondary" className="rounded-full text-xs font-number px-3">
                  {filtered.length} منتج
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">المنتج</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">التصنيف</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">السعر</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">المخزون</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">الحالة</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">لا توجد منتجات مطابقة</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((product) => {
                    const primaryImage = product.product_images?.find(img => img.isPrimary);
                    return (
                      <TableRow key={product.id} className={cn("hover:bg-muted/20 transition-colors border-b border-border/20", !product.isActive && "opacity-55")}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3 max-w-[280px]">
                            <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
                              {primaryImage?.url ? (
                                <img src={primaryImage.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImagePlus className="w-4 h-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{product.nameAr}</p>
                                {product.isFeatured && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full h-4 font-number bg-amber-50 text-amber-700 border-amber-200">مميز</Badge>
                                )}
                              </div>
                              {product.name && <p className="text-xs text-muted-foreground truncate">{product.name}</p>}
                              {product.sku && <p className="text-[10px] text-muted-foreground/50 font-mono font-number">{product.sku}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[11px] font-normal rounded-full px-2.5 py-0.5">
                            {catName(product.categories) || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            {product.usePriceRange ? (
                              <span className="font-number font-semibold text-sm">
                                {(product.minPrice || 0).toLocaleString("ar-EG")} - {(product.maxPrice || 0).toLocaleString("ar-EG")}
                              </span>
                            ) : (
                              <>
                                <span className={cn("font-number font-semibold text-sm", product.isOnSale ? "text-red-500 line-through" : "")}>
                                  {product.basePrice.toLocaleString("ar-EG")}
                                </span>
                                {product.isOnSale && product.salePrice && (
                                  <span className="font-number font-bold text-sm text-emerald-600">
                                    {product.salePrice.toLocaleString("ar-EG")}
                                  </span>
                                )}
                              </>
                            )}
                            <span className="text-xs text-muted-foreground/60">ج</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-number text-sm font-medium min-w-[24px]",
                              product.totalStock === 0 ? "text-red-500" : product.totalStock <= 5 ? "text-amber-600" : "text-emerald-600"
                            )}>
                              {product.totalStock}
                            </span>
                            <div className="w-14 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                              <div className={cn(
                                "h-full rounded-full",
                                product.totalStock === 0 ? "bg-red-500" : product.totalStock <= 5 ? "bg-amber-500" : "bg-emerald-500"
                              )} style={{ width: `${Math.min(100, product.totalStock)}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleActive(product)}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                                product.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                              )}
                            >
                              {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              {product.isActive ? "نشط" : "غير نشط"}
                            </button>
                            {product.isOnSale && (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0 rounded-full font-medium">
                                عرض
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-muted/60">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-xl min-w-[150px]">
                                <DropdownMenuItem onClick={() => openEdit(product)} className="cursor-pointer rounded-lg gap-2">
                                  <Edit className="w-3.5 h-3.5" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateProduct(product)} className="cursor-pointer rounded-lg gap-2">
                                  <Copy className="w-3.5 h-3.5" /> نسخ المنتج
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmDelete(product.id)} className="cursor-pointer rounded-lg gap-2 text-red-600 focus:text-red-600">
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
            </CardContent>
          </Card>
        }
        mobile={
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد منتجات مطابقة</p>
              </div>
            ) : filtered.map((product) => {
              const primaryImage = product.product_images?.find(img => img.isPrimary);
              return (
                <Card key={product.id} borderless className="shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0 bg-muted">
                        {primaryImage?.url ? (
                          <img src={primaryImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImagePlus className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-medium truncate">{product.nameAr}</p>
                            {product.isFeatured && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full h-4 font-number bg-amber-50 text-amber-700 border-amber-200 shrink-0">مميز</Badge>
                            )}
                          </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60 shrink-0">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="rounded-xl min-w-[150px]">
                                <DropdownMenuItem onClick={() => openEdit(product)} className="cursor-pointer rounded-lg gap-2">
                                  <Edit className="w-3.5 h-3.5" /> تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateProduct(product)} className="cursor-pointer rounded-lg gap-2">
                                  <Copy className="w-3.5 h-3.5" /> نسخ المنتج
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmDelete(product.id)} className="cursor-pointer rounded-lg gap-2 text-red-600 focus:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5" /> حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {product.name && <p className="text-xs text-muted-foreground truncate mt-0.5">{product.name}</p>}
                        {product.sku && <p className="text-[10px] text-muted-foreground/50 font-mono font-number mt-0.5">{product.sku}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="text-[11px] font-normal rounded-full px-2.5 py-0.5">
                        {catName(product.categories) || "-"}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {product.usePriceRange ? (
                          <span className="font-number text-sm font-semibold">
                            {(product.minPrice || 0).toLocaleString("ar-EG")} - {(product.maxPrice || 0).toLocaleString("ar-EG")}
                          </span>
                        ) : (
                          <>
                            <span className={cn("font-number text-sm", product.isOnSale ? "text-red-500 line-through" : "font-semibold")}>
                              {product.basePrice.toLocaleString("ar-EG")}
                            </span>
                            {product.isOnSale && product.salePrice && (
                              <span className="font-number font-bold text-sm text-emerald-600">
                                {product.salePrice.toLocaleString("ar-EG")}
                              </span>
                            )}
                          </>
                        )}
                        <span className="text-xs text-muted-foreground/60">ج</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={cn("font-number text-xs font-medium", product.totalStock === 0 ? "text-red-500" : product.totalStock <= 5 ? "text-amber-600" : "text-emerald-600")}>
                        {product.totalStock}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", product.totalStock === 0 ? "bg-red-500" : product.totalStock <= 5 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${Math.min(100, product.totalStock)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button onClick={() => toggleActive(product)}
                        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                          product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200")}>
                        {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {product.isActive ? "نشط" : "غير نشط"}
                      </button>
                      {product.isOnSale && (
                        <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0 rounded-full font-medium">عرض</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
      />

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            <DialogDescription>{editingProduct ? "قم بتعديل بيانات المنتج" : "أضف منتج جديد للمتجر"}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="basic" className="rounded-lg text-sm">أساسي</TabsTrigger>
              <TabsTrigger value="images" className="rounded-lg text-sm">الصور</TabsTrigger>
              <TabsTrigger value="variants" className="rounded-lg text-sm">المتغيرات</TabsTrigger>
              <TabsTrigger value="specs" className="rounded-lg text-sm">المواصفات</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الاسم (العربية) *</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="bg-muted/30 focus:bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name (English)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/30 focus:bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الوصف (العربية)</Label>
                  <Textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={3} className="bg-muted/30 focus:bg-background resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (English)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-muted/30 focus:bg-background resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الفئة</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background"><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">العلامة التجارية</Label>
                  <Select value={brandId} onValueChange={setBrandId}>
                    <SelectTrigger className="bg-muted/30 focus:bg-background"><SelectValue placeholder="اختر علامة" /></SelectTrigger>
                    <SelectContent>
                      {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={usePriceRange} onCheckedChange={setUsePriceRange} id="usePriceRange" />
                    <Label htmlFor="usePriceRange" className="text-sm cursor-pointer">نطاق سعري (حد أدنى - أقصى)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isOnSale} onCheckedChange={setIsOnSale} id="onSale" disabled={usePriceRange} />
                    <Label htmlFor="onSale" className={cn("text-sm cursor-pointer", usePriceRange && "opacity-40")}>عرض</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
                    <Label htmlFor="isActive" className="text-sm cursor-pointer">نشط</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="isFeatured" />
                    <Label htmlFor="isFeatured" className="text-sm cursor-pointer">مميز</Label>
                  </div>
                </div>
              {usePriceRange ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الحد الأدنى للسعر *</Label>
                    <Input type="number" inputMode="numeric" value={minPrice || ""} onChange={(e) => setMinPrice(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الحد الأقصى للسعر *</Label>
                    <Input type="number" inputMode="numeric" value={maxPrice || ""} onChange={(e) => setMaxPrice(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">المخزون</Label>
                    <Input type="number" inputMode="numeric" value={totalStock} onChange={(e) => setTotalStock(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">السعر الأساسي *</Label>
                    <Input type="number" inputMode="numeric" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">سعر البيع</Label>
                    <Input type="number" inputMode="numeric" value={salePrice ?? ""} onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : null)} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">المخزون</Label>
                    <Input type="number" inputMode="numeric" value={totalStock} onChange={(e) => setTotalStock(Number(e.target.value))} className="bg-muted/30 focus:bg-background font-number" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SKU</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="APL-IP16" className="bg-muted/30 focus:bg-background font-mono" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="images" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">رفع صور (حد أقصى 3)</Label>
                {images.length >= 3 ? (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> لقد وصلت للحد الأقصى من الصور (3). قم بإزالة صورة أولاً.
                  </p>
                ) : (
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.multiple = true;
                    input.onchange = (e: any) => {
                      const files = Array.from(e.target.files || []);
                      const slotsLeft = 3 - images.length;
                      const newImages = files.slice(0, slotsLeft).map(f => ({ url: "", isPrimary: false, sortOrder: images.length, file: f as File }));
                      setImages([...images, ...newImages]);
                    };
                    input.click();
                  }}>
                    <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">انقر لرفع الصور</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">PNG, JPG - حد أقصى 3 صور</p>
                  </div>
                )}
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden ring-1 ring-black/5">
                      <div className="aspect-square">
                        {(img.url || img.file) ? (
                          <img src={img.file ? URL.createObjectURL(img.file) : img.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImagePlus className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                          className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                        {!img.isPrimary && (
                          <button onClick={() => setImages(images.map((im, idx) => ({ ...im, isPrimary: idx === i })))}
                            className="w-10 h-10 bg-white/90 text-foreground rounded-full flex items-center justify-center hover:bg-white transition-colors text-xs font-bold">
                            P
                          </button>
                        )}
                      </div>
                      {img.isPrimary && (
                        <Badge className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/90 text-primary-foreground border-0">رئيسية</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={addVariant} size="sm" className="rounded-xl">
                  <Plus className="w-4 h-4 ml-1" /> إضافة خيار بديل
                </Button>
                <p className="text-sm text-muted-foreground">كل خيار = منتج بديل بسعر ومخزون مستقل</p>
              </div>
              {variants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60 border-2 border-dashed border-border/60 rounded-xl">
                  <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm">لا توجد خيارات بديلة بعد</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">أضف ألوان/سعات مختلفة بأسعار مستقلة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map((v, i) => {
                    const variantId = getVariantId(v);
                    return (
                      <div key={variantId} className="bg-muted/20 rounded-xl p-4 border border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-primary">بديل {i + 1}</span>
                            {v.colorHex && <span className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: v.colorHex }} title={v.color || ""} />}
                            {v.storage && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-mono">{v.storage}</Badge>}
                            {v.ram && <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono">{v.ram}</Badge>}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeVariant(variantId)} className="h-7 w-7 hover:bg-red-50 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">اللون</Label>
                            <Input placeholder="مثال: أسود تيتانيوم" value={v.color || ""} onChange={(e) => updateVariant(variantId, "color", e.target.value)} className="bg-white/50 font-number" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">كود اللون (Hex)</Label>
                            <Input placeholder="#000000" value={v.colorHex || ""} onChange={(e) => updateVariant(variantId, "colorHex", e.target.value)} className="bg-white/50 font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">السعة التخزينية</Label>
                            <Input placeholder="مثال: 256GB" value={v.storage || ""} onChange={(e) => updateVariant(variantId, "storage", e.target.value)} className="bg-white/50 font-number" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">RAM</Label>
                            <Input placeholder="مثال: 8GB" value={v.ram || ""} onChange={(e) => updateVariant(variantId, "ram", e.target.value)} className="bg-white/50" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground font-semibold text-primary">السعر (مطلوب) *</Label>
                            <Input type="number" inputMode="numeric" placeholder="سعر هذا البديل" value={v.price} onChange={(e) => updateVariant(variantId, "price", Number(e.target.value))} className="bg-white/50 font-number font-semibold" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">المخزون</Label>
                            <Input type="number" inputMode="numeric" placeholder="الكمية المتاحة" value={v.stock} onChange={(e) => updateVariant(variantId, "stock", Number(e.target.value))} className="bg-white/50 font-number" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">SKU (اختياري)</Label>
                            <Input placeholder="APL-IP16-256-BLK" value={v.sku || ""} onChange={(e) => updateVariant(variantId, "sku", e.target.value)} className="bg-white/50 font-mono text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="relative" title="نسبة صحة البطارية للأجهزة المجددة (0-100%)">
                                <span>🔋</span>
                              </span>
                              بطارية %
                            </Label>
                            <Input type="number" inputMode="numeric" min={0} max={100} placeholder="100" value={v.batteryHealth ?? ""} onChange={(e) => updateVariant(variantId, "batteryHealth", e.target.value ? Number(e.target.value) : null)} className="bg-white/50 font-number w-24" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">ضريبة</Label>
                            <Input type="number" inputMode="numeric" min={0} max={100} step={0.5} placeholder="14" value={v.taxRate ?? 0} onChange={(e) => updateVariant(variantId, "taxRate", e.target.value ? Number(e.target.value) : 0)} className="bg-white/50 font-number w-24" />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/40 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>السعر الأساسي للمنتج: <span className="font-number font-medium text-primary">{basePrice.toLocaleString("ar-EG")} ج</span></span>
                          <span>فرق السعر: <span className="font-number font-medium" style={{ color: v.price > basePrice ? 'red' : v.price < basePrice ? 'green' : 'inherit' }}>{(v.price - basePrice).toLocaleString("ar-EG")} ج</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="specs" className="space-y-4 mt-4">
              <Button variant="outline" onClick={addSpec} size="sm" className="rounded-xl">
                <Plus className="w-4 h-4 ml-1" /> إضافة مواصفة
              </Button>
              {specs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/60">
                  <p className="text-sm">لم يتم إضافة مواصفات بعد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {specs.map((s, i) => (
                    <div key={i} className="bg-muted/20 rounded-xl p-4 border border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">مواصفة {i + 1}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeSpec(i)} className="h-7 w-7 hover:bg-red-50 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Input placeholder="المجموعة (Display...)" value={s.groupName} onChange={(e) => updateSpec(i, "groupName", e.target.value)} className="bg-white/50" />
                        <Input placeholder="المفتاح (Screen Size...)" value={s.key} onChange={(e) => updateSpec(i, "key", e.target.value)} className="bg-white/50" />
                        <Input placeholder="القيمة (6.7 inches...)" value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} className="bg-white/50" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveProduct} disabled={saving} className="rounded-xl shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingProduct ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">تأكيد الحذف</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletingId(null); }} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
              <Trash2 className="w-4 h-4 ml-1.5" /> حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
