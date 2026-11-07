import readline from 'node:readline';

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export async function question(text) {
    return new Promise(resolve => {
        rl.question(text, resolve);
    });
}

export function getPopulationLimits(villages, regions, percentsToBeDiff) {
    const totalInhabitants = villages.reduce(
        (total, village) => total + village.inhabitants,
        0
    );

    const averagePopulation = totalInhabitants / regions;

    const minPopulation = Math.ceil(
        averagePopulation * (1 - percentsToBeDiff / 100)
    );

    const maxPopulation = Math.floor(
        averagePopulation * (1 + percentsToBeDiff / 100)
    );

    return [minPopulation, maxPopulation];
}

export function isValidPopulation(population, minPopulation, maxPopulation) {
    return population >= minPopulation && population <= maxPopulation;
}

export function createRegions(
    villages,
    connectedTo,
    villagesCount,
    regions,
    minPopulation,
    maxPopulation,
    roads
) {
    const villageRegions = Array(villagesCount + 1).fill(0);
    const regionPopulations = Array(regions + 1).fill(0);

    let bestResult = null;
    let bestBorderRoads = Infinity;

    let attempts = 0;
    const maxAttempts = 100000;

    function getNextVillage() {
        for (let i = 1; i <= villagesCount; i++) {
            if (villageRegions[i] === 0) return i;
        }

        return -1;
    }

    function countBorderRoads() {
        let count = 0;

        for (const { from, to } of roads) {
            if (villageRegions[from] !== villageRegions[to]) {
                count++;
            }
        }

        return count;
    }

    function saveSolution() {
        const borderRoads = countBorderRoads();

        if (borderRoads < bestBorderRoads) {
            bestBorderRoads = borderRoads;

            bestResult = {
                villageRegions: [...villageRegions],
                regionPopulations: [...regionPopulations],
                borderRoads: bestBorderRoads
            };
        }
    }

    function checkLastRegion(start, population) {
        if (!isValidPopulation(population, minPopulation, maxPopulation)) {
            return false;
        }

        const visited = new Set([start]);
        const queue = [start];

        for (let head = 0; head < queue.length; head++) {
            const current = queue[head];

            for (const neighbour of connectedTo[current]) {
                if (villageRegions[neighbour] !== 0) continue;
                if (visited.has(neighbour)) continue;

                visited.add(neighbour);
                queue.push(neighbour);
            }
        }

        let remainingCount = 0;

        for (let i = 1; i <= villagesCount; i++) {
            if (villageRegions[i] === 0) {
                remainingCount++;
            }
        }

        return visited.size === remainingCount;
    }

    function buildRegion(regionId) {
        const start = getNextVillage();

        if (start === -1) return false;

        // The last region receives all remaining villages.
        if (regionId === regions) {
            let population = 0;

            for (let i = 1; i <= villagesCount; i++) {
                if (villageRegions[i] === 0) {
                    population += villages[i - 1].inhabitants;
                }
            }

            if (!checkLastRegion(start, population)) {
                return false;
            }

            for (let i = 1; i <= villagesCount; i++) {
                if (villageRegions[i] === 0) {
                    villageRegions[i] = regionId;
                }
            }

            regionPopulations[regionId] = population;

            saveSolution();

            // Undo the last region.
            for (let i = 1; i <= villagesCount; i++) {
                if (villageRegions[i] === regionId) {
                    villageRegions[i] = 0;
                }
            }

            regionPopulations[regionId] = 0;

            return false;
        }

        // Start a new region.
        villageRegions[start] = regionId;

        const result = growRegion(
            regionId,
            [start],
            villages[start - 1].inhabitants
        );

        villageRegions[start] = 0;

        return result;
    }

    function growRegion(regionId, members, population) {
        attempts++;

        if (attempts > maxAttempts) return false;

        // Try completing this region.
        if (population >= minPopulation) {
            regionPopulations[regionId] = population;

            buildRegion(regionId + 1);

            regionPopulations[regionId] = 0;
        }

        // Find unassigned neighbours.
        const candidates = new Set();

        for (const villageId of members) {
            for (const neighbour of connectedTo[villageId]) {
                if (villageRegions[neighbour] === 0) {
                    candidates.add(neighbour);
                }
            }
        }

        // Try adding each candidate.
        for (const villageId of candidates) {
            const inhabitants = villages[villageId - 1].inhabitants;

            if (population + inhabitants > maxPopulation) continue;

            villageRegions[villageId] = regionId;

            growRegion(
                regionId,
                [...members, villageId],
                population + inhabitants
            );

            // Undo assignment.
            villageRegions[villageId] = 0;

            if (attempts > maxAttempts) return false;
        }

        return false;
    }

    // Start searching from village 1.
    const firstVillage = 1;
    villageRegions[firstVillage] = 1;

    growRegion(
        1,
        [firstVillage],
        villages[firstVillage - 1].inhabitants
    );

    return bestResult;
}