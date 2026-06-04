// 실측 데이터 명세 구조
const TIME_DATA_NORMAL = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };
const TIME_DATA_CLOSED = { 1: 0.00, 2: 4.50, 3: 7.20,  4: 10.10, 5: 13.30, 6: 16.00, 7: 19.10, 8: 22.00 }; 

let coreState = {
    currentFloor: 1,
    isMoving: false,
    timerEngine: null,
    moveEngine: null
};

// DOM 요소 맵바인딩
const uiArrow = document.getElementById('display-arrow');
const uiNumber = document.getElementById('display-number');
const uiTimer = document.getElementById('display-timer');
const uiStopFloor = document.getElementById('display-stop-floor'); // 하드웨어 화면용 정차층 레이어
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
        uiTimer.textContent = "정차 완료";
        uiStopFloor.textContent = ""; // 멈춘 상태이므로 화면에 미표시
        return;
    }

    coreState.isMoving = true;
    
    // 주행 시작 시 대시보드와 LED 패널에 예정 정차층 동시에 등장
    statTargetFloor.textContent = `${projectedStop}층`;
    uiStopFloor.textContent = `${projectedStop}F`; // 이미지처럼 깔끔하게 '5F' 형태로 출력
    uiStopFloor.style.opacity = "1"; // 선명하게 활성화
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

    // 1. 소수점 실시간 카운트다운 타이머 엔진 루프
    const pulse = 50;
    coreState.timerEngine = setInterval(() => {
        timeDebt -= (pulse / 1000);

        if (timeDebt <= 0) {
            clearInterval(coreState.timerEngine);
            clearInterval(coreState.moveEngine);

            // 최종 목적 정사층 안착
            coreState.currentFloor = endFloor;
            syncDisplay();
            
            uiArrow.textContent = "─";
            uiTimer.textContent = "도착 완료";
            
            // [핵심 요구사항] 예정 층에 멈추면 해당 예정 정차층 글씨가 완전히 소멸되어 사라짐
            uiStopFloor.textContent = ""; 
            uiStopFloor.style.opacity = "0"; 
            
            statRemainingTime.textContent = "0.00초";
            statMessage.textContent = "정차 완료 (문 열림)";

            setTimeout(() => {
                uiTimer.textContent = "";
                statTargetFloor.textContent = "-";
                statMessage.textContent = "대기 중";
                targetHardwareBtn.classList.remove('active');
                coreState.isMoving = false;
            }, 2500);
            return;
        }

        // 실시간 정보 업데이트 데이터 사출
        statRemainingTime.textContent = `${timeDebt.toFixed(2)}초`;
        uiTimer.textContent = `${timeDebt.toFixed(2)}초 후 도착`;
    }, pulse);

    // 2. 실시간 물리 층수 표시 전환 루프
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

// 초기 화면 렌더링 세팅
syncDisplay();
