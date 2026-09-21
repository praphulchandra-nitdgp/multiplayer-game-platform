import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { fetchMessages, sendMessage, type Profile } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RoomChat({
  roomId,
  userId,
  profiles,
  canPost,
}: {
  roomId: string;
  userId: string | null;
  profiles: Record<string, Profile>;
  canPost: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement | null>(null);

  const messages = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessages(roomId),
  });

  useRealtime(`chat-${roomId}`, [{ table: "messages", filter: `room_id=eq.${roomId}` }], () => {
    queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.data?.length]);

  const post = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in to chat.");
      const body = draft.trim();
      if (!body) return;
      await sendMessage({ roomId, userId, body });
    },
    onSuccess: () => setDraft(""),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel flex h-[28rem] flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="text-eyebrow">Room chat</p>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {(messages.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          (messages.data ?? []).map((message) => {
            const author = profiles[message.user_id];
            const mine = message.user_id === userId;
            return (
              <div key={message.id} className={mine ? "text-right" : ""}>
                <p className="text-xs text-muted-foreground">
                  {mine ? "You" : author?.display_name ?? "Player"}
                </p>
                <p
                  className={`mt-1 inline-block max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                  }`}
                >
                  {message.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          post.mutate();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={canPost ? "Message the room" : "Join the room to chat"}
          disabled={!canPost || post.isPending}
          maxLength={400}
        />
        <Button type="submit" disabled={!canPost || post.isPending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
