document.addEventListener('DOMContentLoaded', () => {
    // 실제 측정된 초 단위 층별 타임라인 테이블
    const CRITICAL_TIME_MAP = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };
    
    // 왼쪽 샤프트 통로 높이(480px) 안에서 각 층별 픽셀 위치 매핑 (층당 60px)
    const FLOOR_POSITION_MAP = { 1: 0, 2: 60, 3: 120, 4: 180, 5: 240, 6: 300, 7: 360, 8: 420 };

    let elevatorState = {
        currentFloor: 1,
        selectedQueue: [], 
        isMoving: false,
        timerInterval: null
    };

    const elevatorCar = document.getElementById('elevator-car');
    const carDisplay = document.querySelector('.car-display');
    const panelArrow = document.getElementById('panel-arrow');
    const panelFloor = document.getElementById('panel-floor');
    
    const liveTimerMsg = document.getElementById('live-timer-msg');
    const liveStatusMsg = document.getElementById('live-status-msg');
    
    const insideButtons = document.querySelectorAll('.elevator-inside-btn');
    const btnDoorClose = document.getElementById('btn-door-close');
    const btnDoorOpen = document.getElementById('btn-door-open');
    const systemStartTrigger = document.getElementById('system-start-trigger');

    // 내부 버튼 클릭 시 작동 핸들러
    insideButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (elevatorState.isMoving) return; 

            const targetFloor = parseInt(button.getAttribute('data-floor'), 10);

            if (elevatorState.selectedQueue.includes(targetFloor)) {
                elevatorState.selectedQueue = elevatorState.selectedQueue.filter(f => f !== targetFloor);
                button.classList.remove('button-pressed');
            } else {
                elevatorState.selectedQueue.push(targetFloor);
                button.classList.add('button-pressed');
            }
        });
    });

    // 문열림 / 문닫힘 옵션 버튼 클릭 토글
    btnDoorClose.addEventListener('click', () => {
        if (elevatorState.isMoving) return;
        btnDoorClose.classList.add('active-util');
        btnDoorOpen.classList.remove('active-util');
    });
    btnDoorOpen.addEventListener('click', () => {
        if (elevatorState.isMoving) return;
        btnDoorOpen.classList.add('active-util');
        btnDoorClose.classList.remove('active-util');
    });

    // 가동 시작
    systemStartTrigger.addEventListener('click', () => {
        if (elevatorState.isMoving) return;
        if (elevatorState.selectedQueue.length === 0) {
            alert("패널에서 내리실 층수 버튼을 먼저 눌러주세요!");
            return;
        }

        elevatorState.isMoving = true;
        systemStartTrigger.disabled = true;

        // 가장 가까운 층부터 방문하도록 정렬
        elevatorState.selectedQueue.sort((a, b) => Math.abs(a - elevatorState.currentFloor) - Math.abs(b - elevatorState.currentFloor));
        executeNextFlight();
    });

    // 순차 주행 엔진
    function executeNextFlight() {
        if (elevatorState.selectedQueue.length === 0) {
            elevatorState.isMoving = false;
            systemStartTrigger.disabled = false;
            panelArrow.textContent = "─";
            liveStatusMsg.textContent = "대기중";
            return;
        }

        const nextTarget = elevatorState.selectedQueue[0];
        const startFloor = elevatorState.currentFloor;

        if (startFloor === nextTarget) {
            elevatorState.selectedQueue.shift();
            const btn = document.querySelector(`.elevator-inside-btn[data-floor="${nextTarget}"]`);
            if (btn) btn.classList.remove('button-pressed');
            executeNextFlight();
            return;
        }

        const isUp = nextTarget > startFloor;
        panelArrow.textContent = isUp ? "↑" : "↓";
        liveStatusMsg.textContent = isUp ? "상승중" : "하강중";

        // 소요 시간 계산
        let segmentDuration = Math.abs(CRITICAL_TIME_MAP[nextTarget] - CRITICAL_TIME_MAP[startFloor]);
        
        // 문닫힘 비활성화 시 8.6초 페널티 추가
        if (!btnDoorClose.classList.contains('active-util')) {
            segmentDuration += 8.60;
        }

        let remainingTime = segmentDuration;
        liveTimerMsg.textContent = `${remainingTime.toFixed(2)}초`;

        const fps = 30; 
        const tickMs = 1000 / fps;
        
        const startPos = FLOOR_POSITION_MAP[startFloor];
        const endPos = FLOOR_POSITION_MAP[nextTarget];
        const totalDistance = endPos - startPos;
        
        let elapsedFrames = 0;
        const totalFrames = (segmentDuration * 1000) / tickMs;

        elevatorState.timerInterval = setInterval(() => {
            elapsedFrames++;
            remainingTime -= (tickMs / 1000);
            if (remainingTime < 0) remainingTime = 0;

            liveTimerMsg.textContent = `${remainingTime.toFixed(2)}초`;

            // 비율에 맞게 실제 위치(px) 이동
            const progressRatio = Math.min(elapsedFrames / totalFrames, 1);
            const currentPositionPx = startPos + (totalDistance * progressRatio);
            elevatorCar.style.bottom = `${currentPositionPx}px`;

            // 이동 방향에 맞춰 화면 층수 실시간 변화
            const currentEstimatedFloor = Math.round(startFloor + ((nextTarget - startFloor) * progressRatio));
            panelFloor.textContent = currentEstimatedFloor;
            carDisplay.textContent = String(currentEstimatedFloor).padStart(2, '0');

            if (progressRatio >= 1) {
                clearInterval(elevatorState.timerInterval);

                elevatorState.currentFloor = nextTarget;
                panelFloor.textContent = nextTarget;
                carDisplay.textContent = String(nextTarget).padStart(2, '0');
                panelArrow.textContent = "─";
                liveTimerMsg.textContent = "0.00초";
                liveStatusMsg.textContent = "정차 (문열림)";

                const arrivedBtn = document.querySelector(`.elevator-inside-btn[data-floor="${nextTarget}"]`);
                if (arrivedBtn) arrivedBtn.classList.remove('button-pressed');

                elevatorState.selectedQueue.shift();

                const doorKeepOpenTime = btnDoorClose.classList.contains('active-util') ? 1200 : 3200;
                setTimeout(() => {
                    executeNextFlight();
                }, doorKeepOpenTime);
            }
        }, tickMs);
    }
});
