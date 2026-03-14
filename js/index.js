/* Main JavaScript for Index Page */

let alreadyMarkedOnline = {};
let players = [], history = [];
let currentPage = 1;
let chartInstance = null;

// Helper functions
function getBanderaHTML(country) {
    if (!country) return "🏳️";
    const file = BANDERAS[country.toUpperCase()];
    return file ? `<img src="Imagenes/${file}" class="player-flag">` : "🏳️";
}

function getRank(elo) {
    return RANKS.find(r => elo >= r.min && elo <= r.max) || RANKS[0];
}

function getProgress(elo, rank) {
    if (rank.name === "S") return 100;
    return Math.max(5, Math.min(100, ((elo - rank.min) / (rank.max - rank.min)) * 100));
}

// Data Listeners
db.ref('/').on('value', snapshot => {
    const data = snapshot.val();
    players = data?.players || [];
    history = data?.history || [];

    // Sort history by ID/timestamp descending
    history.sort((a, b) => {
        const timeA = a.timestamp || Number.parseInt(a.id) || 0;
        const timeB = b.timestamp || Number.parseInt(b.id) || 0;
        return timeB - timeA;
    });

    render();
    verificarSesion();

    // Secondary Listener for Status
    db.ref('status').on('value', snapshotStatus => {
        const statusData = snapshotStatus.val() || {};
        updateStatusIndicators(statusData);
        updateCounters(statusData);
    });
});

function updateStatusIndicators(statusData) {
    document.querySelectorAll('[id^="status-"]').forEach(span => {
        const rawId = span.id.replace('status-', '');
        const playerName = rawId.replaceAll('_', '-');
        const userStatus = statusData[playerName];

        span.className = 'status-dot';
        span.innerHTML = '';

        if (userStatus?.online === true) {
            span.classList.add('status-online');
        } else {
            span.innerHTML = '⚪';
            span.style.color = '#9E9E9E';
            span.style.fontSize = '1.1em';
        }
    });
}

async function updateCounters(statusData) {
    const onlinePlayers = Object.values(statusData).filter(s => s.online === true).length;
    document.getElementById('onlineCount').innerText = onlinePlayers;

    const playersSnapshot = await db.ref('players').once('value');
    const allPlayers = playersSnapshot.val() || {};
    const totalPlayers = Object.keys(allPlayers).length;
    document.getElementById('offlineCount').innerText = totalPlayers - onlinePlayers;
}

// UI Rendering
function render() {
    const rankingEl = document.getElementById('ranking');
    const busqueda = document.getElementById('searchRanking').value.toLowerCase();

    let ordenados = [...players].sort((a, b) => b.elo - a.elo);
    let filtrados = ordenados.filter(p => p.name.toLowerCase().includes(busqueda));

    const start = (currentPage - 1) * PAGE_SIZE;
    const visibles = filtrados.slice(start, start + PAGE_SIZE);

    rankingEl.innerHTML = visibles.map(p => {
        const r = getRank(p.elo);
        const pos = ordenados.findIndex(x => x.name === p.name) + 1;
        const isWinningValue = p.streak > 0;
        const rachaClass = isWinningValue ? 'color:#4caf50' : 'color:#ff5252';
        
        let rachaIcon = '';
        if (p.streak > 0) rachaIcon = '🔥';
        else if (p.streak < 0) rachaIcon = '💀';

        return `
            <tr data-position="${pos}">
                <td>${pos}</td>
                <td style="padding-right: 4px !important; text-align: right;">${getBanderaHTML(p.country)}</td>
                <td style="padding-left: 4px !important; text-align: left;">
                    <span class="player-link" onclick="openModal('${p.name}')">
                        <span class="player-name-text">${p.name}</span>
                        <span id="status-${p.name.replaceAll(/[^a-zA-Z0-9]/g, '_')}" class="status-dot"></span>
                    </span>
                </td>
                <td class="${r.class}">${r.name}</td>
                <td style="font-weight:bold;">${Math.round(p.elo)}</td>
                <td>
                    <div class="progress">
                        <div class="progress-fill" style="width:${getProgress(p.elo, r)}%"></div>
                    </div>
                </td>
                <td>${p.wins}/${p.losses}</td>
                <td style="${rachaClass}; font-weight:bold;">${rachaIcon} ${Math.abs(p.streak || 0)}</td>
            </tr>
        `;
    }).join("");

    renderPagination(filtrados.length);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    const container = document.getElementById('pagination');
    container.innerHTML = "";
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        if (i === currentPage) btn.className = "active";
        btn.onclick = () => {
            currentPage = i;
            render();
            globalThis.scrollTo({ top: 0, behavior: 'smooth' });
        };
        container.appendChild(btn);
    }
}

// Session Management
function verificarSesion() {
    const nombre = localStorage.getItem("logged_user");
    const userBar = document.getElementById("user-bar");
    const loginPrompt = document.getElementById("login-prompt");
    const nameDisplay = document.getElementById("current-user-name");

    if (nombre) {
        userBar.style.display = "flex";
        loginPrompt.style.display = "none";
        nameDisplay.innerText = nombre;

        if (!alreadyMarkedOnline[nombre]) {
            alreadyMarkedOnline[nombre] = true;
            markUserOnline(nombre);
        }
    } else {
        userBar.style.display = "none";
        loginPrompt.style.display = "block";
    }
}

function markUserOnline(nombre) {
    const statusRef = db.ref('status/' + nombre);
    statusRef.set({
        online: true,
        lastActive: firebase.database.ServerValue.TIMESTAMP,
        device: navigator.userAgent
    }).catch(err => console.error("Error marking online:", err));

    statusRef.onDisconnect().set({
        online: false,
        lastActive: firebase.database.ServerValue.TIMESTAMP
    });
}

function cerrarSesion() {
    if (confirm("¿Cerrar sesión de guerrero?")) {
        localStorage.removeItem("logged_user");
        globalThis.location.reload();
    }
}

// Modal logic
function openModal(name) {
    const p = players.find(x => x.name === name);
    if (!p) return;

    document.getElementById('modalTitle').innerHTML = `${getBanderaHTML(p.country)} ${p.name}`;
    document.getElementById('modalStats').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align:left;">
            <div><b>Rango:</b> <span class="${getRank(p.elo).class}">${getRank(p.elo).name}</span></div>
            <div><b>ELO:</b> ${Math.round(p.elo)}</div>
            <div><b>Victorias:</b> ${p.wins}</div>
            <div><b>Derrotas:</b> ${p.losses}</div>
        </div>
        <button onclick="window.location.href='perfil.html?player=${encodeURIComponent(name)}'"
                style="width:100%; margin-top:15px; padding:8px; background:#FFD700; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">
                VER PERFIL COMPLETO
        </button>
    `;

    const ultimasPeleas = history.filter(h => h.p1 === name || h.p2 === name).slice(0, 5);
    document.getElementById('modalHistory').innerHTML = ultimasPeleas.map(h => {
        const gano = (h.p1 === name && h.s1 > h.s2) || (h.p2 === name && h.s2 > h.s1);
        return `
            <li style="padding:5px 0; border-bottom:1px solid #333; font-size:0.85rem;">
                <span style="color:${gano ? '#4caf50' : '#ff5252'}">${gano ? 'WIN' : 'LOSS'}</span> | 
                ${h.p1} ${h.s1} - ${h.s2} ${h.p2}
            </li>
        `;
    }).join("");

    document.getElementById('modal').classList.remove("hidden");
}

function closeModal() {
    document.getElementById('modal').classList.add("hidden");
}

// Event Listeners
document.getElementById('searchRanking').addEventListener('input', () => {
    currentPage = 1;
    render();
});
