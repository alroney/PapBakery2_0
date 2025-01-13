const levenshteinDistance = require('./levenshteinDistance');

//Object: key-value pairs of unit conversion factors.
const unitConversionFactors = {
    kg: 1000, //1kg = 1000g
    g: 1, //1g = 1g
    mg: 0.001, //1mg = 0.001g
    lb: 453.592, //1lb = 453.592g
    oz: 28.3495, //1oz = 28.3495g
    fl_oz: 29.5735, //1fl_oz = 29.5735g
    ct: 1, //1ct = 1ct
    pc: 1, //1pc = 1pc
    ea: 1, //1ea = 1ea
};

//Object: names to abbreviations for units.
const unitNamesToAbbreviations = {
    kilogram: "kg",
    gram: "g",
    milligram: "mg",
    pound: "lb",
    ounce: "oz",
    fluid_ounce: "fl_oz",
    count: "ct",
    piece: "pc",
    each: "ea",
};



//Function: normalize unit names by removing plurality, spaces, and converting to lowercase
const normalizeUnitName = (unit) => {
    console.log("unit: ", unit);
    const normUnit = unit.toLowerCase().replace(/\s+/g, '_').replace(/s$/, '').replace(/ies$/, 'y');
    console.log("Normalized Unit: ", normUnit);
    return normUnit;
}

//Function: check if a unit is valid and return its abbreviation
function checkAndValidateUnit(rawUnit) {
    try {
        // Normalize the input
        const normalizedUnit = normalizeUnitName(rawUnit);
            
        // Check if it's already a valid abbreviation
        if (Object.values(unitNamesToAbbreviations).includes(normalizedUnit)) {
            return normalizedUnit;
        }

        // Check if it's a full name that maps to an abbreviation
        if (unitNamesToAbbreviations[normalizedUnit]) {
            return unitNamesToAbbreviations[normalizedUnit];
        }

        // If not found, find closest match using Levenshtein distance
        const allUnits = [...Object.keys(unitNamesToAbbreviations), ...Object.values(unitNamesToAbbreviations)];
        let closestMatch = '';
        let minDistance = Infinity;

        for (const unit of allUnits) {
            const distance = levenshteinDistance(normalizedUnit, unit);
            if (distance < minDistance) {
                minDistance = distance;
                closestMatch = unit;
            }
        }

        // If the closest match is an abbreviation, return it
        if (Object.values(unitNamesToAbbreviations).includes(closestMatch)) {
            return closestMatch;
        }
        // If it's a full name, convert to abbreviation
        return unitNamesToAbbreviations[closestMatch] || null;
    }
    catch(error) {
        console.error("(unitConversion.js)(checkAndValidateUnit) Error while checking and validating unit: ", error);
        throw error;
    }
    
}

//Function: convert a value from one unit to another.
const convertUnit = (value, fromUnit, toUnit) => {
    const fromFactor = checkAndValidateUnit(fromUnit);
    const toFactor = checkAndValidateUnit(toUnit);

    try {
        if (fromFactor && toFactor) {
            //Convert the value to the base unit
            const convertedValue = value * (unitConversionFactors[fromFactor] / unitConversionFactors[toFactor]);
            console.log(`${value} ${fromUnit} is equal to ${convertedValue} ${toUnit}`);
            return convertedValue;
        }
        throw new Error("Invalid unit provided");
    }
    catch(error) {
        console.error("Error while converting unit: ", error);
        throw error;
    }
}

module.exports = convertUnit;