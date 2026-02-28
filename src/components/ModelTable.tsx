import React from 'react'
import { Box, Text } from 'ink'
import type { ModelInfo } from '../core/types.js'

interface Props {
  models: ModelInfo[]
  selectedIndex?: number
}

export default function ModelTable({ models, selectedIndex }: Props) {
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Box width={22}>
          <Text bold color="gray">
            Model
          </Text>
        </Box>
        <Box width={8}>
          <Text bold color="gray">
            Credits
          </Text>
        </Box>
        <Box width={40}>
          <Text bold color="gray">
            Strengths
          </Text>
        </Box>
      </Box>

      {/* Rows */}
      {models.map((m, i) => {
        const isSelected = i === selectedIndex
        return (
          <Box key={m.id}>
            <Box width={22}>
              <Text color={isSelected ? 'magenta' : 'white'} bold={isSelected}>
                {isSelected ? '> ' : '  '}
                {m.name}
              </Text>
            </Box>
            <Box width={8}>
              <Text color={m.credit_cost > 1 ? 'yellow' : 'green'}>{m.credit_cost}</Text>
            </Box>
            <Box width={40}>
              <Text color="gray">{m.strengths.join(', ')}</Text>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
