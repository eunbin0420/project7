let currentFloor = 1;
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

const currentFloorSelect = document.getElementById("currentFloor");
const myFloorSelect = document.getElementById("myFloor");
const stopFloorsBox = document.getElementById("stopFloors");
const doorClose = document.getElementById("doorClose");
const stopResult = document.getElementById("stopResult");
const timeResult = document.getElementById("timeResult");
const floorDisplay = document.getElementById("floorDisplay");
const etaDisplay = document.getElementById("etaDisplay");
const directionIcon = document.getElementById("directionIcon");
const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");
const resetBtn = document.getElementById("resetBtn");

function initFloors() {
  for (let i = 1; i <= 8; i++) {
    currentFloorSelect.innerHTML += `<option value="${i}">${i}층</option>`;
    myFloorSelect.innerHTML += `<option value="${i}">${i}층</option>`;

    const btn = document.createElement("button");
    btn.className = "floor-chip";
    btn.textContent = i + "층";

    btn.addEventListener("click", () => {
      if (selectedStops.has(i)) {
        selectedStops.delete(i);
        btn.classList.remove("active");
      } else {
        selectedStops.add(i);
        btn.classList.add("active");
      }
      updatePreview();
    });

    stopFloorsBox.appendChild(btn);
  }

  currentFloorSelect.value = 1;
  myFloorSelect.value = 4;
}

function getMoveTime(start, end) {
  return Math.abs(moveTimeFrom1[end] - moveTimeFrom1[start]);
}

function calculateTime() {
  const start = Number(currentFloorSelect.value);
  const end = Number(myFloorSelect.value);

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

  return { start, end, stops, route, totalTime };
}

function updatePreview() {
  const result = calculateTime();

  const stopText =
    result.stops.length > 0
      ? result.stops.map(f => f + "층").join(", ")
      : "없음";

  stopResult.innerText = stopText;
  timeResult.innerText = result.totalTime.toFixed(2) + "초";

  etaDisplay.innerText =
    result.totalTime.toFixed(2) +
    "초 뒤 도착\n" +
    "정차 예정층: " +
    stopText;
}

function setFloorDisplay(floor) {
  floorDisplay.innerText = String(floor).padStart(2, "0");
}

function startElevator(direction) {
  if (isMoving) return;

  const result = calculateTime();

  if (result.start === result.end) {
    etaDisplay.innerText = "이미 도착";
    return;
  }

  isMoving = true;

  const pressedBtn = direction === "up" ? upBtn : downBtn;
  pressedBtn.classList.add("pressed");

  directionIcon.innerText = result.end > result.start ? "▲" : "▼";

  const stopText =
    result.stops.length > 0
      ? result.stops.map(f => f + "층").join(", ")
      : "없음";

  etaDisplay.innerText =
    result.totalTime.toFixed(2) +
    "초 뒤 도착\n" +
    "정차 예정층: " +
    stopText;

  let routeIndex = 0;

  function moveNext() {
    if (routeIndex >= result.route.length - 1) {
      etaDisplay.innerText = "도착 완료";
      pressedBtn.classList.remove("pressed");
      isMoving = false;
      currentFloorSelect.value = currentFloor;
      updatePreview();
      return;
    }

    const nextFloor = result.route[routeIndex + 1];
    const step = nextFloor > currentFloor ? 1 : -1;

    const timer = setInterval(() => {
      currentFloor += step;
      setFloorDisplay(currentFloor);

      if (currentFloor === nextFloor) {
        clearInterval(timer);
        routeIndex++;

        if (currentFloor !== result.end) {
          etaDisplay.innerText =
            currentFloor +
            "층 정차\n" +
            "정차 예정층: " +
            stopText;

          setTimeout(moveNext, 900);
        } else {
          setTimeout(moveNext, 500);
        }
      }
    }, 650);
  }

  moveNext();
}

doorClose.addEventListener("change", updatePreview);

currentFloorSelect.addEventListener("change", () => {
  currentFloor = Number(currentFloorSelect.value);
  setFloorDisplay(currentFloor);
  updatePreview();
});

myFloorSelect.addEventListener("change", updatePreview);

upBtn.addEventListener("click", () => startElevator("up"));
downBtn.addEventListener("click", () => startElevator("down"));

resetBtn.addEventListener("click", () => {
  selectedStops.clear();

  document.querySelectorAll(".floor-chip").forEach(btn => {
    btn.classList.remove("active");
  });

  currentFloor = 1;
  currentFloorSelect.value = 1;
  myFloorSelect.value = 4;
  doorClose.checked = false;

  directionIcon.innerText = "─";
  setFloorDisplay(1);
  etaDisplay.innerText = "대기 중";

  updatePreview();
});

initFloors();
setFloorDisplay(1);
updatePreview();
