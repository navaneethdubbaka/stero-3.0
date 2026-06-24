#include <AFMotor.h>

AF_DCMotor motorLeft(2);
AF_DCMotor motorRight(3);

int motorSpeed = 180; // Default startup speed
unsigned long lastCommandTime = 0;
const unsigned long SAFETY_TIMEOUT = 3000; // Stop if no serial command received for 3 seconds

String inputBuffer = "";
bool motorsStopped = true; // Track motor state to avoid hammering shift registers
bool ledState = false;     // Track diagnostic LED state

void setup() {
  Serial.begin(115200); // Baud rate upgraded to 115200 (matches working test_motors.ino)
  
  pinMode(13, OUTPUT);      // Onboard LED pin
  digitalWrite(13, LOW);    // Start with LED off
  
  stopMotors();
  lastCommandTime = millis();
}

void loop() {
  // Check for incoming serial data
  while (Serial.available() > 0) {
    char incomingChar = (char)Serial.read();
    
    // Diagnostic: Toggle the built-in Pin 13 LED on every byte received
    ledState = !ledState;
    digitalWrite(13, ledState ? HIGH : LOW);
    
    // Treat newline or carriage return as the end of a command
    if (incomingChar == '\n' || incomingChar == '\r') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = ""; // Reset buffer
        lastCommandTime = millis(); // Reset safety watchdog
      }
    } else {
      inputBuffer += incomingChar;
    }
  }

  // Safety Watchdog: Stop motors if we lose connection or don't get commands
  if (millis() - lastCommandTime > SAFETY_TIMEOUT) {
    stopMotors();
  }
}

void processCommand(String command) {
  command.trim(); // Clean whitespace

  if (command.length() == 0) return;

  // NOTE: All Serial.print/println statements have been removed to prevent the serial TX buffer 
  // from filling up and blocking the main thread, which would freeze the Arduino.

  // Direction Commands
  if (command == "F") {
    moveForward();
  } else if (command == "B") {
    moveBackward();
  } else if (command == "L") {
    rotateLeft();
  } else if (command == "R") {
    rotateRight();
  } else if (command == "S") {
    stopMotors();
  }
  // Speed Setting Command (e.g. "V:150")
  else if (command.startsWith("V:")) {
    String valueStr = command.substring(2);
    int newSpeed = valueStr.toInt();
    if (newSpeed >= 0 && newSpeed <= 255) {
      motorSpeed = newSpeed;
      
      // Update speeds dynamically if currently moving
      motorLeft.setSpeed(motorSpeed);
      motorRight.setSpeed(motorSpeed);
    }
  }
}

void moveForward() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(FORWARD);
  motorRight.run(FORWARD);
}

void moveBackward() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(BACKWARD);
  motorRight.run(BACKWARD);
}

void rotateLeft() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(BACKWARD);
  motorRight.run(FORWARD);
}

void rotateRight() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(FORWARD);
  motorRight.run(BACKWARD);
}

void stopMotors() {
  // Only write to the shift register if motors are not already stopped
  if (!motorsStopped) {
    motorLeft.run(RELEASE);
    motorRight.run(RELEASE);
    motorsStopped = true;
  }
}
