import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Generation } from '../core/types.js'

interface Props {
  generations: Generation[]
  columns?: number
  onSelect: (gen: Generation) => void
}

export default function ImageGrid({ generations, columns = 3, onSelect }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useInput((input, key) => {
    if (key.leftArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1))
    } else if (key.rightArrow) {
      setSelectedIndex((i) => Math.min(generations.length - 1, i + 1))
    } else if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - columns))
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(generations.length - 1, i + columns))
    } else if (key.return) {
      const gen = generations[selectedIndex]
      if (gen) onSelect(gen)
    }
  })

  // Build rows
  const rows: Generation[][] = []
  for (let i = 0; i < generations.length; i += columns) {
    rows.push(generations.slice(i, i + columns))
  }

  const cellWidth = Math.floor((process.stdout.columns ?? 80) / columns) - 2

  return (
    <Box flexDirection="column">
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {row.map((gen, colIndex) => {
            const index = rowIndex * columns + colIndex
            const isSelected = index === selectedIndex
            return (
              <Box
                key={gen.id}
                width={cellWidth}
                borderStyle={isSelected ? 'bold' : 'single'}
                borderColor={isSelected ? 'magenta' : 'gray'}
                flexDirection="column"
                paddingX={1}
              >
                <Text color={gen.status === 'succeeded' ? 'green' : gen.status === 'failed' ? 'red' : 'yellow'}>
                  {gen.status === 'succeeded' ? '●' : gen.status === 'failed' ? '✗' : '◌'}{' '}
                  {gen.model}
                </Text>
                <Text color="gray" wrap="truncate">
                  {gen.prompt.slice(0, cellWidth - 4)}
                </Text>
                <Text color="gray" dimColor>
                  {new Date(gen.created_at).toLocaleDateString()}
                </Text>
              </Box>
            )
          })}
        </Box>
      ))}
      <Text color="gray" dimColor>
        ←→↑↓ navigate | enter select
      </Text>
    </Box>
  )
}
