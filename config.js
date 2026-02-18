/**
 * Configuration for Johnson McGinnis Estate Planning Game
 * All tunable constants and settings
 */

const CONFIG = {
    // === COLOR PALETTE ===
    colors: {
        // Sky
        skyTop: '#87CEEB',
        skyBottom: '#B0D4E8',
        
        // Landscape
        hillDark: '#3D6B24',
        hillMid: '#4A7C2E',
        hillLight: '#5A9E3A',
        grass: '#4A7C2E',
        
        // Road
        road: '#555555',
        roadShoulder: '#666666',
        roadEdge: '#444444',
        laneLine: '#F5C518',
        laneLineDash: '#FFFFFF',
        stopSign: '#CC0000',
        stopSignText: '#FFFFFF',
        
        // Car
        carBody: '#D4956A',
        carBodyDark: '#B8824F',
        carRoof: '#C4855A',
        carWindow: '#87CEEB',
        carWindowShine: '#FFFFFF',
        carWheel: '#333333',
        carWheelHub: '#666666',
        
        // Arrows
        arrowGreen: '#4CAF50',
        arrowGreenDark: '#388E3C',
        
        // Scenery
        treeTrunk: '#8B4513',
        treeLeaves: '#228B22',
        treeLeavesLight: '#32CD32',
        barnWall: '#8B0000',
        barnRoof: '#654321',
        fencePost: '#8B7355',
        
        // Branding
        brandOrange: '#F5A623',
        brandOrangeDark: '#E6951A'
    },
    
    // === TIMING & SPEEDS ===
    speeds: {
        // Driving animation
        drivingSpeed: 2,              // Base road scroll speed
        roadLineSpeed: 4,             // Road line animation speed
        scenerySpeed: 0.5,            // Parallax scenery speed
        
        // Transitions
        approachDuration: 1200,       // ms to slow down at intersection
        turnDuration: 1200,           // ms for turning animation
        feedbackDisplayMs: 2500,      // ms to show feedback toast
        drivingSegmentMs: 2000,       // ms of driving between intersections (short drive)
        arrivalDuration: 2000,        // ms for final arrival animation
        
        // Car animation
        bounceSpeed: 0.003,           // Car bounce frequency
        bounceAmount: 2               // Car bounce pixels
    },
    
    // === GAME SETTINGS ===
    game: {
        scenarioCount: 6,
        
        // End messages based on score
        endMessages: {
            perfect: {
                title: "Excellent Planning!",
                message: "You made all the right choices! You clearly understand the importance of proper estate and life care planning. Let's make sure your plan is as solid as your knowledge."
            },
            good: {
                title: "Good Progress!",
                message: "You're on the right track with your planning decisions. A few areas could use some professional guidance to ensure you're fully protected."
            },
            partial: {
                title: "Room for Improvement",
                message: "Your estate plan needs attention. Some of your choices could lead to complications for you or your loved ones. Let's work together to strengthen your plan."
            },
            poor: {
                title: "Time to Take Action",
                message: "Your journey revealed some critical gaps in your planning knowledge. Don't worry—that's why we're here. Let us help you protect what matters most."
            }
        },
        
        // Score thresholds
        scoreThresholds: {
            perfect: 6,    // 6/6
            good: 4,       // 4-5/6
            partial: 2,    // 2-3/6
            poor: 0        // 0-1/6
        }
    },
    
    // === BRANDING ===
    branding: {
        firmName: 'Johnson McGinnis',
        tagline: 'Elder Law Attorneys',
        ctaText: 'Schedule a Consultation',
        ctaLink: 'https://johnsonmcginnis.com/contact',
        websiteUrl: 'https://johnsonmcginnis.com',
        logoText: 'JOHNSON McGINNIS'
    },
    
    // === LEAD CAPTURE ===
    leadCapture: {
        // Google reCAPTCHA - Using test key (replace with real key in production)
        recaptchaSiteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
        
        // Mailchimp/Zapier endpoint (replace with real endpoint)
        submitEndpoint: 'https://hooks.zapier.com/hooks/catch/YOUR_ZAPIER_HOOK',
        
        // Enable/disable actual submission (set false for testing)
        enableSubmission: false
    },
    
    // === CANVAS SETTINGS ===
    canvas: {
        // Reference dimensions (actual canvas scales to fit)
        refWidth: 1400,
        refHeight: 788,
        
        // Perspective settings
        vanishingPointY: 0.38,     // Horizon line position (0-1)
        roadWidthBottom: 0.35,    // Road width at bottom (0-1 of canvas)
        roadWidthTop: 0.08,       // Road width at horizon (0-1 of canvas)
        
        // Car position
        carPositionY: 0.82,       // Car vertical position (0-1)
        carScale: 0.12            // Car size relative to canvas height
    }
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.colors);
Object.freeze(CONFIG.speeds);
Object.freeze(CONFIG.game);
Object.freeze(CONFIG.game.endMessages);
Object.freeze(CONFIG.game.scoreThresholds);
Object.freeze(CONFIG.branding);
Object.freeze(CONFIG.leadCapture);
Object.freeze(CONFIG.canvas);
