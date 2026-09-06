Chỉ cần **4 feature chính**:

1. Dashboard
2. Meetings
3. Tasks
4. Projects

# Dashboard/ My Tasks

My Tasks
├── Overdue
├── Today
├── This Week
└── Upcoming

# Projects

Mỗi project nên có một trang Overview.

Metadata

Members

Tasks

Meetings

# Task Management

```json
Task
├── Title
├── Description
├── Status
├── Priority
├── Assignee
├── Labels
├── Due Date
└── Source Meeting
```

click vào source meeting ⇒ quay lại đúng đoạn audio/transcript nơi task được nhắc đến.

## Comment

# Meeting

```jsx
┌─────────────────────────────────────────────────────────┐
│ Weekly Team Meeting                          45:32      │
│ Sep 05, 2026 • 5 participants                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▶ Audio Timeline                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│                                                         │
├────────────────────────┬────────────────────────────────┤
│ TRANSCRIPT             │ AI INSIGHTS                    │
│                        │                                │
│ 00:01 🟣 Phuoc         │ ✨ Summary                     │
│ Let's discuss...       │                                │
│                        │ • Authentication issues        │
│ 02:14 🔵 An            │ • Dashboard redesign           │
│ I will redesign...     │ • Notification system          │
│                        │                                │
│ 05:42 🟣 Phuoc         │ ✓ ACTION ITEMS                 │
│ I'll fix auth...       │                                │
│                        │ ☑ Fix authentication           │
│ 08:20 🟢 Minh          │   @Phuoc                       │
│ I'll handle API...     │                                │
│                        │ ☐ Dashboard redesign           │
│                        │   @An                          │
└────────────────────────┴────────────────────────────────┘
```

!image.png

!image.png

!image.png

## Extension

Google Meet → Chrome Extension

Discord → Discord Bot

Zoom → Future Integration

Teams → Future Integration

```json
          Google Meet Extension
                    │
                    │
Discord Bot ────────┤
                    ▼
              Audio Storage
                    │
                    ▼
              AI Pipeline
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      Meeting             Tasks
```

### Google Meet

```jsx
Chrome Extension
│
├── Detect Google Meet
│
├── Recording State
│   ├── Start Recording
│   ├── Pause
│   └── Stop
│
├── Capture Audio
│
└── Upload to Backend
```

### Discord

```json
Discord Server
      │
      ▼
Discord Bot joins Voice Channel
      │
      ▼
Capture Audio Streams
      │
      ▼
Backend Processing
```

## Speaker Diarization and Transcript

Speaker diarization thường cho: Speaker 1, Speaker 2, Speaker 3, … 

⇒ UI

```json
Who is speaking?

🟣 Speaker 1 → [ Phước Nguyen ▼ ]
🔵 Speaker 2 → [ An Nguyen    ▼ ]
🟢 Speaker 3 → [ Minh Tran   ▼ ]

        [ Confirm speakers ]
```

Tạo voice embedding

⇒ kết quả

```json
{
  "meeting": "Weekly Meeting",
  "transcript": [
    {
      "speaker": "Speaker 1",
      "start": "00:02:10",
      "text": "I'll fix the authentication issue."
    },
    {
      "speaker": "Speaker 2",
      "start": "00:02:30",
      "text": "I will redesign the dashboard."
    }
  ]
}
```

## Summary meeting

- Description
- Important Decisions
- action_items

```json
{
  "summary": "...",
  "decisions": [],
  "action_items": [
    {
      "task": "Fix authentication issue",
      "assignee": "Phuoc",
      "deadline": "Friday",
      "confidence": 0.92
    }
  ]
}
```

# Notifications

## Task

- Khi được assign task
- **Khi bị unassign**
- **Khi task comment được mention**
- Nếu Task có comments
- **Status changed**
- Task bị overdue
    
    Due today       → 1 notification
    Overdue 1 day   → 1 notification
    Overdue 3 days  → optional reminder
    
- Task sắp đến hạn
    
    Due in 24 hours
    Due in 1 hour (optional)
    Due today
    

## Project

- Member được thêm vào Project

## Meeting

- Lịch meeting
- Sắp đến lịch meeting
- Meeting report complete
- Summary meeting complete

complete