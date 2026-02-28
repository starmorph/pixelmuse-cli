import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { listTemplates, deleteTemplate, type PromptTemplate } from '../core/prompts.js'
import type { Route } from '../hooks/useRouter.js'

interface Props {
  navigate: (route: Route) => void
}

export default function Prompts({ navigate }: Props) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(() => listTemplates())
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) setSelectedIndex((i) => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIndex((i) => Math.min(templates.length - 1, i + 1))
    if (input === 'n') navigate({ screen: 'prompt-editor' })
    if (input === 'e') {
      const t = templates[selectedIndex]
      if (t) navigate({ screen: 'prompt-editor', name: t.name })
    }
    if (input === 'u') {
      const t = templates[selectedIndex]
      if (t) {
        navigate({
          screen: 'generate',
          prompt: t.prompt,
          model: t.defaults.model,
          aspectRatio: t.defaults.aspect_ratio,
          style: t.defaults.style,
        })
      }
    }
    if (input === 'd') {
      const t = templates[selectedIndex]
      if (t) {
        deleteTemplate(t.name)
        setTemplates(listTemplates())
        setSelectedIndex((i) => Math.min(i, templates.length - 2))
      }
    }
  })

  if (templates.length === 0) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text>No prompt templates saved.</Text>
        <Text color="gray">[n] create new template</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      {templates.map((t, i) => {
        const isSelected = i === selectedIndex
        return (
          <Box key={t.name} flexDirection="column">
            <Text color={isSelected ? 'magenta' : 'white'} bold={isSelected}>
              {isSelected ? '> ' : '  '}
              {t.name}
            </Text>
            <Text color="gray">
              {'  '}
              {t.description}
              {t.tags.length > 0 && ` [${t.tags.join(', ')}]`}
            </Text>
          </Box>
        )
      })}

      <Text color="gray">[n] new | [e] edit | [u] use | [d] delete | esc back</Text>
    </Box>
  )
}
