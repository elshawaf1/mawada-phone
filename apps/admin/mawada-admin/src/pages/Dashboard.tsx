import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Info, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { SkeletonChart } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";

const paymentMethodLabels: Record<string, string> = {
  VISA: "فيزا", FAWRY: "فوري", INSTAPAY: "انستا باي", WALLET: "محفظة", COD: "عند الاستلام", BRANCH: "الفرع",
};

const DONUT_COLORS = ["#0055FF", "#10B981", "#8B5CF6", "#F59E0B", "#6B7280", "#EF4444"];

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
    <div className="bg-white/95 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-medium font-number" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString("ar-EG")} ج
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
}: {
  title: string;
  tooltip: string;
  data: { date: string; current: number; previous: number }[];
  total: number;
  prevTotal: number;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const pctChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : total > 0 ? 100 : 0;
  const maxVal = Math.max(...data.map((d) => Math.max(d.current, d.previous)), 1);
  const tickCount = data.length > 60 ? Math.ceil(data.length / 15) : data.length > 30 ? Math.ceil(data.length / 7) : Math.ceil(data.length / 5);
  const skip = Math.max(1, Math.floor(data.length / 10));

  return (
    <Card borderless className="shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <InfoTooltip text={tooltip} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0055FF]" />
              <span className="text-[9px] text-muted-foreground/60">الحالي</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E5E7EB]" />
              <span className="text-[9px] text-muted-foreground/60">السابق</span>
            </div>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl sm:text-2xl font-bold font-number">{total.toLocaleString("ar-EG")} ج</span>
          {pctChange !== 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-medium font-number",
              pctChange >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {pctChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pctChange >= 0 ? "+" : ""}{pctChange}%
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              angle={-90}
              textAnchor="end"
              fontSize={9}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              height={70}
              interval={skip - 1}
            />
            <YAxis
              fontSize={9}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="current" stroke="#0055FF" strokeWidth={2.5} dot={false} name="الحالي" />
            <Line type="monotone" dataKey="previous" stroke="#E5E7EB" strokeWidth={2} dot={false} name="السابق" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TopProductsCard({ products }: { products: { id: string; nameAr: string; soldCount: number }[] }) {
  const maxSold = products.length > 0 ? Math.max(...products.map((p) => p.soldCount)) : 0;
  return (
    <Card borderless className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">الأكثر مبيعاً</CardTitle>
        <CardDescription>أفضل 5 منتجات</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات</p>
        ) : products.map((p, idx) => {
          const pct = maxSold > 0 ? Math.round((p.soldCount / maxSold) * 100) : 0;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded-full text-[9px] font-bold font-number flex items-center justify-center shrink-0",
                idx === 0 ? "bg-emerald-100 text-emerald-700" : idx === 1 ? "bg-blue-100 text-blue-700" : idx === 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
              )}>{idx + 1}</span>
              <span className="flex-1 text-xs truncate">{p.nameAr}</span>
              <div className="w-16 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : "bg-primary/40")}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[9px] font-number text-muted-foreground w-7 text-left">{pct}%</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MethodsDonutsCard({
  currentData,
  prevData,
}: {
  currentData: { method: string; count: number }[];
  prevData: { method: string; count: number }[];
}) {
  return (
    <Card borderless className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">طرق الدفع</CardTitle>
        <CardDescription>مقارنة الفترتين</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center">
        <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
          <div className="relative">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={currentData.length > 0 ? currentData : [{ method: "لا توجد", count: 1 }]}
                  dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2}>
                  {currentData.map((_, idx) => (
                    <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                  ))}
                  {currentData.length === 0 && <Cell fill="#E5E7EB" />}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-foreground">الحالي</span>
            </div>
          </div>
          <div className="relative">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={prevData.length > 0 ? prevData : [{ method: "لا توجد", count: 1 }]}
                  dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2}>
                  {prevData.map((_, idx) => (
                    <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} fillOpacity={0.25} />
                  ))}
                  {prevData.length === 0 && <Cell fill="#E5E7EB" fillOpacity={0.25} />}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-muted-foreground">السابق</span>
            </div>
          </div>
        </div>
        {currentData.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2">
            {currentData.map((d, idx) => (
              <div key={d.method} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                <span className="text-[10px] text-muted-foreground">{paymentMethodLabels[d.method] || d.method}</span>
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
  const [prevMethods, setPrevMethods] = useState<any[]>([]);

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
        supabase
          .from("orders")
          .select("createdAt, total, discount, paymentStatus, paymentMethod")
          .gte("createdAt", prevStart.toISOString())
          .lte("createdAt", now.toISOString()),
        supabase.rpc("get_top_products", { limit_count: 5 }),
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
          if (o.paymentStatus === "PAID") {
            const key = formatDate(new Date(o.createdAt));
            if (map[key]) {
              map[key].revenue += Number(o.total);
              map[key].net += Number(o.total) - Number(o.discount || 0);
            }
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

      const paidCurrent = currentOrders.filter((o: any) => o.paymentStatus === "PAID");
      const paidPrev = prevOrders.filter((o: any) => o.paymentStatus === "PAID");

      setTotalSales(paidCurrent.reduce((s: number, o: any) => s + Number(o.total), 0));
      setPrevTotalSales(paidPrev.reduce((s: number, o: any) => s + Number(o.total), 0));
      setNetSales(paidCurrent.reduce((s: number, o: any) => s + Number(o.total) - Number(o.discount || 0), 0));
      setPrevNetSales(paidPrev.reduce((s: number, o: any) => s + Number(o.total) - Number(o.discount || 0), 0));

      const countMethods = (orders: any[]) => {
        const map: Record<string, number> = {};
        orders.forEach((o: any) => {
          const m = o.paymentMethod || "UNKNOWN";
          map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map).map(([method, count]) => ({ method, count }));
      };

      setCurrentMethods(countMethods(currentOrders));
      setPrevMethods(countMethods(prevOrders));
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
        />
        <LineChartCard
          title="صافي الإيرادات"
          tooltip="إجمالي الإيرادات بعد خصم قيمة الخصومات"
          data={dailyNetRevenue}
          total={netSales}
          prevTotal={prevNetSales}
        />
        <TopProductsCard products={topProducts} />
        <MethodsDonutsCard currentData={currentMethods} prevData={prevMethods} />
      </div>
    </div>
  );
}
