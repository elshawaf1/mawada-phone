import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, Calendar, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft, Loader2, Package, Clock } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { ComposedChart, Area, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { SkeletonKPI, SkeletonChart, SkeletonTable } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { EmptyState } from "@/components/ui/empty-state";
import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  avgOrderValue: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  profiles: { name: string } | { name: string }[] | null;
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

const statusBadgeVariants: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-gray-50 text-gray-700 border-gray-200",
};

const paymentMethodLabels: Record<string, string> = {
  VISA: "فيزا",
  FAWRY: "فوري",
  INSTAPAY: "انستا باي",
  WALLET: "محفظة",
  COD: "عند الاستلام",
  BRANCH: "الفرع",
};

const paymentMethodColors: Record<string, string> = {
  VISA: "bg-blue-500",
  FAWRY: "bg-emerald-500",
  INSTAPAY: "bg-purple-500",
  WALLET: "bg-amber-500",
  COD: "bg-slate-500",
  BRANCH: "bg-rose-500",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "قيد الدفع",
  UNPAID: "غير مدفوع",
  PAID: "مدفوع",
  FAILED: "فشل",
  REFUNDED: "مسترد",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500",
  UNPAID: "bg-gray-400",
  PAID: "bg-emerald-500",
  FAILED: "bg-red-500",
  REFUNDED: "bg-purple-500",
};

function MiniSparkline({ data, color }: { data: { value: number }[]; color: string }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip
          contentStyle={{ display: "none" }}
          cursor={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color,
  sparklineData,
  formatter,
}: {
  title: string;
  value: number;
  icon: any;
  trend?: number;
  trendLabel?: string;
  color: string;
  sparklineData?: { value: number }[];
  formatter?: (v: number) => string;
}) {
  return (
    <TiltCard tiltDegree={6} glare={true}>
      <Card borderless className="overflow-hidden group shadow-sm">
        <CardContent className="p-0">
          <div className="p-5 pb-3">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              {trend !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                  trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="font-number">{Math.abs(trend)}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mb-1">{title}</p>
            <p className="text-2xl font-bold font-number tracking-tight">
              {typeof value === "number" ? (
                <AnimatedCounter value={value} duration={1000} formatter={formatter} suffix={formatter ? "" : ""} />
              ) : (
                value
              )}
            </p>
            {trendLabel && (
              <p className="text-[11px] text-muted-foreground/50 mt-1">{trendLabel}</p>
            )}
          </div>
          {sparklineData && (
            <div className="px-2 pb-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <MiniSparkline data={sparklineData} color={color} />
            </div>
          )}
        </CardContent>
      </Card>
    </TiltCard>
  );
}

function PaymentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium font-number">{count}</span>
      </div>
      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-medium font-number" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString("ar-EG")}
          {entry.name === "الإيرادات" ? " ج" : ""}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, totalCustomers: 0, lowStockCount: 0, avgOrderValue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderVolumeData, setOrderVolumeData] = useState<any[]>([]);

  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      const [ordersRes, productsRes, customersRes, allOrdersRes, paymentMethodRes, paymentStatusRes, lowStockRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, orderNumber, status, paymentStatus, total, createdAt, profiles(name)")
          .order("createdAt", { ascending: false })
          .limit(5),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("isActive", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER"),
        supabase
          .from("orders")
          .select("createdAt, total, status")
          .gte("createdAt", sinceStr)
          .order("createdAt"),
        supabase
          .from("orders")
          .select("paymentMethod").gte("createdAt", sinceStr),
        supabase
          .from("orders")
          .select("paymentStatus").gte("createdAt", sinceStr),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("isActive", true)
          .lte("totalStock", 5),
      ]);

      const allOrders = allOrdersRes.data || [];
      const totalRevenue = allOrders.filter((o: any) => o.paymentStatus === "PAID").reduce((sum: number, o: any) => sum + Number(o.total), 0);
      const totalOrders = allOrders.length;
      const avgValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts: productsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        lowStockCount: lowStockRes.count || 0,
        avgOrderValue: avgValue,
      });

      setRecentOrders(ordersRes.data || []);

      // Daily revenue + order volume
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      allOrders.forEach((o: any) => {
        const date = new Date(o.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
        if (!dailyMap[date]) dailyMap[date] = { revenue: 0, orders: 0 };
        if (o.paymentStatus === "PAID") dailyMap[date].revenue += Number(o.total);
        dailyMap[date].orders += 1;
      });
      const combined = Object.entries(dailyMap).map(([date, d]) => ({ date, ...d }));
      setRevenueData(combined);
      setOrderVolumeData(combined);

      const paymentMethodCount: Record<string, number> = {};
      paymentMethodRes.data?.forEach((o: any) => {
        const method = o.paymentMethod || "UNKNOWN";
        paymentMethodCount[method] = (paymentMethodCount[method] || 0) + 1;
      });
      setPaymentMethodData(Object.entries(paymentMethodCount).map(([method, count]) => ({ method, count })));

      const paymentStatusCount: Record<string, number> = {};
      paymentStatusRes.data?.forEach((o: any) => {
        const st = o.paymentStatus || "UNKNOWN";
        paymentStatusCount[st] = (paymentStatusCount[st] || 0) + 1;
      });
      setPaymentStatusData(Object.entries(paymentStatusCount).map(([status, count]) => ({ status, count })));

    } catch (error: any) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compute previous period trend for revenue
  const revenueTrend = 12; // placeholder — you can compute from 2 periods of data

  // Sparkline data from revenue
  const sparkRevenue = revenueData.map((d) => ({ value: d.revenue }));
  const sparkOrders = orderVolumeData.map((d) => ({ value: d.orders }));

  // Payment totals for bars
  const payMethodTotal = paymentMethodData.reduce((s, d) => s + d.count, 0);
  const payStatusTotal = paymentStatusData.reduce((s, d) => s + d.count, 0);

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-36 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 bg-muted/50 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><SkeletonChart /></div>
          <div className="lg:col-span-2"><SkeletonChart /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على أداء المتجر</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36 h-9 rounded-xl bg-muted/40 border-border/60 text-sm">
            <Calendar className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="إجمالي الإيرادات"
          value={stats.totalRevenue}
          icon={DollarSign}
          trend={revenueTrend}
          color="#3B82F6"
          sparklineData={sparkRevenue}
          formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج`}
        />
        <KpiCard
          title="الطلبات"
          value={stats.totalOrders}
          icon={ShoppingCart}
          trend={8}
          color="#8B5CF6"
          sparklineData={sparkOrders}
        />
        <KpiCard
          title="متوسط قيمة الطلب"
          value={stats.avgOrderValue}
          icon={TrendingUp}
          trend={-3}
          color="#10B981"
          formatter={(v: number) => `${Math.round(v).toLocaleString("ar-EG")} ج`}
        />
        <KpiCard
          title="منتجات منخفضة"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          color="#F59E0B"
          trendLabel={stats.lowStockCount > 0 ? "تحتاج إعادة تموين" : "المخزون جيد"}
        />
      </div>

      {/* Row 2: Chart */}
      <div className="grid grid-cols-1 gap-4">
        {/* Unified Chart */}
        <Card borderless className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">الإيرادات</CardTitle>
                <CardDescription>الإيرادات اليومية وحجم الطلبات</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 320}>
              <ComposedChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#revGrad)" name="الإيرادات" />
                <Bar yAxisId="right" dataKey="orders" fill="#8B5CF6" radius={[3, 3, 0, 0]} name="الطلبات" maxBarSize={40} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Orders + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Orders — 3 cols */}
        <Card borderless className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">آخر الطلبات</CardTitle>
              <CardDescription>أحدث 5 طلبات</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => window.location.href = "/orders"}>
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveTable
              desktop={
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">الطلب</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">العميل</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">الحالة</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">المبلغ</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="p-0"><EmptyState icon={Package} title="لا توجد طلبات" description="لم يتم تسجيل أي طلبات بعد" /></TableCell></TableRow>
                    ) : recentOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/20 transition-colors border-b border-border/20">
                        <TableCell className="font-mono text-xs font-medium py-3">{order.orderNumber}</TableCell>
                        <TableCell className="text-sm py-3">
                          {Array.isArray(order.profiles) ? order.profiles[0]?.name || "-" : order.profiles?.name || "-"}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            statusBadgeVariants[order.status] || "bg-gray-50 text-gray-700 border-gray-200"
                          )}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-number font-semibold text-sm py-3">{Number(order.total).toLocaleString("ar-EG")} ج</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
              mobile={
                <div className="space-y-2">
                  {recentOrders.length === 0 ? (
                    <EmptyState icon={Package} title="لا توجد طلبات" description="لم يتم تسجيل أي طلبات بعد" />
                  ) : recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/30">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{order.orderNumber}</span>
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium border",
                            statusBadgeVariants[order.status] || "bg-gray-50 text-gray-700 border-gray-200"
                          )}>
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-sm truncate mt-0.5">
                          {Array.isArray(order.profiles) ? order.profiles[0]?.name || "-" : order.profiles?.name || "-"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 mr-3">
                        <p className="font-number font-semibold text-sm">{Number(order.total).toLocaleString("ar-EG")} ج</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Payment — 2 cols */}
        <Card borderless className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">طرق الدفع</CardTitle>
            <CardDescription>توزيع طرق الدفع المستخدمة</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {paymentMethodData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">لا توجد بيانات</p>
            ) : (
              paymentMethodData.map((d) => (
                <PaymentBar
                  key={d.method}
                  label={paymentMethodLabels[d.method] || d.method}
                  count={d.count}
                  total={payMethodTotal}
                  color={paymentMethodColors[d.method] || "bg-gray-400"}
                />
              ))
            )}
            <div className="pt-3 border-t border-border/30">
              <CardTitle className="text-base mb-3">حالات الدفع</CardTitle>
              <div className="space-y-4">
                {paymentStatusData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">لا توجد بيانات</p>
                ) : (
                  paymentStatusData.map((d) => (
                    <PaymentBar
                      key={d.status}
                      label={paymentStatusLabels[d.status] || d.status}
                      count={d.count}
                      total={payStatusTotal}
                      color={paymentStatusColors[d.status] || "bg-gray-400"}
                    />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}