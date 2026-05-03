document.addEventListener('DOMContentLoaded', () => {
    // State
    let state = {
        timerId: null,
        secondsLeft: 0,
        score: 0,
        currentQuestionIndex: 0,
        storyData: null
    };

    // Elements
    const screens = {
        unlock: document.getElementById('unlock-screen'),
        setup: document.getElementById('setup-screen'),
        loading: document.getElementById('loading-screen'),
        reading: document.getElementById('reading-screen'),
        quiz: document.getElementById('quiz-screen'),
        end: document.getElementById('end-screen')
    };

    // Short Password Decoder
    const ENCRYPTED_KEY = "LCwfEzIUISI/BgIULzk5ACkQOBYDAzAeWCYpOgFSBwE/CypVVDUR"; 
    function decodeShortPass(pass) {
        if (!ENCRYPTED_KEY) return pass;
        try {
            let decoded = atob(ENCRYPTED_KEY);
            let result = '';
            for(let i=0; i<decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
            }
            if (result.startsWith("AIzaSy")) return result;
        } catch(e) {}
        return pass;
    }

    function switchScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // Initial Screen Check
    const savedKey = localStorage.getItem('geminiApiKey');
    if (!savedKey) {
        switchScreen('unlock');
    } else {
        switchScreen('setup');
    }

    // Unlock Screen Logic
    document.getElementById('login-btn').addEventListener('click', () => {
        const pass = document.getElementById('login-password-input').value.trim();
        if (!pass) return;
        
        const decodedKey = decodeShortPass(pass);
        if (decodedKey.startsWith("AIzaSy")) {
            localStorage.setItem('geminiApiKey', decodedKey);
            document.getElementById('login-error').innerText = "";
            switchScreen('setup');
        } else {
            document.getElementById('login-error').innerText = "Incorrect password! Please try again.";
        }
    });



    // Time Selectors
    const userMins = document.getElementById('user-minutes');
    document.getElementById('minus-time').addEventListener('click', () => {
        let val = parseInt(userMins.value);
        if (val > 1) userMins.value = val - 1;
    });
    document.getElementById('plus-time').addEventListener('click', () => {
        let val = parseInt(userMins.value);
        if (val < 60) userMins.value = val + 1;
    });



    // Start App
    document.getElementById('start-btn').addEventListener('click', async () => {
        const apiKey = localStorage.getItem('geminiApiKey');
        const errorMsg = document.getElementById('setup-error');
        
        if (!apiKey) {
            switchScreen('unlock');
            return;
        }
        errorMsg.innerText = "";

        const level = document.getElementById('level-select').value;
        const topic = document.getElementById('topic-input').value;
        const mins = parseInt(userMins.value) || 5;

        // Reset State
        state.score = 0;
        state.currentQuestionIndex = 0;
        state.secondsLeft = mins * 60;
        
        switchScreen('loading');

        try {
            state.storyData = await generateReadingContent(apiKey, level, topic);
            startReading();
        } catch (err) {
            errorMsg.innerText = "Error generating story: " + err.message;
            switchScreen('setup');
        }
    });

    // Reading Phase
    function startReading() {
        document.getElementById('story-title').innerText = state.storyData.storyTitle;
        const contentHtml = state.storyData.storyText.map(p => `<p>${p}</p>`).join('');
        document.getElementById('story-content').innerHTML = contentHtml;
        
        // Populate the quiz tab version
        document.getElementById('quiz-story-title').innerText = state.storyData.storyTitle;
        document.getElementById('quiz-story-content').innerHTML = contentHtml;
        
        switchScreen('reading');
        startTimer();
    }

    // Tab Logic
    const tabQuizBtn = document.getElementById('tab-quiz-btn');
    const tabPassageBtn = document.getElementById('tab-passage-btn');
    const quizContent = document.getElementById('quiz-tab-content');
    const passageContent = document.getElementById('passage-tab-content');

    tabQuizBtn.addEventListener('click', () => {
        tabQuizBtn.classList.add('active');
        tabPassageBtn.classList.remove('active');
        quizContent.classList.add('active');
        passageContent.classList.remove('active');
    });

    tabPassageBtn.addEventListener('click', () => {
        tabPassageBtn.classList.add('active');
        tabQuizBtn.classList.remove('active');
        passageContent.classList.add('active');
        quizContent.classList.remove('active');
    });

    document.getElementById('finished-reading-btn').addEventListener('click', () => {
        loadQuestion();
        // Ensure Quiz tab is active when entering quiz screen
        tabQuizBtn.click();
        switchScreen('quiz');
    });

    // Quiz Phase
    function loadQuestion() {
        const qData = state.storyData.questions[state.currentQuestionIndex];
        document.getElementById('question-counter').innerText = `Q ${state.currentQuestionIndex + 1}/${state.storyData.questions.length}`;
        document.getElementById('question-text').innerText = qData.question;
        
        const optionsArea = document.getElementById('options-container');
        optionsArea.innerHTML = '';
        
        const f = document.getElementById('feedback-area');
        f.classList.remove('show', 'correct', 'incorrect');
        
        qData.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = optText;
            btn.onclick = () => handleAnswer(btn, idx, qData.correctAnswerIndex);
            optionsArea.appendChild(btn);
        });
    }

    function handleAnswer(btn, selectedIdx, correctIdx) {
        // Disable all buttons
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        const f = document.getElementById('feedback-area');
        f.classList.remove('show', 'correct', 'incorrect');
        void f.offsetWidth; // trigger reflow

        if (selectedIdx === correctIdx) {
            btn.classList.add('correct');
            state.score++;
            f.textContent = "Great job! 🌟";
            f.classList.add('show', 'correct');
        } else {
            btn.classList.add('wrong');
            allBtns[correctIdx].classList.add('correct'); // Show correct
            f.innerHTML = `Oops! The correct answer was <b>${state.storyData.questions[state.currentQuestionIndex].options[correctIdx]}</b>.`;
            f.classList.add('show', 'incorrect');
        }

        setTimeout(() => {
            state.currentQuestionIndex++;
            if (state.currentQuestionIndex < state.storyData.questions.length) {
                loadQuestion();
            } else {
                endGame();
            }
        }, 3000);
    }

    // Timer Logic
    function startTimer() {
        clearInterval(state.timerId);
        updateClockDisplay();
        state.timerId = setInterval(() => {
            state.secondsLeft--;
            updateClockDisplay();
            if (state.secondsLeft <= 0) endGame();
        }, 1000);
    }

    function updateClockDisplay() {
        const m = Math.floor(state.secondsLeft / 60);
        const s = state.secondsLeft % 60;
        const timeStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
        
        document.getElementById('read-timer').innerText = timeStr;
        document.getElementById('quiz-timer').innerText = timeStr;
    }

    function endGame() {
        clearInterval(state.timerId);
        document.getElementById('final-score').innerText = `${state.score}/${state.storyData?.questions.length || 0}`;
        switchScreen('end');
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
        switchScreen('setup');
    });
});
