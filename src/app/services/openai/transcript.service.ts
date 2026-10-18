/**
 * Transcript generation service.
 * Migrated to Google Gemini for enhanced capability and performance.
 */
export {
  DEFAULT_TRANSCRIPT_DESCRIPTION,
  type IGenerateTranscriptResponse,
  geminiTranscriptService,
  geminiTranscriptService as transcriptService,
} from '../gemini/geminiTranscript.service'
