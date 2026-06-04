document.addEventListener('DOMContentLoaded', () => {
    // 층별 시간 실측 기본 데이터 셋
    const TIMETABLE = { 1: 0.00, 2: 9.02, 3: 12.01, 4: 16.31, 5: 19.88, 6: 22.27, 7: 25.84, 8: 29.25 };

    let currentSelectedFloor = null; // 단일 정차 예정층 변수

    // DOM 객체 바인딩
    const currentSelect = document.getElementById('current-floor');
    const mySelect = document.getElementById('my-floor');
    const doorCheckbox = document.getElementById('door-close');
    const floorButtons = document.querySelectorAll('.floor-btn');

    const resTime = document.getElementById('res-time');
    const resFloor = document.getElementById('res-floor');
    const ledTimeMsg = document.getElementById('led-time-msg');
    const ledFloorMsg = document.getElementById('led-floor-msg');
    const ledNum = document.getElementById('led-num');

    // 초기 실행 시 화면 값 동기화
    runCalculator();

    // 1. 현재 엘리베이터 층 변경 시 하드웨어 패널 숫자 연동
    currentSelect.addEventListener('change', () => {
        const cFloor = currentSelect.value;
        ledNum.textContent = String(cFloor).padStart(2, '0');
        runCalculator();
    });

    // 2. 내가 있는 층 셀렉트 변경 시 연동
    mySelect.addEventListener('change', runCalculator);

    // 3. 문닫힘 체크박스 토글 시 연동
    doorCheckbox.addEventListener('change', runCalculator);

    // 4. 정차 예정층 토글 버튼 핸들러
    floorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const picked = parseInt(btn.getAttribute('data-floor'), 10);

            // 동일한 층을 다시 누르면 해제, 다른 층을 누르면 변경
            if (currentSelectedFloor === picked) {
                currentSelectedFloor = null;
                btn.classList.remove('active');
            } else {
                floorButtons.forEach(b => b.classList.remove('active'));
                currentSelectedFloor = picked;
                btn.classList.add('active');
            }

            runCalculator();
        });
    });

    // 핵심: 화면 속 수치들을 계산하고 매핑하는 함수
    function runCalculator() {
        const start = parseInt(currentSelect.value, 10);
        const mine = parseInt(mySelect.value, 10);
        
        // 정차 예정층이 지정되어 있다면 거기를 들렀다 오고, 없으면 내 층으로 직행
        const destination = currentSelectedFloor !== null ? currentSelectedFloor : mine;

        // 텍스트 패널 업데이트
        if (currentSelectedFloor !== null) {
            resFloor.textContent = `${currentSelectedFloor}층`;
            ledFloorMsg.textContent = `정차 예정층: ${currentSelectedFloor}층`;
        } else {
            resFloor.textContent = '없음';
            ledFloorMsg.textContent = '정차 예정층: 없음';
        }

        // 주행 시간 공식
        let duration = Math.abs(TIMETABLE[destination] - TIMETABLE[start]);

        // 문닫힘 버튼을 누르지 않은 상태라면(체크 해제 시) 8.60초 가산
        if (!doorCheckbox.checked) {
            duration += 8.60;
        }

        // 소수점 2자리 포맷팅 후 모든 영역에 동시 주입
        const formattedTime = `${duration.toFixed(2)}초`;
        resTime.textContent = formattedTime;
        ledTimeMsg.textContent = `${formattedTime} 뒤 도착`;
    }
});
