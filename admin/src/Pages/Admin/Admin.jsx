import React from 'react'
import './Admin.css'
import Sidebar from '../../Components/Sidebar/Sidebar'
import { Routes, Route } from 'react-router'
import AddProduct from '../../Components/AddProduct/AddProduct'
import ListProduct from '../../Components/ListProduct/ListProduct'
import SeaTableManager from '../../Components/SeaTableManager/SeaTableManager'
import MathTest from '../../Components/MathTest/MathTest'


/**
 * @todo: Create a single path for handling product components and similarly to other major topics (user, image...).
 */

const Admin = () => {
  return (
    <div className="admin">
      <Sidebar />
      <Routes>
        <Route path='/addproduct' element={<AddProduct/>}/>
        <Route path='/listproduct' element={<ListProduct/>}/>
        <Route path='/seatableManager' element={<SeaTableManager/>}/>
        <Route path='/mathTest' element={<MathTest/>}/>
      </Routes>
    </div>
  )
}

export default Admin