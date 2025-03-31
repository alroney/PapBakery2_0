const { getNutritionData, generateNutritionImage } = require('../services/nutritionLabelService');
const fs = require('fs');
const path = require('path');



//Function: Generate all nutrition labels.
async function generateAllLabels() {
    console.time('generatedAllLabels');

    try{
        //Get all nutrition data.
        const nutritionData = getNutritionData();
        const skus = Object.keys(nutritionData.facts);

        console.log(`Found ${skus.length} products with nutrition data.`);

        //Process in batches to avoid memory issues.
        const BATCH_SIZE = 10;
        let processedCount = 0;

        for(let i = 0; i < skus.length; i += BATCH_SIZE) {
            const batch = skus.slice(i, i + BATCH_SIZE);

            //Process batch in parallel.
            await Promise.all(batch.map(async (sku) => {
                await generateNutritionImage(sku);
                processedCount++;
                if(processedCount % 10 === 0 || processedCount === skus.length) {
                    console.log(`Progress: ${processedCount}/${skus.length} (${Math.round(processedCount/skus.length * 100)}%)`);
                }
            }));
        }
        console.log(`Successfully generated ${processedCount} nutrition labels.`);
    }
    catch(error) {
        console.error('Error generating labels:', error);
    }

    console.timeEnd('generatedAllLabels');
}

generateAllLabels();