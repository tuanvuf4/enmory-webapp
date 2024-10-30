import React from 'react'
import { getByTestId, render, screen } from '@testing-library/react'
import event from '@testing-library/user-event'
import { AppFooter } from './footer'

describe('AppHeader rendering', () => {
  test('render AppHeader', () => {
    render(<AppFooter />)
    const text = screen.getByText(/Enmory/i)
    expect(text).toBeInTheDocument()
  })
})
