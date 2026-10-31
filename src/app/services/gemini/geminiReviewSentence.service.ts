import { GoogleGenAI } from '@google/genai'
import { IHttpResponse } from '@/models/http.model'
import { resolveGeminiApiKey } from './geminiDictionary.service'
import { GEMINI_MODELS } from './geminiModels'
import { generateContentWithTracking } from './geminiTracker.service'

export interface IReviewSuggestion {
  issue: 'grammar' | 'spelling' | 'word-choice' | 'punctuation' | 'style'
  current: string
  suggestion: string
  explanation: string
  startIndex: number
  endIndex: number
}

export interface IReviewSentenceResponse {
  original: string
  suggestions: IReviewSuggestion[]
  summary: string
  score: number
  isCorrect: boolean
}

export interface IReviewSentenceRequest {
  text: string
  language?: 'en' | 'vi'
}

const parseReviewResponse = (content: string, originalText: string): IReviewSentenceResponse => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const suggestions: IReviewSuggestion[] = rawSuggestions.map((s: any) => ({
      issue: s.issue || 'grammar',
      current: typeof s.current === 'string' ? s.current : '',
      suggestion: typeof s.suggestion === 'string' ? s.suggestion : '',
      explanation: typeof s.explanation === 'string' ? s.explanation : '',
      startIndex: typeof s.startIndex === 'number' ? s.startIndex : -1,
      endIndex: typeof s.endIndex === 'number' ? s.endIndex : -1,
    }))

    return {
      original: parsed.original || originalText,
      suggestions,
      summary:
        parsed.summary || (suggestions.length === 0 ? 'No issues found' : 'Suggestions available'),
      score: typeof parsed.score === 'number' ? parsed.score : suggestions.length === 0 ? 100 : 80,
      isCorrect: suggestions.length === 0,
    }
  } catch (error) {
    console.error('Failed to parse Gemini review response:', error)
    return {
      original: originalText,
      suggestions: [],
      summary: 'Could not parse review response',
      score: 0,
      isCorrect: false,
    }
  }
}

export const geminiReviewSentenceService = {
  reviewText: async (
    params: IReviewSentenceRequest,
  ): Promise<IHttpResponse<IReviewSentenceResponse>> => {
    try {
      const apiKey = resolveGeminiApiKey()
      if (!apiKey) {
        return {
          isSuccess: false,
          content: null as any,
          message:
            'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY in your .env or save it in localStorage ("gemini_api_key").',
          statusCode: 400,
        }
      }

      const cleanText = params.text.trim()
      if (!cleanText) {
        return {
          isSuccess: false,
          content: null as any,
          message: 'No text provided to review',
          statusCode: 400,
        }
      }

      const ai = new GoogleGenAI({ apiKey })

      const prompt = `You are an expert English grammar, spelling, and writing assistant. Review the following sentence for grammar, spelling, punctuation, word choice, and stylistic issues.

Rules:
- Identify and report all issues accurately.
- Provide granular suggestions, not just a global sentence rewrite.
- Include accurate 0-based character offsets (startIndex and endIndex) for the 'current' fragment in the original text.
- If there are no issues, return an empty suggestions array and a score of 100.
- Return ONLY valid JSON adhering strictly to the schema below.

Text: "${cleanText}"

JSON Schema:
{
  "original": "${cleanText}",
  "suggestions": [
    {
      "issue": "grammar|spelling|word-choice|punctuation|style",
      "current": "fragment in original text with issue",
      "suggestion": "suggested correction",
      "explanation": "clear explanation of the issue and fix",
      "startIndex": 0,
      "endIndex": 5
    }
  ],
  "summary": "overall concise evaluation",
  "score": 90
}`

      let lastError: any = null
      let responseText = ''

      for (const model of GEMINI_MODELS) {
        try {
          const response = await generateContentWithTracking(ai, 'Sentence Review', {
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          })

          if (response.text) {
            responseText = response.text
            break
          }
        } catch (err) {
          lastError = err
          console.warn(`Gemini review failed with model ${model}, trying next...`, err)
        }
      }

      if (!responseText) {
        throw lastError || new Error('No response from Gemini review models')
      }

      const reviewResult = parseReviewResponse(responseText, cleanText)

      return {
        isSuccess: true,
        content: reviewResult,
        message: 'Review completed successfully',
        statusCode: 200,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Gemini review sentence error:', error)
      return {
        isSuccess: false,
        content: null as any,
        message: `Failed to review sentence using Gemini: ${errorMessage}`,
        statusCode: 500,
      }
    }
  },
}

export const reviewSentenceService = geminiReviewSentenceService
