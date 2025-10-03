let money = 1000; // starting money
let inventory = [];
let casesData = {}; // JSON data will go here

// Load cases.json when the page starts
async function loadCases() {
    try {
        const res = await fetch("assets/cases.json");
        casesData = await res.json();
        renderCases(); // show cases on the page
        updateMoney();
    } catch (err) {
        console.error("Error loading cases.json:", err);
    }
}

// Render all cases from JSON
function renderCases() {
    const container = document.getElementById("cases-container");
    container.innerHTML = "";

    Object.values(casesData).forEach(cs => {
        const card = document.createElement("div");
        card.classList.add("case-card");
        card.innerHTML = `
            <h2>${cs.name}</h2>
            <p class="price">Price: $${cs.price}</p>
        `;
        card.onclick = () => openCasePage(cs.id);
        container.appendChild(card);
    });
}

// Open a full case page
function openCasePage(caseId) {
    const cs = casesData[caseId];
    const container = document.getElementById("cases-container");
    container.innerHTML = `
        <button onclick="renderCases()">← Back</button>
        <h1>${cs.name}</h1>
        <p>Price: $${cs.price}</p>
        <button onclick="openCase('${caseId}')">Open Case</button>
        <div id="case-animation"></div>
    `;
}

// Open case (with animation)
function openCase(caseId) {
    const cs = casesData[caseId];
    if (money < cs.price) {
        alert("Not enough money!");
        return;
    }
    money -= cs.price;
    updateMoney();

    const pool = [];
    for (let rarity in cs.items) {
        cs.items[rarity].forEach(item => {
            let weight;
            switch (rarity) {
                case "common": weight = 40; break;
                case "uncommon": weight = 30; break;
                case "rare": weight = 15; break;
                case "superrare": weight = 10; break;
                case "legendary": weight = 5; break;
            }
            for (let i = 0; i < weight; i++) {
                pool.push({ name: item, rarity });
            }
        });
    }

    const wonItem = pool[Math.floor(Math.random() * pool.length)];
    inventory.push(wonItem);

    playCaseAnimation(cs, wonItem);
    showPopup(wonItem);
}

// Case animation (scroll with images)
function playCaseAnimation(cs, wonItem) {
    const anim = document.getElementById("case-animation");
    anim.innerHTML = "";

    const scroll = document.createElement("div");
    scroll.classList.add("scroll-strip");

    // Fill scroll with random items
    for (let i = 0; i < 30; i++) {
        const rarityKeys = Object.keys(cs.items);
        const randRarity = rarityKeys[Math.floor(Math.random() * rarityKeys.length)];
        const items = cs.items[randRarity];
        const randItem = items[Math.floor(Math.random() * items.length)];

        const div = document.createElement("div");
        div.classList.add("scroll-item", randRarity);
        div.innerHTML = `
            <img src="assets/${randItem.toLowerCase().replace(/ /g, "_")}.png" alt="${randItem}">
            <p>${randItem}</p>
        `;
        scroll.appendChild(div);
    }

    anim.appendChild(scroll);

    // Animate scroll
    scroll.style.transition = "transform 3s cubic-bezier(0.25, 1, 0.5, 1)";
    const offset = -((Math.random() * (scroll.scrollWidth / 2)) + 200);
    setTimeout(() => {
        scroll.style.transform = `translateX(${offset}px)`;
    }, 50);
}

// Popup for reward
function showPopup(item) {
    const popup = document.createElement("div");
    popup.classList.add("popup", item.rarity);
    popup.innerHTML = `
        <p>You got: <b>${item.name}</b></p>
        <button onclick="closePopup(this)">OK</button>
    `;
    document.body.appendChild(popup);
}

function closePopup(btn) {
    btn.parentElement.remove();
}

// Update money
function updateMoney() {
    document.getElementById("money").innerText = `$${money}`;
}

// Load JSON on page start
window.onload = loadCases;
