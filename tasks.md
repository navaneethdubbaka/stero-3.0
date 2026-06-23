# ABIOGENESIS Development Task Breakdown

## Task 1: Project Bootstrap

### Goal

Create the base React Native application.

### Requirements

* React Native TypeScript project
* Landscape-only orientation
* Dark theme
* Zustand setup
* React Navigation setup

### Output

Working application shell.

---

## Task 2: Folder Structure

### Goal

Create scalable project structure.

### Requirements

src/
├── screens/
├── components/
├── navigation/
├── services/
├── store/
├── face/
├── voice/
├── llm/
├── robot/
├── vision/
├── notifications/
├── settings/
├── memory/
└── utils/

### Output

Clean architecture.

---

## Task 3: Global State System

### Goal

Create Zustand stores.

### Stores

EmotionStore

RobotStore

VoiceStore

SettingsStore

NotificationStore

ConversationStore

### Output

Global state management ready.

---

## Task 4: Face Engine Core

### Goal

Create face rendering engine.

### Requirements

Support emotions:

* Idle
* Happy
* Listening
* Thinking
* Speaking
* Sleepy
* Surprised
* Sad

### Output

Emotion changes update face.

---

## Task 5: Blink System

### Goal

Create realistic blinking.

### Requirements

Random interval:

3-8 seconds

Blink duration:

100-200ms

### Output

Robot appears alive.

---

## Task 6: Face Animation Engine

### Goal

Support animated transitions.

### Requirements

Idle → Happy

Happy → Thinking

Thinking → Speaking

Speaking → Idle

### Output

Smooth face transitions.

---

## Task 7: Home Screen

### Goal

Main navigation screen.

### Sections

Face

Manual Control

Settings

AI

Notifications

### Output

Navigation hub.

---

## Task 8: Settings System

### Goal

Persist all settings.

### Categories

AI

Voice

Robot

Display

Notifications

### Output

Settings saved locally.

---

## Task 9: AI Provider Settings

### Goal

Configure OpenAI-compatible APIs.

### Fields

Base URL

API Key

Model

Temperature

Max Tokens

System Prompt

### Output

Provider configuration stored.

---

## Task 10: USB Detection

### Goal

Detect Arduino connection.

### Requirements

Detect USB device

Connect

Disconnect

Connection status

### Output

Arduino connection working.

---

## Task 11: Serial Communication Layer

### Goal

Create robot communication service.

### Functions

sendForward()

sendBackward()

sendLeft()

sendRight()

sendStop()

### Output

Commands reach Arduino.

---

## Task 12: Manual Control Screen

### Goal

Drive robot manually.

### Controls

Forward

Backward

Left

Right

Stop

### Output

Robot moves from phone.

---

## Task 13: Sonic Runtime Integration

### Goal

Load ONNX runtime.

### Requirements

Load model

Run inference

Return confidence

### Output

Wake model operational.

---

## Task 14: Wake Word Pipeline

### Goal

Create wake detection.

### Pipeline

Microphone

↓

Audio Frames

↓

Sonic Model

↓

Wake Event

### Output

Wake event generated.

---

## Task 15: Wake Word Event System

### Goal

Integrate wake events with UI.

### Actions

Wake animation

Happy emotion

Start speech recognition

### Output

Robot wakes up.

---

## Task 16: Speech Recognition

### Goal

Convert speech to text.

### Requirements

Start

Stop

Timeout

Result callback

### Output

User speech converted to text.

---

## Task 17: Text-To-Speech

### Goal

Convert text to voice.

### Requirements

Speak text

Stop speech

Voice selection

Speed control

### Output

Robot speaks.

---

## Task 18: Conversation Pipeline

### Goal

Connect speech input to output.

### Flow

Wake Word

↓

Speech

↓

Text

↓

Response

↓

TTS

### Output

Basic conversation loop.

---

## Task 19: OpenAI-Compatible Client

### Goal

Connect any AI provider.

### Endpoints

GET /models

POST /chat/completions

### Output

Universal AI backend.

---

## Task 20: Model Discovery

### Goal

Fetch models automatically.

### Output

Model dropdown populated.

---

## Task 21: Chat Completion Service

### Goal

Send prompts.

### Output

Receive AI responses.

---

## Task 22: Personality Engine

### Goal

Maintain robot identity.

### Components

System prompt

Character prompt

Behavior rules

### Output

Consistent personality.

---

## Task 23: Memory Engine

### Goal

Store user information.

### Store

Name

Preferences

Conversation history

### Output

Memory persistence.

---

## Task 24: Context Builder

### Goal

Build prompts.

### Pipeline

System Prompt

*

Memory

*

Conversation

*

User Input

### Output

Final prompt payload.

---

## Task 25: Notification Listener

### Goal

Capture notifications.

### Sources

WhatsApp

Telegram

SMS

Calls

### Output

Notification stream.

---

## Task 26: Notification UI

### Goal

Display notifications.

### Layout

Large text

Sender

Message preview

### Output

Readable robot notifications.

---

## Task 27: Emotion Rule Engine

### Goal

Automatically change emotions.

### Rules

Wake → Happy

Listening → Listening

Thinking → Thinking

Speaking → Speaking

Notification → Surprised

Idle → Sleepy

### Output

Emotion automation.

---

## Task 28: Sleep System

### Goal

Manage inactivity.

### Requirements

Timer

Sleep mode

Wake conditions

### Output

Robot sleeps automatically.

---

## Task 29: Idle Behavior Engine

### Goal

Random life-like actions.

### Actions

Blink

Look left

Look right

Yawn

### Output

Robot appears alive.

---

## Task 30: Vision Camera Integration

### Goal

Access camera stream.

### Output

Camera preview.

---

## Task 31: MediaPipe Pose Integration

### Goal

Detect human pose.

### Output

Landmark coordinates.

---

## Task 32: Human Detection Service

### Goal

Determine human presence.

### Output

Person found

Person lost

### Output

Detection events.

---

## Task 33: Tracking Engine

### Goal

Track selected user.

### Output

Target position

Target size

### Output

Tracking data.

---

## Task 34: Distance Estimation

### Goal

Estimate distance.

### Method

Shoulder width

### Output

Far

Medium

Close

---

## Task 35: Navigation Engine

### Goal

Generate movement commands.

### Inputs

Position

Distance

### Outputs

Forward

Left

Right

Stop

---

## Task 36: Follow Mode

### Goal

Autonomous following.

### Pipeline

Camera

↓

Tracking

↓

Navigation

↓

Arduino

### Output

Robot follows human.

---

## Task 37: Eye Contact System

### Goal

Move eyes toward person.

### Output

Eye tracking.

---

## Task 38: Vision AI

### Goal

Ask questions about camera view.

### Examples

What do you see?

Read this text.

Count people.

### Output

Vision responses.

---

## Task 39: Dance Mode

### Goal

Entertainment mode.

### Actions

Rotate

Move

Animate

Speak

### Output

Robot dance behavior.

---

## Task 40: Integration Testing

### Goal

Verify all systems work together.

### Verify

Face

Voice

AI

Notifications

Tracking

Robot Movement

### Output

Stable MVP.
