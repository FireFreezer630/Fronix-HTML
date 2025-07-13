import { Model, ModelGroup } from '../types';

export const models: Model[] = [
  // OpenAI Models
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  
  // Anthropic Models
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  
  // Google Models
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash', provider: 'Google' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  
  // Meta Models
  { id: 'llama-3.1-405b-reasoning', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta' },
  
  // Mistral Models
  { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral' },
  { id: 'mistral-medium-latest', name: 'Mistral Medium', provider: 'Mistral' },
  { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral' },
  
  // Cohere Models
  { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere' },
  { id: 'command-r', name: 'Command R', provider: 'Cohere' },
  
  // Perplexity Models
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', provider: 'Perplexity' },
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', provider: 'Perplexity' },
];

export const modelGroups: ModelGroup[] = models.reduce((groups, model) => {
  const existingGroup = groups.find(g => g.provider === model.provider);
  if (existingGroup) {
    existingGroup.models.push(model);
  } else {
    groups.push({
      provider: model.provider,
      models: [model]
    });
  }
  return groups;
}, [] as ModelGroup[]);

export const defaultModel = 'gpt-4o';