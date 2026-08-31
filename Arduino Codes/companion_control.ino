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

/** Clamp absolute PWM to 0–255; preserve sign for direction. */
int clampSignedPwm(int value) {
  if (value > 255) return 255;
  if (value < -255) return -255;
  return value;
}

/**
 * Protocol v2.1: signed PWM per side.
 * Positive = same run direction as F (BACKWARD on this shield).
 * Negative = reverse that side (FORWARD).
 * Zero = RELEASE that side (both zero → full stop).
 */
void applyMotorSigned(AF_DCMotor &motor, int signedSpeed) {
  int clamped = clampSignedPwm(signedSpeed);
  int spd = abs(clamped);
  if (clamped == 0) {
    motor.run(RELEASE);
    return;
  }
  motor.setSpeed(spd);
  if (clamped > 0) {
    motor.run(BACKWARD);
  } else {
    motor.run(FORWARD);
  }
}

void applyDifferentialSigned(int leftSpeed, int rightSpeed) {
  if (leftSpeed == 0 && rightSpeed == 0) {
    stopMotors();
    return;
  }
  motorsStopped = false;
  applyMotorSigned(motorLeft, leftSpeed);
  applyMotorSigned(motorRight, rightSpeed);
}

/** Parse "M:l,r" with optional signs. Returns false on malformed input. */
bool parseDifferential(String command, int &leftOut, int &rightOut) {
  int commaIndex = command.indexOf(',');
  if (commaIndex <= 2) {
    return false;
  }
  String leftStr = command.substring(2, commaIndex);
  String rightStr = command.substring(commaIndex + 1);
  leftStr.trim();
  rightStr.trim();
  if (leftStr.length() == 0 || rightStr.length() == 0) {
    return false;
  }
  leftOut = clampSignedPwm(leftStr.toInt());
  rightOut = clampSignedPwm(rightStr.toInt());
  return true;
}

void processCommand(String command) {
  command.trim(); // Clean whitespace

  if (command.length() == 0) return;

  // Protocol v2.1 differential — ACK:M / NAK:M (stable, not full payload)
  if (command.startsWith("M:")) {
    int leftSpeed = 0;
    int rightSpeed = 0;
    if (parseDifferential(command, leftSpeed, rightSpeed)) {
      applyDifferentialSigned(leftSpeed, rightSpeed);
      Serial.println("ACK:M");
    } else {
      Serial.println("NAK:M");
    }
    return;
  }

  // Echo acknowledgment back (safe: one response per command, won't flood TX buffer)
  Serial.println("ACK:" + command);

  // NOTE: All other Serial.print/println statements have been removed to prevent the serial TX buffer 
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

  motorLeft.run(BACKWARD);
  motorRight.run(BACKWARD);
}

void moveBackward() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(FORWARD);
  motorRight.run(FORWARD);
}

void rotateLeft() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(FORWARD);
  motorRight.run(BACKWARD);
}

void rotateRight() {
  motorsStopped = false;
  motorLeft.setSpeed(motorSpeed);
  motorRight.setSpeed(motorSpeed);

  motorLeft.run(BACKWARD);
  motorRight.run(FORWARD);
}

void stopMotors() {
  // Only write to the shift register if motors are not already stopped
  if (!motorsStopped) {
    motorLeft.run(RELEASE);
    motorRight.run(RELEASE);
    motorsStopped = true;
  }
}
