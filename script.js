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

const STOP_DELAY = 5.00; // 중간 정차층 문 열림 대기 시간 (5초)

let deviceState = {
    elevatorFloor: 1,       // 화면에 표시될 실시간 현재 층수
    currentFloorTime: 0.00, // 데이터셋 기준 엘리베이터의 실시간 가상 시간 위치
    isOperating: false,
    timerInterval: null
};

// DOM 요소 바인딩
const uiArrow = document.getElementById('display-arrow');
const uiNumber = document.getElementById('display-number');
const uiTimer = document.getElementById('display-timer');
const uiStops = document.getElementById('display-stops');
const upButton = document.getElementById('btn-up');
const downButton = document.getElementById('btn-down');
const floorPicker = document.getElementById('floor-picker');

function refreshPanelLayout() {
    uiNumber.textContent = String(deviceState.elevatorFloor).padStart(2, '0');
}

// 실시간 남은 예정 정차층 목록 디스플레이 갱신
function updateStopsDisplay(stopsQueue) {
    if (!stopsQueue || stopsQueue.length === 0) {
        uiStops.textContent = "예정 정차층: 없음";
        return;
    }
    uiStops.textContent = `예정 정차층: ${stopsQueue.map(f => f + 'F').join(' → ')}`;
}

// 실시간 주행 데이터를 기반으로 '최종 목적지까지 남은 정밀 총 시간'을 역산하는 물리 동기화 함수
function calculateRemainingTime(currentVirtualTime, currentFloor, targetQueue, isStopping, currentStopRemain) {
    if (targetQueue.length === 0) return 0;
    
    // 모드 A: 문이 열려 정차 중인 상태일 때의 잔여 시간 계산
    if (isStopping) {
        let time = currentStopRemain;
        let tempFloor = currentFloor;
        for (let i = 0; i < targetQueue.length; i++) {
            time += Math.abs(ACCURATE_SPEED_DATA[targetQueue[i]] - ACCURATE_SPEED_DATA[tempFloor]);
            if (i < targetQueue.length - 1) time += STOP_DELAY;
            tempFloor = targetQueue[i];
        }
        return time;
    }

    // 모드 B: 실제 이동 중일 때의 잔여 시간 계산
    let time = 0;
    let nextFloor = targetQueue[0];
    
    // 현재 가상 위치 초(Time)에서 다음 정차 목표 층수 초까지의 차이 가산
    time += Math.abs(ACCURATE_SPEED_DATA[nextFloor] - currentVirtualTime);
    
    // 대기열에 남아있는 링크 층간 주행 초 및 5초 정차 시간 누적 가산
    let tempFloor = nextFloor;
    for (let i = 1; i < targetQueue.length; i++) {
        time += STOP_DELAY;
        time += Math.abs(ACCURATE_SPEED_DATA[targetQueue[i]] - ACCURATE_SPEED_DATA[tempFloor]);
        tempFloor = targetQueue[i];
    }
    return time;
}

// 메인 주행 가동 제어 시스템
function processCallSignal(dirType) {
    if (deviceState.isOperating) return;

    const startFloor = parseInt(floorPicker.value);
    
    // 체크박스 제어판에서 예약 선택된 정차층 어레이 수집
    const checkedBoxes = document.querySelectorAll('#stop-floors-picker input[type="checkbox"]:checked');
    let selectedStops = Array.from(checkedBoxes).map(box => parseInt(box.value));

    // 누른 버튼 방향에 맞춰 타겟 층 순차 정렬 알고리즘 수행
    if (dirType === 'up') {
        selectedStops = selectedStops.filter(f => f >= startFloor).sort((a, b) => a - b);
    } else {
        selectedStops = selectedStops.filter(f => f <= startFloor).sort((a, b) => b - a);
    }

    // 호출한 최종 목적지(CURRENT FLOOR)가 예약 큐 목록에 없으면 맨 뒤에 포함
    if (!selectedStops.includes(startFloor)) {
        selectedStops.push(startFloor);
    }

    // 출발지와 목적지가 완벽히 일치하여 가동이 필요 없는 예외 차단
    if (deviceState.elevatorFloor === selectedStops[0] && selectedStops.length === 1) {
        uiTimer.textContent = "이미 현재 층에\n대기중입니다.";
        setTimeout(() => uiTimer.textContent = "", 2000);
        return;
    }

    deviceState.isOperating = true;
    const clickedButton = dirType === 'up' ? upButton : downButton;
    clickedButton.classList.add('active');

    // 동기화 추적을 위한 가상 주행 타임라인 축 초기화
    deviceState.currentFloorTime = ACCURATE_SPEED_DATA[deviceState.elevatorFloor];
    
    let isStoppingMode = false;
    let stopTimeCounter = 0;

    // 20ms(0.02초) 주기 초정밀 물리 동기화 프레임 루프 가동
    const tickMs = 20; 
    const tickSec = tickMs / 1000;

    deviceState.timerInterval = setInterval(() => {
        // [모든 스케줄 정차 운행 최종 종료 시점]
        if (selectedStops.length === 0) {
            clearInterval(deviceState.timerInterval);
            uiArrow.textContent = "─";
            uiTimer.textContent = "0.00초 뒤\n도착 완료";
            updateStopsDisplay([]);
            
            setTimeout(() => {
                uiTimer.textContent = "";
                clickedButton.classList.remove('active');
                deviceState.isOperating = false;
            }, 2000);
            return;
        }

        let targetFloor = selectedStops[0];

        if (isStoppingMode) {
            // [상태 A: 문 열림 정차 모드] -> 5초 동안 카운트다운하며 제자리 대기
            stopTimeCounter -= tickSec;
            uiArrow.textContent = "─";
            
            let remainTimeText = calculateRemainingTime(deviceState.currentFloorTime, deviceState.elevatorFloor, selectedStops, true, stopTimeCounter);
            uiTimer.textContent = `${remainTimeText.toFixed(2)}초 뒤\n최종 도착`;
            
            if (stopTimeCounter <= 0) {
                isStoppingMode = false;
                selectedStops.shift(); // 정차가 끝난 층은 큐 목록에서 영구 제거
                updateStopsDisplay(selectedStops);
            }
        } else {
            // [상태 B: 데이터셋 기반 실시간 물리 축 주행 모드]
            const targetTime = ACCURATE_SPEED_DATA[targetFloor];
            const direction = targetTime > deviceState.currentFloorTime ? 1 : -1;
            
            // 실시간 상/하행 화살표 기호 갱신
            uiArrow.textContent = direction > 0 ? '↑' : '↓';

            // 정밀 주행 타임라인 강제 전진
            deviceState.currentFloorTime += direction * tickSec;

            // 데이터셋 정밀 매핑 구역 기반 실시간 통과 층수 역추적 엔진
            let estimatedFloor = deviceState.elevatorFloor;
            if (direction > 0) {
                for (let f = 1; f <= 8; f++) {
                    if (deviceState.currentFloorTime >= ACCURATE_SPEED_DATA[f]) estimatedFloor = f;
                }
            } else {
                for (let f = 8; f >= 1; f--) {
                    if (deviceState.currentFloorTime <= ACCURATE_SPEED_DATA[f]) estimatedFloor = f;
                }
            }

            // 실시간 층 경계선 통과 시 디스플레이 즉각 변경
            if (estimatedFloor !== deviceState.elevatorFloor) {
                deviceState.elevatorFloor = estimatedFloor;
                refreshPanelLayout();
            }

            // 중간 예약 타겟층 시점 타임라인에 도달 및 일치했는지 판정 검출
            if ((direction > 0 && deviceState.currentFloorTime >= targetTime) || 
                (direction < 0 && deviceState.currentFloorTime <= targetTime)) {
                
                // 타임라인 물리 수치 및 층수 동기화 픽스
                deviceState.currentFloorTime = targetTime;
                deviceState.elevatorFloor = targetFloor;
                refreshPanelLayout();

                // 편의 기능: 예약 층 도달 시 해당 왼쪽 체크박스 자동 해제 처리
                const targetCheckbox = document.querySelector(`#stop-floors-picker input[value="${targetFloor}"]`);
                if (targetCheckbox) targetCheckbox.checked = false;

                // 정차 대기 모드 스위칭 활성화 (5초 셋업)
                isStoppingMode = true;
                stopTimeCounter = STOP_DELAY;
            }

            // 실시간 화면 타이머 초 끊김 없이 지속 노출 계산 처리
            let remainTimeText = calculateRemainingTime(deviceState.currentFloorTime, deviceState.elevatorFloor, selectedStops, false, 0);
            uiTimer.textContent = `${remainTimeText.toFixed(2)}초 뒤\n최종 도착`;
        }

    }, tickMs);
}

// 호출 물리 버튼 인터페이스 이벤트 바인딩
upButton.addEventListener('click', () => processCallSignal('up'));
downButton.addEventListener('click', () => processCallSignal('down'));

// 초기 시스템 부팅 레이아웃 초기화
refreshPanelLayout();
updateStopsDisplay([]);
