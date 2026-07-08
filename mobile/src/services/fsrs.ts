
import { Card, Rating } from '../types';

// Default parameters for FSRS-4.5, using a standard weight set.
const W = [
    0.89, 1.37, 4.04, 9.48, // w[0-3]: initial stability for ratings [again, hard, good, easy]
    4.55, 0.48,             // w[4-5]: difficulty parameters
    0.9,                    // w[6]: difficulty change factor
    0.0,                    // w[7]: (unused)
    1.62, 0.1,  0.95,       // w[8-10]: stability parameters for success
    1.95, 0.21, 0.89, 0.04, // w[11-14]: stability parameters for failure (relearning)
    1.28, 2.99,             // w[15-16]: multipliers for 'hard' and 'easy' ratings
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0); // Normalize time to start of day
  result.setDate(result.getDate() + Math.round(days));
  return result;
}

/**
 * The main function to calculate the next review date for a card.
 */
export function calculateNextReview(card: Card, rating: Rating): Card {
    const now = new Date();
    
    // For new cards, the logic is simpler.
    if (card.state === 'NEW') {
        return scheduleAsNew(card, rating, now);
    }
    
    // For existing cards, we calculate retrievability.
    // This is an approximation since we don't store the last review date.
    // We assume the card was reviewed on its due date, so elapsed days equals previous stability.
    // This is a reasonable simplification for users who study consistently.
    const onTimeElapsedDays = card.stability;
    const retrievability = Math.exp(Math.log(0.9) * onTimeElapsedDays / card.stability); // This will be 0.9 for on-time reviews

    // The state determines the next step.
    if (card.state === 'LEARNING' || card.state === 'RELEARNING') {
        return scheduleAsLearning(card, rating, now, retrievability);
    }

    if (card.state === 'REVIEW') {
        return scheduleAsReview(card, rating, now, retrievability);
    }

    // Should not be reached
    return card;
}

/**
 * Schedules a card that has never been reviewed before.
 */
function scheduleAsNew(card: Card, rating: Rating, now: Date): Card {
    const updatedCard: Card = {
        ...card,
        reps: 1,
        lapses: 0,
        dueDate: now,
        difficulty: Math.max(1, Math.min(10, W[4] - W[5] * (rating - 3))),
        stability: W[rating - 1], // Use initial stabilities from weights
    };

    if (rating === Rating.GOOD || rating === Rating.EASY) {
        // Graduate immediately to REVIEW state, a simplification for this app's model.
        updatedCard.state = 'REVIEW';
        updatedCard.dueDate = addDays(now, updatedCard.stability);
    } else {
        // Stay in LEARNING, due again soon.
        updatedCard.state = 'LEARNING';
        updatedCard.dueDate = addDays(now, 1); // Review tomorrow
    }
    
    return updatedCard;
}

/**
 * Schedules a card that is currently in the learning or relearning phase.
 */
function scheduleAsLearning(card: Card, rating: Rating, now: Date, retrievability: number): Card {
    if (rating === Rating.AGAIN || rating === Rating.HARD) {
        // Not yet learned, remains in the same state, due again soon.
        return {
            ...card,
            dueDate: addDays(now, 1), // Try again tomorrow
        };
    }

    // Graduated from (re)learning to review.
    const graduatedCard: Card = { ...card, state: 'REVIEW' };
    return scheduleAsReview(graduatedCard, rating, now, retrievability);
}


/**
 * Schedules a mature card that is in the review cycle.
 */
function scheduleAsReview(card: Card, rating: Rating, now: Date, retrievability: number): Card {
    const updatedCard: Card = { ...card, state: 'REVIEW' };

    if (rating === Rating.AGAIN) { // Forgotten
        updatedCard.lapses += 1;
        updatedCard.state = 'RELEARNING';

        // Recalculate stability after a lapse (forgetting)
        const stabilityAfterLapse = W[11] * Math.pow(card.difficulty, -W[12]) * (Math.pow(card.stability + 1, W[13]) - 1) * Math.exp((1 - retrievability) * W[14]);
        updatedCard.stability = Math.max(1, stabilityAfterLapse);

        // Schedule for relearning soon
        updatedCard.dueDate = addDays(now, 1);
        return updatedCard;
    }

    // Remembered: Hard, Good, Easy
    updatedCard.reps += 1;
    
    // Update difficulty based on performance
    const newDifficulty = card.difficulty - W[6] * (rating - 3);
    updatedCard.difficulty = Math.max(1, Math.min(10, newDifficulty));
    
    // Calculate new stability for a 'Good' rating
    const stabilityAfterGood = card.stability * (1 + Math.exp(W[8]) * (11 - updatedCard.difficulty) * Math.pow(card.stability, -W[9]) * (Math.exp((1 - retrievability) * W[10]) - 1));

    let newStability = stabilityAfterGood;
    if (rating === Rating.HARD) {
        newStability *= W[15];
    } else if (rating === Rating.EASY) {
        newStability *= W[16];
    }
    
    updatedCard.stability = Math.max(1, newStability);
    updatedCard.dueDate = addDays(now, updatedCard.stability);

    return updatedCard;
}
