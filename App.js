// App.js — MixMaster v5 (split sections)
// Tabs: Home / Search / Library / Create
// Features: Welcome screen, bright gradients, single-letter search, chip filters,
// Spotlight & Favorites, comments with light profanity filter, big built-in library.

import React, { useMemo, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
// Fallback if expo-linear-gradient is unavailable (Snack-friendly)
const LinearGradient = ({ colors = ["#334155"], style, children }) => (
  <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>
);

/* ------------------- design knobs ------------------- */
const { width: W } = Dimensions.get("window");
const PAD = 18, GAP = 12, RADIUS = 16;
const TILE_W = Math.round(W * 0.54);
const TILE_H = Math.round(TILE_W * 1.05);

const colors = {
  bg: "#070b11",
  card: "#0f151c",
  line: "#1b2a36",
  text: "#eef6ff",
  sub: "#9fb4c9",
  accent: "#1ed760",
};

/* ------------------- helpers ------------------- */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const liquorGradient = (kind = "") => {
  const k = (kind || "").toLowerCase();
  if (k.includes("vodka")) return ["#7c3aed", "#db2777"];
  if (k.includes("gin")) return ["#3b82f6", "#10b981"];
  if (k.includes("rum")) return ["#8b5cf6", "#f59e0b"];
  if (k.includes("tequila")) return ["#06b6d4", "#ef4444"];
  if (k.includes("whiskey") || k.includes("bourbon") || k.includes("rye")) return ["#f97316", "#eab308"];
  if (k.includes("scotch") || k.includes("cognac")) return ["#c084fc", "#fb923c"];
  if (k.includes("coffee") || k.includes("espresso")) return ["#9a6c3a", "#3f2f25"];
  if (k.includes("smoothie")) return ["#22c55e", "#06b6d4"];
  if (k.includes("slush")) return ["#0ea5e9", "#9333ea"];
  return ["#475569", "#334155"];
};

const IMG = {
  vodka: "https://images.unsplash.com/photo-1582106245688-9d3b7bd8768e?auto=format&fit=crop&w=1200&q=60",
  gin: "https://images.unsplash.com/photo-1604908177223-e4f2eb4515b4?auto=format&fit=crop&w=1200&q=60",
  rum: "https://images.unsplash.com/photo-1598679253544-3328b93e22ed?auto=format&fit=crop&w=1200&q=60",
  tequila: "https://images.unsplash.com/photo-1582105933379-38b5fb6c3d3f?auto=format&fit=crop&w=1200&q=60",
  whiskey: "https://images.unsplash.com/photo-1541976076758-347942db1970?auto=format&fit=crop&w=1200&q=60",
  coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=60",
  smoothie: "https://images.unsplash.com/photo-1576402187878-974f70ff98e1?auto=format&fit=crop&w=1200&q=60",
  slush: "https://images.unsplash.com/photo-1556679343-c7306c2e9f50?auto=format&fit=crop&w=1200&q=60",
  default: "https://images.unsplash.com/photo-1551024709-8f23befc6cf7?auto=format&fit=crop&w=1200&q=60",
};
const getImg = (d) => {
  const k = (d.alcoholType || d.category || "").toLowerCase();
  if (k.includes("vodka")) return d.image || IMG.vodka;
  if (k.includes("gin")) return d.image || IMG.gin;
  if (k.includes("rum")) return d.image || IMG.rum;
  if (k.includes("tequila")) return d.image || IMG.tequila;
  if (k.includes("whiskey") || k.includes("bourbon") || k.includes("rye")) return d.image || IMG.whiskey;
  if (k.includes("coffee") || k.includes("espresso")) return d.image || IMG.coffee;
  if (k.includes("smoothie")) return d.image || IMG.smoothie;
  if (k.includes("slush")) return d.image || IMG.slush;
  return d.image || IMG.default;
};

/* ------------------- tiny UI ------------------- */
const Stars = ({ value = 0, onChange, size = 18 }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => onChange?.(n)}>
        <Text style={{ color: n <= Math.round(value) ? "#ffd479" : "#3a485a", fontSize: size }}>
          {n <= value ? "★" : "☆"}
        </Text>
      </TouchableOpacity>
    ))}
    <Text style={{ color: colors.sub, marginLeft: 4, fontSize: size - 4 }}>
      {value ? value.toFixed(1) : "0.0"}
    </Text>
  </View>
);

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[S.chip, active && S.chipOn]}>
    <Text style={[S.chipText, active && { color: colors.text }]}>{label}</Text>
  </TouchableOpacity>
);

/* ------------------- tiles & rows ------------------- */
const RectTile = ({ item, onOpen }) => {
  const [c1, c2] = liquorGradient(item.alcoholType || item.category);
  return (
    <TouchableOpacity
      onPress={() => onOpen?.(item)}
      activeOpacity={0.9}
      style={{
        width: TILE_W, height: TILE_H, marginRight: GAP, borderRadius: RADIUS, overflow: "hidden",
        ...Platform.select({
          ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
          android: { elevation: 6 },
        }),
      }}
    >
      <LinearGradient colors={[c1, c2]} style={{ flex: 1, padding: 14, justifyContent: "flex-end" }}>
        <View style={S.badge}><Text style={S.badgeText}>{item.alcoholType || item.category}</Text></View>
        <Text numberOfLines={2} style={S.tileTitle}>{item.name}</Text>
        {!!item.tags?.length && (
          <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.95)", marginTop: 4 }}>
            {item.tags.slice(0, 3).join(" • ")}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const RoundTile = ({ item, onOpen }) => {
  const [c1, c2] = liquorGradient(item.alcoholType || item.category);
  const SIZE = 110;
  return (
    <View style={{ width: SIZE + 10, alignItems: "center", marginRight: 12 }}>
      <TouchableOpacity
        onPress={() => onOpen?.(item)} activeOpacity={0.9}
        style={{
          width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: "hidden",
          ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 5 },
          }),
        }}
      >
        <LinearGradient colors={[c1, c2]} style={{ flex: 1 }} />
      </TouchableOpacity>
      <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "800", marginTop: 8, maxWidth: SIZE }}>
        {item.name}
      </Text>
      <Text style={{ color: colors.sub, fontSize: 12 }}>{item.alcoholType || item.category}</Text>
    </View>
  );
};

const Carousel = ({ title, data, onOpen }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={S.sectionTitle}>{title}</Text>
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ paddingHorizontal: PAD }}
      snapToInterval={TILE_W + GAP}
      decelerationRate="fast"
      renderItem={({ item }) => <RectTile item={item} onOpen={onOpen} />}
    />
  </View>
);

const RoundRow = ({ title, data, onOpen }) => (
  <View style={{ marginTop: 18 }}>
    <Text style={S.sectionTitle}>{title}</Text>
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ paddingHorizontal: PAD }}
      renderItem={({ item }) => <RoundTile item={item} onOpen={onOpen} />}
    />
  </View>
);
/* ------------------- detail (servings + comments) ------------------- */
const BAD_WORDS = ["shit","fuck","bitch","asshole","bastard","cunt"]; // demo list
const clean = (t="") => t.replace(/\b(shit|fuck|bitch|asshole|bastard|cunt)\b/gi, "****");

const Detail = ({ drink, rating = 0, onRate, fav, onToggleFav, onBack, onShare, comments, onAddComment }) => {
  const [servings, setServings] = useState(1);
  const [text, setText] = useState("");
  const [postErr, setPostErr] = useState("");

  const [c1, c2] = liquorGradient(drink.alcoholType || drink.category);
  const mult = (amt) => (typeof amt === "number" ? +(amt * servings).toFixed(2) : amt);

  const tryPost = () => {
    const raw = text.trim();
    if (!raw) return;
    if (BAD_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(raw))) {
      setPostErr("Keep it respectful — your comment contains blocked words.");
      return;
    }
    onAddComment(clean(raw));
    setText(""); setPostErr("");
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <TouchableOpacity onPress={onBack} style={{ padding: 16 }}>
        <Text style={{ color: colors.accent, fontWeight: "900" }}>← Back</Text>
      </TouchableOpacity>

      <LinearGradient colors={[c1, c2]} style={{ marginHorizontal: PAD, borderRadius: RADIUS, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="ios-wine" size={26} color="#fff" />
          <View>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>{drink.name}</Text>
            <Text style={{ color: "#fff", opacity: 0.9 }}>{drink.alcoholType || drink.category}</Text>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Stars value={rating} onChange={onRate} />
        </View>

        <View style={{ flexDirection: "row", gap: 14, marginTop: 12, alignItems: "center" }}>
          <TouchableOpacity onPress={onToggleFav}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>{fav ? "♥ In Favorites" : "♡ Favorite"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Share</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={S.servingPills}>
            <TouchableOpacity onPress={() => setServings((s) => Math.max(1, s - 1))} style={S.pill}><Text style={S.pillText}>−</Text></TouchableOpacity>
            <Text style={S.servCount}>{servings}x</Text>
            <TouchableOpacity onPress={() => setServings((s) => s + 1)} style={S.pill}><Text style={S.pillText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={S.panel}>
        <Text style={S.panelTitle}>Ingredients</Text>
        {drink.ingredients.map((i, idx) => (
          <Text key={idx} style={S.li}>
            • {i.amount ? `${mult(i.amount)} ${i.unit || ""} ` : ""}{i.name}
          </Text>
        ))}
      </View>

      <View style={S.panel}>
        <Text style={S.panelTitle}>Instructions</Text>
        <Text style={[S.li, { marginTop: 6 }]}>{drink.instructions}</Text>
      </View>

      <View style={S.panel}>
        <Text style={S.panelTitle}>Comments</Text>
        {comments.length === 0 ? (
          <Text style={[S.li, { opacity: 0.8 }]}>Be the first to comment.</Text>
        ) : (
          comments.map((c, i) => <Text key={i} style={S.li}>• {c}</Text>)
        )}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Say something nice…"
            placeholderTextColor={colors.sub}
            style={[S.input, { flex: 1, marginTop: 0 }]}
          />
          <TouchableOpacity onPress={tryPost} style={[S.primary, { paddingHorizontal: 16 }]}>
            <Text style={S.primaryText}>Post</Text>
          </TouchableOpacity>
        </View>
        {!!postErr && <Text style={{ color: "#fca5a5", marginTop: 6 }}>{postErr}</Text>}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
};

/* ------------------- storage hook ------------------- */
const useJsonStore = (key, initial) => {
  const [val, setVal] = useState(initial);
  useEffect(() => { (async () => {
    try { const raw = await AsyncStorage.getItem(key); if (raw) setVal(JSON.parse(raw)); } catch {}
  })(); }, [key]);
  const save = async (next) => { setVal(next); try { await AsyncStorage.setItem(key, JSON.stringify(next)); } catch {} };
  return [val, save];
};

/* ------------------- Welcome / Auth-lite (local only) ------------------- */
function Welcome({ onDone }) {
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");

  const pick = async () => {
    await AsyncStorage.setItem("@mm_onboarded", "1");
    await AsyncStorage.setItem("@mm_profile_name", name.trim());
    await AsyncStorage.setItem("@mm_profile_dob", JSON.stringify({ month, day, year }));
    onDone();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: PAD, paddingTop: 60 }}>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 84, height: 84, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <LinearGradient colors={["#5eead4", "#34d399"]} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="ios-wine" size={36} color="#053427" />
          </LinearGradient>
        </View>
        <Text style={{ color: colors.text, fontSize: 36, fontWeight: "900", letterSpacing: 1, marginTop: 10 }}>MixMaster</Text>
        <Text style={{ color: colors.sub, textAlign: "center", marginTop: 6 }}>
          Discover, create, and share drinks — crafted just for you.
        </Text>
      </View>

      <View style={{ marginTop: 20, gap: 12 }}>
        {[
          ["Rate & Review", "star"],
          ["Save Favorites", "heart"],
          ["Create Recipes", "plus-circle"],
          ["Birthday Specials", "gift"],
        ].map(([label, icon]) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line }}>
            <Feather name={icon} size={18} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: "800" }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 8 }}>Your name (optional)</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Mix Master" placeholderTextColor={colors.sub} style={S.input} />
        <Text style={{ color: colors.text, fontWeight: "800", marginTop: 12 }}>Birthday (optional)</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={month} onChangeText={setMonth} placeholder="MM" keyboardType="number-pad" style={[S.input, { flex: 1 }]} placeholderTextColor={colors.sub} />
          <TextInput value={day} onChangeText={setDay} placeholder="DD" keyboardType="number-pad" style={[S.input, { flex: 1 }]} placeholderTextColor={colors.sub} />
          <TextInput value={year} onChangeText={setYear} placeholder="YYYY" keyboardType="number-pad" style={[S.input, { flex: 1 }]} placeholderTextColor={colors.sub} />
        </View>
      </View>

      <View style={{ marginTop: 18, gap: 12 }}>
        <TouchableOpacity style={S.primary} onPress={pick}><Text style={S.primaryText}>Continue</Text></TouchableOpacity>
      </View>

      <Text style={{ color: colors.sub, textAlign: "center", marginTop: 18 }}>By continuing you agree to our Terms & Privacy.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
/* ------------------- LIBRARY: Featured + Coffee + Gin + Rum ------------------- */
const FEATURED = [
  {
    id: "feat-mojo-vegas",
    name: "Mojo’s Vegas Blend",
    category: "Alcohol",
    alcoholType: "Whiskey",
    ingredients: [
      { name: "Gentleman Jack Whiskey", amount: 3, unit: "oz" },
      { name: "Sugar Cube", amount: 1, unit: "cube" },
      { name: "Angostura Bitters", amount: 3, unit: "dashes" },
    ],
    instructions: "Muddle sugar with bitters. Add whiskey and ice; stir. Express orange peel and garnish with cherry.",
    calories: 230,
    tags: ["featured", "classic", "old-fashioned"],
  },
  {
    id: "feat-lashell-mojo",
    name: "Lashell’s Mojo",
    category: "Alcohol",
    alcoholType: "Tequila",
    ingredients: [
      { name: "Blanco Tequila", amount: 2, unit: "oz" },
      { name: "Fresh Lemon Juice", amount: 1, unit: "oz" },
      { name: "Simple Syrup", amount: 0.5, unit: "oz" },
      { name: "Strawberry Purée", amount: 1, unit: "oz" },
    ],
    instructions: "Shake hard with ice. Strain over fresh ice in a Tajín-rimmed glass.",
    calories: 210,
    tags: ["featured", "sour", "fruity"],
  },
  {
    id: "feat-wannies-blast",
    name: "Wannie’s Blast (Daiquiri)",
    category: "Alcohol",
    alcoholType: "Rum",
    ingredients: [
      { name: "Piña Colada Mix", amount: 3, unit: "oz" },
      { name: "Strawberry Purée", amount: 1, unit: "oz" },
      { name: "Tequila", amount: 2, unit: "oz" },
      { name: "Ice", amount: 1.5, unit: "cups" },
    ],
    instructions: "Blend until smooth. Hurricane glass; garnish with pineapple & strawberry.",
    calories: 260,
    tags: ["featured", "daiquiri", "tropical"],
  },
  {
    id: "feat-dawandia-dream",
    name: "Dawandia’s Dream",
    category: "Alcohol",
    alcoholType: "Cognac",
    ingredients: [
      { name: "VS Cognac", amount: 2, unit: "oz" },
      { name: "Honey Syrup", amount: 0.5, unit: "oz" },
      { name: "Fresh Lemon Juice", amount: 0.75, unit: "oz" },
      { name: "Orange Bitters", amount: 2, unit: "dashes" },
    ],
    instructions: "Shake with ice and strain into a coupe. Express orange peel.",
    calories: 210,
    tags: ["featured", "elegant", "citrus"],
  },
];

const COFFEE_10 = [
  { id:"cof-001", name:"Iced Latte", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:2,unit:"shots"},{name:"Milk",amount:6,unit:"oz"},{name:"Ice",amount:1,unit:"cup"}],
    instructions:"Pour espresso over ice, add milk, stir.", calories:120, tags:["coffee","cold"] },
  { id:"cof-002", name:"Cappuccino", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:1,unit:"shot"},{name:"Steamed Milk",amount:3,unit:"oz"},{name:"Foamed Milk",amount:1,unit:"oz"}],
    instructions:"Pull espresso, add steamed milk, top with foam.", calories:80, tags:["coffee","hot"] },
  { id:"cof-003", name:"Cafe Latte", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:1,unit:"shot"},{name:"Steamed Milk",amount:8,unit:"oz"}],
    instructions:"Combine espresso and steamed milk.", calories:140, tags:["coffee","hot"] },
  { id:"cof-004", name:"Flat White", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:2,unit:"shots"},{name:"Steamed Milk (microfoam)",amount:5,unit:"oz"}],
    instructions:"Velvety microfoam over double espresso.", calories:120, tags:["coffee","hot"] },
  { id:"cof-005", name:"Iced Mocha", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:2,unit:"shots"},{name:"Chocolate Syrup",amount:1,unit:"oz"},{name:"Milk",amount:6,unit:"oz"},{name:"Ice",amount:1,unit:"cup"}],
    instructions:"Stir chocolate with espresso, add ice and milk.", calories:220, tags:["coffee","cold","sweet"] },
  { id:"cof-006", name:"Affogato", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Vanilla Ice Cream",amount:2,unit:"scoops"},{name:"Hot Espresso",amount:1,unit:"shot"}],
    instructions:"Pour hot espresso over ice cream.", calories:230, tags:["coffee","dessert"] },
  { id:"cof-007", name:"Cold Brew", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Cold Brew Concentrate",amount:4,unit:"oz"},{name:"Water",amount:4,unit:"oz"},{name:"Ice",amount:1,unit:"cup"}],
    instructions:"Dilute concentrate over ice.", calories:10, tags:["coffee","cold"] },
  { id:"cof-008", name:"Nitro Cold Brew", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Nitro Cold Brew",amount:12,unit:"oz"}],
    instructions:"Pour nitro cold brew into chilled glass.", calories:5, tags:["coffee","cold","nitro"] },
  { id:"cof-009", name:"Caramel Macchiato", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Vanilla Syrup",amount:1,unit:"oz"},{name:"Milk",amount:6,unit:"oz"},{name:"Espresso",amount:2,unit:"shots"},{name:"Caramel Sauce",amount:1,unit:"tbsp"}],
    instructions:"Layer syrup and milk, add espresso, finish with caramel.", calories:210, tags:["coffee","sweet"] },
  { id:"cof-010", name:"Americano", alcoholType:"Coffee", category:"Coffee",
    ingredients:[{name:"Espresso",amount:2,unit:"shots"},{name:"Hot Water",amount:6,unit:"oz"}],
    instructions:"Add hot water to espresso.", calories:5, tags:["coffee","hot"] },
];

const GIN_5 = [
  { id:"gin-001", name:"Gin & Tonic", category:"Alcohol", alcoholType:"Gin",
    ingredients:[{name:"Gin",amount:2,unit:"oz"},{name:"Tonic",amount:4,unit:"oz"},{name:"Lime",amount:1,unit:"wedge"}],
    instructions:"Build over ice, lime wedge.", calories:160, tags:["tall","bubbly"] },
  { id:"gin-002", name:"Tom Collins", category:"Alcohol", alcoholType:"Gin",
    ingredients:[{name:"Gin",amount:2,unit:"oz"},{name:"Lemon Juice",amount:1,unit:"oz"},{name:"Simple Syrup",amount:0.5,unit:"oz"},{name:"Soda Water",amount:3,unit:"oz"}],
    instructions:"Shake first three, top with soda.", calories:180, tags:["citrus","bubbly"] },
  { id:"gin-003", name:"Negroni (Lite)", category:"Alcohol", alcoholType:"Gin",
    ingredients:[{name:"Gin",amount:1.25,unit:"oz"},{name:"Sweet Vermouth",amount:1,unit:"oz"},{name:"Bitter Aperitivo",amount:0.75,unit:"oz"}],
    instructions:"Stir with ice, strain over rock, orange peel.", calories:190, tags:["bitter","classic"] },
  { id:"gin-004", name:"Bee’s Knees", category:"Alcohol", alcoholType:"Gin",
    ingredients:[{name:"Gin",amount:2,unit:"oz"},{name:"Honey Syrup",amount:0.75,unit:"oz"},{name:"Lemon Juice",amount:0.75,unit:"oz"}],
    instructions:"Shake hard, coupe.", calories:200, tags:["sour","honey"] },
  { id:"gin-005", name:"French 75 (Lite)", category:"Alcohol", alcoholType:"Gin",
    ingredients:[{name:"Gin",amount:1,unit:"oz"},{name:"Lemon",amount:0.5,unit:"oz"},{name:"Simple Syrup",amount:0.25,unit:"oz"},{name:"Sparkling Wine",amount:3,unit:"oz"}],
    instructions:"Shake first three, top with bubbles.", calories:170, tags:["sparkling","brunch"] },
];

const RUM_5 = [
  { id:"rum-001", name:"Classic Daiquiri", category:"Alcohol", alcoholType:"Rum",
    ingredients:[{name:"White Rum",amount:2,unit:"oz"},{name:"Lime",amount:1,unit:"oz"},{name:"Simple Syrup",amount:0.75,unit:"oz"}],
    instructions:"Shake, coupe.", calories:190, tags:["sour","classic"] },
  { id:"rum-002", name:"Mojito (Lite)", category:"Alcohol", alcoholType:"Rum",
    ingredients:[{name:"White Rum",amount:1.5,unit:"oz"},{name:"Lime",amount:0.75,unit:"oz"},{name:"Mint",amount:8,unit:"leaves"},{name:"Simple Syrup",amount:0.5,unit:"oz"},{name:"Soda",amount:3,unit:"oz"}],
    instructions:"Muddle mint/light, build and top with soda.", calories:170, tags:["mint","tall"] },
  { id:"rum-003", name:"Piña Colada (Lite)", category:"Alcohol", alcoholType:"Rum",
    ingredients:[{name:"White Rum",amount:1.5,unit:"oz"},{name:"Pineapple Juice",amount:3,unit:"oz"},{name:"Coconut Milk (light)",amount:1,unit:"oz"}],
    instructions:"Blend or shake, hurricane.", calories:220, tags:["tropical","blended"] },
  { id:"rum-004", name:"Dark ’n’ Stormy", category:"Alcohol", alcoholType:"Rum",
    ingredients:[{name:"Dark Rum",amount:2,unit:"oz"},{name:"Ginger Beer",amount:4,unit:"oz"},{name:"Lime",amount:0.5,unit:"oz"}],
    instructions:"Build over ice, lime squeeze.", calories:190, tags:["spicy","tall"] },
  { id:"rum-005", name:"Jungle Bird (Lite)", category:"Alcohol", alcoholType:"Rum",
    ingredients:[{name:"Dark Rum",amount:1.5,unit:"oz"},{name:"Pineapple",amount:2,unit:"oz"},{name:"Lime",amount:0.5,unit:"oz"},{name:"Bitter Aperitivo",amount:0.75,unit:"oz"}],
    instructions:"Shake, rocks glass.", calories:200, tags:["tropical","bitter"] },
];
/* ------------------- LIBRARY: Tequila + Whiskey ------------------- */
const TEQUILA_5 = [
  { id:"teq-001", name:"Classic Margarita", category:"Alcohol", alcoholType:"Tequila",
    ingredients:[{name:"Tequila",amount:2,unit:"oz"},{name:"Lime",amount:1,unit:"oz"},{name:"Orange Liqueur",amount:0.5,unit:"oz"}],
    instructions:"Shake, salt rim optional, rocks.", calories:210, tags:["sour","citrus"] },
  { id:"teq-002", name:"Tommy’s Margarita", category:"Alcohol", alcoholType:"Tequila",
    ingredients:[{name:"Tequila",amount:2,unit:"oz"},{name:"Lime",amount:1,unit:"oz"},{name:"Agave Syrup",amount:0.5,unit:"oz"}],
    instructions:"Shake, rocks.", calories:200, tags:["agave","sour"] },
  { id:"teq-003", name:"Paloma (Lite)", category:"Alcohol", alcoholType:"Tequila",
    ingredients:[{name:"Tequila",amount:1.5,unit:"oz"},{name:"Grapefruit Soda",amount:4,unit:"oz"},{name:"Lime",amount:0.25,unit:"oz"}],
    instructions:"Build over ice, pinch of salt.", calories:170, tags:["grapefruit","tall","bubbly"] },
  { id:"teq-004", name:"Spicy Margarita", category:"Alcohol", alcoholType:"Tequila",
    ingredients:[{name:"Tequila",amount:2,unit:"oz"},{name:"Lime",amount:1,unit:"oz"},{name:"Jalapeño Syrup",amount:0.5,unit:"oz"}],
    instructions:"Shake with jalapeño, strain.", calories:210, tags:["spicy","sour"] },
  { id:"teq-005", name:"Blue Dream (Lite)", category:"Alcohol", alcoholType:"Tequila",
    ingredients:[{name:"Tequila",amount:2,unit:"oz"},{name:"Blue Curaçao",amount:0.75,unit:"oz"},{name:"Lemonade",amount:3,unit:"oz"},{name:"Soda Water",amount:2,unit:"oz"}],
    instructions:"Build in highball, gentle stir.", calories:220, tags:["sparkling","fruity"] },
];

const WHISKEY_10 = [
  { id:"wh-001", name:"Old Fashioned (Bourbon)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Bourbon",amount:2,unit:"oz"},{name:"Simple Syrup",amount:0.25,unit:"oz"},{name:"Angostura Bitters",amount:2,unit:"dashes"}],
    instructions:"Stir and strain over rock, orange peel.", calories:180, tags:["classic","stirred"] },
  { id:"wh-002", name:"Old Fashioned (Rye)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Rye Whiskey",amount:2,unit:"oz"},{name:"Simple Syrup",amount:0.25,unit:"oz"},{name:"Bitters",amount:2,unit:"dashes"}],
    instructions:"Stir, big ice, orange peel.", calories:180, tags:["classic","spicy"] },
  { id:"wh-003", name:"Whiskey Sour", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Whiskey",amount:2,unit:"oz"},{name:"Lemon",amount:1,unit:"oz"},{name:"Simple Syrup",amount:0.75,unit:"oz"}],
    instructions:"Shake hard, rocks, cherry optional.", calories:190, tags:["sour","classic"] },
  { id:"wh-004", name:"Manhattan (Lite)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Rye Whiskey",amount:1.75,unit:"oz"},{name:"Sweet Vermouth",amount:0.75,unit:"oz"},{name:"Bitters",amount:2,unit:"dashes"}],
    instructions:"Stir, coupe, cherry.", calories:200, tags:["stirred","classic"] },
  { id:"wh-005", name:"Boulevardier (Lite)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Bourbon",amount:1.25,unit:"oz"},{name:"Sweet Vermouth",amount:1,unit:"oz"},{name:"Bitter Aperitivo",amount:0.75,unit:"oz"}],
    instructions:"Stir, rocks, orange peel.", calories:200, tags:["bitter","classic"] },
  { id:"wh-006", name:"Irish Coffee (Lite)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Irish Whiskey",amount:1.5,unit:"oz"},{name:"Hot Coffee",amount:6,unit:"oz"},{name:"Brown Sugar",amount:1,unit:"tsp"}],
    instructions:"Dissolve sugar, float cream.", calories:190, tags:["warm","coffee"] },
  { id:"wh-007", name:"Mint Julep (Lite)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Bourbon",amount:2,unit:"oz"},{name:"Mint",amount:8,unit:"leaves"},{name:"Simple Syrup",amount:0.5,unit:"oz"}],
    instructions:"Muddle mint gently, crushed ice.", calories:180, tags:["mint","classic"] },
  { id:"wh-008", name:"Penicillin (Lite)", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Blended Scotch",amount:1.5,unit:"oz"},{name:"Islay Scotch (float)",amount:0.25,unit:"oz"},{name:"Honey-Ginger Syrup",amount:0.75,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"}],
    instructions:"Shake, rocks, float Islay.", calories:210, tags:["smoky","ginger"] },
  { id:"wh-009", name:"Highball", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Whiskey",amount:1.5,unit:"oz"},{name:"Soda Water",amount:5,unit:"oz"}],
    instructions:"Build gently over ice.", calories:120, tags:["tall","bubbly"] },
  { id:"wh-010", name:"Gold Rush", category:"Alcohol", alcoholType:"Whiskey",
    ingredients:[{name:"Bourbon",amount:2,unit:"oz"},{name:"Honey Syrup",amount:0.75,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"}],
    instructions:"Shake, rocks.", calories:200, tags:["sour","honey"] },
];
/* ------------------- LIBRARY: Bourbon + Rye + Scotch + Cognac + Smoothie + Vodka ------------------- */
const BOURBON_5 = [
  { id:"bour-001", name:"Bourbon Smash", category:"Alcohol", alcoholType:"Bourbon",
    ingredients:[{name:"Bourbon",amount:2,unit:"oz"},{name:"Lemon Wedges",amount:2,unit:"pieces"},{name:"Mint",amount:6,unit:"leaves"},{name:"Simple Syrup",amount:0.5,unit:"oz"}],
    instructions:"Muddle lemon & mint, shake, rocks.", calories:200, tags:["citrus","mint"] },
  { id:"bour-002", name:"Paper Plane (Lite)", category:"Alcohol", alcoholType:"Bourbon",
    ingredients:[{name:"Bourbon",amount:1,unit:"oz"},{name:"Bitter Aperitivo",amount:1,unit:"oz"},{name:"Amaro",amount:1,unit:"oz"},{name:"Lemon",amount:1,unit:"oz"}],
    instructions:"Shake, coupe.", calories:210, tags:["bitter","citrus"] },
  { id:"bour-003", name:"Kentucky Mule", category:"Alcohol", alcoholType:"Bourbon",
    ingredients:[{name:"Bourbon",amount:2,unit:"oz"},{name:"Lime",amount:0.5,unit:"oz"},{name:"Ginger Beer",amount:4,unit:"oz"}],
    instructions:"Build in copper mug.", calories:190, tags:["spicy","tall"] },
  { id:"bour-004", name:"Brown Derby", category:"Alcohol", alcoholType:"Bourbon",
    ingredients:[{name:"Bourbon",amount:1.5,unit:"oz"},{name:"Grapefruit",amount:1,unit:"oz"},{name:"Honey Syrup",amount:0.5,unit:"oz"}],
    instructions:"Shake, coupe.", calories:180, tags:["grapefruit","classic"] },
  { id:"bour-005", name:"Boulevardier (Bourbon)", category:"Alcohol", alcoholType:"Bourbon",
    ingredients:[{name:"Bourbon",amount:1.25,unit:"oz"},{name:"Sweet Vermouth",amount:1,unit:"oz"},{name:"Bitter Aperitivo",amount:0.75,unit:"oz"}],
    instructions:"Stir, rocks.", calories:205, tags:["bitter","stirred"] },
];

const RYE_5 = [
  { id:"rye-001", name:"Sazerac (Lite)", category:"Alcohol", alcoholType:"Rye",
    ingredients:[{name:"Rye Whiskey",amount:2,unit:"oz"},{name:"Simple Syrup",amount:0.25,unit:"oz"},{name:"Peychaud’s Bitters",amount:3,unit:"dashes"}],
    instructions:"Rinse glass absinthe optional, stir, neat.", calories:180, tags:["classic","neworleans"] },
  { id:"rye-002", name:"Vieux Carré (Lite)", category:"Alcohol", alcoholType:"Rye",
    ingredients:[{name:"Rye",amount:0.75,unit:"oz"},{name:"Cognac",amount:0.75,unit:"oz"},{name:"Sweet Vermouth",amount:0.75,unit:"oz"},{name:"Benedictine",amount:0.25,unit:"oz"}],
    instructions:"Stir, rocks.", calories:220, tags:["stirred","rich"] },
  { id:"rye-003", name:"Ward Eight", category:"Alcohol", alcoholType:"Rye",
    ingredients:[{name:"Rye",amount:2,unit:"oz"},{name:"Lemon",amount:0.5,unit:"oz"},{name:"Orange",amount:0.5,unit:"oz"},{name:"Grenadine",amount:0.25,unit:"oz"}],
    instructions:"Shake, coupe.", calories:200, tags:["citrus","classic"] },
  { id:"rye-004", name:"Rye Highball", category:"Alcohol", alcoholType:"Rye",
    ingredients:[{name:"Rye Whiskey",amount:1.5,unit:"oz"},{name:"Soda Water",amount:5,unit:"oz"}],
    instructions:"Build gently over ice.", calories:120, tags:["tall","bubbly"] },
  { id:"rye-005", name:"Maple Rye Sour", category:"Alcohol", alcoholType:"Rye",
    ingredients:[{name:"Rye",amount:2,unit:"oz"},{name:"Lemon",amount:1,unit:"oz"},{name:"Maple Syrup",amount:0.5,unit:"oz"}],
    instructions:"Shake, rocks.", calories:200, tags:["sour","maple"] },
];

const SCOTCH_5 = [
  { id:"sco-001", name:"Rob Roy (Lite)", category:"Alcohol", alcoholType:"Scotch",
    ingredients:[{name:"Scotch",amount:1.75,unit:"oz"},{name:"Sweet Vermouth",amount:0.75,unit:"oz"},{name:"Bitters",amount:2,unit:"dashes"}],
    instructions:"Stir, coupe.", calories:200, tags:["stirred","classic"] },
  { id:"sco-002", name:"Rusty Nail (Lite)", category:"Alcohol", alcoholType:"Scotch",
    ingredients:[{name:"Blended Scotch",amount:1.5,unit:"oz"},{name:"Drambuie",amount:0.5,unit:"oz"}],
    instructions:"Stir, rocks.", calories:190, tags:["honey","classic"] },
  { id:"sco-003", name:"Penicillin (Scotch)", category:"Alcohol", alcoholType:"Scotch",
    ingredients:[{name:"Blended Scotch",amount:1.5,unit:"oz"},{name:"Islay Scotch",amount:0.25,unit:"oz"},{name:"Honey-Ginger",amount:0.75,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"}],
    instructions:"Shake, rocks, smoky float.", calories:210, tags:["ginger","smoky"] },
  { id:"sco-004", name:"Blood & Sand (Lite)", category:"Alcohol", alcoholType:"Scotch",
    ingredients:[{name:"Scotch",amount:1,unit:"oz"},{name:"Sweet Vermouth",amount:0.75,unit:"oz"},{name:"Cherry Liqueur",amount:0.5,unit:"oz"},{name:"Orange Juice",amount:0.75,unit:"oz"}],
    instructions:"Shake, coupe.", calories:200, tags:["fruit","classic"] },
  { id:"sco-005", name:"Whisky Sour (Scotch)", category:"Alcohol", alcoholType:"Scotch",
    ingredients:[{name:"Scotch",amount:2,unit:"oz"},{name:"Lemon",amount:1,unit:"oz"},{name:"Simple Syrup",amount:0.75,unit:"oz"}],
    instructions:"Shake, rocks.", calories:190, tags:["sour"] },
];

const COGNAC_5 = [
  { id:"cog-001", name:"Sidecar (Lite)", category:"Alcohol", alcoholType:"Cognac",
    ingredients:[{name:"Cognac",amount:1.5,unit:"oz"},{name:"Orange Liqueur",amount:0.75,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"}],
    instructions:"Shake, coupe, sugar rim optional.", calories:200, tags:["classic","citrus"] },
  { id:"cog-002", name:"French Connection (Lite)", category:"Alcohol", alcoholType:"Cognac",
    ingredients:[{name:"Cognac",amount:1.5,unit:"oz"},{name:"Amaretto",amount:0.75,unit:"oz"}],
    instructions:"Stir, rocks.", calories:190, tags:["rich","nutty"] },
  { id:"cog-003", name:"Champagne Cocktail (Cognac)", category:"Alcohol", alcoholType:"Cognac",
    ingredients:[{name:"Sugar Cube",amount:1,unit:"cube"},{name:"Bitters",amount:2,unit:"dashes"},{name:"Cognac",amount:0.5,unit:"oz"},{name:"Sparkling Wine",amount:3,unit:"oz"}],
    instructions:"Soak cube, top with bubbles and cognac float.", calories:170, tags:["sparkling","brunch"] },
  { id:"cog-004", name:"Between the Sheets (Lite)", category:"Alcohol", alcoholType:"Cognac",
    ingredients:[{name:"Cognac",amount:1,unit:"oz"},{name:"Light Rum",amount:1,unit:"oz"},{name:"Orange Liqueur",amount:0.5,unit:"oz"},{name:"Lemon",amount:0.5,unit:"oz"}],
    instructions:"Shake, coupe.", calories:200, tags:["classic"] },
  { id:"cog-005", name:"Dawandia’s Dream (Encore)", category:"Alcohol", alcoholType:"Cognac",
    ingredients:[{name:"VS Cognac",amount:2,unit:"oz"},{name:"Honey Syrup",amount:0.5,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"}],
    instructions:"Shake, coupe, orange oils.", calories:205, tags:["featured","elegant"] },
];

const SMOOTHIE_5 = [
  { id:"sm-001", name:"Berry Smooth", category:"Smoothie", alcoholType:"Smoothie",
    ingredients:[{name:"Mixed Berries",amount:1,unit:"cup"},{name:"Yogurt",amount:4,unit:"oz"},{name:"Ice",amount:1,unit:"cup"}],
    instructions:"Blend until smooth.", calories:210, tags:["smoothie","fruity"] },
  { id:"sm-002", name:"Mango Tango", category:"Smoothie", alcoholType:"Smoothie",
    ingredients:[{name:"Mango",amount:1,unit:"cup"},{name:"Orange Juice",amount:4,unit:"oz"},{name:"Ice",amount:1,unit:"cup"}],
    instructions:"Blend smooth.", calories:220, tags:["tropical"] },
  { id:"sm-003", name:"Green Glow", category:"Smoothie", alcoholType:"Smoothie",
    ingredients:[{name:"Spinach",amount:1,unit:"cup"},{name:"Pineapple",amount:0.5,unit:"cup"},{name:"Coconut Water",amount:6,unit:"oz"}],
    instructions:"Blend.", calories:180, tags:["fresh","light"] },
  { id:"sm-004", name:"PB Banana", category:"Smoothie", alcoholType:"Smoothie",
    ingredients:[{name:"Banana",amount:1,unit:"unit"},{name:"Peanut Butter",amount:1,unit:"tbsp"},{name:"Milk",amount:6,unit:"oz"}],
    instructions:"Blend.", calories:260, tags:["protein","creamy"] },
  { id:"sm-005", name:"Strawberry Sunrise", category:"Smoothie", alcoholType:"Smoothie",
    ingredients:[{name:"Strawberries",amount:1,unit:"cup"},{name:"Yogurt",amount:4,unit:"oz"},{name:"Honey",amount:0.5,unit:"oz"}],
    instructions:"Blend.", calories:230, tags:["fruity","sweet"] },
];

const VODKA_5 = [
  { id:"vod-001", name:"Vodka Mule", category:"Alcohol", alcoholType:"Vodka",
    ingredients:[{name:"Vodka",amount:2,unit:"oz"},{name:"Lime",amount:0.5,unit:"oz"},{name:"Ginger Beer",amount:4,unit:"oz"}],
    instructions:"Build in copper mug.", calories:180, tags:["tall"] },
  { id:"vod-002", name:"Cosmopolitan (Lite)", category:"Alcohol", alcoholType:"Vodka",
    ingredients:[{name:"Vodka",amount:1.5,unit:"oz"},{name:"Orange Liqueur",amount:0.5,unit:"oz"},{name:"Cranberry",amount:1,unit:"oz"},{name:"Lime",amount:0.25,unit:"oz"}],
    instructions:"Shake, coupe.", calories:190, tags:["fruity","classic"] },
  { id:"vod-003", name:"Sea Breeze", category:"Alcohol", alcoholType:"Vodka",
    ingredients:[{name:"Vodka",amount:1.5,unit:"oz"},{name:"Cranberry",amount:3,unit:"oz"},{name:"Grapefruit",amount:1,unit:"oz"}],
    instructions:"Build over ice.", calories:170, tags:["tall","citrus"] },
  { id:"vod-004", name:"Vodka Soda", category:"Alcohol", alcoholType:"Vodka",
    ingredients:[{name:"Vodka",amount:1.5,unit:"oz"},{name:"Soda Water",amount:5,unit:"oz"}],
    instructions:"Build gently.", calories:100, tags:["light","bubbly"] },
  { id:"vod-005", name:"Lemon Drop (Lite)", category:"Alcohol", alcoholType:"Vodka",
    ingredients:[{name:"Vodka",amount:1.75,unit:"oz"},{name:"Lemon",amount:0.75,unit:"oz"},{name:"Simple Syrup",amount:0.5,unit:"oz"}],
    instructions:"Shake, sugar rim optional.", calories:190, tags:["sour","zesty"] },
];

/* ------------------- BUILD DATABASE ------------------- */
const RECIPE_DB_SEED = [
  ...FEATURED,
  ...COFFEE_10,
  ...GIN_5,
  ...RUM_5,
  ...TEQUILA_5,
  ...WHISKEY_10,
  ...BOURBON_5,
  ...RYE_5,
  ...SCOTCH_5,
  ...COGNAC_5,
  ...SMOOTHIE_5,
  ...VODKA_5,
];

// makes it easy if you later paste more — just ensure RECIPE_DB_SEED exists
const ALL_LIBRARY = RECIPE_DB_SEED;
/* ------------------- Home screen ------------------- */
function Home({ data, ratings, favorites, onOpen, onRandom }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const categories = ["All","Vodka","Gin","Rum","Tequila","Whiskey","Bourbon","Rye","Scotch","Cognac","Coffee","Smoothie","Slush"];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((d) => {
      const hay = `${d.name} ${d.alcoholType} ${(d.tags || []).join(" ")}`.toLowerCase();
      const byCat = cat === "All" ? true : (d.alcoholType || d.category || "").toLowerCase().includes(cat.toLowerCase());
      const byTerm = !term || hay.includes(term) || d.name.toLowerCase().startsWith(term[0] || "");
      return byCat && byTerm;
    });
  }, [q, cat, data]);

  const favCount = (id) => (favorites[id] ? 1 : 0);
  const spotlight = useMemo(() => {
    const scored = data
      .map((d) => ({ d, score: favCount(d.id) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.d);
    return scored.length ? scored : data.slice(0, 8);
  }, [data, favorites]);

  const featured = useMemo(() => FEATURED.slice(0, 8), []);
  const favList = useMemo(() => data.filter((d) => favorites[d.id]), [data, favorites]);

  return (
    <FlatList
      data={[{ k: "head" }, { k: "feat" }, { k: "spot" }, { k: "fav" }, { k: "all" }]}
      keyExtractor={(i) => i.k}
      renderItem={({ item }) => {
        if (item.k === "head") {
          return (
            <View style={{ paddingHorizontal: PAD, paddingTop: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search drinks, bases, tags…"
                  placeholderTextColor={colors.sub}
                  style={S.search}
                />
                <TouchableOpacity onPress={onRandom} style={S.randBtn}>
                  <Feather name="shuffle" size={18} color="#04211a" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                {categories.map((name) => (
                  <Chip key={name} label={name} active={cat === name} onPress={() => setCat(name)} />
                ))}
              </ScrollView>
            </View>
          );
        }
        if (item.k === "feat") return <Carousel title="Featured" data={featured} onOpen={onOpen} />;
        if (item.k === "spot") return <RoundRow title="Spotlight (most favorited)" data={spotlight} onOpen={onOpen} />;
        if (item.k === "fav")
          return favList.length ? <Carousel title="Your Favorites" data={favList} onOpen={onOpen} /> : null;
        return <Carousel title="All mixes" data={filtered.slice(0, 40)} onOpen={onOpen} />;
      }}
      contentContainerStyle={{ paddingBottom: 110 }}
    />
  );
}

/* ------------------- Search ------------------- */
function SearchPage({ data, onOpen }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useJsonStore("@mm_recent_searches", []);
  const submit = (text) => {
    setQ(text);
    const next = [text, ...recent.filter((r) => r !== text)].slice(0, 8);
    setRecent(next);
  };
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.slice(0, 24);
    return data.filter((d) => {
      const hay = `${d.name} ${d.alcoholType} ${(d.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(term) || d.name.toLowerCase().startsWith(term[0] || "");
    });
  }, [q, data]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={{ padding: PAD }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={(e) => submit(e.nativeEvent.text)}
          placeholder="Search by name, base, tag…"
          placeholderTextColor={colors.sub}
          style={S.search}
        />
        {!!recent.length && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.sub, marginBottom: 6 }}>Recent searches</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {recent.map((r) => (
                <Chip key={r} label={r} onPress={() => setQ(r)} />
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: PAD }}
        renderItem={({ item }) => <RectTile item={item} onOpen={onOpen} />}
      />
    </ScrollView>
  );
}

/* ------------------- Create ------------------- */
function Create({ onAdd }) {
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [ing, setIng] = useState("");
  const [instr, setInstr] = useState("");

  const submit = () => {
    if (!name.trim()) return Alert.alert("Name required");
    const rows = ing.split(/\n|;/).map((x) => x.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^([\d.]+)\s*(oz|tsp|tbsp|cup|cups|dash|dashes|ml)?\s*(.+)$/i);
      return m ? { amount: Number(m[1]), unit: (m[2] || "").toLowerCase(), name: m[3] } : { name: s };
    });
    const d = {
      id: `mine-${Date.now()}`,
      name: name.trim(),
      category: base.toLowerCase().includes("coffee") ? "Coffee" : "Alcohol",
      alcoholType: base || "Drink",
      image: getImg({ alcoholType: base || "Drink" }),
      ingredients: rows.length ? rows : [{ name: base || "Spirit", amount: 2, unit: "oz" }],
      instructions: instr || "Build over ice and serve.",
      calories: null,
      tags: ["created"],
    };
    onAdd(d);
    setName(""); setBase(""); setIng(""); setInstr("");
    Alert.alert("Saved", "Your drink was added.");
  };

  return (
    <ScrollView style={{ padding: PAD }}>
      <Text style={S.h1}>Create a Drink</Text>
      <TextInput style={S.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.sub} />
      <TextInput style={S.input} value={base} onChangeText={setBase} placeholder="Base (Vodka / Gin / Coffee…)" placeholderTextColor={colors.sub} />
      <TextInput style={[S.input, { minHeight: 100 }]} value={ing} onChangeText={setIng}
        placeholder={"Ingredients (one per line)\nEx: 2 oz Vodka\n1 oz Lemon\n0.5 oz Simple Syrup"} placeholderTextColor={colors.sub} multiline />
      <TextInput style={[S.input, { minHeight: 100 }]} value={instr} onChangeText={setInstr}
        placeholder="Instructions" placeholderTextColor={colors.sub} multiline />
      <TouchableOpacity style={S.primary} onPress={submit}><Text style={S.primaryText}>Add Drink</Text></TouchableOpacity>
      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

/* ------------------- App Root ------------------- */
export default function App() {
  const [tab, setTab] = useState("Home");
  const [open, setOpen] = useState(null);
  const [onboarded, setOnboarded] = useState(false);

  const [favorites, setFavorites] = useJsonStore("@mm_favs", {});
  const [ratings, setRatings] = useJsonStore("@mm_ratings", {});
  const [profile, setProfile] = useJsonStore("@mm_profile", { name: "", dob: null });
  const [mine, setMine] = useJsonStore("@mm_mine", []);
  const [recentViews, setRecentViews] = useJsonStore("@mm_recent_views", []);
  const [comments, setComments] = useJsonStore("@mm_comments", {}); // { [drinkId]: ["text", ...] }

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem("@mm_onboarded");
      setOnboarded(!!v);
      const pname = await AsyncStorage.getItem("@mm_profile_name");
      const dobRaw = await AsyncStorage.getItem("@mm_profile_dob");
      if (pname && !profile.name) setProfile({ ...profile, name: pname, dob: dobRaw ? JSON.parse(dobRaw) : null });
    })();
  }, []);

  const data = useMemo(() => [...ALL_LIBRARY, ...mine], [mine]);

  const toggleFav = (id) => setFavorites({ ...favorites, [id]: !favorites[id] });
  const addRating = (id, n) => {
    const v = clamp(Number(n) || 0, 1, 5);
    setRatings({ ...ratings, [id]: [...(ratings[id] || []), v].slice(-30) });
  };
  const avgFor = (id) => {
    const arr = ratings[id] || [];
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  };

  const onRandom = () => setOpen(data[Math.floor(Math.random() * data.length)]);

  const shareDrink = async (d) => {
    const msg = `🍸 ${d.name}\n${d.alcoholType || d.category}\n\nIngredients:\n${d.ingredients
      .map((i) => `• ${i.amount || ""} ${i.unit || ""} ${i.name}`.trim())
      .join("\n")}\n\nInstructions:\n${d.instructions}`;
    try { await Share.share({ message: msg }); } catch {}
  };

  useEffect(() => {
    if (!open) return;
    setRecentViews(([open, ...new Set(recentViews.filter((x) => x?.id !== open.id))].slice(0, 10)));
  }, [open]);

  let body = null;
  if (!onboarded) {
    body = <Welcome onDone={() => setOnboarded(true)} />;
  } else if (open) {
    body = (
      <Detail
        drink={open}
        rating={avgFor(open.id)}
        onRate={(n) => addRating(open.id, n)}
        fav={!!favorites[open.id]}
        onToggleFav={() => toggleFav(open.id)}
        onBack={() => setOpen(null)}
        onShare={() => shareDrink(open)}
        comments={comments[open.id] || []}
        onAddComment={(txt) => setComments({ ...comments, [open.id]: [...(comments[open.id] || []), txt].slice(-40) })}
      />
    );
  } else if (tab === "Home") {
    body = (<Home data={data} ratings={ratings} favorites={favorites} onOpen={setOpen} onRandom={onRandom} />);
  } else if (tab === "Search") {
    body = <SearchPage data={data} onOpen={setOpen} />;
  } else if (tab === "Library") {
    const favList = data.filter((d) => favorites[d.id]);
    body = (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ padding: PAD, paddingBottom: 6 }}>
          <Text style={S.h1}>Your Library</Text>
          {!!recentViews.length && (
            <>
              <Text style={{ color: colors.sub, marginTop: 4, marginBottom: 8 }}>Recently viewed</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={recentViews}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingRight: PAD }}
                renderItem={({ item }) => <RectTile item={item} onOpen={setOpen} />}
              />
            </>
          )}
          <Text style={{ color: colors.sub, marginTop: 16, marginBottom: 8 }}>Favorites</Text>
        </View>
        <FlatList
          data={favList}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: PAD }}
          renderItem={({ item }) => <RectTile item={item} onOpen={setOpen} />}
          ListEmptyComponent={<Text style={{ color: colors.sub, paddingHorizontal: PAD }}>No favorites yet.</Text>}
        />
      </ScrollView>
    );
  } else if (tab === "Create") {
    body = <Create onAdd={(d) => setMine([d, ...mine])} />;
  } else {
    body = <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.text }}>Coming soon</Text></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      {!open && onboarded && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: PAD, paddingBottom: 0 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#0e151b", borderWidth: 1, borderColor: "#1e2b36", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="ios-wine" size={20} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontWeight: "900", letterSpacing: 0.5 }}>MixMaster</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setTab("Search")}><Feather name="search" size={20} color={colors.sub} /></TouchableOpacity>
        </View>
      )}

      {body}

      {!open && onboarded && (
        <View style={S.bottomWrap}>
          <View style={S.bottomBlur}>
            {[
              ["Home", "home"],
              ["Search", "search"],
              ["Library", "book"],
              ["Create", "plus-circle"],
            ].map(([name, icon]) => (
              <TouchableOpacity key={name} onPress={() => setTab(name)} style={S.navItem}>
                <Feather name={icon} size={24} color={tab === name ? colors.accent : colors.sub} />
                <Text style={[S.navText, tab === name && { color: colors.text, fontWeight: "800" }]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ------------------- styles ------------------- */
const S = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: "900", marginBottom: 12 },
  search: {
    flex: 1, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: colors.text,
  },
  randBtn: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8,
    borderWidth: 1, borderColor: colors.line, backgroundColor: "#0f141a",
  },
  chipOn: { backgroundColor: "#18212a", borderColor: "#2a3b4a" },
  chipText: { color: colors.sub, fontWeight: "700" },
  badge: {
    alignSelf: "flex-start", backgroundColor: "#00000040", borderColor: "#ffffff25", borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, marginBottom: 8,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  tileTitle: {
    color: "#fff", fontWeight: "900", fontSize: 18,
    textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  panel: {
    marginHorizontal: PAD, marginTop: 14, backgroundColor: colors.card, borderRadius: RADIUS,
    borderWidth: 1, borderColor: colors.line, padding: 14,
  },
  panelTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  li: { color: colors.sub, marginTop: 6 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900", paddingHorizontal: PAD, marginBottom: 10 },
  servingPills: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.line,
  },
  pillText: { color: colors.text, fontSize: 18, fontWeight: "800" },
  servCount: { color: colors.text, fontSize: 16, fontWeight: "800", width: 34, textAlign: "center" },
  bottomWrap: {
    position: "absolute", left: 14, right: 14, bottom: 16, borderRadius: 18, overflow: "hidden",
    ...Platform.select({ ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 8 } }),
  },
  bottomBlur: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    paddingVertical: 12, paddingHorizontal: 10, backgroundColor: "rgba(9,13,18,0.92)", borderColor: "#1b2a36", borderWidth: 1,
  },
  navItem: { alignItems: "center" },
  navText: { color: colors.sub, fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginTop: 10,
  },
  primary: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", marginTop: 14 },
  primaryText: { color: "#04211a", fontWeight: "900" },
});
