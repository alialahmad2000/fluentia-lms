# Manual Spot-Check — Reading Text/Audio Sync

Date: 2026-05-19

After the fix lands in production, please open the test unit in a real browser session and confirm the three behaviors below. The script verifier passes 10/10 articles, but only the browser confirms karaoke, audio, and switching live together.

## Test unit

- **Unit ID:** `00ca3625-46ee-4e38-95da-2255f522aff8`
- **Theme:** Swarm Intelligence (ذكاء الأسراب) — Level 5, Unit 8
- **URL pattern:** `https://fluentia-lms.vercel.app/student/curriculum/unit/00ca3625-46ee-4e38-95da-2255f522aff8` (then click the **القراءة** activity card)

## Step-by-step

### 1) Article A — initial load
Expected to be selected first.

- [ ] Title shows **"Nature's Hidden Networks"** (English) / "How collective intelligence shapes the natural world around us" (Arabic subtitle)
- [ ] Press play
- [ ] Audio starts reading **"In the vast expanses of the Arabian Peninsula…"**
- [ ] Karaoke word-highlight lands on **"In"** first, then sweeps "the vast expanses of the…"

### 2) Click "القراءة B"
Switch to Article B.

- [ ] Title now shows **"Nature's Architects of Innovation"** / "How swarm intelligence is revolutionizing technology and urban planning"
- [ ] Press play
- [ ] Audio NOW reads **"In the bustling laboratories of MIT and the research centers of Riyadh's King Abdulaziz City…"** — NOT Article A's content
- [ ] Karaoke lands on Article B's first words ("In the bustling laboratories of MIT…")

### 3) Click back to "القراءة A"
Return to Article A.

- [ ] Title returns to **"Nature's Hidden Networks"**
- [ ] Press play — audio reads Article A's opening again ("In the vast expanses of the Arabian Peninsula…")
- [ ] Karaoke matches Article A's first words

### 4) Rapid switch stress
Click A → B → A → B in quick succession (within 1–2 seconds each).

- [ ] No audio bleeds from the previous article
- [ ] Whichever article ends up selected, its play button produces the correct audio
- [ ] Karaoke aligns with the visible passage

If any step fails, report back with the specific step number + what you saw / heard — the fix is incomplete.

## Other multi-article units worth spot-checking

The verifier passed all 5 of these; same pattern applies:
- `00ca3625-46ee-4e38-95da-2255f522aff8` (Swarm Intelligence — L5 U8)
- `0afc0986-f79d-426c-bb15-ee66dd77e5d9`
- `170ce97d-b211-4b25-b19e-fe9fc22fb71b`
- `1de8e161-81eb-416e-af87-c136d93f3930`
- `2105dec8-575b-4a6a-8456-261b98a9d6c2`
