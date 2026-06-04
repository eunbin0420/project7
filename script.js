// 제공받은 실제 층간 물리 운행 시간 정밀 스케줄 데이터 테이블
const CRITICAL_TIME_MAP = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

let systemState = {
    currentFloor: 1,
    targetQueue: [], // 다중 선택되어 방문해야 할 층 배열
    isDriving: false,
    timerClock: null,
    floorClock: null
};

// UI 컴포넌트 DOM 로드
const screenArrow = document.getElementById('screen-arrow');
const screenFloor = document.getElementById('screen-floor');
const screenTimerMsg = document.getElementById('screen-timer-msg');
const screenNextMsg = document.getElementById('screen-next-msg');

const widgetTime = document.getElementById('widget-time');
const widgetNextFloor = document.getElementById('widget-next-floor');
const widgetDoorStatus = document.getElementById('widget-door-status');

const currentFloorSelect = document.getElementById('current-floor-select');
const myFloorSelect = document.getElementById('my-floor-select');
const doorCloseCheckbox = document.getElementById('door-close-checkbox');
const floorChips = document.querySelectorAll('.floor-chip');

const ctaStartBtn = document.getElementById('cta-start-btn');
const ctaResetBtn = document.getElementById('cta-reset-btn');
const hwBtnUp = document.getElementById('hw-btn-up');
const hwBtnDown = document.getElementById('hw-btn-down');

// [피드백 반영] 클릭 안되던 버그 완벽 수정 및 토글 액션 이벤트 바인딩
floorChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (systemState.isDriving) return; // 주행 중에는 조작 잠금
        
        const selectedFloor = parseInt(chip.getAttribute('data-floor'));

        if (systemState.targetQueue.includes(selectedFloor)) {
            // 이미 선택된 상태면 배열에서 빼고 클래스 제거
            systemState.targetQueue = systemState.targetQueue.filter(f => f !== selectedFloor);
            chip.classList.remove('active-target');
        } else {
            // 미선택 상태면 배열에 넣고 주황색 클래스 추가
            systemState.targetQueue.push(selectedFloor);
            chip.classList.add('active-target');
        }
        
        // 클릭할 때마다 하단 프리뷰 정보 즉시 리프레시 동기화
        calculateRealtimePreview();
    });
});

// 문닫힘 버튼 체크박스 토글 시 대시보드 위젯 값 실시간 갱신
doorCloseCheckbox.addEventListener('change', () => {
    widgetDoorStatus.textContent = doorCloseCheckbox.checked ? "YES" : "NO";
    calculateRealtimePreview();
});

// 현재 층 드롭다운 스위칭 시 초기값 변경 세팅
currentFloorSelect.addEventListener('change', () => {
    systemState.currentFloor = parseInt(currentFloorSelect.value);
    screenFloor.textContent = String(systemState.currentFloor).padStart(2, '0');
    calculateRealtimePreview();
});

// 실시간 도착 프리뷰 연산 로직 (문닫힘 연동 반영)
function calculateRealtimePreview() {
    if (systemState.targetQueue.length === 0) {
        widgetNextFloor.textContent = "없음";
        screenNextMsg.textContent = "정차 예정층: 없음";
        widgetTime.textContent = "00.00초";
        screenTimerMsg.textContent = "00.00초 뒤 도착";
        return;
    }

    // 오름차순 정렬 가시화 시각 정보 트랙 생성
    const sortedFloors = [...systemState.targetQueue].sort((a, b) => a - b);
    const textFormatted = sortedFloors.map(f => `${f}F`).join(', ');
    widgetNextFloor.textContent = textFormatted;
    screenNextMsg.textContent = `정차 예정층: ${textFormatted}`;

    // 가상 경로 타임 시뮬레이션 산출
    let virtualStart = parseInt(currentFloorSelect.value);
    let cumulativeSeconds = 0;

    // 운행 시 실제 방문 우선순위 알고리즘 적용 정렬 (근접 층 우선 순회)
    const sortedPath = [...systemState.targetQueue].sort((a, b) => Math.abs(a - virtualStart) - Math.abs(b - virtualStart));

    sortedPath.forEach(destination => {
        cumulativeSeconds += Math.abs(CRITICAL_TIME_MAP[destination] - CRITICAL_TIME_MAP[virtualStart]);
        
        // [문닫힘 여부 연동 조건] 체크 해제(NO)되어 있으면 정차할 때마다 기본 문 열림 지연시간(8.60초) 가산 버퍼 부여
        if (!doorCloseCheckbox.checked) {
            cumulativeSeconds += 8.60; 
        }
        virtualStart = destination;
    });

    widgetTime.textContent = `${cumulativeSeconds.toFixed(2)}초`;
    screenTimerMsg.textContent = `${cumulativeSeconds.toFixed(2)}초 뒤 도착`;
}

// 초기화 액션 트리거
ctaResetBtn.addEventListener('click', () => {
    if (systemState.isDriving) return;
    systemState.targetQueue = [];
    floorChips.forEach(c => c.classList.remove('active-target'));
    screenArrow.textContent = "─";
    hwBtnUp.classList.remove('glowing');
    hwBtnDown.classList.remove('glowing');
    calculateRealtimePreview();
});

// 구동 시작 버튼
ctaStartBtn.addEventListener('click', () => {
    if (systemState.isDriving) return;
    
    systemState.currentFloor = parseInt(currentFloorSelect.value);
    if (systemState.targetQueue.length === 0) {
        alert("이동할 정차 예정층을 먼저 마우스로 클릭하여 선택해 주세요!");
        return;
    }

    systemState.isDriving = true;
    toggleControlsLock(true);

    // 최적 경로 주행을 위한 자동 타겟 정렬 처리
    systemState.targetQueue.sort((a, b) => Math.abs(a - systemState.currentFloor) - Math.abs(b - systemState.currentFloor));

    startNextFlightSequence();
});

// 실제 엘리베이터 이동 루프 시퀀스
function startNextFlightSequence() {
    if (systemState.targetQueue.length === 0) {
        // 모든 멀티 스케줄 완수 종료
        systemState.isDriving = false;
        toggleControlsLock(false);
        screenArrow.textContent = "─";
        hwBtnUp.classList.remove('glowing');
        hwBtnDown.classList.remove('glowing');
        calculateRealtimePreview();
        return;
    }

    const targetFloor = systemState.targetQueue[0];
    const originFloor = systemState.currentFloor;

    if (originFloor === targetFloor) {
        systemState.targetQueue.shift();
        const doneChip = document.querySelector(`.floor-chip[data-floor="${targetFloor}"]`);
        if (doneChip) doneChip.classList.remove('active-target');
        startNextFlightSequence();
        return;
    }

    // 방향에 맞춰 실제 패널 화살표 부팅 및 기계 버튼 점등
    const goingUp = targetFloor > originFloor;
    screenArrow.textContent = goingUp ? "↑" : "↓";
    if (goingUp) {
        hwBtnUp.classList.add('glowing');
        hwBtnDown.classList.remove('glowing');
    } else {
        hwBtnDown.classList.add('glowing');
        hwBtnUp.classList.remove('glowing');
    }

    // 실측 데이터 기반 소요초 연산
    let timeTicker = Math.abs(CRITICAL_TIME_MAP[targetFloor] - CRITICAL_TIME_MAP[originFloor]);
    const totalSegmentDuration = timeTicker;

    screenTimerMsg.textContent = `${timeTicker.toFixed(2)}초 뒤 도착`;
    widgetTime.textContent = `${timeTicker.toFixed(2)}초`;

    // 1. 소수점 2자리 고정 리얼타임 엔진 클럭 (40ms 단위 정밀 구동)
    const tickRate = 40;
    systemState.timerClock = setInterval(() => {
        timeTicker -= (tickRate / 1000);

        if (timeTicker <= 0) {
            clearInterval(systemState.timerClock);
            clearInterval(systemState.floorClock);

            // 타겟 층 최종 도착 완료 단계
            systemState.currentFloor = targetFloor;
            screenFloor.textContent = String(targetFloor).padStart(2, '0');
            currentFloorSelect.value = targetFloor;
            screenArrow.textContent = "─";
            
            // 도착 시 요구사항 만족: 디스플레이 0.00초 유지 고정
            screenTimerMsg.textContent = "0.00초 뒤 도착";
            widgetTime.textContent = "0.00초";

            // 완수한 층 제어반의 주황색 스타일 오프
            const finishedChip = document.querySelector(`.floor-chip[data-floor="${targetFloor}"]`);
            if (finishedChip) finishedChip.classList.remove('active-target');

            systemState.targetQueue.shift();

            // 문열림/승하차 연출을 위한 대기 처리 (문닫힘 체크 여부에 맞춰 유동적 딜레이 연출 부여)
            const stopDelayTime = doorCloseCheckbox.checked ? 2000 : 4500;
            setTimeout(() => {
                startNextFlightSequence();
            }, stopDelayTime);
            return;
        }

        screenTimerMsg.textContent = `${timeTicker.toFixed(2)}초 뒤 도착`;
        widgetTime.textContent = `${timeTicker.toFixed(2)}초`;
    }, tickRate);

    // 2. 물리 층수 표시판 갱신 서브 클럭 엔진
    const stepDistance = Math.abs(targetFloor - originFloor);
    const msPerFloorProgress = (totalSegmentDuration / stepDistance) * 1000;

    systemState.floorClock = setInterval(() => {
        if (systemState.currentFloor !== targetFloor) {
            systemState.currentFloor += goingUp ? 1 : -1;
            screenFloor.textContent = String(systemState.currentFloor).padStart(2, '0');
            currentFloorSelect.value = systemState.currentFloor;
        } else {
            clearInterval(systemState.floorClock);
        }
    }, msPerFloorProgress);
}

function toggleControlsLock(lock) {
    currentFloorSelect.disabled = lock;
    myFloorSelect.disabled = lock;
    doorCloseCheckbox.disabled = lock;
    ctaStartBtn.disabled = lock;
    ctaStartBtn.style.opacity = lock ? "0.4" : "1";
}

// 시스템 부팅 최초 드라이브 실행
screenFloor.textContent = String(systemState.currentFloor).padStart(2, '0');
screenArrow.textContent = "─";
calculateRealtimePreview();
