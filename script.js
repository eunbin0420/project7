// 제공해주신 오리지널 물리 이동시간 데이터 테이블 매핑
const TIME_DATA = {
    1: 0.00,
    2: 9.02,
    3: 12.01,
    4: 16.31,
    5: 19.88,
    6: 22.27,
    7: 25.84,
    8: 29.25
};

let coreState = {
    currentFloor: 1,      // 현재 엘리베이터의 실시간 위치 층수
    isMoving: false,
    timerEngine: null,
    moveEngine: null
};

// DOM 바인딩
const uiArrow = document.getElementById('display-arrow');
const uiNumber = document.getElementById('display-number');
const uiTimer = document.getElementById('display-timer');
const uiStopFloor = document.getElementById('display-stop-floor');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const floorPicker = document.getElementById('floor-picker');

function updateFloorDisplay(floor) {
    uiNumber.textContent = String(floor).padStart(2, '0');
}

function startElevatorSimulation(direction) {
    if (coreState.isMoving) return;

    // 호출 버튼을 누른 탑승객의 타겟 층수 (예상 정차층)
    const targetFloor = parseInt(floorPicker.value);
    const startFloor = coreState.currentFloor;

    if (startFloor === targetFloor) {
        uiTimer.textContent = "0.00초 뒤\n뒤 도착";
        uiStopFloor.textContent = "";
        return;
    }

    coreState.isMoving = true;

    // 활성화된 방향 화살표 및 버튼 불빛 온
    const activeButton = direction === 'up' ? btnUp : btnDown;
    activeButton.classList.add('active');
    uiArrow.textContent = targetFloor > startFloor ? '↑' : '↓';

    // 실제 매핑 테이블 간의 소요 시간 공식 계산 (실제 데이터 반영)
    const startSeconds = TIME_DATA[startFloor];
    const targetSeconds = TIME_DATA[targetFloor];
    let remainingTime = Math.abs(targetSeconds - startSeconds);
    const totalDuration = remainingTime;

    // 주행 시작 시: 도착예정 시간과 예정 정차층을 아래에 동시에 표시
    uiTimer.innerHTML = `${remainingTime.toFixed(2)}초 뒤<br>뒤 도착`;
    uiStopFloor.textContent = `${targetFloor}층 정차 예정`;

    // 1. 실제 시간 속도와 100% 동기화된 카운트다운 타이머 엔진 (50ms 마다 정밀 갱신)
    const intervalTime = 50;
    coreState.timerEngine = setInterval(() => {
        remainingTime -= (intervalTime / 1000);

        if (remainingTime <= 0) {
            clearInterval(coreState.timerEngine);
            clearInterval(coreState.moveEngine);

            // 해당 예정 층에 완전히 멈춘 상태 정의
            coreState.currentFloor = targetFloor;
            updateFloorDisplay(targetFloor);
            uiArrow.textContent = "─";
            
            // [조건 변경 반영] 도착 예정 시간은 완료 상태로 계속 유지
            uiTimer.innerHTML = "0.00초 뒤<br>뒤 도착";
            
            // [조건 변경 반영] 예정층에 멈췄으므로 정차 예정층 텍스트만 깨끗하게 소멸
            uiStopFloor.textContent = ""; 

            // 2.5초 후 초기 대기 상태로 리셋 처리
            setTimeout(() => {
                activeButton.classList.remove('active');
                coreState.isMoving = false;
            }, 2500);
            return;
        }

        // 카운트다운 시간 상시 노출 유지
        uiTimer.innerHTML = `${remainingTime.toFixed(2)}초 뒤<br>뒤 도착`;
    }, intervalTime);

    // 2. 실제 시간에 맞춰 실시간으로 변하는 물리 층수 변경 엔진
    const totalFloorDistance = Math.abs(targetFloor - startFloor);
    const timePerFloor = (totalDuration / totalFloorDistance) * 1000; // 한 층을 지나갈 때 걸리는 정확한 밀리초 계산

    coreState.moveEngine = setInterval(() => {
        if (coreState.currentFloor !== targetFloor) {
            coreState.currentFloor += (targetFloor > startFloor) ? 1 : -1;
            updateFloorDisplay(coreState.currentFloor);
        } else {
            clearInterval(coreState.moveEngine);
        }
    }, timePerFloor);
}

// 이벤트 리스너 연결
btnUp.addEventListener('click', () => startElevatorSimulation('up'));
btnDown.addEventListener('click', () => startElevatorSimulation('down'));

// 초기 1층 기본 세팅 초기화
updateFloorDisplay(coreState.currentFloor);
