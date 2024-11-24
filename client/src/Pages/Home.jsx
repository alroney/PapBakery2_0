import React from 'react'
import { Popular } from '../Components/Popular/Popular'
import { Newsletter } from '../Components/Newsletter/Newsletter'
import { NewItems } from '../Components/NewItems/NewItems'

export const Home = () => {
  console.log("==(Home.jsx) Page Loaded.==");

  return (
    <div>
      <Popular/>
      <NewItems/>
      <Newsletter/>
    </div>
  )
}
