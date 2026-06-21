import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Settings, Truck, CreditCard, Percent, Phone,
  Save, RotateCcw, CheckCircle, AlertCircle,
} from "lucide-react";

interface Setting {
  id: string;
  key: string;
  label: string;
  label_en: string;
  description: string;
  description_en: string;
  value: number;
  type: string;
  group_name: string;
  sort_order: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

const groupConfig: Record<string, { label: string; icon: any; color: string }> = {
  shipping: { label: "التوصيل والشحن", icon: Truck, color: "text-blue-500" },
  payment: { label: "الدفع والرسوم", icon: CreditCard, color: "text-emerald-500" },
  tax: { label: "الضرائب", icon: Percent, color: "text-amber-500" },
  contact: { label: "أرقام التواصل", icon: Phone, color: "text-purple-500" },
  general: { label: "عام", icon: Settings, color: "text-gray-500" },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [activeGroup, setActiveGroup] = useState("shipping");
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from("system_settings")
        .select("*")
        .order("group_name")
        .order("sort_order");

      if (error) throw error;
      setSettings(data || []);
      setEditedValues({});
      setHasChanges(false);
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: `فشل تحميل الإعدادات: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleValueChange = (key: string, value: string) => {
    const numVal = parseFloat(value);
    setEditedValues((prev) => ({ ...prev, [key]: isNaN(numVal) ? 0 : numVal }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedValues).map(([key, value]) =>
        supabaseAdmin
          .from("system_settings")
          .update({ value, "updatedAt": new Date().toISOString() })
          .eq("key", key)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Failed to save");
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ التغييرات بنجاح",
      });

      setEditedValues({});
      setHasChanges(false);
      await fetchSettings();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: `فشل الحفظ: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedValues({});
    setHasChanges(false);
    fetchSettings();
  };

  const groups = [...new Set(settings.map((s) => s.group_name))];
  const groupSettings = settings.filter((s) => s.group_name === activeGroup);

  const getDisplayValue = (setting: Setting) => {
    return editedValues[setting.key] !== undefined
      ? editedValues[setting.key]
      : setting.value;
  };

  const getChangedCount = () => Object.keys(editedValues).length;

  if (loading) {
    return (
      <div className="space-y-6 p-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
            <p className="text-muted-foreground text-sm">جاري التحميل...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الإعدادات</h1>
            <p className="text-muted-foreground text-sm">
              إدارة الأرقام والرسوم المهمة للنظام
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="border-amber-300 text-amber-600">
              <AlertCircle className="w-3 h-3 ml-1" />
              {getChangedCount()} تغيير
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            <RotateCcw className="w-4 h-4 ml-1" />
            إعادة
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="w-4 h-4 ml-1" />
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {groups.map((group) => {
          const config = groupConfig[group] || groupConfig.general;
          const Icon = config.icon;
          const count = settings.filter((s) => s.group_name === group).length;
          return (
            <Card
              key={group}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeGroup === group ? "ring-2 ring-primary/30 shadow-md" : ""
              }`}
              onClick={() => setActiveGroup(group)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{count} إعداد</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Settings Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {(() => {
              const config = groupConfig[activeGroup] || groupConfig.general;
              const Icon = config.icon;
              return (
                <>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  {config.label}
                </>
              );
            })()}
          </CardTitle>
          <CardDescription>تعديل القيم والرسوم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupSettings.map((setting) => (
              <div
                key={setting.key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{setting.label}</p>
                    {setting.label_en && (
                      <span className="text-xs text-muted-foreground">
                        ({setting.label_en})
                      </span>
                    )}
                  </div>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {setting.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Input
                      type="number"
                      value={getDisplayValue(setting)}
                      onChange={(e) => handleValueChange(setting.key, e.target.value)}
                      className={`w-32 text-left ${
                        editedValues[setting.key] !== undefined
                          ? "border-amber-300 bg-amber-50"
                          : ""
                      }`}
                      step="1"
                    />
                  </div>
                  {editedValues[setting.key] !== undefined && (
                    <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">ملاحظة مهمة</p>
              <p className="mt-1 text-xs">
                هذه القيم مستخدمة في حسابات التوصيل والشحن في التطبيق والموقع.
                عند التغيير، يُنصح بإعادة تشغيل التطبيق للتأكد من تطبيق التغييرات.
                قيم الدفع عند الاستلام (COD) تؤثر على حسابات صفحة الدفع.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
