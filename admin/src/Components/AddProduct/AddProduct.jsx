import React, { useState } from 'react';
import './AddProduct.css';
import upload_area from '../../assets/img/icon/upload_area.svg';
const apiBase = "http://localhost:4000/api";

const AddProduct = () => {
    console.log("(AddProduct.jsx) Component Loaded.");

    //const [variableName, setterFunction] = useState(initialState);
    const [image, setImage] = useState(false);
    const [productDetails, setProductDetails] = useState({
        name: "",
        image: "",
        category: "biscuit",
        price: "",
        description: "",
    });


    //Image handler gets called from the activation of the input field with the onChange property that specifies imageHandler.
    const imageHandler = (e) => {
        setImage(e.target.files[0]); //Set the image to the first([0]) selected image from the target of files (chosen from a popup window).
    }

    /**TODO:
     * Create feature for drag'n'drop of images.
     */

    
    const changeHandler = (e) => {
        //Create a new object with all the existing product details, then update the specific field (e.target.name) with its new value (e.target.value).
        setProductDetails({
            ...productDetails, //Spread the current product details (keep the other properties).
             [e.target.name]:e.target.value //Update the property that matches the input's name.
        });
    }

    //Function used to check the change handler function. It will wait for the server to finish (async).
    const Add_Product = async () => {
        console.log(productDetails);//LOG
        let responseData;
        let product = productDetails;

        let formData = new FormData(); //Create empty formData.
        formData.append('product', image); //Add the image to the new empty FormData object.

        //Send the formData to the API. fetch('backendURL/uploadEndpoint')
        await fetch(`${apiBase}/images/upload`, {
            method:'POST',
            headers: {
                Accept: 'application/json',
            },
            body: formData,
        }).then((resp) => resp.json()).then((data) => {responseData = data});
        if(responseData.success) {
            product.image = responseData.image_url; //Set product image to image url given by the backend.

            //Send product to addproduct API Endpoint.
            await fetch(`${apiBase}/products/add`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(product), //Put product into json format in a string.
            }).then((resp) => resp.json()).then((data) => {
                data.success ? alert("Product Added") : alert("Failed to Add Product") //IF data TRUE, alert with happy message : ELSE, alert with sad message.
            })
        }
    }

    const Sync_Products = async () => {
        try {
            const response = await fetch(`${apiBase}/products/sync`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            data.success ? alert("Products Synced") : alert("Failed to Sync Products");
        }
        catch(error) {
            console.error("Failed to sync products: ", error);
        }
    }

    const Destruct_SKU = async () => {
        try {
            const response = await fetch(`${apiBase}/products/destructSKU`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            data.success ? alert("SKU Destructed") : alert("Failed to Destruct SKU");
        }
        catch(error) {
            console.error("Failed to destruct SKU: ", error);
        }
    }

  return (
    <div className="add-product">
        <button onClick={() => (Destruct_SKU())}>Destruct SKU</button>
        <button className="addproduct-sync-all" onClick={() => (Sync_Products())}>Sync All Products</button>
        <div className="addproduct-form">
            <div className="addproduct-itemfield">
                <p>Product title</p>
                <input value={productDetails.name} onChange={changeHandler} type="text" name='name' placeholder='Type here' />
            </div>

            <div className="addproduct-price">
                <div className="addproduct-itemfield">
                    <p>Price</p>
                    <input value={productDetails.price} onChange={changeHandler} type="text" name="price" placeholder='Type here'/>
                </div>
            </div>
            
            <div className="addproduct-itemfield">
                <p>Product Category</p>
                <select value={productDetails.category} onChange={changeHandler} name="category" className="add-product-selector">
                    <option value="biscuit">Biscuit</option>
                    <option value="training_treat">Training Treat</option>
                </select>
            </div>

            <div className="addproduct-itemfield">
                <p>Product Description</p>
                <input value={productDetails.description} onChange={changeHandler} type="text" name='description' placeholder='Type here'/> 
            </div>

            <div className="addproduct-itemfield">
                <label htmlFor="file-input">
                    {/*If image is TRUE create an image url and display it : ELSE display default image */}
                    <img src={image?URL.createObjectURL(image):upload_area} className="addproduct-thumbnail-img" alt="" />
                </label>
                <input onChange={imageHandler} type="file" name="image" id="file-input" hidden/>
            </div>
            
            <button onClick={() => (Add_Product())} className="addproduct-btn">ADD</button>
        </div>
    </div>
  )
}

export default AddProduct