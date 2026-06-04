let currentFloor = 1;
let targetFloor = 1;
let isMoving = false;

const selectedStops = new Set();

const moveTimeFrom1 = {
  1: 0,
  2: 9.02,
  3: 12.01,
  4: 16.31,
  5: 19.88,
  6: 22.27,
  7: 25.84,
  8: 29.25
};

const doorTimeFast = 8.60;
const doorTimeNormal = 17.22;

const floorButtons = document.getElementById("floorButtons");
const stopButtons = document.getElementById("stopButtons");
const doorClose = document.getElementById("doorClose");

const direction = document.getElementById("direction");
const floor = document.getElementById("floor");
const arrival = document.getElementById("arrival");
const stopInfo = document.getElementById("stopInfo");

const timeText = document.getElementById("timeText");
const stopText = document.getElementById("stopText");

const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");

function padFloor(num) {
  return String(num).padStart(2, "0");
}

function getMoveTime(start, end) {
  return Math.abs(moveTimeFrom1[end] - moveTimeFrom1[start]);
}

function getStopText(stops) {
  return stops.length > 0
    ? stops.map(f => f + "층").join(", ")
    : "없음";
}

function calculateTime() {
  const start = currentFloor;
  const end = targetFloor;

  const stops = [...selectedStops]
    .filter(f => f > Math.min(start, end) && f < Math.max(start, end))
    .sort((a, b) => start < end ? a - b : b - a);

  const route = [start, ...stops, end];

  let moveTime = 0;

  for (let i = 0; i < route.length - 1; i++) {
    moveTime += getMoveTime(route[i], route[i + 1]);
  }

  const doorTime = doorClose.checked ? doorTimeFast : doorTimeNormal;
  const totalTime = moveTime + doorTime + stops.length * doorTime;

  return {
    stops,
    route,
    totalTime
  };
}

function updateScreen() {
  const result = calculateTime();
  const stopTextValue = getStopText(result.stops);

  floor.innerText = padFloor(currentFloor);

  if (currentFloor === targetFloor) {
    direction.innerText = "─";
  } else {
    direction.innerText = targetFloor > currentFloor ? "↑" : "↓";
  }

  arrival.innerText =
    result.totalTime.toFixed(2) + "초 뒤\n도착";

  stopInfo.innerText =
    "정차 예정층: " + stopTextValue;

  timeText.innerText =
    result.totalTime.toFixed(2) + "초";

  stopText.innerText = stopTextValue;
}

function createButtons() {
  for (let i = 1; i <= 8; i++) {
    const floorBtn = document.createElement("button");
    floorBtn.className = "floor-btn";
    floorBtn.innerText = i + "층";

    if (i === 1) {
      floorBtn.classList.add("active");
    }

    floorBtn.addEventListener("click", () => {
      targetFloor = i;

      document.querySelectorAll(".floor-btn").forEach(btn => {
        btn.classList.remove("active");
      });

      floorBtn.classList.add("active");
      updateScreen();
    });

    floorButtons.appendChild(floorBtn);

    const stopBtn = document.createElement("button");
    stopBtn.className = "stop-btn";
    stopBtn.innerText = i + "층";

    stopBtn.addEventListener("click", () => {
      if (selectedStops.has(i)) {
        selectedStops.delete(i);
        stopBtn.classList.remove("active");
      } else {
        selectedStops.add(i);
        stopBtn.classList.add("active");
      }

      updateScreen();
    });

    stopButtons.appendChild(stopBtn);
  }
}

function moveElevator() {
  if (isMoving || currentFloor === targetFloor) return;

  isMoving = true;

  const result = calculateTime();
  const route = result.route;
  const stopTextValue = getStopText(result.stops);

  const movingButton =
    targetFloor > currentFloor ? upBtn : downBtn;

  movingButton.classList.add("pressed");

  arrival.innerText =
    result.totalTime.toFixed(2) + "초 뒤\n도착";

  stopInfo.innerText =
    "정차 예정층: " + stopTextValue;

  let routeIndex = 0;

  function moveNext() {
    if (routeIndex >= route.length - 1) {
      isMoving = false;
      movingButton.classList.remove("pressed");
      arrival.innerText = "도착 완료";
      stopInfo.innerText = "정차 예정층: " + stopTextValue;
      updateScreen();
      return;
    }

    const nextFloor = route[routeIndex + 1];
    const step = nextFloor > currentFloor ? 1 : -1;

    direction.innerText = step === 1 ? "↑" : "↓";

    const timer = setInterval(() => {
      currentFloor += step;
      floor.innerText = padFloor(currentFloor);

      if (currentFloor === nextFloor) {
        clearInterval(timer);
        routeIndex++;

        if (currentFloor !== targetFloor) {
          arrival.innerText = currentFloor + "층 정차";
          stopInfo.innerText = "정차 예정층: " + stopTextValue;
          setTimeout(moveNext, 900);
        } else {
          setTimeout(moveNext, 500);
        }
      }
    }, 700);
  }

  moveNext();
}

doorClose.addEventListener("change", updateScreen);
upBtn.addEventListener("click", moveElevator);
downBtn.addEventListener("click", moveElevator);

createButtons();
updateScreen();
