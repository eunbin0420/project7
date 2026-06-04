// 제공해주신 1층 기준 각 층 누적 도달시간 정밀 데이터셋 매핑
const ACCURATE_SPEED_DATA = {
    1: 0.00,
    2: 9.02,
    3: 12.01,
    4: 16.31,
    5: 19.88,
    6: 22.27,
    7: 25.84,
    8: 29.25
};

const STOP_DELAY = 5.00; // 중간 정차층에서 문 열고 대기하는 시간 (초)

let deviceState = {
    elevatorFloor: 1,      // 초기 엘리베이터 정차 위치
    isOperating: false,
    timerInterval: null,
    currentTimeout: null
};

// DOM 하드웨어 요소 구조 바인딩
const uiArrow = document.getElementById('display-arrow');
const uiNumber = document.getElementById('display-number');
const uiTimer = document.getElementById('display-timer');
const uiStops = document.getElementById('display-stops'); // 예정 정차층 출력부
const upButton = document.getElementById('btn-up');
const downButton = document.getElementById('btn-down');
const floorPicker = document.getElementById('floor-picker');

function refreshPanelLayout() {
    uiNumber.textContent = String(deviceState.elevatorFloor).padStart(2, '0');
}

// 실시간 남은 총 예정 정차층 목록 갱신 텍스트 빌더
function updateStopsDisplay(stopsQueue) {
    if (!stopsQueue || stopsQueue.length === 0) {
        uiStops.textContent = "예정 정차층: 없음";
        return;
    }
    uiStops.textContent = `예정 정차층: ${stopsQueue.map(f => f + 'F').join(' → ')}`;
}

// 비동기식 대기 Helper 함수 (중간 정차 연출용)
const delay = (ms) => new Promise(resolve => {
    deviceState.currentTimeout = setTimeout(resolve, ms);
});

// 엘리베이터 순차 가동 메인 코어 엔진 (Async/Await 체이닝)
async function processCallSignal(dirType) {
    if (deviceState.isOperating) return;

    const startFloor = parseInt(floorPicker.value);
    
    // 체크박스에서 체크된 정차층 리스트 수집
    const checkedBoxes = document.querySelectorAll('#stop-floors-picker input[type="checkbox"]:checked');
    let selectedStops = Array.from(checkedBoxes).map(box => parseInt(box.value));

    // 버튼 방향에 따른 정차 순서 정렬
    if (dirType === 'up') {
        // 상행: 낮은 층 -> 높은 층 (단, 출발층보다 같거나 높은 층만 유효)
        selectedStops = selectedStops.filter(f => f >= startFloor).sort((a, b) => a - b);
    } else {
        // 하행: 높은 층 -> 낮은 층 (단, 출발층보다 같거나 낮은 층만 유효)
        selectedStops = selectedStops.filter(f => f <= startFloor).sort((a, b) => b - a);
    }

    // 만약 출발층 자체가 선택되지 않았다면 최종 목적지로서 큐 맨 뒤에 강제 추가
    if (!selectedStops.includes(startFloor)) {
        selectedStops.push(startFloor);
    }

    // 예외 검출: 현재 위치와 가야 할 첫 타겟이 똑같고 대기열이 더 없을 때
    if (deviceState.elevatorFloor === selectedStops[0] && selectedStops.length === 1) {
        uiTimer.textContent = "이미 현재 층에\n대기중입니다.";
        setTimeout(() => uiTimer.textContent = "", 2000);
        return;
    }

    deviceState.isOperating = true;
    const clickedButton = dirType === 'up' ? upButton : downButton;
    clickedButton.classList.add('active');

    // --- 전체 총 잔여 시간 연산 로직 (중간 정차 시간 포함) ---
    let totalRemainSeconds = 0;
    let tempFloor = deviceState.elevatorFloor;

    for (let i = 0; i < selectedStops.length; i++) {
        const next = selectedStops[i];
        totalRemainSeconds += Math.abs(ACCURATE_SPEED_DATA[next] - ACCURATE_SPEED_DATA[tempFloor]);
        if (i < selectedStops.length - 1) {
            totalRemainSeconds += STOP_DELAY; // 중간 정차 시간 가산
        }
        tempFloor = next;
    }

    // 실시간 카운트다운 타이머 인터벌 작동 (50ms 단위)
    const clockTick = 50;
    deviceState.timerInterval = setInterval(() => {
        totalRemainSeconds -= (clockTick / 1000);
        if (totalRemainSeconds <= 0) totalRemainSeconds = 0;
        uiTimer.textContent = `${totalRemainSeconds.toFixed(2)}초 뒤\n최종 도착`;
    }, clockTick);

    // --- 순차 주행 시뮬레이터 실행 ---
    while (selectedStops.length > 0) {
        updateStopsDisplay(selectedStops);
        
        const nextTargetFloor = selectedStops[0];
        const arrowSymbol = nextTargetFloor > deviceState.elevatorFloor ? '↑' : (nextTargetFloor < deviceState.elevatorFloor ? '↓' : '─');
        uiArrow.textContent = arrowSymbol;

        // 1개 층씩 순차적으로 밟아가며 이동 연출
        while (deviceState.elevatorFloor !== nextTargetFloor) {
            const currentFloorSec = ACCURATE_SPEED_DATA[deviceState.elevatorFloor];
            const nextStepFloor = deviceState.elevatorFloor + (nextTargetFloor > deviceState.elevatorFloor ? 1 : -1);
            const nextFloorSec = ACCURATE_SPEED_DATA[nextStepFloor];
            const stepDuration = Math.abs(nextFloorSec - currentFloorSec) * 1000;

            await delay(stepDuration); // 층간 물리 이동 시간만큼 정지 대기

            deviceState.elevatorFloor = nextStepFloor;
            refreshPanelLayout();
        }

        // 목적지 한 곳에 도착 완료 처리
        selectedStops.shift(); // 완료된 정차층 제거
        updateStopsDisplay(selectedStops);

        if (selectedStops.length > 0) {
            // 중간 정차층일 경우: 화살표를 멈춤으로 바꾸고 5초간 대기문 오픈 연출
            uiArrow.textContent = "─";
            const prevTimerText = uiTimer.textContent;
            
            // 잠시 타이머 정지 후 문열림 메시지 교차 노출
            uiTimer.textContent = `[정차 중]\n승객 탑승중...`;
            await delay(STOP_DELAY * 1000);
        }
    }

    // --- 모든 스케줄 최종 목적지 안전 도달 완료 시점 ---
    clearInterval(deviceState.timerInterval);
    uiArrow.textContent = "─";
    uiTimer.textContent = "0.00초 뒤\n도착 완료";
    updateStopsDisplay([]);

    // 시스템 락 해제 및 클리닝 리셋
    setTimeout(() => {
        uiTimer.textContent = "";
        clickedButton.classList.remove('active');
        deviceState.isOperating = false;
        
        // 편의를 위해 체크박스 전체 초기화 해제
        document.querySelectorAll('#stop-floors-picker input[type="checkbox"]').forEach(box => box.checked = false);
    }, 2500);
}

// 클릭 신호 인터페이스 바인딩
upButton.addEventListener('click', () => processCallSignal('up'));
downButton.addEventListener('click', () => processCallSignal('down'));

// 시스템 초기 디스플레이 부팅 가동
refreshPanelLayout();
updateStopsDisplay([]);
