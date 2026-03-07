import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuracoes do Supabase (via .env)
const ENV = import.meta.env ?? {};
const SUPABASE_URL = ENV.VITE_SUPABASE_URL || 'https://cdyzmasihytafnlwzbxt.supabase.co';
const SUPABASE_KEY =
    ENV.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ENV.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_C6n-WNNMlGhciNSuSilzpw_OhfN05gx';
const RESERVATIONS_TABLE = ENV.VITE_SUPABASE_TABLE || 'reservations';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
        'As variaveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) sao obrigatorias.'
    );
}

const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        headers: {
            apikey: SUPABASE_KEY,
        },
    },
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

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
    
    setupMonthFilter();

    // Carregar dados do Supabase ao iniciar
    loadFromSupabase();
    
    document.getElementById('filter-month').addEventListener('change', renderUI);
    document.getElementById('filter-platform').addEventListener('change', renderUI);
});

// FUNÇÕES DE COMUNICAÇÃO COM SUPABASE
async function loadFromSupabase() {
    const { data, error } = await _supabase
        .from(RESERVATIONS_TABLE)
        .select('*');

    if (error) {
        console.error('Erro ao buscar dados:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-600">Erro ao carregar reservas no Supabase: ${error.message}</td></tr>`;
        reservations = [];
    } else {
        // Mapear snake_case do banco para camelCase do seu JS
        reservations = data.map(r => ({
            id: r.id.toString(),
            propertyName: r.property_name,
            platform: r.platform,
            guestName: r.guest_name,
            secondGuestName: r.second_guest_name,
            visitorsName: r.visitors_name,
            carDetails: r.car_details,
            checkinDate: r.checkin_date,
            checkoutDate: r.checkout_date,
            nights: r.nights,
            totalValue: parseFloat(r.total_value),
            hostFeePercent: parseFloat(r.host_fee_percent),
            cleaningFeePaid: parseFloat(r.cleaning_fee_paid),
            cleanerPay: parseFloat(r.cleaner_pay),
            cleanerName: r.cleaner_name,
            cleaningDate: r.cleaning_date,
            hostEarned: parseFloat(r.host_earned),
            ownerEarned: parseFloat(r.owner_earned)
        }));
    }
    renderUI();
}

async function saveReservation() {
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const { hostEarned, ownerEarned, cleanerPay } = calculatePreview();
    
    // Objeto formatado para o Banco de Dados (Snake Case)
    const reservationDB = {
        property_name: document.getElementById('propertyName').value,
        platform: document.getElementById('platform').value,
        guest_name: document.getElementById('guestName').value,
        second_guest_name: document.getElementById('secondGuestName').value,
        visitors_name: document.getElementById('visitorsName').value,
        car_details: document.getElementById('carDetails').value,
        checkin_date: document.getElementById('checkinDate').value,
        checkout_date: document.getElementById('checkoutDate').value,
        nights: calculateNights(),
        total_value: parseFloat(document.getElementById('totalValue').value) || 0,
        host_fee_percent: parseFloat(document.getElementById('hostFeePercent').value) || 10,
        cleaning_fee_paid: parseFloat(document.getElementById('cleaningFeePaid').value) || 130,
        cleaner_pay: parseFloat(document.getElementById('cleanerPay').value) || 116,
        cleaner_name: document.getElementById('cleanerName').value,
        cleaning_date: document.getElementById('cleaningDate').value,
        host_earned: hostEarned,
        owner_earned: ownerEarned
    };

    let result;
    if (editingId) {
        // UPDATE
        result = await _supabase
            .from(RESERVATIONS_TABLE)
            .update(reservationDB)
            .eq('id', editingId);
    } else {
        // INSERT (Gera ID automático via BIGINT se configurado, ou usamos Date.now)
        reservationDB.id = parseInt(Date.now().toString().slice(-9)); // Reduzindo para caber no BigInt se necessário
        result = await _supabase
            .from(RESERVATIONS_TABLE)
            .insert([reservationDB]);
    }

    if (result.error) {
        alert('Erro ao salvar no Supabase: ' + result.error.message);
    } else {
        await loadFromSupabase(); // Recarrega e renderiza
        toggleNewReservationModal();
    }
}

async function deleteReservation(id) {
    if (confirm('Tem certeza que deseja excluir esta reserva permanentemente do banco de dados?')) {
        const { error } = await _supabase
            .from(RESERVATIONS_TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            await loadFromSupabase();
        }
    }
}

// FUNÇÕES DE UI E LÓGICA (MANTIDAS QUASE IGUAIS)

function toggleNewReservationModal(id = null) {
    if (modal.classList.contains('hidden')) {
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
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('checkinDate').value = today;
            const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
            document.getElementById('checkoutDate').value = tomorrow;
            document.getElementById('cleaningDate').value = tomorrow;
            calculateNights();
            calculatePreview();
        }
    } else {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); }, 300);
    }
}

function calculateNights() {
    const checkin = document.getElementById('checkinDate').value;
    const checkout = document.getElementById('checkoutDate').value;
    if (checkout) document.getElementById('cleaningDate').value = checkout;

    if (checkin && checkout) {
        const inDate = new Date(checkin);
        const outDate = new Date(checkout);
        if (outDate <= inDate) {
            document.getElementById('nightsCount').textContent = 'Erro';
            return 0;
        }
        const diffDays = Math.ceil(Math.abs(outDate - inDate) / (1000 * 60 * 60 * 24));
        document.getElementById('nightsCount').textContent = diffDays;
        return diffDays;
    }
    return 0;
}

function calculatePreview() {
    const totalValue = parseFloat(document.getElementById('totalValue').value) || 0;
    const hostFeePercent = parseFloat(document.getElementById('hostFeePercent').value) || 0;
    const cleaningFeePaid = parseFloat(document.getElementById('cleaningFeePaid').value) || 0;
    const cleanerPay = parseFloat(document.getElementById('cleanerPay').value) || 0;

    const cleaningProfit = cleaningFeePaid - cleanerPay;
    const hostEarned = (totalValue * (hostFeePercent / 100)) + cleaningProfit;
    const ownerEarned = totalValue - (totalValue * (hostFeePercent / 100)) - cleaningFeePaid;

    document.getElementById('preview-owner').textContent = formatCurrency(ownerEarned);
    document.getElementById('preview-host').textContent = formatCurrency(hostEarned);
    document.getElementById('preview-cleaner').textContent = formatCurrency(cleanerPay);
    
    return { hostEarned, ownerEarned, cleanerPay };
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

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    const parts = dateString.split('-');
    return parts.length !== 3 ? dateString : `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function setupMonthFilter() {
    const select = document.getElementById('filter-month');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const d = new Date();
    for (let i = -6; i <= 6; i++) {
        const target = new Date(d.getFullYear(), d.getMonth() + i, 1);
        const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${months[target.getMonth()]} ${target.getFullYear()}`;
        if (i === 0) option.selected = true;
        select.appendChild(option);
    }
}

function renderUI() {
    const monthFilter = document.getElementById('filter-month').value;
    const platformFilter = document.getElementById('filter-platform').value;

    const filtered = reservations.filter(r => {
        if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
        if (monthFilter !== 'all') {
            const inMonth = r.checkinDate.startsWith(monthFilter);
            const outMonth = r.checkoutDate.startsWith(monthFilter);
            if (!inMonth && !outMonth) return false;
        }
        return true;
    }).sort((a, b) => new Date(a.checkinDate) - new Date(b.checkinDate));

    renderTable(filtered);
    updateDashboard(filtered, monthFilter);
}

function renderTable(data) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhuma reserva encontrada.</td></tr>`;
        return;
    }

    data.forEach(r => {
        let platformClass = r.platform === 'Airbnb' ? 'bg-red-50 text-red-600 border-red-100' : 
                          (r.platform === 'Booking' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-800');

        const tr = document.createElement('tr');
        tr.className = 'bg-white border-b hover:bg-gray-50 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-gray-900">${r.guestName}</div>
                <div class="text-xs text-gray-500 mt-1"><i class="fa-solid fa-house"></i> ${r.propertyName}</div>
            </td>
            <td class="px-6 py-4 text-sm">
                <div>In: ${formatDate(r.checkinDate)}</div>
                <div>Out: ${formatDate(r.checkoutDate)}</div>
            </td>
            <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-medium border ${platformClass}">${r.platform}</span></td>
            <td class="px-6 py-4 text-sm">
                <div class="font-bold text-emerald-600">Prop: ${formatCurrency(r.ownerEarned)}</div>
                <div class="font-bold text-brand-600">Gestão: ${formatCurrency(r.hostEarned)}</div>
            </td>
            <td class="px-6 py-4 text-sm">
                <div><i class="fa-solid fa-broom"></i> ${formatDate(r.cleaningDate || r.checkoutDate)}</div>
                <div class="text-gray-500">${r.cleanerName || '-'}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="toggleNewReservationModal('${r.id}')" class="text-brand-600 hover:bg-brand-50 p-2 rounded"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteReservation('${r.id}')" class="text-red-600 hover:bg-red-50 p-2 rounded"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateDashboard(filteredData, currentMonthFilter) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let todayCheckins = 0, todayCheckouts = 0, weekReservations = 0, weekGuests = 0;
    let monthOwner = 0, monthHost = 0, monthCleaner = 0;
    const propertyEarnings = {};

    // Dados baseados em todas as reservas para indicadores diários/semanais
    const today = new Date();
    const startWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().split('T')[0];
    const endWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)).toISOString().split('T')[0];

    reservations.forEach(r => {
        if (r.checkinDate === todayStr) todayCheckins++;
        if (r.checkoutDate === todayStr) todayCheckouts++;
        if (r.checkinDate >= startWeek && r.checkinDate <= endWeek) {
            weekReservations++;
            weekGuests += (1 + (r.secondGuestName ? 1 : 0) + (r.visitorsName ? r.visitorsName.split(',').length : 0));
        }
    });

    // Dados baseados no filtro atual para os cards financeiros
    filteredData.forEach(r => {
        monthOwner += r.ownerEarned;
        monthHost += r.hostEarned;
        monthCleaner += r.cleanerPay;

        if (!propertyEarnings[r.propertyName]) propertyEarnings[r.propertyName] = { owner: 0, host: 0, cleaner: 0 };
        propertyEarnings[r.propertyName].owner += r.ownerEarned;
        propertyEarnings[r.propertyName].host += r.hostEarned;
        propertyEarnings[r.propertyName].cleaner += r.cleanerPay;
    });

    document.getElementById('today-checkins').textContent = todayCheckins;
    document.getElementById('today-checkouts').textContent = todayCheckouts;
    document.getElementById('week-new-reservations').textContent = weekReservations;
    document.getElementById('week-guests').textContent = weekGuests;
    document.getElementById('month-owner-earnings').textContent = formatCurrency(monthOwner);
    document.getElementById('month-host-earnings').textContent = formatCurrency(monthHost);
    document.getElementById('month-cleaner-earnings').textContent = formatCurrency(monthCleaner);

    const container = document.getElementById('property-breakdown-container');
    container.innerHTML = '';
    Object.keys(propertyEarnings).forEach(prop => {
        const d = propertyEarnings[prop];
        const card = document.createElement('div');
        card.className = 'bg-gray-50 rounded-lg p-4 border border-gray-100';
        card.innerHTML = `
            <div class="font-bold border-b pb-2 mb-2"><i class="fa-solid fa-house text-indigo-500"></i> ${prop}</div>
            <div class="text-sm space-y-1">
                <div class="flex justify-between"><span>Proprietário</span><span class="font-bold text-emerald-600">${formatCurrency(d.owner)}</span></div>
                <div class="flex justify-between"><span>Gestão</span><span class="font-bold text-blue-600">${formatCurrency(d.host)}</span></div>
                <div class="flex justify-between"><span>Limpeza</span><span class="font-bold text-gray-700">${formatCurrency(d.cleaner)}</span></div>
            </div>`;
        container.appendChild(card);
    });
}

// Inline handlers in index.html call these by name.
// Since this file is loaded as an ES module, expose them explicitly.
Object.assign(window, {
    toggleNewReservationModal,
    saveReservation,
    deleteReservation,
    calculateNights,
    calculatePreview,
});
