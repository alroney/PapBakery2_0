const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const puppeteer = require('puppeteer');
const NodeCache = require('node-cache');

//Cache for nutrition data and generated image paths.
const nutritionCache = new NodeCache({ stdTTL: 3600 }); //1 hour TTL for cache.

//Paths.
const NUTRITION_DATA_PATH = path.join(__dirname, '../cache/productNutritionFacts.json');
const NUTRITION_IMAGES_DIR = path.join(__dirname, '../../public/images/nutrition');
const VERSION_MAPPING_PATH = path.join(__dirname, '../cache/nutrition-image-versions.json');

//Ensure directories exist. Otherwise, create them.
if(!fs.existsSync(NUTRITION_IMAGES_DIR)) {
    fs.mkdirSync(NUTRITION_IMAGES_DIR, { recursive: true });
}



///Function: Get nutrition data from file or cache.
function getNutritionData() {
    //Use cached data if available.
    const cachedData = nutritionCache.get('nutritionData');
    if(cachedData) return cachedData;

    //Read from file if not in cache.
    try {
        const data = JSON.parse(fs.readFileSync(NUTRITION_DATA_PATH, 'utf8'));
        nutritionCache.set('nutritionData', data);
        return data;
    }
    catch(error) {
        console.error("Error reading nutrition data: ", error);
        return { facts: {} };
    }
}



//Function: Get nutrition facts for a specific product SKU.
function getProductNutrition(sku) {
    const data = getNutritionData();
    return data.facts[sku] || null;
}



//Function: Calculate a hash for the data to use for versioning.
function calculateDataHash(data) {
    return crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex')
        .substring(0, 8);
}



//Function: Get version mapping from file.
function getVersionMapping() {
    try {
        if(fs.existsSync(VERSION_MAPPING_PATH)) {
            const data = JSON.parse(fs.readFileSync(VERSION_MAPPING_PATH, 'utf8'));
            return data;
        }
        return {};
    }
    catch(error) {
        console.error("Error reading version mapping: ", error);
        return {};
    }
}


//Function: Save version mapping to file.
function saveVersionMapping(mapping) {
    try {
        fs.writeFileSync(VERSION_MAPPING_PATH, JSON.stringify(mapping, null, 2));
    }
    catch(error) {
        console.error("Error saving version mapping: ", error);
    }
}



//Function: Format nutrition facts into HTML for rendering.
function formatNutritionLabel(facts) {
    if(!facts) return null;

    //#region - Declare Variables
    const servingSize = (facts.ServingSize || 0).toFixed(1);
    const servingsPerContainer = facts.ServingsPerContainer || 1;
    const servingSizeUnit = facts.ServingSizeUnit || 'g';
    const servingCount = facts.ServingCount || 1;
    const servingSizeDescriptor = facts.ServingSizeDescription || 'pieces';
    const caloriesPerServing = (facts.CaloriesPerServing || 0).toFixed(1);
    const totalFat = (facts.TotalFat || 0).toFixed(1);
    const saturatedFat = (facts.SaturatedFat || 0).toFixed(1);
    const polyunsaturatedFat = (facts.PolyunsaturatedFat || 0).toFixed(1);
    const monounsaturatedFat = (facts.MonounsaturatedFat || 0).toFixed(1);
    const transFat = (facts.TransFat || 0).toFixed(1);
    const cholesterol = (facts.Cholesterol || 0).toFixed(1);
    const sodium = (facts.Sodium || 0).toFixed(1);
    const totalCarbohydrates = (facts.TotalCarbohydrates || 0).toFixed(1);
    const dietaryFiber = (facts.DietaryFiber || 0).toFixed(1);
    const sugar = (facts.Sugar || 0).toFixed(1);
    const addedSugar = (facts.AddedSugar || 0).toFixed(1);
    const protein = (facts.Protein || 0).toFixed(1);
    const vitaminA = (facts.VitaminA || 0).toFixed(1);
    const vitaminB = (facts.VitaminB || 0).toFixed(1);
    const vitaminC = (facts.VitaminC || 0).toFixed(1);
    const vitaminD = (facts.VitaminD || 0).toFixed(1);
    const vitaminE = (facts.VitaminE || 0).toFixed(1);
    const vitaminK = (facts.VitaminK || 0).toFixed(1);
    const calcium = (facts.Calcium || 0).toFixed(1);
    const potassium = (facts.Potassium || 0).toFixed(1);
    const iron = (facts.Iron || 0).toFixed(1);
    const solubleFiber = (facts.SolubleFiber || 0).toFixed(1);
    //#endregion - Declare Variables

    //#region - Create Nutrition Label
    const nutritionLabel = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Nutrition Facts</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Helvetica', Arial, sans-serif;
                    }
                    
                    .nutrition-facts {
                        width: 290px;
                        border: 1px solid #000;
                        padding: 10px;
                        bod-sizing: border-box;
                    }
                    
                    .nutrition-facts h1 {
                        font-size: 24px;
                        font-weight: 900;
                        margin: 0 0 5px;
                        padding-bottom: 5px;
                        border-bottom: 7px solid #000;
                    }

                    .nutrition-facts .title {
                        text-align: center;
                    }

                    .servings-header {
                        font-size: 15px;
                        font-weight: normal;
                        margin: 2px 0;
                        padding: 5px 0;
                        border-bottom: 10px solid #000;
                    }
                        .servings-header p {
                            margin: 0;
                            padding: 0;
                        }

                    .calories-header {
                        font-size: 16px;
                        font-weight: 900;
                        margin: 2px 0;
                        padding: 5px 0;
                        border-bottom 1px solid #000;
                    }
                        .calories-header p {
                            font-size: 12px;
                            font-wieght: 500;
                            margin: 0;
                            padding: 0;
                        }

                    .calories-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 28px;
                        font-weight: 900;
                        margin-bottom: 2px;
                        padding-bottom: 5px;
                        border-bottom: 7px solid #000;
                    }

                    .daily-value-header {
                        font-size: 10px;
                        font-weight: bold;
                        text-align: right;
                        margin: 3px 0;
                    }

                    .separator {
                        border-top: 10px solid #000;
                        margin-bottom: 3px;
                    }

                    .nutrient-row {
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 1px solid #000;
                        padding: 3px 0;
                    }

                    .nutrient-row:last-child {
                        border-bottom: none;
                        margin-bottom: 3px;
                    }

                    .nutrient-row span:first-child {
                        flex: 2;
                    }
                    
                    .nutrient-row span:nth-child(2) {
                        flex: 1;
                        text-align: right;
                        padding-right: 10px;
                        font-weight: normal;
                    }

                    .nutrient-row span:last-child {
                        flex: 0.5;
                        text-align: right;
                        min-width: 40px;
                    }

                    .nutrient-row.bold {
                        font-weight: bold;
                    }

                    .sub-nutrient {
                        padding-left: 20px;
                    }

                    .footnote {
                        font-size: 8px;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="nutrition-facts">
                    <h1 class="title">Nutrition Facts</h1>
                    <div class="servings-header">
                        <p>About ${servingsPerContainer} servings per container</p>
                        <p>Serving Size ${servingSize} ${servingSizeUnit} (about ${servingCount} ${servingSizeDescriptor})</p>
                    </div>

                    <div class="calories-header">
                        <p>Amount per serving</p>
                        <div class="calories-row">
                            <span>Calories</span>
                            <span>${caloriesPerServing}</span>
                        </div>
                    </div>

                    <div class="daily-value-header">% Daily Value*</div>

                    <div class="nutrient-row bold">
                        <span><strong>Total Fat</strong></span>
                        <span>${totalFat}g</span>
                        <span>${Math.round((facts.TotalFat || 0) * 100 / 78)}%</span>
                    </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Saturated Fat</span>
                            <span>${saturatedFat}g</span>
                            <span>${Math.round((facts.SaturatedFat || 0) * 100 / 20)}%</span>
                        </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Polyunsaturated Fat</span>
                            <span>${polyunsaturatedFat}g</span>
                            <span></span>
                        </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Monounsaturated Fat</span>
                            <span>${monounsaturatedFat}g</span>
                            <span></span>
                        </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Trans Fat</span>
                            <span>${transFat}g</span>
                            <span></span>
                        </div>

                    <div class="nutrient-row bold">
                        <span><strong>Cholesterol</strong></span>
                        <span>${cholesterol}mg</span>
                        <span>${Math.round((facts.Cholesterol || 0) * 100 / 300)}%</span>
                    </div>

                    <div class="nutrient-row bold">
                        <span><strong>Sodium</strong></span>
                        <span>${sodium}mg</span>
                        <span>${Math.round((facts.Sodium || 0) * 100 / 2300)}%</span>
                    </div>

                    <div class="nutrient-row bold">
                        <span><strong>Total Carbohydrates</strong></span>
                        <span>${totalCarbohydrates}g</span>
                        <span>${Math.round((facts.TotalCarbohydrates || 0) * 100 / 300)}%</span>
                    </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Dietary Fiber</span>
                            <span>${dietaryFiber}g</span>
                            <span>${Math.round((facts.DietaryFiber || 0) * 100 / 28)}%</span>
                        </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Soluble Fiber</span>
                            <span>${solubleFiber}g</span>
                            <span></span>
                        </div>
                    
                    <div class="nutrient-row bold">
                        <span><strong>Total Sugars</strong></span>
                        <span>${sugar}g</span>
                        <span></span>
                    </div>
                        <div class="nutrient-row">
                            <span class="sub-nutrient">Added Sugars</span>
                            <span>${addedSugar}g</span>
                            <span>${Math.round((facts.AddedSugar || 0) * 100 / 50)}%</span>
                        </div>
                    
                    <div class="nutrient-row bold">
                        <span><strong>Protein</strong></span>
                        <span>${protein}g</span>
                        <span>${Math.round((facts.Protein || 0) * 100 / 50)}%</span>
                    </div>

                    <div class="separator"></div>

                    <div class="nutrient-row bold">
                        <span><strong>Vitamin A</strong></span>
                        <span>${vitaminA}mcg</span>
                        <span>${Math.round((facts.VitaminA || 0) * 100 / 900)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Vitamin B</strong></span>
                        <span>${vitaminB}mcg</span>
                        <span>${Math.round((facts.VitaminB || 0) * 100 / 1.3)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Vitamin C</strong></span>
                        <span>${vitaminC}mg</span>
                        <span>${Math.round((facts.VitaminC || 0) * 100 / 90)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Vitamin D</strong></span>
                        <span>${vitaminD}mcg</span>
                        <span>${Math.round((facts.VitaminD || 0) * 100 / 20)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Vitamin E</strong></span>
                        <span>${vitaminE}mcg</span>
                        <span>${Math.round((facts.VitaminE || 0) * 100 / 15)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Vitamin K</strong></span>
                        <span>${vitaminK}mcg</span>
                        <span>${Math.round((facts.VitaminK || 0) * 100 / 120)}%</span>
                    </div>

                    <div class="separator"></div>

                    <div class="nutrient-row bold">
                        <span><strong>Calcium</strong></span>
                        <span>${calcium}mg</span>
                        <span>${Math.round((facts.Calcium || 0) * 100 / 1300)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Potassium</strong></span>
                        <span>${potassium}mg</span>
                        <span>${Math.round((facts.Potassium || 0) * 100 / 4700)}%</span>
                    </div>
                    <div class="nutrient-row bold">
                        <span><strong>Iron</strong></span>
                        <span>${iron}mg</span>
                        <span>${Math.round((facts.Iron || 0) * 100 / 18)}%</span>
                    </div>

                    <div class="footnote">
                        * Percent Daily Values are based on a 2,000 calorie diet. Your daily values may be higher or lower depending on your calorie needs.
                    </div>
                </div>
            </body>
        </html>
    `;
    //#endregion - Create Nutrition Label

    return nutritionLabel;
}



//Function: Generate nutrition fact, then take a screenshot of it and save it.
async function generateNutritionImage(sku, forceRegenerate = true) {
    try {
        const nutrition = getProductNutrition(sku);
        if(!nutrition) {
            console.error(`No nutrition data found for SKU: ${sku}`);
            return null;
        }

        //Calculate hash for versioning.
        const dataHash = calculateDataHash(nutrition);

        //Check if we need to generate a new image.
        const versionMap = getVersionMapping();
        const currentVersion = versionMap[sku];

        //If we already have this version and not forcing regeneration, return the existing image.
        if(currentVersion === dataHash && !forceRegenerate) {
            // console.log(`Image for SKU ${sku} is up to date.`);
            return `${sku}.${dataHash}.png`;
        }

        //Generate HTML for the nutrition label.
        const html = formatNutritionLabel(nutrition);
        if(!html) return null;

        //Launch browser.
        // console.log(`Generating image for SKU: ${sku}...`);
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        //Create page and set content.
        const page = await browser.newPage();
        await page.setViewport({ width: 300, height: 500 });
        await page.setContent(html);
        await page.evaluateHandle('document.fonts.ready'); //Wait for fonts to load.

        //Get the actual height of the content.
        const bodyHeight = await page.evaluate(() => {
            const nutritionLabel = document.querySelector('.nutrition-facts');
            return nutritionLabel ? nutritionLabel.getBoundingClientRect().height + 20 : 500; //Add padding;
        });

        //Resize viewport to match actual content height.
        await page.setViewport({ width: 300, height: Math.ceil(bodyHeight) });

        //Create image filename with version.
        const filename = `${sku}.${dataHash}.png`;
        const outputPath = path.join(NUTRITION_IMAGES_DIR, filename);

        //Take screenshot of the nutrition label element only.
        const nutritionElement = await page.$('.nutrition-facts');
        if(nutritionElement) {
            //Take screenshot and save as PNG.
            await nutritionElement.screenshot({
                path: outputPath,
                type: 'png',
                omitBackground: false
            });

            //Generate WebP version for modern browsers (smaller file size).
            const webpFilename = `${sku}.${dataHash}.webp`;
            const webpOutputPath = path.join(NUTRITION_IMAGES_DIR, webpFilename);
            await nutritionElement.screenshot({
                path: webpOutputPath,
                type: 'webp',
                quality: 80,
                omitBackground: false
            });
        }
        else { //Fallback to full page screenshot if element not found.
            await page.screenshot({
                path: outputPath,
                type: 'png',
                fullPage: true,
            });

            const webPFilename = `${sku}.${dataHash}.webp`;
            const webpOutputPath = path.join(NUTRITION_IMAGES_DIR, webPFilename);
            await page.screenshot({
                path: webpOutputPath,
                type: 'webp',
                quality: 80,
                fullPage: true,

            })
        }

        //Close browser.
        await browser.close();

        //Update version mapping.
        versionMap[sku] = dataHash;
        saveVersionMapping(versionMap);

        //Clean up old versions.
        cleanupOldVersions(sku, dataHash);

        // console.log(`Generated nutrition image for SKU: ${sku}`);
        return filename;
    }
    catch(error) {
        console.error("Error generating nutrition image: ", error);
        return null;
    }
}



//Function: Clean up old versions of the nutrition image.
function cleanupOldVersions(sku, currentVersion, keepCount = 2) {
    try {
        const files = fs.readdirSync(NUTRITION_IMAGES_DIR);

        //Find all version of this SKU.
        const versionPattern = new RegExp(`^${sku}\\.([0-9a-f]+)\\.(png|webp)$`);
        const versionedFiles = files.filter(file => {
            const match = file.match(versionPattern);
            return match && match[1] !== currentVersion;
        });

        //Sort by creation time (newest first).
        versionedFiles.sort((a, b) => {
            return fs.statSync(path.join(NUTRITION_IMAGES_DIR, b)).mtime.getTime() -
                    fs.statSync(path.join(NUTRITION_IMAGES_DIR, a)).mtime.getTime();
        });

        //Keep the most recent versions, delete the rest.
        const filesToDelete = versionedFiles.slice(keepCount - 1);

        for(const file of filesToDelete) {
            fs.unlinkSync(path.join(NUTRITION_IMAGES_DIR, file));
            // console.log(`Deleted old version: ${file}`);
        }
    }
    catch(error) {
        console.error("Error cleaning up old versions: ", error);
    }
}


//Export functions.
module.exports = {
    getProductNutrition,
    generateNutritionImage,
    formatNutritionLabel,
    getNutritionData
}