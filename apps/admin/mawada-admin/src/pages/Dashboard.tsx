import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Info, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { SkeletonChart } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";

const SHOPIFY_COLORS = ["#008060", "#5C6AC4", "#F49342", "#9C6ADE", "#DE3618", "#008060"];

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center cursor-help">
      <Info className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors" />
      <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-52 p-2.5 text-[10px] leading-relaxed text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {text}
      </span>
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border-0 rounded-xl px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-bold font-number" style={{ color: entry.color }}>
          {Number(entry.value).toLocaleString("ar-EG")} ج
        </p>
      ))}
    </div>
  );
}

function LineChartCard({
  title,
  tooltip,
  data,
  total,
  prevTotal,
  index,
}: {
  title: string;
  tooltip: string;
  data: { date: string; current: number; previous: number }[];
  total: number;
  prevTotal: number;
  index: number;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const pctChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : total > 0 ? 100 : 0;
  const skip = Math.max(1, Math.floor(data.length / (isMobile ? 4 : 8)));
  const gradientId = `gradient-${index}`;

  return (
    <Card borderless className="shadow-sm overflow-hidden chart-card-animate" style={{ animationDelay: `${index * 0.1}s` }}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <InfoTooltip text={tooltip} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#008060]" />
              <span className="text-[10px] text-muted-foreground/50 font-medium">الحالي</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-[10px] text-muted-foreground/50 font-medium">السابق</span>
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-2xl sm:text-3xl font-bold font-number tracking-tight">
            {total.toLocaleString("ar-EG")} <span className="text-base font-semibold text-muted-foreground/40">ج</span>
          </span>
          {pctChange !== 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full font-number",
              pctChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            )}>
              {pctChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pctChange >= 0 ? "+" : ""}{pctChange}%
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#008060" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#008060" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              fontSize={10}
              tick={{ fill: "hsl(var(--muted-foreground) / 0.5)" }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval={skip - 1}
            />
            <YAxis hide />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#008060", strokeDasharray: "4 4", strokeWidth: 1, strokeOpacity: 0.3 }}
            />
            <Area
              type="basis"
              dataKey="previous"
              stroke="#d1d5db"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              name="السابق"
              animationDuration={1200}
              animationEasing="ease-out"
            />
            <Area
              type="basis"
              dataKey="current"
              stroke="#008060"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 5, stroke: "#008060", strokeWidth: 2, fill: "#fff" }}
              name="الحالي"
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TopProductsCard({ products }: { products: { id: string; nameAr: string; soldCount: number }[] }) {
  const maxSold = products.length > 0 ? Math.max(...products.map((p) => p.soldCount)) : 0;

  return (
    <Card borderless className="shadow-sm chart-card-animate" style={{ animationDelay: "0.2s" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">الأكثر مبيعاً</CardTitle>
        <CardDescription>أفضل 5 منتجات</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3.5">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات</p>
        ) : products.map((p, idx) => {
          const pct = maxSold > 0 ? (p.soldCount / maxSold) * 100 : 0;
          const barColors = ["bg-[#008060]", "bg-[#5C6AC4]", "bg-[#F49342]", "bg-[#9C6ADE]", "bg-gray-400"];
          const dotColors = ["bg-emerald-100 text-emerald-700", "bg-indigo-100 text-indigo-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-gray-100 text-gray-500"];
          return (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[9px] font-bold font-number flex items-center justify-center shrink-0",
                    dotColors[idx] || dotColors[4]
                  )}>{idx + 1}</span>
                  <span className="text-xs font-medium truncate">{p.nameAr}</span>
                </div>
                <span className="text-[10px] font-number font-semibold text-muted-foreground/70 shrink-0 mr-2">
                  {p.soldCount} قطعة
                </span>
              </div>
              <div className="h-2 bg-[#f1f3f5] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full chart-bar-animate", barColors[idx] || barColors[4])}
                  style={{
                    width: `${pct}%`,
                    animationDelay: `${0.3 + idx * 0.1}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MethodsDonutsCard({
  currentData,
  isMobile,
}: {
  currentData: { method: string; count: number }[];
  isMobile: boolean;
}) {
  const total = currentData.reduce((s, d) => s + d.count, 0);
  const paymentLabels: Record<string, string> = {
    VISA: "فيزا", WALLET: "محفظة", COD: "عند الاستلام", BRANCH: "الفرع",
  };

  return (
    <Card borderless className="shadow-sm chart-card-animate" style={{ animationDelay: "0.3s" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">طرق الدفع</CardTitle>
        <CardDescription>توزيع الطرق الحالية</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center">
        <div className="relative py-2">
          <ResponsiveContainer width={isMobile ? 160 : 200} height={isMobile ? 160 : 200}>
            <PieChart>
              <Pie
                data={currentData.length > 0 ? currentData : [{ method: "لا توجد", count: 1 }]}
                dataKey="count"
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 48 : 65}
                outerRadius={isMobile ? 72 : 95}
                paddingAngle={3}
                strokeWidth={0}
              >
                {currentData.map((_, idx) => (
                  <Cell key={idx} fill={SHOPIFY_COLORS[idx % SHOPIFY_COLORS.length]} />
                ))}
                {currentData.length === 0 && <Cell fill="#e5e7eb" />}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-number">{total}</span>
            <span className="text-[10px] text-muted-foreground/50 font-medium">طلب</span>
          </div>
        </div>
        {currentData.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
            {currentData.map((d, idx) => (
              <div key={d.method} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SHOPIFY_COLORS[idx % SHOPIFY_COLORS.length] }} />
                <span className="text-[10px] text-muted-foreground/60">{paymentLabels[d.method] || d.method}</span>
                <span className="text-[10px] font-number font-semibold">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);

  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; current: number; previous: number }[]>([]);
  const [dailyNetRevenue, setDailyNetRevenue] = useState<{ date: string; current: number; previous: number }[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [prevTotalSales, setPrevTotalSales] = useState(0);
  const [netSales, setNetSales] = useState(0);
  const [prevNetSales, setPrevNetSales] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [currentMethods, setCurrentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const now = new Date();
      const currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - days);
      const prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - days);

      const [ordersRes, topRes] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("createdAt, total, discount, paymentStatus, paymentMethod")
          .gte("createdAt", prevStart.toISOString())
          .lte("createdAt", now.toISOString()),
        supabaseAdmin.rpc("get_top_products", { limit_count: 5 }),
      ]);

      const allOrders = ordersRes.data || [];
      const currentOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= currentStart);
      const prevOrders = allOrders.filter((o: any) => new Date(o.createdAt) < currentStart);

      setTopProducts(topRes.data || []);

      const pad = (n: number) => n.toString().padStart(2, "0");
      const formatDate = (d: Date) => {
        const months = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      };

      const buildDailyMap = (orders: any[], start: Date, length: number) => {
        const map: Record<string, { revenue: number; net: number }> = {};
        for (let i = 0; i < length; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          map[formatDate(d)] = { revenue: 0, net: 0 };
        }
        orders.forEach((o: any) => {
          const key = formatDate(new Date(o.createdAt));
          if (map[key]) {
            map[key].revenue += Number(o.total);
            map[key].net += Number(o.total) - Number(o.discount || 0);
          }
        });
        return map;
      };

      const currentDaily = buildDailyMap(currentOrders, currentStart, days);
      const prevDaily = buildDailyMap(prevOrders, prevStart, days);

      const allDates = Object.keys(currentDaily);
      setDailyRevenue(allDates.map((date) => ({
        date, current: currentDaily[date].revenue, previous: prevDaily[date]?.revenue || 0,
      })));
      setDailyNetRevenue(allDates.map((date) => ({
        date, current: currentDaily[date].net, previous: prevDaily[date]?.net || 0,
      })));

      setTotalSales(currentOrders.reduce((s: number, o: any) => s + Number(o.total), 0));
      setPrevTotalSales(prevOrders.reduce((s: number, o: any) => s + Number(o.total), 0));
      setNetSales(currentOrders.reduce((s: number, o: any) => s + Number(o.total) - Number(o.discount || 0), 0));
      setPrevNetSales(prevOrders.reduce((s: number, o: any) => s + Number(o.total) - Number(o.discount || 0), 0));

      const countMethods = (orders: any[]) => {
        const map: Record<string, number> = {};
        orders.forEach((o: any) => {
          const m = o.paymentMethod || "UNKNOWN";
          map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map).map(([method, count]) => ({ method, count }));
      };

      setCurrentMethods(countMethods(currentOrders));
    } catch (error: any) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-36 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-muted/40 rounded-lg animate-pulse mt-2" />
          </div>
          <div className="h-9 w-32 bg-muted/50 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحليلات الأداء والمقارنات</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard
          title="إجمالي الإيرادات"
          tooltip="إجمالي قيمة الطلبات المدفوعة قبل الخصومات"
          data={dailyRevenue}
          total={totalSales}
          prevTotal={prevTotalSales}
          index={0}
        />
        <LineChartCard
          title="صافي الإيرادات"
          tooltip="إجمالي الإيرادات بعد خصم قيمة الخصومات"
          data={dailyNetRevenue}
          total={netSales}
          prevTotal={prevNetSales}
          index={1}
        />
        <TopProductsCard products={topProducts} />
        <MethodsDonutsCard currentData={currentMethods} isMobile={isMobile} />
      </div>
    </div>
  );
}
