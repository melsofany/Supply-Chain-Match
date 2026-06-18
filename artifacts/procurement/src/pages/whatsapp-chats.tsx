import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, User, Building2, HelpCircle, Search, CheckCheck, Phone } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Chat {
  phone: string;
  contact_name: string | null;
  contact_type: "customer" | "supplier" | "unknown";
  contact_id: number | null;
  last_message_at: string;
  last_message: string;
  last_direction: "inbound" | "outbound";
  unread_count: number;
}

interface WaMessage {
  id: number;
  phone: string;
  contact_name: string | null;
  contact_type: string | null;
  direction: "inbound" | "outbound";
  body: string;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`;
  return d.toLocaleDateString("ar-EG");
}

function typeIcon(type: string | null) {
  if (type === "customer") return <User className="h-4 w-4 text-blue-400" />;
  if (type === "supplier") return <Building2 className="h-4 w-4 text-orange-400" />;
  return <HelpCircle className="h-4 w-4 text-slate-400" />;
}

function typeLabel(type: string | null) {
  if (type === "customer") return "عميل";
  if (type === "supplier") return "مورد";
  return "غير معروف";
}

function typeBadgeClass(type: string | null) {
  if (type === "customer") return "bg-blue-100 text-blue-700 border-blue-200";
  if (type === "supplier") return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function avatarBg(type: string | null) {
  if (type === "customer") return "bg-blue-500";
  if (type === "supplier") return "bg-orange-500";
  return "bg-slate-400";
}

export default function WhatsAppChats() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["whatsapp-chats"],
    queryFn: () => customFetch<Chat[]>("/api/whatsapp-chats"),
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<WaMessage[]>({
    queryKey: ["whatsapp-messages", selectedPhone],
    queryFn: () =>
      customFetch<WaMessage[]>(`/api/whatsapp-chats/${encodeURIComponent(selectedPhone!)}/messages`),
    enabled: !!selectedPhone,
    refetchInterval: 5000,
  });

  const markRead = useMutation({
    mutationFn: (phone: string) =>
      customFetch(`/api/whatsapp-chats/${encodeURIComponent(phone)}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-chats"] }),
  });

  const sendMutation = useMutation({
    mutationFn: ({ phone, body }: { phone: string; body: string }) =>
      customFetch(`/api/whatsapp-chats/${encodeURIComponent(phone)}/send`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", selectedPhone] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
    },
    onError: (err: any) =>
      toast({ title: "خطأ في الإرسال", description: err.message, variant: "destructive" }),
  });

  function selectChat(phone: string) {
    setSelectedPhone(phone);
    markRead.mutate(phone);
  }

  function handleSend() {
    if (!selectedPhone || !replyText.trim()) return;
    sendMutation.mutate({ phone: selectedPhone, body: replyText.trim() });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredChats = chats.filter((c) => {
    const name = (c.contact_name ?? c.phone).toLowerCase();
    return name.includes(search.toLowerCase()) || c.phone.includes(search);
  });

  const selectedChat = chats.find((c) => c.phone === selectedPhone);

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden" dir="rtl">

      {/* ── Sidebar: قائمة المحادثات ─────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-l flex flex-col bg-white">
        <div className="p-4 border-b bg-[#1a2a3a]">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-green-400" />
            <h1 className="text-white font-semibold text-base">محادثات واتساب</h1>
          </div>
          <div className="relative">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="pr-8 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد محادثات بعد</p>
              <p className="text-xs mt-1">ستظهر هنا رسائل العملاء والموردين</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.phone === selectedPhone;
              const name = chat.contact_name ?? chat.phone;
              return (
                <button
                  key={chat.phone}
                  onClick={() => selectChat(chat.phone)}
                  className={`w-full text-right px-4 py-3 border-b transition-colors flex items-start gap-3 ${
                    isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white ${avatarBg(chat.contact_type)}`}>
                    {(name.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-800 truncate">{name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 mr-1">{timeAgo(chat.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500 truncate flex-1">
                        {chat.last_direction === "outbound" && <span className="text-green-600 ml-1">↩</span>}
                        {chat.last_message}
                      </p>
                      {Number(chat.unread_count) > 0 && (
                        <span className="shrink-0 mr-1 h-5 min-w-[20px] px-1 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] border rounded px-1 mt-0.5 inline-block ${typeBadgeClass(chat.contact_type)}`}>
                      {typeLabel(chat.contact_type)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main: نافذة المحادثة ─────────────────────────────────────────── */}
      {selectedPhone && selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5]">
          {/* Chat header */}
          <div className="px-5 py-3 bg-white border-b flex items-center gap-3 shadow-sm">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarBg(selectedChat.contact_type)}`}>
              {((selectedChat.contact_name ?? selectedChat.phone).charAt(0) || "?").toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">
                {selectedChat.contact_name ?? selectedChat.phone}
              </p>
              <div className="flex items-center gap-1.5">
                {typeIcon(selectedChat.contact_type)}
                <span className="text-xs text-slate-500">{typeLabel(selectedChat.contact_type)}</span>
                <span className="text-slate-300">·</span>
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-400 font-mono">{selectedChat.phone}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {msgsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                    <Skeleton className="h-10 w-48 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                لا توجد رسائل
              </div>
            ) : (
              messages.map((msg) => {
                // outbound = رسائلنا نحن = يمين + أخضر
                // inbound  = رسائل العميل/المورد = يسار + أبيض
                const isOut = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                        isOut
                          ? "bg-[#dcf8c6] text-slate-800 rounded-tl-sm"
                          : "bg-white text-slate-800 rounded-tr-sm"
                      }`}
                      style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
                    >
                      {msg.body}
                      <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isOut && <CheckCheck className="h-3 w-3 text-blue-400" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="px-4 py-3 bg-white border-t flex items-center gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 rounded-full border-slate-200 bg-[#f0f2f5] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={sendMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!replyText.trim() || sendMutation.isPending}
              className="shrink-0 bg-green-500 hover:bg-green-600 h-10 w-10 p-0 rounded-full"
            >
              <Send className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-slate-400">
          <div className="bg-white rounded-full p-6 mb-4 shadow-sm">
            <MessageCircle className="h-12 w-12 text-green-400" />
          </div>
          <p className="text-lg font-medium text-slate-600">اختر محادثة</p>
          <p className="text-sm mt-1">اختر محادثة من القائمة لعرض الرسائل والرد عليها</p>
        </div>
      )}
    </div>
  );
}
