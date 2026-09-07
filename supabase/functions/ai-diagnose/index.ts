import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.112.4";

// Free-tier Gemini model. gemini-2.5-flash-lite was retired for new API keys
// (confirmed via a live 404 from the API itself on 2026-09-07, which pointed
// at this replacement) - check ai.google.dev/gemini-api/docs/models before
// changing this again, Google rotates which model is free/cheapest.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_TOOL_ROUNDS = 4;
const DAILY_MESSAGE_LIMIT = 40;
const SERVICE_EXPENSE_CATEGORIES = ["Servis", "Delovi"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_INSTRUCTION = `Ti si iskusan automehaničar-asistent u aplikaciji MojAuto. Razgovaraj na srpskom jeziku, jasno i konkretno.

Pravila:
- Ako je opis problema nejasan, prvo postavi 1-2 pitanja za razjašnjenje pre nego što predložiš dijagnozu.
- Nikad ne tvrdi definitivnu dijagnozu - uvek je uokviri kao "najverovatniji uzroci" i preporuči proveru kod ovlašćenog mehaničara za sve što je iznad trivijalnog.
- Koristi alate (get_vehicle_profile, get_maintenance_history, get_recent_expenses) da bi odgovor utemeljio u stvarnim podacima o ovom vozilu, umesto da nagađaš kilometražu ili istoriju servisa.
- Ako simptom ukazuje na kočnice, upravljač, airbag, curenje goriva, dim, pregrevanje ili gubitak snage u vožnji, MORAŠ pozvati flag_urgency sa vrednošću "stop_driving" i jasno poručiti korisniku da bezbedno zaustavi vozilo i pozove pomoć/mehaničara odmah.
- Za simptome koje treba pratiti ali nisu hitni, pozovi flag_urgency sa "monitor". Za običan razgovor ili pitanja bez bezbednosnog rizika, pozovi flag_urgency sa "normal" pre finalnog odgovora.
- Budi koncizan - ovo je chat u mobilnoj aplikaciji, ne dugačak esej.
- Ne koristi markdown formatiranje (zvezdice za bold/italic, #, liste sa crticama) - odgovor se prikazuje kao običan tekst bez renderovanja markdown-a.`;

/** Strips stray markdown the model sometimes adds despite the system instruction - the chat bubble renders plain text, not markdown. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

const TOOL_DECLARATIONS = [
  {
    name: "get_vehicle_profile",
    description: "Vraća osnovne podatke o trenutnom vozilu (marka, model, godina, kilometraža, gorivo, motor, gume).",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "get_maintenance_history",
    description: "Vraća istoriju servisa za trenutno vozilo (završeni podsetnici i troškovi kategorije servis/delovi).",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "get_recent_expenses",
    description: "Vraća poslednje troškove za trenutno vozilo, opciono filtrirane po kategoriji.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: { type: "STRING", description: "Opciona kategorija za filtriranje (Gorivo, Servis, Registracija, Osiguranje, Gume, Delovi, Pranje, Parking, Ostalo)." },
        limit: { type: "INTEGER", description: "Broj poslednjih troškova, default 10." },
      },
    },
  },
  {
    name: "flag_urgency",
    description: "Postavlja nivo hitnosti trenutne dijagnoze. Pozovi ga tačno jednom pre finalnog odgovora.",
    parameters: {
      type: "OBJECT",
      properties: { level: { type: "STRING", enum: ["normal", "monitor", "stop_driving"] } },
      required: ["level"],
    },
  },
];

type ToolContext = { supabase: SupabaseClient; vehicleId: number };
type GeminiPart = { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: unknown };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const { supabase, vehicleId } = ctx;
  switch (name) {
    case "get_vehicle_profile": {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          "make, model, year, mileage, fuel_type, power_kw, transmission, drivetrain, engine_displacement_cc, cylinder_count, has_turbo, tire_size, tank_capacity_l, avg_consumption_l100km",
        )
        .eq("id", vehicleId)
        .single();
      return error ? { error: error.message } : data;
    }
    case "get_maintenance_history": {
      const [remindersRes, expensesRes] = await Promise.all([
        supabase
          .from("reminders")
          .select("title, due_date")
          .eq("vehicle_id", vehicleId)
          .eq("is_done", true)
          .order("due_date", { ascending: false })
          .limit(15),
        supabase
          .from("expenses")
          .select("category, amount, date, note")
          .eq("vehicle_id", vehicleId)
          .in("category", SERVICE_EXPENSE_CATEGORIES)
          .order("date", { ascending: false })
          .limit(15),
      ]);
      return {
        completed_reminders: remindersRes.data ?? [],
        service_expenses: expensesRes.data ?? [],
      };
    }
    case "get_recent_expenses": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      let query = supabase
        .from("expenses")
        .select("category, amount, date, note, liters, price_per_liter")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false })
        .limit(limit);
      if (typeof args.category === "string" && args.category.length > 0) {
        query = query.eq("category", args.category);
      }
      const { data, error } = await query;
      return error ? { error: error.message } : data;
    }
    case "flag_urgency":
      return { acknowledged: true, level: args.level };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    if (!GEMINI_API_KEY) {
      console.error("[ai-diagnose] stage=missing_gemini_key");
      return jsonResponse({ error: "GEMINI_API_KEY nije podešen na serveru." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[ai-diagnose] stage=missing_auth_header");
      return jsonResponse({ error: "Neautorizovano." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    console.error(`[ai-diagnose] stage=env_check hasUrl=${!!supabaseUrl} hasAnonKey=${!!supabaseAnonKey}`);
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error(`[ai-diagnose] stage=get_user_failed error=${userError?.message}`);
      return jsonResponse({ error: "Neautorizovano." }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const vehicleId = Number(body.vehicleId);
    const message = String(body.message ?? "").trim();
    let conversationId: number | null = body.conversationId ? Number(body.conversationId) : null;

    if (!vehicleId || !message) return jsonResponse({ error: "vehicleId i message su obavezni." }, 400);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_MESSAGE_LIMIT) {
      return jsonResponse({ error: "Dostignut je dnevni limit poruka za AI dijagnostiku. Pokušaj ponovo sutra." }, 429);
    }

    if (conversationId === null) {
      const { data: conv, error: convError } = await supabase
        .from("ai_conversations")
        .insert({ vehicle_id: vehicleId, title: message.slice(0, 60) })
        .select("id")
        .single();
      if (convError || !conv) return jsonResponse({ error: convError?.message ?? "Greška pri kreiranju razgovora." }, 500);
      conversationId = conv.id;
    }

    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    const contents: GeminiContent[] = (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const ctx: ToolContext = { supabase, vehicleId };
    let urgency: string | null = null;
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error(`[ai-diagnose] stage=gemini_error status=${geminiRes.status} body=${errText}`);
        return jsonResponse({ error: `Gemini API greška: ${errText}` }, 502);
      }

      const geminiJson = await geminiRes.json();
      const candidate = geminiJson.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) {
        finalText = parts.map((p) => p.text ?? "").join("").trim();
        break;
      }

      contents.push({ role: "model", parts });

      const responseParts: GeminiPart[] = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall!;
        if (name === "flag_urgency") urgency = String(args?.level ?? urgency);
        const result = await runTool(name, args ?? {}, ctx);
        responseParts.push({ functionResponse: { name, response: { result } } });
      }
      contents.push({ role: "user", parts: responseParts });

      if (round === MAX_TOOL_ROUNDS - 1) {
        finalText = "Nisam mogao da završim analizu - probaj da preformulišeš pitanje.";
      }
    }

    if (!finalText) finalText = "Nisam siguran kako da odgovorim na to - probaj da preformulišeš pitanje.";
    finalText = stripMarkdown(finalText);

    await supabase.from("ai_messages").insert([
      { conversation_id: conversationId, role: "user", content: message },
      { conversation_id: conversationId, role: "assistant", content: finalText, urgency: urgency ?? "normal" },
    ]);
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    return jsonResponse({ conversationId, reply: finalText, urgency: urgency ?? "normal" }, 200);
  } catch (err) {
    console.error(`[ai-diagnose] stage=uncaught error=${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    return jsonResponse({ error: err instanceof Error ? err.message : "Nepoznata greška." }, 500);
  }
});
