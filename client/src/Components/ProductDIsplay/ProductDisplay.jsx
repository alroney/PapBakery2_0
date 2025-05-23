import React, { useCallback, useContext, useEffect, useState, useMemo, useRef } from 'react';
import './ProductDisplay.css';
import star_icon from '../Assets/img/icon/star_icon.png';
import star_dull_icon from '../Assets/img/icon/star_dull_icon.png';
import { CartContext } from '../../Context/CartContext';
import { useLocation, useNavigate } from 'react-router';
import { getOptimalBag } from '../../services/bagService';
import { apiUrl } from '@config';

//#region - OPTION COMPONENTS
//Component: This is a memoized component that renders an option item (flavor, shape, size, or flour) in the product display. Separated from the main component to improve performance and readability and prevent unnecessary rerenders.
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



//Component: This is a memoized component for option categories (flavors, shapes, sizes, flours) in the product display. It uses React.memo to prevent unnecessary re-renders and improve performance.
const OptionCategory = React.memo(({ title, optionType, items, selections, isOptionValid, handleOptionSelect, isLoading, className }) => {
    return (
        <div className="productdisplay-right-options">
            <h2> Select {title}</h2>
            <div className={`productdisplay-right-${className || optionType.toLowerCase()} ${optionType === 'sizeId' && isLoading ? 'loading' : ''}`}>
                {items.map(item => {
                    //Extract properties dynamically based on naming convention.
                    const id = item[`${title}ID`];
                    const name = item[`${title}Name`];

                    return (
                        <OptionItem
                            key={id}
                            id={id}
                            name={name}
                            type={optionType}
                            isSelected={optionType === 'flourId'
                                ? Number(selections[optionType]) === Number(id)
                                : selections[optionType] === id}
                            isValid={isOptionValid(optionType, id)}
                            onSelect={handleOptionSelect}
                            isLoading={isLoading}
                        />
                    )
                })}
            </div>
        </div>
    )
});
//#endregion - OPTION COMPONENTS



//MAIN Component: This is the main component that displays the product details, images, and options. It uses React.memo to prevent unnecessary re-renders and improve performance.
export const ProductDisplay = React.memo(({ product }) => {
    console.log("(ProductDisplay.jsx) Component Loaded.");
    const isMounted = useRef(true); //Reference to check if the component is mounted.
    const navigate = useNavigate(); //Get the navigate function from react-router.
    const location = useLocation(); //Get the current location.
    const {addToCart} = useContext(CartContext);
    const debounceTimerRef = useRef(null); //Reference to store the debounce timer ID.

    const [isLoading, setIsLoading] = useState(false); //State to track loading status.
    const [productCache, setProductCache] = useState({}); //Cache for product data to prevent unnecessary re-fetching.
    const [categoryId, setCategoryId] = useState(null);
    const [currentProduct, setCurrentProduct] = useState(product); //ProductDisplay.jsx <- Product.jsx <- ProductContext.jsx
    const [productImages, setProductImages] = useState([]); //State to store product images.
    const [selectedImageIndex, setSelectedImageIndex] = useState(0); //State to track the currently selected image index.
    const [quantity, setQuantity] = useState(1); //State to track the quantity of the product.
    const [bagInfo, setBagInfo] = useState(null); //State to store bag information.

    //State: Store the selected options in state. This will be used to update the product display.
    const [options, setOptions] = useState({
        flavors: [],
        shapes: [],
        sizes: [],
        flours: []
    });


    //State: Store the constraints for valid shapes and sizes based on the selected category.
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

    //State: Store the selected options in state. This will be used to update the product display.
    const [selections, setSelections] = useState({
        subcategoryId: initialSelections?.subcategoryId || null,
        flourId: initialSelections?.flourId || null,
        flavorId: initialSelections?.flavorId || null,
        shapeId: initialSelections?.shapeId || null,
        sizeId: initialSelections?.sizeId || null
    });

    //Unmount cleanup.
    useEffect(() => {
        return () => {
            isMounted.current = false;
            if(debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);



    //Extract product details.
    const {image, description, rating, reviews, price, flour, flavor, shape, size, ingredients} = currentProduct || {};
    const name = `${size} ${shape} ${flavor} ${product?.subcategory} ${product?.category}`; //Construct the product name from the size, shape, flavor, subcategory, and category.

    
    //Function: Fetch the product images based on the current selections.
    const fetchProductImages = useCallback(async (sku) => {
        if(!sku) return;
        try {
            const response = await fetch(`${apiUrl}/product-images/by-sku/${sku}`);
            if(!response.ok) {
                console.error("failed to fetch product images: ", response.statusText);
                return;
            }

            const data = await response.json();
            if(data.success && data.images && data.images.length > 0) {
                if(isMounted.current) {
                    setProductImages(data.images); //Set the product images in state.
                    setSelectedImageIndex(0); //Reset the selected image index to 0.
                }
            }
            else {
                if(isMounted.current) {
                    setProductImages([{ imgName: image, isNutrition: false }]); //Fallback to default image if no images are found.
                    setSelectedImageIndex(0); //Reset the selected image index to 0.
                }
            }
        }
        catch(error) {
            console.error("Error fetching product images: ", error);
        }
    }, [image]);


    //UseEffect: Fetch product images when the product changes.
    useEffect(() => {
        if(currentProduct?.sku) {
            fetchProductImages(currentProduct.sku);
        }
    }, [currentProduct?.sku, fetchProductImages]);

    //Function: Handle image selection.
    const handleImageSelect = useCallback((index) => {
        setSelectedImageIndex(index);
    }, []);



    //Function (helper): Validate initial selections based on the fetched options and constraints.
    const validateInitialSelections = useCallback((categoryId, selectionToValidate, validShapesByCategory, validSizesByShape) => {
        if(!selectionToValidate || !categoryId) return;
        console.log("Initial Flour: ", selectionToValidate.flourId);
        const { shapeId, sizeId } = selectionToValidate
        const newSelections = { ...selectionToValidate };
        let needsUpdate = false;

        //Check shape validity.
        const validShapes = validShapesByCategory.get(Number(categoryId));
        if(validShapes && !validShapes.has(Number(shapeId))) {
            newSelections.shapeId = Array.from(validShapes)[0];
            needsUpdate = true;
        }

        //Check if size is valid for this shape.
        const validSizes = validSizesByShape.get(Number(newSelections.shapeId));
        if(validSizes && !validSizes.has(Number(sizeId))) {
            //Size is invalid - pick first valid size.
            newSelections.sizeId = Array.from(validSizes)[0];
            needsUpdate = true;
        }

        //Update if needed.
        if(needsUpdate && isMounted.current) {
            setSelections(newSelections);
        }

        return newSelections;
    }, []); //End validateInitialSelections.
    


    //Function: Update the URL without refreshing the page.
    const updateProductUrl = useCallback((sku) => {
        const pathSegments = location.pathname.split('/');
        const newPath = pathSegments.slice(0, pathSegments.length - 1).join('/') + `/${sku}`;
        navigate(newPath, { replace: true });
    }, [location.pathname, navigate]);


    
    //Function: Fetch the product based on the current selections.
    const fetchProductForSelections = useCallback(async (currentSelections) => {
        const { subcategoryId, flourId, flavorId, shapeId, sizeId } = currentSelections;
        if(!subcategoryId || !flourId || !flavorId || !shapeId || !sizeId) {
            setIsLoading(false);
            return;
        }

        const sku = `${subcategoryId}${flourId}${flavorId}-${shapeId}${sizeId}`;
        if(sku === product?.sku) {
            setIsLoading(false);
            return;
        }

        try {
            if(productCache[sku]) {
                console.log("Using cached product data for ", sku);
                setCurrentProduct(productCache[sku]);
                setIsLoading(false);

                fetchProductImages(sku); //Reset images for new product.
                updateProductUrl(sku);
                return;
            }

            console.log("Fetching product with SKU: ", sku);
            const response = await fetch(`${apiUrl}/products/by-sku/${sku}`);

            if(!response.ok) {
                console.error("Failed to fetch product by SKU: ", response.statusText);
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            if(!data.product) {
                console.error("Product not found: ", sku);
                setIsLoading(false);
                return;
            }

            //Validate product matches request.
            const receivedSelections = parseSKU(data.product.sku);
            if(receivedSelections.shapeId !== currentSelections.shapeId) {
                console.error("Received product shape doesn't match request");
                setIsLoading(false);
                return;
            }

            setProductCache(prevCache => ({
                ...prevCache,
                [sku]: data.product
            }));

            //Update current product if still mounted.
            if(isMounted.current) {
                setCurrentProduct(data.product);
                setIsLoading(false);
                fetchProductImages(sku); //Fetch images for the new product.
                updateProductUrl(sku);
            }
        }
        catch(error) {
            console.error("Error fetching product for selections: ", error);
            setIsLoading(false);
        }
    }, [product?.sku, productCache, parseSKU, fetchProductImages, updateProductUrl]);



    //UseEffect: Fetch available options when component mounts.
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const subcategoryId = initialSelections?.subcategoryId; //Get subcategory ID from initial selections.
                if(!subcategoryId) return;

                //Get subcategory info to determine category.
                const subcategoryRes = await fetch(`${apiUrl}/products/subcategory/${subcategoryId}`);
                const subcategory = await subcategoryRes.json();
                const catId = subcategory?.CategoryID;
                console.log("Subcategory ID: ", subcategoryId, "Category ID: ", catId);

                if(!isMounted.current) return;
                setCategoryId(catId); //Set the category ID in state.

                //Fetch all options in parallel.
                const [flavorsRes, shapesRes, sizesRes, floursRes, constraintRes] = await Promise.all([
                    fetch(`${apiUrl}/products/options/flavors`),
                    fetch(`${apiUrl}/products/options/shapes`),
                    fetch(`${apiUrl}/products/options/sizes`),
                    fetch(`${apiUrl}/products/options/flours`),
                    fetch(`${apiUrl}/products/constraints${catId ? `?categoryId=${catId}` : ''}`), //This is a conditional fetch based on the subcategory. This is where the req.query is based off of.
                ]);

                const [flavors, shapes, sizes, flours, constraintsData] = await Promise.all([
                    flavorsRes.json(),
                    shapesRes.json(),
                    sizesRes.json(),
                    floursRes.json(),
                    constraintRes.json()
                ]);

                if(!isMounted.current) return;

                //Process options.
                const newOptions = {
                    flavors: flavors.rows,
                    shapes: shapes.rows,
                    sizes: sizes.rows,
                    flours: flours.rows
                };
                setOptions(newOptions);

                //Process constraints. Lookups.
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

                const newConstraints = {
                    validShapesByCategory,
                    validSizesByShape
                };
                setConstraints(newConstraints);

                //Validate and correct initial selections if needed.
                validateInitialSelections(catId, initialSelections, validShapesByCategory, validSizesByShape);
            }
            catch(error) {
                console.error("Failed to fetch options: ", error);
            }
        }
        fetchOptions();
    }, [initialSelections, validateInitialSelections]);



    //Function: Handle the selecting of a new option.
    const handleOptionSelect = useCallback((optionType, optionId) => {
        //Skip if already selected.
        if(selections[optionType] === optionId) return;
        
        const newSelections = { ...selections, [optionType]: optionId }; //Create new selections object for immutability.

        //Special case for shape - may need to update size.
        if(optionType === 'shapeId') {
            const validSizes = constraints.validSizesByShape.get(Number(optionId));
            if(validSizes && !validSizes.has(Number(newSelections.sizeId))) {
                //Current size is invalid for new shape - pick first valid size.
                newSelections.sizeId = Array.from(validSizes)[0];
            }
        }

        setSelections(newSelections);
        
        //Show loading after a short delay.
        const loadingTimer = setTimeout(() => {
            if(isMounted.current) {
                setIsLoading(true);
            }
        }, 50);

        //Debounce product updates.
        if(debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        //Set a new timer to update the selections after a delay.
        debounceTimerRef.current = setTimeout(() => {
            clearTimeout(loadingTimer); //Clear the loading timer.
            fetchProductForSelections(newSelections);
        }, 300); //Delay of 300ms.
    }, [selections, constraints.validSizesByShape, fetchProductForSelections]);



    //Function: Build a new SKU based on the selected options.
    const currentSKU = useMemo(() => {
        const { subcategoryId, flourId, flavorId, shapeId, sizeId } = selections;
        if(!subcategoryId || !flourId || !flavorId || !shapeId || !sizeId) {
            return null;
        }
        return `${subcategoryId}${flourId}${flavorId}-${shapeId}${sizeId}`;
    }, [selections]);




    //UseEffect: Update the product when SKU changes.
    useEffect(() => {
        if(currentSKU) {
            fetchProductForSelections(selections);
        }
    }, [currentSKU, fetchProductForSelections, selections]);



    //UseEffect: Preload common variations.
    useEffect(() => {
        //Only run this after initial product is loaded and options are fetched.
        if (!product || !options.sizes.length || !options.flavors.length) return;
        
        const preloadCommonVariations = async () => {
            //Get current selections
            const { subcategoryId, flourId, flavorId, shapeId } = selections;
            const validSizes = constraints.validSizesByShape.get(Number(shapeId)) || new Set();
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

        preloadCommonVariations();
    }, [product, options, selections.shapeId, isLoading, selections, constraints.validSizesByShape, productCache, currentSKU]);



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
                return categoryId && categoryShapes && categoryShapes.has(Number(optionId));
                
            case 'sizeId':
                //Size must be valid for current shape.
                const shapId = Number(selections.shapeId);
                const validSizes = constraints.validSizesByShape.get(shapId);
                return shapId && validSizes && validSizes.has(Number(optionId));
            default:
                return false;
        }
    }, [categoryId, selections.shapeId, constraints]);


    
    //Function: Render the stars based on the rating.
    const renderedStars = useMemo(() => {
        const stars = [];
        const roundedRating = Math.round(rating || 0);
        
        for(let i = 1; i<= 5; i++) {
            stars.push(
                <img 
                    key={i} 
                    src={i <= roundedRating ? star_icon : star_dull_icon} 
                    alt={i <= roundedRating ? 'Filled Star' : 'Empty Star'}
                />
            );
        }
        return stars;
    }, [rating]);



    //#region - BAG INFO

    //Function: Update bag information when quanitty changes.
    const updateBagInfo = useCallback(async (currentProduct, qty) => {
        if(!currentProduct || !currentProduct.sku) return;

        const [recipeSKU, shapeSizeSKU] = currentProduct.sku.split('-');
        if(!recipeSKU || !shapeSizeSKU) return;

        const treatDimensionKey = `${recipeSKU[0]}-${shapeSizeSKU}`;
        const bagCombination = await getOptimalBag(treatDimensionKey, qty);
        setBagInfo(bagCombination);
    }, []);



    //UseEffect: update bag info when quantity or product changes.
    useEffect(() => {
        if(currentProduct && quantity > 0) {
            updateBagInfo(currentProduct, quantity);
        }
    }, [currentProduct, quantity, updateBagInfo]);



    //Function: Display the bag info component.
    const renderBagInfo = useCallback(() => {
        console.log("Bag Info: ", bagInfo);
        if(!bagInfo) return null;
        return (
            <div className="product-bag-info">
                <h4>Packaging Information:</h4>
                <div className="bag-details">
                    {bagInfo.bags.map((bag, index) => (
                        <div key={index} className="bag-item">
                            <span>{bag.size} bag: {bag.treats} treats</span>
                        </div>
                    ))}
                    <div className="packaging-cost">
                        <small>Packaging Cost: ${bagInfo.totalCost.toFixed(2)}</small>
                    </div>
                </div>
            </div>
        );
    }, [bagInfo]);
    //#endregion - BAG INFO



    //Function: Handle quantity change.
    const handleQuantityChange = useCallback((newQty) => {
        if(newQty >= 1) {
            setQuantity(newQty);
        }
    }, []);



    //Function: Quantity selector component.
    const renderQuantitySelector = useCallback(() => {
        return (
            <div className="product-quanitty">
                <button onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>-</button>
                <span>{quantity}</span>
                <button onClick={() => handleQuantityChange(quantity + 1)}>+</button>
            </div>
        );
    }, [quantity, handleQuantityChange]);



    //Function: Get the currently selected image.
    const selectedImage = useMemo(() => {
        return productImages.length > 0 ? productImages[selectedImageIndex].imgName : image;
    }, [productImages, selectedImageIndex, image]);



  return (
    <div className="productdisplay">
            {/* LEFT SIDE DISPLAY */}
            <div className="productdisplay-left">
                <div className="productdisplay-left-img-list">
                    {productImages.map((img, index) => (
                        <div
                            key={index}
                            className={`product-thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                            onClick={() => handleImageSelect(index)} //Use the callback here instead of an inline function.
                            // onMouseEnter={() => handleImageSelect(index)} //Change image on hover.
                            title={img.isNutrition ? "Nutrition Facts" : `Image ${index + 1}`}
                        >
                            <img
                                src={img.imgName}
                                alt={img.isNutrition ? "Nutrition Facts" : `Product Thumbnail ${index + 1}`}
                                loading="lazy"
                            />
                            {img.isNutrition && <span className="nutrition-badge">Nutrition</span>}
                        </div>
                    ))}
                </div>
                <div className="productdisplay-img">
                    <img
                        src={selectedImage}
                        alt={productImages[selectedImageIndex]?.isNutrition ? "Nutrition Facts" : `Product Image ${selectedImageIndex + 1}`}
                        className={`productdisplay-main-img ${productImages[selectedImageIndex]?.isNutrition ? 'nutrition-image' : 'product-image'}`}
                        loading="lazy"
                    />
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
                    <br/>
                    <p><strong>Ingredients:</strong> {ingredients}</p>
                </div>

                {/* PRODUCT OPTIONS */}
                {[
                    { title: 'Flavor', optionType: 'flavorId', items: options.flavors, className: 'flavors' },
                    { title: 'Shape', optionType: 'shapeId', items: options.shapes, className: 'shapes' },
                    { title: 'Size', optionType: 'sizeId', items: options.sizes, className: 'sizes' },
                    { title: 'Flour', optionType: 'flourId', items: options.flours, className: 'flours' }
                ].map((category, index) => (
                    <OptionCategory
                        key={index}
                        title={category.title}
                        optionType={category.optionType}
                        items={category.items}
                        selections={selections}
                        isOptionValid={isOptionValid}
                        handleOptionSelect={handleOptionSelect}
                        isLoading={isLoading}
                        className={category.className}
                    />
                ))}
                {/* END PRODUCT OPTIONS */}

                <button 
                    onClick={() => addToCart({...currentProduct, quantity: Number(quantity)})} 
                    disabled={isLoading}
                    className={isLoading ? 'loading' : ''}
                >
                    {isLoading ? 'UPDATING...' :'ADD TO CART'}
                </button>

                {renderQuantitySelector()}
                {renderBagInfo()}
                
                <p className="productdisplay-right-category">
                    <span>Category: </span>{currentProduct?.category}
                </p>
                <p className="productdisplay-right-category">
                    <span>Tags: </span>{flour}, {flavor}, {shape}, {size}
                </p>
            </div>
            {/* END RIGHT SIDE DISPLAY */}
        </div>
  )
});
