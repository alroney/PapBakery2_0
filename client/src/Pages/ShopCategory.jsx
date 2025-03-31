import React, { useContext } from 'react';
import './CSS/ShopCategory.css';
import { ShopContext } from '../Context/ShopContext';
import dropdown_icon from '../Components/Assets/img/icon/dropdown_icon.png';
import Item from '../Components/Item/Item';


/* MAJOR TODO: Use display the Subcategory for the selected category. 
 * Then upon selection it will then show the product and its options.
*/


export const ShopCategory = (props) => {
  console.log("==(ShopCategory) Page Loaded.==");

  const { all_subcategory } = useContext(ShopContext);
  const { category } = props;
  
  console.log("==(ShopCategory) all_subcategory: ", all_subcategory);
  console.log("==(ShopCategory) props: ", props);
  const filteredSubCategories = all_subcategory.filter((item) => item.categoryID === category.categoryID);


  


  return (
    <div className="shop-category">
      <div className="shopcategory-indexSort">
        <p>
          <span>Showing 1-{filteredSubCategories.length}</span> out of {all_subcategory.length} Products
        </p>
        <div className="shopcategory-sort">
          Sort by <img src={dropdown_icon} alt="dropdown arrow"/>
        </div>
      </div>
      <div className="shopcategory-products">
        {filteredSubCategories.map((item, i) => {
            return <Item key={i} scID={item.subCategoryID} name={item.subCategoryName + ` ${category.categoryName}`} image={item.subCategoryImage} /> //Parameters passed to Item component.
        })}
      </div>
      <div className="shopcategory-loadmore">
        Explore More
      </div>
    </div>
  )
}
