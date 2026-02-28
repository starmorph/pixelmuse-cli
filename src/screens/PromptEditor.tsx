import React, { useState } from 'react'
import { Box, Text } from 'ink'
import { TextInput } from '@inkjs/ui'
import { getTemplate, saveTemplate, extractVariables, type PromptTemplate } from '../core/prompts.js'

type EditorStep = 'name' | 'description' | 'prompt' | 'tags' | 'done'

interface Props {
  existingName?: string
  onDone: () => void
}

export default function PromptEditor({ existingName, onDone }: Props) {
  const existing = existingName ? getTemplate(existingName) : null

  const [step, setStep] = useState<EditorStep>(existing ? 'prompt' : 'name')
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [prompt, setPrompt] = useState(existing?.prompt ?? '')
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '')

  const handleSave = () => {
    const vars = extractVariables(prompt)
    const variables: Record<string, string> = {}
    for (const v of vars) {
      variables[v] = existing?.variables[v] ?? ''
    }

    const template: PromptTemplate = {
      name,
      description,
      prompt,
      defaults: existing?.defaults ?? {},
      variables,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }

    saveTemplate(template)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="green">Template "{name}" saved!</Text>
        <Text color="gray">Press esc to go back</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{existing ? 'Edit' : 'New'} Prompt Template</Text>

      {step === 'name' && (
        <Box>
          <Text>Name: </Text>
          <TextInput
            defaultValue={name}
            placeholder="blog-thumbnail"
            onSubmit={(v) => {
              setName(v.trim())
              setStep('description')
            }}
          />
        </Box>
      )}

      {step === 'description' && (
        <Box>
          <Text>Description: </Text>
          <TextInput
            defaultValue={description}
            placeholder="Dark-themed blog post thumbnail"
            onSubmit={(v) => {
              setDescription(v.trim())
              setStep('prompt')
            }}
          />
        </Box>
      )}

      {step === 'prompt' && (
        <Box flexDirection="column" gap={1}>
          <Text color="gray">Use {'{{variable}}'} for placeholders</Text>
          <Box>
            <Text>Prompt: </Text>
            <TextInput
              defaultValue={prompt}
              placeholder="A cinematic {{subject}} on a dark background..."
              onSubmit={(v) => {
                setPrompt(v.trim())
                setStep('tags')
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'tags' && (
        <Box>
          <Text>Tags (comma separated): </Text>
          <TextInput
            defaultValue={tags}
            placeholder="blog, thumbnail, dark"
            onSubmit={(v) => {
              setTags(v)
              handleSave()
            }}
          />
        </Box>
      )}
    </Box>
  )
}
