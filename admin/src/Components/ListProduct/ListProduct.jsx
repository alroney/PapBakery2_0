import React, { useEffect, useState } from 'react'
import './ListProduct.css'
import cross_icon from '../../assets/img/icon/cross_icon.png'
import edit_icon from '../../assets/img/icon/edit_icon.svg'

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


    //Remove product from database and allproducts list.
    const remove_product = async (id) => {
        await fetch('http://localhost:4000/removeProduct', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({id:id}),
        })
        await fetchInfo();
    }



    const startEditing = (product) => {
        setEditingProductId(product.id);
        setEditedProduct({ ...product });
    }

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditedProduct((prev) => ({ ...prev, [name]: value }));
    }


    const saveEdit = async () => {
        await fetch('http://localhost:4000/editproduct', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(editedProduct),
        });
        setEditingProductId(null);
        await fetchInfo();
    };

    const cancelEdit = () => {
        setEditingProductId(null);
        setEditedProduct({});
    };

  return (
    <div className="list-product">
        <h1>All Products List</h1>
        <div className="listproduct-format-main">
            <p>Products</p>
            <p>Title</p>
            <p>Price</p>
            <p>Category</p>
            <p>Edit</p>
            <p>Remove</p>
        </div>

        <div className="listproduct-allproducts">
            <hr />
            {/* Create an array of products from mapping allproducts. Pass on individual 'product' and 'index'. */}
            {allproducts.map((product, index) => {
                const isEditing = editingProductId === product.id;
                //Template to map each product according to its key (index).
                return <>
                    <div key={index} className="listproduct-format-main listproduct-format">
                        <img src={product.image} alt="" className="listproduct-product-icon" />
                        {isEditing ? (
                        <>
                            <input value={editedProduct.name} onChange={handleEditChange} type="text" name="name" />
                            <input value={editedProduct.price} onChange={handleEditChange} type="number" name="price" />
                            <input value={editedProduct.category} onChange={handleEditChange} type="text" name="category" /> {/*Change to selec later*/}
                            <button onClick={saveEdit}>Save</button>
                            <button onCLick={cancelEdit}>Cancel</button>
                        </>
                        ) : (
                        <>
                            <p>{product.name}</p>
                            <p>${product.price}</p>
                            <p>{product.category}</p>
                            <img onClick={() => startEditing(product)} src={edit_icon} alt='edit' className="listproduct-edit-icon"/>
                            <img onClick={() => {remove_product(product.id)}} src={cross_icon} alt="X" className="listproduct-remove-icon" />                          
                        </>
                        )}
                        
                    </div>
                    <hr />
                </>
            })}
        </div>
    </div>
  )
}

export default ListProduct