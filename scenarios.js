/**
 * Scenario Content for Johnson McGinnis Estate Planning Game
 * 6 scenarios covering key estate and life care planning topics
 */

const SCENARIOS = [
    // === SCENARIO 1: Estranged Child ===
    {
        id: 1,
        title: "You Have an Estranged Child",
        description: {
            senior: "After years of silence, you are drafting your will. Your son, Alex, with whom you have been estranged for a decade, is not included. Do you need to mention him at all?",
            child: "Your parent is drafting their will. They haven't spoken to your sibling Alex in a decade and want to leave them out. What should they do?",
            other: "When drafting a will, an estranged child hasn't been in contact for a decade. The parent wants to leave them out. What's the best approach?"
        },
        options: [
            {
                label: "Option A",
                text: "Leave him out—he won't show up anyway",
                direction: "left",
                isCorrect: false,
                feedback: "Risky move! Not mentioning an heir can lead to legal challenges. The estranged child could contest the will, claiming they were forgotten rather than intentionally excluded.",
                consequence: "pothole"
            },
            {
                label: "Option B",
                text: "Leave him $1 to show I remembered him",
                direction: "straight",
                isCorrect: false,
                feedback: "A common myth! Leaving $1 can actually be seen as insulting and may increase the likelihood of a contest. There are better legal strategies.",
                consequence: "bump"
            },
            {
                label: "Option C",
                text: "Contact an Elder Law Attorney",
                direction: "right",
                isCorrect: true,
                feedback: "Smart choice! An attorney can help you properly document your intentions, use specific legal language, and structure your estate to minimize the chance of a successful contest.",
                consequence: "smooth"
            }
        ]
    },
    
    // === SCENARIO 2: Dementia Diagnosis ===
    {
        id: 2,
        title: "You've Received a Diagnosis",
        description: {
            senior: "You've just been diagnosed with early-stage dementia. You're still mentally capable of making decisions, but you know that may change. What do you do first?",
            child: "Your parent has just been diagnosed with early-stage dementia. They can still make decisions now, but that may change. What should they do first?",
            other: "Someone receives an early-stage dementia diagnosis. They're currently capable of making decisions. What's the most important first step?"
        },
        options: [
            {
                label: "Option A",
                text: "Wait and see how things progress",
                direction: "left",
                isCorrect: false,
                feedback: "Time is critical! Waiting can result in losing the legal capacity to make important decisions. Once capacity is lost, options become limited and more expensive.",
                consequence: "tree"
            },
            {
                label: "Option B",
                text: "Immediately sign documents a family member prepared",
                direction: "straight",
                isCorrect: false,
                feedback: "Dangerous shortcut! Documents not prepared by qualified professionals may not be valid, could be challenged, or might not include crucial protections you need.",
                consequence: "pothole"
            },
            {
                label: "Option C",
                text: "Consult a Life Care Planning attorney quickly",
                direction: "right",
                isCorrect: true,
                feedback: "Excellent decision! Acting while you still have capacity allows you to establish powers of attorney, healthcare directives, and protect your assets through proper legal channels.",
                consequence: "smooth"
            }
        ]
    },
    
    // === SCENARIO 3: Remarriage & Blended Family ===
    {
        id: 3,
        title: "A New Chapter Begins",
        description: {
            senior: "After losing your spouse, you've found love again and are considering remarriage. You have children from your first marriage and want to protect their inheritance. How do you proceed?",
            child: "Your widowed parent wants to remarry. You're happy for them but concerned about protecting the family home and your inheritance. What should they do?",
            other: "A widowed senior is remarrying and has children from a previous marriage. How should they handle estate planning to protect everyone's interests?"
        },
        options: [
            {
                label: "Option A",
                text: "Trust that our new spouse will do the right thing",
                direction: "left",
                isCorrect: false,
                feedback: "Hope is not a plan! Without proper legal protections, your new spouse could inherit everything, potentially leaving your children with nothing—regardless of verbal promises.",
                consequence: "pothole"
            },
            {
                label: "Option B",
                text: "Keep finances completely separate",
                direction: "straight",
                isCorrect: false,
                feedback: "Not enough protection! While separating finances helps, it doesn't fully protect your children's inheritance. State laws about spousal rights can override informal arrangements.",
                consequence: "bump"
            },
            {
                label: "Option C",
                text: "Work with an attorney on a prenuptial agreement and updated estate plan",
                direction: "right",
                isCorrect: true,
                feedback: "Perfect approach! A prenuptial agreement combined with properly structured trusts can protect your children's inheritance while still providing for your new spouse.",
                consequence: "smooth"
            }
        ]
    },
    
    // === SCENARIO 4: Probate Concerns ===
    {
        id: 4,
        title: "Avoiding the Probate Maze",
        description: {
            senior: "You own your home and have savings accounts. Your children have mentioned that \"probate is expensive and takes forever.\" What's the best way to help your heirs avoid this?",
            child: "Your parent owns a home and has savings. You've heard probate can be costly and time-consuming. What should you encourage them to do?",
            other: "A senior has a home and savings accounts. Their family wants to avoid probate. What's the most effective strategy?"
        },
        options: [
            {
                label: "Option A",
                text: "Add my children to all my accounts and deed",
                direction: "left",
                isCorrect: false,
                feedback: "Major risks ahead! Adding children to accounts exposes your assets to their creditors, divorces, and lawsuits. It can also trigger gift taxes and Medicaid penalties.",
                consequence: "tree"
            },
            {
                label: "Option B",
                text: "A will should be enough to avoid probate",
                direction: "straight",
                isCorrect: false,
                feedback: "Common misconception! A will actually guarantees probate—it's the document the probate court uses to distribute your estate. Wills don't avoid probate; they guide it.",
                consequence: "pothole"
            },
            {
                label: "Option C",
                text: "Explore trusts and beneficiary designations with an attorney",
                direction: "right",
                isCorrect: true,
                feedback: "You're on the right path! Properly structured trusts, beneficiary designations, and transfer-on-death deeds can help your estate pass directly to heirs without probate.",
                consequence: "smooth"
            }
        ]
    },
    
    // === SCENARIO 5: Long-Term Care Crisis ===
    {
        id: 5,
        title: "A Health Crisis Strikes",
        description: {
            senior: "You've been hospitalized after a fall. The doctor says you'll need nursing home care for rehabilitation, possibly long-term. You're worried about the cost depleting your life savings. What do you do?",
            child: "Your parent has been hospitalized after a fall and may need nursing home care. The costs could wipe out their savings. What action should be taken?",
            other: "After a fall, a senior needs nursing home care. The family is concerned about costs depleting their life savings. What's the best approach?"
        },
        options: [
            {
                label: "Option A",
                text: "Quickly transfer assets to family members",
                direction: "left",
                isCorrect: false,
                feedback: "Serious consequences! Transferring assets within 5 years of needing Medicaid creates a penalty period where you're ineligible. This could leave you without coverage when you need it most.",
                consequence: "tree"
            },
            {
                label: "Option B",
                text: "Just pay out of pocket and hope for the best",
                direction: "straight",
                isCorrect: false,
                feedback: "Financially devastating! Nursing home costs average $8,000-$10,000 per month. Without proper planning, a lifetime of savings can be depleted in just a few years.",
                consequence: "pothole"
            },
            {
                label: "Option C",
                text: "Contact a Medicaid planning attorney immediately",
                direction: "right",
                isCorrect: true,
                feedback: "Critical and correct! An experienced elder law attorney can help you navigate Medicaid eligibility rules, protect assets legally, and potentially save hundreds of thousands of dollars.",
                consequence: "smooth"
            }
        ]
    },
    
    // === SCENARIO 6: Power of Attorney ===
    {
        id: 6,
        title: "Planning for the Unexpected",
        description: {
            senior: "You're healthy now, but you want to make sure someone can manage your affairs if you become incapacitated. Your adult child offers to help you download a power of attorney form online. What do you do?",
            child: "Your parent is healthy but wants to plan ahead. They're considering downloading a power of attorney form online. What should you advise?",
            other: "A healthy senior wants to establish power of attorney for future incapacity. They're considering using an online form. What's the best approach?"
        },
        options: [
            {
                label: "Option A",
                text: "Online forms are fine—they're all the same",
                direction: "left",
                isCorrect: false,
                feedback: "A costly assumption! Generic forms often lack state-specific requirements, important powers for healthcare and financial decisions, and may not hold up when you need them most.",
                consequence: "pothole"
            },
            {
                label: "Option B",
                text: "Wait until I actually need it to worry about it",
                direction: "straight",
                isCorrect: false,
                feedback: "Too late! If you become incapacitated without a power of attorney, your family must go through expensive guardianship court proceedings to make decisions for you.",
                consequence: "tree"
            },
            {
                label: "Option C",
                text: "Have an attorney draft comprehensive documents",
                direction: "right",
                isCorrect: true,
                feedback: "Wise choice! An attorney creates documents tailored to Tennessee law, including durable powers of attorney, healthcare directives, and HIPAA authorizations that work together to protect you.",
                consequence: "smooth"
            }
        ]
    }
];

/**
 * Get scenario description based on selected profile
 * @param {number} scenarioIndex - Index of the scenario (0-5)
 * @param {string} profile - Profile type ('senior', 'child', 'other')
 * @returns {object} - Scenario with appropriate description
 */
function getScenarioForProfile(scenarioIndex, profile) {
    const scenario = SCENARIOS[scenarioIndex];
    const profileKey = profile || 'senior';
    
    return {
        ...scenario,
        displayDescription: scenario.description[profileKey] || scenario.description.senior
    };
}

// Freeze scenarios to prevent modification
Object.freeze(SCENARIOS);
SCENARIOS.forEach(scenario => {
    Object.freeze(scenario);
    Object.freeze(scenario.description);
    Object.freeze(scenario.options);
    scenario.options.forEach(option => Object.freeze(option));
});
