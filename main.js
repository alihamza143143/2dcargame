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
        
        // End screen elements
        this.elements.endTitle = document.getElementById('end-title');
        this.elements.scoreValue = document.getElementById('score-value');
        this.elements.endMessage = document.getElementById('end-message');
        this.elements.ctaButton = document.getElementById('cta-button');
        this.elements.playAgainBtn = document.getElementById('play-again');
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
        
        // Play again button
        this.elements.playAgainBtn.addEventListener('click', this.handlePlayAgain);
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
    
    // === SCREEN MANAGEMENT ===
    
    showScreen(screenName) {
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
        
        // Start turn animation
        gameRenderer.turn(direction);
        
        // Show feedback after turn starts
        setTimeout(() => {
            this.showFeedback(option);
        }, 600);
    }
    
    showFeedback(option) {
        // Update toast content
        this.elements.feedbackIcon.textContent = option.isCorrect ? '✓' : '✗';
        this.elements.feedbackText.textContent = option.feedback;
        
        // Update toast style
        this.elements.feedbackToast.classList.remove('correct', 'incorrect');
        this.elements.feedbackToast.classList.add(option.isCorrect ? 'correct' : 'incorrect');
        
        // Show toast
        this.elements.feedbackToast.classList.add('visible');
        
        // Hide after delay
        setTimeout(() => {
            this.elements.feedbackToast.classList.remove('visible');
        }, CONFIG.speeds.feedbackDisplayMs);
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
            // Show next intersection ahead after short drive
            setTimeout(() => {
                gameRenderer.showNextIntersection();
                gameRenderer.approachIntersection();
            }, 1800);
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
        
        // Reset renderer
        gameRenderer.reset();
        
        // Reset reCAPTCHA if available
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
        
        // Go back to email screen
        this.showScreen('email');
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    game.init();
});