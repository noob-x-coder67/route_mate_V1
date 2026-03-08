import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { Search, Send, MessageSquare, Trash2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/conversations`, { headers });
      const data = await res.json();
      const convs = data.data.conversations || [];

      // If we're viewing a conversation, force its unread to 0
      const updatedConvs = convs.map((c: any) =>
        c.userId === selectedUserIdRef.current ? { ...c, unreadCount: 0 } : c,
      );

      setConversations(updatedConvs);
      const total = updatedConvs.reduce(
        (sum: number, c: any) => sum + (c.unreadCount || 0),
        0,
      );
      window.dispatchEvent(
        new CustomEvent("unreadCountUpdate", { detail: total }),
      );
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };
  const [searchParams] = useSearchParams();

  const socketRef = useRef<Socket | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const SOCKET_URL =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5001";
    socketRef.current = io(SOCKET_URL);

    if (user?.id) {
      socketRef.current.emit("join", user.id);
    }

    socketRef.current.on("newMessage", (message: any) => {
      const currentId = selectedUserIdRef.current;
      const isCurrentConv =
        message.senderId === currentId || message.receiverId === currentId;

      setMessages((prev) => {
        if (isCurrentConv) return [...prev, message];
        return prev;
      });

      if (isCurrentConv && message.senderId !== user?.id) {
        fetch(`${API_URL}/messages/read/${message.senderId}`, {
          method: "PATCH",
          headers,
        }).then(() => {
          fetchConversations();
          window.dispatchEvent(new Event("messagesRead"));
        });
      } else {
        fetchConversations();
        window.dispatchEvent(new Event("messagesRead"));
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id]); // ← only user?.id, nothing else

  useEffect(() => {
    const userId = searchParams.get("userId");
    const userName = searchParams.get("userName");
    if (userId && userName && userId !== selectedUserId) {
      setSelectedUserId(userId);
      selectedUserIdRef.current = userId; // ← add this
      setSelectedUser({ id: userId, name: userName, department: "" });
      fetchMessages(userId);
    }
  }, [searchParams]);

  const fetchMessages = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/${userId}`, { headers });
      const data = await res.json();
      setMessages(data.data.messages || []);

      // Wait for markAsRead to complete first
      await fetch(`${API_URL}/messages/${userId}/read`, {
        method: "PATCH",
        headers,
      });

      // Then fetch updated conversations
      await fetchConversations();
      window.dispatchEvent(new Event("messagesRead"));
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);
  // After setMessages and fetchConversations, clear count for current conversation

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = (conv: any) => {
    setSelectedUserId(conv.userId);
    selectedUserIdRef.current = conv.userId; // ← add this
    setSelectedUser(conv.user);
    fetchMessages(conv.userId);
    fetchConversations();
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === conv.userId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  };
  // delete conversation
  const handleDeleteConversation = async (userId: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      const res = await fetch(`${API_URL}/messages/${userId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConversations((prev) => prev.filter((c) => c.userId !== userId));
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setSelectedUser(null);
        setMessages([]);
      }
      toast({ title: "Conversation deleted" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          receiverId: selectedUserId,
          content: newMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Add to local messages immediately
      setMessages((prev) => [...prev, data.data.message]);
      setNewMessage("");
      fetchConversations();

      // Emit via socket for real-time delivery
      socketRef.current?.emit("sendMessage", {
        senderId: user?.id,
        receiverId: selectedUserId,
        content: newMessage,
        message: data.data.message,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredConvs = conversations.filter((c) =>
    c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Layout showFooter={false}>
      <div
        className="container py-6"
        style={{ height: "calc(100vh - 4rem)", overflow: "hidden" }}
      >
        <div
          className="grid md:grid-cols-3 gap-4 h-full"
          style={{ maxHeight: "100%" }}
        >
          {/* Contacts */}
          <Card className="md:col-span-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">
                    Request a ride to start messaging
                  </p>
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <div
                    key={conv.userId}
                    className={cn(
                      "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors border-b group",
                      selectedUserId === conv.userId && "bg-muted",
                    )}
                  >
                    <div
                      className="flex-1 flex items-center gap-3"
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(conv.user?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.user?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.userId);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 p-1 rounded transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedUser ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.department}
                    </p>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4 h-0">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.senderId === user?.id
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            msg.senderId === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              msg.senderId === user?.id
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <Button onClick={handleSend}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Select a conversation</p>
                  <p className="text-sm mt-1">Your messages will appear here</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
