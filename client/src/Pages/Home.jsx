import React from 'react'
import { Hero } from '../Components/Hero/Hero'
import { Popular } from '../Components/Popular/Popular'
import { Newsletter } from '../Components/Newsletter/Newsletter'
import { NewItems } from '../Components/NewItems/NewItems'

export const Home = () => {
  return (
    <div>
      <Hero/>
      <Popular/>
      <NewItems/>
      <Newsletter/>
    </div>
  )
}
