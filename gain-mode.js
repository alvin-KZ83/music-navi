const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let source;
let isPlaying = false;
let posX = 0, posY = 0, posZ = 0;

let currentHeading = null;

// Create two GainNodes for left and right volume control
const leftGain = audioContext.createGain();
const rightGain = audioContext.createGain();

// Connect the gains to the destination (stereo output)
leftGain.connect(audioContext.destination);
rightGain.connect(audioContext.destination);

document.getElementById('sensor-permission').addEventListener('click', function () {
  // Check if permission is needed (e.g., on iOS) and request it
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          console.log('Motion sensor permission granted.');
          window.addEventListener('deviceorientation', updateHeading, true);
        } else {
          alert('Permission to access motion sensors was denied.');
        }
      })
      .catch(console.error);
  } else {
    // For devices that do not require permission
    window.addEventListener('deviceorientation', updateHeading, true);
  }
});

function updateHeading(event) {
  // Use the alpha value to get the current heading (z-axis rotation)
  currentHeading = event.alpha;
  document.getElementById("heading").innerText = `${Math.round(currentHeading)}`;

  // Display direction status based on the heading (e.g., facing north if near 0°)
  checkDirection();
}

function checkDirection() {
  const tolerance = 10; // Degrees of tolerance for detecting direction
  const north = 0;      // Define 0° as North

  // Calculate the difference between the current heading and north
  let headingDifference = Math.abs(currentHeading - north);

  // Adjust for 360-degree wrap-around
  if (headingDifference > 180) {
    headingDifference = 360 - headingDifference;
  }

  // Update the status message if facing "north"
  if (headingDifference <= tolerance) {
    document.getElementById("direction-status").innerText = `Good! Facing North.`;
  } else {
    document.getElementById("direction-status").innerText = `Adjust to face North.`;
  }
}

function loadSound() {
  fetch("scyho.mp3") // Replace with your local file path
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Connect source to left and right gain nodes
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
  ctx.arc(joystickX, joystickY, 20, 0, Math.PI * 2);
  ctx.fillStyle = isDragging ? "red" : "#333";
  ctx.fill();
}

// Calculate heading based on joystick position
function calculateHeading() {
  // Calculate the angle in radians, with respect to negative z-axis (0 degrees at x=0, z=-1)
  const x = (joystickX - joystickCanvas.width / 2) / radius;
  const z = (joystickY - joystickCanvas.height / 2) / radius;
  
  // atan2 gives angle in radians from -π to π, so convert to degrees
  let angle = Math.atan2(-x, -z) * (180 / Math.PI);  // negative x for counterclockwise rotation
  
  // Ensure angle is between 0 and 360 degrees
  if (angle < 0) angle += 360;

  return angle.toFixed(2);  // Return heading as a fixed decimal string
}

function updateVolume() {
  // Calculate the angle based on joystick position
  const heading = calculateHeading();

  // Map joystick position to left/right volume adjustment
  const leftVolume = Math.max(0, Math.min(1, (360 - heading) / 360));  // Volume for left
  const rightVolume = Math.max(0, Math.min(1, heading / 360));         // Volume for right

  // Update left and right gain nodes
  leftGain.gain.setValueAtTime(leftVolume, audioContext.currentTime);
  rightGain.gain.setValueAtTime(rightVolume, audioContext.currentTime);

  document.getElementById("positionDisplay").innerText = `Heading: ${heading}°, Left Volume: ${leftVolume.toFixed(2)}, Right Volume: ${rightVolume.toFixed(2)}`;
}

// Mouse interaction for joystick
let isDragging = false;
joystickCanvas.addEventListener("mousedown", (e) => {
  isDragging = true;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  drawJoystick();
  updateVolume();
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
    updateVolume();
  }
});

joystickCanvas.addEventListener("touchstart", (e) => {
  isDragging = true;
  handleTouchMove(e);
});
joystickCanvas.addEventListener("touchmove", handleTouchMove);
joystickCanvas.addEventListener("touchend", () => {
  isDragging = false;
});

function handleTouchMove(e) {
  const touch = e.touches[0];  // Use the first touch
  const rect = joystickCanvas.getBoundingClientRect();
  const offsetX = touch.clientX - rect.left - joystickCanvas.width / 2;
  const offsetY = touch.clientY - rect.top - joystickCanvas.height / 2;
  const distance = Math.sqrt(offsetX ** 2 + offsetY ** 2);
  if (distance < radius) {
    joystickX = touch.clientX - rect.left;
    joystickY = touch.clientY - rect.top;
  } else {
    joystickX = rect.width / 2 + offsetX * (radius / distance);
    joystickY = rect.height / 2 + offsetY * (radius / distance);
  }
  drawJoystick();
  updateVolume();
}

// Scroll wheel to adjust Y position
document.addEventListener("wheel", (e) => {
  posY = Math.min(10, Math.max(-10, posY - e.deltaY * 0.01));
  updateVolume();
});

drawJoystick();
loadSound();
