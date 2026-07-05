import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, X, Loader2, MoreHorizontal, FolderOpen, Eye, EyeOff, Copy, ArrowRight, PlusCircle, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  nameAr: string;
  basePrice: number;
  salePrice: number | null;
  isOnSale: boolean;
  isActive: boolean;
  product_images?: { id: string; url: string; isPrimary: boolean }[];
}

interface CollectionItem {
  id: string;
  collection_id: string;
  product_id: string;
  sort_order: number;
}

interface Collection {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: CollectionItem[];
}

export default function Collections() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [addProductSearch, setAddProductSearch] = useState("");
  const [showAddProducts, setShowAddProducts] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [colRes, itemsRes, prodRes] = await Promise.all([
        supabaseAdmin.from("product_collections").select("*").order("sort_order", { ascending: true }),
        supabaseAdmin.from("product_collection_items").select("*"),
        supabaseAdmin.from("products").select("id, name, nameAr, basePrice, salePrice, isOnSale, isActive, product_images(id, url, isPrimary)").order("nameAr"),
      ]);

      const allItems = itemsRes.data || [];
      const enriched = (colRes.data || []).map((col) => ({
        ...col,
        items: allItems.filter((i) => i.collection_id === col.id),
      }));

      setCollections(enriched);
      setProducts(prodRes.data || []);

      if (selectedCollection) {
        const updated = enriched.find((c) => c.id === selectedCollection.id);
        if (updated) setSelectedCollection(updated);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setIsActive(true); setSortOrder(0);
    setEditingCollection(null);
  };

  const openEdit = (col: Collection) => {
    setEditingCollection(col);
    setName(col.name);
    setIsActive(col.is_active);
    setSortOrder(col.sort_order);
    setShowForm(true);
  };

  const saveCollection = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Collection name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const colData = {
        name: name.trim(),
        is_active: isActive,
        sort_order: sortOrder,
      };

      if (editingCollection) {
        const { error } = await supabaseAdmin.from("product_collections").update(colData).eq("id", editingCollection.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("product_collections").insert(colData);
        if (error) throw error;
      }

      toast({ title: "Done", description: editingCollection ? "Collection updated" : "Collection created — now add products" });
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => { setDeletingId(id); setShowDeleteDialog(true); };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabaseAdmin.from("product_collections").delete().eq("id", deletingId);
      if (error) throw error;
      if (selectedCollection?.id === deletingId) setSelectedCollection(null);
      toast({ title: "Deleted", description: "Collection removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const toggleActive = async (col: Collection) => {
    try {
      await supabaseAdmin.from("product_collections").update({ is_active: !col.is_active }).eq("id", col.id);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addProductToCollection = async (col: Collection, productId: string) => {
    try {
      const maxSort = col.items?.length || 0;
      const { error } = await supabaseAdmin.from("product_collection_items").insert({
        collection_id: col.id,
        product_id: productId,
        sort_order: maxSort,
      });
      if (error) throw error;
      toast({ title: "Added", description: "Product added to collection" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeProductFromCollection = async (col: Collection, productId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from("product_collection_items")
        .delete()
        .eq("collection_id", col.id)
        .eq("product_id", productId);
      if (error) throw error;
      toast({ title: "Removed", description: "Product removed from collection" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const duplicateCollection = async (col: Collection) => {
    try {
      const { data: newCol, error } = await supabaseAdmin
        .from("product_collections")
        .insert({ name: `${col.name} (Copy)`, is_active: false, sort_order: col.sort_order + 1 })
        .select()
        .single();
      if (error) throw error;

      if (col.items && col.items.length > 0) {
        const itemsToInsert = col.items.map((item, idx) => ({
          collection_id: newCol.id,
          product_id: item.product_id,
          sort_order: idx,
        }));
        await supabaseAdmin.from("product_collection_items").insert(itemsToInsert);
      }

      toast({ title: "Duplicated", description: "Collection copied" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const productImage = (p: Product) =>
    p.product_images?.find((img) => img.isPrimary)?.url || p.product_images?.[0]?.url || null;

  const filteredCollections = collections.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCollectionProducts = (col: Collection): Product[] => {
    return (col.items || [])
      .map((item) => products.find((p) => p.id === item.product_id))
      .filter(Boolean) as Product[];
  };

  const getAvailableProducts = (col: Collection): Product[] => {
    const inCollection = new Set((col.items || []).map((i) => i.product_id));
    return products.filter(
      (p) =>
        !inCollection.has(p.id) &&
        (p.nameAr?.toLowerCase().includes(addProductSearch.toLowerCase()) ||
         p.name?.toLowerCase().includes(addProductSearch.toLowerCase()))
    );
  };

  // ── DETAIL VIEW ──
  if (selectedCollection) {
    const colProducts = getCollectionProducts(selectedCollection);
    const availableProducts = getAvailableProducts(selectedCollection);

    return (
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCollection(null)} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold truncate">{selectedCollection.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {colProducts.length} products
                  {!selectedCollection.is_active && (
                    <Badge variant="outline" className="mr-2 text-xs">Inactive</Badge>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddProducts(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Add Products
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(selectedCollection)}>
                  <Edit className="w-4 h-4 ml-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleActive(selectedCollection)}>
                  {selectedCollection.is_active ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
                  {selectedCollection.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicateCollection(selectedCollection)}>
                  <Copy className="w-4 h-4 ml-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => confirmDelete(selectedCollection.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 ml-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Product List */}
        {colProducts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <List className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No products yet</p>
            <p className="text-sm mt-1 mb-4">Start by adding products to this collection</p>
            <Button onClick={() => setShowAddProducts(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Add Products
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {colProducts.map((product, idx) => {
              const img = productImage(product);
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-4 bg-card border rounded-xl px-4 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <span className="text-sm text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                  {img ? (
                    <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs shrink-0">No image</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.nameAr || product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.isOnSale && product.salePrice ? product.salePrice : product.basePrice} EGP
                    </p>
                  </div>
                  {!product.isActive && (
                    <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => removeProductFromCollection(selectedCollection, product.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Products Dialog */}
        <Dialog open={showAddProducts} onOpenChange={(v) => { if (!v) { setShowAddProducts(false); setAddProductSearch(""); } }}>
          <DialogContent className="max-w-lg h-[80vh] flex flex-col" dir="rtl">
            <DialogHeader>
              <DialogTitle>Add products to {selectedCollection.name}</DialogTitle>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={addProductSearch}
                onChange={(e) => setAddProductSearch(e.target.value)}
                className="pr-10 rounded-xl"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 mt-2 space-y-1">
              {availableProducts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {addProductSearch ? "No results" : "All products are already in this collection"}
                </p>
              ) : (
                availableProducts.map((product) => {
                  const img = productImage(product);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {img ? (
                        <img src={img} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center text-xs shrink-0">No image</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.nameAr || product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.isOnSale && product.salePrice ? product.salePrice : product.basePrice} EGP
                        </p>
                      </div>
                      {!product.isActive && (
                        <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                      )}
                      {product.condition === 'used' && (
                        <Badge variant="outline" className="text-xs shrink-0 bg-amber-50 text-amber-700 border-amber-200">Used</Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-primary shrink-0"
                        onClick={() => addProductToCollection(selectedCollection, product.id)}
                      >
                        <PlusCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddProducts(false); setAddProductSearch(""); }} className="rounded-xl">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); resetForm(); } }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Collection Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Samsung Phones, Best Sellers..." className="rounded-xl mt-1" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-24 rounded-xl mt-1" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>{isActive ? "Active" : "Inactive"}</Label>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">Cancel</Button>
              <Button onClick={saveCollection} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Collection</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{selectedCollection.name}" and remove all its products. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── LIST VIEW (Spotify-style cards) ──
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Collections
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Organize products into collections</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">No collections yet</p>
          <p className="text-sm mt-2 mb-4">Create your first collection and start adding products</p>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> New Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCollections.map((col) => {
            const colProducts = getCollectionProducts(col);
            const coverImages = colProducts.slice(0, 4).map((p) => productImage(p)).filter(Boolean);

            return (
              <div
                key={col.id}
                onClick={() => setSelectedCollection(col)}
                className="group cursor-pointer bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Cover Art */}
                <div className="aspect-square relative bg-muted">
                  {coverImages.length >= 4 ? (
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                      {coverImages.slice(0, 4).map((img, i) => (
                        <img key={i} src={img!} alt="" className="w-full h-full object-cover" />
                      ))}
                    </div>
                  ) : coverImages.length > 0 ? (
                    <img src={coverImages[0]!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <FolderOpen className="w-12 h-12 text-primary/40" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <List className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>

                  {!col.is_active && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-black/60 text-white border-0">
                      Inactive
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{col.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{colProducts.length} products</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Collection Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramadan Deals, Best Phones..." className="rounded-xl mt-1" autoFocus />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-24 rounded-xl mt-1" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>{isActive ? "Active" : "Inactive"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">Cancel</Button>
            <Button onClick={saveCollection} disabled={saving} className="rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this collection and all its products. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
