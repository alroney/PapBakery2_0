import React, { useContext, useState, useEffect, useCallback } from 'react';
import './CartItems.css';
import remove_icon from '../Assets/img/icon/cart_cross_icon.png';
import { CartContext } from '../../Context/CartContext';
import { getOptimalBag } from '../../services/bagService';
import { imgUrl } from '@config';


export const CartItems = () => {
    console.log("(CartItems.jsx) Component Loaded.");

    const { cart, groupedCartItems, updateCartItem, clearCart } = useContext(CartContext);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [bagInfoMap, setBagInfoMap] = useState({}); //Map to store bag info for each productId.

    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const updateItemBagInfo = useCallback(async (item, quantity) => {
        if(!item || !item.sku) return;

        const [recipeSKU, shapeSizeSKU] = item.sku.split('-');
        if(!recipeSKU || !shapeSizeSKU) return;
        const subcategoryId = recipeSKU[0]; //Assuming the first character of SKU is the subcategory ID.
        const treatDimensionKey = `${subcategoryId}-${shapeSizeSKU}`;
        const bagCombination = await getOptimalBag(treatDimensionKey, quantity);

        if(bagCombination) {
            setBagInfoMap(prev => ({
                ...prev,
                [item.productId]: bagCombination
            }));
        }
    }, []);



    //UseEffect: Update bag info when cart changes.
    useEffect(() => {
        if(Array.isArray(cart) && cart.length > 0) {
            cart.forEach(item => {
                updateItemBagInfo(item, item.quantity);
            })
        }
    }, [cart, updateItemBagInfo]);


    //Function: Handle quantity change with bag update.
    const handleUpdateCartItem = async (item, newQty) => {
        const validQty = Math.max(0, parseInt(newQty) || 0);
        await updateCartItem(item.productId, validQty);
        if(validQty > 0) {
            updateItemBagInfo(item, validQty);
        }
    };

    //Function: Render bag info for a cart item.
    const renderItemBagInfo = (itemId) => {
        const bagInfo = bagInfoMap[itemId];
        console.log("bagInfo: ", bagInfo);
        if(!bagInfo) return null;

        return (
            <div className="cartitems-bag-info">
                <div className="bag-details">
                    <small>Packaging: {bagInfo?.bags?.map(b => `${b.size} Bag`).join(', ') || 'No packaging info'}</small>
                </div>
            </div>
        )
    }

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
                                            {variant.quantity > 0 && renderItemBagInfo(variant.productId)}
                                            <div className="cartitems-variant-quantity">
                                                <div className="cartitems-quantity">
                                                    <div className="cartitems-quantity-container">
                                                        <input 
                                                            type="number"
                                                            className="cartitems-quantity-input"
                                                            value={variant.quantity}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === '' || !isNaN(value)) {
                                                                    handleUpdateCartItem(variant, value);
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = parseInt(e.target.value);
                                                                handleUpdateCartItem(variant, value < 1 ? 1 : value);
                                                            }}
                                                            min="1"
                                                        />
                                                        <button className="cartitems-adjuster" onClick={() => handleUpdateCartItem(variant, variant.quantity + 1)}>{'+'}</button>
                                                    </div>
                                                </div>
                                                <p className="cartitems-variant-subtotal">${(parseFloat(variant.price) * parseInt(variant.quantity)).toFixed(2)}</p>
                                                <img className="cartitems-remove-icon" src={remove_icon} alt="X" onClick={() => handleUpdateCartItem(variant, 0)} />
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
        </div>
    );
};
