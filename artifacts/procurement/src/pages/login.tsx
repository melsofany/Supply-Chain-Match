import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      login(token, user);
    } catch (err: any) {
      setError(err.message ?? "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #0f1f3d 0%, #1a2a3a 50%, #154d75 100%)",
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, #f97316 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1e6fa8 0%, transparent 50%)",
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo card */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-2xl mb-4">
            <img src="/logo.jpeg" alt="AL-KHEDIVI" className="h-20 w-auto object-contain" />
          </div>
          <p className="text-white/60 text-sm">نظام إدارة التوريدات</p>
        </div>

        {/* Login card */}
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Lock className="h-5 w-5" style={{ color: "#1e6fa8" }} />
              تسجيل الدخول
            </CardTitle>
            <CardDescription>أدخل بيانات حسابك للمتابعة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@system.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="text-right focus-visible:ring-[#1e6fa8]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="text-right pl-10 focus-visible:ring-[#1e6fa8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-semibold text-white"
                style={{ background: "linear-gradient(to left, #154d75, #1e6fa8)" }}
                disabled={loading}
              >
                {loading ? "جارٍ الدخول..." : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-white/30 text-xs mt-4">
          AL-KHEDIVI General Supplies & Contracting
        </p>
      </div>
    </div>
  );
}
