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
    
    const [isLoading, setIsLoading] = useState(false); //State to track loading status.
    const [productCache, setProductCache] = useState({}); //Cache for product data to prevent unnecessary re-fetching.
    
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
            subcategoryId: parseInt(sku.charAt(0)),
            flourId: parseInt(sku.charAt(1)),
            flavorId: parseInt(sku.charAt(2)),
            shapeId: parseInt(sku.charAt(4)),
            sizeId: parseInt(sku.charAt(5))
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
    const [debouncedSelections, setDebouncedSelections] = useState(selections); //State for debounced selections to prevent rapid updates to the product display.
    const debounceTimerRef = useRef(null); //Reference to store the debounce timer ID.


    //UseEffect: Fetch available options when component mounts.
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const subcategoryId = initialSelections?.subcategoryId; //Get subcategory ID from initial selections.
                
                //First get subcategory info to determine category.
                const subcategoryRes = await fetch(`${apiUrl}/products/subcategory/${subcategoryId}`);
                const subcategory = await subcategoryRes.json();
                const catId = subcategory?.CategoryID;
                setCategoryId(catId); //Set the category ID in state.

                const [ //Fetch all the options in parallel.
                    flavorsRes,
                    shapesRes,
                    sizesRes,
                    floursRes,
                    constraintRes,
                ] = await Promise.all([
                    fetch(`${apiUrl}/products/options/flavors`),
                    fetch(`${apiUrl}/products/options/shapes`),
                    fetch(`${apiUrl}/products/options/sizes`),
                    fetch(`${apiUrl}/products/options/flours`),
                    fetch(`${apiUrl}/products/constraints${catId ? `?categoryId=${catId}` : ''}`), //This is a conditional fetch based on the subcategory. This is where the req.query is based off of.
                ]);

                const [ //Destructure the responses.
                    flavors,
                    shapes,
                    sizes,
                    flours,
                    constraintsData
                ] = await Promise.all([
                    flavorsRes.json(),
                    shapesRes.json(),
                    sizesRes.json(),
                    floursRes.json(),
                    constraintRes.json()
                ]);

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
            newSelections.shapeId = firstValidShape;
            needsUpdate = true;
        }

        //Check if size is valid for this shape.
        const validSizes = validSizesByShape.get(Number(newSelections.shapeId));
        if(validSizes && !validSizes.has(Number(sizeId))) {
            //Size is invalid - pick first valid size.
            const firstValidSize = Array.from(validSizes)[0];
            newSelections.sizeId = firstValidSize;
            needsUpdate = true;
        }

        //Update selections if needed.
        if(needsUpdate) {
            setSelections(newSelections);
        }
    }; //End validateInitialSelections.



    //Function: Handle the selecting of a new option.
    const handleOptionSelect = useCallback((optionType, optionId) => {
        //Don't do anything if the option is already selected.
        if(selections[optionType] === optionId) return;
        
        const newSelections = { ...selections, [optionType]: optionId }; //Create new selections object for immutability.

        //Special case for shape - may need to update size.
        if(optionType === 'shapeId') {
            const validSizes = constraints.validSizesByShape.get(Number(optionId));
            if(validSizes && !validSizes.has(Number(newSelections.sizeId))) {
                //Current size is invalid for new shape - pick first valid size.
                const firstValidSize = Array.from(validSizes)[0];
                newSelections.sizeId = firstValidSize;
            }
        }

        setSelections(newSelections);
        const loadingTimer = setTimeout(() => {
            if(isMounted.current) {
                setIsLoading(true);
            }
        }, 50) //Small delay before showing loading indicator.)

        if(debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current); //Clear the previous timer if it exists.
        }

        //Set a new timer to update the selections after a delay.
        debounceTimerRef.current = setTimeout(() => {
            clearTimeout(loadingTimer); //Clear the loading timer.

            const finalSelections = { ...newSelections };
            delete finalSelections._changing;
            
            if(isMounted.current) {
                setDebouncedSelections(newSelections); //Update the debounced selections. isLoading will be set to false by the useEffect that handles product updates.
            }
        }, 300); //Delay of 300ms.
    }, [selections, constraints]);



    //Function: Build a new SKU based on the selected options.
    const currentSKU = useMemo(() => {
        if(!selections.subcategoryId || !selections.flourId || !selections.flavorId || !selections.shapeId || !selections.sizeId) {
            return null;
        }
        return `${selections.subcategoryId}${selections.flourId}${selections.flavorId}-${selections.shapeId}${selections.sizeId}`;
    }, [selections]);


    //UseEffect: Synchronize debouncedSelections and selections.
    useEffect(() => {
    }, [debouncedSelections]);

    //UseEffect: Update the product when the selected options change.
    useEffect(() => {
        if(!currentSKU || currentSKU === product.sku) {
            setIsLoading(false);
            return;
        };

        const updateProduct = async () => {
            try {
                //Check cache first.
                if(productCache[currentSKU]) {
                    console.log("Using cached product data.");
                    setCurrentProduct(productCache[currentSKU]);
                    setIsLoading(false);

                    //Still update the URL.
                    const pathSegments = location.pathname.split('/');
                    const newPath = pathSegments.slice(0, pathSegments.length - 1).join('/') + `/${currentSKU}`;
                    navigate(newPath, { replace: true });
                    return; //Don't fetch if we have cached data.
                }

                console.log("Fetching product with SKU: ", currentSKU);
                const response = await fetch(`${apiUrl}/products/by-sku/${currentSKU}`);
                
                if(!response.ok) {
                    console.error("Failed to fetch product by SKU: ", response.statusText);
                    return; //Don't update if fetch fails.
                }

                const data = await response.json();

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
                setIsLoading(false); //Set loading to false when the product is updated.

                //Add to cache when successful.
                if(data.product) {
                    setProductCache(prevCache => ({
                        ...prevCache,
                        [currentSKU]: data.product
                    }));

                    if(isMounted.current){
                        setCurrentProduct(data.product);
                    }
                }
            }
            catch(error) {
                console.error("Error updating product: ", error);
                setIsLoading(false); //Set loading to false if an error occurs.
            }
        };

        updateProduct();
    }, [currentSKU]); //Only run when the currentSKU changes.

    useEffect(() => {
        //Only run this after initial product is loaded and options are fetched.
        if (!product || !options.sizes.length || !options.flavors.length) return;
        
        const preloadCommonVariations = async () => {
            //Get current selections
            const { subcategoryId, flourId, flavorId, shapeId } = selections;
            
            //Preload all size variations for the current shape.
            const validSizes = constraints.validSizesByShape.get(Number(shapeId)) || new Set();
            
            //Don't preload more than 3 variations to avoid excessive requests.
            const sizesToPreload = Array.from(validSizes).slice(0, 3);
            
            //Create promises for preloading but don't wait for them.
            sizesToPreload.forEach(sizeId => {
                const skuToPreload = `${subcategoryId}${flourId}${flavorId}-${shapeId}${sizeId}`;
                
                // Skip if already in cache or current selection.
                if (productCache[skuToPreload] || skuToPreload === currentSKU) return;
                
                // Preload in background.
                fetch(`${apiUrl}/products/by-sku/${skuToPreload}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.product) {
                            setProductCache(prev => ({
                                ...prev,
                                [skuToPreload]: data.product
                            }));
                            console.log(`Preloaded product: ${skuToPreload}`);
                        }
                    })
                    .catch(err => console.log(`Preload error for ${skuToPreload}:`, err));
            });
        };
        
        //Only run preloading if not in loading state.
        if (!isLoading) {
            preloadCommonVariations();
        }
    }, [product, options, selections.shapeId, isLoading]);

    //DEBUG: Log the current selections and SKU.
    // useEffect(() => {
    //     console.log("Selection state updated: ", selections);
    // }, [selections]);
    // useEffect(() => {
    //     console.log("Current SKU updated: ", currentSKU);
    // }, [currentSKU]);



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
                return isValid;
            case 'sizeId':
                //Size must be valid for current shape.
                const shapId = Number(selections.shapeId);
                const validSizes = constraints.validSizesByShape.get(shapId);
                const isValidSize = shapId && validSizes && validSizes.has(Number(optionId));
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



    const OptionItem = React.memo(({ id, name, type, isSelected, isValid, onSelect, isLoading }) => {
        
        const handleClick = React.useCallback(() => {
            if(!isLoading && isValid) {
                onSelect(type, id);
            }
        }, [id, isLoading, isValid, onSelect, type]);

        return (
            <div 
                className={`option-item ${isSelected ? 'selected' : ''} ${!isValid ? 'disabled' : ''}`}
                onClick={handleClick} //Use the callback here instead of an inline function.
            >
                {name}
            </div>
        );
    }, (prevProps, nextProps) => {
        return (
            prevProps.isSelected === nextProps.isSelected &&
            prevProps.isValid === nextProps.isValid &&
            prevProps.isLoading === nextProps.isLoading
        );
    });




  return (
    <div className="productdisplay">
            {/* LEFT SIDE DISPLAY */}
            <div className="productdisplay-left">
                <div className="productdisplay-img-list">
                    <img src={image} alt="" />
                </div>
                <div className="productdisplay-img">
                    <img src={image} alt="" className="productdisplay-main-img" loading="lazy" />
                </div>
            </div>
            {/* END LEFT SIDE DISPLAY */}


            {/* RIGHT SIDE DISPLAY */}
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
                            <OptionItem
                                key={flavor.FlavorID}
                                id={flavor.FlavorID}
                                name={flavor.FlavorName}
                                type="flavorId"
                                isSelected={selections.flavorId === flavor.FlavorID}
                                isValid={isOptionValid('flavorId', flavor.FlavorID)}
                                onSelect={handleOptionSelect}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Shape</h2>
                    <div className="productdisplay-right-shapes">
                        {options.shapes.map(shape => (
                            <OptionItem
                                key={shape.ShapeID}
                                id={shape.ShapeID}
                                name={shape.ShapeName}
                                type="shapeId"
                                isSelected={selections.shapeId === shape.ShapeID}
                                isValid={isOptionValid('shapeId', shape.ShapeID)}
                                onSelect={handleOptionSelect}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Size</h2>
                    <div className={`productdisplay-right-sizes ${isLoading ? 'loading' : ''}`}>
                        {options.sizes.map(size => (
                            <OptionItem
                                key={size.SizeID}
                                id={size.SizeID}
                                name={size.SizeName}
                                type="sizeId"
                                isSelected={selections.sizeId === size.SizeID}
                                isValid={isOptionValid('sizeId', size.SizeID)}
                                onSelect={handleOptionSelect}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                </div>

                <div className="productdisplay-right-options">
                    <h2>Select Flour</h2>
                    <div className="productdisplay-right-flours">
                        {options.flours.map(flour => (
                            <OptionItem
                                key={flour.FlourID}
                                id={flour.FlourID}
                                name={flour.FlourName}
                                type="flourId"
                                isSelected={Number(selections.flourId) === Number(flour.FlourID)}
                                isValid={isOptionValid('flourId', flour.FlourID)}
                                onSelect={handleOptionSelect}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                </div>
                {/* END PRODUCT OPTIONS */}

                <button 
                    onClick={() => handleAddToCart(currentProduct)} 
                    disabled={isLoading}
                    className={isLoading ? 'loading' : ''}
                >
                    {isLoading ? 'UPDATING...' :'ADD TO CART'}
                </button>
                <p className="productdisplay-right-category"><span>Category: </span>{currentProduct?.category}</p>
                <p className="productdisplay-right-category"><span>Tags: </span>{currentProduct?.flour}, {currentProduct?.flavor}, {currentProduct?.shape}, {currentProduct?.size}</p>
            </div>
            {/* END RIGHT SIDE DISPLAY */}
        </div>
  )
}
