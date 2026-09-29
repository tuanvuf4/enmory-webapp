import { IHttpResponse } from '@/models/http.model'
import OpenAI from 'openai'

export const DEFAULT_TRANSCRIPT_DESCRIPTION =
  'Thực hành luyện nghe tiếng Anh, tạo bài nghe khoảng 5-10 phút chủ đề giao tiếp trong cuộc sống, công việc xoay quanh của lập trình viên frontend trong môi trường công việc, giao tiếp với đồng nghiệp, daily meeting, họp với khách hàng và với team'

export interface IGenerateTranscriptResponse {
  title: string
  description?: string
  transcript: string
  translation?: string
  generatedPrompt?: string
}

const resolveApiKey = () => {
  const envKey = String(import.meta.env.VITE_OPENAI_API_KEY || '').trim()
  return envKey
}

const getOpenAIClient = () => {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key chưa được cấu hình. Vui lòng kiểm tra VITE_OPENAI_API_KEY.')
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

export const transcriptService = {
  /**
   * Step 1: Use OpenAI to create an optimized generation prompt based on the user's description.
   */
  generatePromptFromDescription: async (description: string): Promise<string> => {
    const openai = getOpenAIClient()

    const promptGeneratorInstruction = `You are an expert English language educator and AI prompt engineer.
Your task is to take a user's description/requirements for an English listening practice audio and create a detailed, highly effective system prompt that will be used to generate a realistic English conversation transcript with timestamp markers.

The prompt you generate should instruct the AI model to:
1. Generate an engaging, realistic English conversation or dialogue lasting approximately 5-10 minutes.
2. Focus strictly on the theme provided in the description:
   - Frontend developer daily workplace interactions, communication with colleagues.
   - Daily standup meeting: updates on tasks (tickets, components, styling, bugs, PR reviews, state management, API integration, blockers).
   - Meeting with clients/stakeholders: discussing requirements, demoing features, handling feedback politely.
   - Team discussion / sprint planning: sprint goals, estimating effort, technical trade-offs, architecture decisions.
3. Use natural conversational American/British English with professional idioms, realistic workplace phrases, polite questions, and developer terminology.
4. Structure the output with timestamp markers strictly formatted as M:SS (e.g., 0:00, 0:25, 0:50, 1:15, 1:40, 2:05 ... spanning across 5 to 8+ minutes).
5. Ensure timestamp format: each timestamp marker must be on its own line (matching ^(\\d+):(\\d{2})$), followed by the speaker and speech lines.
6. Provide an English title and Vietnamese summary translation.

Return ONLY the generated prompt text, ready to be sent to an AI model. Do not include markdown meta-commentary.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: promptGeneratorInstruction,
        },
        {
          role: 'user',
          content: `Description: "${description || DEFAULT_TRANSCRIPT_DESCRIPTION}"\n\nGenerate the complete prompt based on this description.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    })

    return response.choices[0]?.message?.content?.trim() || ''
  },

  /**
   * Step 2: Use OpenAI to generate the complete transcript with timestamps based on the prompt.
   */
  generateTranscriptFromPrompt: async (
    generatedPrompt: string,
  ): Promise<IGenerateTranscriptResponse> => {
    const openai = getOpenAIClient()

    const systemInstruction = `You are a professional audio scriptwriter and English curriculum designer.
Generate the English listening practice script following the user's prompt strictly.

CRITICAL FORMATTING REQUIREMENTS FOR TRANSCRIPT:
1. Every segment MUST start with a timestamp marker on its own line formatted strictly as M:SS (e.g. 0:00, 0:25, 0:50, 1:15, 1:40, 2:10, 2:35, 3:00, 3:30, 4:00, 4:30, 5:00, 5:30, 6:00, 6:30 ...).
2. Spanning approximately 5-10 minutes of realistic conversation.
3. Below each timestamp, write the dialogue lines (e.g. "Alex: Good morning team, let's start the standup.").
4. Leave a blank line between segments.
5. In addition, provide a Vietnamese translation for each timestamp segment in the 'translation' field using the exact same timestamp markers.

You MUST return a JSON object with this exact schema:
{
  "title": "Engaging English title for the audio track",
  "description": "Short Vietnamese description/overview of the lesson",
  "transcript": "0:00\\nAlex: ...\\n\\n0:25\\nSarah: ...\\n\\n...",
  "translation": "0:00\\nAlex: ...\\n\\n0:25\\nSarah: ...\\n\\n..."
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        {
          role: 'user',
          content: generatedPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const rawContent = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(rawContent)

    return {
      title: parsed.title || 'Frontend Developer Daily Communication & Meetings',
      description: parsed.description || '',
      transcript: parsed.transcript || '',
      translation: parsed.translation || '',
      generatedPrompt,
    }
  },

  /**
   * Combined pipeline:
   * 1. Uses OpenAI to create a prompt based on description.
   * 2. Uses OpenAI with that prompt to generate the transcript with timestamps.
   */
  generateTranscript: async (
    description?: string,
    onProgress?: (step: 'prompt' | 'transcript') => void,
  ): Promise<IHttpResponse<IGenerateTranscriptResponse>> => {
    try {
      const desc = description?.trim() || DEFAULT_TRANSCRIPT_DESCRIPTION

      // Step 1: Create prompt from description
      onProgress?.('prompt')
      const prompt = await transcriptService.generatePromptFromDescription(desc)

      // Step 2: Generate transcript from prompt
      onProgress?.('transcript')
      const result = await transcriptService.generateTranscriptFromPrompt(prompt)

      return {
        isSuccess: true,
        content: {
          ...result,
          generatedPrompt: prompt,
        },
        message: 'Tạo transcript thành công!',
        statusCode: 200,
      }
    } catch (error: any) {
      console.error('Error generating transcript:', error)
      return {
        isSuccess: false,
        content: null as any,
        message: error?.message || 'Có lỗi xảy ra khi tạo transcript bằng OpenAI.',
        statusCode: 500,
      }
    }
  },
}
