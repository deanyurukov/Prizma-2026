
const inputFile = document.getElementById("inputFile");
const outputFile = document.getElementById("outputFile");
const renderButton = document.getElementById("renderButton");

const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

const COLORS = [
    "#ef4444", "#3b82f6", "#22c55e", "#eab308",
    "#a855f7", "#ec4899", "#06b6d4", "#f97316",
    "#84cc16", "#6366f1", "#14b8a6", "#d946ef",
    "#64748b", "#f43f5e", "#0ea5e9", "#a3e635",
    "#c084fc", "#fb923c", "#2dd4bf", "#facc15"
];

renderButton.addEventListener("click", async () => {
    try {
        if (!inputFile.files[0] || !outputFile.files[0]) {
            throw new Error("Моля, изберете и двата файла.");
        }

        const inputText = await inputFile.files[0].text();
        const outputText = await outputFile.files[0].text();

        const graph = parseInput(inputText);
        const assignments = parseOutput(outputText, graph.N);

        drawGraph(graph, assignments);

        document.getElementById("status").textContent = "Визуализацията е генерирана успешно.";
    } catch (error) {
        document.getElementById("status").textContent = `Грешка: ${error.message}`;
        alert(error.message);
    }
});

function parseInput(text) {
    const lines = text.trim().split(/\r?\n/).map(line => line.trim());

    const [N, M, K, T] = lines[0].split(/\s+/).map(Number);

    const villages = [null];
    const roads = [];

    for (let i = 1; i <= N; i++) {
        const [x, y, population] = lines[i].split(/\s+/).map(Number);

        villages.push({ id: i, x, y, population });
    }

    for (let i = N + 1; i <= N + M; i++) {
        const [u, v] = lines[i].split(/\s+/).map(Number);

        roads.push({ u, v });
    }

    return { N, M, K, T, villages, roads };
}

function parseOutput(text, N) {
    const assignments = text.trim().split(/\s+/).map(Number);

    if (assignments.length !== N) {
        throw new Error(
            `Очакваха се ${N} разпределения по региони, получени са ${assignments.length}.`
        );
    }

    if (assignments.some(id => !Number.isInteger(id) || id < 1 || id > 20)) {
        throw new Error("Невалидно разпределение по региони.");
    }

    return [null, ...assignments];
}

function drawGraph(graph, assignments) {
    const { N, K, villages, roads } = graph;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const xs = villages.slice(1).map(v => v.x);
    const ys = villages.slice(1).map(v => v.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 35;

    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);

    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxY - minY) * scale) / 2;

    const positions = [null];

    for (let i = 1; i <= N; i++) {
        const village = villages[i];

        positions.push({
            x: offsetX + (village.x - minX) * scale,
            y: height - (offsetY + (village.y - minY) * scale)
        });
    }

    const regionPopulations = Array(K + 1).fill(0);
    const regionSizes = Array(K + 1).fill(0);

    for (let i = 1; i <= N; i++) {
        const region = assignments[i];

        regionPopulations[region] += villages[i].population;
        regionSizes[region]++;
    }

    let borderCount = 0;

    // Първо се чертаят вътрешните пътища.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#cbd5e1";

    for (const { u, v } of roads) {
        if (assignments[u] !== assignments[v]) continue;

        drawRoad(positions[u], positions[v]);
    }

    // Граничните пътища се чертаят отгоре.
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#dc2626";

    for (const { u, v } of roads) {
        if (assignments[u] === assignments[v]) continue;

        borderCount++;
        drawRoad(positions[u], positions[v]);
    }

    // Чертаят се населените места.
    for (let i = 1; i <= N; i++) {
        const region = assignments[i];
        const position = positions[i];

        ctx.beginPath();
        ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[(region - 1) % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    document.getElementById("settlementCount").textContent = N;
    document.getElementById("regionCount").textContent = new Set(assignments.slice(1)).size;
    document.getElementById("borderCount").textContent = borderCount;

    drawLegend(K, regionPopulations, regionSizes);
}

function drawRoad(a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
}

function drawLegend(K, populations, sizes) {
    const legend = document.getElementById("legend");
    legend.innerHTML = "";

    for (let i = 1; i <= K; i++) {
        const item = document.createElement("div");
        item.className = "legend-item";

        const color = document.createElement("span");
        color.className = "legend-color";
        color.style.background = COLORS[(i - 1) % COLORS.length];

        const text = document.createElement("span");
        text.textContent = `Регион ${i}: ${sizes[i]} населени места, население ${populations[i]}`;

        item.append(color, text);
        legend.appendChild(item);
    }
}