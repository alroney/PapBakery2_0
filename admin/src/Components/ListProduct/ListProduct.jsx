import React, { useEffect, useState } from 'react'
import './ListProduct.css'
import cross_icon from '../../assets/img/icon/cross_icon.png'

const ListProduct = () => {

    const [allproducts, setAllProducts] = useState([]); //Set default to empty array.

    const fetchInfo = async () => {
        await fetch('http://localhost:4000/allproducts') //Get the response from API Endpoint.
        .then((res) => res.json()) //Converts the response to a json.
        .then((data) => {setAllProducts(data)}); //Saves data to allproducts state variable.
    }

    //Allows for the fetchInfo function to run when this component is mounted.
    useEffect(() => {
        fetchInfo();
    }, [])//The '[]' are placed so the function is only executed once.


  return (
    <div className="list-product">
        <h1>All Products List</h1>
        <div className="listproduct-format-main">
            <p>Products</p>
            <p>Title</p>
            <p>Price</p>
            <p>Category</p>
            <p>Remove</p>
        </div>

        <div className="listproduct-allproducts">
            <hr />
            {/* Create an array of products from mapping allproducts. Pass on individual 'product' and 'index'. */}
            {allproducts.map((product, index) => {
                //Template to map each product according to its key (index).
                return <div key={index} className="listproduct-format-main listproduct-format">
                    <img src={product.image} alt="" className="listproduct-product-icon" />
                    <p>{product.name}</p>
                    <p>${product.price}</p>
                    <p>{product.category}</p>
                    <img src={cross_icon} alt="X" className="listproduct-remove-icon" />
                </div>
            })}
        </div>
    </div>
  )
}

export default ListProduct