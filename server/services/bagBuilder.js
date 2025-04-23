const { getMaps } = require("../utils/stDataMapperService"); //Import the getMaps function from stDataMapperService.js.
const { convertUnit } = require("../utils/unitConversion"); //Import the convertUnits function from stUtils.js.
let bagSizesCache = null;
let bagSizesCacheTimestamp = null;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; //24 hours in milliseconds.


const buildBag = async (req, res) => {
    try {
        const treatDimensionKey = req.body.treatDimensionKey;
        const amount = req.body.amount; //Get the amount from the request body.}
        findOptimalBagCombination(treatDimensionKey, amount);
        res.status(200).json({ success: true, message: "Price build started." });
    }
    catch(error) {
        console.error("(bagBuilder)(test) Error: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



//Function: Manual cache invalidation for bag sizes. This is used to purposely invalidate the cache when the bag sizes are updated in the SeaTable base.
const invalidateBagSizeCache = () => {
    bagSizesCache = null;
    bagSizesCacheTimestamp = null;
}



//Function: Get all bag sizes from the SeaTable base. This function provides the all the bag sizes available in the SeaTable base. It caches the bag sizes for 24 hours to reduce API calls.
const getAllBagSizes = async () => {
    try {
        //Use cache if it exists and is not expired.
        if(bagSizesCache && bagSizesCacheTimestamp && (Date.now() - bagSizesCacheTimestamp < CACHE_EXPIRY)) {
            return bagSizesCache;
        }

        const map = await getMaps(['PackagingMap']);
        const packagingMap = map.PackagingMap;

        const bagSizes = packagingMap.reduce((acc, item) => {
            acc[item.Size] = {
                id: item._id,
                width: item.DimWidth,
                depth: item.DimDepth,
                height: item.DimHeight,
                maxWeight: item.MaxWeight ? convertUnit(item.MaxWeight, 'oz', 'g') : null, //Convert the max weight from ounces to grams.
                cost: item.PricePerSubUnit, //Price per bag.
            };

            return acc;
        }, {});

        bagSizesCache = bagSizes;
        bagSizesCacheTimestamp = Date.now();
        
        return bagSizes;
    }
    catch(error) {
        console.error("(bagBuilder)(getAllBagSizes) Error getting bag size: ", error);
        return null;
    }
}



//Function: Get treat dimensions for a specific SKU from the SeaTable base.
const getTreatDimensions = async (treatDimensionKey) => {
    try {
        const [subcategoryID, shapeSizeSKU] = treatDimensionKey.split('-'); //Split the SKU into categoryID and shapeSizeSKU.
        const shapeID = shapeSizeSKU.charAt(0);
        const sizeID = shapeSizeSKU.charAt(1);

        console.log(`Getting treat dimensions for SKU: ${treatDimensionKey} (subcategoryID: ${subcategoryID}, ShapeID: ${shapeID}, SizeID: ${sizeID})`);

        const map = await getMaps(['CategoryShapeSizeMap', 'CategoryShapeMap', 'SubCategoryAvgWeightMap', 'SubCategoryMap']);

        const categoryID = map.SubCategoryMap.find(sc => sc.SubCategoryID === Number(subcategoryID)).CategoryID; //Find the category ID from the subcategory ID.
        if (!categoryID) return null; //If no category ID is found, return null.


        //Find the matching CategoryShape record. Otherwise, return null.
        const csID = map.CategoryShapeMap.find(cs => cs.CategoryID === Number(categoryID) && cs.ShapeID === Number(shapeID)).CategoryShapeID;
        if (!csID) return null;

        //Find the matching CategoryShapeSize record. Otherwise, return null.
        const css = map.CategoryShapeSizeMap.find(item => item.CategoryShapeID === csID && item.SizeID === Number(sizeID));
        if (!css) return null;

        //Find the matching SubCategoryAvgWeight record, then the AvgWeight value. Otherwise, return null.
        const treatWeight = map.SubCategoryAvgWeightMap.find(sc => sc.CategoryShapeSizeID === css.CategoryShapeSizeID && sc.Baked === true).AvgWeight; //Default to 0 if not found.
        if (!treatWeight) return null; //If no weight is found, return null.
        

        const treatDimensions = {
            width: css.DimWidth,
            depth: css.DimDepth,
            height: css.DimHeight,
            weight: treatWeight
        };

        return treatDimensions;
    }
    catch(error) {
        console.error("(bagBuilder)(getTreatDimensions) Error getting treat dimensions: ", error);
        return null;
    }
}



//Function: Find the optimal bag combination for a given treat size and amount.
const findOptimalBagCombination = async (treatDimensionKey, amount) => {
    try {
        const [bagSizes, treatDimensions] = await Promise.all([
            getAllBagSizes(),
            getTreatDimensions(treatDimensionKey)
        ]);

        if (!treatDimensions || !bagSizes) {
            throw new Error('Could not get required dimensions');
        }

        const packingEfficiency = 0.60;
        const treatVolume = treatDimensions.width * treatDimensions.depth * treatDimensions.height;
        const treatWeight = treatDimensions.weight;

        //Pre-calculate bag volumes and max treats once. This is done to reduce the number of calculations in the loop.
        const bagsWithMetrics = Object.entries(bagSizes)
            .map(([size, bag]) => {
                const bagVolume = bag.width * bag.depth * bag.height;
                const maxTreats = Math.min(
                    Math.floor((bagVolume * packingEfficiency) / treatVolume),
                    Math.floor(bag.maxWeight / treatWeight)
                );
                return { size, ...bag, maxTreats, bagVolume };
            })
            .filter(bag => bag.maxTreats > 0)
            .sort((a, b) => a.bagVolume - b.bagVolume);

        if (!bagsWithMetrics.length) {
            throw new Error('No suitable bags found');
        }

        let bestCombination = { bags: [], totalCost: Infinity, totalWeight: 0 };

        //Iterate through bags to find the best combination. BIG-O complexity is O(n^2) in the worst case.
        for (const bag of bagsWithMetrics) {
            const fullBags = Math.floor(amount / bag.maxTreats);
            const remainingTreats = amount % bag.maxTreats;

            //Object to store the combination of bags and their total cost and weight.
            let combination = {
                bags: fullBags > 0 ? [{ 
                    size: bag.size, 
                    treats: bag.maxTreats * fullBags,
                    weight: bag.maxTreats * fullBags * treatWeight 
                }] : [],
                totalCost: fullBags * bag.cost,
                totalWeight: fullBags * bag.maxTreats * treatWeight
            };

            //If there are remaining treats, find the best bag for them.
            if (remainingTreats > 0) {
                const smallerBag = bagsWithMetrics.find(b => 
                    b.bagVolume * packingEfficiency >= treatVolume * remainingTreats &&
                    b.maxWeight >= treatWeight * remainingTreats
                );

                const bagToUse = smallerBag || bag;
                combination.bags.push({ 
                    size: bagToUse.size, 
                    treats: remainingTreats,
                    weight: remainingTreats * treatWeight 
                });
                combination.totalCost += bagToUse.cost;
                combination.totalWeight += remainingTreats * treatWeight;
            }

            //Check if the current combination is better than the best one found so far.
            if (combination.totalCost < bestCombination.totalCost) {
                bestCombination = combination;
            }
        }

        console.log(`Best combination for ${treatDimensionKey} (${amount}):`, bestCombination);
        return bestCombination;

    } catch (error) {
        console.error("(findOptimalBagCombination) Error:", error);
        return null;
    }
}



//Function: Get the best bag combination without HTTP request/response handling.
const getBestBagCombination = async (treatDimensionKey, amount) => {
    try {
        return await findOptimalBagCombination(treatDimensionKey, amount);
    }
    catch(error) {
        console.error("(getBestBagCombination) Error:", error);
        return null;
    }
}


const getBestBag = async (req, res) => {
    try {
        const { treatDimensionKey, amount } = req.body;

        if(!treatDimensionKey || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        const bestCombination = await findOptimalBagCombination(treatDimensionKey, Number(amount));

        if(!bestCombination) {
            return res.status(500).json({ success: false, message: "Could not find suitable bag combination" });
        }

        res.status(200).json({ success: true, bagCombination: bestCombination });
    }
    catch(error) {
        console.error("(getBestBag) Error:", error);
        res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
    }
}

module.exports = { buildBag, invalidateBagSizeCache, getBestBag, getBestBagCombination };