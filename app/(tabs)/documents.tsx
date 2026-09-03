import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { DOCUMENT_CATEGORIES, getDocumentCategory } from "@/constants/document-categories";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { formatDateNumericSr } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { deleteVehicleDocumentFile } from "@/lib/vehicle-documents";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DocumentRow = {
  id: number;
  category: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
  vehicles: { make: string; model: string } | null;
};

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    supabase
      .from("documents")
      .select("id, category, title, file_url, file_type, created_at, vehicles(make, model)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        hasLoadedRef.current = true;
        if (error) {
          showToast(error.message, "error");
          setLoading(false);
          return;
        }
        setDocuments((data ?? []) as unknown as DocumentRow[]);
        setLoading(false);
      });
  }, [showToast]);

  useFocusEffect(load);

  const filtered = useMemo(
    () => (categoryFilter ? documents.filter((d) => d.category === categoryFilter) : documents),
    [documents, categoryFilter],
  );

  function openDocument(url: string) {
    Linking.openURL(url).catch(() => showToast("Nije moguće otvoriti dokument", "error"));
  }

  function deleteDocument(doc: DocumentRow) {
    Alert.alert("Obriši dokument?", "Ova radnja se ne može poništiti.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Obriši",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("documents").delete().eq("id", doc.id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          deleteVehicleDocumentFile(doc.file_url);
          showToast("Dokument obrisan");
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Dokumenti</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setFilterSheetVisible(true)}
              style={[styles.filterButton, categoryFilter && styles.filterButtonActive]}
            >
              <Icon name="tune-variant" size={19} color={categoryFilter ? Colors.background : Colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push("/add-document")} style={styles.addButton}>
              <Icon name="plus" size={16} color={Colors.background} />
              <Text style={styles.addButtonText}>Dodaj dokument</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.section}>
            <Skeleton height={180} radius={0} />
          </View>
        ) : documents.length === 0 ? (
          <EmptyState
            icon="file-cabinet"
            title="Još nema dokumenata"
            subtitle="Sačuvaj saobraćajnu, polisu osiguranja, servisne fakture i druge dokumente na jednom mestu."
            actionLabel="+ Dodaj prvi dokument"
            onAction={() => router.push("/add-document")}
          />
        ) : (
          <View style={styles.section}>
            {filtered.length === 0 ? (
              <Card>
                <Text style={styles.noResults}>Nema dokumenata u ovoj kategoriji.</Text>
              </Card>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {filtered.map((doc) => {
                  const cat = getDocumentCategory(doc.category);
                  return (
                    <Card
                      key={doc.id}
                      onPress={() => openDocument(doc.file_url)}
                      style={[styles.row, { borderLeftWidth: 2, borderLeftColor: cat.color }]}
                    >
                      <View style={styles.fileTypeIcon}>
                        <Icon name={doc.file_type === "pdf" ? "file-pdf-box" : "file-image-outline"} size={20} color={cat.color} />
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{doc.title}</Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {cat.label}
                          {doc.vehicles ? ` · ${doc.vehicles.make} ${doc.vehicles.model}` : ""} ·{" "}
                          {formatDateNumericSr(doc.created_at)}
                        </Text>
                      </View>
                      <Pressable onPress={() => deleteDocument(doc)} hitSlop={8} style={styles.rowDelete}>
                        <Icon name="trash-can-outline" size={17} color={Colors.textTertiary} />
                      </Pressable>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={filterSheetVisible} onClose={() => setFilterSheetVisible(false)} title="Filtriraj po kategoriji">
        <View style={{ gap: Spacing.sm, paddingBottom: Spacing.lg }}>
          <Pressable
            onPress={() => {
              setCategoryFilter(null);
              setFilterSheetVisible(false);
            }}
            style={styles.filterRow}
          >
            <Text style={styles.filterRowText}>Sve kategorije</Text>
            {!categoryFilter && <Icon name="check" size={18} color={Colors.accent} />}
          </Pressable>
          {DOCUMENT_CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => {
                setCategoryFilter(c.key);
                setFilterSheetVisible(false);
              }}
              style={styles.filterRow}
            >
              <Icon name={c.icon} size={18} color={c.color} />
              <Text style={styles.filterRowText}>{c.label}</Text>
              {categoryFilter === c.key && <Icon name="check" size={18} color={Colors.accent} />}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h1, color: Colors.textPrimary },
  headerActions: { flexDirection: "row", gap: Spacing.sm },
  filterButton: {
    width: 40,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    height: 40,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  addButtonText: { ...Typography.button, color: Colors.background },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  noResults: { ...Typography.body, color: Colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md, borderRadius: Radius.sm },
  fileTypeIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  rowDelete: { marginLeft: Spacing.sm, padding: 4 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.md },
  filterRowText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
});
