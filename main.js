import { createRegions, getPopulationLimits } from "./helpers.js";

async function main(input) {
    const [villagesCount, roadsCount, regions, percentsToBeDiff] = input.shift().split(" ").map(Number);

    const villages = [];
    const roads = [];

    for (let i = 1; i <= villagesCount; i++) {
        const [x, y, inhabitants] = input.shift().split(" ").map(Number);
        villages.push({ id: i, x, y, inhabitants });
    }

    for (let i = 1; i <= roadsCount; i++) {
        const [from, to] = input.shift().split(" ").map(Number);
        roads.push({ from, to });
    }

    const connectedTo = Array.from(
        { length: villagesCount + 1 },
        () => []
    );

    for (const { from, to } of roads) {
        connectedTo[from].push(to);
        connectedTo[to].push(from);
    }

    const [minPopulation, maxPopulation] = getPopulationLimits(
        villages,
        regions,
        percentsToBeDiff
    );

    const result = createRegions(
        villages,
        connectedTo,
        villagesCount,
        regions,
        minPopulation,
        maxPopulation,
        roads
    );

    if (result === null) {
        console.log("Could not create a valid partition.");
    } else {
        console.log(result.villageRegions.slice(1).join(" "));
    }
}

// Read input from stdin
// let input = "";

// process.stdin.setEncoding("utf8");

// process.stdin.on("data", chunk => {
//     input += chunk;
// });

// process.stdin.on("end", () => {
//     const lines = input
//         .trim()
//         .split(/\r?\n/)
//         .map(line => line.trim())
//         .filter(line => line.length > 0);

//     main(lines);
// });

main([
    
])