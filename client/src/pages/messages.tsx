import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { ConversationWithDetails, MessageWithSender } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, ArrowLeft, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedConvo, setSelectedConvo] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedConvo, "messages"],
    enabled: !!selectedConvo,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/conversations/${selectedConvo}/messages`, { content }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConvo, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (conversationId: number) =>
      apiRequest("POST", `/api/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    if (selectedConvo) {
      markReadMutation.mutate(selectedConvo);
    }
  }, [selectedConvo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConversation = conversations?.find(c => c.id === selectedConvo);

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4" data-testid="text-messages-title">Pesan</h1>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <Card className={`border border-border overflow-hidden flex flex-col ${selectedConvo ? "hidden md:flex md:w-80" : "flex-1"}`}>
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold">Percakapan</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
              </div>
            ) : conversations?.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Belum ada percakapan</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Mulai chat dari profil pengguna lain</p>
              </div>
            ) : (
              conversations?.map((convo) => (
                <div
                  key={convo.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover-elevate ${selectedConvo === convo.id ? "bg-primary/10" : ""}`}
                  onClick={() => setSelectedConvo(convo.id)}
                  data-testid={`conversation-item-${convo.id}`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={convo.otherUser.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {convo.otherUser.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{convo.otherUser.displayName}</span>
                      {convo.otherUser.isVerified && <VerifiedBadge className="w-3 h-3" />}
                      {convo.unreadCount > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold" data-testid={`badge-unread-${convo.id}`}>
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    {convo.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage.senderId === user.id ? "Kamu: " : ""}
                        {convo.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className={`border border-border overflow-hidden flex flex-col ${selectedConvo ? "flex-1" : "hidden md:flex md:flex-1"}`}>
          {selectedConvo && selectedConversation ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setSelectedConvo(null)}
                  data-testid="button-back-conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedConversation.otherUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {selectedConversation.otherUser.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{selectedConversation.otherUser.displayName}</span>
                    {selectedConversation.otherUser.isVerified && <VerifiedBadge className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">@{selectedConversation.otherUser.username}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-3/4 rounded-md" />)}
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Mulai percakapan...</p>
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`message-item-${msg.id}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-md text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(msg.createdAt!), { addSuffix: true, locale: idLocale })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Tulis pesan..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Pilih percakapan untuk mulai mengobrol</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
