# ABIOGENESIS Companion Robot

## Complete Technical Specification & Development Reference

**Version:** 1.0

---

# Table of Contents

1. Project Overview
2. Vision & Goals
3. Hardware Architecture
4. Software Architecture
5. Technology Stack
6. Folder Structure
7. Core Application Modules
8. Face Engine
9. Emotion System
10. Blink Engine
11. Sleep System
12. Wake Word System (Sonic)
13. Speech Recognition
14. Text To Speech
15. OpenAI Compatible LLM System
16. Personality Engine
17. Memory System
18. Notification System
19. USB Robot Communication
20. Manual Control
21. Human Detection
22. Human Following
23. Distance Estimation
24. Eye Contact System
25. Idle Behaviors
26. Settings System
27. Vision AI Features
28. Dance Mode
29. State Machine
30. Database Design
31. Development Phases
32. MVP Requirements
33. Future Roadmap

---

# 1. Project Overview

ABIOGENESIS is an AI-powered companion robot built using:

* Android Smartphone
* Arduino UNO
* L293D Motor Shield
* DC Motors
* OpenAI-Compatible LLM APIs

The smartphone acts as:

* Robot Face
* AI Brain
* Camera
* Microphone
* Speaker
* Notification Display
* Human Tracking System
* Voice Assistant

The Arduino is responsible only for motor control.

---

# 2. Vision & Goals

The objective is to create a robot similar to:

* EMO
* Vector
* Loona

The robot should:

* Display emotions
* React to notifications
* Listen for wake words
* Hold conversations
* Follow users
* Display a living personality
* Support multiple AI providers
* Work entirely on a smartphone

---

# 3. Hardware Architecture

## Components

### Android Phone

Responsibilities:

* Face rendering
* Voice assistant
* Human tracking
* AI processing
* Notification display

### Arduino UNO

Responsibilities:

* Receive commands
* Control motors
* Execute movement

### L293D Motor Shield

Configuration:

```text
M2 → Left Motor
M3 → Right Motor
```

### Battery

External battery powers motors.

Power jumper removed.

Phone is isolated from motor power.

---

# 4. Software Architecture

```text
ABIOGENESIS App
│
├── Face Engine
├── Voice Engine
├── LLM Engine
├── Memory Engine
├── Notification Engine
├── Robot Engine
├── Vision Engine
└── Settings Engine
```

---

# 5. Technology Stack

## Frontend

React Native

TypeScript

## Navigation

React Navigation

## State Management

Zustand

## Database

MMKV

SQLite

## Camera

Vision Camera

## Human Detection

MediaPipe Pose

## Wake Word

Sonic ONNX Model

ONNX Runtime

## Speech Recognition

Android SpeechRecognizer

## Text To Speech

Android TextToSpeech

## LLM

OpenAI-Compatible APIs

---

# 6. Folder Structure

```text
src/
│
├── screens/
├── components/
├── navigation/
├── services/
├── hooks/
├── store/
├── assets/
├── constants/
├── utils/
│
├── face/
├── voice/
├── robot/
├── vision/
├── memory/
├── llm/
├── notifications/
└── settings/
```

---

# 7. Core Application Modules

## Face Module

Responsible for:

* Face rendering
* Animations
* Eye movement
* Emotional expressions

---

## Voice Module

Responsible for:

* Wake word
* Speech recognition
* TTS

---

## LLM Module

Responsible for:

* Model communication
* Prompt construction
* Memory injection

---

## Robot Module

Responsible for:

* USB communication
* Movement
* Tracking control

---

## Vision Module

Responsible for:

* Human detection
* Human following
* Vision AI

---

# 8. Face Engine

## Purpose

Create a living robot face.

## Face Components

* Eyes
* Pupils
* Eyelids
* Mouth
* Eyebrows (optional)

## Display Mode

Landscape only.

---

## Face States

### Idle

```text
•_•
```

---

### Happy

```text
^_^
```

---

### Listening

```text
◉_◉
```

---

### Thinking

```text
¬_¬
```

---

### Speaking

```text
^o^
```

---

### Sleepy

```text
-_- zzz
```

---

### Surprised

```text
O_O
```

---

# 9. Emotion System

## Supported Emotions

```text
IDLE
HAPPY
LISTENING
THINKING
SPEAKING
SURPRISED
SLEEPY
SAD
ANGRY
EXCITED
```

## Triggers

| Event          | Emotion   |
| -------------- | --------- |
| Wake Word      | HAPPY     |
| Listening      | LISTENING |
| LLM Processing | THINKING  |
| Speaking       | SPEAKING  |
| Notification   | SURPRISED |
| No Activity    | SLEEPY    |
| Error          | SAD       |

---

# 10. Blink Engine

## Purpose

Make robot appear alive.

## Rules

Random interval:

```text
3–8 seconds
```

Blink duration:

```text
100–200ms
```

---

# 11. Sleep System

## Trigger

No interaction for:

```text
5 minutes
```

(Default)

---

## Actions

* Sleepy face
* Reduce brightness
* Stop tracking
* Reduce CPU usage

---

## Wake Sources

* Wake word
* Touch
* Notification
* Motion

---

# 12. Wake Word System

## Engine

Sonic Wake Word Model

ONNX Runtime

---

## Pipeline

```text
Microphone
    ↓
Audio Buffer
    ↓
Sonic Model
    ↓
Wake Event
```

---

## Events

```typescript
WAKE_DETECTED
```

---

## Reactions

* Happy face
* Wake sound
* Start speech recognition

---

# 13. Speech Recognition

## Engine

Android SpeechRecognizer

---

## Workflow

```text
Wake Word
     ↓
Speech Recognition
     ↓
Text Output
```

Example:

```json
{
  "text":"Follow me"
}
```

---

# 14. Text To Speech

## Engine

Android TTS

---

## Workflow

```text
LLM Response
      ↓
TTS
      ↓
Audio Output
      ↓
Speaking Animation
```

---

# 15. OpenAI Compatible LLM System

## Goal

Support any AI provider.

---

## Supported Providers

* OpenAI
* OpenRouter
* Ollama
* LM Studio
* Groq
* Together AI
* Fireworks
* vLLM
* Custom APIs

---

## Settings

### Base URL

Example:

```text
https://api.openai.com/v1
```

---

### API Key

Stored securely.

---

### Model

Example:

```text
gpt-5-mini
qwen3-8b
llama3
gemma3
```

---

## Required Endpoints

### Get Models

```http
GET /models
```

### Chat

```http
POST /chat/completions
```

---

# 16. Personality Engine

## Purpose

Maintain robot identity.

## Personality Prompt

```text
You are ABIOGENESIS.

You are a friendly robotic companion.

You are expressive.

You are helpful.

You keep responses concise.
```

---

## Prompt Pipeline

```text
Personality
    +
Memory
    +
Conversation
    ↓
Final Prompt
```

---

# 17. Memory System

## Storage

MMKV

SQLite

---

## Data

### User

* Name
* Preferences

### Conversations

* Messages
* Timestamps

### Robot

* Settings
* Statistics

---

# 18. Notification System

## Sources

* WhatsApp
* Telegram
* SMS
* Calls
* Email
* Calendar

---

## Android Component

Notification Listener Service

---

## Example Display

```text
New WhatsApp Message

John:
Where are you?
```

---

## Face Reaction

```text
SURPRISED
```

---

# 19. USB Robot Communication

## Connection

```text
Phone
 ↓
USB OTG
 ↓
Arduino
```

---

## Protocol v1

```text
F
B
L
R
S
```

---

## Protocol v2

```text
M:150,200
```

Differential drive.

---

# 20. Manual Control

## UI

```text
      F

L     S     R

      B
```

---

## Functions

* Test robot
* Debug movement
* Emergency stop

---

# 21. Human Detection

## Camera

Vision Camera

---

## AI

MediaPipe Pose

---

## Required Landmarks

* Head
* Left Shoulder
* Right Shoulder

---

# 22. Human Following

## Target Selection

Largest visible person.

---

## Steering

Calculate:

```text
centerX
```

---

## Zones

```text
LEFT
CENTER
RIGHT
```

---

## Commands

```text
LEFT → L

CENTER → F

RIGHT → R
```

---

# 23. Distance Estimation

## Method

Shoulder Width

---

## Logic

```text
Small Width
    ↓
Far

Medium Width
    ↓
Good Distance

Large Width
    ↓
Too Close
```

---

## Actions

```text
Far
  ↓
Forward

Good
  ↓
Maintain

Close
  ↓
Stop
```

---

# 24. Eye Contact System

## Purpose

Robot appears aware.

---

## Input

Face location.

---

## Output

Move pupils toward user.

---

# 25. Idle Behaviors

## Random Actions

* Blink
* Look left
* Look right
* Yawn
* Sleep

---

## Frequency

Every:

```text
30–90 seconds
```

---

# 26. Settings System

## AI Settings

* Base URL
* API Key
* Model
* Temperature
* Max Tokens
* System Prompt

---

## Voice Settings

* Wake Word
* Voice
* Speech Rate
* Volume

---

## Robot Settings

* Follow Distance
* Tracking Sensitivity
* Motor Speed

---

## Display Settings

* Face Style
* Brightness
* Sleep Timeout

---

# 27. Vision AI Features

## Commands

```text
What do you see?

Read this text.

Count people.

Find a bottle.
```

---

## Flow

```text
Camera
    ↓
Vision Model
    ↓
LLM
    ↓
Response
```

---

# 28. Dance Mode

## Trigger

```text
Dance
```

---

## Actions

* Rotate
* Move
* Animate face
* Play audio

---

# 29. Robot State Machine

```text
SLEEP
  ↓

WAKE WORD
  ↓

LISTENING
  ↓

THINKING
  ↓

SPEAKING
  ↓

IDLE
  ↓

SLEEP
```

---

# 30. Database Design

## Tables

### Conversations

```sql
id
message
role
timestamp
```

---

### User Profile

```sql
id
name
preferences
```

---

### Settings

```sql
id
key
value
```

---

# 31. Development Phases

## Phase 1

* React Native Setup
* Face Engine
* USB Communication
* Manual Control

---

## Phase 2

* Sonic Wake Word
* Speech Recognition
* TTS

---

## Phase 3

* LLM Integration
* Memory
* Personality

---

## Phase 4

* Notifications
* Emotion Engine
* Idle Behaviors

---

## Phase 5

* Human Detection
* Human Following
* Eye Contact

---

## Phase 6

* Vision AI
* Dance Mode
* Advanced Behaviors

---

# 32. MVP Requirements

Required:

* Face Engine
* Sonic Wake Word
* Speech Recognition
* TTS
* OpenAI Compatible LLM
* WhatsApp Notifications
* USB Robot Control
* Human Following
* Emotion System

---

# 33. Future Roadmap

## V2

* Gesture Recognition
* Face Recognition
* Multiple Personalities
* Better Animations

---

## V3

* Local LLM Support
* RAG Memory
* Autonomous Navigation
* Object Following

---

## V4

* Multi-Agent AI
* Vision Reasoning
* Long-Term Memory
* Full Companion Personality

```
```
