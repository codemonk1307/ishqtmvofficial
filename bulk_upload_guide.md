# Ain Sheen Qaf - Bulk Upload API Guide 🌌

Welcome to the **Bulk Upload API system** of Ain Sheen Qaf. This document guides you on how to execute bulk imports of your poetry corpus, ghazals, shers, or social broadcasts directly into your live Firestore database using simple HTTP requests (`curl`, Postman, or local scripts).

---

## 🔒 Security Configuration

To prevent unauthorized updates, these API routes are protected by an `ADMIN_TOKEN`.

**Requirement:** You MUST configure a secret named `ADMIN_TOKEN` in the **Secrets Panel (via AI Studio Settings)** or your `.env` file. The API strictly enforces this secret token and has no insecure fallbacks.

All requests must supply this token in one of three ways:
- **Header (Recommended):** `X-Admin-Token: <your_token>`
- **Authorization Header:** `Authorization: Bearer <your_token>`
- **Query / Body Parameter:** `?token=<your_token>` or `"token": "<your_token>"`

---

## 1. Bulk Upload Literature (Ghazals, Nazms, Shers)

- **Endpoint:** `POST /api/bulk/literature`
- **Content-Type:** `application/json`

### Payload Structure
The body should contain an `items` array of literature objects.

#### Field Definitions:
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `title` | string | **Yes** | Title of the literary piece |
| `author` | string | **Yes** | Poet's name (e.g., "Ghalib", "Faiz") |
| `category` | string | **Yes** | Genre (e.g., "ghazal", "nazm", "sher", "doha", "rubai", "custom") |
| `originalText` | string | **Yes** | Original Urdu/Hindi verses (supports newlines) |
| `romanizedText`| string | No | Transliterated verses |
| `englishTranslation` | string | No | English poetic translation |
| `hindiUrduExplanation` | string | No | Detailed meaning / Tashreeh / Vyakhya |
| `backgroundStory` | string | No | Historical context or background context |
| `vocabulary` | array | No | Glossary of terms: `[{ "word": "...", "meaning": "...", "pronunciation": "..." }]` |
| `id` | string | No | Custom unique ID (auto-generated if omitted) |

---

### Copy-Paste curl Example (Literature)

```bash
curl -X POST https://your-app-domain.run.app/api/bulk/literature \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_super_secret_bulk_upload_token" \
  -d '{
    "items": [
      {
        "id": "bulk-jaun-1",
        "title": "Umar Guzar Gayi",
        "author": "Jaun Elia",
        "category": "ghazal",
        "originalText": "عمر گزر گئی مگر\nدل کی خلش وہی رہی",
        "romanizedText": "Umar guzar gayi magar\nDil ki khalish wahi rahi",
        "englishTranslation": "An entire lifetime slipped away, yet\nThe sweet ache in my heart remained the same.",
        "hindiUrduExplanation": "जौन इस शेर में वक़्त बीतने और अधूरी चाहत की कसक का अफ़सोस जताते हैं।",
        "backgroundStory": "Written in Jaun Elia’s late phase reflecting melancholia.",
        "vocabulary": [
          { "word": "Khalish", "meaning": "Prick / Pain / Ache", "pronunciation": "kha-lish" }
        ]
      },
      {
        "id": "bulk-ghalib-1",
        "title": "Hazaaron Khwahishein Aisi",
        "author": "Mirza Ghalib",
        "category": "ghazal",
        "originalText": "हज़ारों ख़्वाहिशें ऐसी कि हर ख़्वाहिश पे दम निकले\nबहुत निकले मेरे अरमान लेकिन फिर भी कम निकले",
        "romanizedText": "Hazaaron khwahishein aisi ki har khwahish pe dam nikle\nBahut nikle mere armaan lekin phir bhi kam nikle",
        "englishTranslation": "Thousands of desires, each so intense they take my breath away\nMany of my yearnings were fulfilled, yet so many remain undone.",
        "hindiUrduExplanation": "ग़ालिब कहते हैं कि इंसानी ख्वाहिशों की कोई सीमा नहीं है।"
      }
    ]
  }'
```

---

## 2. Bulk Upload Broadcasts (YouTube & Instagram Reels)

- **Endpoint:** `POST /api/bulk/broadcasts`
- **Content-Type:** `application/json`

#### Field Definitions:
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `title` | string | **Yes** | Aesthetic title for the media card |
| `type` | string | **Yes** | Must be either `"youtube"` or `"instagram"` |
| `embedId` | string | **Yes** | YouTube video ID (e.g., `8hI_gH2TidA`) or IG Reel shortcode (e.g., `C-pS3pbyh9g`) |
| `description` | string | **Yes** |Poetic, soulful description or transcript |
| `id` | string | No | Custom ID (auto-generated if omitted) |

---

### Copy-Paste curl Example (Broadcasts)

```bash
curl -X POST https://your-app-domain.run.app/api/bulk/broadcasts \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_super_secret_bulk_upload_token" \
  -d '{
    "items": [
      {
        "id": "bulk-yt-1",
        "title": "Jaun Elia Slowed Recitation",
        "type": "youtube",
        "embedId": "8hI_gH2TidA",
        "description": "Slow, deep, rain-ambient recitation of Jauns classic existential couplets."
      },
      {
        "id": "bulk-ig-reel-1",
        "title": "Kabir Mystic Void",
        "type": "instagram",
        "embedId": "C-pS3pbyh9g",
        "description": "Handwritten calligraphy presenting Kabirs absolute detachment."
      }
    ]
  }'
```

---

## 💡 Pro Tip: Python Automation Script
If you have a local folder or database of couplets (e.g., in a `.json` file), you can run a script like this to seed everything:

```python
import json
import requests

API_URL = "https://your-app-domain.run.app/api/bulk/literature"
HEADERS = {
    "Content-Type": "application/json",
    "X-Admin-Token": "your_super_secret_bulk_upload_token" # Change to your secret
}

# Load your local JSON corpus
with open("my_poetry_corpus.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Send in batches of 50 to optimize database writes
batch_size = 50
for i in range(0, len(data), batch_size):
    batch = data[i:i+batch_size]
    payload = {"items": batch}
    response = requests.post(API_URL, json=payload, headers=HEADERS)
    print(f"Batch {i//batch_size + 1}: {response.json()}")
```
