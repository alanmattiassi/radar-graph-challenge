# Radar Graph Challenge 🎯📊

Un'applicazione web interattiva e multiplayer per il gioco basato sul **riempimento dei grafi ad area (radar graph poligonali)**.

**100% Zero Database**: Nessun account né configurazione esterna richiesta (niente Supabase, niente SQL). Funziona direttamente online con deploy su **Vercel** e sincronizzazione in tempo reale **WebRTC Peer-to-Peer** (con fallback HTTP) tra computer dell'Host e smartphone dei partecipanti su reti 4G/WiFi differenti.

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
   - A ogni partecipante viene attribuito un **codice alfanumerico univoco** (es. `P-8A2F`).

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

8. **Deployment Immediato su Vercel (Zero Database)**:
   - Deploy immediato su **Vercel** senza configurare alcuna variabile d'ambiente o database.
   - Connessione WebRTC P2P diretta tra smartphone e Host, con fallback su API in memoria.

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

## ☁️ Deploy su Vercel (In 1 Minuto)

1. Collega il repository GitHub a **[Vercel](https://vercel.com)**.
2. Clicca su **Deploy**.
3. **Fatto!** Nessuna chiave segreta, nessun database SQL e nessun costo: l'applicazione gira online e permette ai partecipanti di collegarsi da qualsiasi rete 4G o WiFi scansionando il QR Code sullo schermo dell'Host.

---

## 📐 Conformità Terminologica di Game Studies (Bernard Suits)
Nelle dinamiche di gioco e nella progettazione dei quesiti, in conformità con la teoria dei giochi di Bernard Suits (*The Grasshopper*), non si parla di "obiettivi illusori", ma rigorosamente di:
- **Obiettivo lusorio** (*lusory goal*)
- **Mezzi lusori** (*lusory means*)
- **Atteggiamento lusorio** (*lusory attitude*)
