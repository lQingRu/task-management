import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

import { llmConfig } from '../../../config/llm.config.js';
import {
  FallbackSkillInferenceService,
  type SkillInferenceProvider,
} from './fallback-skill-inference.service.js';
import { GeminiSkillInferenceService } from './gemini-skill-inference.service.js';
import {
  GroqSkillInferenceService,
  type GroqClient,
} from './groq-skill-inference.service.js';

const geminiClient = llmConfig.gemini.apiKey
  ? new GoogleGenAI({ apiKey: llmConfig.gemini.apiKey })
  : undefined;

const groqSdkClient = llmConfig.groq.apiKey
  ? new Groq({
      apiKey: llmConfig.groq.apiKey,
      maxRetries: 0,
      timeout: llmConfig.groq.timeoutMs,
    })
  : undefined;

const groqClient: GroqClient | undefined = groqSdkClient
  ? {
      create: (request, options) =>
        groqSdkClient.chat.completions.create(request, options),
    }
  : undefined;

const geminiSkillInferenceService = new GeminiSkillInferenceService({
  ...llmConfig.gemini,
  client: geminiClient,
});

const groqSkillInferenceService = new GroqSkillInferenceService({
  ...llmConfig.groq,
  client: groqClient,
});

const providers: SkillInferenceProvider[] = [];

if (llmConfig.groq.apiKey) {
  providers.push({ name: 'Groq', service: groqSkillInferenceService });
}

if (llmConfig.gemini.apiKey) {
  providers.push({ name: 'Gemini', service: geminiSkillInferenceService });
}

// The order will determine the precedence of provider
export const skillInferenceService = new FallbackSkillInferenceService(
  providers,
);
