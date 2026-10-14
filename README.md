# Radar Graph Challenge 🎯📊

Un'applicazione web interattiva e multiplayer per il gioco basato sul **riempimento dei grafi ad area (radar graph poligonali)**.

Progettata per essere proiettata dall'Host su grande schermo o proiettore, mentre i partecipanti partecipano e votano in tempo reale dai loro **smartphone** scansionando un **QR Code**.

---

## 🌟 Funzionalità Principali

1. **Grafico Radar Poligonale Adattivo ($N$ Dimensioni)**:
   - Configurazione flessibile del numero di dimensioni ($3 \le N \le 12$).
   - La geometria del grafico ad area adotta la forma del poligono regolare corrispondente:
     - **3 Dimensioni** = Triangolo
     - **4 Dimensioni** = Quadrato / Rombo
     - **5 Dimensioni** = Pentagono
     - **6 Dimensioni** = Esagono
     - **$N$ Dimensioni** = Poligono a $N$ vertici
   - Griglie concentriche proporzionali (20%, 40%, 60%, 80%, 100%) e assi radiali dal centro ai vertici con il nome di ogni dimensione agli estremi.

2. **Onboarding Istantaneo con QR Code e Codice Alfanumerico**:
   - L'Host mostra a schermo un QR Code ad alto contrasto.
   - I giocatori scansionano il codice dal proprio smartphone ed entrano subito nella stanza.
   - A ogni partecipante viene assegnato un **codice alfanumerico univoco** (es. `P-8A2F`).

3. **Votazione Dinamica & Riempimento Votazioni**:
   - L'Host presenta la prima domanda e apre le votazioni.
   - I giocatori vedono la domanda e votano una delle dimensioni con un tocco sul proprio telefono.
   - L'Host può mostrare a schermo il **Riempimento delle Votazioni** (area indaco/viola con percentuali e numero di voti).

4. **Attribuzione Correttezza Flessibile & Riempimento Risposta Corretta**:
   - L'Host seleziona la dimensione corretta:
     - **1.0 pt** per la dimensione esatta
     - **0.5 pt** per dimensioni con metà correttezza / parzialmente corrette
     - **0 pt** per dimensioni errate
   - Il grafico a radar disegna anche il **Riempimento delle Risposte Corrette** (area smeraldo/verde), consentendo di sovrapporre e confrontare immediatamente i voti del pubblico con il bersaglio corretto!

5. **Classifica dei Punti in Tempo Reale**:
   - A lato dello schermo viene generata e aggiornata la classifica dei partecipanti con punteggio totale e incremento del round (+1 pt, +0.5 pt).

6. **Round Multipli & Domande Successive**:
   - L'Host presenta la seconda domanda, apre un nuovo round di votazione mantenendo i punteggi cumulativi dei giocatori.

7. **Resilienza alle Cadute di Connessione (Local Storage)**:
   - Tutti i dati di sessione (ID giocatore, codice alfanumerico, stanza, voti espressi, punteggio) sono salvati in `localStorage` sul singolo dispositivo.
   - Se la connessione cade, lo smartphone va in standby o la pagina viene ricaricata, il giocatore si ricollega all'istante senza perdere la propria identità o il proprio punteggio.

8. **Deployment Online su Vercel & Supabase**:
   - Pronto per il deploy immediato su **Vercel**.
   - Integrazione nativa con **Supabase Realtime** per la sincronizzazione istantanea tra reti 4G/WiFi differenti.
   - Include anche un motore di polling e API fallback che funziona anche in assenza di credenziali cloud configurate.

---

## 🚀 Avvio Rapido in Locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev

# 3. Apri nel browser
# Host: http://localhost:3000/host
# Giocatore: http://localhost:3000/join
```

---

## ☁️ Configurazione con Supabase & Vercel

### 1. Database Supabase
1. Crea un progetto gratuito su [Supabase](https://supabase.com).
2. Vai su **SQL Editor** nel tuo pannello Supabase.
3. Copia e incolla l'intero contenuto del file [`supabase_schema.sql`](./supabase_schema.sql) ed eseguilo.
4. Recupera da *Project Settings -> API* l'**URL del Progetto** e la **chiave Anon/Public**.

### 2. Variabili d'Ambiente (.env.local o Vercel)
Crea un file `.env.local` oppure inserisci le variabili nelle impostazioni di Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-anon-key
```

> **Nota:** Puoi anche inserire le credenziali Supabase direttamente dall'interfaccia Host cliccando sul pulsante **"Configura Cloud / Supabase"** in alto a destra!

---

## 📐 Conformità Terminologica di Game Studies (Bernard Suits)
Nelle dinamiche di gioco e nella progettazione dei quesiti, in conformità con la teoria dei giochi di Bernard Suits (*The Grasshopper*), non si parla di "obiettivi illusori", ma rigorosamente di:
- **Obiettivo lusorio** (*lusory goal*)
- **Mezzi lusori** (*lusory means*)
- **Atteggiamento lusorio** (*lusory attitude*)
