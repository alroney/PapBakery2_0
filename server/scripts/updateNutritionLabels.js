const { getNutritionData, generateNutritionImage } = require('../services/nutritionLabelService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION_MAPPTING_PATH = path.join(__dirname, '../cache/nutrition-image-versions.json');



//Function: Update changed nutrition labels.
async function updateChangedLabels() {
    console.time('updateNutritionLabels');

    try {
        //Get current nutrition data.
        const nutritionData = getNutritionData();

        //Load version mapping.
        let versionMap = {};
        if(fs.existsSync(VERSION_MAPPTING_PATH)) {
            versionMap = JSON.parse(fs.readFileSync(VERSION_MAPPTING_PATH, 'utf8'));
        }

        //Identify changed products.
        const skus = Object.keys(nutritionData.facts);
        const changedSkus = [];

        for(const sku of skus) {
            const nutritionFacts = nutritionData.facts[sku];
            const hash = crypto.createHash('md5').update(JSON.stringify(nutritionFacts)).digest('hex').substring(0, 8);

            if(!versionMap[sku] || versionMapp[sku] !== hash) {
                changedSkus.push(sku);
            }
        }

        console.log(`Found ${changedSkus.length} products with changed nutrition data out of ${skus.length} total.`);

        //Process changed products in batches.
        const BATCH_SIZE = 10;
        let processedCount = 0;

        for(let i = 0; i < changedSkus.length; i += BATCH_SIZE) {
            const batch = changedSkus.slice(i, i + BATCH_SIZE);

            //Process batch in parallel.
            await Promise.all(batch.map(async (sku) => {
                await generateNutritionImage(sku);
                processedCount++;
                if(processedCount % 10 === 0 || processedCount === changedSkus.length) {
                    console.log(`Progress: ${processedCount}/${changedSkus.length} (${Math.round(processedCount/changedSkus.length * 100)}%)`);
                }
            }));
        }
        console.log(`Successfully updated ${processedCount} nutrition labels.`);
    }
    catch(error) {
        console.error('Error updating labels:', error);
    }

    console.timeEnd('updateNutritionLabels');
}

updateChangedLabels();