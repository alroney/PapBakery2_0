import React, { useContext } from 'react';
import './CSS/ShopCategory.css';
import { ShopContext } from '../Context/ShopContext';
import dropdown_icon from '../Components/Assets/img/icon/dropdown_icon.png';
import Item from '../Components/Item/Item';

export const ShopCategory = (props) => {
  console.log("==(ShopCategory) Page Loaded.==");

  const { all_product } = useContext(ShopContext);

  //Filter products based on the category passed in props.
  const filteredProducts = all_product.filter((item) =>  item.category === props.category );
  console.log("Current Category: ", props.category);
  
  return (
    <div className="shop-category">
      <div className="shopcategory-indexSort">
        <p>
          <span>Showing 1-{filteredProducts.length}</span> out of {all_product.length} products
        </p>
        <div className="shopcategory-sort">
          Sort by <img src={dropdown_icon} alt="dropdown arrow"/>
        </div>
      </div>
      <div className="shopcategory-products">
        {filteredProducts.map((item, i) => {
            return <Item key={i} id={item.id} name={item.name} price={item.price} image={item.image} />

        })}
      </div>
      <div className="shopcategory-loadmore">
        Explore More
      </div>
    </div>
  )
}
