import React from 'react'
import SignUpPage from './SignUp'

describe('<SignUpPage />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<SignUpPage />)
  })
})