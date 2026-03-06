// Global state
let reservations = [];
let editingId = null;

// DOM Elements
const modal = document.getElementById('reservation-modal');
const modalContent = document.getElementById('modal-content');
const form = document.getElementById('reservation-form');
const tableBody = document.getElementById('reservations-table-body');
const modalTitle = document.getElementById('modal-title');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Top date display
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').textContent = new Date().toLocaleDateString('pt-BR', options).replace(/^./, str => str.toUpperCase());
    
    // Setup filter month options
    setupMonthFilter();

    // Load data
    loadFromLocalStorage();
    
    // Event listeners
    document.getElementById('filter-month').addEventListener('change', renderUI);
    document.getElementById('filter-platform').addEventListener('change', renderUI);
});

function toggleNewReservationModal(id = null) {
    if (modal.classList.contains('hidden')) {
        // Opening modal
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.add('scale-100', 'opacity-100');
            modalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
        
        if (id) {
            editingId = id;
            modalTitle.textContent = 'Editar Reserva';
            fillFormWithData(id);
        } else {
            editingId = null;
            modalTitle.textContent = 'Nova Reserva';
            form.reset();
            // Default dates
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('checkinDate').value = today;
            const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
            document.getElementById('checkoutDate').value = tomorrow;
            document.getElementById('cleaningDate').value = tomorrow;
            calculateNights();
            calculatePreview();
        }
    } else {
        // Closing modal
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function calculateNights() {
    const checkin = document.getElementById('checkinDate').value;
    const checkout = document.getElementById('checkoutDate').value;
    
    // Auto set cleaning date to checkout
    if (checkout) {
        document.getElementById('cleaningDate').value = checkout;
    }

    if (checkin && checkout) {
        const inDate = new Date(checkin);
        const outDate = new Date(checkout);
        const diffTime = Math.abs(outDate - inDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (outDate <= inDate) {
            document.getElementById('nightsCount').textContent = 'Erro nas datas';
            document.getElementById('nightsCount').classList.add('text-red-500');
            return 0;
        } else {
            document.getElementById('nightsCount').textContent = diffDays;
            document.getElementById('nightsCount').classList.remove('text-red-500');
            return diffDays;
        }
    }
    document.getElementById('nightsCount').textContent = '0';
    return 0;
}

function calculatePreview() {
    const totalValue = parseFloat(document.getElementById('totalValue').value) || 0;
    const hostFeePercent = parseFloat(document.getElementById('hostFeePercent').value) || 0;
    const cleaningFeePaid = parseFloat(document.getElementById('cleaningFeePaid').value) || 0;
    const cleanerPay = parseFloat(document.getElementById('cleanerPay').value) || 0;

    const cleaningProfit = cleaningFeePaid - cleanerPay; // R$ 14 in default case
    const hostEarned = (totalValue * (hostFeePercent / 100)) + cleaningProfit;
    const ownerEarned = totalValue - (totalValue * (hostFeePercent / 100)) - cleaningFeePaid;

    document.getElementById('preview-owner').textContent = formatCurrency(ownerEarned);
    document.getElementById('preview-host').textContent = formatCurrency(hostEarned);
    document.getElementById('preview-cleaner').textContent = formatCurrency(cleanerPay);
    
    return { hostEarned, ownerEarned, cleanerPay };
}

function saveReservation() {
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const { hostEarned, ownerEarned, cleanerPay } = calculatePreview();
    
    const reservationData = {
        id: editingId || Date.now().toString(),
        propertyName: document.getElementById('propertyName').value,
        platform: document.getElementById('platform').value,
        guestName: document.getElementById('guestName').value,
        secondGuestName: document.getElementById('secondGuestName').value,
        visitorsName: document.getElementById('visitorsName').value,
        carDetails: document.getElementById('carDetails').value,
        checkinDate: document.getElementById('checkinDate').value,
        checkoutDate: document.getElementById('checkoutDate').value,
        nights: calculateNights(),
        totalValue: parseFloat(document.getElementById('totalValue').value) || 0,
        hostFeePercent: parseFloat(document.getElementById('hostFeePercent').value) || 10,
        cleaningFeePaid: parseFloat(document.getElementById('cleaningFeePaid').value) || 130,
        cleanerPay: parseFloat(document.getElementById('cleanerPay').value) || 116,
        cleanerName: document.getElementById('cleanerName').value,
        cleaningDate: document.getElementById('cleaningDate').value,
        
        // Calculated fields
        hostEarned,
        ownerEarned
    };

    if (editingId) {
        const index = reservations.findIndex(r => r.id === editingId);
        if (index !== -1) reservations[index] = reservationData;
    } else {
        reservations.push(reservationData);
    }

    saveToLocalStorage();
    renderUI();
    toggleNewReservationModal();
}

function deleteReservation(id) {
    if (confirm('Tem certeza que deseja excluir esta reserva?')) {
        reservations = reservations.filter(r => r.id !== id);
        saveToLocalStorage();
        renderUI();
    }
}

function fillFormWithData(id) {
    const r = reservations.find(r => r.id === id);
    if (!r) return;

    document.getElementById('propertyName').value = r.propertyName;
    document.getElementById('platform').value = r.platform;
    document.getElementById('guestName').value = r.guestName;
    document.getElementById('secondGuestName').value = r.secondGuestName || '';
    document.getElementById('visitorsName').value = r.visitorsName || '';
    document.getElementById('carDetails').value = r.carDetails || '';
    document.getElementById('checkinDate').value = r.checkinDate;
    document.getElementById('checkoutDate').value = r.checkoutDate;
    document.getElementById('totalValue').value = r.totalValue;
    document.getElementById('hostFeePercent').value = r.hostFeePercent;
    document.getElementById('cleaningFeePaid').value = r.cleaningFeePaid;
    document.getElementById('cleanerPay').value = r.cleanerPay;
    document.getElementById('cleanerName').value = r.cleanerName || '';
    document.getElementById('cleaningDate').value = r.cleaningDate || '';

    calculateNights();
    calculatePreview();
}

// Logic & Render

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function setupMonthFilter() {
    const select = document.getElementById('filter-month');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();
    
    // Add last 6 months and next 6 months
    for (let i = -6; i <= 6; i++) {
        const d = new Date(currentYear, currentMonth + i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        
        // Select current month
        if (i === 0) option.selected = true;
        
        select.appendChild(option);
    }
}

function getFilteredReservations() {
    const monthFilter = document.getElementById('filter-month').value; // format: YYYY-MM
    const platformFilter = document.getElementById('filter-platform').value;

    return reservations.filter(r => {
        // Platform filter
        if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
        
        // Month filter based on checkout date or checkin date (we check if any of them falls in that month)
        if (monthFilter !== 'all') {
            const inMonth = r.checkinDate.startsWith(monthFilter);
            const outMonth = r.checkoutDate.startsWith(monthFilter);
            if (!inMonth && !outMonth) return false;
        }
        
        return true;
    }).sort((a, b) => new Date(a.checkinDate) - new Date(b.checkinDate));
}

function renderUI() {
    const filtered = getFilteredReservations();
    renderTable(filtered);
    updateDashboard();
}

function renderTable(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fa-regular fa-folder-open text-4xl mb-3 text-gray-300"></i>
                        <p>Nenhuma reserva encontrada.</p>
                        <button onclick="toggleNewReservationModal()" class="mt-4 text-brand-600 hover:underline font-medium">Adicionar reserva</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(r => {
        // Platform styling
        let platformClass = 'bg-gray-100 text-gray-800';
        if (r.platform === 'Airbnb') platformClass = 'bg-red-50 text-red-600 border border-red-100';
        if (r.platform === 'Booking') platformClass = 'bg-blue-50 text-blue-600 border border-blue-100';

        const tr = document.createElement('tr');
        tr.className = 'bg-white border-b hover:bg-gray-50 transition-colors';
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${r.guestName}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fa-solid fa-house fa-fw"></i> ${r.propertyName}</div>
                ${r.carDetails ? `<div class="text-xs text-gray-500 mt-0.5"><i class="fa-solid fa-car fa-fw"></i> ${r.carDetails}</div>` : ''}
            </td>
            <td class="px-6 py-4">
                <div class="text-gray-900 flex items-center gap-1"><i class="fa-solid fa-arrow-right-to-bracket text-green-500 w-4"></i> ${formatDate(r.checkinDate)}</div>
                <div class="text-gray-900 flex items-center gap-1 mt-1"><i class="fa-solid fa-arrow-right-from-bracket text-orange-500 w-4"></i> ${formatDate(r.checkoutDate)}</div>
                <span class="inline-flex items-center justify-center px-2 py-0.5 mt-2 ms-0 text-xs font-medium text-gray-500 bg-gray-100 rounded">${r.nights} diárias</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-md text-xs font-medium ${platformClass}">
                    ${r.platform}
                </span>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="text-gray-900"><span class="text-gray-500">Valor Bruto:</span> <span class="font-medium">${formatCurrency(r.totalValue)}</span></div>
                <div class="text-emerald-600 mt-1"><span class="text-emerald-600/70">Prop:</span> <span class="font-bold">${formatCurrency(r.ownerEarned)}</span></div>
                <div class="text-brand-600 mt-1"><span class="text-brand-600/70">Gestão:</span> <span class="font-bold">${formatCurrency(r.hostEarned)}</span></div>
            </td>
            <td class="px-6 py-4 text-sm">
                <div class="text-gray-900"><i class="fa-solid fa-broom text-gray-400"></i> ${formatDate(r.cleaningDate || r.checkoutDate)}</div>
                <div class="text-gray-600 mt-1">${r.cleanerName || 'Não definido'}</div>
                <div class="text-gray-800 font-medium mt-1">Ganha: ${formatCurrency(r.cleanerPay)}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="toggleNewReservationModal('${r.id}')" class="font-medium text-brand-600 hover:text-brand-900 mr-3 px-2 py-1 rounded hover:bg-brand-50 transition-colors" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="deleteReservation('${r.id}')" class="font-medium text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50 transition-colors" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateDashboard() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Calcula datas da semana atual (Domingo a Sábado)
    const today = new Date();
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0];
    const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)).toISOString().split('T')[0];

    let todayCheckins = 0;
    let todayCheckouts = 0;
    
    let weekReservations = 0;
    let weekGuests = 0;

    let monthOwner = 0;
    let monthHost = 0;
    let monthCleaner = 0;

    // Dictionary to hold property based earnings
    const propertyEarnings = {};

    // Use current viewed month for monthly earnings instead of ALL reservations
    const currentMonthFilter = document.getElementById('filter-month').value;
    
    reservations.forEach(r => {
        // Daily
        if (r.checkinDate === todayStr) todayCheckins++;
        if (r.checkoutDate === todayStr) todayCheckouts++;
        
        // Weekly (checkin occurs in this week)
        if (r.checkinDate >= firstDayOfWeek && r.checkinDate <= lastDayOfWeek) {
            weekReservations++;
            // Calculate total guests
            let guests = 1; // main guest
            if (r.secondGuestName) guests++;
            if (r.visitorsName) {
                // simple split by comma to count visitors roughly
                const visitorsCount = r.visitorsName.split(',').filter(v => v.trim().length > 0).length;
                guests += visitorsCount;
            }
            weekGuests += guests;
        }

        // Monthly (matches filter)
        if (currentMonthFilter === 'all' || r.checkoutDate.startsWith(currentMonthFilter) || r.checkinDate.startsWith(currentMonthFilter)) {
            monthOwner += r.ownerEarned || 0;
            monthHost += r.hostEarned || 0;
            monthCleaner += r.cleanerPay || 0;
            
            // Per property aggregation
            const propName = r.propertyName || 'Desconhecido';
            if (!propertyEarnings[propName]) {
                propertyEarnings[propName] = { owner: 0, host: 0, cleaner: 0 };
            }
            propertyEarnings[propName].owner += r.ownerEarned || 0;
            propertyEarnings[propName].host += r.hostEarned || 0;
            propertyEarnings[propName].cleaner += r.cleanerPay || 0;
        }
    });

    // Update Initial DOM values
    document.getElementById('today-checkins').textContent = todayCheckins;
    document.getElementById('today-checkouts').textContent = todayCheckouts;
    
    document.getElementById('week-new-reservations').textContent = weekReservations;
    document.getElementById('week-guests').textContent = weekGuests;

    document.getElementById('month-owner-earnings').textContent = formatCurrency(monthOwner);
    document.getElementById('month-host-earnings').textContent = formatCurrency(monthHost);
    document.getElementById('month-cleaner-earnings').textContent = formatCurrency(monthCleaner);
    
    // Update Property Breakdown
    const breakdownContainer = document.getElementById('property-breakdown-container');
    breakdownContainer.innerHTML = '';
    
    const propNames = Object.keys(propertyEarnings);
    
    if (propNames.length === 0) {
        breakdownContainer.innerHTML = `
            <div class="col-span-full py-6 text-center text-gray-500">
                Nenhuma informação para exibir no mês selecionado.
            </div>
        `;
    } else {
        propNames.forEach(prop => {
            const data = propertyEarnings[prop];
            const card = document.createElement('div');
            card.className = 'bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-colors';
            card.innerHTML = `
                <div class="font-bold text-gray-800 mb-3 flex items-center gap-2 border-b border-gray-200 pb-2">
                    <i class="fa-solid fa-house fa-sm text-indigo-500"></i> ${prop}
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between items-center bg-white p-1.5 rounded">
                        <span class="text-gray-600">Proprietário</span>
                        <span class="font-bold text-emerald-600">${formatCurrency(data.owner)}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white p-1.5 rounded">
                        <span class="text-gray-600">Gestão</span>
                        <span class="font-bold text-blue-600">${formatCurrency(data.host)}</span>
                    </div>
                    <div class="flex justify-between items-center bg-white p-1.5 rounded">
                        <span class="text-gray-600">Limpeza</span>
                        <span class="font-bold text-gray-700">${formatCurrency(data.cleaner)}</span>
                    </div>
                </div>
            `;
            breakdownContainer.appendChild(card);
        });
    }
}

// Local Storage Helper functions
function saveToLocalStorage() {
    localStorage.setItem('gestaoAirbnbData', JSON.stringify(reservations));
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('gestaoAirbnbData');
    if (data) {
        try {
            reservations = JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse local storage data');
            reservations = [];
        }
    } else {
        reservations = [];
    }
    renderUI();
}
