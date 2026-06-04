let currentFloor = 4;
let targetFloor = 8;
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

const doorTimeNormal = 17.22;

const currentFloorSelect = document.getElementById("currentFloor");
const targetFloorSelect = document.getElementById("targetFloor");
const stopButtons = document.getElementById("stopButtons");

const callBtn = document.getElementById("callBtn");
const resetBtn = document.getElementById("resetBtn");

const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");

const direction = document.getElementById("direction");
const floorDisplay = document.getElementById("floorDisplay");
const arrivalTime = document.getElementById("arrivalTime");
const stopInfo = document.getElementById("stopInfo");

function padFloor(num) {
  return String(num).padStart(2, "0");
}

function getMoveTime(start, end) {
  return Math.abs(moveTimeFrom1[end] - moveTimeFrom1[start]);
}

function getValidStops() {
  const min = Math.min(currentFloor, targetFloor);
  const max = Math.max(currentFloor, targetFloor);

  return [...selectedStops]
    .filter(floor => floor > min && floor < max)
    .sort((a, b) => currentFloor < targetFloor ? a - b : b - a);
}

function getStopText(stops) {
  return stops.length > 0
    ? stops.map(f => f + "층").join(", ")
    : "없음";
}

function calculateTime() {
  const stops = getValidStops();
  const route = [currentFloor, ...stops, targetFloor];

  let moveTime = 0;

  for (let i = 0; i < route.length - 1; i++) {
    moveTime += getMoveTime(route[i], route[i + 1]);
  }

  const totalTime = moveTime + doorTimeNormal + stops.length * doorTimeNormal;

  return {
    stops,
    route,
    totalTime
  };
}

function updateScreen() {
  const result = calculateTime();
  const stopText = getStopText(result.stops);

  floorDisplay.innerText = padFloor(currentFloor);

  if (currentFloor === targetFloor) {
    direction.innerText = "─";
  } else {
    direction.innerText = targetFloor > currentFloor ? "↑" : "↓";
  }

  arrivalTime.innerHTML =
    result.totalTime.toFixed(2) + "초 뒤<br>도착";

  stopInfo.innerText =
    "예정 정차층: " + stopText;
}

function createStopButtons() {
  for (let i = 1; i <= 8; i++) {
    const btn = document.createElement("button");
    btn.className = "floor-btn";
    btn.innerText = i + "층";

    btn.addEventListener("click", () => {
      if (selectedStops.has(i)) {
        selectedStops.delete(i);
        btn.classList.remove("active");
      } else {
        selectedStops.add(i);
        btn.classList.add("active");
      }

      updateScreen();
    });

    stopButtons.appendChild(btn);
  }
}

function moveElevator() {
  if (isMoving || currentFloor === targetFloor) return;

  isMoving = true;

  const result = calculateTime();
  const route = result.route;
  const stopText = getStopText(result.stops);

  const movingBtn = targetFloor > currentFloor ? upBtn : downBtn;
  movingBtn.classList.add("active");

  let routeIndex = 0;

  function moveNext() {
    if (routeIndex >= route.length - 1) {
      isMoving = false;
      movingBtn.classList.remove("active");

      arrivalTime.innerHTML = "도착<br>완료";
      stopInfo.innerText = "예정 정차층: " + stopText;

      currentFloorSelect.value = currentFloor;
      updateScreen();
      return;
    }

    const nextFloor = route[routeIndex + 1];
    const step = nextFloor > currentFloor ? 1 : -1;

    direction.innerText = step === 1 ? "↑" : "↓";

    const timer = setInterval(() => {
      currentFloor += step;
      floorDisplay.innerText = padFloor(currentFloor);

      if (currentFloor === nextFloor) {
        clearInterval(timer);
        routeIndex++;

        if (currentFloor !== targetFloor) {
          arrivalTime.innerHTML = currentFloor + "층<br>정차";
          stopInfo.innerText = "예정 정차층: " + stopText;

          setTimeout(moveNext, 900);
        } else {
          setTimeout(moveNext, 500);
        }
      }
    }, 700);
  }

  updateScreen();
  moveNext();
}

currentFloorSelect.addEventListener("change", () => {
  if (isMoving) return;
  currentFloor = Number(currentFloorSelect.value);
  updateScreen();
});

targetFloorSelect.addEventListener("change", () => {
  if (isMoving) return;
  targetFloor = Number(targetFloorSelect.value);
  updateScreen();
});

callBtn.addEventListener("click", moveElevator);
upBtn.addEventListener("click", moveElevator);
downBtn.addEventListener("click", moveElevator);

resetBtn.addEventListener("click", () => {
  selectedStops.clear();

  document.querySelectorAll(".floor-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  updateScreen();
});

createStopButtons();
updateScreen();
