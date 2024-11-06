const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const panner = audioContext.createPanner();
panner.panningModel = "HRTF";

let source;
let isPlaying = false;
let startTime = 0;
let pausedAt = 0;
let posX = 0, posY = 0, posZ = 0;

let currentHeading = null;

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
      source.connect(panner).connect(audioContext.destination);
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

function updatePannerPosition() {
  const x = (joystickX - joystickCanvas.width / 2) / radius;
  const z = (joystickY - joystickCanvas.height / 2) / radius;
  panner.positionX.setValueAtTime(x, audioContext.currentTime);
  panner.positionY.setValueAtTime(posY, audioContext.currentTime);
  panner.positionZ.setValueAtTime(z, audioContext.currentTime);

  document.getElementById(
    "positionDisplay"
  ).innerText = `Position - X: ${x.toFixed(2)}, Y: ${posY.toFixed(
    2
  )}, Z: ${z.toFixed(2)}`;
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
  drawJoystick(isDragging); // Draw with updated position and color
  updatePannerPosition(); // Update panner position to reflect reset
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
    updatePannerPosition();
  }
});

// Scroll wheel to adjust Y position
document.addEventListener("wheel", (e) => {
  posY = Math.min(10, Math.max(-10, posY - e.deltaY * 0.01));
  updatePannerPosition();
});

drawJoystick();
loadSound();
