import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Login failed:", err);
      const message = err?.message || err?.error_description || "فشل تسجيل الدخول";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.06),transparent_60%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.04),transparent_70%)]" />

      <div className="w-full max-w-[380px] relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-semibold text-white tracking-tight" style={{ fontFamily: "'Inter', 'Tajawal', sans-serif" }}>
            موده فون
          </h1>
          <p className="text-[#64748B] text-[13px] mt-1.5 tracking-wide">لوحة تحكم الإدارة</p>
        </div>

        <div className="bg-[#0A0F1A]/80 backdrop-blur-2xl border border-[rgba(255,255,255,0.04)] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#94A3B8] text-right">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                required
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#334155] rounded-xl px-4 py-3 outline-none focus:border-[rgba(99,102,241,0.4)] focus:bg-[rgba(255,255,255,0.05)] transition-all text-[14px] tracking-wide"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#94A3B8] text-right">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                  className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#334155] rounded-xl px-4 py-3 pl-11 outline-none focus:border-[rgba(99,102,241,0.4)] focus:bg-[rgba(255,255,255,0.05)] transition-all text-[14px] tracking-wide"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[#EF4444] text-[12px] text-center leading-relaxed py-0.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-white/90 text-[#020408] font-semibold text-[14px] py-3 rounded-xl transition-all duration-200 disabled:opacity-40 mt-1 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#020408]/20 border-t-[#020408] rounded-full animate-spin" />
              ) : (
                <>
                  تسجيل الدخول
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#334155] text-[11px] mt-8">
          Mawada Phone &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
