import { action } from './_generated/server'
import { v } from 'convex/values'
import { components } from './_generated/api'
import {
  Agent,
  createTool,
  createThread,
} from '@convex-dev/agent'
import { openai } from '@ai-sdk/openai'
import { type LanguageModel, stepCountIs } from 'ai'
import { z } from 'zod'

const followUpQuestionSchema = z.object({
  id: z.string().describe('Stable id for the question'),
  prompt: z.string().describe('Question text for the user'),
  type: z.enum(['text', 'choice']).describe('Input type'),
  options: z
    .array(z.string())
    .optional()
    .describe('Choice options when type is choice'),
  placeholder: z
    .string()
    .optional()
    .describe('Placeholder text for a text input'),
})

const recipeSchema = z
  .object({
    name: z.string().describe('Short recipe or meal name'),
    description: z.string().optional().describe('Optional short description'),
    ingredients: z
      .string()
      .optional()
      .describe('Ingredient list or notes as text'),
    servings: z
      .number()
      .optional()
      .describe('Total servings the recipe makes'),
    defaultServingGrams: z
      .number()
      .optional()
      .describe('Grams for one serving if known'),
    caloriesPerServing: z
      .number()
      .optional()
      .describe('Calories for one serving if known'),
  })
  .nullable()

const entrySchema = z
  .object({
    label: z.string().describe('Short label for the entry'),
    calories: z.number().describe('Calories for the portion described'),
    grams: z
      .number()
      .optional()
      .describe('Grams for the portion described'),
    servings: z
      .number()
      .optional()
      .describe('Servings for the portion described'),
  })
  .nullable()

const estimateSchema = z.object({
  status: z.enum(['needs_follow_up', 'ready']),
  recipe: recipeSchema,
  entry: entrySchema,
  questions: z.array(followUpQuestionSchema),
  assumptions: z.array(z.string()),
  notes: z.array(z.string()),
})

const emitCalorieEstimate = createTool({
  description:
    'Emit a structured calorie estimate, recipe details, and follow-up questions if needed.',
  args: estimateSchema,
  handler: async (_ctx, args): Promise<z.infer<typeof estimateSchema>> => args,
})

const calorieAgent = new Agent(components.agent, {
  name: 'CaloriesAgent',
  languageModel: openai.chat('gpt-5-mini') as unknown as LanguageModel,
  instructions: [
    'You estimate calories from raw meal text.',
    'Always call the emitCalorieEstimate tool.',
    'Return status=needs_follow_up when missing key info for a reasonable estimate.',
    'Ask at most 3 follow-up questions.',
    'If answers include "__skipped__", use best guesses and note assumptions.',
    'Always provide entry with calories and either grams or servings.',
    'Bias calories slightly high to avoid underestimation.',
    'Keep labels short and human-friendly.',
  ].join(' '),
  tools: { emitCalorieEstimate },
  stopWhen: stepCountIs(3),
})

function formatPrompt({
  input,
  answers,
}: {
  input: string
  answers?: Record<string, string | undefined>
}) {
  const answerLines =
    answers && Object.keys(answers).length > 0
      ? Object.entries(answers)
          .map(([key, value]) => `- ${key}: ${value ?? ''}`)
          .join('\n')
      : ''
  return [
    'Meal description:',
    input.trim(),
    answerLines ? 'Follow-up answers:' : '',
    answerLines,
  ]
    .filter(Boolean)
    .join('\n')
}

async function getEstimateResult(result: {
  toolResults:
    | Array<{ output: unknown }>
    | Promise<Array<{ output: unknown }>>
}) {
  const toolResults = await result.toolResults
  const toolResult = toolResults[0]?.output
  if (!toolResult) {
    throw new Error('No tool result returned from calorie agent')
  }
  return toolResult
}

export const startEstimate = action({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const threadId = await createThread(ctx, components.agent)
    const prompt = formatPrompt({ input: args.input })
    const result = await calorieAgent.generateText(
      ctx,
      { threadId },
      {
        prompt,
      },
    )
    return {
      threadId,
      estimate:
        (await getEstimateResult(result)) as z.infer<typeof estimateSchema>,
    }
  },
})

export const answerQuestions = action({
  args: {
    threadId: v.string(),
    input: v.string(),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const prompt = formatPrompt({ input: args.input, answers: args.answers })
    const result = await calorieAgent.generateText(
      ctx,
      { threadId: args.threadId },
      {
        prompt,
      },
    )
    return {
      threadId: args.threadId,
      estimate:
        (await getEstimateResult(result)) as z.infer<typeof estimateSchema>,
    }
  },
})
