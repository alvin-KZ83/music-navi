const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create gain nodes for left and right channels
const leftGain = audioContext.createGain();
const rightGain = audioContext.createGain();
leftGain.connect(audioContext.destination);
rightGain.connect(audioContext.destination);

let source;
let isPlaying = false;
let startTime = 0;
let pausedAt = 0;
let posY = 0; // Head height (Y)

function loadSound() {
  fetch("scyho.mp3") // Replace with your local file path
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(leftGain);
      source.connect(rightGain);
    })
    .catch((error) => console.error("Error loading sound file:", error));
}

function playSound() {
  if (source) {
    source.start();
    isPlaying = true;
  } else {
    loadSound();
    setTimeout(() => source.start(), 500);
  }
}

// Canvas setup for the joystick
const joystickCanvas = document.getElementById("joystickCanvas");
const ctx = joystickCanvas.getContext("2d");
const radius = joystickCanvas.width / 2 - 10;
let joystickX = joystickCanvas.width / 2;
let joystickY = joystickCanvas.height / 2;

function drawJoystick() {
  ctx.clearRect(0, 0, joystickCanvas.width, joystickCanvas.height);

  // Draw the outer boundary circle
  ctx.beginPath();
  ctx.arc(
    joystickCanvas.width / 2,
    joystickCanvas.height / 2,
    radius,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  // Draw the joystick sphere
  ctx.beginPath();
  ctx.arc(joystickX, joystickY, 10, 0, Math.PI * 2);
  ctx.fillStyle = isDragging ? "red" : "#333";
  ctx.fill();
}

function updateAudioVolume() {
  const x = (joystickX - joystickCanvas.width / 2) / radius;

  // Calculate gain values based on joystick position
  // x ranges from -1 (left) to 1 (right)
  const leftVolume = Math.max(0, 1 - x); // Decrease left volume as x increases
  const rightVolume = Math.max(0, 1 + x); // Increase right volume as x increases

  leftGain.gain.setValueAtTime(leftVolume, audioContext.currentTime);
  rightGain.gain.setValueAtTime(rightVolume, audioContext.currentTime);

  document.getElementById(
    "positionDisplay"
  ).innerText = `Volume - Left: ${leftVolume.toFixed(2)}, Right: ${rightVolume.toFixed(2)}`;
}

// Mouse interaction for joystick
let isDragging = false;
joystickCanvas.addEventListener("mousedown", (e) => {
  isDragging = true;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  // Reset joystick position when dragging stops
  joystickX = joystickCanvas.width / 2;
  joystickY = joystickCanvas.height / 2;
  drawJoystick(); // Draw with updated position and color
  updateAudioVolume(); // Update audio volume to reflect reset
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    const rect = joystickCanvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - joystickCanvas.width / 2;
    const offsetY = e.clientY - rect.top - joystickCanvas.height / 2;
    const distance = Math.sqrt(offsetX ** 2 + offsetY ** 2);

    // Keep joystick within boundary
    if (distance < radius) {
      joystickX = e.clientX - rect.left;
      joystickY = e.clientY - rect.top;
    } else {
      joystickX = rect.width / 2 + offsetX * (radius / distance);
      joystickY = rect.height / 2 + offsetY * (radius / distance);
    }

    drawJoystick();
    updateAudioVolume();
  }
});

// Scroll wheel to adjust Y position
document.addEventListener("wheel", (e) => {
  posY = Math.min(10, Math.max(-10, posY - e.deltaY * 0.01));
  updateAudioVolume();
});

drawJoystick();
loadSound();
