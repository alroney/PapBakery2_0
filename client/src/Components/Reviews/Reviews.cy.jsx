import React from 'react'
import { Reviews } from './Reviews'

describe('<Reviews />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<Reviews />)
  })
})