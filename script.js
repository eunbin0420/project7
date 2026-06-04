// 현재 엘리베이터 위치
let currentFloor = 1;

// 이동 중 여부
let isMoving = false;

// 선택된 정차층 저장
const selectedStops = new Set();

// 네가 측정한 실제 데이터
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

// 문닫힘 버튼
const doorTimeFast = 8.60;
const doorTimeNormal = 17.22;

const currentFloorSelect =
document.getElementById("currentFloor");

const myFloorSelect =
document.getElementById("myFloor");

const stopFloorsBox =
document.getElementById("stopFloors");

const doorClose =
document.getElementById("doorClose");

const stopResult =
document.getElementById("stopResult");

const timeResult =
document.getElementById("timeResult");

const floorDisplay =
document.getElementById("floorDisplay");

const etaDisplay =
document.getElementById("etaDisplay");

const directionIcon =
document.getElementById("directionIcon");

const upBtn =
document.getElementById("upBtn");

const downBtn =
document.getElementById("downBtn");

const resetBtn =
document.getElementById("resetBtn");


// 층 초기화
function initFloors(){

  for(let i=1;i<=8;i++){

    currentFloorSelect.innerHTML +=
    `<option value="${i}">${i}층</option>`;

    myFloorSelect.innerHTML +=
    `<option value="${i}">${i}층</option>`;

    const btn =
    document.createElement("button");

    btn.className = "floor-chip";
    btn.textContent = i + "층";

    btn.addEventListener("click",()=>{

      if(selectedStops.has(i)){
        selectedStops.delete(i);
        btn.classList.remove("active");
      }
      else{
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


// 이동시간 계산
function getMoveTime(start,end){

  return Math.abs(
    moveTimeFrom1[end] -
    moveTimeFrom1[start]
  );
}


// 예상 도착시간 계산
function calculateTime(){

  const start =
  Number(currentFloorSelect.value);

  const end =
  Number(myFloorSelect.value);

  const stops =
  [...selectedStops]
  .filter(f=>{

    const min =
    Math.min(start,end);

    const max =
    Math.max(start,end);

    return f > min && f < max;
  })
  .sort((a,b)=>a-b);

  let moveTime = 0;

  let route =
  [start,...stops,end];

  for(let i=0;i<route.length-1;i++){

    moveTime +=
    getMoveTime(
      route[i],
      route[i+1]
    );
  }

  const doorTime =
  doorClose.checked
  ? doorTimeFast
  : doorTimeNormal;

  const totalTime =
  moveTime +
  doorTime +
  (stops.length * doorTime);

  return {
    start,
    end,
    stops,
    totalTime
  };
}


// 화면 갱신
function updatePreview(){

  const result =
  calculateTime();

  stopResult.innerText =
  result.stops.length
  ? result.stops.join(", ") + "층"
  : "없음";

  timeResult.innerText =
  result.totalTime.toFixed(2)
  + "초";

  etaDisplay.innerText =
  result.totalTime.toFixed(2)
  + "초 뒤 도착";
}


// 엘리베이터 애니메이션
function startElevator(direction){

  if(isMoving) return;

  const result =
  calculateTime();

  if(result.start === result.end){

    etaDisplay.innerText =
    "이미 도착";

    return;
  }

  isMoving = true;

  directionIcon.innerText =
  result.end > result.start
  ? "▲"
  : "▼";

  const route =
  [
    result.start,
    ...result.stops,
    result.end
  ];

  let routeIndex = 0;

  function moveNext(){

    if(routeIndex >= route.length-1){

      etaDisplay.innerText =
      "도착 완료";

      isMoving = false;

      return;
    }

    const nextFloor =
    route[routeIndex+1];

    const step =
    nextFloor > currentFloor
    ? 1
    : -1;

    const timer =
    setInterval(()=>{

      currentFloor += step;

      floorDisplay.innerText =
      currentFloor;

      if(currentFloor === nextFloor){

        clearInterval(timer);

        routeIndex++;

        if(currentFloor !== result.end){

          etaDisplay.innerText =
          currentFloor +
          "층 정차";

          setTimeout(
            moveNext,
            800
          );
        }
        else{

          etaDisplay.innerText =
          result.totalTime.toFixed(2)
          + "초 도착";

          setTimeout(
            moveNext,
            500
          );
        }
      }

    },600);
  }

  moveNext();
}


// 이벤트
doorClose.addEventListener(
"change",
updatePreview
);

currentFloorSelect.addEventListener(
"change",
()=>{
  currentFloor =
  Number(
    currentFloorSelect.value
  );

  floorDisplay.innerText =
  currentFloor;

  updatePreview();
}
);

myFloorSelect.addEventListener(
"change",
updatePreview
);

upBtn.addEventListener(
"click",
()=>startElevator("up")
);

downBtn.addEventListener(
"click",
()=>startElevator("down")
);

resetBtn.addEventListener(
"click",
()=>{

  selectedStops.clear();

  document
  .querySelectorAll(".floor-chip")
  .forEach(btn=>{
    btn.classList.remove("active");
  });

  currentFloor = 1;

  floorDisplay.innerText = 1;

  currentFloorSelect.value = 1;
  myFloorSelect.value = 4;

  doorClose.checked = false;

  etaDisplay.innerText =
  "대기 중";

  updatePreview();
}
);

initFloors();
updatePreview();
