import React, { useState } from 'react';
const apiBase = "http://localhost:4000/api";

const MathTest = () => {
    const [shapeSizeSKU, setShapeSizeSKU] = useState("shapeSizeSKU");
    const [amount, setAmount] = useState(1);

    const test = async () => {
        const response = await fetch(`${apiBase}/seatable/buildPrice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shapeSizeSKU: shapeSizeSKU,
                amount: amount,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Error: ", data);
            return;
        }

        console.log("Test data: ", data);
    }

    return (
        <div className="mathTest">
            <h1>Math Test</h1>
            <input type="text" value={shapeSizeSKU} onChange={(e) => setShapeSizeSKU(e.target.value)} placeholder="1-11" />
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
            <button onClick={() => test()}>Test</button>
        </div>
    )
}

export default MathTest;