import { IHttpResponse } from '@/models/http.model'
import OpenAI from 'openai'

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

const resolveApiKey = () => {
  const envKey = String(import.meta.env.VITE_OPENAI_API_KEY || '').trim()
  return envKey
}

const parseReviewResponse = (content: string): IReviewSentenceResponse => {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      original: parsed.original || '',
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map(
            (s: any) =>
              ({
                issue: s.issue || 'grammar',
                current: s.current || '',
                suggestion: s.suggestion || '',
                explanation: s.explanation || '',
                startIndex: s.startIndex ?? -1,
                endIndex: s.endIndex ?? -1,
              }) as IReviewSuggestion,
          )
        : [],
      summary: parsed.summary || 'No issues found',
      score: typeof parsed.score === 'number' ? parsed.score : 100,
      isCorrect: Array.isArray(parsed.suggestions) ? parsed.suggestions.length === 0 : true,
    }
  } catch (error) {
    console.error('Failed to parse review response:', error)
    return {
      original: '',
      suggestions: [],
      summary: 'Error parsing response',
      score: 0,
      isCorrect: false,
    }
  }
}

export const reviewSentenceService = {
  reviewText: async (
    params: IReviewSentenceRequest,
  ): Promise<IHttpResponse<IReviewSentenceResponse>> => {
    try {
      const apiKey = resolveApiKey()
      if (!apiKey) {
        return {
          isSuccess: false,
          content: null as any,
          message: 'OpenAI API key not configured.',
          statusCode: 400,
        }
      }

      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      })

      const prompt = `You are an English grammar and writing expert. Review the following sentence for grammar, spelling, punctuation, word choice, and style issues.

    Rules:
    - Find ALL issues you can detect.
    - Return granular suggestions, not just one global rewrite.
    - Include multiple suggestions when errors are independent.
    - Return up to 10 suggestions sorted by appearance order.

Text: "${params.text}"

Provide your response as a JSON object with this exact structure:
{
  "original": "${params.text}",
  "suggestions": [
    {
      "issue": "grammar|spelling|word-choice|punctuation|style",
      "current": "the exact text that has an issue",
      "suggestion": "suggested correction",
      "explanation": "why this is an issue and how to fix it",
      "startIndex": 0,
      "endIndex": 5
    }
  ],
  "summary": "overall assessment of the sentence",
  "score": 85
}

If there are no issues, return an empty suggestions array. Return ONLY valid JSON, no additional text.`

      const message = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      })

      const responseContent = message.choices[0]?.message?.content || ''
      const reviewResult = parseReviewResponse(responseContent)

      return {
        isSuccess: true,
        content: reviewResult,
        message: 'Review completed successfully',
        statusCode: 200,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Review sentence error:', error)
      return {
        isSuccess: false,
        content: null as any,
        message: `Failed to review sentence: ${errorMessage}`,
        statusCode: 500,
      }
    }
  },
}
