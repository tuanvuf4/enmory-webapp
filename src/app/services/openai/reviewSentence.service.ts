/**
 * Sentence review service.
 * Migrated to Google Gemini for review, grammar, and style checking.
 */
export {
  type IReviewSentenceRequest,
  type IReviewSentenceResponse,
  type IReviewSuggestion,
  geminiReviewSentenceService,
  reviewSentenceService,
} from '../gemini/geminiReviewSentence.service'
