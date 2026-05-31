import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Users, TrendingDown } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { SkeletonKPI, SkeletonChart } from "@/components/ui/skeleton";

const datePresets = [
  { value: "7", label: "7 أيام" },
  { value: "30", label: "30 يوم" },
  { value: "90", label: "90 يوم" },
  { value: "365", label: "سنة" },
  { value: "all", label: "الكل" },
];

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
  PENDING: "#F59E0B",
  CONFIRMED: "#3B82F6",
  PROCESSING: "#8B5CF6",
  SHIPPED: "#6366F1",
  DELIVERED: "#10B981",
  CANCELLED: "#EF4444",
  REFUNDED: "#6B7280",
};

const paymentMethodLabels: Record<string, string> = {
  VISA: "فيزا",
  FAWRY: "فوري",
  INSTAPAY: "انستا باي",
  WALLET: "محفظة",
  COD: "عند الاستلام",
  BRANCH: "الفرع",
};

const PAYMENT_METHOD_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#6B7280", "#EF4444"];

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#6366F1", "#EC4899", "#14B8A6"];

function CustomTooltip({ active, payload, label }: any) {
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
}

function ReportsKpiCard({
  title, value, icon: Icon, trend, color, formatter,
}: {
  title: string; value: number; icon: any; trend?: number; color: string; formatter?: (v: number) => string;
}) {
  return (
    <TiltCard tiltDegree={6} glare={true}>
      <Card borderless className="shadow-sm">
        <CardContent className="p-5">
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
            <AnimatedCounter value={value} duration={1000} formatter={formatter} />
          </p>
        </CardContent>
      </Card>
    </TiltCard>
  );
}

export default function Reports() {
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [newCustomers, setNewCustomers] = useState(0);
  const [prevRevenue, setPrevRevenue] = useState(0);
  const [prevOrders, setPrevOrders] = useState(0);
  const [prevAOV, setPrevAOV] = useState(0);
  const [prevCustomers, setPrevCustomers] = useState(0);

  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [paymentChartData, setPaymentChartData] = useState<any[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
  const [hourlyChartData, setHourlyChartData] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const getDateRange = (days: string) => {
    if (days === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const sinceStr = getDateRange(dateRange);
      const sinceDate = sinceStr ? new Date(sinceStr) : new Date("2020-01-01");
      const sinceStrPrev = dateRange === "all" ? null : new Date(sinceDate.getTime() - (parseInt(dateRange) * 86400000)).toISOString();

      const orderQuery = supabase
        .from("orders")
        .select("id, total, status, paymentMethod, paymentStatus, createdAt")
        .order("createdAt", { ascending: true });

      const orderQueryPrev = supabase
        .from("orders")
        .select("id, total, status, paymentMethod, paymentStatus, createdAt");

      if (sinceStr) {
        orderQuery.gte("createdAt", sinceStr);
      }
      if (sinceStrPrev) {
        orderQueryPrev.gte("createdAt", sinceStrPrev).lt("createdAt", sinceStr);
      } else if (sinceStr) {
        orderQueryPrev.lt("createdAt", sinceStr);
      }

      const [ordersRes, ordersPrevRes, customersRes, customersPrevRes] = await Promise.all([
        orderQuery,
        dateRange !== "all" ? orderQueryPrev : Promise.resolve({ data: [] }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CUSTOMER"),
      ]);

      const orders = ordersRes.data || [];
      const prevOrdersData = ordersPrevRes.data || [];
      const allCustomers = customersRes.count || 0;

      // KPI calculations
      const revenue = orders.filter((o: any) => o.paymentStatus === "PAID").reduce((s: number, o: any) => s + Number(o.total), 0);
      const count = orders.length;
      const aov = count > 0 ? revenue / count : 0;
      const prevRevenueVal = prevOrdersData.filter((o: any) => o.paymentStatus === "PAID").reduce((s: number, o: any) => s + Number(o.total), 0);
      const prevCount = prevOrdersData.length;
      const prevAovVal = prevCount > 0 ? prevRevenueVal / prevCount : 0;

      setTotalRevenue(revenue);
      setTotalOrders(count);
      setAvgOrderValue(aov);
      setNewCustomers(allCustomers);
      setPrevRevenue(prevRevenueVal);
      setPrevOrders(prevCount);
      setPrevAOV(prevAovVal);

      // Daily revenue aggregation
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      orders.forEach((o: any) => {
        const date = new Date(o.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
        if (!dailyMap[date]) dailyMap[date] = { revenue: 0, orders: 0 };
        if (o.paymentStatus === "PAID") dailyMap[date].revenue += Number(o.total);
        dailyMap[date].orders += 1;
      });
      const dailyData = Object.entries(dailyMap).map(([date, d]) => ({ date, ...d }));
      setRevenueChartData(dailyData);
      setDailySummary(dailyData.map(d => ({ ...d, date: d.date })));

      // Orders by status
      const statusCount: Record<string, number> = {};
      orders.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
      setStatusChartData(Object.entries(statusCount).map(([status, count]) => ({ status: statusLabels[status] || status, count, color: statusColors[status] || "#6B7280" })));

      // Payment method distribution
      const payCount: Record<string, number> = {};
      orders.forEach((o: any) => {
        const m = o.paymentMethod || "UNKNOWN";
        payCount[m] = (payCount[m] || 0) + 1;
      });
      setPaymentChartData(Object.entries(payCount).map(([method, count], i) => ({
        method: paymentMethodLabels[method] || method,
        count,
        color: PAYMENT_METHOD_COLORS[i % PAYMENT_METHOD_COLORS.length],
      })));

      // Revenue by category
      if (orders.length > 0) {
        const orderIds = orders.map((o: any) => o.id);
        const { data: items } = await supabase
          .from("order_items")
          .select(`quantity, unitPrice, products!inner(categoryId, categories!inner(nameAr))`)
          .in("orderId", orderIds);

        const catRevenue: Record<string, number> = {};
        (items || []).forEach((item: any) => {
          const catName = item.products?.categories?.nameAr || "غير مصنف";
          catRevenue[catName] = (catRevenue[catName] || 0) + (Number(item.quantity) * Number(item.unitPrice));
        });
        const sorted = Object.entries(catRevenue)
          .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
          .sort((a, b) => b.value - a.value);
        setCategoryChartData(sorted);
      }

      // Hourly activity
      const hourly: Record<number, number> = {};
      orders.forEach((o: any) => {
        const h = new Date(o.createdAt).getHours();
        hourly[h] = (hourly[h] || 0) + 1;
      });
      const hourlyArr = Array.from({ length: 24 }, (_, i) => ({
        hour: i.toString().padStart(2, ":00"),
        orders: hourly[i] || 0,
      }));
      setHourlyChartData(hourlyArr);

    } catch (error: any) {
      console.error("Reports error:", error);
    } finally {
      setLoading(false);
    }
  };

  const trend = (current: number, prev: number) => {
    if (prev === 0) return undefined;
    return Math.round(((current - prev) / prev) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-28 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-44 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-16 bg-muted/50 rounded-lg animate-pulse" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><SkeletonChart /></div>
          <div className="lg:col-span-2"><SkeletonChart /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <div className="lg:col-span-3"><SkeletonChart /></div>
        </div>
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">التقارير</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحليل شامل لأداء المبيعات</p>
        </div>
        <div className="flex gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/40">
          {datePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setDateRange(preset.value)}
              className={cn(
                "px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all",
                dateRange === preset.value
                  ? "bg-white text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-white/50"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportsKpiCard title="إجمالي الإيرادات" value={totalRevenue} icon={DollarSign} color="#3B82F6"
          trend={trend(totalRevenue, prevRevenue)} formatter={(v: number) => `${v.toLocaleString("ar-EG")} ج`} />
        <ReportsKpiCard title="إجمالي الطلبات" value={totalOrders} icon={ShoppingCart} color="#8B5CF6"
          trend={trend(totalOrders, prevOrders)} />
        <ReportsKpiCard title="متوسط قيمة الطلب" value={avgOrderValue} icon={TrendingUp} color="#10B981"
          trend={trend(avgOrderValue, prevAOV)} formatter={(v: number) => `${Math.round(v).toLocaleString("ar-EG")} ج`} />
        <ReportsKpiCard title="إجمالي العملاء" value={newCustomers} icon={Users} color="#F59E0B" />
      </div>

      {/* Row 2: Revenue + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card borderless className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الإيرادات اليومية</CardTitle>
            <CardDescription>تطور الإيرادات خلال الفترة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#rRevGrad)" name="الإيرادات" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card borderless className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">حالات الطلبات</CardTitle>
            <CardDescription>توزيع الطلبات حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">لا توجد بيانات</p>
              ) : (
                statusChartData.map((d: any) => {
                  const pct = totalOrders > 0 ? Math.round((d.count / totalOrders) * 100) : 0;
                  return (
                    <div key={d.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{d.status}</span>
                        <span className="font-number font-medium">{d.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Payment + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card borderless className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">طرق الدفع</CardTitle>
            <CardDescription>توزيع طرق الدفع</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentChartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">لا توجد بيانات</p>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentChartData} dataKey="count" nameKey="method" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {paymentChartData.map((entry: any, idx: number) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {paymentChartData.map((d: any) => (
                    <div key={d.method} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.method}</span>
                      <span className="font-number font-medium">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card borderless className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الإيرادات حسب التصنيف</CardTitle>
            <CardDescription>توزيع الإيرادات على الأقسام</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                  <XAxis type="number" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="الإيرادات" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Hourly Activity */}
      <Card borderless className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">النشاط اليومي</CardTitle>
          <CardDescription>توزيع الطلبات حسب الساعة</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="hour" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" name="الطلبات" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 5: Daily Summary Table */}
      <Card borderless className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">ملخص يومي</CardTitle>
              <CardDescription>تفاصيل الإيرادات والطلبات يومياً</CardDescription>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground/60" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">التاريخ</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">الطلبات</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">الإيرادات</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground/60 h-9">المتوسط</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailySummary.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">لا توجد بيانات</TableCell></TableRow>
              ) : (
                [...dailySummary].reverse().map((d: any) => (
                  <TableRow key={d.date} className="hover:bg-muted/20 transition-colors border-b border-border/20">
                    <TableCell className="text-sm py-3">{d.date}</TableCell>
                    <TableCell className="font-number font-medium text-sm py-3">{d.orders}</TableCell>
                    <TableCell className="font-number font-semibold text-sm py-3">{d.revenue.toLocaleString("ar-EG")} ج</TableCell>
                    <TableCell className="font-number text-sm text-muted-foreground py-3">
                      {d.orders > 0 ? `${Math.round(d.revenue / d.orders).toLocaleString("ar-EG")} ج` : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
