#include <AFMotor.h>

AF_DCMotor motorLeft(2);
AF_DCMotor motorRight(3);

const int SPEED = 180;

void setup() {
  Serial.begin(115200);

  Serial.println("Motor Test Starting...");
  delay(2000);

  // Forward
  Serial.println("Forward");
  moveForward();
  delay(3000);

  stopMotors();
  delay(1000);

  // Backward
  Serial.println("Backward");
  moveBackward();
  delay(3000);

  stopMotors();
  delay(1000);

  // Rotate Left
  Serial.println("Rotate Left");
  rotateLeft();
  delay(2000);

  stopMotors();
  delay(1000);

  // Rotate Right
  Serial.println("Rotate Right");
  rotateRight();
  delay(2000);

  stopMotors();
  delay(1000);

  // 360 Left
  Serial.println("360 Left");
  rotateLeft();
  delay(3000);    // Adjust after testing

  stopMotors();
  delay(1000);

  // 360 Right
  Serial.println("360 Right");
  rotateRight();
  delay(3000);    // Adjust after testing

  stopMotors();

  Serial.println("Test Complete");
}

void loop() {
}

void moveForward() {
  motorLeft.setSpeed(SPEED);
  motorRight.setSpeed(SPEED);

  motorLeft.run(FORWARD);
  motorRight.run(FORWARD);
}

void moveBackward() {
  motorLeft.setSpeed(SPEED);
  motorRight.setSpeed(SPEED);

  motorLeft.run(BACKWARD);
  motorRight.run(BACKWARD);
}

void rotateLeft() {
  motorLeft.setSpeed(SPEED);
  motorRight.setSpeed(SPEED);

  motorLeft.run(BACKWARD);
  motorRight.run(FORWARD);
}

void rotateRight() {
  motorLeft.setSpeed(SPEED);
  motorRight.setSpeed(SPEED);

  motorLeft.run(FORWARD);
  motorRight.run(BACKWARD);
}

void stopMotors() {
  motorLeft.run(RELEASE);
  motorRight.run(RELEASE);
}