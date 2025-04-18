import React, { useContext, useState } from 'react';
import './CartItems.css';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import { CartContext } from '../../Context/CartContext';
import { imgUrl } from '@config';


export const CartItems = () => {
    console.log("(CartItems.jsx) Component Loaded.");

    const { cart, groupedCartItems, updateCartItem, clearCart } = useContext(CartContext);
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    return (
        <div className='cartitems'>
            <h2>Shopping Cart</h2>
            {cart.length > 0 
            
                ?  (
                    <button className="cartitems-clearcart" onClick={clearCart}>
                        Clear Cart
                    </button> 
                
                ) : (
                    <p className="cartitems-empty">Your cart is empty.</p>
                )
            }
            
            {groupedCartItems.map((group) => (
                <div key={group.productId} className="cartitems-item">
                    <div className="cartitems-main">
                        <img src={`${imgUrl}/productsByCatShapeSize/${group.image}`} alt="" className="cartitems-product-icon" />
                        <div className="cartitems-details">
                            <p className="cartitems-group-name">{group.name}</p>
                            <p className="cartitems-total-quantity">Total Quanity: {group.totalQuantity}</p>
                            <p className="cartitems-total-price">Total Price: ${group.totalPrice}</p>

                            <button className="cartitems-expand-button" onClick={() => toggleGroupExpand(group.productId)}>
                                {expandedGroups[group.productId] ? 'Hide Variants' : 'Show Variants'}
                            </button>

                            {expandedGroups[group.productId] && (
                                <div className="cartitems-variants">
                                    {group.variants.map(variant => (
                                        <div key={variant.productId} className="cartitems-variant">
                                            <div className="cartitems-variant-info">
                                                <p className="cartitems-variant-name">{variant.flavor} <small>w/</small> {variant.flour}</p>
                                                <p className="cartitems-variant-price">Price: ${variant.price}</p>
                                            </div>
                                            <div className="cartitems-variant-quantity">
                                                <div className="cartitems-quantity">
                                                    <div className="cartitems-quantity-container">
                                                        <button className="cartitems-adjuster" onClick={() => updateCartItem(variant.productId, variant.quantity - 1)}>{variant.quantity === 1 ? 'x' : '-'}</button>
                                                        <p className="cartitems-quantity-display">{variant.quantity}</p>
                                                        <button className="cartitems-adjuster" onClick={() => updateCartItem(variant.productId, variant.quantity + 1)}>{'+'}</button>
                                                    </div>
                                                </div>
                                                <p className="cartitems-variant-subtotal">${(parseFloat(variant.price) * parseInt(variant.quantity)).toFixed(2)}</p>
                                                <img className="cartitems-remove-icon" src={remove_icon} alt="X" onClick={() => { updateCartItem(variant.productId, 0) }} />
                                            </div>
                                            
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <hr />
                </div>
            ))}


            {/* {cart.map((item) => {
                if(cart) {
                    return (
                        <div key={item.productId} className="cartitems-item">
                            <div className="cartitems-main">
                                <img className="caritems-remove-icon " src={remove_icon} alt="X" onClick={()=>{updateCartItem(item.productId, 0)}}/>
                                <img src={`${imgUrl}/productsByCatShapeSize/${item.image}`} alt="" className="cartitems-product-icon " />
                                <div className="cartitems-details">
                                    <p className="">{item.name}</p>
                                    <p className="">Price: ${item.price}</p>
                                    <div className="cartitems-quantity">
                                        <div className="cartitems-quantity-container">
                                            <button className="cartitems-adjuster" onClick={() => updateCartItem(item.productId, item.quantity - 1)}>{item.quantity === 1 ? 'x':'<'}</button>
                                            <p className='cartitems-quantity-display'>{item.quantity}</p>
                                            <button className="cartitems-adjuster" onClick={() => updateCartItem(item.productId, item.quantity + 1)}>{'>'}</button>
                                        </div>
                                    </div>
                                    <p className="">${item.price * item.quantity}</p>
                                </div>
                            </div>
                            <hr />
                        </div>
                    )
                }
                else {
                    return <div key={item.productId} className="cartitems-item">Loading...</div>
                }
            })} */}
        </div>
    );
};
