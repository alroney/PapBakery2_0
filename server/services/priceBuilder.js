const { getMaps } = require("../utils/stDataMapperService"); //Import the getMaps function from stDataMapperService.js.
const { convertUnit } = require("../utils/unitConversion"); //Import the convertUnits function from stUtils.js.

const buildPrice = async (req, res) => {
    try {
        const shapeSizeSKU = req.body.shapeSizeSKU;
        const amount = req.body.amount; //Get the amount from the request body.}
        findOptimalBagCombination(shapeSizeSKU, amount);
        res.status(200).json({ success: true, message: "Price build started." });
    }
    catch(error) {
        console.error("(stProdBuildController)(test) Error: ", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}



//Function: Get all bag sizes from the SeaTable base.
const getAllBagSizes = async () => {
    try {
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
        
        return bagSizes;
    }
    catch(error) {
        console.error("(stProdBuildController)(getAllBagSizes) Error getting bag size: ", error);
        return null;
    }
}



//Function: Get all treat dimensions from the SeaTable base.
const getAllTreatDimensions = async () => {
    try {
        const map = await getMaps(['CategoryShapeSizeMap', 'CategoryShapeMap', 'ShapeMap', 'SizeMap', 'SubCategoryAvgWeightMap']);
        const cssMap = map.CategoryShapeSizeMap;
        const csMap = map.CategoryShapeMap;
        const shapeMap = map.ShapeMap;
        const sizeMap = map.SizeMap;
        const scawMap = map.SubCategoryAvgWeightMap;

        const treatDimensions = cssMap.reduce((acc, item) => {
            const cs = csMap.find(cs => cs.CategoryShapeID === item.CategoryShapeID); //Find the matching CategoryShapeID in CategoryShapeSize map to the CategoryShapeMap.
            const categoryID = cs.CategoryID;
            const shapeID = shapeMap.find(sh => sh.ShapeID === cs.ShapeID).ShapeID; //Find the matching ShapeID in the ShapeMap.
            const sizeID = sizeMap.find(s => s.SizeID === item.SizeID).SizeID; //Find the matching SizeID in the SizeMap.
            const treatWeight = scawMap.find(sc => (sc.CategoryShapeSizeID === item.CategoryShapeSizeID) && sc.Baked === true); //Find the weight of the treat for the given CategoryShapeSizeID.
            const shapeSizeSKU = `${categoryID}-${shapeID}${sizeID}`; //Concatenate the ShapeID and SizeID to create a unique SKU.
            const treatSize = {
                width: item.DimWidth,
                depth: item.DimDepth,
                height: item.DimHeight,
                weight: treatWeight ? treatWeight.AvgWeight : null, //Use the AvgWeight from the SubCategoryAvgWeightMap.
            };

            acc[shapeSizeSKU] = treatSize; //Add the treat size to the accumulator object using the SKU as the key.
            return acc;
        }, {}); //Initialize the accumulator object as an empty object.

        return treatDimensions;
    }
    catch(error) {
        console.error("(stProdBuildController)(getAllTreatDimensions) Error getting treat dimensions: ", error);
        return null;
    }
}


//Function: Get the maximum number of treats that can fit in each bag size based on volume and weight.
const getAllMaxTreatsPerBag = async () => {
    try {
        const bagSizes = await getAllBagSizes();
        const treatDimensions = await getAllTreatDimensions();
        const packingEfficiency = 0.60; // 60% packaging efficiency.

        const maxTreatsPerBag = Object.keys(bagSizes).reduce((acc, bagSize) => {
            const bag = bagSizes[bagSize];
            const bagVolume = (bag.width * bag.depth * bag.height) * packingEfficiency; //Calculate the bag volume using the dimensions and packing efficiency.
            const bagWeight = bag.maxWeight; //Use the max weight of the bag.

            for(const treatSKU in treatDimensions) {
                const treat = treatDimensions[treatSKU];
                const treatVolume = (treat.width * treat.depth * treat.height); //Calculate the treat volume using the dimensions. (measured using the heighest point of the treat).
                const treatWeight = treat.weight; //Use the weight of the treat.

                //Calculate the number of treats that can fit in the bag based on volume and weight.
                const treatsByVolume = Math.floor(bagVolume / treatVolume);
                const treatsByWeight = Math.floor(bagWeight / treatWeight);

                acc[bagSize] = acc[bagSize] || {}; //Initialize the bag size object if it doesn't exist.
                acc[bagSize][treatSKU] = {
                    treatVolume: treatVolume, //Add the treat volume to the bag size object.
                    maxTreats: Math.min(treatsByVolume, treatsByWeight), //Get the minimum of the two values.
                };
            }

            return acc; //Return the accumulator object.
        }, {}); //Initialize the accumulator object as an empty object.

        console.log("Max Treats Per Bag: ", maxTreatsPerBag); //DEBUG - Log the max treats per bag to the console.
    }
    catch(error) {
        console.error("(stProdBuildController)(getAllMaxTreatsPerBag) Error getting treats per bag: ", error);
        return null;
    }
}



//Function: Find the optimal bag combination for a given treat size and amount.
const findOptimalBagCombination = async (shapeSizeSKU, amount) => {
    try {
        const bagSizes = await getAllBagSizes();
        const treatDimensions = await getAllTreatDimensions();
        const packingEfficiency = 0.60;
        
        const treatVolume = treatDimensions[shapeSizeSKU] ? 
            (treatDimensions[shapeSizeSKU].width * treatDimensions[shapeSizeSKU].depth * treatDimensions[shapeSizeSKU].height) : 0;
        const treatWeight = treatDimensions[shapeSizeSKU]?.weight || 0;

        let bestCombination = { bags: [], totalCost: Infinity };

        //Sort bags by volume for efficiency.
        const sortedBags = Object.entries(bagSizes).sort((a, b) => 
            (a[1].width * a[1].depth * a[1].height) - (b[1].width * b[1].depth * b[1].height));

        //Try each bag size as the primary bag.
        for (const [bagSize, bag] of sortedBags) {
            const bagVolume = bag.width * bag.depth * bag.height;
            const maxTreatsPerBag = Math.min(
                Math.floor((bagVolume * packingEfficiency) / treatVolume),
                Math.floor(bag.maxWeight / treatWeight)
            );

            if (maxTreatsPerBag === 0) continue; //Skip bags that can't hold any treats.

            const fullBags = Math.floor(amount / maxTreatsPerBag);
            const remainingTreats = amount % maxTreatsPerBag; //The '%' symbol is the modulus operator, which gives the remainder of the division.

            let combination = {
                bags: Array(fullBags).fill({ size: bagSize, treats: maxTreatsPerBag, weight: maxTreatsPerBag * treatWeight }),
                totalCost: fullBags * bag.cost,
                totalWeight: fullBags * maxTreatsPerBag * treatWeight
            };

            if (remainingTreats > 0) {
                const smallerBag = sortedBags.find(([_, b]) => {
                    const bVolume = b.width * b.depth * b.height;
                    return (bVolume * packingEfficiency) >= (treatVolume * remainingTreats) && 
                           b.maxWeight >= (treatWeight * remainingTreats);
                });

                if (smallerBag) {
                    combination.bags.push({ size: smallerBag[0], treats: remainingTreats, weight: remainingTreats * treatWeight });
                    combination.totalCost += smallerBag[1].cost;
                    combination.totalWeight += remainingTreats * treatWeight
                } 
                else {
                    combination.bags.push({ size: bagSize, treats: remainingTreats, weight: remainingTreats * treatWeight });
                    combination.totalCost += bag.cost;
                    combination.totalWeight += remainingTreats * treatWeight;
                }
            }

            if (combination.totalCost < bestCombination.totalCost) {
                bestCombination = combination;
            }
        }


        //Log the best combination to the console.
        console.log(`Best combination for ${shapeSizeSKU} with amount ${amount}: `, bestCombination); //DEBUG - Log the best combination to the console.

        return bestCombination;
    } catch (error) {
        console.error("(findOptimalBagCombination) Error finding optimal bag combination: ", error);
        return null;
    }
}


const getBagForTreats = async (shapeSizeSKU, amount) => {
    try {
        const bagSizes = await getAllBagSizes();
        const treatDimensions = await getAllTreatDimensions();
        const packingEfficiency = 0.60;

        const treatVolume = treatDimensions[shapeSizeSKU] ? 
            (treatDimensions[shapeSizeSKU].width * treatDimensions[shapeSizeSKU].depth * treatDimensions[shapeSizeSKU].height) : 0;
        const treatWeight = treatDimensions[shapeSizeSKU]?.weight || 0;
        const totalVolume = treatVolume * amount / packingEfficiency;
        const totalWeight = treatWeight * amount;

        const appropriateBag = Object.entries(bagSizes).find(([_, bag]) => {
            const bagVolume = bag.width * bag.depth * bag.height;
            return bagVolume >= totalVolume && bag.maxWeight >= totalWeight;
        });

        console.log(`Appropriate bag for ${shapeSizeSKU} with amount ${amount}: `, appropriateBag); //DEBUG - Log the appropriate bag to the console.

        return appropriateBag ? appropriateBag[0] : null;
    } catch (error) {
        console.error("(getBagForTreats) Error determining bag size: ", error);
        return null;
    }
}


module.exports = { buildPrice };