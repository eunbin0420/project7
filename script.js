document.addEventListener('DOMContentLoaded', () => {
    // 층별 실측 데이터 베이스 매핑 테이블 (Key 매칭 엄격화)
    const CRITICAL_TIME_MAP = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

    let systemState = {
        currentFloor: 1,
        targetQueue: [], 
        isDriving: false,
        timerClock: null,
        floorClock: null
    };

    // DOM 캐싱 엔진
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

    // 왼쪽 컨트롤 보드 격자 클릭 핸들러 (다중 토글 버그 해결)
    floorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (systemState.isDriving) return; 
            
            const selectedFloor = parseInt(chip.getAttribute('data-floor'), 10);

            if (systemState.targetQueue.includes(selectedFloor)) {
                systemState.targetQueue = systemState.targetQueue.filter(f => f !== selectedFloor);
                chip.classList.remove('active-target');
            } else {
                systemState.targetQueue.push(selectedFloor);
                chip.classList.add('active-target');
            }
            
            calculateRealtimePreview();
        });
    });

    // 옵션 스위치 상태 동기화
    doorCloseCheckbox.addEventListener('change', () => {
        widgetDoorStatus.textContent = doorCloseCheckbox.checked ? "YES" : "NO";
        calculateRealtimePreview();
    });

    // 시작 지점 스위치 연동
    currentFloorSelect.addEventListener('change', () => {
        systemState.currentFloor = parseInt(currentFloorSelect.value, 10);
        screenFloor.textContent = String(systemState.currentFloor).padStart(2, '0');
        calculateRealtimePreview();
    });

    // 초단위 정밀 타임 프리뷰 계산 시스템
    function calculateRealtimePreview() {
        if (systemState.targetQueue.length === 0) {
            widgetNextFloor.textContent = "없음";
            screenNextMsg.textContent = "정차 예정층: 없음";
            widgetTime.textContent = "00.00초";
            screenTimerMsg.textContent = "00.00초 뒤 도착";
            return;
        }

        const sortedFloors = [...systemState.targetQueue].sort((a, b) => a - b);
        const textFormatted = sortedFloors.map(f => `${f}F`).join(', ');
        widgetNextFloor.textContent = textFormatted;
        screenNextMsg.textContent = `정차 예정층: ${textFormatted}`;

        let virtualStart = parseInt(currentFloorSelect.value, 10);
        let cumulativeSeconds = 0;

        // 가까운 위치 순서대로 모션패스 정렬 최적화 순회
        const sortedPath = [...systemState.targetQueue].sort((a, b) => Math.abs(a - virtualStart) - Math.abs(b - virtualStart));

        sortedPath.forEach(destination => {
            cumulativeSeconds += Math.abs(CRITICAL_TIME_MAP[destination] - CRITICAL_TIME_MAP[virtualStart]);
            
            // 문닫힘 체크 해제(NO) 선택 시 정차 1회당 8.60초의 수동개폐 딜레이 패널티 누적 가산
            if (!doorCloseCheckbox.checked) {
                cumulativeSeconds += 8.60; 
            }
            virtualStart = destination;
        });

        widgetTime.textContent = `${cumulativeSeconds.toFixed(2)}초`;
        screenTimerMsg.textContent = `${cumulativeSeconds.toFixed(2)}초 뒤 도착`;
    }

    // 클리어 보드 초기화
    ctaResetBtn.addEventListener('click', () => {
        if (systemState.isDriving) return;
        systemState.targetQueue = [];
        floorChips.forEach(c => c.classList.remove('active-target'));
        screenArrow.textContent = "─";
        hwBtnUp.classList.remove('glowing');
        hwBtnDown.classList.remove('glowing');
        calculateRealtimePreview();
    });

    // 런타임 가동 스위치
    ctaStartBtn.addEventListener('click', () => {
        if (systemState.isDriving) return;
        
        systemState.currentFloor = parseInt(currentFloorSelect.value, 10);
        if (systemState.targetQueue.length === 0) {
            alert("이동할 정차 예정층을 마우스로 선택한 후에 버튼을 눌러주세요!");
            return;
        }

        systemState.isDriving = true;
        toggleControlsLock(true);

        systemState.targetQueue.sort((a, b) => Math.abs(a - systemState.currentFloor) - Math.abs(b - systemState.currentFloor));
        startNextFlightSequence();
    });

    // 물리 주행 모터 구동 모듈
    function startNextFlightSequence() {
        if (systemState.targetQueue.length === 0) {
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

        const goingUp = targetFloor > originFloor;
        screenArrow.textContent = goingUp ? "↑" : "↓";
        if (goingUp) {
            hwBtnUp.classList.add('glowing');
            hwBtnDown.classList.remove('glowing');
        } else {
            hwBtnDown.classList.add('glowing');
            hwBtnUp.classList.remove('glowing');
        }

        let timeTicker = Math.abs(CRITICAL_TIME_MAP[targetFloor] - CRITICAL_TIME_MAP[originFloor]);
        const totalSegmentDuration = timeTicker;

        screenTimerMsg.textContent = `${timeTicker.toFixed(2)}초 뒤 도착`;
        widgetTime.textContent = `${timeTicker.toFixed(2)}초`;

        const tickRate = 40;
        systemState.timerClock = setInterval(() => {
            timeTicker -= (tickRate / 1000);

            if (timeTicker <= 0) {
                clearInterval(systemState.timerClock);
                clearInterval(systemState.floorClock);

                systemState.currentFloor = targetFloor;
                screenFloor.textContent = String(targetFloor).padStart(2, '0');
                currentFloorSelect.value = targetFloor;
                screenArrow.textContent = "─";
                
                screenTimerMsg.textContent = "0.00초 뒤 도착";
                widgetTime.textContent = "0.00초";

                const finishedChip = document.querySelector(`.floor-chip[data-floor="${targetFloor}"]`);
                if (finishedChip) finishedChip.classList.remove('active-target');

                systemState.targetQueue.shift();

                // 문닫힘 여부에 따른 정차 연출 딜레이 타임 스위칭 지연초 설정
                const stopDelayTime = doorCloseCheckbox.checked ? 1500 : 3500;
                setTimeout(() => {
                    startNextFlightSequence();
                }, stopDelayTime);
                return;
            }

            screenTimerMsg.textContent = `${timeTicker.toFixed(2)}초 뒤 도착`;
            widgetTime.textContent = `${timeTicker.toFixed(2)}초`;
        }, tickRate);

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

    // 초기 상태 셋 부팅
    screenFloor.textContent = String(systemState.currentFloor).padStart(2, '0');
    screenArrow.textContent = "─";
    widgetDoorStatus.textContent = doorCloseCheckbox.checked ? "YES" : "NO";
    calculateRealtimePreview();
});
