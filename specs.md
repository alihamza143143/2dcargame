JOHNSON McGINNIS AI GAME — COMPLETE DEVELOPER SPECIFICATION
PROJECT OVERVIEW
This is an interactive, lead-generation game designed to educate seniors and adult children about estate planning and life care planning while capturing qualified leads for Johnson McGinnis, an elder law firm in Tennessee.
________________________________________
GAME CONCEPT & CORE MECHANICS
Game Format
●	Primary Mechanic: Car driving down a road encountering forks in the road
●	Visual Journey: Player drives a car through a Tennessee-themed landscape, encountering obstacles and decision points
●	Target Play Time: Approximately 1 minute (more than 1-2 clicks, but brief and engaging)
●	Interaction Type: Multiple-choice decisions (NOT essays or text input)
Decision Points & Triggers
The car encounters various obstacles that trigger decision scenarios:
●	Stop signs
●	Traffic lights
●	Detours
●	Potholes
●	Trees in the road
●	Unexpected events (tree branch falls, etc.)
●	Other road hazards
Each obstacle triggers a multiple-choice question related to life care planning or estate planning.
Immediate Feedback System
Players receive immediate responses to their choices:
●	Positive outcomes: "That was probably the best you could do" → car continues driving
●	Negative outcomes: "You ran into the tree. So sorry to be you, called Johnson McGinnis" → car continues with consequence
●	Consequence-driven gameplay: Potholes, tree falls, and unexpected events create real consequences for poor choices
●	Varied messaging: Different response types keep gameplay engaging
Game Ending
●	Visual Finish: Car pulls into a parking lot with the Johnson McGinnis sign
●	Messaging: "Your estate plan needs attention" or "You need help" (exact wording to be finalized)
●	Call-to-action: Visual cue that directs player to contact Johnson McGinnis
●	Variable endings based on performance:
○	Perfect score: Different message
○	Partial score: Different message
○	All wrong: Different message
○	Examples to be provided in shared Google Doc
VISUAL & BRANDING DIRECTION
Aesthetic Guidelines
Overall Feel
●	Animated but NOT childish: Avoid cartoonish or hyper-realistic (like Call of Duty) visuals
●	Relatable to seniors: Design for the target audience's visual preferences
●	Soft scenery: Gentle, warm aesthetic
●	Station-wagon cars: Not sporty or modern; classic, family-oriented vehicles
●	Avoid: Sharp angles, Minecraft-esque graphics, overly bright colors
Tennessee Theming
●	Local elements: Barns, lakes, local skyline
●	Color palette: Warm, fuzzy Tennessee colors (NOT pink and green like Wicked)
●	Scenery: Change all visual elements to reflect Tennessee landscape
●	Weather: Reflect Tennessee climate and seasons
Branding Integration
Subtle placement throughout:
●	Logo placement: Appear during scenarios naturally
●	Billboards: Along the road as subliminal branding hints
●	Office drive-by: Player drives past Johnson McGinnis office
●	Blimp/aerial: Optional branding element
●	Finish line: Car pulls into parking lot with Johnson McGinnis sign (primary branding moment)
Visual Consistency
●	Car should feel like a journey where choices matter
●	Movement should feel natural (bouncing when moving, not when stationary)
●	Forks in the road preferred over stoplights (feels like a complete journey, not just a pause)
●	All visual/text elements can be changed and customized
________________________________________
USER FLOW & LEAD CAPTURE
Access Point
●	Website Link: Button on Johnson McGinnis website labeled "Play Our Game" or "Choose Your Path"
●	New URL: Opens in new window/tab
●	Standalone Experience: Separate from main website
Step 1: Email Capture (REQUIRED)
Timing: BEFORE gameplay begins (not at end)
Rationale: Avoid "rug pulled out" feeling; clear expectations upfront
Required Field:
●	Email address only (NO phone number, home address, or extra information)
Verification:
●	Include reCAPTCHA verification
●	Users cannot play without providing email
Optional Checkboxes (allow skipping):
●	"Are you over 18?"
●	"Are you in Tennessee?"
UX Note: If users decline to provide email, they cannot play. This is the "price of entry."
Step 2: Profile Selection (OPTIONAL)
After email capture, ask player to select their profile:
●	Senior: Scenarios resonate with someone managing their own estate
●	Child of Senior: Scenarios resonate with adult children concerned about aging parents
●	Other: Additional profile options as needed
Rationale: Personalize scenario relevance based on player perspective
Step 3: Gameplay
Player drives through scenarios and makes choices (see Game Mechanics section)
Step 4: Game Completion & Ending
●	Visual: Car pulls into parking lot with Johnson McGinnis sign
●	Message: "Your estate plan needs attention" / "You need help" (varies by performance)
●	Call-to-action: Implicit direction to contact Johnson McGinnis
________________________________________
SCENARIO CONTENT & QUESTION STRATEGY
Topics to Address
Each scenario should focus on one of these life care planning or estate planning issues:
●	Remarriage & blended family planning
●	Probate avoidance
●	Diagnosis-driven prompts (e.g., "You have a diagnosis of dementia")
●	Care and long-term care planning
●	Crisis situations (health crisis, financial crisis, unexpected events)
●	Estate planning fundamentals
Scenario Structure
Each scenario includes:
1.	Situation description: Brief setup (e.g., "You've just received a dementia diagnosis")
2.	Multiple-choice options: 2-4 choices for how to respond
3.	Immediate feedback: Response message for each choice
4.	Consequence: How the choice affects the journey (car continues, hits pothole, etc.)
5.	Branching questions (optional): Additional data collection questions
Example Scenario Structure
SITUATION: "You just received a diagnosis of dementia. What do you do?"

CHOICE 1: "Ignore it and continue as normal"
FEEDBACK: "You ran into the tree. So sorry to be you, called Johnson McGinnis."
CONSEQUENCE: Car hits tree, continues

CHOICE 2: "Contact a life care planning attorney"
FEEDBACK: "That was probably the best you could do."
CONSEQUENCE: Car continues smoothly

CHOICE 3: "Talk to family members"
FEEDBACK: "Good start, but you might need professional guidance."
CONSEQUENCE: Car continues but encounters next obstacle
]
LEAD CAPTURE & SEGMENTATION
Data Collection Points
1.	Email (required)
2.	Age verification (optional checkbox: "Are you over 18?")
3.	Geographic location (optional checkbox: "Are you in Tennessee?")
Lead Routing
●	Primary destination: Mailchimp (current preference)
●	Auto-import: Captured emails automatically imported into Mailchimp
●	Multiple destinations: Can be routed to multiple platforms as needed
●	Integration: Zapier acceptable for routing

Ok! Here are more notes to help:



What it is: A first-person driving game where you're behind the wheel driving through Tennessee. You drive continuously until you reach a 4-way stop intersection, answer a question by choosing a direction, and then the car actually turns and drives down that new road. The camera follows the car.



Driving View:



You see the road from slightly behind/above the car. The road stretches ahead with proper lane markings, shoulders, and scenery on both sides Trees, fences, barns, fields pass by on left and right as you drive. Sky above, road ahead - like you're actually driving.



Approaching the Intersection:



You see a 4-way stop intersection ahead in the distance Stop signs visible The car slows down and stops at the intersection You can see roads going left, straight, and right from your position



The Question Appears:



A question card/overlay appears on screen Three answers shown, each labeled with a direction:



← LEFT: "Answer option A" ↑ STRAIGHT: "Answer option B" → RIGHT: "Answer option C"



Road signs at the intersection could also show these options



Making Your Choice:



Click LEFT, STRAIGHT, or RIGHT The car actually turns that direction - you see the turn happen Camera follows the car as it makes the turn If you chose LEFT, you're now driving down the left road If you chose STRAIGHT, you continue forward If you chose RIGHT, you're now on the right road



Feedback While Driving:



After turning, a brief message appears showing if you were right or wrong "Correct! ✓" or "Wrong turn! ✗" with short explanation Car keeps driving down the new road



Repeat:



Drive down this new road Scenery continues (different trees, maybe a lake, farmland, etc.) Approach another 4-way stop Next question appears Choose direction, car turns, keep going 6 intersections total



Final Destination:



After the 6th question, instead of another intersection, you arrive at the Johnson McGinnis office Car pulls into the parking lot Results screen shows your score



Visual Style:



Clean and realistic, NOT cartoonish Think: Google Maps 3D driving view or a driving simulator Proper road textures, realistic stop signs, painted road lines Tennessee landscape: rolling green hills, scattered trees, red barns in the distance, maybe mountains on the horizon Natural lighting, blue sky with some clouds The car interior or hood visible at bottom of screen (optional)



Camera Behavior:



Follows behind/above the car When car turns, camera smoothly rotates to follow the new direction Always facing the direction the car is heading