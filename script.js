// 제공받은 정밀 물리 층간 스케줄 속도 데이터 테이블 바인딩
const TIME_TABLE_DATA = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

let appState = {
    currentFloor: 1,
    selectedQueue: [], // 다중 선택 목적지 스택 배열
    isProcessing: false,
    timerEngine: null,
    floorStepEngine: null
};

// UI 컴포넌트 셀렉터 캐싱
const screenArrow = document.getElementById('screen-arrow');
const screenFloor = document.getElementById('screen-floor');
const screenTimerMsg = document.getElementById('screen-timer-msg');
const screenNextMsg = document.getElementById('screen-next-msg');

const widgetTime = document.getElementById('widget-time');
const widgetNextFloor = document.getElementById('widget-next-floor');

const currentFloorSelect = document.getElementById('current-floor-select');
const myFloorSelect = document.getElementById('my-floor-select');
const doorCloseCheck = document.getElementById('door-close-chechbox');
const floorChips = document.querySelectorAll('.floor-chip');

const ctaStartBtn = document.getElementById('cta-start-btn');
const ctaResetBtn = document.getElementById('cta-reset-btn');
const hwBtnUp = document.getElementById('hw-btn-up');
const hwBtnDown = document.getElementById('hw-btn-down');


// 1. 다중 정차층 토글 클릭 핸들러
floorChips.forEach(chip => {
    chip.addEventListener('click', () => {
        if (appState.isProcessing) return; // 주행 중 잠금
        const floorNum = parseInt(chip.getAttribute('data-floor'));

        if (appState.selectedQueue.includes(floorNum)) {
            appState.selectedQueue = appState.selectedQueue.filter(f => f !== floorNum);
            chip.classList.remove('active-target');
        } else {
            appState.selectedQueue.push(floorNum);
            chip.classList.add('active-target');
        }
        updateWidgetsPreview();
    });
});

// 2. 프리미엄 카드 대시보드 위젯 실시간 동기화
function updateWidgetsPreview() {
    if (appState.selectedQueue.length === 0) {
        widgetNextFloor.textContent = "없음";
        screenNextMsg.textContent = "정차 예정층: 없음";
        widgetTime.textContent = "00.00초";
        screenTimerMsg.textContent = "00.00초 뒤 도착";
        return;
    }
    
    // 예약층 가시화 정렬 정돈해서 표기
    const displaySorted = [...appState.selectedQueue].sort((a,b) => a - b);
    const resultText = displaySorted.map(f => `${f}층`).join(', ');
    widgetNextFloor.textContent = resultText;
    screenNextMsg.textContent = `정차 예정층: ${resultText}`;

    // 누적 총 예상 시간 연산 프리뷰 반영
    const baseStart = parseInt(currentFloorSelect.value);
    let totalEstimated = 0;
    let tempCurrent = baseStart;

    // 현재 위치 기준 근접 정렬 스케줄 계산식 시뮬레이션
    const tempQueue = [...appState.selectedQueue].sort((a, b) => Math.abs(a - tempCurrent) - Math.abs(b - tempCurrent));
    
    tempQueue.forEach(target => {
        totalEstimated += Math.abs(TIME_TABLE_DATA[target] - TIME_TABLE_DATA[tempCurrent]);
        // 문닫힘 옵션 미체크시 정차당 패널티 지연 타임 누적 반영 가산
        if(!doorCloseCheck.checked) {
            totalEstimated += 8.62; // 닫힘 미작동 보정 상수 가산 버퍼
        }
        tempCurrent = target;
    });

    widgetTime.textContent = `${totalEstimated.toFixed(2)}초`;
    screenTimerMsg.textContent = `${totalEstimated.toFixed(2)}초 뒤 도착`;
}

// 셀렉트 및 옵션 체크 변경 시 즉시 프리뷰 리프레시 연동
currentFloorSelect.addEventListener('change', () => {
    appState.currentFloor = parseInt(currentFloorSelect.value);
    screenFloor.textContent = String(appState.currentFloor).padStart(2, '0');
    updateWidgetsPreview();
});
doorCloseCheck.addEventListener('change', updateWidgetsPreview);

// 3. 컨트롤러 초기화 셋업 리셋
ctaResetBtn.addEventListener('click', () => {
    if (appState.isProcessing) return;
    appState.selectedQueue = [];
    floorChips.forEach(c => c.classList.remove('active-target'));
    screenArrow.textContent = "─";
    hwBtnUp.classList.remove('glowing');
    hwBtnDown.classList.remove('glowing');
    updateWidgetsPreview();
});

// 4. 호출 트리거 작동 가동 시작
ctaStartBtn.addEventListener('click', () => {
    if (appState.isProcessing) return;
    
    appState.currentFloor = parseInt(currentFloorSelect.value);
    if (appState.selectedQueue.length === 0) {
        alert("이동 및 시뮬레이션할 정차 예정층을 선택해 주세요.");
        return;
    }

    appState.isProcessing = true;
    toggleInputs(true);

    // 현재 층 기준 가장 최적화된 최단 정차지 큐 정렬 스위칭
    appState.selectedQueue.sort((a, b) => Math.abs(a - appState.currentFloor) - Math.abs(b - appState.currentFloor));
    
    executeDriveEngine();
});

// 5. 핵심 코어 순차 주행 연출 메커니즘 엔진
function executeDriveEngine() {
    if (appState.selectedQueue.length === 0) {
        appState.isProcessing = false;
        toggleInputs(false);
        screenArrow.textContent = "─";
        hwBtnUp.classList.remove('glowing');
        hwBtnDown.classList.remove('glowing');
        updateWidgetsPreview();
        return;
    }

    const nextTarget = appState.selectedQueue[0];
    const startFloor = appState.currentFloor;

    if (startFloor === nextTarget) {
        appState.selectedQueue.shift();
        const activeChip = document.querySelector(`.floor-chip[data-floor="${nextTarget}"]`);
        if (activeChip) activeChip.classList.remove('active-target');
        executeDriveEngine();
        return;
    }

    // 상하 방향 판별 및 하드웨어 매트릭스 버튼 글레이징 조명 가동
    const isUp = nextTarget > startFloor;
    screenArrow.textContent = isUp ? "↑" : "↓";
    if (isUp) {
        hwBtnUp.classList.add('glowing');
        hwBtnDown.classList.remove('glowing');
    } else {
        hwBtnDown.classList.add('glowing');
        hwBtnUp.classList.remove('glowing');
    }

    // 타임 테이블 기준 실측 소요 초 편차 추출
    let segmentDuration = Math.abs(TIME_TABLE_DATA[nextTarget] - TIME_TABLE_DATA[startFloor]);
    const originalSegmentTime = segmentDuration;

    // 카운트다운 고해상도 타이머 발진 (40ms 해상도 서브 루프)
    const intervalRate = 40;
    appState.timerEngine = setInterval(() => {
        segmentDuration -= (intervalRate / 1000);

        if (segmentDuration <= 0) {
            clearInterval(appState.timerEngine);
            clearInterval(appState.floorStepEngine);

            // 목적지 도달 확정 세팅
            appState.currentFloor = nextTarget;
            screenFloor.textContent = String(nextTarget).padStart(2, '0');
            currentFloorSelect.value = nextTarget;
            screenArrow.textContent = "─";
            
            // 이미지 요구사항 구현: 도달한 시점에 0.00초 상태 고정 노출 유지
            screenTimerMsg.textContent = "0.00초 뒤 도착";
            widgetTime.textContent = "0.00초";

            // 칩 하이라이트 지우기
            const doneChip = document.querySelector(`.floor-chip[data-floor="${nextTarget}"]`);
            if (doneChip) doneChip.classList.remove('active-target');

            appState.selectedQueue.shift();

            // 정차 승하차 지연 딜레이 버퍼 연출 후 다음 예약지 서칭 스택 재귀 발진
            setTimeout(() => {
                executeDriveEngine();
            }, 2500);
            return;
        }

        screenTimerMsg.textContent = `${segmentDuration.toFixed(2)}초 뒤 도착`;
        widgetTime.textContent = `${segmentDuration.toFixed(2)}초`;
    }, intervalRate);

    // 층수 표시판 물리 가속 동기화 스텝 엔진
    const floorDistance = Math.abs(nextTarget - startFloor);
    const msPerFloor = (originalSegmentTime / floorDistance) * 1000;

    appState.floorStepEngine = setInterval(() => {
        if (appState.currentFloor !== nextTarget) {
            appState.currentFloor += isUp ? 1 : -1;
            screenFloor.textContent = String(appState.currentFloor).padStart(2, '0');
            currentFloorSelect.value = appState.currentFloor;
        } else {
            clearInterval(appState.floorStepEngine);
        }
    }, msPerFloor);
}

function toggleInputs(disabled) {
    currentFloorSelect.disabled = disabled;
    myFloorSelect.disabled = disabled;
    doorCloseCheck.disabled = disabled;
    ctaStartBtn.disabled = disabled;
    ctaStartBtn.style.opacity = disabled ? "0.4" : "1";
}

// 초기 로딩 빌드 셋업
screenFloor.textContent = String(appState.currentFloor).padStart(2, '0');
screenArrow.textContent = "─";
updateWidgetsPreview();
