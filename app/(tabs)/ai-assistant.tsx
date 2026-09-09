import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import {
  deleteConversation,
  getLatestConversationId,
  listConversations,
  listMessages,
  sendDiagnosticMessage,
  type ChatMessage,
  type Conversation,
  type Urgency,
} from "@/lib/ai-assistant";
import { formatDateShortSr } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Vehicle = { id: number; make: string; model: string; archived: boolean };

const URGENCY_META: Record<Urgency, { label: string; color: string; wash: string; icon: "information-outline" | "alert-outline" | "alert-octagon" }> = {
  normal: { label: "", color: Colors.textSecondary, wash: "transparent", icon: "information-outline" },
  monitor: { label: "Vredi pratiti", color: Colors.warning, wash: Colors.warningWash, icon: "alert-outline" },
  stop_driving: { label: "Zaustavi vozilo bezbedno i pozovi pomoć", color: Colors.danger, wash: Colors.dangerWash, icon: "alert-octagon" },
};

export default function AiAssistantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showToast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const loadedVehicleIdRef = useRef<number | null>(null);

  // Mirrors vehicleId for the effect below, which intentionally excludes
  // vehicleId from its deps (so it doesn't refetch every time the user
  // switches vehicles) - reading state directly there would see a stale null
  // forever and keep resetting the selection back to the first vehicle on
  // every focus.
  const vehicleIdRef = useRef<number | null>(null);
  useEffect(() => {
    vehicleIdRef.current = vehicleId;
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("vehicles")
        .select("id, make, model, archived")
        .order("id", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            showToast(error.message, "error");
            setVehiclesLoaded(true);
            return;
          }
          const list = data ?? [];
          setVehicles(list);
          if (vehicleIdRef.current === null) {
            const selectable = list.filter((v) => !v.archived);
            if (selectable.length > 0) setVehicleId(selectable[0].id);
          }
          setVehiclesLoaded(true);
        });
    }, [showToast]),
  );

  useFocusEffect(
    useCallback(() => {
      if (vehicleId === null || loadedVehicleIdRef.current === vehicleId) return;
      loadedVehicleIdRef.current = vehicleId;
      setMessagesLoading(true);
      setMessages([]);
      setConversationId(null);
      getLatestConversationId(vehicleId)
        .then((convId) => {
          setConversationId(convId);
          if (convId === null) return [];
          return listMessages(convId);
        })
        .then((msgs) => {
          if (msgs) setMessages(msgs);
          setMessagesLoading(false);
        })
        .catch((err) => {
          showToast(err instanceof Error ? err.message : "Greška pri učitavanju razgovora", "error");
          setMessagesLoading(false);
        });
    }, [vehicleId, showToast]),
  );

  async function handleSend() {
    const text = input.trim();
    if (!text || vehicleId === null || sending) return;

    const optimisticMessage: ChatMessage = {
      id: -Date.now(),
      conversation_id: conversationId ?? -1,
      role: "user",
      content: text,
      urgency: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSending(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      const result = await sendDiagnosticMessage(vehicleId, conversationId, text);
      setConversationId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: -Date.now() - 1,
          conversation_id: result.conversationId,
          role: "assistant",
          content: result.reply,
          urgency: result.urgency,
          created_at: new Date().toISOString(),
        },
      ]);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Greška pri slanju poruke", "error");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setHistoryVisible(false);
  }

  function openHistory() {
    if (vehicleId === null) return;
    setHistoryVisible(true);
    setHistoryLoading(true);
    listConversations(vehicleId)
      .then((list) => {
        setConversations(list);
        setHistoryLoading(false);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Greška pri učitavanju istorije", "error");
        setHistoryLoading(false);
      });
  }

  function handleSelectConversation(id: number) {
    setHistoryVisible(false);
    if (id === conversationId) return;
    setConversationId(id);
    setMessages([]);
    setMessagesLoading(true);
    listMessages(id)
      .then((msgs) => {
        setMessages(msgs);
        setMessagesLoading(false);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "Greška pri učitavanju razgovora", "error");
        setMessagesLoading(false);
      });
  }

  function handleDeleteConversation(id: number) {
    Alert.alert("Obriši razgovor?", "Ova poruka se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteConversation(id);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (id === conversationId) {
              setConversationId(null);
              setMessages([]);
            }
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Greška pri brisanju razgovora", "error");
          }
        },
      },
    ]);
  }

  const vehicleOptions = vehicles
    .filter((v) => !v.archived)
    .map((v) => ({ value: v.id, label: `${v.make} ${v.model}` }));

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={{ paddingTop: insets.top + Spacing.md, paddingHorizontal: Spacing.xl }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>AI Dijagnostika</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={handleNewChat} hitSlop={8} style={styles.headerButton}>
              <Icon name="plus-circle-outline" size={22} color={Colors.textPrimary} />
            </Pressable>
            <Pressable onPress={openHistory} hitSlop={8} style={styles.headerButton}>
              <Icon name="history" size={22} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>
        {!vehiclesLoaded ? (
          <Skeleton height={54} radius={3} style={{ marginBottom: Spacing.lg }} />
        ) : vehicleOptions.length > 0 ? (
          <SelectField
            placeholder="Izaberi vozilo"
            value={vehicleId}
            options={vehicleOptions}
            onChange={setVehicleId}
            sheetTitle="Izaberi vozilo"
          />
        ) : null}
      </View>

      {vehiclesLoaded && vehicleOptions.length === 0 ? (
        <EmptyState
          icon="car-side"
          title="Nema vozila"
          subtitle="Dodaj vozilo da bi mogao da koristiš AI dijagnostiku."
          actionLabel="+ Dodaj vozilo"
          onAction={() => router.push("/add-vehicle")}
        />
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messagesLoading ? (
              <Skeleton height={80} radius={3} />
            ) : messages.length === 0 ? (
              <View style={styles.introWrap}>
                <Icon name="robot-outline" size={28} color={Colors.textTertiary} />
                <Text style={styles.introText}>
                  Opiši problem sa vozilom, npr. čuje se kucanje ispod haube kad ubrzavam, i AI će ti predložiti najverovatnije uzroke na osnovu podataka o tvom vozilu.
                </Text>
              </View>
            ) : (
              messages.map((m) => (
                <View key={m.id} style={m.role === "user" ? styles.userRow : styles.assistantRow}>
                  {m.role === "assistant" && m.urgency && m.urgency !== "normal" && (
                    <View
                      style={[
                        styles.urgencyBanner,
                        { backgroundColor: URGENCY_META[m.urgency].wash, borderColor: URGENCY_META[m.urgency].color },
                      ]}
                    >
                      <Icon name={URGENCY_META[m.urgency].icon} size={16} color={URGENCY_META[m.urgency].color} />
                      <Text style={[styles.urgencyText, { color: URGENCY_META[m.urgency].color }]}>
                        {URGENCY_META[m.urgency].label}
                      </Text>
                    </View>
                  )}
                  <View style={m.role === "user" ? styles.userBubble : styles.assistantBubble}>
                    <Text style={m.role === "user" ? styles.userText : styles.assistantText}>{m.content}</Text>
                  </View>
                </View>
              ))
            )}
            {sending && (
              <View style={styles.assistantRow}>
                <View style={[styles.assistantBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={Colors.textSecondary} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.disclaimerWrap}>
            <Text style={styles.disclaimerText}>AI predlozi ne zamenjuju dijagnozu ovlašćenog mehaničara.</Text>
          </View>

          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Opiši problem..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
              multiline
              editable={!sending}
            />
            <Pressable
              onPress={handleSend}
              disabled={sending || input.trim().length === 0}
              style={[styles.sendButton, (sending || input.trim().length === 0) && styles.sendButtonDisabled]}
            >
              <Icon name="arrow-up" size={20} color={Colors.background} />
            </Pressable>
          </View>
        </>
      )}

      <BottomSheet visible={historyVisible} onClose={() => setHistoryVisible(false)} title="Istorija razgovora">
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          {historyLoading ? (
            <Skeleton height={56} radius={3} />
          ) : conversations.length === 0 ? (
            <Text style={styles.historyEmptyText}>Još nema razgovora za ovo vozilo.</Text>
          ) : (
            conversations.map((c) => (
              <View key={c.id} style={styles.historyRow}>
                <Pressable style={styles.historyRowMain} onPress={() => handleSelectConversation(c.id)}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {c.title || "Razgovor"}
                  </Text>
                  <Text style={styles.historyMeta}>{formatDateShortSr(c.updated_at)}</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteConversation(c.id)} hitSlop={8} style={styles.historyDeleteButton}>
                  <Icon name="trash-can-outline" size={18} color={Colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  headerActions: { flexDirection: "row", gap: Spacing.md },
  headerButton: { padding: 2 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  historyRowMain: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  historyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  historyMeta: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  historyDeleteButton: { padding: Spacing.sm },
  historyEmptyText: { ...Typography.body, color: Colors.textSecondary, paddingVertical: Spacing.lg },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  introWrap: { alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.lg },
  introText: { ...Typography.body, color: Colors.textSecondary, textAlign: "center" },
  userRow: { alignItems: "flex-end" },
  assistantRow: { alignItems: "flex-start" },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: Colors.accentWash,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  assistantBubble: {
    maxWidth: "85%",
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  typingBubble: { paddingVertical: Spacing.sm },
  userText: { ...Typography.body, color: Colors.textPrimary },
  assistantText: { ...Typography.body, color: Colors.textPrimary },
  urgencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    maxWidth: "85%",
  },
  urgencyText: { ...Typography.caption, flexShrink: 1 },
  disclaimerWrap: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm },
  disclaimerText: { ...Typography.tag, color: Colors.textTertiary, textAlign: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
});
