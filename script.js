document.addEventListener('DOMContentLoaded', () => {
    // 층별 물리적 누적 초 기준 데이터 매핑 테이블
    const CRITICAL_TIME_MAP = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

    let simState = {
        currentFloor: 1,
        myFloor: 4,
        targetFloor: null, // 정차 예정층 하나 선택
        isMoving: false,
        timerInterval: null
    };

    // DOM 요소 노드 스위치 연동
    const currentSelect = document.getElementById('current-floor-select');
    const mySelect = document.getElementById('my-floor-select');
    const floorButtons = document.querySelectorAll('.floor-btn');
    const doorCheckbox = document.getElementById('door-close-chebox');
    
    const summaryTime = document.getElementById('summary-time');
    const summaryFloor = document.getElementById('summary-floor');
    
    const displayArrow = document.getElementById('display-arrow');
    const displayFloorNum = document.getElementById('display-floor-num');
    const ledTimerText = document.getElementById('led-timer-text');
    const ledNextFloorText = document.getElementById('led-next-floor-text');
    
    const btnSimulate = document.getElementById('btn-simulate');
    const hwBtnUp = document.getElementById('hw-btn-up');
    const hwBtnDown = document.getElementById('hw-btn-down');

    // 초기 화면 상태 동기화 빌드
    updateCalculatedData();

    // 1. 셀렉트 박스 이벤트 동기화
    currentSelect.addEventListener('change', (e) => {
        simState.currentFloor = parseInt(e.target.value, 10);
        displayFloorNum.textContent = String(simState.currentFloor).padStart(2, '0');
        updateCalculatedData();
    });

    mySelect.addEventListener('change', (e) => {
        simState.myFloor = parseInt(e.target.value, 10);
        updateCalculatedData();
    });

    // 2. [핵심] 정차 예정층 선택 토글 핸들러
    floorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (simState.isMoving) return;

            const selectedFloor = parseInt(btn.getAttribute('data-floor'), 10);

            // 이미 같은 것을 눌렀으면 해제, 아니면 단일 타겟 지정
            if (simState.targetFloor === selectedFloor) {
                simState.targetFloor = null;
                btn.classList.remove('selected');
            } else {
                floorButtons.forEach(b => b.classList.remove('selected'));
                simState.targetFloor = selectedFloor;
                btn.classList.add('selected');
            }
            updateCalculatedData();
        });
    });

    // 3. 체크박스 이벤트 바인딩
    doorCheckbox.addEventListener('change', () => {
        updateCalculatedData();
    });

    // [연산 런타임] 남은 시간 및 목적지 실시간 연산 계산식 함수
    function updateCalculatedData() {
        if (simState.isMoving) return;

        // 정차 예정층 텍스트 동기화
        if (simState.targetFloor) {
            summaryFloor.textContent = `${simState.targetFloor}층`;
            ledNextFloorText.textContent = `정차 예정층: ${simState.targetFloor}층`;
        } else {
            summaryFloor.textContent = '없음';
            ledNextFloorText.textContent = '정차 예정층: 없음';
        }

        // 최종 도달 목표층 설정 (정차 예정층이 없으면 내가 서있는 층이 최종 타겟)
        const finalDestination = simState.targetFloor ? simState.targetFloor : simState.myFloor;

        // 주행 이동 시간 공식 산출
        let totalDuration = Math.abs(CRITICAL_TIME_MAP[finalDestination] - CRITICAL_TIME_MAP[simState.currentFloor]);

        // 문닫힘 버튼 안눌렀을 때의 8.60초 시간 패널티 추가 연산
        if (!doorCheckbox.checked) {
            totalDuration += 8.60;
        }

        // 왼쪽 요약 대시보드 및 오른쪽 LED 하단에 실시간 매핑
        summaryTime.textContent = `${totalDuration.toFixed(2)}초`;
        ledTimerText.textContent = `${totalDuration.toFixed(2)}초 뒤 도착`;
    }

    // 4. 가동 트리거 시뮬레이터 인터페이스 엔진
    btnSimulate.addEventListener('click', () => {
        if (simState.isMoving) return;

        const destination = simState.targetFloor ? simState.targetFloor : simState.myFloor;

        if (simState.currentFloor === destination) {
            alert('현재 엘리베이터가 이미 목적지 층에 위치해 있습니다!');
            return;
        }

        // 제어 상태 락(Lock)
        simState.isMoving = true;
        btnSimulate.disabled = true;
        currentSelect.disabled = true;
        mySelect.disabled = true;

        // 화살표 방향 조명 및 하드웨어 기계식 버튼 오렌지 액티브 동기화
        const isUp = destination > simState.currentFloor;
        displayArrow.textContent = isUp ? '↑' : '↓';
        if (isUp) hwBtnUp.classList.add('active');
        else hwBtnDown.classList.add('active');

        // 이동 타임프레임 스위치 시작
        let finalDuration = Math.abs(CRITICAL_TIME_MAP[destination] - CRITICAL_TIME_MAP[simState.currentFloor]);
        if (!doorCheckbox.checked) {
            finalDuration += 8.60;
        }

        let remainingTime = finalDuration;
        const startFloor = simState.currentFloor;
        
        const tickMs = 100; // 0.1초 단위 새로고침
        
        simState.timerInterval = setInterval(() => {
            remainingTime -= (tickMs / 1000);
            if (remainingTime <= 0) remainingTime = 0;

            // 실시간 텍스트 데이터 패널 주입
            summaryTime.textContent = `${remainingTime.toFixed(2)}초`;
            ledTimerText.textContent = `${remainingTime.toFixed(2)}초 뒤 도착`;

            // 실시간 위치 진행도 비율 계산에 따라 전광판 층수 숫자 동기화 변경
            const progress = (finalDuration - remainingTime) / finalDuration;
            const currentEstimatedFloor = Math.round(startFloor + ((destination - startFloor) * progress));
            
            displayFloorNum.textContent = String(currentEstimatedFloor).padStart(2, '0');

            // 목적지 무사 완주 정차 시점
            if (remainingTime <= 0) {
                clearInterval(simState.timerInterval);
                
                // 도달값 락 해제 및 보정
                simState.currentFloor = destination;
                currentSelect.value = destination;
                displayFloorNum.textContent = String(destination).padStart(2, '0');
                
                displayArrow.textContent = '─';
                hwBtnUp.classList.remove('active');
                hwBtnDown.classList.remove('active');
                
                // 초기화 완료 시퀀스 리셋
                simState.isMoving = false;
                btnSimulate.disabled = false;
                currentSelect.disabled = false;
                mySelect.disabled = false;
                
                // 타겟 초기화 및 버튼 조명 Off
                simState.targetFloor = null;
                floorButtons.forEach(b => b.classList.remove('selected'));
                updateCalculatedData();
                
                alert(`엘리베이터가 무사히 ${destination}층에 도착했습니다!`);
            }
        }, tickMs);
    });
});
