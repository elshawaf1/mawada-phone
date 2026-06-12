import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Send, Trash2, Bell, Users, User, Loader2, Info, ChevronDown, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const typeBadge: Record<string, { label: string; style: string }> = {
  info: { label: "معلومات", style: "bg-amber-100 text-amber-700 border-amber-200" },
  order: { label: "طلب", style: "bg-blue-100 text-blue-700 border-blue-200" },
  promo: { label: "عرض", style: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  system: { label: "نظام", style: "bg-purple-100 text-purple-700 border-purple-200" },
};

const typeOptions = [
  { value: "info", label: "معلومات" },
  { value: "order", label: "طلب" },
  { value: "promo", label: "عرض" },
  { value: "system", label: "نظام" },
];

interface BroadcastItem {
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  type: string;
  sentBy: string;
  createdAt: string;
  recipientCount: number;
  ids: string[];
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [body, setBody] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [targetType, setTargetType] = useState("all");
  const [orderId, setOrderId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, titleAr, body, bodyAr, type, sentBy, createdAt")
        .not("sentBy", "is", null)
        .order("createdAt", { ascending: false });

      if (error) throw error;

      const grouped: Record<string, { item: BroadcastItem; ids: string[] }> = {};
      (data || []).forEach((n: any) => {
        const key = `${n.title}|${n.body}|${n.type}|${n.createdAt}`;
        if (grouped[key]) {
          grouped[key].item.recipientCount += 1;
          grouped[key].ids.push(n.id);
        } else {
          grouped[key] = {
            item: { ...n, recipientCount: 1, ids: [] },
            ids: [n.id],
          };
        }
      });

      setBroadcasts(Object.values(grouped).map((g) => ({ ...g.item, ids: g.ids })));
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchUsers(value), 300);
  };

  const resetForm = () => {
    setTitle("");
    setTitleAr("");
    setBody("");
    setBodyAr("");
    setNotifType("info");
    setTargetType("all");
    setOrderId("");
    setSearchQuery("");
    setSelectedUser(null);
    setSearchResults([]);
  };

  const sendNotification = async () => {
    if (!titleAr && !title) {
      toast({ title: "خطأ", description: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    if (!bodyAr && !body) {
      toast({ title: "خطأ", description: "المحتوى مطلوب", variant: "destructive" });
      return;
    }
    if (targetType === "specific" && !selectedUser) {
      toast({ title: "خطأ", description: "يرجى اختيار مستخدم", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("notification-broadcast", {
        body: {
          title: title || titleAr,
          titleAr: titleAr || title,
          body: body || bodyAr,
          bodyAr: bodyAr || body,
          type: notifType,
          orderId: orderId.trim() || null,
          targetUserId: targetType === "specific" ? selectedUser!.id : null,
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      toast({ title: "تم", description: "تم إرسال الإشعار بنجاح" });
      setShowForm(false);
      resetForm();
      fetchBroadcasts();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const deleteBroadcast = async (item: BroadcastItem) => {
    try {
      if (!item.ids || item.ids.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", item.ids);

      if (error) throw error;

      toast({ title: "تم", description: "تم حذف الإشعار" });
      fetchBroadcasts();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} أيام`;
    return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="h-7 w-40 bg-muted/60 rounded-lg animate-pulse" />
        <div className="h-4 w-56 bg-muted/40 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-muted/50 rounded-xl animate-pulse mt-6" />
        <div className="space-y-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الإشعارات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إرسال وإدارة الإشعارات للمستخدمين</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="shadow-sm">
          <Plus className="w-4 h-4 ml-2" />
          إرسال إشعار
        </Button>
      </div>

      {broadcasts.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-5">
              <Bell className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold mb-1">لا توجد إشعارات مرسلة</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              قم بإرسال إشعار جديد لجميع المستخدمين أو لمستخدم معين
            </p>
            <Button variant="outline" className="mt-6" onClick={() => { resetForm(); setShowForm(true); }}>
              <Send className="w-4 h-4 ml-2" />
              إرسال أول إشعار
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card borderless className="shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-right font-semibold text-foreground/70">العنوان</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">النوع</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">الهدف</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">المستلمون</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">التاريخ</TableHead>
                <TableHead className="text-right font-semibold text-foreground/70">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((item) => (
                <TableRow key={`${item.title}-${item.createdAt}`} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.titleAr || item.title}</span>
                      <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.bodyAr || item.body}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("font-medium border", typeBadge[item.type]?.style)} variant="outline">
                      {typeBadge[item.type]?.label || item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>الكل</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-number font-medium">{item.recipientCount}</span>
                    <span className="text-xs text-muted-foreground mr-1">مستخدم</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => deleteBroadcast(item)}>
                      <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>إرسال إشعار جديد</DialogTitle>
            <DialogDescription>سيتم إرسال الإشعار لجميع المستخدمين أو لمستخدم محدد</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العنوان (العربية) *</Label>
                <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="عنوان الإشعار" />
              </div>
              <div className="space-y-2">
                <Label>العنوان (English)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المحتوى (العربية) *</Label>
                <Textarea value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} placeholder="نص الإشعار" className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>المحتوى (English)</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body" className="min-h-[80px]" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>نوع الإشعار</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ربط بطلب (اختياري)</Label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="مثال: or-AB12CD3"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">عند الضغط على الإشعار سيتم فتح تفاصيل هذا الطلب</p>
            </div>

            <div className="space-y-3">
              <Label>إلى</Label>
              <RadioGroup value={targetType} onValueChange={setTargetType} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">جميع المستخدمين</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <Label htmlFor="specific" className="font-normal cursor-pointer">مستخدم محدد</Label>
                </div>
              </RadioGroup>

              {targetType === "specific" && (
                <div className="space-y-2">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedUser ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{selectedUser.name || selectedUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">ابحث عن مستخدم...</span>
                        )}
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2" align="start">
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="ابحث بالاسم أو البريد..."
                            className="pr-10"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {searching ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map((profile) => (
                              <button
                                key={profile.id}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right text-sm transition-colors",
                                  selectedUser?.id === profile.id
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted"
                                )}
                                onClick={() => {
                                  setSelectedUser(profile);
                                  setSearchQuery(profile.name || profile.email);
                                  setSearchOpen(false);
                                }}
                              >
                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{profile.name || "بدون اسم"}</span>
                                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                                </div>
                                {selectedUser?.id === profile.id && (
                                  <Check className="w-4 h-4 mr-auto text-primary" />
                                )}
                              </button>
                            ))
                          ) : searchQuery.length >= 2 ? (
                            <p className="text-center text-sm text-muted-foreground py-6">لا توجد نتائج</p>
                          ) : (
                            <p className="text-center text-sm text-muted-foreground py-6">اكتب على الأقل حرفين للبحث</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={sendNotification} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
              {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
