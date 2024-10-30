import React from 'react'
import { getByTestId, render, screen } from '@testing-library/react'
import event from '@testing-library/user-event'
import About from './about'

describe('About rendering', () => {
  test('About About', () => {
    render(<About />)
    expect(screen.getByText('About')).toBeInTheDocument()
  })
})
