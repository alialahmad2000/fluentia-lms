# Listening QA v2 — Control-Group Spot Listen (5 CLEAN multi-speaker rows)

Purpose: confirm acoustically that no spoken speaker labels exist in CLEAN-flagged audio.
These are NOT suspect rows — text-level scan found 0 suspect. This is control verification.

Listen to the first 5 seconds of each file. Expected: voice 1 starts directly with the segment's line. NO spoken "Dr. Ali", "Mohammed", "Speaker A" etc.

| audio_type | title (ar) | first speaker | first line preview | sample file |
|---|---|---|---|---|
| interview | مقابلة مع باحثة عن ذكاء الأسراب في الطبيعة | Host | Welcome back to Science Today. I'm here with Dr. Sarah Chen, a leading researcher in swarm intelligence at MIT. Dr. Chen | `/tmp/listening-qa-v2-spot-listen/0767ef9b-5f6a-48e0-9f47-94bd590ac608.mp3` |
| interview | مقابلة عن الأمن الغذائي والأزمات العالمية | Interviewer | Welcome to Global Issues Today. I'm speaking with Dr. Elena Martinez, a food security specialist at the International De | `/tmp/listening-qa-v2-spot-listen/126e9fea-c180-4b69-8d3e-22601ed2fa1c.mp3` |
| interview | مقابلة مع اقتصادي عن مفارقة الموارد والوفرة | Dr. Sarah Mitchell | Welcome to Economic Perspectives. I'm Dr. Sarah Mitchell, and today we're exploring the fascinating intersection of tech | `/tmp/listening-qa-v2-spot-listen/1aa1b9f9-44a6-4cb4-93e6-3c8e54b96f70.mp3` |
| dialogue | محادثة عن رحلة التنزه في جبال السروات | Layla | Hi Nora! How was your mountain trip last weekend? I saw your photos on Instagram and they looked amazing! | `/tmp/listening-qa-v2-spot-listen/1f6723b1-fa54-4ac2-837f-6b6b9f199a26.mp3` |
| dialogue | ليلى وموني يخططان للخروج إلى السينما | Layla | Hi Mona! I was wondering if you want to go to the cinema this weekend. There are some really good movies playing right n | `/tmp/listening-qa-v2-spot-listen/2b772e7e-3d14-4223-8053-fabecd8cf0b5.mp3` |

## How to spot-listen on Mac

```bash
open /tmp/listening-qa-v2-spot-listen
# Or play one at a time:
afplay /tmp/listening-qa-v2-spot-listen/0767ef9b-5f6a-48e0-9f47-94bd590ac608.mp3
afplay /tmp/listening-qa-v2-spot-listen/126e9fea-c180-4b69-8d3e-22601ed2fa1c.mp3
afplay /tmp/listening-qa-v2-spot-listen/1aa1b9f9-44a6-4cb4-93e6-3c8e54b96f70.mp3
afplay /tmp/listening-qa-v2-spot-listen/1f6723b1-fa54-4ac2-837f-6b6b9f199a26.mp3
afplay /tmp/listening-qa-v2-spot-listen/2b772e7e-3d14-4223-8053-fabecd8cf0b5.mp3
```

## Errors

(none)