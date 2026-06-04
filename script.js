// 제공받은 실제 엘리베이터 구동 정밀 물리 데이터 타임 테이블 반영
const TIME_TABLE = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

let state = {
    currentFloor: 1,
    queueTargets: [], // 다중 누적 선택된 정차 목적지 배열
    isMoving: false,
    timerClock: null,
    moveClock: null
};

// UI 컴포넌트 셀렉터 바인딩
const elArrow = document.getElementById('arrow-display');
const elFloor = document.getElementById('floor-display');
const elCountdown = document.getElementById('countdown-display');

const currentFloorSelect = document.getElementById('current-floor-select');
const myFloorSelect = document.getElementById('my-floor-select');
const gridFloorBtns = document.querySelectorAll('.grid-floor-btn');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

const hwUpBtn = document.getElementById('hw-up-btn');
const hwDownBtn = document.getElementById('hw-down-btn');

// 1. 다중 정차층 토글 선택 로직
gridFloorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (state.isMoving) return; // 운행 도중에는 조작 잠금
        const targetNum = parseInt(btn.getAttribute('data-floor'));
        
        if (state.queueTargets.includes(targetNum)) {
            state.queueTargets = state.queueTargets.filter(f => f !== targetNum);
            btn.classList.remove('selected');
        } else {
            state.queueTargets.push(targetNum);
            btn.classList.add('selected');
        }
    });
});

// 제어반 초기화
resetBtn.addEventListener('click', () => {
    if (state.isMoving) return;
    state.queueTargets = [];
    gridFloorBtns.forEach(btn => btn.classList.remove('selected'));
    elCountdown.textContent = "";
    elArrow.textContent = "─";
});

// 호출(운행) 버튼 트리거 시작점
startBtn.addEventListener('click', () => {
    if (state.isMoving) return;

    // 현재 설정창의 층수를 시뮬레이터 최초 위치로 강제 동기화
    state.currentFloor = parseInt(currentFloorSelect.value);
    renderFloorDisplay(state.currentFloor);

    if (state.queueTargets.length === 0) {
        alert("이동할 정차 예정층을 우측 제어반에서 선택해 주세요!");
        return;
    }

    state.isMoving = true;
    toggleInputControls(true);

    // 최적화 정렬 (현재 층에서 가장 가까운 예정층 순으로 순차 순회 주행 처리)
    state.queueTargets.sort((a, b) => Math.abs(a - state.currentFloor) - Math.abs(b - state.currentFloor));

    dispatchNextFloor();
});

// 순차 멀티 플로어 주행 서브루틴 연출 엔진
function dispatchNextFloor() {
    if (state.queueTargets.length === 0) {
        // 예약된 모든 멀티 정차지를 완수했을 경우 리셋 후 대기
        state.isMoving = false;
        toggleInputControls(false);
        elArrow.textContent = "─";
        hwUpBtn.classList.remove('activated');
        hwDownBtn.classList.remove('activated');
        return;
    }

    const targetFloor = state.queueTargets[0];
    const initialFloor = state.currentFloor;

    if (initialFloor === targetFloor) {
        // 이미 도달한 층이면 패스 후 즉시 다음 인덱스 탐색
        state.queueTargets.shift();
        const doneBtn = document.querySelector(`.grid-floor-btn[data-floor="${targetFloor}"]`);
        if (doneBtn) doneBtn.classList.remove('selected');
        dispatchNextFloor();
        return;
    }

    // 방향 확인 및 실제 하드웨어 물리 버튼 점등 처리
    const goingUp = targetFloor > initialFloor;
    elArrow.textContent = goingUp ? '↑' : '↓';
    if (goingUp) {
        hwUpBtn.classList.add('activated');
        hwDownBtn.classList.remove('activated');
    } else {
        hwDownBtn.classList.add('activated');
        hwUpBtn.classList.remove('activated');
    }

    // 타임 테이블 기반 실측 이동 시간 편차 연산
    const startTimeData = TIME_TABLE[initialFloor];
    const targetTimeData = TIME_TABLE[targetFloor];
    let timeRemaining = Math.abs(targetTimeData - startTimeData);
    const roundTotalDuration = timeRemaining;

    // [버튼 바로 위 디스플레이 연출] 호출되는 순간 타이머 정보 즉시 렌더링 활성화
    elCountdown.innerHTML = `${timeRemaining.toFixed(2)}초 뒤\n도착`;

    // 1. 소수점 2자리 리얼타임 연동 초 카운트다운 타이머 기동 (50ms 해상도 조율)
    const tickRate = 50;
    state.timerClock = setInterval(() => {
        timeRemaining -= (tickRate / 1000);

        if (timeRemaining <= 0) {
            clearInterval(state.timerClock);
            clearInterval(state.moveClock);

            // 해당 정차층 최종 도달 스위칭
            state.currentFloor = targetFloor;
            renderFloorDisplay(targetFloor);
            elArrow.textContent = "─";
            
            // [요청 조건 반영] 도착 시 0.00초 상태를 디스플레이에 계속 유지
            elCountdown.innerHTML = "0.00초 뒤\n도착";

            // 해당 도달 완료한 제어반 버튼 주황 불빛 꺼주기
            const currentDoneGridBtn = document.querySelector(`.grid-floor-btn[data-floor="${targetFloor}"]`);
            if (currentDoneGridBtn) currentDoneGridBtn.classList.remove('selected');

            // 큐 스택 배열 맨 앞 원소 제거
            state.queueTargets.shift();

            // 정차 후 문 열림/승객 승하차 시간 버퍼(약 3.5초 연출) 후 다음 타겟으로 자동 주행 및 타이머 클리어
            setTimeout(() => {
                elCountdown.textContent = ""; // 출발 직전 잠시 텍스트 클리어
                dispatchNextFloor();
            }, 3500);
            return;
        }

        // 주행 도중 실시간 카운트다운 숫자 계속 갱신 표기
        elCountdown.innerHTML = `${timeRemaining.toFixed(2)}초 뒤\n도착`;
    }, tickRate);

    // 2. 물리 층수 눈금 갱신 타이머 엔진
    const deltaDistance = Math.abs(targetFloor - initialFloor);
    const timeScalePerFloor = (roundTotalDuration / deltaDistance) * 1000;

    state.moveClock = setInterval(() => {
        if (state.currentFloor !== targetFloor) {
            state.currentFloor += goingUp ? 1 : -1;
            renderFloorDisplay(state.currentFloor);
        } else {
            clearInterval(state.moveClock);
        }
    }, timeScalePerFloor);
}

function renderFloorDisplay(floor) {
    elFloor.textContent = String(floor).padStart(2, '0');
    currentFloorSelect.value = floor; // 제어용 셀렉트 박스도 바인딩 동동 동기화
}

function toggleInputControls(disable) {
    currentFloorSelect.disabled = disable;
    myFloorSelect.disabled = disable;
    startBtn.disabled = disable;
    startBtn.style.opacity = disable ? "0.5" : "1";
}

// 최초 기본 상태 빌드 업
renderFloorDisplay(state.currentFloor);
elArrow.textContent = "─";
