// 실측 데이터셋 매핑
const TIME_DATA_NORMAL = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };
const TIME_DATA_CLOSED = { 1: 0.00, 2: 4.50, 3: 7.20,  4: 10.10, 5: 13.30, 6: 16.00, 7: 19.10, 8: 22.00 }; 

let coreState = {
    currentFloor: 1,
    isMoving: false,
    timerEngine: null,
    moveEngine: null
};

// DOM 요소 바인딩
const uiArrow = document.getElementById('display-arrow');
const uiNumber = document.getElementById('display-number');
const uiTimer = document.getElementById('display-timer');
const uiStopFloor = document.getElementById('display-stop-floor'); // 하드웨어 화면용 정차층 요소 추가
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');

const floorPicker = document.getElementById('floor-picker');
const targetPicker = document.getElementById('target-picker');
const closeBtnCheckbox = document.getElementById('close-button-clicked');

const statTargetFloor = document.getElementById('stat-target-floor');
const statRemainingTime = document.getElementById('stat-remaining-time');
const statMessage = document.getElementById('stat-message');

function syncDisplay() {
    uiNumber.textContent = String(coreState.currentFloor).padStart(2, '0');
}

function triggerElevator(clickedDir) {
    if (coreState.isMoving) return;

    const myPosition = parseInt(floorPicker.value);     
    const projectedStop = parseInt(targetPicker.value);  

    coreState.currentFloor = myPosition;
    syncDisplay();

    if (myPosition === projectedStop) {
        statMessage.textContent = "출발지와 정차층이 같습니다.";
        uiTimer.textContent = "정차 중";
        uiStopFloor.textContent = "NEXT: --F";
        return;
    }

    coreState.isMoving = true;
    
    // 데이터 보드와 검은색 하드웨어 스크린에 예정 정차층 동시 출력
    statTargetFloor.textContent = `${projectedStop}층 (정차 예정)`;
    uiStopFloor.textContent = `NEXT: ${String(projectedStop).padStart(2, '0')}F`;
    statMessage.textContent = "목적지 이동 중";

    const targetHardwareBtn = clickedDir === 'up' ? btnUp : btnDown;
    targetHardwareBtn.classList.add('active');

    const activeTimeTable = closeBtnCheckbox.checked ? TIME_DATA_CLOSED : TIME_DATA_NORMAL;
    
    const startSec = activeTimeTable[myPosition];
    const endSec = activeTimeTable[projectedStop];
    let timeDebt = Math.abs(endSec - startSec);
    const initialDuration = timeDebt;

    const directionSign = projectedStop > myPosition ? '↑' : '↓';
    uiArrow.textContent = directionSign;

    const startFloor = myPosition;
    const endFloor = projectedStop;

    // 1. 시간 카운트다운 루프
    const pulse = 50;
    coreState.timerEngine = setInterval(() => {
        timeDebt -= (pulse / 1000);

        if (timeDebt <= 0) {
            clearInterval(coreState.timerEngine);
            clearInterval(coreState.moveEngine);

            coreState.currentFloor = endFloor;
            syncDisplay();
            uiArrow.textContent = "─";
            uiTimer.textContent = "도착 완료";
            uiStopFloor.textContent = `ARRIVED: ${String(endFloor).padStart(2, '0')}F`;
            statRemainingTime.textContent = "0.00초";
            statMessage.textContent = "정차 완료 (문 열림)";

            setTimeout(() => {
                uiTimer.textContent = "";
                uiStopFloor.textContent = "NEXT: --F";
                statTargetFloor.textContent = "-";
                statMessage.textContent = "대기 중";
                targetHardwareBtn.classList.remove('active');
                coreState.isMoving = false;
            }, 2500);
            return;
        }

        statRemainingTime.textContent = `${timeDebt.toFixed(2)}초`;
        uiTimer.textContent = `${timeDebt.toFixed(2)}초 남음`;
    }, pulse);

    // 2. 층수 순차 무빙 이동 루프
    const floorDistance = Math.abs(endFloor - startFloor);
    const durationPerFloor = (initialDuration / floorDistance) * 1000;

    coreState.moveEngine = setInterval(() => {
        if (coreState.currentFloor !== endFloor) {
            coreState.currentFloor += (endFloor > startFloor) ? 1 : -1;
            syncDisplay();
        } else {
            clearInterval(coreState.moveEngine);
        }
    }, durationPerFloor);
}

btnUp.addEventListener('click', () => triggerElevator('up'));
btnDown.addEventListener('click', () => triggerElevator('down'));

syncDisplay();
