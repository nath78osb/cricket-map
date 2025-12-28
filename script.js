// Toggle Logic
document.querySelectorAll('input[name="game-phase"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const chaseSection = document.getElementById('chase-inputs-section');
        const firstInningsGroup = document.getElementById('first-innings-group');
        const firstInningsInput = document.getElementById('first-innings-score');

        // Chase Inputs
        const runsDirectInput = document.getElementById('runs-required');

        // Overs Section Elements
        const oversToggleInfo = document.getElementById('overs-toggle-section');
        const oversDirectGroup = document.getElementById('overs-direct-group');
        const oversCurrentGroup = document.getElementById('overs-current-group');
        const oversLeftInput = document.getElementById('overs-left');

        if (this.value === 'first') {
            // 1st Innings Mode
            chaseSection.classList.add('hidden');
            firstInningsGroup.classList.remove('hidden');

            // Runs Required Validation
            firstInningsInput.setAttribute('required', 'true');
            runsDirectInput.removeAttribute('required');

            // Overs: Hide Toggle, Force "Max & Current"
            oversToggleInfo.classList.add('hidden');
            oversDirectGroup.classList.add('hidden');
            oversCurrentGroup.classList.remove('hidden');
            oversLeftInput.removeAttribute('required'); // Safety

        } else {
            // 2nd Innings (Chase)
            chaseSection.classList.remove('hidden');
            firstInningsGroup.classList.add('hidden');

            firstInningsInput.removeAttribute('required');
            runsDirectInput.setAttribute('required', 'true');

            // Restore Overs Selection based on current toggle state
            oversToggleInfo.classList.remove('hidden');
            const currentOversMode = document.querySelector('input[name="overs-mode"]:checked').value;
            if (currentOversMode === 'current') {
                oversDirectGroup.classList.add('hidden');
                oversCurrentGroup.classList.remove('hidden');
            } else {
                oversDirectGroup.classList.remove('hidden');
                oversCurrentGroup.classList.add('hidden');
            }
        }
    });
});

// Trigger initial state for Game Phase
document.querySelector('input[name="game-phase"]:checked').dispatchEvent(new Event('change'));

document.querySelectorAll('input[name="input-mode"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const directGroup = document.getElementById('direct-input-group');
        const targetGroup = document.getElementById('target-input-group');
        const runsReqInput = document.getElementById('runs-required');

        if (this.value === 'target') {
            directGroup.classList.add('hidden');
            targetGroup.classList.remove('hidden');
            runsReqInput.removeAttribute('required'); // Prevent HTML5 validation blocking
        } else {
            directGroup.classList.remove('hidden');
            targetGroup.classList.add('hidden');
            runsReqInput.setAttribute('required', 'true');
        }
    });
});

document.querySelectorAll('input[name="overs-mode"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const directGroup = document.getElementById('overs-direct-group');
        const currentGroup = document.getElementById('overs-current-group');
        const oversLeftInput = document.getElementById('overs-left');

        if (this.value === 'current') {
            directGroup.classList.add('hidden');
            currentGroup.classList.remove('hidden');
            oversLeftInput.removeAttribute('required');
        } else {
            directGroup.classList.remove('hidden');
            currentGroup.classList.add('hidden');
            oversLeftInput.setAttribute('required', 'true');
        }
    });
});

document.getElementById('predictor-form').addEventListener('submit', function (e) {
    e.preventDefault();

    // 1. Get Inputs
    const battingTeam = document.getElementById('batting-team').value || "Batting Team";
    const phase = document.querySelector('input[name="game-phase"]:checked').value;
    const bowlingTeam = document.getElementById('bowling-team').value || "Bowling Team";

    // Determine Runs Required
    let runsNeeded = 0;
    const runsMode = document.querySelector('input[name="input-mode"]:checked').value;

    if (runsMode === 'target') {
        const target = parseInt(document.getElementById('target-score').value) || 0;
        const current = parseInt(document.getElementById('current-score').value) || 0;
        runsNeeded = target - current;
        if (runsNeeded < 0) runsNeeded = 0; // Win already?
    } else {
        runsNeeded = parseInt(document.getElementById('runs-required').value);
    }

    // Determine Balls Left (Overs)
    let ballsLeft = 0;
    let oversDescription = "";
    const oversMode = document.querySelector('input[name="overs-mode"]:checked').value;

    if (oversMode === 'current') {
        const currentOversInput = document.getElementById('current-overs').value;
        const maxOvers = parseInt(document.getElementById('max-overs').value) || 50;

        // Parse Current Overs (e.g. 44.4)
        const parts = currentOversInput.split('.');
        const cOvers = parseInt(parts[0]) || 0;
        const cBalls = parseInt(parts[1]) || 0;

        const ballsGone = (cOvers * 6) + cBalls;
        const maxBalls = maxOvers * 6;
        ballsLeft = maxBalls - ballsGone;

        oversDescription = `Max ${maxOvers} overs - Current ${currentOversInput} (${ballsGone} balls bowled).`;
    } else {
        const oversInput = document.getElementById('overs-left').value;
        const parts = oversInput.split('.');
        const oversFull = parseInt(parts[0]) || 0;
        const oversBalls = parseInt(parts[1]) || 0;

        ballsLeft = (oversFull * 6) + oversBalls;
        oversDescription = `Input "${oversInput}" treated as ${oversFull} overs and ${oversBalls} balls.`;
    }

    const realOversLeft = ballsLeft / 6;
    const wicketsLeft = parseInt(document.getElementById('wickets-left').value);

    // Batter Stats
    const b1Runs = parseInt(document.getElementById('b1-runs').value) || 0;
    const b1Balls = parseInt(document.getElementById('b1-balls').value) || 0;
    const b2Runs = parseInt(document.getElementById('b2-runs').value) || 0;
    const b2Balls = parseInt(document.getElementById('b2-balls').value) || 0;

    let debugLog = []; // Store calculation steps

    if (phase === 'first') {
        const currentScore = parseInt(document.getElementById('first-innings-score').value) || 0;
        calculateFirstInnings(currentScore, ballsLeft, realOversLeft, wicketsLeft, battingTeam, bowlingTeam, [b1Runs, b1Balls, b2Runs, b2Balls]);
        return;
    }

    // 2. Validation
    if (ballsLeft <= 0 && runsNeeded > 0) {
        showResult(0, runsNeeded, realOversLeft, "Match Over. Target not reached.", battingTeam, bowlingTeam, ["Match over, target not reached."]);
        return;
    }
    if (runsNeeded <= 0) {
        showResult(100, 0, realOversLeft, "Target Reached! Win confirmed.", battingTeam, bowlingTeam, ["Target reached."]);
        return;
    }

    // 3. Calculation Logic (Heuristic)

    // A. Required Run Rate (RRR)
    let rrr = runsNeeded / realOversLeft;
    if (ballsLeft === 0) rrr = 999;

    debugLog.push({
        step: "Overs & RRR",
        desc: `${oversDescription} Total ${ballsLeft} balls left.`,
        formula: `RRR = ${runsNeeded} / ${realOversLeft.toFixed(2)} = ${rrr.toFixed(2)}`
    });

    // B. Achievable Run Rate (ARR) based on Wickets
    let baseArr = 3.5;
    let wktFactor = 0.8 * wicketsLeft;
    let arr = baseArr + wktFactor;

    debugLog.push({
        step: "Base Achievable Rate (ARR)",
        desc: `Base rate (3.5) + Wickets factor (0.8 * ${wicketsLeft}).`,
        formula: `Base ARR = 3.5 + ${wktFactor.toFixed(2)} = ${arr.toFixed(2)}`
    });

    // Adjustments
    let adjustments = [];
    if (wicketsLeft > 7) {
        arr += 1.5;
        adjustments.push("+1.5 (High wickets left bonus)");
    }

    // C. Batter "Set" Bonus
    if (b1Runs > 25) {
        arr += 0.5;
        adjustments.push("+0.5 (Batter 1 set > 25 runs)");
    }
    if (b2Runs > 25) {
        arr += 0.5;
        adjustments.push("+0.5 (Batter 2 set > 25 runs)");
    }

    // Low Strike Rate Penalty
    if (b1Balls > 10 && (b1Runs / b1Balls) < 1.0) {
        arr -= 0.3;
        adjustments.push("-0.3 (Batter 1 low SR)");
    }
    if (b2Balls > 10 && (b2Runs / b2Balls) < 1.0) {
        arr -= 0.3;
        adjustments.push("-0.3 (Batter 2 low SR)");
    }

    if (adjustments.length > 0) {
        debugLog.push({
            step: "ARR Adjustments",
            desc: "Modifiers based on game state and batters.",
            formula: `New ARR = ${arr.toFixed(2)} (${adjustments.join(", ")})`
        });
    }

    // D. The Difference
    const diff = arr - rrr;
    debugLog.push({
        step: "Rate Differential",
        desc: "Difference between Achievable Rate and Required Rate.",
        formula: `Diff = ${arr.toFixed(2)} (ARR) - ${rrr.toFixed(2)} (RRR) = ${diff.toFixed(2)}`
    });

    // E. Sigmoid Probability Function
    let k = 0.5;
    if (realOversLeft < 5) k = 1.2;
    if (realOversLeft < 2) k = 2.0;

    let probability = 1 / (1 + Math.exp(-k * diff));

    debugLog.push({
        step: "Win Probability (Sigmoid)",
        desc: `Using Logistic Function with volatility k=${k}.`,
        formula: `P = 1 / (1 + e^(-${k} * ${diff.toFixed(2)})) = ${probability.toFixed(4)}`
    });

    // Convert to percentage
    let winPct = probability * 100;

    // F. Edge Case Adjustments
    if (rrr > 36) {
        winPct = 0;
        debugLog.push({ step: "Edge Case", desc: "RRR > 36 (Impossible)", formula: "Win % = 0" });
    }
    if (wicketsLeft === 0 && runsNeeded > 0) {
        winPct = 0;
        debugLog.push({ step: "Edge Case", desc: "All Out", formula: "Win % = 0" });
    }

    // G. Generate Commentary
    let commentary = "";
    if (winPct > 80) commentary = `${battingTeam} cruising to victory.`;
    else if (winPct > 55) commentary = `Slight edge to ${battingTeam}.`;
    else if (winPct > 40) commentary = "Game hangs in the balance.";
    else if (winPct > 15) commentary = `Falling behind. ${battingTeam} need a big over.`;
    else commentary = `Looking bleak for ${battingTeam}.`;

    showResult(winPct, rrr, runsNeeded, commentary, battingTeam, bowlingTeam, debugLog);
});

function showResult(winPct, rrr, runsNeeded, commentary, batTeam, bowlTeam, logs) {
    const resultSection = document.getElementById('result-section');
    const winProgress = document.getElementById('win-progress');
    const rrrDisplay = document.getElementById('rrr-display');
    const projectedDisplay = document.getElementById('projected-score');
    const commentaryText = document.getElementById('commentary');

    // Team Names & Percents
    document.querySelector('.val-batting-name').textContent = batTeam;
    document.querySelector('.val-bowling-name').textContent = bowlTeam;

    const batPct = Math.round(winPct);
    const bowlPct = 100 - batPct;

    document.querySelector('.val-batting-percent').textContent = `${batPct}%`;
    document.querySelector('.val-bowling-percent').textContent = `${bowlPct}%`;

    // Show section
    resultSection.classList.remove('hidden');

    // Animate Gauge for Batting Team
    let startValue = 0;
    let speed = 20;

    // Reset gauge first
    winProgress.style.background = `conic-gradient(var(--primary-accent) 0deg, rgba(255, 255, 255, 0.1) 0deg)`;

    // Clear previous interval if any (simple way: rely on overwrite or just let it run out quickly)
    // For robust app, store interval ID. Since this is simple, we just create new one.

    const progressInterval = setInterval(() => {
        if (startValue === batPct) {
            clearInterval(progressInterval);
        } else {
            if (startValue < batPct) startValue++;
            else startValue--;

            // Only update the ring, numbers are already static text above
            winProgress.style.background = `conic-gradient(
                ${startValue > 50 ? 'var(--win-color)' : (startValue < 20 ? 'var(--lose-color)' : 'var(--primary-accent)')} ${startValue * 3.6}deg,
                rgba(255, 255, 255, 0.1) ${startValue * 3.6}deg
            )`;
        }
    }, speed);

    // Update Stats
    rrrDisplay.textContent = rrr.toFixed(2);
    document.querySelector('.stat-item:nth-child(2) .label').textContent = "Runs Needed";
    projectedDisplay.textContent = runsNeeded;
    commentaryText.textContent = commentary;

    // Populate Calculation Details
    const breakdownContainer = document.getElementById('calc-breakdown');
    breakdownContainer.innerHTML = ""; // Clear old

    if (Array.isArray(logs)) {
        logs.forEach(item => {
            const div = document.createElement('div');
            div.className = 'calc-step';

            // Handle simple string logs or object logs
            if (typeof item === 'string') {
                div.innerHTML = `<span class="calc-desc">${item}</span>`;
            } else {
                div.innerHTML = `
                    <div style="font-weight:bold; color:#fff;">${item.step}</div>
                    <div class="calc-desc">${item.desc}</div>
                    <code class="calc-formula">${item.formula}</code>
                `;
            }
            breakdownContainer.appendChild(div);
        });
    }
}

// Toggle Button Logic
document.getElementById('toggle-details-btn').addEventListener('click', function () {
    const list = document.getElementById('calc-breakdown');
    const isHidden = list.classList.contains('hidden');

    if (isHidden) {
        list.classList.remove('hidden');
        this.textContent = "Hide Calculation Logic ▲";
    } else {
        list.classList.add('hidden');
        this.textContent = "Show Calculation Logic ▼";
    }
});

function calculateFirstInnings(currentScore, ballsLeft, realOversLeft, wicketsLeft, batTeam, bowlTeam, batterStats) {
    let debugLog = [];

    // Heuristic Projection
    // Base Rate: 6.0 + Wicket Bonus
    let baseRate = 6.0;
    let wktBonus = (wicketsLeft - 5) * 0.5;
    let projectedRate = baseRate + wktBonus;

    if (projectedRate < 3) projectedRate = 3;

    // Batter Bonus
    // batterStats: [b1Runs, b1Balls, b2Runs, b2Balls]
    if (batterStats[0] > 30 || batterStats[2] > 30) {
        projectedRate += 0.5;
        debugLog.push({ step: "Set Batter", desc: "Batter > 30 runs", formula: "+0.5 RR" });
    }

    // Death Overs Bonus
    if (realOversLeft <= 10 && wicketsLeft > 3) {
        projectedRate += 2.0;
        debugLog.push({ step: "Death Overs", desc: "<10 overs left & >3 wickets", formula: "+2.0 RR" });
    }

    const runsFromRemaining = projectedRate * realOversLeft;
    const finalScore = Math.round(currentScore + runsFromRemaining);

    const minRange = Math.round(finalScore * 0.95);
    const maxRange = Math.round(finalScore * 1.05);

    debugLog.push({
        step: "Projection Logic",
        desc: `Base Rate ${baseRate} + Wicket Bonus ${wktBonus}.`,
        formula: `Rate ${projectedRate.toFixed(1)} * ${realOversLeft.toFixed(1)} overs = ${Math.round(runsFromRemaining)}`
    });

    showProjectionResult(minRange, maxRange, currentScore, batTeam, bowlTeam, debugLog);
}

function showProjectionResult(min, max, current, batTeam, bowlTeam, logs) {
    const resultSection = document.getElementById('result-section');
    const winProgress = document.getElementById('win-progress');
    const rrrDisplay = document.getElementById('rrr-display');
    const projectedDisplay = document.getElementById('projected-score');
    const commentaryText = document.getElementById('commentary');

    // Hide Win % Specifics
    document.querySelector('.val-batting-name').textContent = batTeam;
    document.querySelector('.val-bowling-name').textContent = bowlTeam;
    document.querySelector('.val-batting-percent').textContent = "";
    document.querySelector('.val-bowling-percent').textContent = "";
    winProgress.style.background = 'var(--card-bg)';
    winProgress.style.border = '2px solid var(--glass-border)'; // reset

    // Display Projected Score in Big Circle
    // We reuse inner-circle but clearer text
    const innerCircle = document.querySelector('.inner-circle');
    innerCircle.innerHTML = `
        <div style="font-size: 1.4rem; line-height: 1.2; font-weight:700;">${min}-${max}</div>
        <div style="font-size: 0.8rem; font-weight: 400; color: #ccc;">Projected</div>
    `;

    resultSection.classList.remove('hidden');

    rrrDisplay.textContent = "-";
    document.querySelector('.stat-item:nth-child(2) .label').textContent = "Current Score";
    projectedDisplay.textContent = current;

    commentaryText.textContent = `Projected total between ${min} and ${max}.`;

    // Logs
    const breakdownContainer = document.getElementById('calc-breakdown');
    breakdownContainer.innerHTML = "";
    logs.forEach(item => {
        const div = document.createElement('div');
        div.className = 'calc-step';
        div.innerHTML = `
            <div style="font-weight:bold; color:#fff;">${item.step}</div>
            <div class="calc-desc">${item.desc}</div>
            <code class="calc-formula">${item.formula}</code>
        `;
        breakdownContainer.appendChild(div);
    });
}
