
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

export function isValidPopulation(
    population,
    minPopulation,
    maxPopulation
) {
    return (
        population >= minPopulation &&
        population <= maxPopulation
    );
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
    const MAX_TREE_ATTEMPTS = 10000;
    const MAX_TRANSITIONS_PER_TREE = 1_500_000;
    const MAX_CANDIDATES_PER_STATE = 2;
    const TIME_LIMIT_MS = 7500;

    const deadline = Date.now() + TIME_LIMIT_MS;
    const stride = maxPopulation + 1;

    let bestResult = null;
    let bestBorderRoads = Infinity;

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }

        return array;
    }

    function addCandidate(map, key, mask) {
        let candidates = map.get(key);

        if (!candidates) {
            map.set(key, [mask]);
            return;
        }

        if (candidates.includes(mask)) return;

        if (candidates.length < MAX_CANDIDATES_PER_STATE) {
            candidates.push(mask);
            return;
        }

        // Reservoir sampling: occasionally replace an existing
        // candidate to preserve different possible partitions.
        const index = Math.floor(
            Math.random() * (candidates.length + 1)
        );

        if (index < MAX_CANDIDATES_PER_STATE) {
            candidates[index] = mask;
        }
    }

    function countBorderRoads(villageRegions) {
        let count = 0;

        for (const { from, to } of roads) {
            if (villageRegions[from] !== villageRegions[to]) {
                count++;
            }
        }

        return count;
    }

    function createRandomTree() {
        const parent = Array(villagesCount + 1).fill(-1);
        const parentEdge = Array(villagesCount + 1).fill(-1);

        const children = Array.from(
            { length: villagesCount + 1 },
            () => []
        );

        const tree = Array.from(
            { length: villagesCount + 1 },
            () => []
        );

        const order = [];
        const queue = [];

        const start =
            1 + Math.floor(Math.random() * villagesCount);

        parent[start] = 0;
        queue.push(start);

        let edgeId = 0;

        for (let head = 0; head < queue.length; head++) {
            const current = queue[head];
            order.push(current);

            const neighbours = shuffle([...connectedTo[current]]);

            for (const neighbour of neighbours) {
                if (parent[neighbour] !== -1) continue;

                parent[neighbour] = current;
                parentEdge[neighbour] = edgeId;

                children[current].push({
                    id: neighbour,
                    edgeId
                });

                tree[current].push({
                    id: neighbour,
                    edgeId
                });

                tree[neighbour].push({
                    id: current,
                    edgeId
                });

                edgeId++;
                queue.push(neighbour);
            }
        }

        if (order.length !== villagesCount) return null;

        return {
            parent,
            parentEdge,
            children,
            tree,
            order
        };
    }

    function buildPartition(tree, cutMask) {
        const villageRegions = Array(villagesCount + 1).fill(0);
        const regionPopulations = Array(regions + 1).fill(0);

        let regionId = 0;

        for (let i = 1; i <= villagesCount; i++) {
            if (villageRegions[i] !== 0) continue;

            regionId++;

            if (regionId > regions) return null;

            const queue = [i];
            villageRegions[i] = regionId;

            for (let head = 0; head < queue.length; head++) {
                const current = queue[head];

                regionPopulations[regionId] +=
                    villages[current - 1].inhabitants;

                for (const { id, edgeId } of tree.tree[current]) {
                    const isCut =
                        (cutMask & (1n << BigInt(edgeId))) !== 0n;

                    if (isCut || villageRegions[id] !== 0) {
                        continue;
                    }

                    villageRegions[id] = regionId;
                    queue.push(id);
                }
            }
        }

        if (regionId !== regions) return null;

        for (let i = 1; i <= regions; i++) {
            if (
                !isValidPopulation(
                    regionPopulations[i],
                    minPopulation,
                    maxPopulation
                )
            ) {
                return null;
            }
        }

        return {
            villageRegions,
            regionPopulations,
            borderRoads: countBorderRoads(villageRegions)
        };
    }

    function solveTree(tree) {
        const dp = Array(villagesCount + 1).fill(null);

        let transitions = 0;

        for (let i = tree.order.length - 1; i >= 0; i--) {
            if (Date.now() >= deadline) return null;

            const node = tree.order[i];

            let states = new Map();

            const population = villages[node - 1].inhabitants;

            states.set(population, [0n]);

            const children = [...tree.children[node]].sort(
                (a, b) => dp[a.id].size - dp[b.id].size
            );

            for (const { id: child, edgeId } of children) {
                const childStates = dp[child];
                const nextStates = new Map();

                const cutBit = 1n << BigInt(edgeId);

                for (const [keyA, masksA] of states) {
                    const closedA = Math.floor(keyA / stride);
                    const openA = keyA % stride;

                    for (const [keyB, masksB] of childStates) {
                        const closedB = Math.floor(keyB / stride);
                        const openB = keyB % stride;

                        const closed = closedA + closedB;

                        if (closed > regions - 1) continue;

                        const joinedPopulation = openA + openB;

                        // Option 1: Join the child component.
                        if (joinedPopulation <= maxPopulation) {
                            const joinedKey =
                                closed * stride + joinedPopulation;

                            for (const maskA of masksA) {
                                for (const maskB of masksB) {
                                    transitions++;

                                    if (
                                        transitions >
                                        MAX_TRANSITIONS_PER_TREE
                                    ) {
                                        return null;
                                    }

                                    if (
                                        (transitions & 4095) === 0 &&
                                        Date.now() >= deadline
                                    ) {
                                        return null;
                                    }

                                    addCandidate(
                                        nextStates,
                                        joinedKey,
                                        maskA | maskB
                                    );
                                }
                            }
                        }

                        // Option 2: Cut the edge to the child.
                        if (
                            openB >= minPopulation &&
                            openB <= maxPopulation &&
                            closed + 1 <= regions - 1
                        ) {
                            const cutKey =
                                (closed + 1) * stride + openA;

                            for (const maskA of masksA) {
                                for (const maskB of masksB) {
                                    transitions++;

                                    if (
                                        transitions >
                                        MAX_TRANSITIONS_PER_TREE
                                    ) {
                                        return null;
                                    }

                                    if (
                                        (transitions & 4095) === 0 &&
                                        Date.now() >= deadline
                                    ) {
                                        return null;
                                    }

                                    addCandidate(
                                        nextStates,
                                        cutKey,
                                        maskA | maskB | cutBit
                                    );
                                }
                            }
                        }
                    }
                }

                states = nextStates;
                dp[child] = null;

                if (states.size === 0) return null;
            }

            dp[node] = states;
        }

        const root = tree.order[0];
        const rootStates = dp[root];

        let bestPartition = null;

        for (
            let population = minPopulation;
            population <= maxPopulation;
            population++
        ) {
            const key = (regions - 1) * stride + population;
            const candidates = rootStates.get(key);

            if (!candidates) continue;

            for (const cutMask of candidates) {
                if (Date.now() >= deadline) return bestPartition;

                const result = buildPartition(tree, cutMask);

                if (!result) continue;

                if (
                    bestPartition === null ||
                    result.borderRoads < bestPartition.borderRoads
                ) {
                    bestPartition = result;
                }
            }
        }

        return bestPartition;
    }

    for (
        let attempt = 0;
        attempt < MAX_TREE_ATTEMPTS && Date.now() < deadline;
        attempt++
    ) {
        const tree = createRandomTree();

        if (!tree) continue;

        const result = solveTree(tree);

        if (!result) continue;

        if (result.borderRoads < bestBorderRoads) {
            bestBorderRoads = result.borderRoads;
            bestResult = result;
        }

        if (bestBorderRoads === 0) break;
    }

    return bestResult;
}