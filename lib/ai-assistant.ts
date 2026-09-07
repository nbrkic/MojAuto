import { supabase } from "@/lib/supabase";

export type ChatRole = "user" | "assistant";
export type Urgency = "normal" | "monitor" | "stop_driving";

export type ChatMessage = {
  id: number;
  conversation_id: number;
  role: ChatRole;
  content: string;
  urgency: Urgency | null;
  created_at: string;
};

export type SendDiagnosticResult = { conversationId: number; reply: string; urgency: Urgency };

export type Conversation = {
  id: number;
  vehicle_id: number;
  title: string | null;
  updated_at: string;
};

/** Most recent conversation for a vehicle, used to reopen where the user left off when the screen loads. */
export async function getLatestConversationId(vehicleId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function listConversations(vehicleId: number): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, vehicle_id, title, updated_at")
    .eq("vehicle_id", vehicleId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Deletes a conversation and (via FK cascade) all of its messages. */
export async function deleteConversation(conversationId: number): Promise<void> {
  const { error } = await supabase.from("ai_conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

export async function listMessages(conversationId: number): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, conversation_id, role, content, urgency, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Calls the ai-diagnose Edge Function, which runs the Gemini tool-calling
 * loop server-side and persists both sides of the exchange. Surfaces the
 * function's own {error} body on non-2xx responses instead of a generic
 * "Edge Function returned a non-2xx status code" message.
 */
export async function sendDiagnosticMessage(
  vehicleId: number,
  conversationId: number | null,
  message: string,
): Promise<SendDiagnosticResult> {
  const { data, error } = await supabase.functions.invoke("ai-diagnose", {
    body: { vehicleId, conversationId, message },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.json();
        throw new Error(body?.error ?? error.message);
      } catch {
        throw new Error(error.message);
      }
    }
    throw error;
  }

  return data as SendDiagnosticResult;
}
