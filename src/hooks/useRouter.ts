import { useReducer, useCallback } from 'react'

export type Route =
  | { screen: 'home' }
  | { screen: 'login' }
  | { screen: 'generate'; prompt?: string; model?: string; aspectRatio?: string; style?: string }
  | { screen: 'gallery' }
  | { screen: 'gallery-detail'; id: string }
  | { screen: 'models' }
  | { screen: 'prompts' }
  | { screen: 'prompt-editor'; name?: string }
  | { screen: 'account' }
  | { screen: 'buy-credits' }

type Action =
  | { type: 'navigate'; route: Route }
  | { type: 'back' }
  | { type: 'replace'; route: Route }

interface State {
  current: Route
  history: Route[]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'navigate':
      return { current: action.route, history: [...state.history, state.current] }
    case 'back': {
      if (state.history.length === 0) return state
      const prev = state.history.at(-1)
      if (!prev) return state
      return { current: prev, history: state.history.slice(0, -1) }
    }
    case 'replace':
      return { ...state, current: action.route }
  }
}

export function useRouter(initial: Route = { screen: 'home' }) {
  const [state, dispatch] = useReducer(reducer, { current: initial, history: [] })

  const navigate = useCallback((route: Route) => dispatch({ type: 'navigate', route }), [])
  const back = useCallback(() => dispatch({ type: 'back' }), [])
  const replace = useCallback((route: Route) => dispatch({ type: 'replace', route }), [])

  return { route: state.current, navigate, back, replace, canGoBack: state.history.length > 0 }
}
