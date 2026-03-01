/**
 * Main Controller for Johnson McGinnis Estate Planning Game
 * State machine orchestrating screens, gameplay, and lead capture
 */

class GameController {
    constructor() {
        // Game state
        this.currentScreen = 'email';
        this.profile = null;
        this.currentScenario = 0;
        this.score = 0;
        this.answers = [];
        this.isTransitioning = false;
        this.pendingDirection = null;
        this.pendingConsequence = null;
        
        // User data
        this.userData = {
            email: '',
            over18: false,
            inTennessee: false
        };
        
        // DOM elements
        this.screens = {};
        this.elements = {};
        
        // Bind methods
        this.handleEmailSubmit = this.handleEmailSubmit.bind(this);
        this.handleProfileSelect = this.handleProfileSelect.bind(this);
        this.handleOptionSelect = this.handleOptionSelect.bind(this);
        this.handlePlayAgain = this.handlePlayAgain.bind(this);
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initRenderer();
        this.initHomeAnimation();
        this.showScreen('email');
    }
    
    cacheElements() {
        // Screens
        this.screens = {
            email: document.getElementById('screen-email'),
            profile: document.getElementById('screen-profile'),
            hud: document.getElementById('screen-hud'),
            end: document.getElementById('screen-end')
        };
        
        // Email form elements
        this.elements.emailForm = document.getElementById('email-form');
        this.elements.emailInput = document.getElementById('email');
        this.elements.emailError = document.getElementById('email-error');
        this.elements.over18 = document.getElementById('over18');
        this.elements.inTennessee = document.getElementById('inTennessee');
        
        // Profile cards
        this.elements.profileCards = document.querySelectorAll('.profile-card');
        
        // HUD elements
        this.elements.progressDots = document.querySelectorAll('.dot');
        this.elements.scenarioCard = document.getElementById('scenario-card');
        this.elements.scenarioNum = document.getElementById('scenario-num');
        this.elements.scenarioTitle = document.getElementById('scenario-title');
        this.elements.scenarioDescription = document.getElementById('scenario-description');
        this.elements.optionsContainer = document.getElementById('options-container');
        this.elements.optionCards = document.querySelectorAll('.option-card');
        this.elements.optionTexts = {
            a: document.getElementById('option-a-text'),
            b: document.getElementById('option-b-text'),
            c: document.getElementById('option-c-text')
        };
        this.elements.feedbackToast = document.getElementById('feedback-toast');
        this.elements.feedbackIcon = document.getElementById('feedback-icon');
        this.elements.feedbackText = document.getElementById('feedback-text');
        this.elements.feedbackOk = document.getElementById('feedback-ok');
        
        // End screen elements
        this.elements.endTitle = document.getElementById('end-title');
        this.elements.scoreValue = document.getElementById('score-value');
        this.elements.endMessage = document.getElementById('end-message');
        this.elements.ctaButton = document.getElementById('cta-button');
        this.elements.playAgainBtn = document.getElementById('play-again');
        
        // Pause elements
        this.elements.pauseBtn = document.getElementById('pause-btn');
        this.elements.pauseOverlay = document.getElementById('pause-overlay');
        this.elements.resumeBtn = document.getElementById('resume-btn');
    }
    
    bindEvents() {
        // Email form submission
        this.elements.emailForm.addEventListener('submit', this.handleEmailSubmit);
        
        // Profile selection
        this.elements.profileCards.forEach(card => {
            card.addEventListener('click', () => {
                this.handleProfileSelect(card.dataset.profile);
            });
        });
        
        // Option selection
        this.elements.optionCards.forEach(card => {
            card.addEventListener('click', () => {
                if (!this.isTransitioning) {
                    this.handleOptionSelect(card.dataset.direction);
                }
            });
        });
        
        // Feedback OK button - triggers the turn
        this.elements.feedbackOk.addEventListener('click', () => {
            this.handleFeedbackOk();
        });
        
        // Play again button
        this.elements.playAgainBtn.addEventListener('click', this.handlePlayAgain);
        
        // Pause/resume buttons
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        }
        if (this.elements.resumeBtn) {
            this.elements.resumeBtn.addEventListener('click', () => this.togglePause());
        }
    }
    
    initRenderer() {
        // Initialize Three.js renderer
        gameRenderer.init('game-container');
        
        // Set up callbacks
        gameRenderer.onTurnComplete = () => {
            this.onTurnComplete();
        };
        
        gameRenderer.onArrivalComplete = () => {
            this.showEndScreen();
        };
    }
    
    // === PAUSE / RESUME ===
    
    togglePause() {
        const isPaused = gameRenderer.togglePause();
        
        if (this.elements.pauseOverlay) {
            if (isPaused) {
                this.elements.pauseOverlay.classList.add('visible');
                this.elements.pauseBtn.textContent = '▶';
            } else {
                this.elements.pauseOverlay.classList.remove('visible');
                this.elements.pauseBtn.textContent = '⏸';
            }
        }
    }
    
    // === SCREEN MANAGEMENT ===
    
    showScreen(screenName) {
        // Stop home animation when leaving email screen
        if (this.currentScreen === 'email' && screenName !== 'email') {
            this.stopHomeAnimation();
        }
        
        // Start home animation when showing email screen
        if (screenName === 'email' && this.homeAnimation) {
            this.homeAnimation.start();
        }
        
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
        
        this.currentScreen = screenName;
    }
    
    // === EMAIL CAPTURE ===
    
    handleEmailSubmit(e) {
        e.preventDefault();
        
        const email = this.elements.emailInput.value.trim();
        
        // Validate email
        if (!this.validateEmail(email)) {
            this.elements.emailError.textContent = 'Please enter a valid email address';
            this.elements.emailInput.focus();
            return;
        }
        
        // Check reCAPTCHA (if available)
        if (typeof grecaptcha !== 'undefined') {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                this.elements.emailError.textContent = 'Please complete the verification';
                return;
            }
        }
        
        // Clear error
        this.elements.emailError.textContent = '';
        
        // Store user data
        this.userData.email = email;
        this.userData.over18 = this.elements.over18.checked;
        this.userData.inTennessee = this.elements.inTennessee.checked;
        
        // Submit lead data
        this.submitLead();
        
        // Proceed to profile selection
        this.showScreen('profile');
    }
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    async submitLead() {
        if (!CONFIG.leadCapture.enableSubmission) {
            console.log('Lead capture disabled, data:', this.userData);
            return;
        }
        
        try {
            await fetch(CONFIG.leadCapture.submitEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.userData.email,
                    over18: this.userData.over18,
                    inTennessee: this.userData.inTennessee,
                    timestamp: new Date().toISOString(),
                    source: 'estate-planning-game'
                })
            });
        } catch (error) {
            console.error('Failed to submit lead:', error);
        }
    }
    
    // === PROFILE SELECTION ===
    
    handleProfileSelect(profile) {
        this.profile = profile;
        this.startGame();
    }
    
    // === GAMEPLAY ===
    
    startGame() {
        this.currentScenario = 0;
        this.score = 0;
        this.answers = [];
        
        this.showScreen('hud');
        this.updateProgressDots();
        
        // Make sure intersection is positioned and visible
        gameRenderer.showNextIntersection();
        
        // Set up callback for when car stops
        gameRenderer.onStopAtIntersection = () => {
            this.showScenario();
        };
        
        // Start driving toward the visible intersection
        gameRenderer.startDriving();
        
        // After driving a bit, start approaching (slowing down)
        setTimeout(() => {
            gameRenderer.approachIntersection();
        }, 1500);
    }
    
    updateProgressDots() {
        this.elements.progressDots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            
            if (index < this.currentScenario) {
                dot.classList.add('completed');
            } else if (index === this.currentScenario) {
                dot.classList.add('active');
            }
        });
    }
    
    showScenario() {
        const scenario = getScenarioForProfile(this.currentScenario, this.profile);
        
        // Update scenario card
        this.elements.scenarioNum.textContent = this.currentScenario + 1;
        this.elements.scenarioTitle.textContent = scenario.title;
        this.elements.scenarioDescription.textContent = scenario.displayDescription;
        
        // Update option cards
        this.elements.optionTexts.a.textContent = scenario.options[0].text;
        this.elements.optionTexts.b.textContent = scenario.options[1].text;
        this.elements.optionTexts.c.textContent = scenario.options[2].text;
        
        // Show UI
        this.elements.scenarioCard.classList.add('visible');
        this.elements.optionsContainer.classList.add('visible');
        
        // Create in-world direction signs at the intersection
        gameRenderer.createDirectionSigns(
            scenario.options[0].text,
            scenario.options[1].text,
            scenario.options[2].text
        );
    }
    
    hideScenario() {
        this.elements.scenarioCard.classList.remove('visible');
        this.elements.optionsContainer.classList.remove('visible');
    }
    
    handleOptionSelect(direction) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        const scenario = SCENARIOS[this.currentScenario];
        const option = scenario.options.find(o => o.direction === direction);
        
        // Store selected direction for when OK is clicked
        this.pendingDirection = direction;
        this.pendingConsequence = option.consequence || 'pothole';
        
        // Record answer
        this.answers.push({
            scenario: this.currentScenario,
            direction,
            isCorrect: option.isCorrect
        });
        
        // Update score
        if (option.isCorrect) {
            this.score++;
        }
        
        // Hide scenario UI
        this.hideScenario();
        
        // Show feedback immediately (car stays stopped, waiting for OK)
        this.showFeedback(option);
    }
    
    showFeedback(option) {
        // Update toast content
        this.elements.feedbackIcon.textContent = option.isCorrect ? '✓' : '✗';
        this.elements.feedbackText.textContent = option.feedback;
        
        // Update toast style
        this.elements.feedbackToast.classList.remove('correct', 'incorrect');
        this.elements.feedbackToast.classList.add(option.isCorrect ? 'correct' : 'incorrect');
        
        // Show toast with OK button
        this.elements.feedbackToast.classList.add('visible');
    }
    
    handleFeedbackOk() {
        // Hide the feedback toast
        this.elements.feedbackToast.classList.remove('visible');
        
        // Check if the last answer was wrong — trigger pothole bump as consequence
        const lastAnswer = this.answers[this.answers.length - 1];
        const wasWrong = lastAnswer && !lastAnswer.isCorrect;
        
        if (wasWrong && this.pendingDirection) {
            // Wrong answer — consequence depends on scenario type
            const dir = this.pendingDirection;
            const consequence = this.pendingConsequence || 'pothole';
            this.pendingDirection = null;
            this.pendingConsequence = null;
            
            if (consequence === 'tree') {
                // Tree fell across the road — car swerves around it
                gameRenderer.triggerTreeHit(() => {
                    gameRenderer.turn(dir);
                });
            } else if (consequence === 'bump') {
                // Road debris — car swerves through it
                gameRenderer.triggerSwerve(() => {
                    gameRenderer.turn(dir);
                });
            } else {
                // Pothole — car drops into pothole
                gameRenderer.triggerBump(() => {
                    gameRenderer.turn(dir);
                });
            }
        } else if (this.pendingDirection) {
            // Correct answer → smooth turn directly
            gameRenderer.turn(this.pendingDirection);
            this.pendingDirection = null;
            this.pendingConsequence = null;
        }
    }
    
    onTurnComplete() {
        this.currentScenario++;
        this.updateProgressDots();
        
        if (this.currentScenario >= CONFIG.game.scenarioCount) {
            // Game complete - drive to finish
            setTimeout(() => {
                gameRenderer.driveToFinish();
            }, 500);
            this.isTransitioning = false;
        } else {
            // Car is now driving on new road segment
            // Show next intersection ahead after a comfortable driving stretch
            setTimeout(() => {
                gameRenderer.showNextIntersection();
                gameRenderer.approachIntersection();
            }, 3500);
            // onStopAtIntersection callback will show the scenario
            this.isTransitioning = false;
        }
    }
    
    // === END SCREEN ===
    
    showEndScreen() {
        // Determine message based on score
        let messageKey;
        const thresholds = CONFIG.game.scoreThresholds;
        
        if (this.score >= thresholds.perfect) {
            messageKey = 'perfect';
        } else if (this.score >= thresholds.good) {
            messageKey = 'good';
        } else if (this.score >= thresholds.partial) {
            messageKey = 'partial';
        } else {
            messageKey = 'poor';
        }
        
        const endMessage = CONFIG.game.endMessages[messageKey];
        
        // Update end screen content
        this.elements.endTitle.textContent = endMessage.title;
        this.elements.scoreValue.textContent = this.score;
        this.elements.endMessage.textContent = endMessage.message;
        this.elements.ctaButton.href = CONFIG.branding.ctaLink;
        this.elements.ctaButton.textContent = CONFIG.branding.ctaText;
        
        // Show end screen
        this.showScreen('end');
        
        // Submit final results
        this.submitResults();
    }
    
    async submitResults() {
        if (!CONFIG.leadCapture.enableSubmission) {
            console.log('Results:', {
                email: this.userData.email,
                profile: this.profile,
                score: this.score,
                answers: this.answers
            });
            return;
        }
        
        try {
            await fetch(CONFIG.leadCapture.submitEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.userData.email,
                    profile: this.profile,
                    score: this.score,
                    totalQuestions: CONFIG.game.scenarioCount,
                    answers: this.answers,
                    completedAt: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to submit results:', error);
        }
    }
    
    handlePlayAgain() {
        // Reset game state
        this.currentScenario = 0;
        this.score = 0;
        this.answers = [];
        this.isTransitioning = false;
        this.pendingDirection = null;
        this.pendingConsequence = null;
        
        // Reset renderer
        gameRenderer.reset();
        
        // Reset reCAPTCHA if available
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
        
        // Go back to email screen
        this.showScreen('email');
        
        // Restart homepage animation
        if (this.homeAnimation) {
            this.homeAnimation.start();
        }
    }
    
    initHomeAnimation() {
        try {
            const canvas = document.getElementById('home-animation');
            if (canvas) {
                this.homeAnimation = new HomeAnimation(canvas);
                this.homeAnimation.start();
            }
        } catch (e) {
            console.error('Home animation error:', e);
        }
    }
    
    stopHomeAnimation() {
        if (this.homeAnimation) {
            this.homeAnimation.stop();
        }
    }
}

/**
 * HomeAnimation - Animated background for email capture screen
 * Shows a car driving on a winding road with trees and scenery
 */
class HomeAnimation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationId = null;
        this.isRunning = false;
        
        // Animation state
        this.time = 0;
        this.carX = 0;
        this.carProgress = 0;
        
        // Setup
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // Helper for rounded rectangles (cross-browser compatible)
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.time += 0.016;
        this.carProgress += 0.003;
        if (this.carProgress > 1) this.carProgress = 0;
        
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        
        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, h);
        skyGradient.addColorStop(0, '#4a6fa5');
        skyGradient.addColorStop(0.5, '#7b9cc4');
        skyGradient.addColorStop(1, '#a8c6db');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, w, h);
        
        // Sun
        ctx.beginPath();
        ctx.arc(w * 0.85, h * 0.15, 60, 0, Math.PI * 2);
        const sunGradient = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, 60);
        sunGradient.addColorStop(0, '#fff5cc');
        sunGradient.addColorStop(1, '#ffdd44');
        ctx.fillStyle = sunGradient;
        ctx.fill();
        
        // Distant hills
        ctx.fillStyle = '#5d7a5d';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        for (let x = 0; x <= w; x += 50) {
            const y = h * 0.5 - Math.sin(x * 0.008 + 1) * 40 - Math.sin(x * 0.003) * 60;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Mid hills
        ctx.fillStyle = '#6d8a6d';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.55);
        for (let x = 0; x <= w; x += 30) {
            const y = h * 0.55 - Math.sin(x * 0.01 + 2.5) * 35 - Math.sin(x * 0.004) * 50;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Green grass field
        ctx.fillStyle = '#5a9a5a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.6);
        for (let x = 0; x <= w; x += 20) {
            const y = h * 0.6 - Math.sin(x * 0.015 + this.time) * 15;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Road (curved path across screen)
        this.drawRoad(ctx, w, h);
        
        // Trees along road
        this.drawTrees(ctx, w, h);
        
        // Fences
        this.drawFences(ctx, w, h);
        
        // Draw car on road
        this.drawCar(ctx, w, h);
        
        // Clouds
        this.drawClouds(ctx, w, h);
    }
    
    drawRoad(ctx, w, h) {
        ctx.save();
        
        // Road path - curves from left to right
        ctx.beginPath();
        ctx.moveTo(-50, h * 0.85);
        ctx.bezierCurveTo(
            w * 0.25, h * 0.65,
            w * 0.75, h * 0.75,
            w + 50, h * 0.7
        );
        ctx.lineTo(w + 50, h * 0.76);
        ctx.bezierCurveTo(
            w * 0.75, h * 0.81,
            w * 0.25, h * 0.71,
            -50, h * 0.91
        );
        ctx.closePath();
        
        ctx.fillStyle = '#3a3a3a';
        ctx.fill();
        
        // Center line (dashed yellow)
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(-50, h * 0.88);
        ctx.bezierCurveTo(
            w * 0.25, h * 0.68,
            w * 0.75, h * 0.78,
            w + 50, h * 0.73
        );
        ctx.stroke();
        
        // Edge lines (white)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Left edge
        ctx.beginPath();
        ctx.moveTo(-50, h * 0.85);
        ctx.bezierCurveTo(
            w * 0.25, h * 0.65,
            w * 0.75, h * 0.75,
            w + 50, h * 0.7
        );
        ctx.stroke();
        
        // Right edge  
        ctx.beginPath();
        ctx.moveTo(-50, h * 0.91);
        ctx.bezierCurveTo(
            w * 0.25, h * 0.71,
            w * 0.75, h * 0.81,
            w + 50, h * 0.76
        );
        ctx.stroke();
        
        ctx.restore();
    }
    
    getRoadPoint(t, w, h) {
        // Bezier interpolation for road path
        const p0 = { x: -50, y: h * 0.88 };
        const p1 = { x: w * 0.25, y: h * 0.68 };
        const p2 = { x: w * 0.75, y: h * 0.78 };
        const p3 = { x: w + 50, y: h * 0.73 };
        
        const mt = 1 - t;
        const x = mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x;
        const y = mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y;
        
        // Calculate tangent for rotation
        const dx = -3*mt*mt*p0.x + 3*(mt*mt - 2*mt*t)*p1.x + 3*(2*mt*t - t*t)*p2.x + 3*t*t*p3.x;
        const dy = -3*mt*mt*p0.y + 3*(mt*mt - 2*mt*t)*p1.y + 3*(2*mt*t - t*t)*p2.y + 3*t*t*p3.y;
        const angle = Math.atan2(dy, dx);
        
        return { x, y, angle };
    }
    
    drawCar(ctx, w, h) {
        const pos = this.getRoadPoint(this.carProgress, w, h);
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle);
        
        // Scale based on position (perspective)
        const scale = 0.7 + (1 - this.carProgress) * 0.4;
        ctx.scale(scale, scale);
        
        const carLength = 70;
        const carWidth = 35;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(5, 8, carLength / 2, carWidth / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Car body (copper bronze)
        ctx.fillStyle = '#B87333';
        ctx.beginPath();
        this.drawRoundedRect(ctx, -carLength/2, -carWidth/2, carLength, carWidth, 8);
        ctx.fill();
        
        // Darker bottom
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(-carLength/2 + 5, carWidth/2 - 6, carLength - 10, 6);
        
        // Cabin
        ctx.fillStyle = '#B87333';
        ctx.beginPath();
        this.drawRoundedRect(ctx, -carLength/4, -carWidth/2 + 3, carLength/2, carWidth - 6, 5);
        ctx.fill();
        
        // Windows (glass)
        ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        ctx.fillRect(-carLength/4 + 3, -carWidth/2 + 6, carLength/2 - 6, carWidth - 12);
        
        // Front windshield highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(carLength/4 - 3, -carWidth/2 + 6);
        ctx.lineTo(carLength/4 - 3, carWidth/2 - 6);
        ctx.lineTo(carLength/4 - 10, carWidth/2 - 8);
        ctx.lineTo(carLength/4 - 10, -carWidth/2 + 8);
        ctx.closePath();
        ctx.fill();
        
        // Wheels
        ctx.fillStyle = '#1a1a1a';
        const wheelPositions = [
            { x: -carLength/3, y: -carWidth/2 - 2 },
            { x: -carLength/3, y: carWidth/2 + 2 },
            { x: carLength/3, y: -carWidth/2 - 2 },
            { x: carLength/3, y: carWidth/2 + 2 }
        ];
        
        wheelPositions.forEach(wp => {
            ctx.beginPath();
            ctx.ellipse(wp.x, wp.y, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hubcap
            ctx.fillStyle = '#cccccc';
            ctx.beginPath();
            ctx.ellipse(wp.x, wp.y, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
        });
        
        // Headlights
        ctx.fillStyle = '#ffffcc';
        ctx.beginPath();
        ctx.ellipse(carLength/2 - 5, -carWidth/4, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(carLength/2 - 5, carWidth/4, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Taillights
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.ellipse(-carLength/2 + 5, -carWidth/4, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-carLength/2 + 5, carWidth/4, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Chrome bumper
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(carLength/2 - 3, -carWidth/2 + 3, 3, carWidth - 6);
        
        ctx.restore();
    }
    
    drawTrees(ctx, w, h) {
        const treePositions = [
            { x: w * 0.1, y: h * 0.58, scale: 0.8 },
            { x: w * 0.2, y: h * 0.55, scale: 0.7 },
            { x: w * 0.35, y: h * 0.52, scale: 0.6 },
            { x: w * 0.55, y: h * 0.54, scale: 0.65 },
            { x: w * 0.7, y: h * 0.56, scale: 0.75 },
            { x: w * 0.85, y: h * 0.53, scale: 0.7 },
            { x: w * 0.95, y: h * 0.57, scale: 0.8 },
            // Bottom trees (larger, closer)
            { x: w * 0.05, y: h * 0.92, scale: 1.2 },
            { x: w * 0.15, y: h * 0.95, scale: 1.1 },
            { x: w * 0.88, y: h * 0.82, scale: 1.0 },
            { x: w * 0.98, y: h * 0.88, scale: 1.15 },
        ];
        
        treePositions.forEach(tree => {
            this.drawTree(ctx, tree.x, tree.y, tree.scale);
        });
    }
    
    drawTree(ctx, x, y, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-6, -50, 12, 50);
        
        // Foliage layers
        ctx.fillStyle = '#2e7d32';
        
        // Bottom layer
        ctx.beginPath();
        ctx.moveTo(-35, -45);
        ctx.lineTo(0, -90);
        ctx.lineTo(35, -45);
        ctx.closePath();
        ctx.fill();
        
        // Middle layer
        ctx.beginPath();
        ctx.moveTo(-28, -70);
        ctx.lineTo(0, -110);
        ctx.lineTo(28, -70);
        ctx.closePath();
        ctx.fill();
        
        // Top layer
        ctx.beginPath();
        ctx.moveTo(-20, -95);
        ctx.lineTo(0, -130);
        ctx.lineTo(20, -95);
        ctx.closePath();
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.moveTo(-8, -95);
        ctx.lineTo(0, -125);
        ctx.lineTo(8, -95);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    drawFences(ctx, w, h) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        
        // Left fence
        const leftFenceY = h * 0.75;
        for (let x = 0; x < w * 0.35; x += 25) {
            const postY = leftFenceY + (x / w) * 30;
            // Post
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x, postY - 25, 4, 30);
            // Rails
            if (x > 0) {
                ctx.beginPath();
                ctx.moveTo(x - 25 + 2, postY - 20);
                ctx.lineTo(x + 2, postY - 20 + 1);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - 25 + 2, postY - 8);
                ctx.lineTo(x + 2, postY - 7);
                ctx.stroke();
            }
        }
        
        // Right fence
        const rightFenceY = h * 0.65;
        for (let x = w * 0.65; x < w; x += 25) {
            const postY = rightFenceY + ((x - w * 0.65) / (w * 0.35)) * 20;
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x, postY - 25, 4, 30);
            if (x > w * 0.65) {
                ctx.beginPath();
                ctx.moveTo(x - 25 + 2, postY - 20 - 1);
                ctx.lineTo(x + 2, postY - 20);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - 25 + 2, postY - 8 - 1);
                ctx.lineTo(x + 2, postY - 8);
                ctx.stroke();
            }
        }
    }
    
    drawClouds(ctx, w, h) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        const clouds = [
            { x: w * 0.15 + Math.sin(this.time * 0.2) * 20, y: h * 0.12, scale: 1 },
            { x: w * 0.45 + Math.sin(this.time * 0.15 + 1) * 15, y: h * 0.08, scale: 0.8 },
            { x: w * 0.7 + Math.sin(this.time * 0.18 + 2) * 18, y: h * 0.15, scale: 0.9 },
        ];
        
        clouds.forEach(cloud => {
            ctx.save();
            ctx.translate(cloud.x, cloud.y);
            ctx.scale(cloud.scale, cloud.scale);
            
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.arc(30, -5, 25, 0, Math.PI * 2);
            ctx.arc(55, 0, 28, 0, Math.PI * 2);
            ctx.arc(25, 10, 22, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    game.init();
});