# MojAuto

Mobilna aplikacija za praćenje automobila — troškovi, servisi, dokumenti, parking, GPS putovanja i AI dijagnostika, sve na jednom mestu. Napravljena u React Native / Expo, sa Supabase backend-om.

## Tehnologije

- **Expo SDK 54** (React Native 0.81, React 19) + **Expo Router** (file-based rutiranje, typed routes)
- **Supabase** — Postgres baza (Row Level Security po korisniku), Auth, Storage (dokumenti/fotografije), Edge Function (AI dijagnostika)
- **Google Gemini API** (besplatan tier) — pogon AI dijagnostike, poziva se iz Supabase Edge Function-a
- **react-native-maps** + **expo-location** + **expo-task-manager** — GPS praćenje putovanja u pozadini
- **expo-notifications**, **expo-calendar**, **expo-sms** — lokalna obaveštenja, kalendar, SMS plaćanje parkinga
- Custom **EAS dev-client** build (aplikacija ne radi u Expo Go-u zbog pozadinske lokacije i mapa)

## Funkcionalnosti

### Vozila
- Dodavanje više vozila, arhiviranje/vraćanje iz arhive, brisanje (briše i sve povezane troškove, podsetnike, dokumente)
- Detaljne specifikacije po vozilu: motor (zapremina, cilindri, ventili, turbo), menjač, pogon, gume i felne, VIN, kupovna cena, fotografija vozila
- Kilometraža sa brzom izmenom sa početnog ekrana

### Početna strana
- Prikaz trenutno izabranog vozila (kilometraža, tablica, prosečna potrošnja)
- Pregled troškova za tekući mesec (ukupno, gorivo, servis, ostalo)
- Lista predstojećih obaveza
- Prečice ka cenama goriva, parkingu, dokumentima i putovanjima

### Troškovi
- Kategorije: Gorivo, Servis, Registracija, Osiguranje, Gume, Delovi, Pranje, Parking, Ostalo
- Pretraga i filtriranje po kategoriji, izmena i brisanje
- Mesečni/godišnji pregled sa donut grafikonom po kategoriji i bar grafikonom troškova po mesecima
- Kod goriva: litri, cena po litru, kilometraža pri sipanju, oznaka "pun rezervoar" — koristi se za tačan obračun potrošnje

### Potrošnja goriva
- Obračun metodom "od punog do punog rezervoara" — tačna vrednost, ne procena
- Prosečna potrošnja (L/100km), prosečna cena po km, prosečna cena litra, procenjeni domet na pun rezervoar
- Grafikon potrošnje po mesecima

### Obaveze
- Podsetnici (servis, registracija, osiguranje...) sa datumom dospeća, po vozilu
- Tabovi: aktivni / istekli / beleške
- Dodavanje u kalendar telefona, istorija završenih podsetnika i servisnih troškova na jednom mestu
- Slobodne beleške (naslov + sadržaj) nevezane za vozilo — npr. šifra alarma, kontakt mehaničara
- **Automatska obaveštenja**: mali servis (svakih 10.000 km), veliki servis (svakih 60.000 km), zamena guma (1. novembar / 1. april), registracija i osiguranje (X dana pre isteka) — sve podešeno po vozilu u "Podešavanje obaveštenja"

### Dokumenti
- Čuvanje fotografija/PDF-ova: saobraćajna, polisa osiguranja, servisne fakture, ugovori, ostalo
- Filtriranje po kategoriji, otvaranje, brisanje

### Parking
- Prečice po vozilu i zoni (broj telefona, limit sati, cena po satu)
- Plaćanje jednim dodirom — otvara SMS sa popunjenim brojem i tablicom
- Praćenje aktivne sesije (vreme isteka), automatsko produženje, upozorenje 10 min pre isteka, upis troška

### Cene goriva u Srbiji
- Uživo cene benzina, dizela, TNG-a i CNG-a (eksterni izvor), keširano lokalno

### AI Dijagnostika
- Chat sa AI asistentom (Google Gemini) za dijagnostiku problema sa vozilom
- Agent sam poziva alate da pročita stvarne podatke o vozilu, istoriju servisa i troškove — odgovori su utemeljeni u stvarnim podacima, ne izmišljeni
- Prepoznaje hitne bezbednosne simptome (kočnice, dim, pregrevanje...) i upozorava jasnim banerom
- Istorija razgovora po vozilu, mogućnost novog razgovora i brisanja starih
- Dnevni limit poruka (zaštita od zloupotrebe); disclamer da ne zamenjuje mehaničara

### Putovanja
- GPS praćenje putovanja u pozadini — radi i kad je ekran zaključan
- Uživo prikaz rute na mapi, tajmer trajanja, pređena kilometraža tokom vožnje
- Istorija putovanja po vozilu sa detaljnim pregledom (ruta na mapi, trajanje, distanca, prosečna brzina), brisanje
- Ako se aplikacija zatvori usred putovanja, praćenje se nastavlja i prepoznaje pri ponovnom otvaranju

### Profil
- Podaci o nalogu, lista svih vozila sa ukupnim troškom i brojem troškova po vozilu
- Arhiviranje/brisanje vozila, odjava

## Pokretanje projekta

```bash
npm install
npx expo start --dev-client
```

Potrebne env promenljive (`.env`, lokalno):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**Napomena:** aplikacija koristi pozadinsku lokaciju (`expo-location` + `expo-task-manager`) i native mape (`react-native-maps`), koji ne rade u Expo Go-u — potreban je sopstveni dev-client build (EAS Build). Za cloud build (preview/production), iste env promenljive moraju biti podešene i na EAS-u (`eas env:set`), pošto lokalni `.env` fajl nije dostupan cloud build-u.

## Struktura projekta

- `app/` — ekrani (Expo Router, file-based); `app/(tabs)/` su ekrani sa donjom navigacijom, ostalo su "push"/modal ekrani
- `lib/` — domenska logika po feature-u (troškovi, gorivo, putovanja, parking, AI...), odvojena od UI-a
- `components/ui/` — deljene UI komponente (dizajn sistem: Card, Button, BottomSheet, grafikoni...)
- `notifications/` — lokalna obaveštenja
- `supabase/functions/` — Edge Function za AI dijagnostiku
- `constants/theme.ts` — boje, razmaci, tipografija ("instrument cluster" dizajn)
