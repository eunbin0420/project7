document.addEventListener('DOMContentLoaded', () => {
    // 실측 기반 층간 이동 타임 테이블 데이터베이스
    const FLOOR_TIME_DATA = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

    let state = {
        current: 1,
        queue: [],
        isRunning: false,
        timerId: null,
        floorId: null
    };

    // DOM 선택자
    const currentSelect = document.getElementById('current-floor-select');
    const mySelect = document.getElementById('my-floor-select');
    const doorCheckbox = document.getElementById('door-close-checkbox');
    const floorBtns = document.querySelectorAll('.floor-btn');
    
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');

    const widgetTime = document.getElementById('widget-time');
    const widgetNext = document.getElementById('widget-next-floor');

    const screenArrow = document.getElementById('screen-arrow');
    const screenFloor = document.getElementById('screen-floor');
    const screenTimer = document.getElementById('screen-timer-msg');
    const screenNext = document.getElementById('screen-next-msg');

    const hwUp = document.getElementById('hw-btn-up');
    const hwDown = document.getElementById('hw-btn-down');

    // 층수 그리드 멀티 칩 선택 처리
    floorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.isRunning) return;
            const floor = parseInt(btn.getAttribute('data-floor'), 10);

            if (state.queue.includes(floor)) {
                state.queue = state.queue.filter(f => f !== floor);
                btn.classList.remove('active');
            } else {
                state.queue.push(floor);
                btn.classList.add('active');
            }
            updateCalculatedPreview();
        });
    });

    // 이벤트 리스너 바인딩
    doorCheckbox.addEventListener('change', updateCalculatedPreview);
    currentSelect.addEventListener('change', () => {
        state.current = parseInt(currentSelect.value, 10);
        screenFloor.textContent = String(state.current).padStart(2, '0');
        updateCalculatedPreview();
    });

    // 실시간 예측 연산 시스템
    function updateCalculatedPreview() {
        if (state.queue.length === 0) {
            widgetNext.textContent = "없음";
            screenNext.textContent = "정차 예정층: 없음";
            widgetTime.textContent = "00.00초";
            screenTimer.textContent = "00.00초 뒤 도착";
            return;
        }

        const sortedQueue = [...state.queue].sort((a, b) => a - b);
        const queueText = sortedQueue.map(f => `${f}층`).join(', ');
        widgetNext.textContent = queueText;
        screenNext.textContent = `정차 예정층: ${queueText}`;

        let tempStart = parseInt(currentSelect.value, 10);
        let totalSec = 0;

        // 가까운 거리 우선 정렬 방문 알고리즘
        const route = [...state.queue].sort((a, b) => Math.abs(a - tempStart) - Math.abs(b - tempStart));

        route.forEach(dest => {
            totalSec += Math.abs(FLOOR_TIME_DATA[dest] - FLOOR_TIME_DATA[tempStart]);
            if (!doorCheckbox.checked) {
                totalSec += 8.60; // 문닫힘 미체크 패널티
            }
            tempStart = dest;
        });

        widgetTime.textContent = `${totalSec.toFixed(2)}초`;
        screenTimer.textContent = `${totalSec.toFixed(2)}초 뒤 도착`;
    }

    // 가동 시작
    startBtn.addEventListener('click', () => {
        if (state.isRunning) return;
        if (state.queue.length === 0) {
            alert("정차 예정층을 선택해 주세요.");
            return;
        }

        state.isRunning = true;
        setLockControls(true);
        
        // 가까운 순 정렬 후 주행 시작
        state.queue.sort((a, b) => Math.abs(a - state.current) - Math.abs(b - state.current));
        executeNextDrive();
    });

    function executeNextDrive() {
        if (state.queue.length === 0) {
            state.isRunning = false;
            setLockControls(false);
            screenArrow.textContent = "─";
            hwUp.classList.remove('active');
            hwDown.classList.remove('active');
            updateCalculatedPreview();
            return;
        }

        const target = state.queue[0];
        const origin = state.current;

        if (origin === target) {
            state.queue.shift();
            const btn = document.querySelector(`.floor-btn[data-floor="${target}"]`);
            if (btn) btn.classList.remove('active');
            executeNextDrive();
            return;
        }

        // 방향 판별 및 하드웨어 기계 버튼 불빛 연동
        const isUp = target > origin;
        screenArrow.textContent = isUp ? "↑" : "↓";
        if (isUp) {
            hwUp.classList.add('active');
            hwDown.classList.remove('active');
        } else {
            hwDown.classList.add('active');
            hwUp.classList.remove('active');
        }

        let segmentsTime = Math.abs(FLOOR_TIME_DATA[target] - FLOOR_TIME_DATA[origin]);
        if (!doorCheckbox.checked) segmentsTime += 8.60;

        const initialSegmentTime = segmentsTime;
        screenTimer.textContent = `${segmentsTime.toFixed(2)}초 뒤 도착`;
        widgetTime.textContent = `${segmentsTime.toFixed(2)}초`;

        // 0.04초마다 타이머 감소 주기 구동
        const interval = 40;
        state.timerId = setInterval(() => {
            segmentsTime -= (interval / 1000);

            if (segmentsTime <= 0) {
                clearInterval(state.timerId);
                clearInterval(state.floorId);

                state.current = target;
                screenFloor.textContent = String(target).padStart(2, '0');
                currentSelect.value = target;
                screenArrow.textContent = "─";
                screenTimer.textContent = "0.00초 뒤 도착";
                widgetTime.textContent = "0.00초";

                const btn = document.querySelector(`.floor-btn[data-floor="${target}"]`);
                if (btn) btn.classList.remove('active');

                state.queue.shift();

                setTimeout(() => {
                    executeNextDrive();
                }, doorCheckbox.checked ? 1200 : 3000);
                return;
            }

            screenTimer.textContent = `${segmentsTime.toFixed(2)}초 뒤 도착`;
            widgetTime.textContent = `${segmentsTime.toFixed(2)}초`;
        }, interval);

        // 부드럽게 한 층씩 변하는 내부 스크린 연출
        const floorDiff = Math.abs(target - origin);
        const msPerFloor = (initialSegmentTime / floorDiff) * 1000;

        state.floorId = setInterval(() => {
            if (state.current !== target) {
                state.current += isUp ? 1 : -1;
                screenFloor.textContent = String(state.current).padStart(2, '0');
                currentSelect.value = state.current;
            } else {
                clearInterval(state.floorId);
            }
        }, msPerFloor);
    }

    function setLockControls(lock) {
        currentSelect.disabled = lock;
        mySelect.disabled = lock;
        doorCheckbox.disabled = lock;
        startBtn.disabled = lock;
        startBtn.style.opacity = lock ? "0.5" : "1";
    }

    // 초기화 리셋
    resetBtn.addEventListener('click', () => {
        if (state.isRunning) return;
        state.queue = [];
        floorBtns.forEach(b => b.classList.remove('active'));
        screenArrow.textContent = "─";
        hwUp.classList.remove('active');
        hwDown.classList.remove('active');
        updateCalculatedPreview();
    });

    // 시스템 첫 부팅 초기값 렌더링
    screenFloor.textContent = String(state.current).padStart(2, '0');
    updateCalculatedPreview();
});
