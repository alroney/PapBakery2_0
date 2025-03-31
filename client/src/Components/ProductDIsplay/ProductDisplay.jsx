import React, { useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react'
import './ProductDisplay.css'
import star_icon from '../Assets/img/icon/star_icon.png'
import star_dull_icon from '../Assets/img/icon/star_dull_icon.png'
import { CartContext } from '../../Context/CartContext'
import { useLocation, useNavigate } from 'react-router'
import apiUrl from '@config'

export const ProductDisplay = (props) => {
    console.log("(ProductDisplay.jsx) Component Loaded.");
    const isMounted = useRef(true); //Reference to check if the component is mounted.
    useEffect(() => {
        return () => { isMounted.current = false }; //Set mounted to false when the component unmounts.
    }, []); //Empty dependency array ensures this only runs once when the component mounts.


    const navigate = useNavigate(); //Get the navigate function from react-router.
    const location = useLocation(); //Get the current location.
    const {product} = props;
    
    //State for options and constraints.
    const [options, setOptions] = useState({
        flavors: [],
        shapes: [],
        sizes: [],
        flours: []
    });
    
    //Store constraints in efficient lookup strcutures.
    const [constraints, setConstraints] = useState({
        validShapesByCategory: new Map(), //categoryID -> Set of valid shapeIds
        validSizesByShape: new Map(), //shapeId -> Set of valid sizeIds
    });


    //Function: Parse the SKU to get the initial selections. Kept small and focused by using useCallback.
    const parseSKU = useCallback((sku) => {
        if(!sku) return null;
        return {
            subcategoryId: sku.charAt(0),
            flourId: sku.charAt(1),
            flavorId: sku.charAt(2),
            shapeId: sku.charAt(4),
            sizeId: sku.charAt(5)
        };
    }, []);

    const initialSelections = useMemo(() => parseSKU(product?.sku), [product?.sku, parseSKU]); //Memoize the initial selections. This will prevent unnecessary re-renders.
    
    //Initialize the selected options.
    const [categoryId, setCategoryId] = useState(null);
    const [selections, setSelections] = useState({
        subcategoryId: initialSelections?.subcategoryId || null,
        flourId: initialSelections?.flourId || null,
        flavorId: initialSelections?.flavorId || null,
        shapeId: initialSelections?.shapeId || null,
        sizeId: initialSelections?.sizeId || null
    });

    const [currentProduct, setCurrentProduct] = useState(product);
    const {name, image, description, rating, reviews, price} = currentProduct || {};
    const {handleAddToCart} = useContext(CartContext);



    //UseEffect: Fetch available options when component mounts.
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const subcategoryId = initialSelections?.subcategoryId; //Get subcategory ID from initial selections.

                const [ //Fetch all the options in parallel.
                    flavorsRes,
                    shapesRes,
                    sizesRes,
                    floursRes,
                    constraintRes,
                    subcategoryRes
                ] = await Promise.all([
                    fetch(`${apiUrl}/products/options/flavors`),
                    fetch(`${apiUrl}/products/options/shapes`),
                    fetch(`${apiUrl}/products/options/sizes`),
                    fetch(`${apiUrl}/products/options/flours`),
                    fetch(`${apiUrl}/products/constraints${subcategoryId ? `?subcategoryId=${subcategoryId}` : ''}`), //This is a conditional fetch based on the subcategory. This is where the req.query is based off of.
                    fetch(`${apiUrl}/products/subcategory/${initialSelections?.subcategoryId}`)
                ]);

                const [ //Destructure the responses.
                    flavors,
                    shapes,
                    sizes,
                    flours,
                    constraintsData,
                    subcategory
                ] = await Promise.all([
                    flavorsRes.json(),
                    shapesRes.json(),
                    sizesRes.json(),
                    floursRes.json(),
                    constraintRes.json(),
                    subcategoryRes.json()
                ]);

                //Set the category ID based on the subcategory.
                const catId = subcategory?.CategoryID;
                setCategoryId(catId);

                console.log("flavors.rows: ", flavors.rows);
                console.log("shapes.rows: ", shapes.rows);

                setOptions({
                    flavors: flavors.rows,
                    shapes: shapes.rows,
                    sizes: sizes.rows,
                    flours: flours.rows
                });

                //Build efficient constraint lookup structures.
                const validShapesByCategory = new Map();
                const validSizesByShape = new Map();

                //Process shapes by category.
                Object.entries(constraintsData.validShapesByCategory).forEach(([categoryId, shapeIds]) => {
                    validShapesByCategory.set(Number(categoryId), new Set(shapeIds.map(Number)));
                });

                //Process sizes by shape.
                Object.entries(constraintsData.validSizesByShape).forEach(([shapeId, sizeIds]) => {
                    validSizesByShape.set(Number(shapeId), new Set(sizeIds.map(Number)));
                });


                //Store constraints in state for later use.
                setConstraints({
                    validShapesByCategory,
                    validSizesByShape
                });

                //Validate and correct initial selections if needed.
                validateInitialSelections(
                    catId,
                    initialSelections,
                    validShapesByCategory,
                    validSizesByShape
                );

                console.log("Options fetched: ", options);
            }
            catch(error) {
                console.error("Failed to fetch options: ", error);
            }
        }
        fetchOptions();
    }, []); //The empty dependency array ensures this runs only once when the component mounts.



    //Function: Validate initial selections and make corrections if needed.
    const validateInitialSelections = (categoryId, initialSelections, validShapesByCategory, validSizesByShape) => {
        if(!initialSelections || !categoryId) return;

        const { shapeId, sizeId } = initialSelections
        let newSelections = { ...initialSelections };
        let needsUpdate = false;

        //Check if shape is valid for this category.
        const validShapes = validShapesByCategory.get(categoryId);
        if(validShapes && !validShapes.has(shapeId)) {
            //Shape is invalid - pick first valid shape.
            const firstValidShape = Array.from(validShapes)[0];
            newSelections.shapeId = firstValidShape.toString();
            needsUpdate = true;
        }

        //Check if size is valid for this shape.
        const validSizes = validSizesByShape.get(Number(newSelections.shapeId));
        if(validSizes && !validSizes.has(Number(sizeId))) {
            //Size is invalid - pick first valid size.
            const firstValidSize = Array.from(validSizes)[0];
            newSelections.sizeId = firstValidSize.toString();
            needsUpdate = true;
        }

        //Update selections if needed.
        if(needsUpdate) {
            setSelections(newSelections);
        }
    }; //End validateInitialSelections.



    //Function: Handle the selecting of a new option.
    const handleOptionSelect = useCallback((optionType, optionId) => {
        console.log(`Selected ${optionType}: ${optionId}`);
        //Create new selections object for immutability.
        const newSelections = { ...selections, [optionType]: optionId };

        //Special case for shape - may need to update size.
        if(optionType === 'shapeId') {
            const validSizes = constraints.validSizesByShape.get(Number(optionId));
            if(validSizes && !validSizes.has(Number(newSelections.sizeId))) {
                //Current size is invalid for new shape - pick first valid size.
                const firstValidSize = Array.from(validSizes)[0];
                newSelections.sizeId = firstValidSize.toString();
                console.log(`Updating size for new shape: ${firstValidSize}`)
            }
        }

        setSelections(newSelections);
    }, [selections, constraints]);




    //Function: Build a new SKU based on the selected options.
    const currentSKU = useMemo(() => {
        if(!selections.subcategoryId || !selections.flourId || !selections.flavorId || !selections.shapeId || !selections.sizeId) {
            return null;
        }
        return `${selections.subcategoryId}${selections.flourId}${selections.flavorId}-${selections.shapeId}${selections.sizeId}`;
    }, [selections]);



    //UseEffect: Update the product when the selected options change.
    useEffect(() => {
        if(!currentSKU || currentSKU === product.sku) return;

        const updateProduct = async () => {
            try {
                console.log("Fetching product with SKU: ", currentSKU);
                const response = await fetch(`${apiUrl}/products/by-sku/${currentSKU}`);
                
                if(!response.ok) {
                    console.error("Failed to fetch product by SKU: ", response.statusText);
                    return; //Don't update if fetch fails.
                }

                const data = await response.json();
                console.log("Received product data: ", data);

                if(!data.product) {
                    console.error("Product not found: ", currentSKU);
                    return; //Don't update if product not found.
                }

                //Only update the product if the received SKU matches what is requested.
                const receivedSelections = parseSKU(data.product.sku);
                if(receivedSelections.shapeId !== selections.shapeId) {
                    console.error("Received product shape does not match selected shape: Requested", receivedSelections.shapeId, "Received", selections.shapeId);
                    return; //Don't update if the shape doesn't match.
                }

                //Update the current product with the new data.
                if(isMounted.current) {
                    setCurrentProduct(data.product);
                }

                //Update URL without refreshing the page.
                const pathSegments = location.pathname.split('/');
                const newPath = pathSegments.slice(0, pathSegments.length - 1).join('/') + `/${currentSKU}`;
                navigate(newPath, { replace: true });
            }
            catch(error) {
                console.error("Error updating product: ", error);
            }
        };

        updateProduct();
    }, [currentSKU, product.sku, location.pathname, navigate]); //Only run when the currentSKU changes.


    //DEBUG: Log the current selections and SKU.
    useEffect(() => {
        console.log("Selection state updated: ", selections);
    }, [selections]);
    useEffect(() => {
        console.log("Current SKU updated: ", currentSKU);
    }, [currentSKU]);



    //Function: Check if an option is valid (used for UI rendering).
    const isOptionValid = useCallback((optionType, optionId) => {
        if(!optionId) return false; //Option must be selected.

        switch(optionType) {
            case 'flavorId':
            case 'flourId':
                return true; //Flavor and flour options are always valid.
            case 'shapeId':
                //Shape must be valid for current category.
                const categoryShapes = constraints.validShapesByCategory.get(Number(categoryId));
                const isValid = categoryId && categoryShapes && categoryShapes.has(Number(optionId));
                console.log(`Checking shape validity: ${optionId} for category ${categoryId} - ${isValid}`);
                return isValid;
            case 'sizeId':
                //Size must be valid for current shape.
                const shapId = Number(selections.shapeId);
                const validSizes = constraints.validSizesByShape.get(shapId);
                const isValidSize = shapId && validSizes && validSizes.has(Number(optionId));
                console.log(`Checking size validity: ${optionId} for shape ${shapId} - ${isValidSize}`);
                return isValidSize;
            default:
                return false;
        }
    }, [categoryId, selections.shapeId, constraints]);



    //Function: Render the stars based on the rating.
    const renderedStars = useMemo(() => {
        const validRating = typeof rating === 'number' ? rating : 0;
        let stars = [];
        for(let i = 1; i<= 5; i++) {
            stars.push(
                <img 
                    key={i} 
                    src={i <= Math.round(validRating) ? star_icon : star_dull_icon} 
                    alt=""
                />
            );
        }
        return stars;
    }, [rating]);


  return (
    <div className="productdisplay">
            <div className="productdisplay-left">
                <div className="productdisplay-img-list">
                    <img src={image} alt="" />
                </div>
                <div className="productdisplay-img">
                    <img src={image} alt="" className="productdisplay-main-img" loading="lazy" />
                </div>
            </div>

            <div className="productdisplay-right">
                <h1>{name}</h1>
                <div className="productdisplay-right-stars" title={rating?.toFixed(1) || '0.0'}>
                    {renderedStars}
                    <p>({reviews?.length || 0})</p>
                </div>

                <div className="productdisplay-right-prices">
                    <div className="productdisplay-right-price">${price}</div>
                </div>

                <div className="productdisplay-right-description">
                    <p>{description}</p>
                </div>

                {/* PRODUCT OPTIONS */}
                <div className="productdisplay-right-options">
                    <h2>Select Flavor</h2>
                    <div className="productdisplay-right-flavors">
                        {options.flavors.map(flavor => (
                            <div 
                                key={flavor.FlavorID}
                                className={`option-item ${selections.flavorId === flavor.FlavorID.toString() ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect('flavorId', flavor.FlavorID.toString())}
                            >
                                {flavor.FlavorName}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Shape</h2>
                    <div className="productdisplay-right-shapes">
                        {options.shapes.map(shape => (
                            <div 
                                key={shape.ShapeID}
                                className={`option-item 
                                    ${selections.shapeId === shape.ShapeID?.toString() ? 'selected' : ''} 
                                    ${!isOptionValid('shapeId', shape.ShapeID?.toString()) ? 'disabled' : ''}`}
                                onClick={() => isOptionValid('shapeId', shape.ShapeID?.toString()) && 
                                              handleOptionSelect('shapeId', shape.ShapeID?.toString())}
                            >
                                {shape.ShapeName}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Size</h2>
                    <div className="productdisplay-right-sizes">
                        {options.sizes.map(size => (
                            <div 
                                key={size.SizeID}
                                className={`option-item 
                                    ${selections.sizeId === size.SizeID?.toString() ? 'selected' : ''} 
                                    ${!isOptionValid('sizeId', size.SizeID?.toString()) ? 'disabled' : ''}`}
                                onClick={() => isOptionValid('sizeId', size.SizeID?.toString()) && 
                                              handleOptionSelect('sizeId', size.SizeID?.toString())}
                            >
                                {size.SizeName}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Flour</h2>
                    <div className="productdisplay-right-flours">
                        {options.flours.map(flour => (
                            <div 
                                key={flour.FlourID}
                                className={`option-item ${selections.flourId === flour.FlourID?.toString() ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect('flourId', flour.FlourID?.toString())}
                            >
                                {flour.FlourName}
                            </div>
                        ))}
                    </div>
                </div>
                {/* END PRODUCT OPTIONS */}

                <button onClick={() => handleAddToCart(currentProduct)}>ADD TO CART</button>
                <p className="productdisplay-right-category"><span>Category: </span>{currentProduct?.category}</p>
                <p className="productdisplay-right-category"><span>Tags: </span>{currentProduct?.flour}, {currentProduct?.flavor}, {currentProduct?.shape}, {currentProduct?.size}</p>
            </div>
        </div>
  )
}
