import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Eye, Loader2, Package, MapPin, CreditCard, Phone, Mail, MoreHorizontal, Clock } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  addressId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode: string | null;
  notes: string | null;
  paymobOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  profiles: { name: string; email: string; phone: string | null } | null;
  addresses: { city: string; street: string; region: string; label: string } | null;
  fawryCode: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku: string | null;
  variant_name: string | null;
  products: { nameAr: string; name: string; product_images: { url: string }[] } | null;
}

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
  REFUNDED: "مسترد",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

const paymentMethodLabels: Record<string, string> = {
  VISA: "فيزا",
  WALLET: "محفظة",
  COD: "عند الاستلام",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "قيد الدفع",
  UNPAID: "غير مدفوع",
  PAID: "مدفوع",
  FAILED: "فشل",
  REFUNDED: "مسترد",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNPAID: "bg-gray-100 text-gray-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
};

const paymentMethodOptions = [
  { value: "COD", label: "عند الاستلام" },
  { value: "VISA", label: "فيزا" },
  { value: "WALLET", label: "محفظة" },
  { value: "BRANCH", label: "الفرع" },
];

export default function Orders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [updating, setUpdating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const channel = supabaseAdmin
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();
    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(`*, profiles(name, email, phone), addresses(city, street, region, label)`)
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data, error } = await supabaseAdmin
      .from("order_items")
      .select(`*, products(nameAr, name, product_images(url))`)
      .eq("orderId", orderId);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setOrderItems(data || []);
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabaseAdmin.from("orders").update({ paymentStatus, updatedAt: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "تم", description: "تم تحديث حالة الدفع" });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const updatePaymentMethod = async (orderId: string, paymentMethod: string) => {
    setUpdating(true);
    try {
      const { error } = await supabaseAdmin.from("orders").update({ paymentMethod, updatedAt: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "تم", description: "تم تحديث طريقة الدفع" });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentMethod });
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    try {
      const { error } = await supabaseAdmin.from("orders").update({ status, updatedAt: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      toast({ title: "تم", description: "تم تحديث حالة الطلب" });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
        fetchOrderItems(orderId);
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const openDetail = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowDetail(true);
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.profiles?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchPaymentStatus = paymentStatusFilter === "ALL" || o.paymentStatus === paymentStatusFilter;
    return matchSearch && matchStatus && matchPaymentStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الطلبات</h1>
        <p className="text-muted-foreground mt-1">{orders.length} طلب</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو اسم العميل..." className="pr-10 bg-muted/50 border-border/60 focus:bg-background" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الحالات</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="حالة الدفع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع حالات الدفع</SelectItem>
            {Object.entries(paymentStatusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResponsiveTable
        desktop={
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-right font-semibold text-foreground/70">رقم الطلب</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">العميل</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">الحالة</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">الدفع</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">المبلغ</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">التاريخ</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">لا توجد طلبات</TableCell></TableRow>
              ) : filtered.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                  <TableCell className="font-medium">{order.profiles?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge className={(statusColors[order.status] || "bg-gray-100 text-gray-800") + " font-medium px-2.5 py-0.5"}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="font-medium">{paymentMethodLabels[order.paymentMethod] || order.paymentMethod}</Badge>
                      <Badge className={(paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-800") + " font-medium px-2 py-0.5"}>
                        {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{Number(order.total).toLocaleString("ar-EG")} ج</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-muted/60">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl min-w-[150px]">
                        <DropdownMenuItem onClick={() => openDetail(order)} className="cursor-pointer rounded-lg gap-2">
                          <Eye className="w-3.5 h-3.5" /> عرض التفاصيل
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
        mobile={
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد طلبات</p>
              </div>
            ) : filtered.map((order) => (
              <Card key={order.id} borderless className="shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{order.orderNumber}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-2">{order.profiles?.name || "-"}</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <Badge className={(statusColors[order.status] || "bg-gray-100 text-gray-800") + " font-medium px-2 py-0.5"}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    <Badge className={(paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-800") + " font-medium px-2 py-0.5"}>
                      {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                    <span className="font-bold font-number text-lg">{Number(order.total).toLocaleString("ar-EG")} ج</span>
                    <Button variant="ghost" size="sm" onClick={() => openDetail(order)} className="rounded-xl gap-1 text-primary">
                      <Eye className="w-4 h-4" /> تفاصيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      />

      {/* Order Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>{selectedOrder?.orderNumber}</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-primary" /> معلومات العميل</h3>
                    <p className="text-sm font-medium">{selectedOrder.profiles?.name || "-"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedOrder.profiles?.email || "-"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {selectedOrder.profiles?.phone || "-"}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-primary" /> عنوان التوصيل</h3>
                    {selectedOrder.addresses ? (
                      <>
                        <p className="text-sm font-medium">{selectedOrder.addresses.label}</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.addresses.street}, {selectedOrder.addresses.city}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">لم يتم تحديد العنوان</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3">المنتجات</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">المتغير</TableHead>
                      <TableHead className="text-right">SKU</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.nameAr || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{item.variant_name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{Number(item.unitPrice).toLocaleString()} ج</TableCell>
                        <TableCell className="font-bold">{Number(item.totalPrice).toLocaleString()} ج</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Payment Info */}
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-primary" /> معلومات الدفع</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">طريقة الدفع:</span>
                      {selectedOrder.paymentMethod === 'COD' ? (
                        <Select
                          value={selectedOrder.paymentMethod || ""}
                          onValueChange={(val) => updatePaymentMethod(selectedOrder.id, val)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethodOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 font-medium">{paymentMethodLabels[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">حالة الدفع:</span>
                      {selectedOrder.paymentMethod === 'COD' ? (
                        <Select
                          value={selectedOrder.paymentStatus || ""}
                          onValueChange={(val) => updatePaymentStatus(selectedOrder.id, val)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(paymentStatusLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 font-medium">{paymentStatusLabels[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">المجموع الفرعي:</span>
                      <p>{Number(selectedOrder.subtotal).toLocaleString()} ج</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">التوصيل:</span>
                      <p>{Number(selectedOrder.shippingCost).toLocaleString()} ج</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الخصم:</span>
                      <p>{Number(selectedOrder.discount).toLocaleString()} ج</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الإجمالي:</span>
                      <p className="font-bold text-lg">{Number(selectedOrder.total).toLocaleString()} ج</p>
                    </div>
                  </div>
                  {(selectedOrder.paymobOrderId || selectedOrder.fawryCode) && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {selectedOrder.paymobOrderId && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Paymob Order ID:</span> {selectedOrder.paymobOrderId}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">ملاحظات:</span>
                      <p className="text-sm">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Update Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Label>تحديث الحالة:</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(val) => updateStatus(selectedOrder.id, val)}
                  disabled={updating}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetail(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
